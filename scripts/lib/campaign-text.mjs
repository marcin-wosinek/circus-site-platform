// Reviewed campaign text revisions: validation, approval, and exact export.
//
// A revision is a directory holding `text.json` (image labels and channel copy
// for every subject of one campaign edition) and, once reviewed, `approval.json`
// (the reviewer, timestamp, terminology review, and the SHA-256 of the exact
// `text.json` bytes that were approved). Image builders consume only approved
// revisions; any byte change to `text.json` after approval invalidates it.
// Nothing here renders images. See docs/campaign-text.md.
import { createHash } from 'node:crypto';
import { existsSync, linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { CliError } from './cli-error.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';
import { decodeUtf8, findDiscouragedTerms, discouragedTerms } from './terminology.mjs';

export const CAMPAIGN_TEXT_FORMAT_VERSION = 1;
export const APPROVAL_FORMAT_VERSION = 1;
export const TEXT_FILE = 'text.json';
export const APPROVAL_FILE = 'approval.json';
export const APPROVAL_SCOPE = 'Campaign text only. Does not approve visuals, alt text, photo permissions, publication, or sending.';

const SITE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const REVISION_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
// Subject, channel, and label IDs become path segments or lookup keys: no dots,
// slashes, or uppercase.
const SAFE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
// Labels are single-line image text; copy may contain line breaks but no other
// control characters (CR is rejected so exported bytes stay unambiguous).
const LABEL_FORBIDDEN = /[\u0000-\u001f\u007f]/;
const COPY_FORBIDDEN = /[\u0000-\u0009\u000b-\u001f\u007f]/;

const TEXT_KEYS = new Set(['formatVersion', 'site', 'campaign', 'edition', 'language', 'revision', 'basedOn', 'migration', 'notes', 'channels', 'subjects']);
const SUBJECT_KEYS = new Set(['id', 'title', 'labels', 'copy']);
const BASED_ON_KEYS = new Set(['path', 'revision', 'sha256']);
const MIGRATION_KEYS = new Set(['source', 'note', 'files']);
const APPROVAL_KEYS = new Set(['formatVersion', 'revision', 'artifact', 'sha256', 'reviewer', 'approvedAt', 'scope', 'terminology']);

export class CampaignTextError extends CliError {
	constructor(message, diagnostics = []) {
		super(diagnostics.length ? `${message}\n${diagnostics.map((line) => `  - ${line}`).join('\n')}` : message);
		this.diagnostics = diagnostics;
	}
}

export function sha256(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(value, allowed, where, diagnostics) {
	for (const key of Object.keys(value)) if (!allowed.has(key)) diagnostics.push(`${where}: unsupported key "${key}".`);
}

function requireString(value, where, diagnostics, pattern, hint) {
	if (typeof value !== 'string' || !value) {
		diagnostics.push(`${where}: required non-empty string.`);
		return false;
	}
	if (pattern && !pattern.test(value)) {
		diagnostics.push(`${where}: "${value}" is not ${hint}.`);
		return false;
	}
	return true;
}

function validateLabel(value, where, diagnostics) {
	if (typeof value !== 'string' || !value.trim()) return diagnostics.push(`${where}: missing or empty label.`);
	if (LABEL_FORBIDDEN.test(value)) return diagnostics.push(`${where}: labels are single-line text without control characters.`);
	if (value !== value.trim()) diagnostics.push(`${where}: label has leading or trailing whitespace.`);
}

function validateCopy(value, where, diagnostics) {
	if (typeof value !== 'string' || !value.trim()) return diagnostics.push(`${where}: missing or empty copy.`);
	if (COPY_FORBIDDEN.test(value)) diagnostics.push(`${where}: copy may contain line breaks (LF) but no other control characters.`);
}

// Validates a parsed text artifact and returns every problem found, so an
// author can fix the file in one pass.
export function campaignTextDiagnostics(data) {
	const diagnostics = [];
	if (!isPlainObject(data)) return ['Top level must be a JSON object.'];
	unknownKeys(data, TEXT_KEYS, 'text', diagnostics);
	if (data.formatVersion !== CAMPAIGN_TEXT_FORMAT_VERSION) {
		diagnostics.push(`formatVersion: unsupported value ${JSON.stringify(data.formatVersion)}; expected ${CAMPAIGN_TEXT_FORMAT_VERSION}.`);
	}
	requireString(data.site, 'site', diagnostics, SITE_ID_PATTERN, 'a site ID such as "lamutable.es"');
	requireString(data.campaign, 'campaign', diagnostics, SAFE_ID_PATTERN, 'a lowercase kebab-case ID');
	requireString(data.edition, 'edition', diagnostics, REVISION_ID_PATTERN, 'a lowercase ID such as "2026-11-22"');
	requireString(data.language, 'language', diagnostics, LANGUAGE_PATTERN, 'a language code such as "es"');
	requireString(data.revision, 'revision', diagnostics, REVISION_ID_PATTERN, 'a lowercase revision ID such as "v01"');
	if (data.notes !== undefined && typeof data.notes !== 'string') diagnostics.push('notes: must be a string when present.');
	if (data.basedOn !== undefined && data.basedOn !== null) {
		if (!isPlainObject(data.basedOn)) diagnostics.push('basedOn: must be an object or null.');
		else {
			unknownKeys(data.basedOn, BASED_ON_KEYS, 'basedOn', diagnostics);
			requireString(data.basedOn.path, 'basedOn.path', diagnostics);
			requireString(data.basedOn.sha256, 'basedOn.sha256', diagnostics, SHA256_PATTERN, 'a SHA-256 hex digest');
			if (data.basedOn.revision !== undefined) requireString(data.basedOn.revision, 'basedOn.revision', diagnostics, REVISION_ID_PATTERN, 'a revision ID');
		}
	}
	if (data.migration !== undefined) {
		if (!isPlainObject(data.migration)) diagnostics.push('migration: must be an object.');
		else {
			unknownKeys(data.migration, MIGRATION_KEYS, 'migration', diagnostics);
			requireString(data.migration.source, 'migration.source', diagnostics);
			if (data.migration.note !== undefined && typeof data.migration.note !== 'string') diagnostics.push('migration.note: must be a string.');
			if (!isPlainObject(data.migration.files)) diagnostics.push('migration.files: must map source paths to SHA-256 digests.');
			else {
				for (const [path, hash] of Object.entries(data.migration.files)) {
					if (typeof hash !== 'string' || !SHA256_PATTERN.test(hash)) diagnostics.push(`migration.files["${path}"]: must be a SHA-256 hex digest.`);
				}
			}
		}
	}

	const channels = Array.isArray(data.channels) ? data.channels : [];
	if (!Array.isArray(data.channels) || !channels.length) diagnostics.push('channels: required non-empty array of channel IDs.');
	const channelSet = new Set();
	channels.forEach((channel, index) => {
		if (!requireString(channel, `channels[${index}]`, diagnostics, SAFE_ID_PATTERN, 'a safe lowercase kebab-case ID')) return;
		if (channelSet.has(channel)) diagnostics.push(`channels: duplicate channel "${channel}".`);
		channelSet.add(channel);
	});

	if (!Array.isArray(data.subjects) || !data.subjects.length) {
		diagnostics.push('subjects: required non-empty array (the general event and every workshop).');
		return diagnostics;
	}
	const subjectIds = new Set();
	data.subjects.forEach((subject, index) => {
		let where = `subjects[${index}]`;
		if (!isPlainObject(subject)) return diagnostics.push(`${where}: must be an object.`);
		if (requireString(subject.id, `${where}.id`, diagnostics, SAFE_ID_PATTERN, 'a safe lowercase kebab-case ID')) {
			if (subjectIds.has(subject.id)) diagnostics.push(`${where}.id: duplicate subject "${subject.id}".`);
			subjectIds.add(subject.id);
			where = `subject "${subject.id}"`;
		}
		unknownKeys(subject, SUBJECT_KEYS, where, diagnostics);
		validateLabel(subject.title, `${where}.title`, diagnostics);
		for (const field of ['labels', 'copy']) {
			const value = subject[field];
			if (!isPlainObject(value)) {
				diagnostics.push(`${where}.${field}: required object keyed by channel.`);
				continue;
			}
			for (const channel of Object.keys(value)) {
				if (!channelSet.has(channel)) diagnostics.push(`${where}.${field}: channel "${channel}" is not listed in channels.`);
			}
			for (const channel of channelSet) {
				if (!(channel in value)) {
					diagnostics.push(`${where}.${field}: missing channel "${channel}".`);
					continue;
				}
				if (field === 'copy') {
					validateCopy(value[channel], `${where}.copy.${channel}`, diagnostics);
					continue;
				}
				const labels = value[channel];
				if (!isPlainObject(labels) || !Object.keys(labels).length) {
					diagnostics.push(`${where}.labels.${channel}: required non-empty object of label name to text.`);
					continue;
				}
				for (const [name, label] of Object.entries(labels)) {
					const at = `${where}.labels.${channel}.${name}`;
					if (!SAFE_ID_PATTERN.test(name)) diagnostics.push(`${at}: label names must be safe lowercase kebab-case IDs.`);
					validateLabel(label, at, diagnostics);
				}
			}
		}
	});
	return diagnostics;
}

export function parseCampaignText(bytes, label) {
	const text = decodeUtf8(bytes, label);
	if (text.startsWith('﻿')) throw new CampaignTextError(`${label} starts with a byte-order mark; save it as plain UTF-8.`);
	let data;
	try {
		data = parseJsonNoDuplicateKeys(text, { label });
	} catch (error) {
		throw new CampaignTextError(error.message);
	}
	const diagnostics = campaignTextDiagnostics(data);
	if (diagnostics.length) throw new CampaignTextError(`Invalid campaign text ${label}:`, diagnostics);
	return data;
}

function readBytes(path, label) {
	if (!existsSync(path)) throw new CampaignTextError(`${label} not found.`);
	if (!statSync(path).isFile()) throw new CampaignTextError(`${label} is not a file.`);
	return readFileSync(path);
}

// Resolves either a revision directory or its text.json.
export function resolveTextPath(path) {
	const absolute = resolve(path);
	if (existsSync(absolute) && statSync(absolute).isDirectory()) return resolve(absolute, TEXT_FILE);
	return absolute;
}

// Reads and validates a revision. The revision ID must match its directory
// name so revisions cannot be confused when copied around.
export function readRevision(path, { label = path } = {}) {
	const file = resolveTextPath(path);
	if (!existsSync(file)) throw new CampaignTextError(`${label} not found.`);
	if (basename(file) !== TEXT_FILE) throw new CampaignTextError(`${label}: a campaign text revision is a directory containing ${TEXT_FILE}.`);
	const bytes = readBytes(file, label);
	const text = parseCampaignText(bytes, label);
	const dir = dirname(file);
	if (basename(dir) !== text.revision) {
		throw new CampaignTextError(`${label}: revision "${text.revision}" must live in a directory named "${text.revision}", not "${basename(dir)}".`);
	}
	return { file, dir, label, bytes, sha256: sha256(bytes), text };
}

function approvalDiagnostics(record) {
	const diagnostics = [];
	if (!isPlainObject(record)) return ['Top level must be a JSON object.'];
	unknownKeys(record, APPROVAL_KEYS, 'approval', diagnostics);
	if (record.formatVersion !== APPROVAL_FORMAT_VERSION) diagnostics.push(`formatVersion: expected ${APPROVAL_FORMAT_VERSION}.`);
	requireString(record.revision, 'revision', diagnostics, REVISION_ID_PATTERN, 'a revision ID');
	if (record.artifact !== TEXT_FILE) diagnostics.push(`artifact: expected "${TEXT_FILE}".`);
	requireString(record.sha256, 'sha256', diagnostics, SHA256_PATTERN, 'a SHA-256 hex digest');
	requireString(record.reviewer, 'reviewer', diagnostics);
	if (typeof record.approvedAt !== 'string' || Number.isNaN(Date.parse(record.approvedAt))) diagnostics.push('approvedAt: required ISO 8601 timestamp.');
	if (!isPlainObject(record.terminology) || !Array.isArray(record.terminology.findings) || !Array.isArray(record.terminology.exceptions)) {
		diagnostics.push('terminology: required object with findings and exceptions arrays.');
	}
	return diagnostics;
}

export function readApproval(revision) {
	const file = resolve(revision.dir, APPROVAL_FILE);
	if (!existsSync(file)) return null;
	const label = `${APPROVAL_FILE} for revision "${revision.text.revision}"`;
	const bytes = readBytes(file, label);
	let record;
	try {
		record = parseJsonNoDuplicateKeys(decodeUtf8(bytes, label), { label });
	} catch (error) {
		throw new CampaignTextError(error.message);
	}
	const diagnostics = approvalDiagnostics(record);
	if (diagnostics.length) throw new CampaignTextError(`Invalid ${label}:`, diagnostics);
	return { file, sha256: sha256(bytes), record };
}

// Returns { state: 'unapproved' | 'approved' | 'modified', approval }.
export function approvalStatus(revision) {
	const approval = readApproval(revision);
	if (!approval) return { state: 'unapproved', approval: null };
	const matches = approval.record.sha256 === revision.sha256 && approval.record.revision === revision.text.revision;
	return { state: matches ? 'approved' : 'modified', approval };
}

// The gate for image builders: returns the approved revision or explains
// exactly why it cannot be used. Call this before creating any output.
export function requireApprovedRevision(path, { label = path, expect = {} } = {}) {
	const revision = readRevision(path, { label });
	for (const [key, value] of Object.entries(expect)) {
		if (revision.text[key] !== value) {
			throw new CampaignTextError(`${label}: ${key} is "${revision.text[key]}", but this builder requires "${value}".`);
		}
	}
	const { state, approval } = approvalStatus(revision);
	if (state === 'unapproved') {
		throw new CampaignTextError(`${label}: revision "${revision.text.revision}" is not approved. Review it with campaign:text:show and approve it with campaign:text:approve before generating images.`);
	}
	if (state === 'modified') {
		throw new CampaignTextError(`${label}: ${TEXT_FILE} was modified after approval (approved ${approval.record.sha256}, now ${revision.sha256}). Restore the approved text or create a new revision with campaign:text:create and review it.`);
	}
	return { ...revision, approval };
}

// Every reviewable string with a stable location, in review order.
export function textEntries(text) {
	const entries = [];
	for (const subject of text.subjects) {
		entries.push({ subject: subject.id, location: `${subject.id}.title`, kind: 'title', value: subject.title });
		for (const channel of text.channels) {
			for (const [name, value] of Object.entries(subject.labels[channel])) {
				entries.push({ subject: subject.id, channel, location: `${subject.id}.labels.${channel}.${name}`, kind: 'label', name, value });
			}
			entries.push({ subject: subject.id, channel, location: `${subject.id}.copy.${channel}`, kind: 'copy', value: subject.copy[channel] });
		}
	}
	return entries;
}

export function terminologyFindings(text, terminology) {
	const terms = discouragedTerms(terminology, text.language);
	const findings = [];
	for (const entry of textEntries(text)) {
		for (const finding of findDiscouragedTerms(entry.value, terms)) {
			findings.push({
				location: entry.location,
				line: finding.line,
				column: finding.column,
				concept: finding.concept,
				matched: finding.matched,
				preferred: finding.preferred,
				source: finding.source,
			});
		}
	}
	return findings;
}

export function subjectById(text, id) {
	const subject = text.subjects.find((item) => item.id === id);
	if (!subject) throw new CampaignTextError(`Revision "${text.revision}" has no subject "${id}".`);
	return subject;
}

// Exact channel copy as stored in the reviewed revision. Never reconstruct it.
export function exportedCopy(text, subjectId, channel) {
	const subject = subjectById(text, subjectId);
	if (!(channel in subject.copy)) throw new CampaignTextError(`Revision "${text.revision}" has no ${channel} copy for "${subjectId}".`);
	return subject.copy[channel];
}

export function serializeText(text) {
	return `${JSON.stringify(text, null, '\t')}\n`;
}

// Creates a new unapproved revision directory from a draft or an earlier
// revision. Existing revisions are never overwritten, and approval is never
// carried over.
export function createRevision({ sourcePath, outputDir, sourceLabel = sourcePath }) {
	const bytes = readBytes(resolve(sourcePath), sourceLabel);
	const draftText = decodeUtf8(bytes, sourceLabel);
	let draft;
	try {
		draft = parseJsonNoDuplicateKeys(draftText, { label: sourceLabel });
	} catch (error) {
		throw new CampaignTextError(error.message);
	}
	if (!isPlainObject(draft)) throw new CampaignTextError(`${sourceLabel}: top level must be a JSON object.`);
	const revision = basename(resolve(outputDir));
	if (!REVISION_ID_PATTERN.test(revision)) throw new CampaignTextError(`Output directory name "${revision}" is not a valid revision ID such as "v02".`);
	const { migration, basedOn, ...rest } = draft;
	const text = {
		...rest,
		revision,
		basedOn: { path: sourceLabel, ...(typeof draft.revision === 'string' ? { revision: draft.revision } : {}), sha256: sha256(bytes) },
	};
	const ordered = orderKeys(text);
	const diagnostics = campaignTextDiagnostics(ordered);
	if (diagnostics.length) throw new CampaignTextError(`Cannot create revision "${revision}" from ${sourceLabel}:`, diagnostics);
	const dir = resolve(outputDir);
	if (existsSync(dir)) throw new CampaignTextError(`${dir} already exists. Revisions are never overwritten; choose a new revision ID.`);
	mkdirSync(dir, { recursive: true });
	const file = resolve(dir, TEXT_FILE);
	writeFileSync(file, serializeText(ordered), { flag: 'wx' });
	return readRevision(file);
}

function orderKeys(text) {
	const order = ['formatVersion', 'site', 'campaign', 'edition', 'language', 'revision', 'basedOn', 'notes', 'channels', 'subjects'];
	const result = {};
	for (const key of order) if (text[key] !== undefined) result[key] = text[key];
	for (const key of Object.keys(text)) if (!(key in result)) result[key] = text[key];
	return result;
}

// Records approval of the exact reviewed bytes. Glossary findings must each be
// covered by an explicit preservation exception; exceptions without findings
// are rejected so they cannot silently accumulate.
export function approveRevision({ path, label = path, expectedSha256, reviewer, preserve = [], reason, terminology, now = new Date() }) {
	const revision = readRevision(path, { label });
	if (typeof expectedSha256 !== 'string' || !SHA256_PATTERN.test(expectedSha256)) {
		throw new CampaignTextError('Approval requires --sha256 with the 64-character digest printed by campaign:text:show.');
	}
	if (expectedSha256 !== revision.sha256) {
		throw new CampaignTextError(`${label} changed since it was reviewed (reviewed ${expectedSha256}, now ${revision.sha256}). Inspect it again with campaign:text:show.`);
	}
	if (typeof reviewer !== 'string' || !reviewer.trim()) throw new CampaignTextError('Approval requires --reviewer.');
	const existing = approvalStatus(revision);
	if (existing.state === 'approved') throw new CampaignTextError(`Revision "${revision.text.revision}" is already approved by ${existing.approval.record.reviewer} at ${existing.approval.record.approvedAt}.`);
	if (existing.state === 'modified') {
		throw new CampaignTextError(`Revision "${revision.text.revision}" was approved for different content (${existing.approval.record.sha256}). Approved revisions are never re-approved; create a new revision with campaign:text:create.`);
	}
	if (terminology.siteId !== revision.text.site) throw new CampaignTextError(`Terminology was loaded for "${terminology.siteId}", but the revision belongs to "${revision.text.site}".`);
	const findings = terminologyFindings(revision.text, terminology);
	const preserved = [...new Set(preserve)];
	if (preserved.length && (typeof reason !== 'string' || !reason.trim())) {
		throw new CampaignTextError('--preserve-terminology requires --reason explaining why the historical wording is kept.');
	}
	const findingConcepts = new Set(findings.map((finding) => finding.concept));
	const unused = preserved.filter((concept) => !findingConcepts.has(concept));
	if (unused.length) throw new CampaignTextError(`No terminology findings for: ${unused.join(', ')}. Remove those --preserve-terminology options.`);
	const uncovered = findings.filter((finding) => !preserved.includes(finding.concept));
	if (uncovered.length) {
		throw new CampaignTextError(
			`Revision "${revision.text.revision}" has unresolved terminology findings. Correct them in a new revision, or keep historical wording explicitly with --preserve-terminology <concept> --reason <text>:`,
			uncovered.map((finding) => `${finding.location}:${finding.line}:${finding.column}: "${finding.matched}" (concept "${finding.concept}"); preferred "${finding.preferred}"`),
		);
	}
	const record = {
		formatVersion: APPROVAL_FORMAT_VERSION,
		revision: revision.text.revision,
		artifact: TEXT_FILE,
		sha256: revision.sha256,
		reviewer: reviewer.trim(),
		approvedAt: now.toISOString(),
		scope: APPROVAL_SCOPE,
		terminology: {
			site: terminology.siteId,
			language: revision.text.language,
			findings,
			exceptions: preserved.map((concept) => ({ concept, reason: reason.trim(), findings: findings.filter((finding) => finding.concept === concept).length })),
		},
	};
	const file = resolve(revision.dir, APPROVAL_FILE);
	// Write to a temporary file, then hard-link it into place: the link fails if
	// another approval appeared meanwhile, and readers never see partial JSON.
	const temporary = `${file}.tmp-${process.pid}`;
	writeFileSync(temporary, `${JSON.stringify(record, null, '\t')}\n`, { flag: 'wx' });
	try {
		linkSync(temporary, file);
	} catch (error) {
		if (error.code === 'EEXIST') throw new CampaignTextError(`${APPROVAL_FILE} appeared for revision "${revision.text.revision}" during approval; inspect it.`);
		throw error;
	} finally {
		rmSync(temporary, { force: true });
	}
	return { revision, record };
}

function indent(text, prefix) {
	return text.split('\n').map((line) => (line ? `${prefix}${line}` : prefix.trimEnd())).join('\n');
}

// A readable review of every label and copy string.
export function formatReview(revision, status, findings) {
	const { text } = revision;
	const lines = [
		`Campaign text ${revision.label}`,
		`${text.site} · ${text.campaign} · edition ${text.edition} · language ${text.language} · revision ${text.revision}`,
		`SHA-256: ${revision.sha256}`,
	];
	if (text.basedOn) lines.push(`Based on: ${text.basedOn.path}${text.basedOn.revision ? ` (revision ${text.basedOn.revision})` : ''} ${text.basedOn.sha256}`);
	if (text.migration) lines.push(`Migrated from: ${text.migration.source} (${Object.keys(text.migration.files).length} hashed source files)`);
	if (status.state === 'approved') lines.push(`Approval: approved by ${status.approval.record.reviewer} at ${status.approval.record.approvedAt}`);
	else if (status.state === 'modified') lines.push(`Approval: INVALID — text.json changed after approval (approved ${status.approval.record.sha256})`);
	else lines.push('Approval: not approved');
	if (text.notes) lines.push('', indent(text.notes, 'Note: '));
	for (const subject of text.subjects) {
		lines.push('', `== ${subject.id} · ${subject.title}`);
		for (const channel of text.channels) {
			lines.push('', `-- ${channel} image labels`);
			for (const [name, value] of Object.entries(subject.labels[channel])) lines.push(`  ${name}: ${value}`);
			const copy = subject.copy[channel];
			lines.push('', `-- ${channel} copy (${copy.endsWith('\n') ? 'ends with a line break' : 'no trailing line break'})`);
			lines.push(indent(copy.replace(/\n$/, ''), '  | '));
		}
	}
	lines.push('');
	if (findings.length) {
		lines.push(`Terminology findings (${findings.length}):`);
		for (const finding of findings) {
			lines.push(`  ${finding.location}:${finding.line}:${finding.column}: discouraged "${finding.matched}" (concept "${finding.concept}", ${finding.source}); preferred "${finding.preferred}"`);
		}
		lines.push('  Correct them in a new revision, or preserve historical wording explicitly when approving.');
	} else {
		lines.push('Terminology: no discouraged wording found. This does not approve unlisted wording.');
	}
	if (status.state === 'unapproved') {
		const preserve = [...new Set(findings.map((finding) => finding.concept))].map((concept) => ` --preserve-terminology ${concept}`).join('');
		lines.push('', `After reviewing, approve with: npm run campaign:text:approve -- ${revision.label} --sha256 ${revision.sha256} --reviewer <name>${preserve}${preserve ? ' --reason <text>' : ''}`);
	}
	return lines.join('\n');
}

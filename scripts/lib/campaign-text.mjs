// Campaign text: validation, review output, document export, and exact copy
// for image builders.
//
// One `text.json` per campaign edition holds every image label and channel
// copy for each subject. It is generated once, delivered to people as a Google
// Doc, and edited in place when feedback arrives; Git keeps the history.
// Nothing here renders images. See docs/campaign-text.md.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { CliError } from './cli-error.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';
import { decodeUtf8, findDiscouragedTerms, discouragedTerms } from './terminology.mjs';

export const CAMPAIGN_TEXT_FORMAT_VERSION = 1;
export const TEXT_FILE = 'text.json';

const SITE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const REVISION_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
// Subject, channel, and label IDs become path segments or lookup keys: no dots,
// slashes, or uppercase.
const SAFE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GOOGLE_DOC_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/[A-Za-z0-9_-]+(?:[/?#][^\s]*)?$/;
// Labels are single-line image text; copy may contain line breaks but no other
// control characters (CR is rejected so exported bytes stay unambiguous).
const LABEL_FORBIDDEN = /[\u0000-\u001f\u007f]/;
const COPY_FORBIDDEN = /[\u0000-\u0009\u000b-\u001f\u007f]/;

const TEXT_KEYS = new Set(['formatVersion', 'site', 'campaign', 'edition', 'language', 'revision', 'basedOn', 'migration', 'notes', 'googleDoc', 'channels', 'subjects']);
const SUBJECT_KEYS = new Set(['id', 'title', 'labels', 'copy', 'senderCopy']);
const BASED_ON_KEYS = new Set(['path', 'revision', 'sha256']);
const MIGRATION_KEYS = new Set(['source', 'note', 'files']);

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
	// revision, basedOn, and migration are optional provenance kept by earlier
	// revision-directory files; new text is edited in place.
	if (data.revision !== undefined) requireString(data.revision, 'revision', diagnostics, REVISION_ID_PATTERN, 'a lowercase revision ID such as "v01"');
	if (data.notes !== undefined && typeof data.notes !== 'string') diagnostics.push('notes: must be a string when present.');
	if (data.googleDoc !== undefined && (typeof data.googleDoc !== 'string' || !GOOGLE_DOC_PATTERN.test(data.googleDoc))) {
		diagnostics.push('googleDoc: must be a https://docs.google.com/document/d/… URL when present.');
	}
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
		// Optional per-sender versions of a channel's copy, keyed by channel and
		// then by sender ID (for example a campaign team member ID). Builders
		// still export `copy`; these are delivered alongside it.
		if (subject.senderCopy !== undefined) {
			if (!isPlainObject(subject.senderCopy)) {
				diagnostics.push(`${where}.senderCopy: must be an object keyed by channel.`);
				return;
			}
			for (const [channel, senders] of Object.entries(subject.senderCopy)) {
				const at = `${where}.senderCopy.${channel}`;
				if (!channelSet.has(channel)) diagnostics.push(`${at}: channel "${channel}" is not listed in channels.`);
				if (!isPlainObject(senders) || !Object.keys(senders).length) {
					diagnostics.push(`${at}: required non-empty object of sender ID to copy.`);
					continue;
				}
				for (const [sender, copy] of Object.entries(senders)) {
					if (!SAFE_ID_PATTERN.test(sender)) diagnostics.push(`${at}.${sender}: sender IDs must be safe lowercase kebab-case IDs.`);
					validateCopy(copy, `${at}.${sender}`, diagnostics);
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

// Accepts a text.json file or a directory containing one.
export function resolveTextPath(path) {
	const absolute = resolve(path);
	if (existsSync(absolute) && statSync(absolute).isDirectory()) return resolve(absolute, TEXT_FILE);
	return absolute;
}

// Reads and validates campaign text. `expect` lets a builder refuse text that
// belongs to another site, campaign, or edition.
export function readCampaignText(path, { label = path, expect = {} } = {}) {
	const file = resolveTextPath(path);
	const bytes = readBytes(file, label);
	const text = parseCampaignText(bytes, label);
	for (const [key, value] of Object.entries(expect)) {
		if (text[key] !== value) throw new CampaignTextError(`${label}: ${key} is "${text[key]}", but this builder requires "${value}".`);
	}
	return { file, label, bytes, sha256: sha256(bytes), text };
}

// Per-sender copy for one channel, as [senderId, copy] pairs in file order.
export function senderCopies(subject, channel) {
	return Object.entries(subject.senderCopy?.[channel] ?? {});
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
			for (const [sender, value] of senderCopies(subject, channel)) {
				entries.push({ subject: subject.id, channel, sender, location: `${subject.id}.senderCopy.${channel}.${sender}`, kind: 'copy', value });
			}
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
	if (!subject) throw new CampaignTextError(`Campaign text has no subject "${id}".`);
	return subject;
}

// Exact channel copy as stored in the campaign text. Never reconstruct it.
export function exportedCopy(text, subjectId, channel) {
	const subject = subjectById(text, subjectId);
	if (!(channel in subject.copy)) throw new CampaignTextError(`Campaign text has no ${channel} copy for "${subjectId}".`);
	return subject.copy[channel];
}

export function serializeText(text) {
	return `${JSON.stringify(text, null, '\t')}\n`;
}

function indent(text, prefix) {
	return text.split('\n').map((line) => (line ? `${prefix}${line}` : prefix.trimEnd())).join('\n');
}

function formatFindings(findings) {
	if (!findings.length) return ['Terminology: no discouraged wording found. Unlisted wording is not checked.'];
	return [
		`Terminology findings (${findings.length}) — review each in context before delivering:`,
		...findings.map((finding) => `  ${finding.location}:${finding.line}:${finding.column}: discouraged "${finding.matched}" (concept "${finding.concept}", ${finding.source}); preferred "${finding.preferred}"`),
	];
}

// A readable terminal review of every label and copy string.
export function formatReview(campaignText, findings) {
	const { text } = campaignText;
	const lines = [
		`Campaign text ${campaignText.label}`,
		`${text.site} · ${text.campaign} · edition ${text.edition} · language ${text.language}`,
		`Google Doc: ${text.googleDoc ?? 'not delivered yet'}`,
	];
	if (text.notes) lines.push('', indent(text.notes, 'Note: '));
	for (const subject of text.subjects) {
		lines.push('', `== ${subject.id} · ${subject.title}`);
		for (const channel of text.channels) {
			lines.push('', `-- ${channel} image labels`);
			for (const [name, value] of Object.entries(subject.labels[channel])) lines.push(`  ${name}: ${value}`);
			const copy = subject.copy[channel];
			lines.push('', `-- ${channel} copy (${copy.endsWith('\n') ? 'ends with a line break' : 'no trailing line break'})`);
			lines.push(indent(copy.replace(/\n$/, ''), '  | '));
			for (const [sender, value] of senderCopies(subject, channel)) {
				lines.push('', `-- ${channel} copy from ${sender} (${value.endsWith('\n') ? 'ends with a line break' : 'no trailing line break'})`);
				lines.push(indent(value.replace(/\n$/, ''), '  | '));
			}
		}
	}
	lines.push('', ...formatFindings(findings));
	return lines.join('\n');
}

const CHANNEL_NAMES = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', meetup: 'Meetup' };
const DOCUMENT_LABELS = {
	en: { image: 'Text on the image', copy: 'Text to copy' },
	es: { image: 'Texto en la imagen', copy: 'Texto para copiar' },
};

function escapeHtml(value) {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function humanize(id) {
	return CHANNEL_NAMES[id] ?? id.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function copyParagraphs(copy) {
	return copy.replace(/\n+$/, '').split(/\n{2,}/).map((paragraph) => `<p>${paragraph.split('\n').map(escapeHtml).join('<br>')}</p>`);
}

// The deliverable as one HTML page. Uploaded to Google Drive with
// contentMimeType text/html, it converts to an editable Google Doc. Copy keeps
// its line breaks; blank lines separate paragraphs.
export function formatDocument(text, { title = `${text.campaign} · ${text.edition}` } = {}) {
	const words = DOCUMENT_LABELS[text.language.split('-')[0]] ?? DOCUMENT_LABELS.en;
	const parts = [
		'<!doctype html>',
		`<html lang="${escapeHtml(text.language)}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>`,
		`<h1>${escapeHtml(title)}</h1>`,
	];
	for (const subject of text.subjects) {
		parts.push(`<h2>${escapeHtml(subject.title)}</h2>`);
		for (const channel of text.channels) {
			parts.push(`<h3>${escapeHtml(humanize(channel))}</h3>`, `<p><b>${words.image}</b></p>`, '<ul>');
			for (const value of Object.values(subject.labels[channel])) parts.push(`<li>${escapeHtml(value)}</li>`);
			parts.push('</ul>', `<p><b>${words.copy}</b></p>`, ...copyParagraphs(subject.copy[channel]));
			for (const [sender, value] of senderCopies(subject, channel)) {
				parts.push(`<p><b>${words.copy} · ${escapeHtml(humanize(sender))}</b></p>`, ...copyParagraphs(value));
			}
		}
	}
	parts.push('</body></html>', '');
	return parts.join('\n');
}

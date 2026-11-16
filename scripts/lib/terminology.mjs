// Shared and project terminology: loading, validation, merging, and matching.
//
// The shared glossary lives in the repository root `terminology.json`; a
// project may add concepts or explicitly override shared language entries in
// `sites/<site-id>/brand/terminology.json`. Everything here is read-only: copy
// is scanned and reported on, never rewritten.
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { CliError } from './cli-error.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';

export const TERMINOLOGY_FORMAT_VERSION = 1;
export const SHARED_TERMINOLOGY_FILE = 'terminology.json';
export const PROJECT_TERMINOLOGY_FILE = 'brand/terminology.json';

const CONCEPT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const SITE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const WORD_CHARACTER = '[\\p{L}\\p{N}\\p{M}]';

const FILE_KEYS = new Set(['$schema', 'formatVersion', 'concepts']);
const CONCEPT_KEYS = new Set(['context', 'sources', 'invariant', 'languages']);
const ENTRY_KEYS = new Set(['preferred', 'discouraged', 'sources', 'override']);

export class TerminologyError extends CliError {
	constructor(message, diagnostics = []) {
		super(diagnostics.length ? `${message}\n${diagnostics.map((line) => `  - ${line}`).join('\n')}` : message);
		this.diagnostics = diagnostics;
	}
}

export function validateLanguage(language) {
	if (typeof language !== 'string' || !LANGUAGE_PATTERN.test(language)) {
		throw new CliError(`Invalid language "${language}". Use a code such as "es" or "pt-BR"; no fallback between codes is applied.`);
	}
	return language;
}

export function decodeUtf8(bytes, label) {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new CliError(`${label} is not valid UTF-8.`);
	}
}

// Resolves a project folder under `sites/` without requiring registration in
// sites.json, so brand-only projects can carry a glossary.
export function resolveProjectTerminology(platformDir, siteId) {
	if (typeof siteId !== 'string' || !SITE_ID_PATTERN.test(siteId)) {
		throw new CliError(`Invalid site ID "${siteId}". Use the folder name under sites/, for example "lamutable.es".`);
	}
	const sitesDir = resolve(platformDir, 'sites');
	const projectDir = resolve(sitesDir, siteId);
	if (!existsSync(projectDir) || !statSync(projectDir).isDirectory()) {
		throw new CliError(`Unknown project "${siteId}": sites/${siteId} does not exist.`);
	}
	assertInside(realpathSync(sitesDir), realpathSync(projectDir), `Project "${siteId}" resolves outside sites/.`);
	const file = resolve(projectDir, PROJECT_TERMINOLOGY_FILE);
	const label = `sites/${siteId}/${PROJECT_TERMINOLOGY_FILE}`;
	if (!existsSync(file)) return { projectDir, file: null, label };
	assertInside(realpathSync(projectDir), realpathSync(file), `${label} resolves outside its project folder.`);
	return { projectDir, file, label };
}

function assertInside(parent, child, message) {
	const path = relative(parent, child);
	if (!path || path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) throw new CliError(message);
}

export function readTerminologyFile(file, label) {
	let bytes;
	try {
		bytes = readFileSync(file);
	} catch (error) {
		throw new TerminologyError(`Cannot read ${label}: ${error.message}`);
	}
	const text = decodeUtf8(bytes, label);
	try {
		return parseJsonNoDuplicateKeys(text.replace(/^﻿/, ''), { label });
	} catch (error) {
		throw new TerminologyError(error.message);
	}
}

// Loads the shared glossary and the selected project's optional glossary and
// returns the validated effective terminology.
export function loadEffectiveTerminology(platformDir, siteId) {
	const project = resolveProjectTerminology(platformDir, siteId);
	const sharedFile = resolve(platformDir, SHARED_TERMINOLOGY_FILE);
	if (!existsSync(sharedFile)) throw new TerminologyError(`Shared glossary ${SHARED_TERMINOLOGY_FILE} is missing.`);
	const shared = { label: SHARED_TERMINOLOGY_FILE, data: readTerminologyFile(sharedFile, SHARED_TERMINOLOGY_FILE) };
	const projectGlossary = project.file ? { label: project.label, data: readTerminologyFile(project.file, project.label) } : null;
	return { siteId, ...buildEffectiveTerminology(shared, projectGlossary) };
}

// Validates both glossaries and merges them. Every problem is collected so an
// author can fix a file in one pass; any problem rejects the whole glossary.
export function buildEffectiveTerminology(shared, project = null) {
	const diagnostics = [];
	const report = (label, conceptId, language, message) => {
		const where = [label, conceptId && `concept "${conceptId}"`, language && `language "${language}"`].filter(Boolean).join(', ');
		diagnostics.push(`${where}: ${message}`);
	};

	const sharedConcepts = validateFileShape(shared, report);
	const projectConcepts = project ? validateFileShape(project, report) : {};
	const concepts = {};

	for (const [id, raw] of Object.entries(sharedConcepts)) {
		const concept = validateDefinition(raw, id, shared.label, report);
		if (concept) concepts[id] = concept;
	}

	for (const [id, raw] of Object.entries(projectConcepts)) {
		if (!Object.hasOwn(sharedConcepts, id)) {
			const concept = validateDefinition(raw, id, project.label, report);
			if (concept) concepts[id] = concept;
			continue;
		}
		const base = concepts[id];
		if (!isPlainObject(raw)) {
			report(project.label, id, null, 'must be an object.');
			continue;
		}
		for (const key of Object.keys(raw)) {
			if (key !== 'languages') {
				report(project.label, id, null, `cannot change "${key}" of a shared concept; project files may only add or override its language entries.`);
			}
		}
		if (!base) continue; // the shared definition is already reported as invalid
		if (!isPlainObject(raw.languages) || Object.keys(raw.languages).length === 0) {
			report(project.label, id, null, '"languages" must be a non-empty object when extending a shared concept.');
			continue;
		}
		const languages = { ...base.languages };
		for (const [language, rawEntry] of Object.entries(raw.languages)) {
			const sharedEntry = base.languages[language];
			const entry = validateEntry(rawEntry, { id, language, label: project.label, invariant: base.invariant, report, overrideAllowed: Boolean(sharedEntry) });
			if (!entry) continue;
			if (sharedEntry && !entry.override) {
				report(project.label, id, language, `replaces the ${shared.label} entry; add "override": true to make the override explicit.`);
				continue;
			}
			languages[language] = { ...entry, overrides: sharedEntry ? sharedEntry.source : null };
		}
		concepts[id] = { ...base, languages };
	}

	validateEffectiveConflicts(concepts, report);
	if (diagnostics.length) throw new TerminologyError('Invalid terminology glossary:', diagnostics);

	const sorted = Object.fromEntries(Object.keys(concepts).sort().map((id) => [id, concepts[id]]));
	return { files: { shared: shared.label, project: project?.label ?? null }, concepts: sorted };
}

function validateFileShape({ label, data }, report) {
	if (!isPlainObject(data)) {
		report(label, null, null, 'must contain a JSON object.');
		return {};
	}
	for (const key of Object.keys(data)) {
		if (!FILE_KEYS.has(key)) report(label, null, null, `unsupported field "${key}".`);
	}
	if (data.$schema !== undefined && typeof data.$schema !== 'string') report(label, null, null, '"$schema" must be a string.');
	if (data.formatVersion !== TERMINOLOGY_FORMAT_VERSION) {
		report(label, null, null, `unsupported formatVersion ${JSON.stringify(data.formatVersion)}; expected ${TERMINOLOGY_FORMAT_VERSION}.`);
	}
	if (!isPlainObject(data.concepts)) {
		report(label, null, null, '"concepts" must be an object keyed by concept ID.');
		return {};
	}
	const concepts = {};
	for (const [id, concept] of Object.entries(data.concepts)) {
		if (!CONCEPT_ID_PATTERN.test(id)) {
			report(label, id, null, 'concept IDs must be lowercase kebab-case, for example "contact-improvisation".');
			continue;
		}
		concepts[id] = concept;
	}
	return concepts;
}

function validateDefinition(raw, id, label, report) {
	if (!isPlainObject(raw)) {
		report(label, id, null, 'must be an object.');
		return null;
	}
	let valid = true;
	const fail = (message) => {
		report(label, id, null, message);
		valid = false;
	};
	for (const key of Object.keys(raw)) {
		if (!CONCEPT_KEYS.has(key)) fail(`unsupported field "${key}".`);
	}
	const context = normalizeText(raw.context);
	if (!context) fail('"context" must be a non-empty string describing where the term applies.');
	const sources = validateSources(raw.sources, (message) => fail(message), true);
	let invariant = null;
	if (raw.invariant !== undefined) {
		invariant = validateTerm(raw.invariant, (message) => fail(`"invariant" ${message}`));
	}
	const rawLanguages = raw.languages ?? {};
	if (!isPlainObject(rawLanguages)) {
		fail('"languages" must be an object keyed by language code.');
		return null;
	}
	if (raw.invariant === undefined && Object.keys(rawLanguages).length === 0) {
		fail('define at least one language entry or an "invariant" do-not-translate name.');
	}
	const languages = {};
	for (const [language, rawEntry] of Object.entries(rawLanguages)) {
		const entry = validateEntry(rawEntry, { id, language, label, invariant, report, overrideAllowed: false });
		if (entry) languages[language] = { ...entry, overrides: null };
		else valid = false;
	}
	if (!valid) return null;
	return { id, context, sources, invariant, definedIn: label, languages };
}

function validateEntry(raw, { id, language, label, invariant, report, overrideAllowed }) {
	let valid = true;
	const fail = (message) => {
		report(label, id, language, message);
		valid = false;
	};
	if (!LANGUAGE_PATTERN.test(language)) {
		fail('language keys must look like "es" or "pt-BR".');
		return null;
	}
	if (!isPlainObject(raw)) {
		fail('must be an object.');
		return null;
	}
	for (const key of Object.keys(raw)) {
		if (!ENTRY_KEYS.has(key)) fail(`unsupported field "${key}".`);
	}
	if (raw.override !== undefined) {
		if (raw.override !== true) fail('"override" may only be true; remove it for an entry that does not replace a shared one.');
		else if (!overrideAllowed) fail('declares "override": true but there is no shared entry for this concept and language to override; remove it.');
	}
	let preferred = null;
	if (invariant) {
		if (raw.preferred !== undefined) fail(`"preferred" is not allowed: the concept is the do-not-translate name "${invariant}".`);
		preferred = invariant;
	} else {
		preferred = validateTerm(raw.preferred, (message) => fail(`"preferred" ${message}`));
	}
	const discouraged = [];
	if (raw.discouraged !== undefined) {
		if (!Array.isArray(raw.discouraged)) {
			fail('"discouraged" must be an array of strings.');
		} else {
			const seen = new Set();
			for (const variant of raw.discouraged) {
				const term = validateTerm(variant, (message) => fail(`discouraged variant ${message}`));
				if (!term) continue;
				const key = foldTerm(term);
				if (seen.has(key)) fail(`discouraged variant "${term}" is listed more than once.`);
				seen.add(key);
				if (preferred && key === foldTerm(preferred)) fail(`"${term}" is both preferred and discouraged.`);
				else if (preferred && findTermOccurrences(preferred, term).length) {
					fail(`discouraged variant "${term}" occurs inside the preferred wording "${preferred}", so correct copy would be reported.`);
				}
				discouraged.push(term);
			}
		}
	}
	if (invariant && discouraged.length === 0) fail('an entry for a do-not-translate concept must list "discouraged" variants.');
	const sources = validateSources(raw.sources, (message) => fail(message), false);
	if (!valid) return null;
	return { preferred, discouraged, sources, override: raw.override === true, source: label };
}

function validateEffectiveConflicts(concepts, report) {
	const languages = new Set(Object.values(concepts).flatMap((concept) => Object.keys(concept.languages)));
	for (const language of [...languages].sort()) {
		const approved = [];
		const variants = new Map();
		for (const concept of Object.values(concepts)) {
			const entry = effectiveEntry(concept, language);
			if (!entry) continue;
			approved.push({ id: concept.id, term: entry.preferred });
			for (const variant of entry.discouraged) {
				const key = foldTerm(variant);
				const other = variants.get(key);
				if (other && other.id !== concept.id) {
					report(entry.source, concept.id, language, `discouraged variant "${variant}" is also discouraged by concept "${other.id}" (${other.source}), so its replacement is ambiguous.`);
				}
				variants.set(key, { id: concept.id, source: entry.source, variant });
			}
		}
		for (const { id, variant, source } of variants.values()) {
			for (const target of approved) {
				if (target.id === id) continue;
				if (findTermOccurrences(target.term, variant).length) {
					report(source, id, language, `discouraged variant "${variant}" occurs in the approved wording "${target.term}" of concept "${target.id}".`);
				}
			}
		}
	}
}

// Returns the wording to use for a concept in a language, or null when no
// approved wording exists. Do-not-translate names apply in every language.
export function effectiveEntry(concept, language) {
	const entry = concept.languages[language];
	if (concept.invariant) {
		return {
			preferred: concept.invariant,
			discouraged: entry?.discouraged ?? [],
			sources: entry?.sources ?? [],
			invariant: true,
			source: entry?.source ?? concept.definedIn,
			overrides: entry?.overrides ?? null,
		};
	}
	if (!entry) return null;
	return { ...entry, invariant: false };
}

export function requireConcepts(terminology, conceptIds) {
	const unknown = conceptIds.filter((id) => !Object.hasOwn(terminology.concepts, id));
	if (unknown.length) {
		throw new CliError(`Unknown concept${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Available: ${Object.keys(terminology.concepts).join(', ') || '(none)'}`);
	}
}

export function missingTranslations(terminology, language, conceptIds) {
	return conceptIds.filter((id) => !effectiveEntry(terminology.concepts[id], language));
}

export function discouragedTerms(terminology, language) {
	const terms = [];
	for (const concept of Object.values(terminology.concepts)) {
		const entry = effectiveEntry(concept, language);
		if (!entry) continue;
		for (const variant of entry.discouraged) {
			terms.push({ concept: concept.id, variant, preferred: entry.preferred, source: entry.source });
		}
	}
	return terms;
}

// Reports every discouraged occurrence in `text` with its 1-based line and
// column (in code points) in the original text. Matching is Unicode-normalized,
// case-insensitive, whole-word, and tolerant of any whitespace run (including
// line breaks) between words. Accents are significant.
export function findDiscouragedTerms(text, terms) {
	const source = text.replace(/^﻿/, '');
	const folded = foldWithMap(source);
	const lineStarts = [0];
	for (const match of source.matchAll(/\r\n|\n|\r/g)) lineStarts.push(match.index + match[0].length);

	const findings = [];
	const byConcept = new Map();
	for (const term of terms) {
		for (const [start, end] of matchFolded(folded, term.variant)) {
			const list = byConcept.get(term.concept) ?? [];
			list.push({ term, start, end });
			byConcept.set(term.concept, list);
		}
	}
	for (const matches of byConcept.values()) {
		// Prefer the longest variant when one variant of a concept contains another.
		matches.sort((a, b) => a.start - b.start || b.end - a.end);
		let lastEnd = -1;
		for (const match of matches) {
			if (match.start < lastEnd) continue;
			lastEnd = match.end;
			findings.push(describeMatch(source, lineStarts, match));
		}
	}
	return findings.sort((a, b) => a.offset - b.offset || a.concept.localeCompare(b.concept));
}

function describeMatch(source, lineStarts, { term, start, end }) {
	const lineIndex = lineIndexAt(lineStarts, start);
	const lineStart = lineStarts[lineIndex];
	const endLineIndex = lineIndexAt(lineStarts, Math.max(start, end - 1));
	const nextLineStart = lineStarts[endLineIndex + 1] ?? source.length;
	const context = source.slice(lineStart, nextLineStart).replace(/(\r\n|\n|\r)+$/, '').replace(/\r\n|\n|\r/g, ' ⏎ ').trim();
	return {
		offset: start,
		line: lineIndex + 1,
		column: [...source.slice(lineStart, start)].length + 1,
		concept: term.concept,
		matched: source.slice(start, end),
		variant: term.variant,
		preferred: term.preferred,
		source: term.source,
		context: truncate(context, 160),
	};
}

function lineIndexAt(lineStarts, offset) {
	let low = 0;
	let high = lineStarts.length - 1;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (lineStarts[middle] <= offset) low = middle;
		else high = middle - 1;
	}
	return low;
}

// Returns [start, end) offsets in the original text for whole-word matches.
export function findTermOccurrences(text, term) {
	return matchFolded(foldWithMap(text), term);
}

function matchFolded({ folded, starts, ends }, term) {
	const words = foldTerm(term).split(/\s+/).filter(Boolean);
	if (!words.length) return [];
	const body = words.map(escapeRegExp).join('\\s+');
	const pattern = new RegExp(`(?<!${WORD_CHARACTER})${body}(?!${WORD_CHARACTER})`, 'gu');
	const results = [];
	for (const match of folded.matchAll(pattern)) {
		results.push([starts[match.index], ends[match.index + match[0].length - 1]]);
	}
	return results;
}

// Folds text to NFC lowercase while remembering, for each folded code unit,
// which original span it came from, so findings point at the source text.
function foldWithMap(text) {
	let folded = '';
	const starts = [];
	const ends = [];
	for (const match of text.matchAll(/\P{M}\p{M}*|\p{M}+/gsu)) {
		const start = match.index;
		const end = start + match[0].length;
		const piece = match[0].normalize('NFC').toLowerCase().normalize('NFC');
		for (let index = 0; index < piece.length; index += 1) {
			starts.push(start);
			ends.push(end);
		}
		folded += piece;
	}
	return { folded, starts, ends };
}

export function foldTerm(term) {
	return term.normalize('NFC').toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

function validateTerm(value, fail) {
	if (typeof value !== 'string' || !value.trim()) {
		fail('must be a non-empty string.');
		return null;
	}
	if (value !== value.trim()) {
		fail(`"${value}" must not start or end with whitespace.`);
		return null;
	}
	if (/[\r\n]/.test(value)) {
		fail(`"${value}" must be a single line.`);
		return null;
	}
	return value.normalize('NFC');
}

function validateSources(value, fail, required) {
	if (value === undefined) {
		if (required) fail('"sources" must list at least one reference (URL or document) supporting the wording.');
		return [];
	}
	if (!Array.isArray(value) || (required && value.length === 0) || value.some((item) => !normalizeText(item))) {
		fail('"sources" must be an array of non-empty strings.');
		return [];
	}
	if (new Set(value).size !== value.length) fail('"sources" contains duplicates.');
	return [...value];
}

function normalizeText(value) {
	return typeof value === 'string' && value.trim() ? value.trim().normalize('NFC') : null;
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function truncate(value, length) {
	const characters = [...value];
	return characters.length > length ? `${characters.slice(0, length - 1).join('')}…` : value;
}

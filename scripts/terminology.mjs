#!/usr/bin/env node
// Read-only terminology consultation and copy checks. See docs/terminology.md.
//
// Exit codes: 0 success, 1 terminology findings or missing requested
// translations, 2 invalid input or configuration.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from './lib/cli-error.mjs';
import {
	decodeUtf8,
	discouragedTerms,
	effectiveEntry,
	findDiscouragedTerms,
	loadEffectiveTerminology,
	missingTranslations,
	requireConcepts,
	validateLanguage,
} from './lib/terminology.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = [
	'Usage:',
	'  npm run terminology:show -- --site <site-id> --language <language> [--concept <id> ...]',
	'  npm run terminology:check -- --site <site-id> --language <language> [--concept <id> ...] <file> ...',
].join('\n');

export function parseArgs(argv) {
	const [operation, ...rest] = argv;
	if (operation !== 'show' && operation !== 'check') throw new CliError(`Unknown operation "${operation ?? ''}".\n${USAGE}`);
	const options = { operation, site: undefined, language: undefined, concepts: [], files: [] };
	let positionalOnly = false;
	for (let index = 0; index < rest.length; index += 1) {
		const argument = rest[index];
		if (positionalOnly || !argument.startsWith('-')) {
			options.files.push(argument);
			continue;
		}
		if (argument === '--') {
			positionalOnly = true;
			continue;
		}
		const match = /^(--site|--language|--concept)(?:=(.*))?$/s.exec(argument);
		if (!match) throw new CliError(`Unsupported option "${argument}".\n${USAGE}`);
		const [, name, inline] = match;
		let value = inline;
		if (value === undefined) {
			value = rest[index + 1];
			index += 1;
		}
		if (value === undefined || value === '' || value.startsWith('--')) throw new CliError(`Option ${name} requires a value.`);
		if (name === '--concept') {
			if (!options.concepts.includes(value)) options.concepts.push(value);
			continue;
		}
		const key = name.slice(2);
		if (options[key] !== undefined) throw new CliError(`Duplicate option: ${name}`);
		options[key] = value;
	}
	if (!options.site) throw new CliError(`Missing --site.\n${USAGE}`);
	if (!options.language) throw new CliError(`Missing --language.\n${USAGE}`);
	validateLanguage(options.language);
	if (operation === 'show' && options.files.length) throw new CliError('terminology:show does not take files.');
	if (operation === 'check' && !options.files.length) throw new CliError(`terminology:check requires at least one copy file.\n${USAGE}`);
	return options;
}

function readCopyFile(path, baseDir) {
	const absolute = resolve(baseDir, path);
	if (!existsSync(absolute)) throw new CliError(`Copy file not found: ${path}`);
	if (!statSync(absolute).isFile()) throw new CliError(`Not a file: ${path} (directories are not scanned recursively).`);
	return decodeUtf8(readFileSync(absolute), path);
}

function formatSources(sources) {
	return sources.length ? sources.join('; ') : '(none)';
}

function show(terminology, options, out) {
	const { language } = options;
	const ids = options.concepts.length ? options.concepts : Object.keys(terminology.concepts);
	out(`Effective terminology for ${terminology.siteId}, language "${language}"`);
	out(`Shared glossary: ${terminology.files.shared}`);
	out(`Project glossary: ${terminology.files.project ?? '(none)'}`);
	const missing = [];
	for (const id of ids) {
		const concept = terminology.concepts[id];
		const entry = effectiveEntry(concept, language);
		out('');
		out(`${id} (defined in ${concept.definedIn})`);
		if (!entry) {
			out(`  Missing: no approved "${language}" wording. Flag for review; do not present a translation as approved.`);
			missing.push(id);
		} else if (entry.invariant) {
			out(`  Do not translate: ${entry.preferred}`);
		} else {
			out(`  Preferred: ${entry.preferred}`);
		}
		if (entry?.discouraged.length) out(`  Discouraged: ${entry.discouraged.join('; ')}`);
		if (entry && !entry.invariant) {
			out(`  Entry source: ${entry.source}${entry.overrides ? ` (overrides ${entry.overrides})` : ''}`);
		}
		if (entry?.sources.length) out(`  Entry references: ${formatSources(entry.sources)}`);
		out(`  Context: ${concept.context}`);
		out(`  References: ${formatSources(concept.sources)}`);
	}
	return options.concepts.length && missing.length ? 1 : 0;
}

function check(terminology, options, out, baseDir) {
	const { language } = options;
	const copies = options.files.map((file) => ({ file, text: readCopyFile(file, baseDir) }));
	const terms = discouragedTerms(terminology, language);
	let problems = 0;
	for (const id of missingTranslations(terminology, language, options.concepts)) {
		out(`missing translation: concept "${id}" has no approved "${language}" wording; flag it for review.`);
		problems += 1;
	}
	for (const { file, text } of copies) {
		for (const finding of findDiscouragedTerms(text, terms)) {
			const matched = finding.matched.replace(/\r\n|\n|\r/g, ' ⏎ ');
			out(`${file}:${finding.line}:${finding.column}: discouraged "${matched}" (concept "${finding.concept}", ${finding.source}); preferred: "${finding.preferred}"`);
			out(`  context: ${finding.context}`);
			problems += 1;
		}
	}
	const scope = `${copies.length} file${copies.length === 1 ? '' : 's'}, ${terms.length} discouraged variant${terms.length === 1 ? '' : 's'} for "${language}"`;
	if (problems) {
		out(`${problems} terminology issue${problems === 1 ? '' : 's'} (${scope}). Nothing was changed; review each match, including quotations and unrelated uses.`);
		return 1;
	}
	out(`No discouraged terminology found (${scope}). This does not approve unlisted wording.`);
	return 0;
}

export function main(argv, { out = console.log, baseDir = process.env.INIT_CWD || process.cwd() } = {}) {
	const options = parseArgs(argv);
	const terminology = loadEffectiveTerminology(platformDir, options.site);
	requireConcepts(terminology, options.concepts);
	return options.operation === 'show' ? show(terminology, options, out) : check(terminology, options, out, baseDir);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		process.exitCode = main(process.argv.slice(2));
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exitCode = 2;
	}
}

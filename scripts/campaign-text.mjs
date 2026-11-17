#!/usr/bin/env node
// Inspect campaign text and export it as a document for delivery. Image
// rendering lives in each site's builder. See docs/campaign-text.md.
//
// Exit codes: 0 success, 2 invalid input or configuration.
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from './lib/cli-error.mjs';
import { formatDocument, formatReview, readCampaignText, terminologyFindings } from './lib/campaign-text.mjs';
import { loadEffectiveTerminology } from './lib/terminology.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = [
	'Usage:',
	'  npm run campaign:text:show -- <text.json or its directory>',
	'  npm run campaign:text:doc -- <text.json or its directory> --output <file.html> [--title <document title>] [--force]',
].join('\n');

const OPTIONS = {
	show: { values: new Set(), flags: new Set() },
	doc: { values: new Set(['--output', '--title']), flags: new Set(['--force']) },
};

export function parseArgs(argv) {
	const [operation, ...rest] = argv;
	if (!Object.hasOwn(OPTIONS, operation ?? '')) throw new CliError(`Unknown operation "${operation ?? ''}".\n${USAGE}`);
	const allowed = OPTIONS[operation];
	const options = { operation, positional: [], values: {}, flags: new Set() };
	let positionalOnly = false;
	for (let index = 0; index < rest.length; index += 1) {
		const argument = rest[index];
		if (positionalOnly || !argument.startsWith('-')) {
			options.positional.push(argument);
			continue;
		}
		if (argument === '--') {
			positionalOnly = true;
			continue;
		}
		if (allowed.flags.has(argument)) {
			options.flags.add(argument);
			continue;
		}
		const match = /^(--[a-z0-9-]+)(?:=(.*))?$/s.exec(argument);
		if (!match || !allowed.values.has(match[1])) throw new CliError(`Unsupported option "${argument}" for ${operation}.\n${USAGE}`);
		const [, name, inline] = match;
		let value = inline;
		if (value === undefined) {
			value = rest[index + 1];
			index += 1;
		}
		if (value === undefined || value === '' || value.startsWith('--')) throw new CliError(`Option ${name} requires a value.`);
		if (name in options.values) throw new CliError(`Duplicate option: ${name}`);
		options.values[name] = value;
	}
	if (options.positional.length !== 1) throw new CliError(`campaign:text:${operation} requires exactly one text path.\n${USAGE}`);
	if (operation === 'doc' && !options.values['--output']) throw new CliError(`Missing --output.\n${USAGE}`);
	return options;
}

function display(path, baseDir) {
	const shown = relative(baseDir, path);
	return shown && !shown.startsWith('..') ? shown : path;
}

export function main(argv, { out = console.log, baseDir = process.env.INIT_CWD || process.cwd(), platform = platformDir } = {}) {
	const options = parseArgs(argv);
	const path = resolve(baseDir, options.positional[0]);
	const campaignText = readCampaignText(path, { label: display(path, baseDir) });
	const findings = terminologyFindings(campaignText.text, loadEffectiveTerminology(platform, campaignText.text.site));
	if (options.operation === 'show') {
		out(formatReview(campaignText, findings));
		return 0;
	}
	const output = resolve(baseDir, options.values['--output']);
	if (existsSync(output) && !options.flags.has('--force')) throw new CliError(`${display(output, baseDir)} exists; pass --force to replace it.`);
	writeFileSync(output, formatDocument(campaignText.text, { title: options.values['--title'] }));
	out(`Wrote ${display(output, baseDir)} from ${campaignText.label}.`);
	if (findings.length) out(`Warning: ${findings.length} terminology finding(s); run campaign:text:show to review them before delivering.`);
	out('Upload it to Google Drive as text/html to convert it into a Google Doc, then record the link in googleDoc.');
	return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		process.exitCode = main(process.argv.slice(2));
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exitCode = 2;
	}
}

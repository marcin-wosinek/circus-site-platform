#!/usr/bin/env node
// Prepare, inspect, and approve reviewed campaign text without rendering
// images. See docs/campaign-text.md.
//
// Exit codes: 0 success, 2 invalid input, refused approval, or configuration.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from './lib/cli-error.mjs';
import { approvalStatus, approveRevision, createRevision, formatReview, readRevision, terminologyFindings } from './lib/campaign-text.mjs';
import { loadEffectiveTerminology } from './lib/terminology.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = [
	'Usage:',
	'  npm run campaign:text:create -- --from <draft-or-revision text.json> --output <new revision directory>',
	'  npm run campaign:text:show -- <revision directory or text.json>',
	'  npm run campaign:text:approve -- <revision directory or text.json> --sha256 <digest> --reviewer <name> [--preserve-terminology <concept> ... --reason <text>]',
].join('\n');

const OPTIONS = {
	create: new Set(['--from', '--output']),
	show: new Set([]),
	approve: new Set(['--sha256', '--reviewer', '--preserve-terminology', '--reason']),
};
const REPEATABLE = new Set(['--preserve-terminology']);

export function parseArgs(argv) {
	const [operation, ...rest] = argv;
	if (!(operation in OPTIONS)) throw new CliError(`Unknown operation "${operation ?? ''}".\n${USAGE}`);
	const options = { operation, positional: [], values: {}, preserve: [] };
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
		const match = /^(--[a-z0-9-]+)(?:=(.*))?$/s.exec(argument);
		if (!match || !OPTIONS[operation].has(match[1])) throw new CliError(`Unsupported option "${argument}" for ${operation}.\n${USAGE}`);
		const [, name, inline] = match;
		let value = inline;
		if (value === undefined) {
			value = rest[index + 1];
			index += 1;
		}
		if (value === undefined || value === '' || value.startsWith('--')) throw new CliError(`Option ${name} requires a value.`);
		if (REPEATABLE.has(name)) {
			options.preserve.push(value);
			continue;
		}
		if (name in options.values) throw new CliError(`Duplicate option: ${name}`);
		options.values[name] = value;
	}
	if (operation === 'create') {
		if (options.positional.length) throw new CliError(`campaign:text:create takes no positional arguments.\n${USAGE}`);
		for (const name of ['--from', '--output']) if (!options.values[name]) throw new CliError(`Missing ${name}.\n${USAGE}`);
	} else if (options.positional.length !== 1) {
		throw new CliError(`campaign:text:${operation} requires exactly one revision path.\n${USAGE}`);
	}
	if (operation === 'approve') {
		for (const name of ['--sha256', '--reviewer']) if (!options.values[name]) throw new CliError(`Missing ${name}.\n${USAGE}`);
	}
	return options;
}

function display(path, baseDir) {
	const shown = relative(baseDir, path);
	return shown && !shown.startsWith('..') ? shown : path;
}

export function main(argv, { out = console.log, baseDir = process.env.INIT_CWD || process.cwd(), now = new Date(), platform = platformDir } = {}) {
	const options = parseArgs(argv);
	if (options.operation === 'create') {
		const sourcePath = resolve(baseDir, options.values['--from']);
		const revision = createRevision({ sourcePath, sourceLabel: display(sourcePath, platform), outputDir: resolve(baseDir, options.values['--output']) });
		const label = display(revision.file, baseDir);
		out(`Created unapproved revision "${revision.text.revision}" at ${label}`);
		out(`SHA-256: ${revision.sha256}`);
		out(`Edit it if needed, then review it with: npm run campaign:text:show -- ${label}`);
		return 0;
	}
	const path = resolve(baseDir, options.positional[0]);
	const label = display(path, baseDir);
	if (options.operation === 'show') {
		const revision = readRevision(path, { label });
		const terminology = loadEffectiveTerminology(platform, revision.text.site);
		out(formatReview(revision, approvalStatus(revision), terminologyFindings(revision.text, terminology)));
		return 0;
	}
	const preview = readRevision(path, { label });
	const terminology = loadEffectiveTerminology(platform, preview.text.site);
	const { revision, record } = approveRevision({
		path,
		label,
		expectedSha256: options.values['--sha256'],
		reviewer: options.values['--reviewer'],
		preserve: options.preserve,
		reason: options.values['--reason'],
		terminology,
		now,
	});
	out(`Approved revision "${record.revision}" (${record.sha256}) by ${record.reviewer} at ${record.approvedAt}.`);
	for (const exception of record.terminology.exceptions) out(`Preserved terminology "${exception.concept}" (${exception.findings} finding${exception.findings === 1 ? '' : 's'}): ${exception.reason}`);
	out(`Recorded in ${display(resolve(revision.dir, 'approval.json'), baseDir)}. ${record.scope}`);
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

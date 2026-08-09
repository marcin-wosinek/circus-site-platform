import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { writeJsonFile } from '../scripts/lib/json-file.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(script, args) {
	return spawnSync(process.execPath, [resolve(platformDir, script), ...args], {
		cwd: platformDir,
		encoding: 'utf8',
	});
}

test('import requires an explicit apply flag', () => {
	const result = run('scripts/import-production.mjs', ['circus-it.eu']);
	assert.equal(result.status, 0);
	assert.match(result.stdout, /--apply/);
});

test('import rejects an unknown site before doing work', () => {
	const result = run('scripts/import-production.mjs', ['not-managed']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown site "not-managed"/);
});

test('site commands require a registered site', () => {
	const result = run('scripts/site-command.mjs', ['start', 'not-managed']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown site "not-managed"/);
});

test('generated JSON files use the repository formatting', (context) => {
	const directory = mkdtempSync(resolve(tmpdir(), 'circus-site-platform-'));
	context.after(() => rmSync(directory, { recursive: true }));
	const path = resolve(directory, '.wp-env.json');
	writeJsonFile(path, { plugins: ['example'], config: { WP_DEBUG: true } });

	assert.equal(
		readFileSync(path, 'utf8'),
		'{\n  "plugins": [\n    "example"\n  ],\n  "config": {\n    "WP_DEBUG": true\n  }\n}\n',
	);
});

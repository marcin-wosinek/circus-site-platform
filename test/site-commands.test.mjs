import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

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

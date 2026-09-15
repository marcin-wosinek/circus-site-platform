import assert from 'node:assert/strict';
import test from 'node:test';
import { shellQuote } from '../scripts/lib/shell.mjs';
import { parseEnvFileContents } from '../scripts/lib/env-file.mjs';
import { CliError } from '../scripts/lib/cli-error.mjs';
import {
	buildSshArgs,
	validateRemotePath,
	validateSshKey,
	validateSshPort,
	validateSshTarget,
	validateUrl,
} from '../scripts/lib/ssh-config.mjs';
import { loadSiteRegistry, resolveRegisteredSite } from '../scripts/lib/site-registry.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('shellQuote escapes embedded single quotes', () => {
	assert.equal(shellQuote(`it's a test`), `'it'"'"'s a test'`);
	assert.equal(shellQuote('plain'), `'plain'`);
});

test('parseEnvFileContents reads KEY=VALUE pairs and skips comments/blank lines', () => {
	const values = parseEnvFileContents(
		['# a comment', '', 'PRODUCTION_SSH=user@example-host', 'QUOTED="value with spaces"', "SINGLE='also quoted'"].join('\n'),
		'test.env',
	);
	assert.deepEqual(values, {
		PRODUCTION_SSH: 'user@example-host',
		QUOTED: 'value with spaces',
		SINGLE: 'also quoted',
	});
});

test('parseEnvFileContents rejects a line without an "="', () => {
	assert.throws(() => parseEnvFileContents('NOT_VALID', 'test.env'), /Invalid line in test\.env/);
});

test('ssh-config validators accept good values and reject bad ones', () => {
	assert.doesNotThrow(() => validateSshTarget('user@example-host'));
	assert.throws(() => validateSshTarget(''), CliError);
	assert.throws(() => validateSshTarget('user@host; rm -rf /'), CliError);

	assert.doesNotThrow(() => validateSshPort(undefined));
	assert.doesNotThrow(() => validateSshPort('22'));
	assert.throws(() => validateSshPort('not-a-port'), CliError);
	assert.throws(() => validateSshPort('99999'), CliError);

	assert.doesNotThrow(() => validateSshKey(undefined));
	assert.doesNotThrow(() => validateSshKey('/home/user/.ssh/id_ed25519'));
	assert.throws(() => validateSshKey('relative/key'), CliError);

	assert.doesNotThrow(() => validateRemotePath('/var/www/html'));
	assert.throws(() => validateRemotePath('relative/path'), CliError);
	assert.throws(() => validateRemotePath(undefined), CliError);

	assert.doesNotThrow(() => validateUrl('https://example.test', 'exampleUrl'));
	assert.throws(() => validateUrl('not a url', 'exampleUrl'), /exampleUrl must be a valid URL/);
});

test('buildSshArgs orders port, key, and target', () => {
	assert.deepEqual(
		buildSshArgs({ sshTarget: 'user@host', sshPort: '2222', sshKey: '/keys/id' }),
		['-p', '2222', '-i', '/keys/id', 'user@host'],
	);
	assert.deepEqual(buildSshArgs({ sshTarget: 'user@host' }), ['user@host']);
});

test('resolveRegisteredSite rejects a folder outside sites/', () => {
	const registry = { sites: { escaped: { folder: '../outside', port: 9999, productionUrl: 'https://example.test' } } };
	assert.throws(() => resolveRegisteredSite(registry, 'escaped', platformDir), /unsafe folder/);
});

test('resolveRegisteredSite resolves a real registered site', () => {
	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, 'acro-agenda.es', platformDir);
	assert.equal(site.folder, 'sites/acro-agenda.es');
	assert.equal(projectDir, resolve(platformDir, 'sites/acro-agenda.es'));
});

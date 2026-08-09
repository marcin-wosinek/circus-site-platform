import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { writeJsonFile } from '../scripts/lib/json-file.mjs';
import { resolvePluginDownloads } from '../scripts/lib/plugin-downloads.mjs';
import { fairPluginSlug } from '../scripts/lib/wp-env-plugin-sources.mjs';

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

test('plugin downloads use one fair release and WordPress.org for other plugins', async () => {
	const requests = [];
	const fetchImpl = async (url) => {
		requests.push(url);
		return {
			ok: true,
			json: async () => [{
				tag_name: 'build-2',
				draft: false,
				assets: [
					{ name: 'fair-events.1.2.3.zip', browser_download_url: 'https://example.test/fair-events.zip' },
					{ name: 'fair-form.2.3.4.zip', browser_download_url: 'https://example.test/fair-form.zip' },
				],
			}],
		};
	};

	assert.deepEqual(
		await resolvePluginDownloads(
			['fair-events/fair-events.php', 'akismet/akismet.php', 'fair-form/fair-form.php'],
			{ fetchImpl },
		),
		[
			'https://example.test/fair-events.zip',
			'https://downloads.wordpress.org/plugin/akismet.zip',
			'https://example.test/fair-form.zip',
		],
	);
	assert.equal(requests.length, 1);
});

test('plugin downloads can pin a fair release tag', async () => {
	let requestedUrl;
	const fetchImpl = async (url) => {
		requestedUrl = url;
		return {
			ok: true,
			json: async () => ({
				tag_name: 'build/a',
				draft: false,
				assets: [{ name: 'fair-events.1.2.3.zip', browser_download_url: 'https://example.test/fair-events.zip' }],
			}),
		};
	};

	await resolvePluginDownloads(['fair-events/fair-events.php'], { fetchImpl, fairRelease: 'build/a' });
	assert.match(requestedUrl, /releases\/tags\/build%2Fa$/);
});

test('plugin downloads activate non-experimental plugins before experimental variants', async () => {
	const fetchImpl = async () => ({
		ok: true,
		json: async () => [{
			tag_name: 'build-2',
			draft: false,
			assets: [
				{ name: 'fair-events-experimental.1.0.0.zip', browser_download_url: 'https://example.test/fair-events-experimental.zip' },
				{ name: 'fair-events.2.0.0.zip', browser_download_url: 'https://example.test/fair-events.zip' },
			],
		}],
	});

	assert.deepEqual(
		await resolvePluginDownloads(
			['fair-events-experimental/plugin.php', 'akismet/akismet.php', 'fair-events/plugin.php'],
			{ fetchImpl },
		),
		[
			'https://downloads.wordpress.org/plugin/akismet.zip',
			'https://example.test/fair-events.zip',
			'https://example.test/fair-events-experimental.zip',
		],
	);
});

test('versioned fair release assets get stable wp-env plugin slugs', () => {
	assert.equal(
		fairPluginSlug('https://github.com/example/releases/download/build/fair-events.1.12.0-57-gc1d1e0fd.zip'),
		'fair-events',
	);
	assert.equal(fairPluginSlug('https://downloads.wordpress.org/plugin/akismet.zip'), undefined);
});

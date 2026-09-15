import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseJsonNoDuplicateKeys } from '../scripts/lib/strict-json.mjs';
import { loadContentPublishConfig, resolveContentPublishItem, defaultContentKey } from '../scripts/lib/content-publish-config.mjs';
import {
	ARTIFACT_SCHEMA_VERSION,
	assertUrlsTokenized,
	readExistingArtifact,
	validateArtifactFiles,
	validateManifestShape,
	writeArtifact,
	mimeTypeForExtension,
} from '../scripts/lib/content-artifact.mjs';
import { canonicalizePageState, hashPageState, materializeSiteUrl, tokenizeSiteUrl } from '../scripts/lib/page-normalization.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(script, args) {
	return spawnSync(process.execPath, [resolve(platformDir, script), ...args], { cwd: platformDir, encoding: 'utf8' });
}

function tempDir(context) {
	const directory = mkdtempSync(resolve(tmpdir(), 'circus-content-publish-'));
	context.after(() => rmSync(directory, { recursive: true }));
	return directory;
}

// --- strict-json ---

test('parseJsonNoDuplicateKeys accepts well-formed JSON', () => {
	assert.deepEqual(parseJsonNoDuplicateKeys('{"a":1,"b":[1,2,{"c":3}]}'), { a: 1, b: [1, 2, { c: 3 }] });
});

test('parseJsonNoDuplicateKeys rejects a duplicate top-level key', () => {
	assert.throws(() => parseJsonNoDuplicateKeys('{"a":1,"a":2}'), /Duplicate key "a"/);
});

test('parseJsonNoDuplicateKeys rejects a duplicate nested key', () => {
	assert.throws(() => parseJsonNoDuplicateKeys('{"items":{"homepage":{"type":"page","type":"post"}}}'), /Duplicate key "type"/);
});

test('parseJsonNoDuplicateKeys does not flag the same key name in sibling objects', () => {
	assert.deepEqual(
		parseJsonNoDuplicateKeys('{"items":{"a":{"type":"page"},"b":{"type":"page"}}}'),
		{ items: { a: { type: 'page' }, b: { type: 'page' } } },
	);
});

test('parseJsonNoDuplicateKeys surfaces the underlying syntax error', () => {
	assert.throws(() => parseJsonNoDuplicateKeys('{not json'), /Invalid JSON/);
});

// --- content-publish-config ---

function writeConfig(siteDir, config) {
	writeFileSync(resolve(siteDir, 'content-publish.json'), JSON.stringify(config, null, 2));
}

test('loadContentPublishConfig accepts the acro-agenda.es homepage configuration', () => {
	const config = loadContentPublishConfig(resolve(platformDir, 'sites/acro-agenda.es'), 'acro-agenda.es');
	const item = resolveContentPublishItem(config, 'homepage');
	assert.equal(item.type, 'page');
	assert.equal(item.selector.type, 'page_on_front');
	assert.deepEqual(item.allowedStatuses, ['draft', 'publish']);
	assert.equal(defaultContentKey(config), 'homepage');
});

test('loadContentPublishConfig rejects an artifactDir outside the site directory', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: { homepage: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: '../outside', allowedStatuses: ['publish'], metadata: [] } },
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /must resolve inside the site directory/);
});

test('loadContentPublishConfig rejects two items sharing an artifactDir', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: {
			a: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/shared', allowedStatuses: ['publish'], metadata: [] },
			b: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/shared', allowedStatuses: ['publish'], metadata: [] },
		},
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /share the same artifactDir/);
});

test('loadContentPublishConfig rejects an unsupported status', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: { homepage: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/homepage', allowedStatuses: ['private'], metadata: [] } },
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /unsupported status "private"/);
});

test('loadContentPublishConfig rejects a reserved metadata key', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: {
			homepage: {
				type: 'page',
				selector: { type: 'page_on_front' },
				artifactDir: 'content/homepage',
				allowedStatuses: ['publish'],
				metadata: ['_circus_content_key'],
			},
		},
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /reserved for internal use/);
});

test('loadContentPublishConfig rejects an unknown top-level item field', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: {
			homepage: {
				type: 'page',
				selector: { type: 'page_on_front' },
				artifactDir: 'content/homepage',
				allowedStatuses: ['publish'],
				metadata: [],
				unexpected: true,
			},
		},
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /unsupported field "unexpected"/);
});

test('loadContentPublishConfig requires --key equivalent when multiple items are configured', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: {
			a: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/a', allowedStatuses: ['publish'], metadata: [] },
			b: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/b', allowedStatuses: ['publish'], metadata: [] },
		},
	});
	const config = loadContentPublishConfig(siteDir, 'test-site');
	assert.throws(() => defaultContentKey(config), /Pass --key/);
});

// --- content-artifact ---

const baseItem = {
	type: 'page',
	selector: { type: 'page_on_front' },
	allowedStatuses: ['draft', 'publish'],
	metadata: [],
};

function baseManifest(overrides = {}) {
	return {
		schemaVersion: ARTIFACT_SCHEMA_VERSION,
		contentKey: 'homepage',
		type: 'page',
		title: 'Home',
		slug: 'home',
		status: 'publish',
		template: '',
		content: { file: 'content.html' },
		featuredImage: null,
		metadata: {},
		baselineHash: null,
		...overrides,
	};
}

test('validateManifestShape accepts a well-formed manifest', () => {
	assert.doesNotThrow(() => validateManifestShape(baseManifest(), { contentKey: 'homepage', item: baseItem }));
});

test('validateManifestShape rejects a disallowed status', () => {
	assert.throws(
		() => validateManifestShape(baseManifest({ status: 'private' }), { contentKey: 'homepage', item: baseItem }),
		/status "private" is not allowed/,
	);
});

test('validateManifestShape rejects a mismatched contentKey', () => {
	assert.throws(
		() => validateManifestShape(baseManifest({ contentKey: 'other' }), { contentKey: 'homepage', item: baseItem }),
		/does not match "homepage"/,
	);
});

test('validateManifestShape rejects an invalid slug', () => {
	assert.throws(
		() => validateManifestShape(baseManifest({ slug: 'Not Valid!' }), { contentKey: 'homepage', item: baseItem }),
		/slug is invalid/,
	);
});

test('validateManifestShape rejects an unlisted metadata key', () => {
	assert.throws(
		() => validateManifestShape(baseManifest({ metadata: { subtitle: 'x' } }), { contentKey: 'homepage', item: baseItem }),
		/not allowlisted/,
	);
});

test('validateManifestShape rejects a featuredImage mimeType/extension mismatch', () => {
	const manifest = baseManifest({
		featuredImage: { file: 'featured-image.png', sha256: 'a'.repeat(64), mimeType: 'image/jpeg', basename: 'x.png', alt: '', caption: '', title: '' },
	});
	assert.throws(() => validateManifestShape(manifest, { contentKey: 'homepage', item: baseItem }), /extension does not match mimeType/);
});

test('validateManifestShape rejects an unsupported top-level field', () => {
	const manifest = baseManifest({ extra: true });
	assert.throws(() => validateManifestShape(manifest, { contentKey: 'homepage', item: baseItem }), /unsupported field "extra"/);
});

test('writeArtifact and readExistingArtifact round-trip deterministically', (context) => {
	const artifactDir = resolve(tempDir(context), 'content/pages/homepage');
	const manifest = baseManifest({ baselineHash: 'a'.repeat(64) });
	writeArtifact(artifactDir, { manifest, contentText: '<p>Hello</p>' });

	const manifestText = readFileSync(resolve(artifactDir, 'manifest.json'), 'utf8');
	assert.match(manifestText, /\n$/);
	assert.equal(manifestText, `${JSON.stringify(manifest, null, 2)}\n`);
	assert.equal(readFileSync(resolve(artifactDir, 'content.html'), 'utf8'), '<p>Hello</p>');

	const existing = readExistingArtifact(artifactDir);
	assert.deepEqual(existing.manifest, manifest);

	// Re-writing identical state must produce byte-identical files (no diff).
	const before = readFileSync(resolve(artifactDir, 'manifest.json'));
	writeArtifact(artifactDir, { manifest, contentText: '<p>Hello</p>' });
	assert.deepEqual(readFileSync(resolve(artifactDir, 'manifest.json')), before);

	assert.doesNotThrow(() => validateArtifactFiles(manifest, artifactDir));
});

test('validateArtifactFiles detects a featured image sha256 mismatch', (context) => {
	const artifactDir = resolve(tempDir(context), 'content/pages/homepage');
	mkdirSync(artifactDir, { recursive: true });
	writeFileSync(resolve(artifactDir, 'content.html'), '<p>Hello</p>');
	writeFileSync(resolve(artifactDir, 'featured-image.jpg'), 'not-the-declared-bytes');
	const manifest = baseManifest({
		featuredImage: {
			file: 'featured-image.jpg',
			sha256: 'a'.repeat(64),
			mimeType: 'image/jpeg',
			basename: 'photo.jpg',
			alt: '',
			caption: '',
			title: '',
		},
	});
	assert.throws(() => validateArtifactFiles(manifest, artifactDir), /sha256 mismatch/);
});

test('validateArtifactFiles detects a missing content file', (context) => {
	const artifactDir = resolve(tempDir(context), 'content/pages/homepage');
	mkdirSync(artifactDir, { recursive: true });
	assert.throws(() => validateArtifactFiles(baseManifest(), artifactDir), /content file is missing/);
});

test('assertUrlsTokenized rejects a literal production or local URL', () => {
	assert.throws(
		() => assertUrlsTokenized('see https://acro-agenda.es/festivales', ['https://acro-agenda.es'], 'content'),
		/untokenized environment URL/,
	);
	assert.doesNotThrow(() => assertUrlsTokenized('see {{SITE_URL}}/festivales', ['https://acro-agenda.es'], 'content'));
});

test('mimeTypeForExtension maps supported image extensions', () => {
	assert.equal(mimeTypeForExtension('photo.JPG'), 'image/jpeg');
	assert.equal(mimeTypeForExtension('photo.webp'), 'image/webp');
	assert.equal(mimeTypeForExtension('photo.bmp'), undefined);
});

// --- page-normalization ---

test('tokenizeSiteUrl and materializeSiteUrl round-trip, ignoring a trailing slash', () => {
	const html = '<a href="https://acro-agenda.es/festivales">link</a> and https://acro-agenda.es/';
	const tokenized = tokenizeSiteUrl(html, 'https://acro-agenda.es');
	assert.equal(tokenized, '<a href="{{SITE_URL}}/festivales">link</a> and {{SITE_URL}}/');
	assert.equal(materializeSiteUrl(tokenized, 'https://acro-agenda.es'), html);
});

test('hashPageState is stable regardless of metadata key insertion order', () => {
	const a = canonicalizePageState({
		contentKey: 'homepage', type: 'page', title: 'Home', slug: 'home', status: 'publish', template: '', content: '<p>x</p>',
		featuredImage: null, metadata: { a: '1', b: '2' },
	});
	const b = canonicalizePageState({
		contentKey: 'homepage', type: 'page', title: 'Home', slug: 'home', status: 'publish', template: '', content: '<p>x</p>',
		featuredImage: null, metadata: { b: '2', a: '1' },
	});
	assert.equal(hashPageState(a), hashPageState(b));
});

test('hashPageState changes when content changes', () => {
	const state = (content) => canonicalizePageState({
		contentKey: 'homepage', type: 'page', title: 'Home', slug: 'home', status: 'publish', template: '', content,
		featuredImage: null, metadata: {},
	});
	assert.notEqual(hashPageState(state('<p>x</p>')), hashPageState(state('<p>y</p>')));
});

// --- content-publish.mjs CLI (argument/config validation only; no live wp-env needed) ---

test('content-publish export rejects an unknown site before touching wp-env', () => {
	const result = run('scripts/content-publish.mjs', ['export', 'not-managed']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown site "not-managed"/);
});

test('content-publish export rejects an unknown content key before touching wp-env', () => {
	const result = run('scripts/content-publish.mjs', ['export', 'acro-agenda.es', '--key', 'bogus']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown content key "bogus"/);
});

test('content-publish with no arguments prints usage and exits cleanly', () => {
	const result = run('scripts/content-publish.mjs', []);
	assert.equal(result.status, 0);
	assert.match(result.stdout, /Usage:/);
});

test('content-publish rejects an unsupported operation', () => {
	const result = run('scripts/content-publish.mjs', ['delete', 'acro-agenda.es']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unsupported operation: delete/);
});

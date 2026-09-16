import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseJsonNoDuplicateKeys } from '../scripts/lib/strict-json.mjs';
import { loadContentPublishConfig, resolveContentPublishItem, selectedContentKeys } from '../scripts/lib/content-publish-config.mjs';
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
import { classifyByHash, computePlanHash, resolveProductionMatch, validatePlanRecord } from '../scripts/lib/content-plan.mjs';
import { assertPathsCommittedAndClean, getCurrentCommit } from '../scripts/lib/git-status.mjs';
import { validateSqlDump } from '../scripts/lib/content-production-backup.mjs';
import { collectInlineImages, referencedUploadPaths } from '../scripts/lib/content-inline-images.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(script, args) {
	return spawnSync(process.execPath, [resolve(platformDir, script), ...args], { cwd: platformDir, encoding: 'utf8' });
}

function tempDir(context) {
	const directory = mkdtempSync(resolve(tmpdir(), 'circus-content-publish-'));
	context.after(() => rmSync(directory, { recursive: true }));
	return directory;
}

test('inline image export packages every distinct referenced upload at its exact path', (context) => {
	const uploads = tempDir(context);
	mkdirSync(resolve(uploads, '2026/09'), { recursive: true });
	writeFileSync(resolve(uploads, '2026/09/yoga-768x1024.jpg'), 'image bytes');
	const content = '<!-- wp:image {"url":"{{SITE_URL}}/wp-content/uploads/2026/09/yoga-768x1024.jpg"} --><img src="{{SITE_URL}}/wp-content/uploads/2026/09/yoga-768x1024.jpg">';
	assert.deepEqual(referencedUploadPaths(content), ['2026/09/yoga-768x1024.jpg']);
	const images = collectInlineImages(content, uploads);
	assert.equal(images.length, 1);
	assert.equal(images[0].entry.path, '2026/09/yoga-768x1024.jpg');
	assert.equal(images[0].entry.file, 'inline-image-1.jpg');
	assert.equal(images[0].entry.sha256.length, 64);
	assert.throws(() => collectInlineImages('<img src="{{SITE_URL}}/wp-content/uploads/2026/09/missing.jpg">', uploads), /missing from local uploads/);
});

test('inline image manifest rejects unsafe paths and detects changed bytes', (context) => {
	const directory = tempDir(context);
	const manifest = {
		schemaVersion: ARTIFACT_SCHEMA_VERSION, contentKey: 'homepage', type: 'page', title: 'Home', slug: 'home', status: 'publish', template: '',
		content: { file: 'content.html' }, featuredImage: null, metadata: {}, baselineHash: null,
		inlineImages: [{ path: '../other.jpg', file: 'inline-image-1.jpg', sha256: 'a'.repeat(64) }],
	};
	assert.throws(() => validateManifestShape(manifest, { contentKey: 'homepage', item: baseItem }), /path is invalid/);
	manifest.inlineImages[0].path = '2026/09/photo.jpg';
	validateManifestShape(manifest, { contentKey: 'homepage', item: baseItem });
	writeFileSync(resolve(directory, 'content.html'), 'content');
	writeFileSync(resolve(directory, 'inline-image-1.jpg'), 'different bytes');
	assert.throws(() => validateArtifactFiles(manifest, directory), /sha256 mismatch/);
});

test('apply requires a saved plan and exact site confirmation before connecting', () => {
	for (const args of [
		['apply', 'acro-agenda.es'],
		['apply', 'acro-agenda.es', '--plan', 'plan.json', '--confirm-production=other-site'],
		['apply', 'acro-agenda.es', '--plan', 'plan.json', '--confirm-production=acro-agenda.es', '--key', 'homepage'],
	]) {
		const result = run('scripts/content-publish.mjs', args);
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /Apply requires/);
	}
});

test('saved plan binds destination, commit, item shape and hash', () => {
	const destination = { productionUrl: 'https://example.test/', sshTarget: 'host', sshPort: null, remotePath: '/srv/wp' };
	const record = { schemaVersion: 2, siteId: 'example.test', destination, commit: 'a'.repeat(40), generatedAt: new Date().toISOString(), items: { homepage: { artifact: { baselineHash: null, targetHash: 'b'.repeat(64) }, production: { postId: null, hash: null }, classification: 'create', reason: null } } };
	const signed = { ...record, planHash: computePlanHash(record) };
	const args = { siteId: 'example.test', destination, commit: record.commit, contentKeys: ['homepage'] };
	assert.equal(validatePlanRecord(signed, args), signed);
	assert.throws(() => validatePlanRecord({ ...signed, schemaVersion: 1 }, args), /version/);
	assert.throws(() => validatePlanRecord(signed, { ...args, destination: { ...destination, remotePath: '/other' } }), /destination/);
	assert.throws(() => validatePlanRecord(signed, { ...args, commit: 'c'.repeat(40) }), /commit/);
	assert.throws(() => validatePlanRecord({ ...signed, items: { homepage: { ...signed.items.homepage, classification: 'update' } } }, args), /hash mismatch/);
});

test('backup validation rejects empty, malformed, and truncated dumps', () => {
	for (const dump of ['', 'CREATE TABLE t (id int);', '-- MySQL dump\nCREATE TABLE t (id int);']) {
		assert.throws(() => validateSqlDump(Buffer.from(dump)), /malformed or incomplete/);
	}
	assert.match(validateSqlDump(Buffer.from('-- MySQL dump\nCREATE TABLE t (id int);\n-- Dump completed on 2026-01-01')), /^[a-f0-9]{64}$/);
});

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

test('loadContentPublishConfig accepts the acro-agenda.es page configurations', () => {
	const config = loadContentPublishConfig(resolve(platformDir, 'sites/acro-agenda.es'), 'acro-agenda.es');
	const item = resolveContentPublishItem(config, 'homepage');
	assert.equal(item.type, 'page');
	assert.equal(item.selector.type, 'page_on_front');
	assert.deepEqual(item.allowedStatuses, ['draft', 'publish']);
	assert.deepEqual(resolveContentPublishItem(config, 'valencia').selector, { type: 'page_path', path: '/valencia/' });
	assert.deepEqual(selectedContentKeys(config), ['homepage', 'valencia']);
	assert.deepEqual(selectedContentKeys(config, 'valencia'), ['valencia']);
});

test('loadContentPublishConfig accepts the lamutable.es content configurations', () => {
	const config = loadContentPublishConfig(resolve(platformDir, 'sites/lamutable.es'), 'lamutable.es');
	const item = resolveContentPublishItem(config, 'homepage');
	assert.equal(item.type, 'page');
	assert.equal(item.selector.type, 'page_on_front');
	assert.equal(item.artifactDir, 'content/pages/homepage');
	assert.deepEqual(item.allowedStatuses, ['draft', 'publish']);
	assert.deepEqual(resolveContentPublishItem(config, 'festival-de-conexion').selector, {
		type: 'post_path', path: '/fair-events/festival-de-conexion/',
	});
	assert.equal(resolveContentPublishItem(config, 'festival-de-conexion').type, 'fair_event');
	assert.deepEqual(resolveContentPublishItem(config, 'bart').selector, { type: 'page_path', path: '/bart/' });
	assert.deepEqual(selectedContentKeys(config), ['homepage', 'festival-de-conexion', 'bart']);
});

test('loadContentPublishConfig rejects a malformed page path', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: { valencia: { type: 'page', selector: { type: 'page_path', path: 'valencia' }, artifactDir: 'content/valencia', allowedStatuses: ['publish'], metadata: [] } },
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /absolute, trailing-slash post path/);
});

test('loadContentPublishConfig keeps page-only selectors from targeting custom posts', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: { event: { type: 'fair_event', selector: { type: 'page_path', path: '/fair-events/event/' }, artifactDir: 'content/event', allowedStatuses: ['publish'], metadata: [] } },
	});
	assert.throws(() => loadContentPublishConfig(siteDir, 'test-site'), /requires content type "page"/);
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

test('selectedContentKeys returns every configured key when no key is specified', (context) => {
	const siteDir = tempDir(context);
	writeConfig(siteDir, {
		items: {
			a: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/a', allowedStatuses: ['publish'], metadata: [] },
			b: { type: 'page', selector: { type: 'page_on_front' }, artifactDir: 'content/b', allowedStatuses: ['publish'], metadata: [] },
		},
	});
	const config = loadContentPublishConfig(siteDir, 'test-site');
	assert.deepEqual(selectedContentKeys(config), ['a', 'b']);
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

// --- content-plan ---

test('resolveProductionMatch returns create when there is no marker and no fallback', () => {
	assert.deepEqual(
		resolveProductionMatch({ markerMatches: [], contentKey: 'valencia', selectorType: 'page_path', frontPage: null }),
		{ outcome: 'create' },
	);
});

test('resolveProductionMatch matches a single non-trashed marker', () => {
	assert.deepEqual(
		resolveProductionMatch({ markerMatches: [{ id: '42', status: 'publish' }], contentKey: 'homepage', selectorType: 'page_on_front', frontPage: null }),
		{ outcome: 'matched', postId: '42' },
	);
});

test('resolveProductionMatch treats a trashed marker as a conflict', () => {
	const result = resolveProductionMatch({ markerMatches: [{ id: '42', status: 'trash' }], contentKey: 'homepage', selectorType: 'page_on_front', frontPage: null });
	assert.equal(result.outcome, 'conflict');
	assert.match(result.reason, /trashed production post \(ID 42\)/);
});

test('resolveProductionMatch treats multiple markers as an ambiguous conflict', () => {
	const result = resolveProductionMatch({
		markerMatches: [{ id: '1', status: 'publish' }, { id: '2', status: 'draft' }],
		contentKey: 'valencia',
		selectorType: 'page_path',
		frontPage: null,
	});
	assert.equal(result.outcome, 'conflict');
	assert.match(result.reason, /Ambiguous identity marker: 2/);
});

test('resolveProductionMatch falls back to the front page only for page_on_front', () => {
	assert.deepEqual(
		resolveProductionMatch({ markerMatches: [], contentKey: 'homepage', selectorType: 'page_on_front', frontPage: { id: '7', contentKey: null } }),
		{ outcome: 'matched', postId: '7' },
	);
});

test('resolveProductionMatch adopts one unmarked post at the configured path', () => {
	assert.deepEqual(resolveProductionMatch({ markerMatches: [], contentKey: 'festival', selectorType: 'post_path', pathMatches: [{ id: '1087', status: 'publish', contentKey: null }] }), { outcome: 'matched', postId: '1087' });
});

test('resolveProductionMatch rejects a marked duplicate at a different path', () => {
	const match = resolveProductionMatch({ markerMatches: [{ id: '1125', status: 'publish' }], contentKey: 'festival', selectorType: 'post_path', markerAtPath: false, pathMatches: [{ id: '1087', status: 'publish', contentKey: null }] });
	assert.equal(match.outcome, 'conflict');
	assert.match(match.reason, /does not own the configured production path/);
});

test('resolveProductionMatch rejects a path claimed by another key', () => {
	const match = resolveProductionMatch({ markerMatches: [], contentKey: 'festival', selectorType: 'post_path', pathMatches: [{ id: '1087', status: 'publish', contentKey: 'other' }] });
	assert.equal(match.outcome, 'conflict');
});

test('resolveProductionMatch does not fall back for non-front-page selectors', () => {
	assert.deepEqual(
		resolveProductionMatch({ markerMatches: [], contentKey: 'valencia', selectorType: 'page_path', frontPage: { id: '7', contentKey: null } }),
		{ outcome: 'create' },
	);
});

test('resolveProductionMatch treats a front page claimed by another key as a conflict', () => {
	const result = resolveProductionMatch({
		markerMatches: [],
		contentKey: 'homepage',
		selectorType: 'page_on_front',
		frontPage: { id: '7', contentKey: 'other-key' },
	});
	assert.equal(result.outcome, 'conflict');
	assert.match(result.reason, /already carries content key "other-key"/);
});

test('resolveProductionMatch treats an unset front page as create', () => {
	assert.deepEqual(
		resolveProductionMatch({ markerMatches: [], contentKey: 'homepage', selectorType: 'page_on_front', frontPage: null }),
		{ outcome: 'create' },
	);
});

test('classifyByHash reports unchanged when production matches the target', () => {
	assert.deepEqual(
		classifyByHash({ baselineHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), productionHash: 'b'.repeat(64) }),
		{ classification: 'unchanged' },
	);
});

test('classifyByHash reports update when production matches only the baseline', () => {
	assert.deepEqual(
		classifyByHash({ baselineHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), productionHash: 'a'.repeat(64) }),
		{ classification: 'update' },
	);
});

test('classifyByHash reports conflict when production matches neither baseline nor target', () => {
	const result = classifyByHash({ baselineHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), productionHash: 'c'.repeat(64) });
	assert.equal(result.classification, 'conflict');
	assert.match(result.reason, /drifted/);
});

test('computePlanHash is stable regardless of item key insertion order', () => {
	const a = { siteId: 's', items: { a: 1, b: 2 } };
	const b = { siteId: 's', items: { b: 2, a: 1 } };
	assert.equal(computePlanHash(a), computePlanHash(b));
});

// --- git-status ---

function initGitRepo(context) {
	const directory = tempDir(context);
	spawnSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: directory });
	spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: directory });
	spawnSync('git', ['config', 'user.name', 'Test'], { cwd: directory });
	spawnSync('git', ['commit', '--allow-empty', '--quiet', '-m', 'init'], { cwd: directory });
	return directory;
}

function commitFile(repo, name, content) {
	const filePath = resolve(repo, name);
	writeFileSync(filePath, content);
	spawnSync('git', ['add', name], { cwd: repo });
	spawnSync('git', ['commit', '--quiet', '-m', `add ${name}`], { cwd: repo });
	return filePath;
}

test('assertPathsCommittedAndClean accepts a clean tracked path', (context) => {
	const repo = initGitRepo(context);
	const filePath = commitFile(repo, 'tracked.txt', 'hello');
	assert.doesNotThrow(() => assertPathsCommittedAndClean(repo, [filePath]));
});

test('assertPathsCommittedAndClean rejects a modified tracked path', (context) => {
	const repo = initGitRepo(context);
	const filePath = commitFile(repo, 'tracked.txt', 'hello');
	writeFileSync(filePath, 'changed');
	assert.throws(() => assertPathsCommittedAndClean(repo, [filePath]), /tracked\.txt/);
});

test('assertPathsCommittedAndClean rejects a staged path', (context) => {
	const repo = initGitRepo(context);
	const filePath = commitFile(repo, 'tracked.txt', 'hello');
	writeFileSync(filePath, 'changed');
	spawnSync('git', ['add', 'tracked.txt'], { cwd: repo });
	assert.throws(() => assertPathsCommittedAndClean(repo, [filePath]), /tracked\.txt/);
});

test('assertPathsCommittedAndClean rejects an untracked path', (context) => {
	const repo = initGitRepo(context);
	const filePath = resolve(repo, 'untracked.txt');
	writeFileSync(filePath, 'hello');
	assert.throws(() => assertPathsCommittedAndClean(repo, [filePath]), /untracked\.txt/);
});

test('getCurrentCommit returns the repo HEAD sha', (context) => {
	const repo = initGitRepo(context);
	const expected = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
	assert.equal(getCurrentCommit(repo), expected);
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

test('content-publish plan rejects an unknown site before contacting production', () => {
	const result = run('scripts/content-publish.mjs', ['plan', 'not-managed']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown site "not-managed"/);
});

test('content-publish plan rejects an unknown content key before contacting production', () => {
	const result = run('scripts/content-publish.mjs', ['plan', 'acro-agenda.es', '--key', 'bogus']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown content key "bogus"/);
});

test('content-publish plan rejects --refresh-baseline instead of silently ignoring it', () => {
	const result = run('scripts/content-publish.mjs', ['plan', 'acro-agenda.es', '--refresh-baseline']);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /--refresh-baseline is only supported for the export operation/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildUploadProvenance, verifiedUploadReferences, replaceUploadsWithProvenance, validateProvenance } from '../scripts/lib/upload-provenance.mjs';
import { referencedUploadPaths, collectInlineImages, assertUploadCoverage } from '../scripts/lib/content-inline-images.mjs';
import { validateManifestShape, writeArtifact } from '../scripts/lib/content-artifact.mjs';
import { parseUploadInspection, referenceConflict } from '../scripts/lib/content-upload-references.mjs';

const source = { productionUrl: 'https://example.test', sshTarget: 'host', sshPort: null, remotePath: '/srv/wp' };
const options = { siteId: 'example.test', contentKey: 'service', source };
const entry = { path: '2026/file.pdf', sha256: 'a'.repeat(64), size: 3 };
function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'uploads-test-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	mkdirSync(join(dir, '2026'));
	writeFileSync(join(dir, '2026/file.pdf'), 'pdf');
	writeFileSync(join(dir, '2026/photo.jpg'), 'jpg');
	return dir;
}
const content = '{{SITE_URL}}/wp-content/uploads/2026/file.pdf {{SITE_URL}}/wp-content/uploads/2026/photo.jpg';
const base = { schemaVersion: 1, contentKey: 'service', type: 'page', title: '', slug: 'service', status: 'publish', template: '', content: { file: 'content.html' }, featuredImage: null, metadata: {}, baselineHash: null };
const shapeOptions = { contentKey: 'service', item: { type: 'page', allowedStatuses: ['publish'], metadata: [] } };

test('provenance hashes all regular files in sorted order and verifies export without copying references', async (t) => {
	const dir = fixture(t), path = join(dir, 'manifest.json');
	const manifest = await buildUploadProvenance(dir, options);
	assert.deepEqual(manifest.files.map((file) => file.path), ['2026/file.pdf', '2026/photo.jpg']);
	writeFileSync(path, JSON.stringify(manifest));
	const refs = await verifiedUploadReferences(['2026/file.pdf'], dir, path, options);
	assert.equal(refs[0].size, 3);
	const images = collectInlineImages(content, dir);
	assert.equal(images.length, 1);
	const artifact = { ...base, inlineImages: images.map((image) => image.entry), uploadReferences: refs };
	validateManifestShape(artifact, shapeOptions);
	assertUploadCoverage(artifact, content);
	const output = join(dir, 'artifact');
	writeArtifact(output, { manifest: artifact, contentText: content, inlineImages: images });
	assert.equal(existsSync(join(output, 'file.pdf')), false);
	const before = readFileSync(join(output, 'manifest.json'), 'utf8');
	writeArtifact(output, { manifest: artifact, contentText: content, inlineImages: images });
	assert.equal(readFileSync(join(output, 'manifest.json'), 'utf8'), before);
});

test('reference manifests reject invalid fields, hashes, sizes, duplicate paths and image extensions', () => {
	validateManifestShape(base, shapeOptions);
	for (const uploadReferences of [null, [{ ...entry, file: 'file.pdf' }], [{ ...entry, sha256: 'A'.repeat(64) }], [{ ...entry, size: -1 }], [{ ...entry, size: 1.2 }], [{ ...entry, size: Number.MAX_SAFE_INTEGER + 1 }], [entry, entry], [{ ...entry, path: '2026/photo.jpg' }], [{ ...entry, path: '../file.pdf' }]]) {
		assert.throws(() => validateManifestShape({ ...base, uploadReferences }, shapeOptions));
	}
	assert.throws(() => assertUploadCoverage({ ...base, uploadReferences: [entry] }, content));
	assert.throws(() => assertUploadCoverage({ ...base, uploadReferences: [entry, entry] }, '{{SITE_URL}}/wp-content/uploads/2026/file.pdf'));
});

test('upload URLs reject traversal, invalid encoding, empty segments, controls and unsupported extensions', () => {
	for (const path of ['../file.pdf', '%2e%2e/file.pdf', '%2Fetc/file.pdf', 'a//file.pdf', 'a/%00file.pdf', 'a/%5cfile.pdf', 'a/%GG.pdf', 'a/file.exe', 'C:/file.pdf']) {
		assert.throws(() => referencedUploadPaths(`{{SITE_URL}}/wp-content/uploads/${path}`), /Unsafe|Unsupported/);
	}
});

test('provenance refuses symlink files and directories', async (t) => {
	const dir = fixture(t);
	symlinkSync(join(dir, '2026/file.pdf'), join(dir, 'linked.pdf'));
	await assert.rejects(buildUploadProvenance(dir, options), /Symlink/);
});

test('reference export reports contextual missing, malformed, wrong-source and stale provenance', async (t) => {
	const dir = fixture(t), path = join(dir, 'manifest.json');
	const valid = await buildUploadProvenance(dir, options);
	for (const manifest of [null, {}, { ...valid, siteId: 'other' }, { ...valid, source: { ...source, remotePath: '/other' } }, { ...valid, files: [] }, { ...valid, files: [{ ...valid.files[0], sha256: 'b'.repeat(64) }] }]) {
		if (manifest) writeFileSync(path, JSON.stringify(manifest)); else rmSync(path, { force: true });
		await assert.rejects(verifiedUploadReferences(['2026/file.pdf'], dir, path, options), /example.test\/service: 2026\/file.pdf: .*Preserve local edits and re-import/);
	}
	writeFileSync(path, JSON.stringify(valid));
	rmSync(join(dir, '2026/file.pdf'));
	await assert.rejects(verifiedUploadReferences(['2026/file.pdf'], dir, path, options), /2026\/file.pdf/);
	assert.throws(() => validateProvenance({ ...valid, files: [valid.files[0], valid.files[0]] }), /Duplicate/);
});

test('interrupted replacement invalidates previous provenance; successful rerun installs it atomically', async (t) => {
	const dir = fixture(t), path = join(dir, 'manifest.json');
	const valid = await buildUploadProvenance(dir, options);
	writeFileSync(path, JSON.stringify(valid));
	await assert.rejects(replaceUploadsWithProvenance(path, valid, () => { throw new Error('interrupted'); }), /interrupted/);
	assert.equal(existsSync(path), false);
	await replaceUploadsWithProvenance(path, valid, () => {});
	assert.deepEqual(JSON.parse(readFileSync(path)), valid);
});

test('production metadata distinguishes matching, missing and mismatched references from invalid protocol', () => {
	assert.equal(parseUploadInspection(JSON.stringify({ status: 'present', sha256: entry.sha256, size: 3 }), entry).status, 'matching');
	assert.equal(parseUploadInspection(JSON.stringify({ status: 'missing' }), entry).status, 'missing');
	assert.equal(parseUploadInspection(JSON.stringify({ status: 'present', sha256: 'b'.repeat(64), size: 3 }), entry).status, 'mismatched');
	for (const text of ['broken', '{}', '{"status":"missing","extra":1}', '{"status":"present","sha256":"bad","size":3}']) assert.throws(() => parseUploadInspection(text, entry));
	assert.match(referenceConflict({ ...base, uploadReferences: [entry] }, { siteId: options.siteId, inspect: () => ({ status: 'missing' }) }), /example.test\/service: 2026\/file.pdf: production upload missing/);
	assert.throws(() => referenceConflict({ ...base, uploadReferences: [entry] }, { siteId: options.siteId, inspect: () => { throw new Error('access failed'); } }), /example.test\/service: 2026\/file.pdf: access failed/);
});

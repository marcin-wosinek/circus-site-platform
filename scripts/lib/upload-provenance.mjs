import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, lstatSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { CliError } from './cli-error.mjs';
import { validateUploadPath, regularUploadFile } from './upload-path.mjs';
import { writeJsonFileAtomic } from './json-file.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';

function exact(value, keys) {
	return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
}
export function validateUploadEntry(entry) {
	if (!exact(entry, ['path', 'sha256', 'size'])) throw new CliError('Invalid upload entry fields.');
	validateUploadPath(entry.path);
	if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.size) || entry.size < 0) throw new CliError(`Invalid upload hash or size: ${entry.path}`);
}
export function validateProvenance(manifest) {
	if (!exact(manifest, ['schemaVersion', 'siteId', 'source', 'importedAt', 'files']) || manifest.schemaVersion !== 1 || typeof manifest.siteId !== 'string' || !manifest.siteId || typeof manifest.importedAt !== 'string' || !Number.isFinite(Date.parse(manifest.importedAt)) || !exact(manifest.source, ['productionUrl', 'sshTarget', 'sshPort', 'remotePath']) || !Array.isArray(manifest.files)) throw new CliError('Invalid uploads provenance manifest.');
	if (['productionUrl', 'sshTarget', 'remotePath'].some((key) => typeof manifest.source[key] !== 'string' || !manifest.source[key]) || (manifest.source.sshPort !== null && !/^\d+$/.test(manifest.source.sshPort))) throw new CliError('Invalid uploads provenance source.');
	let sourceUrl;
	try { sourceUrl = new URL(manifest.source.productionUrl); } catch { throw new CliError('Invalid provenance production URL.'); }
	if (sourceUrl.username || sourceUrl.password) throw new CliError('Provenance must not include URL credentials.');
	const paths = new Set();
	for (const entry of manifest.files) {
		validateUploadEntry(entry);
		if (paths.has(entry.path)) throw new CliError(`Duplicate provenance path: ${entry.path}`);
		paths.add(entry.path);
	}
	return manifest;
}
export async function hashUpload(directory, path) {
	const file = regularUploadFile(directory, path);
	const hash = createHash('sha256');
	let size = 0;
	for await (const bytes of createReadStream(file)) { hash.update(bytes); size += bytes.length; }
	return { path, sha256: hash.digest('hex'), size };
}
export async function buildUploadProvenance(directory, { siteId, source, importedAt = new Date().toISOString() }) {
	const paths = [];
	function walk(prefix = '') {
		for (const name of readdirSync(join(directory, prefix))) {
			const path = prefix ? `${prefix}/${name}` : name;
			validateUploadPath(path);
			const stat = lstatSync(join(directory, path));
			if (stat.isSymbolicLink()) throw new CliError(`Symlink in imported uploads: ${path}`);
			if (stat.isDirectory()) walk(path);
			else if (stat.isFile()) paths.push(path);
			else throw new CliError(`Non-regular imported upload: ${path}`);
		}
	}
	walk();
	const files = [];
	for (const path of paths.sort()) files.push(await hashUpload(directory, path));
	return validateProvenance({ schemaVersion: 1, siteId, source, importedAt, files });
}

// A failure or interruption of replacement leaves no active provenance.
export async function replaceUploadsWithProvenance(manifestPath, manifest, replace) {
	rmSync(manifestPath, { force: true });
	await replace();
	writeJsonFileAtomic(manifestPath, validateProvenance(manifest));
}
export async function verifiedUploadReferences(paths, directory, manifestPath, { siteId, contentKey, source }) {
	const references = [];
	for (const path of paths) {
		try {
			const manifest = validateProvenance(parseJsonNoDuplicateKeys(readFileSync(manifestPath, 'utf8'), { label: 'uploads provenance' }));
			if (manifest.siteId !== siteId || Object.keys(source).some((key) => manifest.source[key] !== source[key])) throw new CliError('Provenance belongs to a different site or production source.');
			const recorded = manifest.files.find((entry) => entry.path === path);
			const actual = await hashUpload(directory, path);
			if (!recorded || recorded.size !== actual.size || recorded.sha256 !== actual.sha256) throw new CliError('Local file does not match imported production provenance.');
			references.push(actual);
		} catch (error) {
			throw new CliError(`${siteId}/${contentKey}: ${path}: ${error.message} Preserve local edits and re-import production before exporting. Locally added files must first reach production through the normal media workflow.`);
		}
	}
	return references;
}

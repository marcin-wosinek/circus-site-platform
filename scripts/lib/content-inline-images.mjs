import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { validateUploadPath as validateSafePath, isUploadReference, regularUploadFile } from './upload-path.mjs';
import { CliError } from './cli-error.mjs';
import { computeSha256, mimeTypeForExtension } from './content-artifact.mjs';

const UPLOAD_URL = /\{\{SITE_URL\}\}\/wp-content\/uploads\/([^\s"'<>?&#)]+)/g;

export function referencedUploadPaths(content) {
	return [...new Set([...content.matchAll(UPLOAD_URL)].map((match) => decodeUploadPath(match[1])))].sort();
}

function decodeUploadPath(value) {
	try { const path = decodeURIComponent(value); validateUploadPath(path); return path; }
	catch { throw new CliError(`Unsafe or malformed upload URL: ${value}`); }
}
export function validateUploadPath(path) {
	validateSafePath(path);
	if (!mimeTypeForExtension(path) && !isUploadReference(path)) throw new CliError(`Unsupported upload path: ${path}`);
}

export function collectInlineImages(content, uploadsDir) {
	return referencedUploadPaths(content).filter((path) => !isUploadReference(path)).map((path, index) => {
		validateUploadPath(path);
		const source = regularUploadFile(uploadsDir, path);
		const bytes = readFileSync(source);
		return { entry: { path, file: `inline-image-${index + 1}${basename(path).match(/\.[^.]+$/)[0].toLowerCase()}`, sha256: computeSha256(bytes) }, bytes };
	});
}

export function assertUploadCoverage(manifest, content) {
	const referenced = referencedUploadPaths(content);
	const declared = [...(manifest.inlineImages ?? []), ...(manifest.uploadReferences ?? [])].map((entry) => entry.path).sort();
	if (JSON.stringify(referenced) !== JSON.stringify(declared)) throw new CliError(`Artifact "${manifest.contentKey}" does not package every referenced upload image or declare every reference exactly once. Re-export it.`);
}

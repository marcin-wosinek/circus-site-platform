import { existsSync, readFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { CliError } from './cli-error.mjs';
import { computeSha256, mimeTypeForExtension } from './content-artifact.mjs';

const UPLOAD_URL = /\{\{SITE_URL\}\}\/wp-content\/uploads\/([^\s"'<>?&#)]+)/g;

export function referencedUploadPaths(content) {
	return [...new Set([...content.matchAll(UPLOAD_URL)].map((match) => decodeURIComponent(match[1])))].sort();
}

export function validateUploadPath(path) {
	if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..') || !mimeTypeForExtension(path)) {
		throw new CliError(`Unsafe or unsupported inline image path: ${path}`);
	}
}

export function collectInlineImages(content, uploadsDir) {
	return referencedUploadPaths(content).map((path, index) => {
		validateUploadPath(path);
		const source = resolve(uploadsDir, path);
		const fromUploads = relative(uploadsDir, source);
		if (!fromUploads || fromUploads === '..' || fromUploads.startsWith(`..${sep}`) || !existsSync(source)) {
			throw new CliError(`Inline image is missing from local uploads: ${path}`);
		}
		const bytes = readFileSync(source);
		return { entry: { path, file: `inline-image-${index + 1}${basename(path).match(/\.[^.]+$/)[0].toLowerCase()}`, sha256: computeSha256(bytes) }, bytes };
	});
}

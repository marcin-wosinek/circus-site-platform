import { lstatSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { CliError } from './cli-error.mjs';

export function validateUploadPath(path) {
	if (typeof path !== 'string' || !path || /^[a-z]:/i.test(path) || /[\\\x00-\x1f\x7f]/.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..')) {
		throw new CliError(`Unsafe upload path: ${path}`);
	}
}

export function isUploadReference(path) {
	return ['.pdf', '.mp4', '.webm'].includes(extname(path).toLowerCase());
}

// Inspect every component, including the root; never follow a symlink.
export function regularUploadFile(directory, path) {
	validateUploadPath(path);
	let current = resolve(directory);
	if (!lstatSync(current).isDirectory() || lstatSync(current).isSymbolicLink()) throw new CliError(`Unsafe uploads directory: ${directory}`);
	const parts = path.split('/');
	for (let index = 0; index < parts.length; index += 1) {
		current = join(current, parts[index]);
		let stat;
		try { stat = lstatSync(current); } catch (error) {
			if (error.code === 'ENOENT') throw new CliError(`Upload is missing from local uploads: ${path}`);
			throw error;
		}
		if (stat.isSymbolicLink() || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) throw new CliError(`Upload must be a regular file without symlinks: ${path}`);
	}
	return current;
}

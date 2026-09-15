import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CliError } from './cli-error.mjs';

export function parseEnvFileContents(contents, path) {
	const values = {};
	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const separator = line.indexOf('=');
		if (separator < 1) throw new CliError(`Invalid line in ${path}: ${rawLine}`);
		const key = line.slice(0, separator).trim();
		let value = line.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		values[key] = value;
	}
	return values;
}

export function loadEnvFile(path) {
	if (!existsSync(path)) return;
	const values = parseEnvFileContents(readFileSync(path, 'utf8'), path);
	for (const [key, value] of Object.entries(values)) {
		if (!(key in process.env)) process.env[key] = value;
	}
}

export function resolveEnvFilePath(platformDir, projectDir, siteId) {
	const sharedEnvFile = join(platformDir, '.env.import-local', siteId);
	const siteEnvFile = join(projectDir, '.env.import-local');
	return existsSync(sharedEnvFile) ? sharedEnvFile : siteEnvFile;
}

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { CliError } from './cli-error.mjs';

export function loadSiteRegistry(platformDir) {
	return JSON.parse(readFileSync(resolve(platformDir, 'sites.json'), 'utf8'));
}

export function resolveRegisteredSite(registry, siteId, platformDir) {
	const site = registry.sites?.[siteId];
	if (!site) {
		throw new CliError(`Unknown site "${siteId}". Available sites: ${Object.keys(registry.sites ?? {}).join(', ')}`);
	}
	const projectDir = resolve(platformDir, site.folder);
	const projectRelative = relative(platformDir, projectDir);
	if (!projectRelative || projectRelative === '..' || projectRelative.startsWith(`..${sep}`) || !projectRelative.startsWith(`sites${sep}`)) {
		throw new CliError(`Site "${siteId}" has an unsafe folder: ${site.folder}`);
	}
	return { site, projectDir };
}

export function requireProjectDir(projectDir, site) {
	if (!existsSync(projectDir)) throw new CliError(`Site folder does not exist: ${site.folder}`);
}

export function requireWpEnvJson(projectDir, siteId) {
	const wpEnvFile = resolve(projectDir, '.wp-env.json');
	if (!existsSync(wpEnvFile)) throw new CliError(`Site "${siteId}" does not have a .wp-env.json file.`);
	return wpEnvFile;
}

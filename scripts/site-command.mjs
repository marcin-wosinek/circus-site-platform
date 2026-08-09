#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeJsonFile } from './lib/json-file.mjs';
import { stageWpEnvPluginSources } from './lib/wp-env-plugin-sources.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, siteId, ...extraArgs] = process.argv.slice(2);
const supportedCommands = new Set(['start', 'stop', 'update']);

function fail(message) {
	console.error(`Error: ${message}`);
	process.exit(1);
}

if (!supportedCommands.has(command) || !siteId) {
	fail(`Usage: node ${process.argv[1]} <start|stop|update> <site-id> [wp-env options]`);
}

const registry = JSON.parse(readFileSync(resolve(platformDir, 'sites.json'), 'utf8'));
const site = registry.sites?.[siteId];
if (!site) fail(`Unknown site "${siteId}". Available sites: ${Object.keys(registry.sites ?? {}).join(', ')}`);

const siteDir = resolve(platformDir, site.folder);
const siteRelative = relative(platformDir, siteDir);
if (!siteRelative || siteRelative === '..' || siteRelative.startsWith(`..${sep}`) || !siteRelative.startsWith(`sites${sep}`)) {
	fail(`Site "${siteId}" has an unsafe folder: ${site.folder}`);
}
if (!existsSync(resolve(siteDir, '.wp-env.json'))) fail(`Site "${siteId}" does not have a .wp-env.json file.`);

const wpEnvArgs = command === 'update' ? ['start', '--update', ...extraArgs] : [command, ...extraArgs];
if (command !== 'stop') {
	const config = JSON.parse(readFileSync(resolve(siteDir, '.wp-env.json'), 'utf8'));
	const plugins = await stageWpEnvPluginSources(config.plugins ?? [], siteDir, { refresh: command === 'update' });
	writeJsonFile(resolve(siteDir, '.wp-env.override.json'), { plugins });
}
console.log(`Site: ${siteId} (${site.folder})`);
console.log(`+ npx @wordpress/env ${wpEnvArgs.join(' ')}`);
const result = spawnSync('npx', ['@wordpress/env', ...wpEnvArgs], { cwd: siteDir, stdio: 'inherit' });
if (result.error) fail(result.error.message);
if (result.status !== 0) fail(`wp-env exited with status ${result.status}`);

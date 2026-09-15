#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CliError } from './lib/cli-error.mjs';
import { runCli } from './lib/run-cli.mjs';
import { writeJsonFile } from './lib/json-file.mjs';
import { stageWpEnvPluginSources } from './lib/wp-env-plugin-sources.mjs';
import { createWpEnvOverride } from './lib/wp-env-override.mjs';
import { loadSiteRegistry, requireWpEnvJson, resolveRegisteredSite } from './lib/site-registry.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, siteId, ...extraArgs] = process.argv.slice(2);
const supportedCommands = new Set(['start', 'stop', 'update']);

if (!supportedCommands.has(command) || !siteId) {
	console.error(`Error: Usage: node ${process.argv[1]} <start|stop|update> <site-id> [wp-env options]`);
	process.exit(1);
}

await runCli(async () => {
	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, siteId, platformDir);
	requireWpEnvJson(projectDir, siteId);

	const wpEnvArgs = command === 'update' ? ['start', '--update', ...extraArgs] : [command, ...extraArgs];
	if (command !== 'stop') {
		const config = JSON.parse(readFileSync(resolve(projectDir, '.wp-env.json'), 'utf8'));
		const plugins = await stageWpEnvPluginSources(config.plugins ?? [], projectDir, { refresh: command === 'update' });
		writeJsonFile(
			resolve(projectDir, '.wp-env.override.json'),
			createWpEnvOverride(config, projectDir, platformDir, plugins),
		);
	}
	console.log(`Site: ${siteId} (${site.folder})`);
	console.log(`+ npx @wordpress/env ${wpEnvArgs.join(' ')}`);
	const result = spawnSync('npx', ['@wordpress/env', ...wpEnvArgs], { cwd: projectDir, stdio: 'inherit' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError(`wp-env exited with status ${result.status}`);
});

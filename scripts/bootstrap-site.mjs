#!/usr/bin/env node

import { chmodSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CliError } from './lib/cli-error.mjs';
import { runCli } from './lib/run-cli.mjs';
import { loadSiteRegistry, requireProjectDir, requireWpEnvJson, resolveRegisteredSite } from './lib/site-registry.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteId = process.argv.slice(2).find((argument) => !argument.startsWith('-'));
const apply = process.argv.includes('--apply');
const commandName = process.env.npm_lifecycle_event === 'pull' ? 'pull' : 'bootstrap';

function runNodeScript(script, args) {
	const result = spawnSync(process.execPath, [resolve(platformDir, script), ...args], {
		cwd: platformDir,
		stdio: 'inherit',
	});
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError(`${script} exited with status ${result.status}`);
}

await runCli(async () => {
	if (!siteId) throw new CliError(`Usage: node ${process.argv[1]} <site-id> --apply`);

	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, siteId, platformDir);
	requireProjectDir(projectDir, site);
	requireWpEnvJson(projectDir, siteId);

	const envDir = resolve(platformDir, '.env.import-local');
	const envFile = resolve(envDir, siteId);
	const envExample = resolve(projectDir, '.env.import-local.example');

	if (!existsSync(envFile)) {
		mkdirSync(envDir, { recursive: true });
		if (existsSync(envExample)) {
			copyFileSync(envExample, envFile);
		} else {
			writeFileSync(
				envFile,
				[
					`# Production SSH settings for ${siteId}. Do not commit this file.`,
					'PRODUCTION_SSH=user@example-host',
					'PRODUCTION_WP_PATH=/absolute/path/to/wordpress',
					'',
					'# Optional: PRODUCTION_SSH_PORT=22',
					'# Optional: PRODUCTION_SSH_KEY=/absolute/path/to/private-key',
					'',
				].join('\n'),
			);
		}
		chmodSync(envFile, 0o600);
		console.log(`Created ${envFile}`);
		throw new CliError('Pull is incomplete. Fill in the production SSH values, then run this command again with --apply.');
	}

	if (!apply) {
		console.log(`Ready to pull ${siteId} from production.`);
		console.log(`Run: npm run ${commandName} -- ${siteId} --apply`);
		console.log('This replaces only the selected local wp-env database and uploads; production remains read-only.');
		return;
	}

	// Validate credentials, remote WordPress, and the configured theme before
	// starting or changing the local wp-env instance.
	runNodeScript('scripts/import-production.mjs', [siteId, '--preflight']);

	// Production plugins may run database migrations during wp-env's first-start
	// activation. Start core without them so those migrations run only after the
	// production database, including its plugin tables, has been imported.
	runNodeScript('scripts/site-command.mjs', ['start', siteId, '--bootstrap-without-plugins']);
	runNodeScript('scripts/import-production.mjs', [siteId, '--apply']);
	runNodeScript('scripts/site-command.mjs', ['update', siteId]);
	runNodeScript('scripts/import-production.mjs', [siteId, '--verify']);
	console.log(`Pull complete and verified: http://localhost:${site.port}`);
});

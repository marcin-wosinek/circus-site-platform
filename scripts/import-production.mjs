#!/usr/bin/env node

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CliError } from './lib/cli-error.mjs';
import { runCli } from './lib/run-cli.mjs';
import { loadEnvFile, resolveEnvFilePath } from './lib/env-file.mjs';
import { captureToFile, runInherit } from './lib/process-run.mjs';
import { runWpCli, runWpCliJson } from './lib/wp-cli.mjs';
import { buildSshArgs, loadProductionSshConfig, validateUrl } from './lib/ssh-config.mjs';
import { shellQuote } from './lib/shell.mjs';
import { loadSiteRegistry, requireProjectDir, requireWpEnvJson, resolveRegisteredSite } from './lib/site-registry.mjs';
import { writeJsonFile } from './lib/json-file.mjs';
import { resolvePluginDownloads } from './lib/plugin-downloads.mjs';
import { themeSlugFromSource } from './lib/theme-source.mjs';
import {
	parseSiteFingerprint,
	siteFingerprintPhp,
	verifyConfiguredTheme,
	verifyImportedSite,
} from './lib/import-verification.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteId = process.argv.slice(2).find((argument) => !argument.startsWith('-'));
const apply = process.argv.includes('--apply');
const preflight = process.argv.includes('--preflight');
const verify = process.argv.includes('--verify');

if (!siteId) {
	console.error(`Usage: node ${process.argv[1]} <site-id> --apply`);
	process.exit(1);
}

function remoteDatabaseExportCommand(wordpressPath) {
	const remoteWp = `wp --path=${shellQuote(wordpressPath)}`;
	return [
		'set -eu',
		'command -v mysqldump >/dev/null || { echo "mysqldump is not available on the remote server." >&2; exit 127; }',
		`db_name="$(${remoteWp} config get DB_NAME)"`,
		`db_user="$(${remoteWp} config get DB_USER)"`,
		`db_password="$(${remoteWp} config get DB_PASSWORD)"`,
		`db_host="$(${remoteWp} config get DB_HOST)"`,
		'case "$db_host" in',
		'  *:/*) db_socket="${db_host#*:}"; set -- --socket="$db_socket" ;;',
		'  *:*) db_port="${db_host##*:}"; db_host="${db_host%:*}"; set -- --host="$db_host" --port="$db_port" ;;',
		'  *) set -- --host="$db_host" ;;',
		'esac',
		'MYSQL_PWD="$db_password" mysqldump "$@" --user="$db_user" --single-transaction --skip-lock-tables --default-character-set=utf8mb4 "$db_name"',
	].join('\n');
}

function productionFingerprint(projectDir, sshArgs, remotePath) {
	const remoteCommand = `wp --path=${shellQuote(remotePath)} eval ${shellQuote(siteFingerprintPhp)} --skip-plugins --skip-themes`;
	const result = spawnSync('ssh', [...sshArgs, remoteCommand], { cwd: projectDir, encoding: 'utf8' });
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError(`Production fingerprint check exited with status ${result.status}.`);
	return parseSiteFingerprint(result.stdout, 'Production WordPress');
}

function localFingerprint(projectDir) {
	return runWpCliJson(projectDir, ['eval', siteFingerprintPhp, '--skip-plugins', '--skip-themes']);
}

async function syncWpEnvPlugins(projectDir, wpEnvFile) {
	const activePlugins = runWpCliJson(projectDir, ['option', 'get', 'active_plugins', '--format=json', '--skip-plugins']);
	const wpEnv = JSON.parse(readFileSync(wpEnvFile, 'utf8'));
	const plugins = await resolvePluginDownloads(activePlugins);
	if (JSON.stringify(wpEnv.plugins ?? []) !== JSON.stringify(plugins)) {
		wpEnv.plugins = plugins;
		writeJsonFile(wpEnvFile, wpEnv);
		console.log(`Updated ${wpEnvFile} from the imported active_plugins option.`);
	}
}

await runCli(async () => {
	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, siteId, platformDir);
	requireProjectDir(projectDir, site);
	const wpEnvFile = requireWpEnvJson(projectDir, siteId);

	const envFile = resolveEnvFilePath(platformDir, projectDir, siteId);
	const importDir = join(projectDir, 'import');
	const dbDir = join(importDir, 'db');
	const uploadsDir = join(importDir, 'uploads');
	const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
	const databaseFile = join(dbDir, `production-${timestamp}.sql`);
	const uploadsArchive = join(importDir, `uploads-${timestamp}.tar.gz`);
	const uploadsNext = join(importDir, `uploads-next-${timestamp}`);

	loadEnvFile(envFile);

	if (!apply && !preflight && !verify) {
		console.log(`Usage: node ${process.argv[1]} <site-id> --apply`);
		console.log('Downloads production database/uploads, then replaces the local wp-env content.');
		console.log('Production remains read-only. The current local database is backed up first.');
		return;
	}

	const { sshTarget, sshPort, sshKey, remotePath } = loadProductionSshConfig();
	const productionUrl = process.env.PRODUCTION_URL ?? site.productionUrl;
	const localUrl = process.env.LOCAL_URL ?? `http://localhost:${site.port}`;
	const adminUser = process.env.LOCAL_ADMIN_USER ?? 'admin';
	const adminEmail = process.env.LOCAL_ADMIN_EMAIL ?? 'admin@localhost.test';
	const adminPassword = process.env.LOCAL_ADMIN_PASSWORD ?? 'password';

	validateUrl(productionUrl, 'productionUrl');
	validateUrl(localUrl, 'localUrl');
	const sshArgs = buildSshArgs({ sshTarget, sshPort, sshKey });
	console.log(`Checking production source: ${sshTarget}:${remotePath} (read-only)`);
	runInherit('ssh', [...sshArgs, `wp --path=${shellQuote(remotePath)} core is-installed`], { cwd: projectDir });
	const expectedSite = productionFingerprint(projectDir, sshArgs, remotePath);
	const wpEnv = JSON.parse(readFileSync(wpEnvFile, 'utf8'));
	const wpEnvThemes = wpEnv.themes;
	if (!Array.isArray(wpEnvThemes) || wpEnvThemes.length !== 1 || typeof wpEnvThemes[0] !== 'string') {
		throw new CliError(`Site "${siteId}" must define exactly one theme in .wp-env.json.`);
	}
	const themeSlug = themeSlugFromSource(wpEnvThemes[0]);
	verifyConfiguredTheme(expectedSite, themeSlug, siteId);

	if (preflight) {
		console.log(`Preflight complete. Production uses ${themeSlug} and has ${expectedSite.published_pages} published page(s).`);
		return;
	}

	if (verify) {
		verifyImportedSite(expectedSite, localFingerprint(projectDir), siteId);
		console.log(`Verified local ${siteId} against production.`);
		return;
	}

	mkdirSync(dbDir, { recursive: true });
	mkdirSync(uploadsDir, { recursive: true });

	console.log(`Import source: ${sshTarget}:${remotePath} (production, read-only)`);
	console.log(`Import target: ${projectDir} (${localUrl}, destructive local update)`);

	runInherit('npx', ['@wordpress/env', 'run', 'cli', 'wp', 'core', 'is-installed'], { cwd: projectDir });

	captureToFile('ssh', [...sshArgs, remoteDatabaseExportCommand(remotePath)], databaseFile, { cwd: projectDir });
	captureToFile('ssh', [...sshArgs, `tar -C ${shellQuote(join(remotePath, 'wp-content'))} -czf - uploads`], uploadsArchive, { cwd: projectDir });

	const listing = spawnSync('tar', ['-tzf', uploadsArchive], { encoding: 'utf8' });
	if (listing.status !== 0) throw new CliError('The downloaded uploads archive is invalid.');
	const archivePaths = listing.stdout.split(/\r?\n/).filter(Boolean);
	if (
		!archivePaths.length ||
		archivePaths.some((path) => !path.startsWith('uploads/') || path.startsWith('/') || path.split('/').includes('..'))
	) {
		throw new CliError('The uploads archive contains an unsafe path.');
	}

	mkdirSync(uploadsNext, { recursive: true });
	runInherit('tar', ['-xzf', uploadsArchive, '--strip-components=1', '-C', uploadsNext], { cwd: projectDir });

	const localBackup = `wp-content/import/local-before-${timestamp}.sql`;
	runWpCli(projectDir, ['db', 'export', localBackup, '--add-drop-table', '--quiet']);
	runWpCli(projectDir, ['db', 'reset', '--yes']);
	runWpCli(projectDir, ['db', 'import', `wp-content/import/${databaseFile.slice(dbDir.length + 1)}`]);
	runWpCli(projectDir, ['search-replace', productionUrl, localUrl, '--all-tables-with-prefix', '--precise', '--report-changed-only']);
	runWpCli(projectDir, ['option', 'update', 'home', localUrl]);
	runWpCli(projectDir, ['option', 'update', 'siteurl', localUrl]);
	await syncWpEnvPlugins(projectDir, wpEnvFile);

	runWpCli(projectDir, ['theme', 'activate', themeSlug]);

	const userCheck = spawnSync('npx', ['@wordpress/env', 'run', 'cli', 'wp', 'user', 'get', adminUser, '--field=ID'], {
		cwd: projectDir,
		stdio: 'ignore',
	});
	if (userCheck.status === 0) {
		runWpCli(projectDir, ['user', 'update', adminUser, `--user_email=${adminEmail}`, `--user_pass=${adminPassword}`, '--role=administrator']);
	} else {
		runWpCli(projectDir, ['user', 'create', adminUser, adminEmail, `--user_pass=${adminPassword}`, '--role=administrator']);
	}

	runWpCli(projectDir, ['cache', 'flush']);
	runWpCli(projectDir, ['rewrite', 'flush']);
	verifyImportedSite(expectedSite, localFingerprint(projectDir), siteId);

	const previousUploads = join(importDir, `uploads-before-${timestamp}`);
	cpSync(uploadsDir, previousUploads, { recursive: true });
	for (const entry of readdirSync(uploadsDir)) rmSync(join(uploadsDir, entry), { recursive: true, force: true });
	for (const entry of readdirSync(uploadsNext)) {
		cpSync(join(uploadsNext, entry), join(uploadsDir, entry), { recursive: true });
	}
	rmSync(uploadsNext, { recursive: true });
	rmSync(uploadsArchive);

	runWpCli(projectDir, ['option', 'get', 'home']);
	runWpCli(projectDir, ['user', 'get', adminUser, '--fields=ID,user_login,roles', '--format=table']);
	console.log(`Import complete. Local DB backup: ${join(dbDir, localBackup.slice('wp-content/import/'.length))}`);
	console.log(`Previous uploads: ${previousUploads}`);
});

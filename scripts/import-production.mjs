#!/usr/bin/env node

import {
	closeSync,
	cpSync,
	existsSync,
	mkdirSync,
	openSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeJsonFile } from './lib/json-file.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryFile = join(platformDir, 'sites.json');
const siteId = process.argv.slice(2).find((argument) => !argument.startsWith('-'));

if (!siteId) {
	console.error(`Usage: node ${process.argv[1]} <site-id> --apply`);
	process.exit(1);
}

const registry = JSON.parse(readFileSync(registryFile, 'utf8'));
const site = registry.sites?.[siteId];
if (!site) {
	console.error(`Error: Unknown site "${siteId}". Available sites: ${Object.keys(registry.sites ?? {}).join(', ')}`);
	process.exit(1);
}

const projectDir = resolve(platformDir, site.folder);
const projectRelative = relative(platformDir, projectDir);
if (!projectRelative || projectRelative.startsWith(`..${sep}`) || projectRelative === '..' || !projectRelative.startsWith(`sites${sep}`)) {
	console.error(`Error: Site "${siteId}" has an unsafe folder: ${site.folder}`);
	process.exit(1);
}
const sharedEnvFile = join(platformDir, '.env.import-local', siteId);
const siteEnvFile = join(projectDir, '.env.import-local');
const envFile = existsSync(sharedEnvFile) ? sharedEnvFile : siteEnvFile;
const wpEnvFile = join(projectDir, '.wp-env.json');
const importDir = join(projectDir, 'import');
const dbDir = join(importDir, 'db');
const uploadsDir = join(importDir, 'uploads');
const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const databaseFile = join(dbDir, `production-${timestamp}.sql`);
const uploadsArchive = join(importDir, `uploads-${timestamp}.tar.gz`);
const uploadsNext = join(importDir, `uploads-next-${timestamp}`);
const wordpressPluginDownloads = 'https://downloads.wordpress.org/plugin';

if (!existsSync(projectDir)) fail(`Site folder does not exist: ${site.folder}`);
if (!existsSync(wpEnvFile)) fail(`Site "${siteId}" does not have a .wp-env.json file.`);

function loadEnv(path) {
	if (!existsSync(path)) return;
	for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const separator = line.indexOf('=');
		if (separator < 1) throw new Error(`Invalid line in ${path}: ${rawLine}`);
		const key = line.slice(0, separator).trim();
		let value = line.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}

function fail(message) {
	console.error(`Error: ${message}`);
	process.exit(1);
}

function shellQuote(value) {
	return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function run(command, args, options = {}) {
	console.log(`+ ${[command, ...args].join(' ')}`);
	const result = spawnSync(command, args, { cwd: projectDir, stdio: 'inherit', ...options });
	if (result.error) fail(result.error.message);
	if (result.status !== 0) fail(`${command} exited with status ${result.status}`);
}

function capture(command, args, destination) {
	console.log(`+ ${command} ${args.join(' ')} > ${destination}`);
	const output = openSync(destination, 'w', 0o600);
	let result;
	try {
		result = spawnSync(command, args, { cwd: projectDir, stdio: ['ignore', output, 'inherit'] });
	} finally {
		closeSync(output);
	}
	if (result.error || result.status !== 0) {
		rmSync(destination, { force: true });
		if (result.error) fail(result.error.message);
		fail(`${command} exited with status ${result.status}`);
	}
	if (statSync(destination).size === 0) {
		rmSync(destination, { force: true });
		fail(`${command} produced an empty file.`);
	}
}

function wp(...args) {
	run('npx', ['@wordpress/env', 'run', 'cli', 'wp', ...args]);
}

function wpJson(...args) {
	console.log(`+ npx @wordpress/env run cli wp ${args.join(' ')}`);
	const result = spawnSync('npx', ['@wordpress/env', 'run', 'cli', 'wp', ...args], {
		cwd: projectDir,
		encoding: 'utf8',
	});
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.error) fail(result.error.message);
	if (result.status !== 0) fail(`wp exited with status ${result.status}`);
	for (const line of result.stdout.split(/\r?\n/)) {
		try {
			return JSON.parse(line);
		} catch {
			// wp-env prints status lines around the WP-CLI output.
		}
	}
	fail('WP-CLI did not return valid JSON.');
}

function syncWpEnvPlugins() {
	const activePlugins = wpJson('option', 'get', 'active_plugins', '--format=json', '--skip-plugins');
	if (!Array.isArray(activePlugins) || activePlugins.some((plugin) => typeof plugin !== 'string')) {
		fail('The imported active_plugins option is not a list of plugin entry files.');
	}

	const wpEnv = JSON.parse(readFileSync(wpEnvFile, 'utf8'));
	const plugins = activePlugins.map((plugin) => {
		const [directory, entryFile] = plugin.split('/');
		const slug = entryFile ? directory : directory.replace(/\.php$/, '');
		if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
			fail(`Cannot derive a WordPress.org slug from active plugin entry: ${plugin}`);
		}
		return `${wordpressPluginDownloads}/${slug}.zip`;
	});
	if (JSON.stringify(wpEnv.plugins ?? []) !== JSON.stringify(plugins)) {
		wpEnv.plugins = plugins;
		writeJsonFile(wpEnvFile, wpEnv);
		console.log(`Updated ${wpEnvFile} from the imported active_plugins option.`);
	}
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

loadEnv(envFile);

if (!process.argv.includes('--apply')) {
	console.log(`Usage: node ${process.argv[1]} <site-id> --apply`);
	console.log('Downloads production database/uploads, then replaces the local wp-env content.');
	console.log('Production remains read-only. The current local database is backed up first.');
	process.exit(0);
}

const sshTarget = process.env.PRODUCTION_SSH;
const sshPort = process.env.PRODUCTION_SSH_PORT;
const sshKey = process.env.PRODUCTION_SSH_KEY;
const remotePath = process.env.PRODUCTION_WP_PATH;
const productionUrl = process.env.PRODUCTION_URL ?? site.productionUrl;
const localUrl = process.env.LOCAL_URL ?? `http://localhost:${site.port}`;
const adminUser = process.env.LOCAL_ADMIN_USER ?? 'admin';
const adminEmail = process.env.LOCAL_ADMIN_EMAIL ?? 'admin@localhost.test';
const adminPassword = process.env.LOCAL_ADMIN_PASSWORD ?? 'password';

if (!sshTarget || !/^[a-zA-Z0-9._@-]+$/.test(sshTarget)) fail('Set a valid PRODUCTION_SSH in .env.import-local.');
if (sshPort && (!/^\d+$/.test(sshPort) || Number(sshPort) < 1 || Number(sshPort) > 65535)) {
	fail('PRODUCTION_SSH_PORT must be between 1 and 65535.');
}
if (sshKey && (!sshKey.startsWith('/') || /[\r\n]/.test(sshKey))) fail('PRODUCTION_SSH_KEY must be an absolute path.');
if (!remotePath?.startsWith('/') || /[\r\n]/.test(remotePath)) fail('Set an absolute PRODUCTION_WP_PATH in .env.import-local.');
for (const [name, value] of Object.entries({ productionUrl, localUrl })) {
	try { new URL(value); } catch { fail(`${name} must be a valid URL.`); }
}

mkdirSync(dbDir, { recursive: true });
mkdirSync(uploadsDir, { recursive: true });

console.log(`Import source: ${sshTarget}:${remotePath} (production, read-only)`);
console.log(`Import target: ${projectDir} (${localUrl}, destructive local update)`);

const sshArgs = [...(sshPort ? ['-p', sshPort] : []), ...(sshKey ? ['-i', sshKey] : []), sshTarget];
run('ssh', [...sshArgs, `wp --path=${shellQuote(remotePath)} core is-installed`]);
run('npx', ['@wordpress/env', 'run', 'cli', 'wp', 'core', 'is-installed']);

capture('ssh', [...sshArgs, remoteDatabaseExportCommand(remotePath)], databaseFile);
capture('ssh', [...sshArgs, `tar -C ${shellQuote(join(remotePath, 'wp-content'))} -czf - uploads`], uploadsArchive);

const listing = spawnSync('tar', ['-tzf', uploadsArchive], { encoding: 'utf8' });
if (listing.status !== 0) fail('The downloaded uploads archive is invalid.');
const archivePaths = listing.stdout.split(/\r?\n/).filter(Boolean);
if (
	!archivePaths.length ||
	archivePaths.some((path) => !path.startsWith('uploads/') || path.startsWith('/') || path.split('/').includes('..'))
) {
	fail('The uploads archive contains an unsafe path.');
}

mkdirSync(uploadsNext, { recursive: true });
run('tar', ['-xzf', uploadsArchive, '--strip-components=1', '-C', uploadsNext]);

const localBackup = `wp-content/import/local-before-${timestamp}.sql`;
wp('db', 'export', localBackup, '--add-drop-table', '--quiet');
wp('db', 'reset', '--yes');
wp('db', 'import', `wp-content/import/${databaseFile.slice(dbDir.length + 1)}`);
wp('search-replace', productionUrl, localUrl, '--all-tables-with-prefix', '--precise', '--report-changed-only');
wp('option', 'update', 'home', localUrl);
wp('option', 'update', 'siteurl', localUrl);
syncWpEnvPlugins();
const wpEnvThemes = JSON.parse(readFileSync(wpEnvFile, 'utf8')).themes;
if (!Array.isArray(wpEnvThemes) || wpEnvThemes.length !== 1 || typeof wpEnvThemes[0] !== 'string') {
	fail(`Site "${siteId}" must define exactly one theme in .wp-env.json.`);
}
const themeSlug = wpEnvThemes[0].replace(/^\.\//, '').split('/').filter(Boolean).at(-1);
if (!themeSlug || !/^[a-z0-9][a-z0-9-]*$/.test(themeSlug)) fail(`Cannot derive a theme slug from ${wpEnvThemes[0]}.`);
wp('theme', 'activate', themeSlug);

const userCheck = spawnSync('npx', ['@wordpress/env', 'run', 'cli', 'wp', 'user', 'get', adminUser, '--field=ID'], {
	cwd: projectDir,
	stdio: 'ignore',
});
if (userCheck.status === 0) {
	wp('user', 'update', adminUser, `--user_email=${adminEmail}`, `--user_pass=${adminPassword}`, '--role=administrator');
} else {
	wp('user', 'create', adminUser, adminEmail, `--user_pass=${adminPassword}`, '--role=administrator');
}

wp('cache', 'flush');
wp('rewrite', 'flush');

const previousUploads = join(importDir, `uploads-before-${timestamp}`);
cpSync(uploadsDir, previousUploads, { recursive: true });
for (const entry of readdirSync(uploadsDir)) rmSync(join(uploadsDir, entry), { recursive: true, force: true });
for (const entry of readdirSync(uploadsNext)) {
	cpSync(join(uploadsNext, entry), join(uploadsDir, entry), { recursive: true });
}
rmSync(uploadsNext, { recursive: true });
rmSync(uploadsArchive);

wp('option', 'get', 'home');
wp('user', 'get', adminUser, '--fields=ID,user_login,roles', '--format=table');
console.log(`Import complete. Local DB backup: ${join(dbDir, localBackup.slice('wp-content/import/'.length))}`);
console.log(`Previous uploads: ${previousUploads}`);

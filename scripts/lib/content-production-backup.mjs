import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, openSync, closeSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { CliError } from './cli-error.mjs';
import { shellQuote } from './shell.mjs';

export function remoteDatabaseExportCommand(wordpressPath) {
	const wp = `wp --path=${shellQuote(wordpressPath)}`;
	return [
		'set -eu',
		'command -v mysqldump >/dev/null',
		`db_name="$(${wp} config get DB_NAME)"`,
		`db_user="$(${wp} config get DB_USER)"`,
		`db_password="$(${wp} config get DB_PASSWORD)"`,
		`db_host="$(${wp} config get DB_HOST)"`,
		'case "$db_host" in',
		'  *:/*) db_socket="${db_host#*:}"; set -- --socket="$db_socket" ;;',
		'  *:*) db_port="${db_host##*:}"; db_host="${db_host%:*}"; set -- --host="$db_host" --port="$db_port" ;;',
		'  *) set -- --host="$db_host" ;;',
		'esac',
		'MYSQL_PWD="$db_password" mysqldump "$@" --user="$db_user" --single-transaction --skip-lock-tables --default-character-set=utf8mb4 "$db_name"',
	].join('\n');
}

export function validateSqlDump(bytes) {
	const text = bytes.toString('utf8');
	if (!/(?:MySQL|MariaDB) dump/.test(text) || !/CREATE TABLE|INSERT INTO/.test(text) || !/-- Dump completed on|-- Dump completed at/.test(text)) throw new CliError('Production database backup is malformed or incomplete.');
	return createHash('sha256').update(bytes).digest('hex');
}

export function createProductionBackup({ platformDir, siteId, sshArgs, remotePath }) {
	const dir = resolve(platformDir, '.content-publish', 'backups', siteId);
	mkdirSync(dir, { recursive: true, mode: 0o700 });
	const path = resolve(dir, `production-${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${process.pid}.sql`);
	let fd;
	try {
		fd = openSync(path, 'wx', 0o600);
		const result = spawnSync('ssh', [...sshArgs, remoteDatabaseExportCommand(remotePath)], { stdio: ['ignore', fd, 'pipe'] });
		if (result.error || result.status !== 0) throw new CliError('Production database backup command failed.');
		if (!statSync(path).size) throw new CliError('Production database backup is empty.');
		return { path, sha256: validateSqlDump(readFileSync(path)) };
	} catch (error) {
		rmSync(path, { force: true });
		throw error;
	} finally { if (fd !== undefined) closeSync(fd); }
}

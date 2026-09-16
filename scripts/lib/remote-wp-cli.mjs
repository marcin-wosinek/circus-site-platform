import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';
import { shellQuote } from './shell.mjs';

// Mirrors wp-cli.mjs, but runs WP-CLI over an existing read-only SSH
// connection instead of local wp-env. Only read-only subcommands are ever
// issued here; no post create/update, option update, or similar write calls.
function remoteWpCommand(remotePath, args) {
	return `wp --path=${shellQuote(remotePath)} ${args.map(shellQuote).join(' ')}`;
}

export function runRemoteWpCliJson(sshArgs, remotePath, args) {
	const command = remoteWpCommand(remotePath, args);
	console.log(`+ ssh ${sshArgs.join(' ')} ${command}`);
	const result = spawnSync('ssh', [...sshArgs, command], { encoding: 'utf8' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) {
		if (result.stderr) process.stderr.write(result.stderr);
		throw new CliError(`Remote wp exited with status ${result.status}`);
	}
	for (const line of result.stdout.split(/\r?\n/)) {
		try {
			return JSON.parse(line);
		} catch {
			// wp-cli or ssh may print status lines around the JSON output.
		}
	}
	throw new CliError('Remote WP-CLI did not return valid JSON.');
}

export function runRemoteWpCliText(sshArgs, remotePath, args) {
	const command = remoteWpCommand(remotePath, args);
	const result = spawnSync('ssh', [...sshArgs, command], { encoding: 'utf8' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) {
		if (result.stderr) process.stderr.write(result.stderr);
		throw new CliError(`Remote wp exited with status ${result.status}`);
	}
	return result.stdout.trim();
}

// Like `runRemoteWpCliText`, but returns "" instead of throwing when the
// command fails, for values that legitimately may not exist yet, such as
// unset post meta.
export function runRemoteWpCliTextOptional(sshArgs, remotePath, args) {
	const command = remoteWpCommand(remotePath, args);
	const result = spawnSync('ssh', [...sshArgs, command], { encoding: 'utf8' });
	if (result.error || result.status !== 0) return '';
	return result.stdout.trim();
}

// Streams a remote file's bytes over the existing SSH connection into
// memory. Never writes a temp file, local or remote.
export function readRemoteFileBytes(sshArgs, remotePath) {
	const command = `cat ${shellQuote(remotePath)}`;
	const result = spawnSync('ssh', [...sshArgs, command]);
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) {
		throw new CliError(`Unable to read remote file: ${remotePath}`);
	}
	return result.stdout;
}

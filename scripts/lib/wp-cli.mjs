import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';

function wpEnvArgs(args) {
	return ['@wordpress/env', 'run', 'cli', 'wp', ...args];
}

export function runWpCli(projectDir, args) {
	console.log(`+ npx @wordpress/env run cli wp ${args.join(' ')}`);
	const result = spawnSync('npx', wpEnvArgs(args), { cwd: projectDir, stdio: 'inherit' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError(`wp exited with status ${result.status}`);
	return result;
}

export function runWpCliJson(projectDir, args) {
	console.log(`+ npx @wordpress/env run cli wp ${args.join(' ')}`);
	const result = spawnSync('npx', wpEnvArgs(args), { cwd: projectDir, encoding: 'utf8' });
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError(`wp exited with status ${result.status}`);
	for (const line of result.stdout.split(/\r?\n/)) {
		try {
			return JSON.parse(line);
		} catch {
			// wp-env prints status lines around the WP-CLI output.
		}
	}
	throw new CliError('WP-CLI did not return valid JSON.');
}

export function runWpCliText(projectDir, args) {
	const result = spawnSync('npx', wpEnvArgs(args), { cwd: projectDir, encoding: 'utf8' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) {
		if (result.stderr) process.stderr.write(result.stderr);
		throw new CliError(`wp exited with status ${result.status}`);
	}
	return result.stdout.trim();
}

// Like `runWpCliText`, but returns "" instead of throwing when the command
// fails, for values that legitimately may not exist yet, such as unset post
// meta.
export function runWpCliTextOptional(projectDir, args) {
	const result = spawnSync('npx', wpEnvArgs(args), { cwd: projectDir, encoding: 'utf8' });
	if (result.error || result.status !== 0) return '';
	return result.stdout.trim();
}

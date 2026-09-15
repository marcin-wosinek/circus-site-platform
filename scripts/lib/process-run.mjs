import { closeSync, openSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';

export function runInherit(command, args, options = {}) {
	console.log(`+ ${[command, ...args].join(' ')}`);
	const result = spawnSync(command, args, { stdio: 'inherit', ...options });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError(`${command} exited with status ${result.status}`);
	return result;
}

export function captureToFile(command, args, destination, options = {}) {
	console.log(`+ ${command} ${args.join(' ')} > ${destination}`);
	const output = openSync(destination, 'w', 0o600);
	let result;
	try {
		result = spawnSync(command, args, { stdio: ['ignore', output, 'inherit'], ...options });
	} finally {
		closeSync(output);
	}
	if (result.error || result.status !== 0) {
		rmSync(destination, { force: true });
		if (result.error) throw new CliError(result.error.message);
		throw new CliError(`${command} exited with status ${result.status}`);
	}
	if (statSync(destination).size === 0) {
		rmSync(destination, { force: true });
		throw new CliError(`${command} produced an empty file.`);
	}
	return result;
}

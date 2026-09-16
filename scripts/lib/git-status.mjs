import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';

export function getCurrentCommit(platformDir) {
	const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: platformDir, encoding: 'utf8' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError('Unable to resolve the current Git commit.');
	return result.stdout.trim();
}

// Requires every given path to be tracked and free of staged, unstaged, or
// untracked changes, so a plan can be bound to an exact, reproducible commit.
export function assertPathsCommittedAndClean(platformDir, paths) {
	const result = spawnSync('git', ['status', '--porcelain', '--', ...paths], { cwd: platformDir, encoding: 'utf8' });
	if (result.error) throw new CliError(result.error.message);
	if (result.status !== 0) throw new CliError('Unable to check Git status for the plan paths.');
	const dirtyLines = result.stdout.split(/\r?\n/).filter(Boolean);
	if (dirtyLines.length) {
		throw new CliError(`The following paths must be committed with no pending changes before planning:\n${dirtyLines.join('\n')}`);
	}
}

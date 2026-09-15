import { CliError } from './cli-error.mjs';

export function validateSshTarget(sshTarget) {
	if (!sshTarget || !/^[a-zA-Z0-9._@-]+$/.test(sshTarget)) {
		throw new CliError('Set a valid PRODUCTION_SSH in .env.import-local.');
	}
}

export function validateSshPort(sshPort) {
	if (sshPort && (!/^\d+$/.test(sshPort) || Number(sshPort) < 1 || Number(sshPort) > 65535)) {
		throw new CliError('PRODUCTION_SSH_PORT must be between 1 and 65535.');
	}
}

export function validateSshKey(sshKey) {
	if (sshKey && (!sshKey.startsWith('/') || /[\r\n]/.test(sshKey))) {
		throw new CliError('PRODUCTION_SSH_KEY must be an absolute path.');
	}
}

export function validateRemotePath(remotePath) {
	if (!remotePath?.startsWith('/') || /[\r\n]/.test(remotePath)) {
		throw new CliError('Set an absolute PRODUCTION_WP_PATH in .env.import-local.');
	}
}

export function validateUrl(value, name) {
	try {
		new URL(value);
	} catch {
		throw new CliError(`${name} must be a valid URL.`);
	}
}

export function loadProductionSshConfig(env = process.env) {
	const sshTarget = env.PRODUCTION_SSH;
	const sshPort = env.PRODUCTION_SSH_PORT;
	const sshKey = env.PRODUCTION_SSH_KEY;
	const remotePath = env.PRODUCTION_WP_PATH;
	validateSshTarget(sshTarget);
	validateSshPort(sshPort);
	validateSshKey(sshKey);
	validateRemotePath(remotePath);
	return { sshTarget, sshPort, sshKey, remotePath };
}

export function buildSshArgs({ sshTarget, sshPort, sshKey }) {
	return [...(sshPort ? ['-p', sshPort] : []), ...(sshKey ? ['-i', sshKey] : []), sshTarget];
}

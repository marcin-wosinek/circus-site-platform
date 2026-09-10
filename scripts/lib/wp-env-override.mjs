import { relative, sep } from 'node:path';

export function createWpEnvOverride(config, siteDir, platformDir, plugins) {
	const muPlugins = relative(siteDir, `${platformDir}${sep}wp-env${sep}mu-plugins`);

	return {
		plugins,
		mappings: {
			...(config.mappings ?? {}),
			'wp-content/mu-plugins': muPlugins,
		},
	};
}

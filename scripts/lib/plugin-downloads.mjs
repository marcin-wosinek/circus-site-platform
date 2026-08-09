const wordpressPluginDownloads = 'https://downloads.wordpress.org/plugin';
const fairPluginRepository = 'marcin-wosinek/fair-event-plugins';
const githubApi = 'https://api.github.com';

function pluginSlug(entry) {
	const [directory, entryFile, ...extraParts] = entry.split('/');
	if (extraParts.length) throw new Error(`Cannot derive a plugin slug from active plugin entry: ${entry}`);
	const slug = entryFile ? directory : directory.replace(/\.php$/, '');
	if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
		throw new Error(`Cannot derive a plugin slug from active plugin entry: ${entry}`);
	}
	return slug;
}

function fairAsset(release, slug) {
	return release.assets?.find((asset) =>
		typeof asset.name === 'string' &&
		asset.name.startsWith(`${slug}.`) &&
		asset.name.endsWith('.zip') &&
		typeof asset.browser_download_url === 'string'
	);
}

async function githubJson(path, { fetchImpl, githubToken }) {
	const headers = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'circus-site-platform',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
	const response = await fetchImpl(`${githubApi}${path}`, { headers });
	if (!response.ok) throw new Error(`GitHub API request failed with status ${response.status}.`);
	return response.json();
}

async function fairPluginDownloads(slugs, options) {
	const encodedRepository = fairPluginRepository.split('/').map(encodeURIComponent).join('/');
	let releases;
	if (options.fairRelease) {
		const tag = encodeURIComponent(options.fairRelease);
		releases = [await githubJson(`/repos/${encodedRepository}/releases/tags/${tag}`, options)];
	} else {
		releases = await githubJson(`/repos/${encodedRepository}/releases?per_page=20`, options);
	}
	if (!Array.isArray(releases)) throw new Error('GitHub did not return a list of fair plugin releases.');

	const release = releases.find((candidate) =>
		!candidate.draft && slugs.every((slug) => fairAsset(candidate, slug))
	);
	if (!release) {
		const requested = slugs.join(', ');
		const qualifier = options.fairRelease ? `release ${options.fairRelease}` : 'the 20 most recent releases';
		throw new Error(`Cannot find ZIP assets for ${requested} together in ${qualifier} of ${fairPluginRepository}.`);
	}

	return new Map(slugs.map((slug) => [slug, fairAsset(release, slug).browser_download_url]));
}

export async function resolvePluginDownloads(activePlugins, {
	fetchImpl = globalThis.fetch,
	githubToken = process.env.GITHUB_TOKEN,
	fairRelease = process.env.FAIR_PLUGIN_RELEASE,
} = {}) {
	if (!Array.isArray(activePlugins) || activePlugins.some((plugin) => typeof plugin !== 'string')) {
		throw new Error('The imported active_plugins option is not a list of plugin entry files.');
	}
	const slugs = activePlugins.map(pluginSlug);
	const fairSlugs = [...new Set(slugs.filter((slug) => slug.startsWith('fair-')))];
	const fairDownloads = fairSlugs.length
		? await fairPluginDownloads(fairSlugs, { fetchImpl, githubToken, fairRelease })
		: new Map();

	return slugs.map((slug) => fairDownloads.get(slug) ?? `${wordpressPluginDownloads}/${slug}.zip`);
}

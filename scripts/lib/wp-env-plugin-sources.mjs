import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonFile } from './json-file.mjs';

const versionedFairPlugin = /\/(fair-[a-z0-9-]+)\.[^/]+\.zip(?:\?.*)?$/;

export function fairPluginSlug(source) {
	return typeof source === 'string' ? source.match(versionedFairPlugin)?.[1] : undefined;
}

export async function stageWpEnvPluginSources(pluginSources, siteDir, { refresh = false, fetchImpl = globalThis.fetch } = {}) {
	const cacheDir = resolve(siteDir, '.wp-env-plugins');
	const manifestFile = resolve(cacheDir, 'sources.json');
	mkdirSync(cacheDir, { recursive: true });
	let manifest = {};
	try {
		manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
	} catch {}

	const stagedSources = await Promise.all(pluginSources.map(async (source) => {
		const slug = fairPluginSlug(source);
		if (!slug) return source;

		const destination = resolve(cacheDir, slug);
		if (manifest[slug] === undefined && existsSync(destination)) {
			manifest[slug] = source;
			return `./.wp-env-plugins/${slug}`;
		}
		if (!refresh || manifest[slug] === source || manifest[slug] === undefined) {
			try {
				if (readdirSync(destination).length) {
					manifest[slug] = source;
					return `./.wp-env-plugins/${slug}`;
				}
			} catch {}
		}

		const response = await fetchImpl(source);
		if (!response.ok) throw new Error(`Failed to download ${slug} with status ${response.status}.`);
		const temporaryDir = mkdtempSync(resolve(tmpdir(), 'circus-wp-env-plugin-'));
		try {
			const archive = resolve(temporaryDir, `${slug}.zip`);
			const extracted = resolve(temporaryDir, 'extracted');
			mkdirSync(extracted);
			writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
			const unzip = spawnSync('unzip', ['-q', archive, '-d', extracted], { encoding: 'utf8' });
			if (unzip.error) throw unzip.error;
			if (unzip.status !== 0) throw new Error(`Failed to extract ${slug}: ${unzip.stderr.trim()}`);

			const entries = readdirSync(extracted, { withFileTypes: true });
			const pluginRoot = entries.length === 1 && entries[0].isDirectory()
				? resolve(extracted, entries[0].name)
				: extracted;
			if (existsSync(destination)) {
				renameSync(destination, resolve(cacheDir, `${slug}.previous-${Date.now()}`));
			}
			renameSync(pluginRoot, destination);
			manifest[slug] = source;
		} finally {
			rmSync(temporaryDir, { recursive: true, force: true });
		}

		return `./.wp-env-plugins/${slug}`;
	}));
	writeJsonFile(manifestFile, manifest);
	return stagedSources;
}

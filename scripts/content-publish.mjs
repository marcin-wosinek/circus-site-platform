#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from './lib/cli-error.mjs';
import { runCli } from './lib/run-cli.mjs';
import { loadSiteRegistry, requireProjectDir, requireWpEnvJson, resolveRegisteredSite } from './lib/site-registry.mjs';
import { loadContentPublishConfig, resolveContentPublishItem, selectedContentKeys } from './lib/content-publish-config.mjs';
import {
	assertUrlsTokenized,
	computeSha256,
	mimeTypeForExtension,
	readExistingArtifact,
	validateManifestShape,
	writeArtifact,
	ARTIFACT_SCHEMA_VERSION,
} from './lib/content-artifact.mjs';
import { canonicalizePageState, hashPageState, tokenizeSiteUrl } from './lib/page-normalization.mjs';
import { runWpCliJson, runWpCliText, runWpCliTextOptional } from './lib/wp-cli.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_OPERATIONS = new Set(['export']);

function parseArgs(argv) {
	const [operation, siteId, ...rest] = argv;
	const flags = { key: undefined, refreshBaseline: false };
	for (let index = 0; index < rest.length; index += 1) {
		const argument = rest[index];
		if (argument === '--key') {
			flags.key = rest[index + 1];
			index += 1;
		} else if (argument === '--refresh-baseline') {
			flags.refreshBaseline = true;
		} else {
			throw new CliError(`Unknown option: ${argument}`);
		}
	}
	return { operation, siteId, ...flags };
}

function usage() {
	console.log(`Usage: node ${process.argv[1]} export <site-id> [--key <content-key>] [--refresh-baseline]`);
	console.log('Exports the configured local wp-env content as a committed artifact.');
	console.log('Reads only the local wp-env of the selected site; production is untouched.');
}

function resolveUploadsDir(projectDir, wpEnvFile) {
	const wpEnv = JSON.parse(readFileSync(wpEnvFile, 'utf8'));
	const mapping = wpEnv.mappings?.['wp-content/uploads'];
	if (!mapping) throw new CliError('Site .wp-env.json must map "wp-content/uploads" to export a featured image.');
	return resolve(projectDir, mapping);
}

function exportFeaturedImage({ projectDir, wpEnvFile, pageId }) {
	const thumbnailId = runWpCliTextOptional(projectDir, ['post', 'meta', 'get', pageId, '_thumbnail_id']);
	if (!thumbnailId || thumbnailId === '0') return null;

	const attachedFile = runWpCliText(projectDir, ['post', 'meta', 'get', thumbnailId, '_wp_attached_file']);
	const mimeType = runWpCliText(projectDir, ['post', 'get', thumbnailId, '--field=post_mime_type']);
	const alt = runWpCliTextOptional(projectDir, ['post', 'meta', 'get', thumbnailId, '_wp_attachment_image_alt']);
	const caption = runWpCliText(projectDir, ['post', 'get', thumbnailId, '--field=post_excerpt']);
	const title = runWpCliText(projectDir, ['post', 'get', thumbnailId, '--field=post_title']);

	const uploadsDir = resolveUploadsDir(projectDir, wpEnvFile);
	const sourcePath = resolve(uploadsDir, attachedFile);
	const fromUploads = relative(uploadsDir, sourcePath);
	if (!fromUploads || fromUploads.startsWith('..')) {
		throw new CliError(`Featured image attachment path escapes the uploads directory: ${attachedFile}`);
	}
	if (!existsSync(sourcePath)) throw new CliError(`Featured image file is missing from local uploads: ${sourcePath}`);

	const expectedMimeType = mimeTypeForExtension(sourcePath);
	if (!expectedMimeType) throw new CliError(`Featured image file extension is not a supported image type: ${sourcePath}`);
	if (expectedMimeType !== mimeType) {
		throw new CliError(`Featured image mimeType "${mimeType}" does not match its file extension: ${sourcePath}`);
	}

	const bytes = readFileSync(sourcePath);
	return {
		bytes,
		manifestEntry: {
			file: `featured-image${extname(attachedFile).toLowerCase()}`,
			sha256: computeSha256(bytes),
			mimeType,
			basename: basename(attachedFile),
			alt,
			caption,
			title,
		},
	};
}

function resolvePageId(projectDir, item, siteId) {
	if (item.selector.type === 'page_on_front') {
		const pageId = runWpCliText(projectDir, ['option', 'get', 'page_on_front']);
		if (!pageId || pageId === '0') {
			throw new CliError(`Site "${siteId}" has no static front page configured (page_on_front is unset).`);
		}
		return pageId;
	}

	if (item.selector.type === 'page_path') {
		const pagePath = item.selector.path.replace(/^\//, '').replace(/\/$/, '');
		const matches = runWpCliJson(projectDir, [
			'post', 'list', '--post_type=page', '--post_status=any', `--pagename=${pagePath}`, '--fields=ID', '--format=json',
		]);
		if (matches.length !== 1) {
			throw new CliError(`Site "${siteId}" page path "${item.selector.path}" resolved to ${matches.length} pages; expected exactly one.`);
		}
		return String(matches[0].ID);
	}

	throw new CliError(`Unsupported selector type: ${item.selector.type}`);
}

function exportItem({ siteId, projectDir, wpEnvFile, item, contentKey, siteUrls, refreshBaseline }) {
	console.log(`Export destination: ${relative(platformDir, item.artifactDirAbsolute)} (committed artifact)`);
	const pageId = resolvePageId(projectDir, item, siteId);

	const post = runWpCliJson(projectDir, [
		'post',
		'get',
		pageId,
		'--format=json',
		'--fields=post_title,post_name,post_status,post_content,post_type',
	]);
	if (post.post_type !== item.type) {
		throw new CliError(`Resolved post ${pageId} has type "${post.post_type}", expected "${item.type}".`);
	}
	if (!item.allowedStatuses.includes(post.post_status)) {
		throw new CliError(`Resolved post ${pageId} has status "${post.post_status}", which is not allowed for "${contentKey}". Allowed: ${item.allowedStatuses.join(', ')}`);
	}

	const template = runWpCliTextOptional(projectDir, ['post', 'meta', 'get', pageId, '_wp_page_template']);
	const metadata = {};
	for (const metadataKey of item.metadata) {
		metadata[metadataKey] = runWpCliTextOptional(projectDir, ['post', 'meta', 'get', pageId, metadataKey]);
	}

	const featuredImage = exportFeaturedImage({ projectDir, wpEnvFile, pageId });

	let content = post.post_content;
	for (const url of siteUrls) content = tokenizeSiteUrl(content, url);

	assertUrlsTokenized(content, siteUrls, 'Exported content');
	assertUrlsTokenized(post.post_title, siteUrls, 'Exported title');

	const canonicalState = canonicalizePageState({
		contentKey,
		type: item.type,
		title: post.post_title,
		slug: post.post_name,
		status: post.post_status,
		template,
		content,
		featuredImage: featuredImage?.manifestEntry ?? null,
		metadata,
	});
	const targetHash = hashPageState(canonicalState);

	const existing = readExistingArtifact(item.artifactDirAbsolute);
	if (existing) validateManifestShape(existing.manifest, { contentKey, item });

	let baselineHash;
	if (refreshBaseline || !existing) {
		baselineHash = targetHash;
	} else {
		baselineHash = existing.manifest.baselineHash;
	}

	const manifest = {
		schemaVersion: ARTIFACT_SCHEMA_VERSION,
		contentKey,
		type: item.type,
		title: post.post_title,
		slug: post.post_name,
		status: post.post_status,
		template,
		content: { file: 'content.html' },
		featuredImage: featuredImage?.manifestEntry ?? null,
		metadata,
		baselineHash,
	};
	validateManifestShape(manifest, { contentKey, item });

	writeArtifact(item.artifactDirAbsolute, {
		manifest,
		contentText: content,
		featuredImageBytes: featuredImage?.bytes,
	});

	console.log(`Exported "${contentKey}" (post ${pageId}) to ${relative(platformDir, item.artifactDirAbsolute)}`);
	console.log(`Target hash: ${targetHash}`);
	console.log(`Baseline hash: ${baselineHash}${existing && !refreshBaseline ? ' (preserved; pass --refresh-baseline to adopt the current state)' : ''}`);
	console.log('Review the artifact diff before committing.');
}

async function runExport({ siteId, key, refreshBaseline }) {
	if (!siteId) throw new CliError('Pass a registered site ID.');

	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, siteId, platformDir);
	requireProjectDir(projectDir, site);
	const wpEnvFile = requireWpEnvJson(projectDir, siteId);
	const config = loadContentPublishConfig(projectDir, siteId);
	const contentKeys = selectedContentKeys(config, key);
	const localUrl = process.env.LOCAL_URL ?? `http://localhost:${site.port}`;
	const siteUrls = [site.productionUrl, localUrl];

	console.log(`Export source: ${projectDir} (${localUrl}, local wp-env)`);
	runWpCliText(projectDir, ['core', 'is-installed']);
	for (const contentKey of contentKeys) {
		exportItem({ siteId, projectDir, wpEnvFile, item: resolveContentPublishItem(config, contentKey), contentKey, siteUrls, refreshBaseline });
	}
}

await runCli(async () => {
	const { operation, siteId, key, refreshBaseline } = parseArgs(process.argv.slice(2));
	if (!SUPPORTED_OPERATIONS.has(operation)) {
		usage();
		if (!operation) return;
		throw new CliError(`Unsupported operation: ${operation}`);
	}
	await runExport({ siteId, key, refreshBaseline });
});

#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliError } from './lib/cli-error.mjs';
import { runCli } from './lib/run-cli.mjs';
import { loadSiteRegistry, requireProjectDir, requireWpEnvJson, resolveRegisteredSite } from './lib/site-registry.mjs';
import { loadEnvFile, resolveEnvFilePath } from './lib/env-file.mjs';
import { loadContentPublishConfig, resolveContentPublishItem, selectedContentKeys } from './lib/content-publish-config.mjs';
import {
	assertUrlsTokenized,
	computeSha256,
	mimeTypeForExtension,
	readExistingArtifact,
	validateArtifactFiles,
	validateManifestShape,
	writeArtifact,
	ARTIFACT_SCHEMA_VERSION,
} from './lib/content-artifact.mjs';
import { canonicalizePageState, hashPageState, tokenizeSiteUrl } from './lib/page-normalization.mjs';
import { runWpCliJson, runWpCliText, runWpCliTextOptional } from './lib/wp-cli.mjs';
import { runRemoteWpCliJson, runRemoteWpCliText, runRemoteWpCliTextOptional, readRemoteFileBytes } from './lib/remote-wp-cli.mjs';
import { buildSshArgs, loadProductionSshConfig, validateUrl } from './lib/ssh-config.mjs';
import { assertPathsCommittedAndClean, getCurrentCommit } from './lib/git-status.mjs';
import { classifyByHash, computePlanHash, resolveProductionMatch } from './lib/content-plan.mjs';
import { writeJsonFileAtomic } from './lib/json-file.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_OPERATIONS = new Set(['export', 'plan']);
const PRODUCTION_MARKER_META_KEY = '_circus_content_key';
const PRODUCTION_LOOKUP_STATUSES = 'publish,future,draft,pending,private,trash';

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
	console.log(`       node ${process.argv[1]} plan <site-id> [--key <content-key>]`);
	console.log('Compares committed artifacts against current production state (read-only) and reports create/update/unchanged/conflict.');
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

function resolvePostId(projectDir, item, siteId) {
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

	if (item.selector.type === 'post_path') {
		const slug = item.selector.path.split('/').filter(Boolean).at(-1);
		const matches = runWpCliJson(projectDir, [
			'post', 'list', `--post_type=${item.type}`, '--post_status=any', `--name=${slug}`, '--fields=ID', '--format=json',
		]);
		if (matches.length !== 1) {
			throw new CliError(`Site "${siteId}" ${item.type} path "${item.selector.path}" resolved to ${matches.length} posts; expected exactly one.`);
		}
		return String(matches[0].ID);
	}

	throw new CliError(`Unsupported selector type: ${item.selector.type}`);
}

function exportItem({ siteId, projectDir, wpEnvFile, item, contentKey, siteUrls, refreshBaseline }) {
	console.log(`Export destination: ${relative(platformDir, item.artifactDirAbsolute)} (committed artifact)`);
	const pageId = resolvePostId(projectDir, item, siteId);

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

function recomputeTargetHash(manifest, artifactDirAbsolute) {
	const contentText = readFileSync(resolve(artifactDirAbsolute, manifest.content.file), 'utf8');
	const canonicalState = canonicalizePageState({
		contentKey: manifest.contentKey,
		type: manifest.type,
		title: manifest.title,
		slug: manifest.slug,
		status: manifest.status,
		template: manifest.template,
		content: contentText,
		featuredImage: manifest.featuredImage,
		metadata: manifest.metadata,
	});
	return hashPageState(canonicalState);
}

function fetchProductionFeaturedImage({ sshArgs, remotePath, postId }) {
	const thumbnailId = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', postId, '_thumbnail_id']);
	if (!thumbnailId || thumbnailId === '0') return null;

	const attachedFile = runRemoteWpCliText(sshArgs, remotePath, ['post', 'meta', 'get', thumbnailId, '_wp_attached_file']);
	if (!attachedFile || attachedFile.startsWith('/') || attachedFile.split('/').includes('..')) {
		throw new CliError(`Production featured image attachment path is unsafe: ${attachedFile}`);
	}
	const mimeType = runRemoteWpCliText(sshArgs, remotePath, ['post', 'get', thumbnailId, '--field=post_mime_type']);
	const alt = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', thumbnailId, '_wp_attachment_image_alt']);
	const caption = runRemoteWpCliText(sshArgs, remotePath, ['post', 'get', thumbnailId, '--field=post_excerpt']);
	const title = runRemoteWpCliText(sshArgs, remotePath, ['post', 'get', thumbnailId, '--field=post_title']);

	const remoteImagePath = `${remotePath.replace(/\/$/, '')}/wp-content/uploads/${attachedFile}`;
	const bytes = readRemoteFileBytes(sshArgs, remoteImagePath);

	return { sha256: computeSha256(bytes), mimeType, alt, caption, title };
}

function fetchProductionHash({ sshArgs, remotePath, postId, item, contentKey, siteUrls }) {
	const post = runRemoteWpCliJson(sshArgs, remotePath, [
		'post', 'get', postId, '--format=json',
		'--fields=post_title,post_name,post_status,post_content,post_type',
	]);
	if (post.post_type !== item.type) {
		throw new CliError(`Production post ${postId} has type "${post.post_type}", expected "${item.type}" for "${contentKey}".`);
	}

	const template = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', postId, '_wp_page_template']);
	const metadata = {};
	for (const metadataKey of item.metadata) {
		metadata[metadataKey] = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', postId, metadataKey]);
	}

	const featuredImage = fetchProductionFeaturedImage({ sshArgs, remotePath, postId });

	let content = post.post_content;
	for (const url of siteUrls) content = tokenizeSiteUrl(content, url);

	const canonicalState = canonicalizePageState({
		contentKey,
		type: post.post_type,
		title: post.post_title,
		slug: post.post_name,
		status: post.post_status,
		template,
		content,
		featuredImage,
		metadata,
	});
	return hashPageState(canonicalState);
}

function planItem({ sshArgs, remotePath, contentKey, item, manifest, siteUrls }) {
	const targetHash = recomputeTargetHash(manifest, item.artifactDirAbsolute);
	const artifact = { baselineHash: manifest.baselineHash, targetHash };

	const markerMatches = runRemoteWpCliJson(sshArgs, remotePath, [
		'post', 'list',
		`--post_type=${item.type}`,
		`--post_status=${PRODUCTION_LOOKUP_STATUSES}`,
		`--meta_key=${PRODUCTION_MARKER_META_KEY}`,
		`--meta_value=${contentKey}`,
		'--fields=ID,post_status',
		'--format=json',
	]).map((row) => ({ id: String(row.ID), status: row.post_status }));

	let frontPage = null;
	if (item.selector.type === 'page_on_front' && markerMatches.length === 0) {
		const frontPageId = runRemoteWpCliText(sshArgs, remotePath, ['option', 'get', 'page_on_front']);
		if (frontPageId && frontPageId !== '0') {
			const frontPageKey = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', frontPageId, PRODUCTION_MARKER_META_KEY]);
			frontPage = { id: frontPageId, contentKey: frontPageKey || null };
		}
	}

	const resolution = resolveProductionMatch({ markerMatches, contentKey, selectorType: item.selector.type, frontPage });

	if (resolution.outcome === 'create') {
		return { contentKey, classification: 'create', reason: null, postId: null, productionHash: null, artifact };
	}
	if (resolution.outcome === 'conflict') {
		return { contentKey, classification: 'conflict', reason: resolution.reason, postId: null, productionHash: null, artifact };
	}

	const postId = resolution.postId;
	const productionHash = fetchProductionHash({ sshArgs, remotePath, postId, item, contentKey, siteUrls });
	const { classification, reason } = classifyByHash({ baselineHash: manifest.baselineHash, targetHash, productionHash });
	return { contentKey, classification, reason: reason ?? null, postId, productionHash, artifact };
}

function printPlanReport(results) {
	console.log('');
	console.log('Plan report:');
	for (const result of results) {
		const parts = [`- ${result.contentKey}: ${result.classification}`];
		if (result.postId) parts.push(`(production ID ${result.postId})`);
		if (result.reason) parts.push(`— ${result.reason}`);
		console.log(parts.join(' '));
	}
	console.log('');
}

function writePlanRecord({ siteId, commit, results }) {
	const items = {};
	for (const result of results) {
		items[result.contentKey] = {
			artifact: result.artifact,
			production: { postId: result.postId, hash: result.productionHash },
			classification: result.classification,
			reason: result.reason,
		};
	}
	const record = {
		schemaVersion: 1,
		siteId,
		commit,
		generatedAt: new Date().toISOString(),
		items,
	};
	const planHash = computePlanHash(record);

	const planDir = resolve(platformDir, '.content-publish', 'plans', siteId);
	mkdirSync(planDir, { recursive: true });
	const planPath = resolve(planDir, 'plan.json');
	writeJsonFileAtomic(planPath, { ...record, planHash });
	console.log(`Plan record written to ${relative(platformDir, planPath)}`);
}

async function runPlan({ siteId, key }) {
	if (!siteId) throw new CliError('Pass a registered site ID.');

	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, siteId, platformDir);
	requireProjectDir(projectDir, site);
	const config = loadContentPublishConfig(projectDir, siteId);
	const contentKeys = selectedContentKeys(config, key);
	const items = contentKeys.map((contentKey) => ({ contentKey, item: resolveContentPublishItem(config, contentKey) }));

	const manifests = new Map();
	for (const { contentKey, item } of items) {
		const existing = readExistingArtifact(item.artifactDirAbsolute);
		if (!existing) {
			throw new CliError(`Content key "${contentKey}" has no exported artifact yet. Run "npm run content:export -- ${siteId} --key ${contentKey}" first.`);
		}
		validateManifestShape(existing.manifest, { contentKey, item });
		validateArtifactFiles(existing.manifest, item.artifactDirAbsolute);
		manifests.set(contentKey, existing.manifest);
	}

	// Everything above is local, offline validation. Only after it passes do
	// we touch Git state or contact production.
	const pathsToCheck = [config.configPath, ...items.map(({ item }) => item.artifactDirAbsolute)];
	assertPathsCommittedAndClean(platformDir, pathsToCheck);
	const commit = getCurrentCommit(platformDir);

	loadEnvFile(resolveEnvFilePath(platformDir, projectDir, siteId));
	const { sshTarget, sshPort, sshKey, remotePath } = loadProductionSshConfig();
	// Must match export's tokenization source exactly (site.productionUrl,
	// never an env override) so the production and artifact hashes are
	// comparable.
	const productionUrl = site.productionUrl;
	const localUrl = process.env.LOCAL_URL ?? `http://localhost:${site.port}`;
	validateUrl(productionUrl, 'productionUrl');
	validateUrl(localUrl, 'localUrl');
	const siteUrls = [productionUrl, localUrl];
	const sshArgs = buildSshArgs({ sshTarget, sshPort, sshKey });

	console.log(`Plan source: ${sshTarget}:${remotePath} (production, read-only)`);
	console.log('Plan destination: report and saved plan record only; production is never written.');
	runRemoteWpCliText(sshArgs, remotePath, ['core', 'is-installed']);

	const results = [];
	let hasConflict = false;
	for (const { contentKey, item } of items) {
		const result = planItem({ sshArgs, remotePath, contentKey, item, manifest: manifests.get(contentKey), siteUrls });
		results.push(result);
		if (result.classification === 'conflict') hasConflict = true;
	}

	printPlanReport(results);
	writePlanRecord({ siteId, commit, results });

	if (hasConflict) process.exitCode = 1;
}

await runCli(async () => {
	const { operation, siteId, key, refreshBaseline } = parseArgs(process.argv.slice(2));
	if (!SUPPORTED_OPERATIONS.has(operation)) {
		usage();
		if (!operation) return;
		throw new CliError(`Unsupported operation: ${operation}`);
	}
	if (operation === 'plan') {
		if (refreshBaseline) throw new CliError('--refresh-baseline is only supported for the export operation.');
		await runPlan({ siteId, key });
		return;
	}
	await runExport({ siteId, key, refreshBaseline });
});

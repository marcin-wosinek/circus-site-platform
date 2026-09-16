#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, chmodSync } from 'node:fs';
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
import { canonicalizePageState, hashPageState, tokenizeSiteUrl, materializeSiteUrl } from './lib/page-normalization.mjs';
import { runWpCliJson, runWpCliText, runWpCliTextOptional } from './lib/wp-cli.mjs';
import { runRemoteWpCliJson, runRemoteWpCliText, runRemoteWpCliTextOptional, readRemoteFileBytes } from './lib/remote-wp-cli.mjs';
import { buildSshArgs, loadProductionSshConfig, validateUrl } from './lib/ssh-config.mjs';
import { assertPathsCommittedAndClean, getCurrentCommit } from './lib/git-status.mjs';
import { classifyByHash, computePlanHash, resolveProductionMatch, validatePlanRecord } from './lib/content-plan.mjs';
import { writeJsonFileAtomic } from './lib/json-file.mjs';
import { parseJsonNoDuplicateKeys } from './lib/strict-json.mjs';
import { createProductionBackup } from './lib/content-production-backup.mjs';
import { ensureProductionMedia, writeProductionPost } from './lib/content-production-write.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_OPERATIONS = new Set(['export', 'plan', 'apply']);
const PRODUCTION_MARKER_META_KEY = '_circus_content_key';
const PRODUCTION_LOOKUP_STATUSES = 'publish,future,draft,pending,private,trash';

function parseArgs(argv) {
	const [operation, siteId, ...rest] = argv;
	const flags = { key: undefined, refreshBaseline: false, planPath: undefined, confirmProduction: undefined };
	const seen = new Set();
	for (let index = 0; index < rest.length; index += 1) {
		const argument = rest[index];
		const [name, inlineValue] = argument.split(/=(.*)/s);
		if (seen.has(name)) throw new CliError(`Duplicate option: ${name}`);
		seen.add(name);
		if (argument === '--key') {
			flags.key = rest[index + 1];
			index += 1;
		} else if (argument === '--plan') {
			flags.planPath = rest[index + 1];
			index += 1;
		} else if (name === '--confirm-production') {
			flags.confirmProduction = inlineValue;
		} else if (argument === '--refresh-baseline') {
			flags.refreshBaseline = true;
		} else {
			throw new CliError(`Unknown option: ${argument}`);
		}
	}
	if (operation === 'apply' && (flags.key || flags.refreshBaseline || !flags.planPath || !flags.confirmProduction || flags.confirmProduction !== siteId)) throw new CliError('Apply requires --plan <saved-plan.json> and --confirm-production=<site-id>; --key and --refresh-baseline are unsupported.');
	if (operation !== 'apply' && (flags.planPath || flags.confirmProduction)) throw new CliError('--plan and --confirm-production are only supported for apply.');
	return { operation, siteId, ...flags };
}

function usage() {
	console.log(`Usage: node ${process.argv[1]} export <site-id> [--key <content-key>] [--refresh-baseline]`);
	console.log('Exports the configured local wp-env content as a committed artifact.');
	console.log('Reads only the local wp-env of the selected site; production is untouched.');
	console.log(`       node ${process.argv[1]} plan <site-id> [--key <content-key>]`);
	console.log('Compares committed artifacts against current production state (read-only) and reports create/update/unchanged/conflict.');
	console.log(`       node ${process.argv[1]} apply <site-id> --plan <saved-plan.json> --confirm-production=<site-id>`);
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
	let pathMatches = [];
	if (item.selector.type === 'page_on_front' && markerMatches.length === 0) {
		const frontPageId = runRemoteWpCliText(sshArgs, remotePath, ['option', 'get', 'page_on_front']);
		if (frontPageId && frontPageId !== '0') {
			const frontPageKey = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', frontPageId, PRODUCTION_MARKER_META_KEY]);
			frontPage = { id: frontPageId, contentKey: frontPageKey || null };
		}
	}
	let markerAtPath = true;
	if (item.selector.type !== 'page_on_front') {
		const slug = item.selector.path.split('/').filter(Boolean).at(-1);
		const expectedPath = item.selector.path.replace(/\/$/, '');
		const permalinkPath = (id) => {
			if (!/^[1-9]\d*$/.test(id)) throw new CliError('Production path lookup returned an invalid post ID.');
			const permalink = runRemoteWpCliText(sshArgs, remotePath, ['eval', `echo get_permalink(${id});`]);
			try { return new URL(permalink).pathname.replace(/\/$/, ''); } catch { throw new CliError(`Production post ${id} has an invalid permalink.`); }
		};
		const candidates = runRemoteWpCliJson(sshArgs, remotePath, [
			'post', 'list', `--post_type=${item.type}`, `--post_status=${PRODUCTION_LOOKUP_STATUSES}`,
			`--name=${slug}`, '--fields=ID,post_status', '--format=json',
		]);
		for (const candidate of candidates) {
			const id = String(candidate.ID);
			if (permalinkPath(id) === expectedPath) {
				const marker = runRemoteWpCliTextOptional(sshArgs, remotePath, ['post', 'meta', 'get', id, PRODUCTION_MARKER_META_KEY]);
				pathMatches.push({ id, status: candidate.post_status, contentKey: marker || null });
			}
		}
		if (markerMatches.length === 1) markerAtPath = permalinkPath(markerMatches[0].id) === expectedPath;
	}

	const resolution = resolveProductionMatch({ markerMatches, contentKey, selectorType: item.selector.type, frontPage, pathMatches, markerAtPath });

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

function writePlanRecord({ siteId, commit, destination, results }) {
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
		schemaVersion: 2,
		siteId,
		destination,
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
	writePlanRecord({ siteId, commit, destination: { productionUrl, sshTarget, sshPort: sshPort ?? null, remotePath }, results });

	if (hasConflict) process.exitCode = 1;
}

async function runApply({ siteId, planPath }) {
	if (!siteId) throw new CliError('Pass a registered site ID.');
	const registry = loadSiteRegistry(platformDir);
	const { site, projectDir } = resolveRegisteredSite(registry, siteId, platformDir);
	requireProjectDir(projectDir, site);
	const config = loadContentPublishConfig(projectDir, siteId);
	const absolutePlanPath = resolve(planPath);
	if (!existsSync(absolutePlanPath)) throw new CliError(`Saved plan is missing: ${absolutePlanPath}`);
	const record = parseJsonNoDuplicateKeys(readFileSync(absolutePlanPath, 'utf8'), { label: 'saved content plan' });
	const contentKeys = Object.keys(record.items ?? {});
	if (!contentKeys.length) throw new CliError('Saved plan contains no items.');
	const items = contentKeys.map((contentKey) => ({ contentKey, item: resolveContentPublishItem(config, contentKey) }));
	const manifests = new Map();
	for (const { contentKey, item } of items) {
		const existing = readExistingArtifact(item.artifactDirAbsolute);
		if (!existing) throw new CliError(`Artifact missing for ${contentKey}.`);
		validateManifestShape(existing.manifest, { contentKey, item });
		validateArtifactFiles(existing.manifest, item.artifactDirAbsolute);
		manifests.set(contentKey, existing.manifest);
	}
	assertPathsCommittedAndClean(platformDir, [config.configPath, ...items.map(({ item }) => item.artifactDirAbsolute)]);
	const commit = getCurrentCommit(platformDir);
	loadEnvFile(resolveEnvFilePath(platformDir, projectDir, siteId));
	const { sshTarget, sshPort, sshKey, remotePath } = loadProductionSshConfig();
	const productionUrl = site.productionUrl;
	validateUrl(productionUrl, 'productionUrl');
	validatePlanRecord(record, { siteId, commit, contentKeys, destination: { productionUrl, sshTarget, sshPort: sshPort ?? null, remotePath } });
	for (const { contentKey, item } of items) {
		const manifest = manifests.get(contentKey);
		const saved = record.items[contentKey];
		if (saved.classification === 'conflict' || saved.artifact.baselineHash !== manifest.baselineHash || saved.artifact.targetHash !== recomputeTargetHash(manifest, item.artifactDirAbsolute)) throw new CliError(`Saved plan is conflicted or artifact changed for ${contentKey}.`);
	}
	const sshArgs = buildSshArgs({ sshTarget, sshPort, sshKey });
	const localUrl = process.env.LOCAL_URL ?? `http://localhost:${site.port}`;
	validateUrl(localUrl, 'localUrl');
	const siteUrls = [productionUrl, localUrl];
	console.log(`Apply source: committed artifacts at ${commit}`);
	console.log(`Apply destination: ${productionUrl} via ${sshTarget}:${remotePath}`);
	console.log(`Direction: artifacts -> production; keys: ${contentKeys.join(', ')}`);
	console.log(`Plan hash: ${record.planHash}`);
	runRemoteWpCliText(sshArgs, remotePath, ['core', 'is-installed']);
	for (const { contentKey, item } of items) {
		const saved = record.items[contentKey];
		const current = planItem({ sshArgs, remotePath, contentKey, item, manifest: manifests.get(contentKey), siteUrls });
		const starting = current.postId === saved.production.postId && current.productionHash === saved.production.hash && current.classification !== 'conflict';
		const complete = current.postId !== null && current.productionHash === saved.artifact.targetHash && current.classification !== 'conflict' && (!saved.production.postId || current.postId === saved.production.postId);
		if (!starting && !complete) throw new CliError(`Production changed since planning for ${contentKey}; apply stopped before mutation.`);
	}
	const journalDir = resolve(platformDir, '.content-publish', 'journals', siteId);
	mkdirSync(journalDir, { recursive: true, mode: 0o700 });
	const journalPath = resolve(journalDir, `${record.planHash}.json`);
	const journal = { siteId, planHash: record.planHash, destination: record.destination, commit, backup: null, items: {}, result: 'running' };
	const save = () => { writeJsonFileAtomic(journalPath, journal); chmodSync(journalPath, 0o600); };
	let backup;
	try {
		for (const { contentKey, item } of items) {
			const manifest = manifests.get(contentKey);
			const saved = record.items[contentKey];
			const current = planItem({ sshArgs, remotePath, contentKey, item, manifest, siteUrls });
			const alreadyDone = current.productionHash === saved.artifact.targetHash && current.postId !== null;
			if (alreadyDone) {
				if (saved.production.postId && current.postId !== saved.production.postId) throw new CliError(`Production identity changed for ${contentKey}.`);
				journal.items[contentKey] = { phase: 'verified', action: 'skipped', postId: current.postId, hash: current.productionHash }; save();
				console.log(`${contentKey}: skipped (ID ${current.postId}, ${current.productionHash})`);
				continue;
			}
			if (current.classification === 'conflict' || current.postId !== saved.production.postId || current.productionHash !== saved.production.hash) throw new CliError(`Production changed since planning for ${contentKey}; apply stopped.`);
			if (!backup) {
				backup = createProductionBackup({ platformDir, siteId, sshArgs, remotePath });
				journal.backup = backup; save();
				console.log(`Verified backup: ${backup.path} (${backup.sha256})`);
			}
			// Re-read after the backup, immediately before this item's first mutation.
			const beforeWrite = planItem({ sshArgs, remotePath, contentKey, item, manifest, siteUrls });
			if (beforeWrite.postId !== saved.production.postId || beforeWrite.productionHash !== saved.production.hash || beforeWrite.classification === 'conflict') throw new CliError(`Production changed during backup for ${contentKey}.`);
			let thumbnailId = null;
			if (manifest.featuredImage) {
				const bytes = readFileSync(resolve(item.artifactDirAbsolute, manifest.featuredImage.file));
				const media = ensureProductionMedia(sshArgs, remotePath, manifest.featuredImage, bytes);
				thumbnailId = media.id;
				journal.items[contentKey] = { phase: 'media', mediaId: media.id, uploaded: media.uploaded }; save();
			}
			const beforePost = planItem({ sshArgs, remotePath, contentKey, item, manifest, siteUrls });
			if (beforePost.postId !== saved.production.postId || beforePost.productionHash !== saved.production.hash || beforePost.classification === 'conflict') throw new CliError(`Production changed before page write for ${contentKey}.`);
			const content = materializeSiteUrl(readFileSync(resolve(item.artifactDirAbsolute, manifest.content.file), 'utf8'), productionUrl);
			const written = writeProductionPost(sshArgs, remotePath, { postId: saved.production.postId, contentKey, manifest, content, thumbnailId });
			journal.items[contentKey] = { phase: 'page', postId: String(written.id), mediaId: thumbnailId }; save();
			const after = planItem({ sshArgs, remotePath, contentKey, item, manifest, siteUrls });
			if (after.postId !== String(written.id) || after.productionHash !== saved.artifact.targetHash) throw new CliError(`Post-write readback hash mismatch for ${contentKey}; deployment failed. Restore the backup manually if needed.`);
			journal.items[contentKey] = { phase: 'verified', action: saved.classification, postId: after.postId, hash: after.productionHash, mediaId: thumbnailId }; save();
			console.log(`${contentKey}: ${saved.classification} (ID ${after.postId}, ${after.productionHash})`);
		}
		journal.result = 'complete'; save();
		console.log(`Apply complete. Commit ${commit}; plan ${record.planHash}; backup ${backup?.path ?? 'not needed'}; SHA-256 ${backup?.sha256 ?? 'n/a'}. Recovery: docs/publish-content.md#recovery`);
	} catch (error) {
		journal.result = 'failed'; journal.error = error instanceof CliError ? error.message : 'Unexpected local error'; save();
		throw error;
	}
}

await runCli(async () => {
	const { operation, siteId, key, refreshBaseline, planPath } = parseArgs(process.argv.slice(2));
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
	if (operation === 'apply') return runApply({ siteId, planPath });
	await runExport({ siteId, key, refreshBaseline });
});

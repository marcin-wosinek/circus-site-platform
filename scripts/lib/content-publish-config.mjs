import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { CliError } from './cli-error.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';

const SUPPORTED_TYPES = new Set(['page', 'fair_event']);
const SUPPORTED_SELECTOR_TYPES = new Set(['page_on_front', 'page_path', 'post_path']);
const SUPPORTED_STATUSES = new Set(['draft', 'publish']);
const CONTENT_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;
const METADATA_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const RESERVED_METADATA_PREFIX = '_circus_';

function assertOnlyKeys(value, allowedKeys, label) {
	for (const key of Object.keys(value)) {
		if (!allowedKeys.includes(key)) throw new CliError(`${label} has an unsupported field "${key}".`);
	}
}

function assertSafeRelativePath(relativePath, siteDir, label) {
	if (typeof relativePath !== 'string' || !relativePath) throw new CliError(`${label} must be a non-empty string.`);
	const resolved = resolve(siteDir, relativePath);
	const fromSite = relative(siteDir, resolved);
	if (!fromSite || fromSite === '..' || fromSite.startsWith(`..${sep}`) || resolved === siteDir) {
		throw new CliError(`${label} must resolve inside the site directory: ${relativePath}`);
	}
	return resolved;
}

function validateItem(key, item, siteDir) {
	const label = `content-publish.json item "${key}"`;
	if (!CONTENT_KEY_PATTERN.test(key)) throw new CliError(`Content key "${key}" must be lowercase and start with a letter.`);
	if (!item || typeof item !== 'object' || Array.isArray(item)) throw new CliError(`${label} must be an object.`);
	assertOnlyKeys(item, ['type', 'selector', 'artifactDir', 'allowedStatuses', 'metadata'], label);

	if (!SUPPORTED_TYPES.has(item.type)) {
		throw new CliError(`${label} has an unsupported type "${item.type}". Supported types: ${[...SUPPORTED_TYPES].join(', ')}.`);
	}

	if (!item.selector || typeof item.selector !== 'object' || Array.isArray(item.selector)) {
		throw new CliError(`${label} must declare a selector object.`);
	}
	assertOnlyKeys(item.selector, ['type', 'path'], `${label} selector`);
	if (!SUPPORTED_SELECTOR_TYPES.has(item.selector.type)) {
		throw new CliError(`${label} has an unsupported selector type "${item.selector.type}". Supported selectors: ${[...SUPPORTED_SELECTOR_TYPES].join(', ')}.`);
	}
	if (item.selector.type === 'page_path' || item.selector.type === 'post_path') {
		if (typeof item.selector.path !== 'string' || !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/.test(item.selector.path)) {
			throw new CliError(`${label} selector path must be an absolute, trailing-slash post path.`);
		}
	} else if ('path' in item.selector) {
		throw new CliError(`${label} selector path is only supported for path selectors.`);
	}
	if (item.selector.type === 'page_on_front' && item.type !== 'page') {
		throw new CliError(`${label} selector type "page_on_front" requires content type "page".`);
	}
	if (item.selector.type === 'page_path' && item.type !== 'page') {
		throw new CliError(`${label} selector type "page_path" requires content type "page".`);
	}

	const artifactDirAbsolute = assertSafeRelativePath(item.artifactDir, siteDir, `${label} artifactDir`);

	if (!Array.isArray(item.allowedStatuses) || item.allowedStatuses.length === 0) {
		throw new CliError(`${label} must declare a non-empty allowedStatuses array.`);
	}
	if (new Set(item.allowedStatuses).size !== item.allowedStatuses.length) {
		throw new CliError(`${label} allowedStatuses must not contain duplicates.`);
	}
	for (const status of item.allowedStatuses) {
		if (!SUPPORTED_STATUSES.has(status)) {
			throw new CliError(`${label} allows unsupported status "${status}". Supported statuses: ${[...SUPPORTED_STATUSES].join(', ')}.`);
		}
	}

	if (!Array.isArray(item.metadata)) throw new CliError(`${label} must declare a metadata array.`);
	if (new Set(item.metadata).size !== item.metadata.length) {
		throw new CliError(`${label} metadata must not contain duplicate keys.`);
	}
	for (const metadataKey of item.metadata) {
		if (typeof metadataKey !== 'string' || !METADATA_KEY_PATTERN.test(metadataKey)) {
			throw new CliError(`${label} has a malformed metadata key "${metadataKey}".`);
		}
		if (metadataKey.startsWith(RESERVED_METADATA_PREFIX)) {
			throw new CliError(`${label} metadata key "${metadataKey}" is reserved for internal use.`);
		}
	}

	return {
		type: item.type,
		selector: { ...item.selector },
		artifactDir: item.artifactDir,
		artifactDirAbsolute,
		allowedStatuses: [...item.allowedStatuses],
		metadata: [...item.metadata],
	};
}

export function loadContentPublishConfig(siteDir, siteId) {
	const configPath = resolve(siteDir, 'content-publish.json');
	if (!existsSync(configPath)) {
		throw new CliError(`Site "${siteId}" does not have a content-publish.json configuration.`);
	}
	const raw = parseJsonNoDuplicateKeys(readFileSync(configPath, 'utf8'), { label: `${siteId} content-publish.json` });
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new CliError('content-publish.json must be an object.');
	assertOnlyKeys(raw, ['$schema', 'items'], 'content-publish.json');
	if (!raw.items || typeof raw.items !== 'object' || Array.isArray(raw.items) || Object.keys(raw.items).length === 0) {
		throw new CliError('content-publish.json must declare a non-empty "items" object.');
	}

	const items = {};
	const seenArtifactDirs = new Map();
	for (const [key, item] of Object.entries(raw.items)) {
		const validated = validateItem(key, item, siteDir);
		const existing = seenArtifactDirs.get(validated.artifactDirAbsolute);
		if (existing) {
			throw new CliError(`content-publish.json items "${existing}" and "${key}" share the same artifactDir: ${validated.artifactDir}`);
		}
		seenArtifactDirs.set(validated.artifactDirAbsolute, key);
		items[key] = validated;
	}

	return { configPath, items };
}

export function resolveContentPublishItem(config, contentKey) {
	const item = config.items[contentKey];
	if (!item) {
		throw new CliError(`Unknown content key "${contentKey}". Configured keys: ${Object.keys(config.items).join(', ')}`);
	}
	return item;
}

export function selectedContentKeys(config, contentKey) {
	if (!contentKey) return Object.keys(config.items);
	resolveContentPublishItem(config, contentKey);
	return [contentKey];
}

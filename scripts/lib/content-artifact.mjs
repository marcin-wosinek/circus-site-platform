import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { CliError } from './cli-error.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';

export const ARTIFACT_SCHEMA_VERSION = 1;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const METADATA_VALUE_TYPE = 'string';

const MIME_EXTENSIONS = {
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/webp': ['.webp'],
	'image/gif': ['.gif'],
};

const TOP_LEVEL_FIELDS = [
	'schemaVersion',
	'contentKey',
	'type',
	'title',
	'slug',
	'status',
	'template',
	'content',
	'featuredImage',
	'metadata',
	'baselineHash',
];

function assertOnlyKeys(value, allowedKeys, label) {
	for (const key of Object.keys(value)) {
		if (!allowedKeys.includes(key)) throw new CliError(`${label} has an unsupported field "${key}".`);
	}
}

function assertArtifactFilename(filename, label) {
	if (typeof filename !== 'string' || !filename) throw new CliError(`${label} must be a non-empty filename.`);
	if (filename.includes('/') || filename.includes('\\') || filename === '.' || filename === '..') {
		throw new CliError(`${label} must be a bare filename, not a path: ${filename}`);
	}
}

function computeSha256(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

// Validates the structural shape and field-level rules of a manifest object.
// Does not touch the filesystem; see `validateArtifactFiles` for that.
export function validateManifestShape(manifest, { contentKey, item }) {
	if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
		throw new CliError('Artifact manifest must be an object.');
	}
	assertOnlyKeys(manifest, TOP_LEVEL_FIELDS, 'Artifact manifest');

	if (manifest.schemaVersion !== ARTIFACT_SCHEMA_VERSION) {
		throw new CliError(`Artifact manifest schemaVersion must be ${ARTIFACT_SCHEMA_VERSION}.`);
	}
	if (manifest.contentKey !== contentKey) {
		throw new CliError(`Artifact manifest contentKey "${manifest.contentKey}" does not match "${contentKey}".`);
	}
	if (manifest.type !== item.type) {
		throw new CliError(`Artifact manifest type "${manifest.type}" does not match configured type "${item.type}".`);
	}
	if (typeof manifest.title !== 'string' || !manifest.title.trim()) {
		throw new CliError('Artifact manifest title must be a non-empty string.');
	}
	if (typeof manifest.slug !== 'string' || !SLUG_PATTERN.test(manifest.slug)) {
		throw new CliError(`Artifact manifest slug is invalid: ${manifest.slug}`);
	}
	if (!item.allowedStatuses.includes(manifest.status)) {
		throw new CliError(`Artifact manifest status "${manifest.status}" is not allowed for "${contentKey}". Allowed: ${item.allowedStatuses.join(', ')}`);
	}
	if (typeof manifest.template !== 'string') {
		throw new CliError('Artifact manifest template must be a string.');
	}

	if (!manifest.content || typeof manifest.content !== 'object' || Array.isArray(manifest.content)) {
		throw new CliError('Artifact manifest content must be an object.');
	}
	assertOnlyKeys(manifest.content, ['file'], 'Artifact manifest content');
	assertArtifactFilename(manifest.content.file, 'Artifact manifest content.file');

	if (manifest.featuredImage !== null) {
		if (typeof manifest.featuredImage !== 'object' || Array.isArray(manifest.featuredImage)) {
			throw new CliError('Artifact manifest featuredImage must be an object or null.');
		}
		assertOnlyKeys(manifest.featuredImage, ['file', 'sha256', 'mimeType', 'basename', 'alt', 'caption', 'title'], 'Artifact manifest featuredImage');
		const image = manifest.featuredImage;
		assertArtifactFilename(image.file, 'Artifact manifest featuredImage.file');
		if (!SHA256_PATTERN.test(image.sha256)) throw new CliError('Artifact manifest featuredImage.sha256 must be a lowercase hex SHA-256 digest.');
		const allowedExtensions = MIME_EXTENSIONS[image.mimeType];
		if (!allowedExtensions) throw new CliError(`Artifact manifest featuredImage.mimeType is unsupported: ${image.mimeType}`);
		if (!allowedExtensions.includes(extname(image.file).toLowerCase())) {
			throw new CliError(`Artifact manifest featuredImage.file extension does not match mimeType ${image.mimeType}: ${image.file}`);
		}
		for (const field of ['basename', 'alt', 'caption', 'title']) {
			if (typeof image[field] !== 'string') throw new CliError(`Artifact manifest featuredImage.${field} must be a string.`);
		}
		if (!image.basename.trim()) throw new CliError('Artifact manifest featuredImage.basename must not be empty.');
	}

	if (!manifest.metadata || typeof manifest.metadata !== 'object' || Array.isArray(manifest.metadata)) {
		throw new CliError('Artifact manifest metadata must be an object.');
	}
	for (const [key, value] of Object.entries(manifest.metadata)) {
		if (!item.metadata.includes(key)) {
			throw new CliError(`Artifact manifest metadata key "${key}" is not allowlisted for "${contentKey}".`);
		}
		if (typeof value !== METADATA_VALUE_TYPE) throw new CliError(`Artifact manifest metadata "${key}" must be a string.`);
	}

	if (manifest.baselineHash !== null && !SHA256_PATTERN.test(manifest.baselineHash)) {
		throw new CliError('Artifact manifest baselineHash must be null or a lowercase hex SHA-256 digest.');
	}
}

function assertWithinDirectory(directory, filename, label) {
	const resolved = resolve(directory, filename);
	const fromDirectory = relative(directory, resolved);
	if (!fromDirectory || fromDirectory.startsWith(`..${sep}`) || fromDirectory === '..') {
		throw new CliError(`${label} escapes its artifact directory: ${filename}`);
	}
	return resolved;
}

// Validates that files referenced by a manifest exist on disk and match
// their declared hashes. Requires `validateManifestShape` to have passed.
export function validateArtifactFiles(manifest, artifactDirAbsolute) {
	const contentPath = assertWithinDirectory(artifactDirAbsolute, manifest.content.file, 'Artifact manifest content.file');
	if (!existsSync(contentPath)) throw new CliError(`Artifact content file is missing: ${contentPath}`);

	if (manifest.featuredImage) {
		const imagePath = assertWithinDirectory(artifactDirAbsolute, manifest.featuredImage.file, 'Artifact manifest featuredImage.file');
		if (!existsSync(imagePath)) throw new CliError(`Artifact featured image file is missing: ${imagePath}`);
		const actualSha256 = computeSha256(readFileSync(imagePath));
		if (actualSha256 !== manifest.featuredImage.sha256) {
			throw new CliError(`Artifact featured image sha256 mismatch for ${imagePath}: declared ${manifest.featuredImage.sha256}, computed ${actualSha256}`);
		}
	}
}

export function assertUrlsTokenized(text, siteUrls, label) {
	for (const url of siteUrls) {
		const bare = url.endsWith('/') ? url.slice(0, -1) : url;
		if (bare && text.includes(bare)) {
			throw new CliError(`${label} contains an untokenized environment URL: ${bare}`);
		}
	}
}

// Reads an existing artifact directory, if any. Returns null when no
// manifest has been exported yet for this content key.
export function readExistingArtifact(artifactDirAbsolute) {
	const manifestPath = resolve(artifactDirAbsolute, 'manifest.json');
	if (!existsSync(manifestPath)) return null;
	const manifest = parseJsonNoDuplicateKeys(readFileSync(manifestPath, 'utf8'), { label: 'artifact manifest.json' });
	return { manifest, manifestPath };
}

function serializeManifest(manifest) {
	const ordered = {};
	for (const field of TOP_LEVEL_FIELDS) ordered[field] = manifest[field];
	return `${JSON.stringify(ordered, null, 2)}\n`;
}

function writeFileAtomic(path, data) {
	const temporaryPath = `${path}.tmp-${process.pid}`;
	writeFileSync(temporaryPath, data);
	renameSync(temporaryPath, path);
}

// Writes manifest.json, the content file, and an optional featured image
// atomically, so a crash mid-write cannot leave a half-updated artifact.
export function writeArtifact(artifactDirAbsolute, { manifest, contentText, featuredImageBytes }) {
	mkdirSync(artifactDirAbsolute, { recursive: true });
	writeFileAtomic(resolve(artifactDirAbsolute, manifest.content.file), contentText);
	if (manifest.featuredImage && featuredImageBytes) {
		writeFileAtomic(resolve(artifactDirAbsolute, manifest.featuredImage.file), featuredImageBytes);
	}
	writeFileAtomic(resolve(artifactDirAbsolute, 'manifest.json'), serializeManifest(manifest));
}

export function mimeTypeForExtension(filename) {
	const extension = extname(filename).toLowerCase();
	for (const [mimeType, extensions] of Object.entries(MIME_EXTENSIONS)) {
		if (extensions.includes(extension)) return mimeType;
	}
	return undefined;
}

export { computeSha256 };

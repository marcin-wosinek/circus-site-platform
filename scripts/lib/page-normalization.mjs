import { createHash } from 'node:crypto';

export const SITE_URL_TOKEN = '{{SITE_URL}}';

function withoutTrailingSlash(url) {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Replaces every occurrence of `siteUrl` (with or without a trailing slash)
// with the site-URL token, so exported artifacts and their hashes never carry
// an environment-specific host.
export function tokenizeSiteUrl(text, siteUrl) {
	const bare = withoutTrailingSlash(siteUrl);
	return text.split(`${bare}/`).join(`${SITE_URL_TOKEN}/`).split(bare).join(SITE_URL_TOKEN);
}

// Inverse of `tokenizeSiteUrl`, used when materializing an artifact against a
// concrete destination URL.
export function materializeSiteUrl(text, siteUrl) {
	return text.split(SITE_URL_TOKEN).join(withoutTrailingSlash(siteUrl));
}

function stableStringify(value) {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	if (value && typeof value === 'object') {
		const keys = Object.keys(value).sort();
		return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
	}
	return JSON.stringify(value);
}

// Builds the canonical representation used for hashing a page's managed
// state. Only explicit, allowlisted fields participate; WordPress IDs, GUIDs,
// timestamps, revisions, and caches must never be passed in.
export function canonicalizePageState({ contentKey, type, title, slug, status, template, content, featuredImage, metadata }) {
	const sortedMetadata = Object.fromEntries(Object.entries(metadata ?? {}).sort(([a], [b]) => a.localeCompare(b)));
	return {
		contentKey,
		type,
		title,
		slug,
		status,
		template: template ?? '',
		content,
		featuredImage: featuredImage
			? {
					sha256: featuredImage.sha256,
					mimeType: featuredImage.mimeType,
					alt: featuredImage.alt ?? '',
					caption: featuredImage.caption ?? '',
					title: featuredImage.title ?? '',
				}
			: null,
		metadata: sortedMetadata,
	};
}

export function hashPageState(canonicalState) {
	return createHash('sha256').update(stableStringify(canonicalState)).digest('hex');
}

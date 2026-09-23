import { CliError } from './cli-error.mjs';

export const siteFingerprintPhp = [
	'$front_page_id = (int) get_option("page_on_front");',
	'echo wp_json_encode([',
	'	"blogname" => (string) get_option("blogname"),',
	'	"stylesheet" => (string) get_option("stylesheet"),',
	'	"template" => (string) get_option("template"),',
	'	"show_on_front" => (string) get_option("show_on_front"),',
	'	"page_on_front" => $front_page_id,',
	'	"front_page_status" => $front_page_id ? (string) get_post_status($front_page_id) : "",',
	'	"published_pages" => (int) wp_count_posts("page")->publish,',
	']);',
].join(' ');

export function parseSiteFingerprint(output, source) {
	for (const line of output.split(/\r?\n/)) {
		try {
			const fingerprint = JSON.parse(line);
			if (fingerprint && typeof fingerprint === 'object' && !Array.isArray(fingerprint)) return fingerprint;
		} catch {
			// WP-CLI wrappers and PHP may print status or warning lines around JSON.
		}
	}
	throw new CliError(`${source} did not return a valid site fingerprint.`);
}

export function verifyConfiguredTheme(fingerprint, themeSlug, siteId) {
	if (fingerprint.stylesheet !== themeSlug) {
		throw new CliError(
			`Production uses theme "${fingerprint.stylesheet}", but site "${siteId}" configures "${themeSlug}" in .wp-env.json.`,
		);
	}
}

export function verifyImportedSite(production, local, siteId) {
	const differences = Object.keys(production)
		.filter((key) => JSON.stringify(production[key]) !== JSON.stringify(local[key]))
		.map((key) => `${key}: production=${JSON.stringify(production[key])}, local=${JSON.stringify(local[key])}`);
	if (differences.length) {
		throw new CliError(`Local verification failed for "${siteId}":\n- ${differences.join('\n- ')}`);
	}
}

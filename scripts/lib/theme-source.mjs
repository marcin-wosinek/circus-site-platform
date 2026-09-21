import { CliError } from './cli-error.mjs';

export function themeSlugFromSource(source) {
	const pathname = URL.canParse(source) ? new URL(source).pathname : source;
	const basename = pathname.replace(/\/$/, '').split('/').filter(Boolean).at(-1);
	const slug = basename?.replace(/\.zip$/, '');
	if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
		throw new CliError(`Cannot derive a theme slug from ${source}.`);
	}
	return slug;
}

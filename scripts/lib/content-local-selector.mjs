import { CliError } from './cli-error.mjs';
import { runWpCliJson, runWpCliText } from './wp-cli.mjs';

// Explicit statuses also resolve drafts in singular slug/path queries.
export function resolvePostId(projectDir, item, siteId, { readJson = runWpCliJson, readText = runWpCliText } = {}) {
	if (item.selector.type === 'page_on_front') {
		const pageId = readText(projectDir, ['option', 'get', 'page_on_front']);
		if (!pageId || pageId === '0') {
			throw new CliError(`Site "${siteId}" has no static front page configured (page_on_front is unset).`);
		}
		return pageId;
	}

	if (item.selector.type === 'page_path') {
		const pagePath = item.selector.path.replace(/^\//, '').replace(/\/$/, '');
		const matches = readJson(projectDir, [
			'post', 'list', '--post_type=page', `--post_status=${item.allowedStatuses.join(',')}`, `--pagename=${pagePath}`, '--fields=ID', '--format=json',
		]);
		if (matches.length !== 1) {
			throw new CliError(`Site "${siteId}" page path "${item.selector.path}" resolved to ${matches.length} pages; expected exactly one.`);
		}
		return String(matches[0].ID);
	}

	if (item.selector.type === 'post_path') {
		const slug = item.selector.path.split('/').filter(Boolean).at(-1);
		const matches = readJson(projectDir, [
			'post', 'list', `--post_type=${item.type}`, `--post_status=${item.allowedStatuses.join(',')}`, `--name=${slug}`, '--fields=ID', '--format=json',
		]);
		if (matches.length !== 1) {
			throw new CliError(`Site "${siteId}" ${item.type} path "${item.selector.path}" resolved to ${matches.length} posts; expected exactly one.`);
		}
		return String(matches[0].ID);
	}

	throw new CliError(`Unsupported selector type: ${item.selector.type}`);
}


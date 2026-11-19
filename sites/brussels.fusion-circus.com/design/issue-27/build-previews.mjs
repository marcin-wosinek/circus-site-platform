#!/usr/bin/env node
// Issue #27: build local-only hero preview pages in the Brussels wp-env site.
//
//   node sites/brussels.fusion-circus.com/design/issue-27/build-previews.mjs [--remove]
//
// Source: the six local pages listed below (read-only). Destination: local
// pages /issue-27-<alt>-<key>/ (created or updated; rerunnable). --remove
// deletes only pages carrying the _issue_27_preview marker. Never touches
// production.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = join(here, '..', '..');

export const PAGES = [
	{ key: 'home', path: '/' },
	{ key: 'bodywork', path: '/personalised-bodywork-brussels/' },
	{ key: 'thai', path: '/thai-yoga-massage-brussels/' },
	{ key: 'kobido', path: '/kobido-massage-brussels/' },
	{ key: 'vouchers', path: '/massage-gift-vouchers/' },
	{ key: 'relax', path: '/relax-together/' },
];
export const ALTERNATIVES = ['stack', 'scrim', 'fade', 'rec'];

function wp(args, input) {
	return execFileSync('npx', ['@wordpress/env', 'run', 'cli', 'wp', ...args], {
		cwd: siteDir,
		input,
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'pipe'],
	}).trim();
}

function pageId(path) {
	if (path === '/') {
		return wp(['option', 'get', 'page_on_front']);
	}
	return wp(['post', 'list', '--post_type=page', `--name=${path.replaceAll('/', '')}`, '--field=ID']);
}

if (process.argv.includes('--remove')) {
	const ids = wp(['post', 'list', '--post_type=page', '--meta_key=_issue_27_preview', '--field=ID', '--format=ids']);
	if (ids) {
		console.log(wp(['post', 'delete', ...ids.split(/\s+/), '--force']));
	}
	process.exit(0);
}

const php = readFileSync(join(here, 'build-previews.php'), 'utf8');
const css = Buffer.from(readFileSync(join(here, 'previews.css'), 'utf8')).toString('base64');

for (const { key, path } of PAGES) {
	const id = pageId(path);
	if (!/^\d+$/.test(id)) {
		throw new Error(`brussels.fusion-circus.com: no local page for ${path} (got "${id}")`);
	}
	for (const alt of ALTERNATIVES) {
		const out = wp(['eval-file', '-', id, key, alt, css], php);
		console.log(`${key}/${alt}: ${out.split('\n').filter((l) => l.startsWith('/')).pop()}`);
	}
}

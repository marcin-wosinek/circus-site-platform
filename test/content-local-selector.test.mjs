import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePostId } from '../scripts/lib/content-local-selector.mjs';

for (const [type, selector, filter] of [
	['fair_event', { type: 'post_path', path: '/fair-events/festival-de-conexion/' }, '--name=festival-de-conexion'],
	['page', { type: 'page_path', path: '/parent/draft-page/' }, '--pagename=parent/draft-page'],
]) {
	test(`local ${selector.type} lookup explicitly includes drafts`, () => {
		const item = { type, selector, allowedStatuses: ['draft', 'publish'] };
		const readJson = (directory, args) => {
			assert.equal(directory, '/local');
			assert.ok(args.includes(`--post_type=${type}`));
			assert.ok(args.includes(filter));
			// Singular WordPress queries can omit drafts with post_status=any.
			return args.includes('--post_status=draft,publish') ? [{ ID: 1087 }] : [];
		};
		assert.equal(resolvePostId('/local', item, 'example.test', { readJson }), '1087');
	});

	test(`local ${selector.type} lookup rejects missing and ambiguous matches`, () => {
		const item = { type, selector, allowedStatuses: ['publish'] };
		for (const matches of [[], [{ ID: 1 }, { ID: 2 }]]) {
			assert.throws(() => resolvePostId('/local', item, 'example.test', {
				readJson: (directory, args) => {
					assert.ok(args.includes('--post_status=publish'));
					return matches;
				},
			}), /expected exactly one/);
		}
	});
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { productionPermalinkPath } from '../scripts/lib/content-production-path.mjs';
import { resolveProductionMatch } from '../scripts/lib/content-plan.mjs';

const phpAvailable = spawnSync('php', ['--version']).status === 0;

test('draft path lookup uses the sample permalink without changing post status', { skip: !phpAvailable }, () => {
	const readText = (_ssh, _path, [, php]) => {
		// Preload the include so require_once is a no-op in this PHP fixture.
		const fixture = `define('ABSPATH', '');
class WP_CLI { static function error($message) { throw new Exception($message); } }
$post = (object) ['ID'=>1087, 'post_status'=>'draft'];
function get_post($id) { return $GLOBALS['post']; }
function get_sample_permalink($post) { return ['https://example.com/fair-events/%pagename%/', 'festival']; }
function get_permalink($post) { throw new Exception('Draft preview URL must not be used'); }
`;
		const result = spawnSync('php', ['-r', fixture + php.replace("require_once ABSPATH . 'wp-admin/includes/post.php';", '') + '\nif ($post->post_status !== "draft") throw new Exception("Status changed");'], { encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
		return result.stdout;
	};
	const path = productionPermalinkPath([], '/', '1087', readText);
	assert.equal(path, '/fair-events/festival');
	assert.deepEqual(resolveProductionMatch({ markerMatches: [{ id: '1087', status: 'draft' }], contentKey: 'festival', selectorType: 'post_path', markerAtPath: path === '/fair-events/festival', pathMatches: [{ id: '1087', status: 'draft' }] }), { outcome: 'matched', postId: '1087' });
});

test('draft path resolution retains mismatch, duplicate-path and trash guards', () => {
	const base = { markerMatches: [{ id: '1087', status: 'draft' }], contentKey: 'festival', selectorType: 'post_path' };
	assert.equal(resolveProductionMatch({ ...base, markerAtPath: false }).outcome, 'conflict');
	assert.equal(resolveProductionMatch({ ...base, pathMatches: [{ id: '222', status: 'publish' }] }).outcome, 'conflict');
	assert.equal(resolveProductionMatch({ ...base, markerMatches: [{ id: '1087', status: 'trash' }] }).outcome, 'conflict');
});

test('production path lookup rejects unsafe IDs and malformed permalink responses', () => {
	assert.throws(() => productionPermalinkPath([], '/', '1;bad', () => assert.fail()), /invalid post ID/);
	assert.throws(() => productionPermalinkPath([], '/', '1087', () => 'not a URL'), /invalid permalink/);
});

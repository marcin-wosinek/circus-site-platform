import { CliError } from './cli-error.mjs';
import { runRemoteWpCliText } from './remote-wp-cli.mjs';

// WordPress gives drafts query-string preview URLs. Its sample-permalink API
// resolves the intended rewrite path without saving or publishing the post.
export function productionPermalinkPath(sshArgs, remotePath, id, readText = runRemoteWpCliText) {
	if (!/^[1-9]\d*$/.test(String(id))) throw new CliError('Production path lookup returned an invalid post ID.');
	const php = `$post = get_post(${id});
if (!$post) { WP_CLI::error('Production post not found.'); }
if (in_array($post->post_status, array('draft', 'pending', 'future'), true)) {
  require_once ABSPATH . 'wp-admin/includes/post.php';
  list($link, $slug) = get_sample_permalink($post);
  echo str_replace(array('%pagename%', '%postname%'), $slug, $link);
} else {
  echo get_permalink($post);
}`;
	const permalink = readText(sshArgs, remotePath, ['eval', php]);
	try { return new URL(permalink).pathname.replace(/\/$/, ''); } catch { throw new CliError(`Production post ${id} has an invalid permalink.`); }
}

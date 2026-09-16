import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';
import { shellQuote } from './shell.mjs';

// The PHP program is fixed locally. Data travels on stdin, never through a
// shell argument or a command log. WordPress APIs handle slashing and metadata.
function runPhp(sshArgs, remotePath, php, payload) {
	const command = `wp --path=${shellQuote(remotePath)} eval ${shellQuote(php)}`;
	const result = spawnSync('ssh', [...sshArgs, command], { input: JSON.stringify(payload), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
	if (result.error || result.status !== 0) throw new CliError(`Production WordPress operation failed (${result.error?.message ?? result.status}).`);
	try { return JSON.parse(result.stdout.trim()); } catch { throw new CliError('Production WordPress operation returned invalid JSON.'); }
}

const mediaPhp = String.raw`
$data = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$ids = get_posts(['post_type'=>'attachment','post_status'=>'inherit','numberposts'=>-1,'fields'=>'ids']);
$matches = [];
foreach ($ids as $id) {
  $file = get_attached_file($id);
  if ($file && is_file($file) && hash_file('sha256', $file) === $data['sha256']) $matches[] = (int) $id;
}
if (count($matches) > 1) { fwrite(STDERR, 'Ambiguous media bytes'); exit(2); }
if ($matches) {
  $existing = get_post($matches[0]);
  $alt = get_post_meta($matches[0], '_wp_attachment_image_alt', true);
  if ($existing->post_mime_type !== $data['mimeType'] || $existing->post_title !== $data['title'] || $existing->post_excerpt !== $data['caption'] || $alt !== $data['alt']) { fwrite(STDERR, 'Matching image bytes have different managed metadata'); exit(2); }
  echo wp_json_encode(['id'=>$matches[0], 'uploaded'=>false]); return;
}
$bytes = base64_decode($data['bytes'], true);
if ($bytes === false || hash('sha256', $bytes) !== $data['sha256']) { fwrite(STDERR, 'Invalid image bytes'); exit(2); }
$upload = wp_upload_bits($data['basename'], null, $bytes);
if ($upload['error']) { fwrite(STDERR, 'Image upload failed'); exit(2); }
$id = wp_insert_attachment(['post_mime_type'=>$data['mimeType'],'post_title'=>$data['title'],'post_excerpt'=>$data['caption'],'post_status'=>'inherit'], $upload['file']);
if (is_wp_error($id) || !$id) { fwrite(STDERR, 'Attachment creation failed'); exit(2); }
update_post_meta($id, '_wp_attachment_image_alt', $data['alt']);
update_post_meta($id, '_circus_media_sha256', $data['sha256']);
echo wp_json_encode(['id'=>(int)$id, 'uploaded'=>true]);`;

export function ensureProductionMedia(sshArgs, remotePath, image, bytes) {
	return runPhp(sshArgs, remotePath, mediaPhp, { ...image, bytes: bytes.toString('base64') });
}

const inlineImagePhp = String.raw`
$data = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$uploads = wp_get_upload_dir();
$base = realpath($uploads['basedir']);
if (!$base || !preg_match('~^[^/]+(?:/[^/]+)+$~', $data['path']) || in_array('..', explode('/', $data['path']), true)) { fwrite(STDERR, 'Unsafe upload path'); exit(2); }
$path = $base . '/' . $data['path'];
if (is_file($path)) {
  $hash = hash_file('sha256', $path);
  echo wp_json_encode(['status'=>$hash === $data['sha256'] ? 'exists' : 'conflict']); return;
}
if (file_exists($path)) { echo wp_json_encode(['status'=>'conflict']); return; }
if (!$data['write']) { echo wp_json_encode(['status'=>'missing']); return; }
$bytes = base64_decode($data['bytes'], true);
if ($bytes === false || hash('sha256', $bytes) !== $data['sha256']) { fwrite(STDERR, 'Invalid inline image bytes'); exit(2); }
$directory = dirname($path);
if (!wp_mkdir_p($directory) || realpath($directory) !== $base . '/' . dirname($data['path'])) { fwrite(STDERR, 'Unsafe upload directory'); exit(2); }
$handle = fopen($path, 'x');
if (!$handle) { fwrite(STDERR, 'Inline image appeared during upload'); exit(2); }
$written = fwrite($handle, $bytes);
fclose($handle);
if ($written !== strlen($bytes) || hash_file('sha256', $path) !== $data['sha256']) { fwrite(STDERR, 'Inline image upload failed'); exit(2); }
echo wp_json_encode(['status'=>'uploaded']);`;

export function inspectProductionInlineImage(sshArgs, remotePath, image) {
	return runPhp(sshArgs, remotePath, inlineImagePhp, { path: image.path, sha256: image.sha256, write: false });
}

export function ensureProductionInlineImage(sshArgs, remotePath, image, bytes) {
	return runPhp(sshArgs, remotePath, inlineImagePhp, { path: image.path, sha256: image.sha256, write: true, bytes: bytes.toString('base64') });
}

const postPhp = String.raw`
$data = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$fields = $data['fields'];
$fields['post_content'] = wp_slash($fields['post_content']);
$fields['post_title'] = wp_slash($fields['post_title']);
if ($data['postId']) {
  $existing = get_post($data['postId']);
  if (!$existing || $existing->post_status === 'trash' || $existing->post_type !== $fields['post_type']) { fwrite(STDERR, 'Post identity changed'); exit(2); }
  $fields['ID'] = $data['postId'];
  $id = wp_update_post($fields, true);
} else {
  $id = wp_insert_post($fields, true);
}
if (is_wp_error($id) || !$id) { fwrite(STDERR, 'Post write failed'); exit(2); }
update_post_meta($id, '_circus_content_key', $data['contentKey']);
update_post_meta($id, '_wp_page_template', $data['template']);
foreach ($data['metadata'] as $key => $value) update_post_meta($id, $key, wp_slash($value));
if ($data['thumbnailId']) set_post_thumbnail($id, $data['thumbnailId']);
else delete_post_thumbnail($id);
echo wp_json_encode(['id'=>(int)$id]);`;

export function writeProductionPost(sshArgs, remotePath, { postId, contentKey, manifest, content, thumbnailId }) {
	return runPhp(sshArgs, remotePath, postPhp, {
		postId: postId ? Number(postId) : null, contentKey, template: manifest.template,
		metadata: manifest.metadata, thumbnailId: thumbnailId ? Number(thumbnailId) : null,
		fields: { post_type: manifest.type, post_title: manifest.title, post_name: manifest.slug, post_status: manifest.status, post_content: content },
	});
}

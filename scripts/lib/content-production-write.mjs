import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';
import { mimeTypeForExtension } from './content-artifact.mjs';
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
global $wpdb;
$uploads = wp_get_upload_dir();
$base = realpath($uploads['basedir']);
$relative = $data['path'];
$parts = explode('/', $relative);
if (!$base || preg_match('~[\\\\\x00-\x1f\x7f]|^[a-z]:~i', $relative) || array_intersect($parts, ['', '.', '..'])) {
  throw new Exception('Unsafe inline image path');
}
$path = $base . '/' . $relative;
$lock = hash('sha256', $path);
if ($data['write'] && (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 10)', $lock)) !== 1) {
  throw new Exception('Could not lock inline image path');
}
try {
  $component = $base;
  foreach ($parts as $part) {
    $component .= '/' . $part;
    if (is_link($component)) throw new Exception('Symlinked inline image path');
  }
  $present = is_file($path);
  if (($present && hash_file('sha256', $path) !== $data['sha256']) || (!$present && file_exists($path))) {
    echo wp_json_encode(['status'=>'conflict']); return;
  }

  // A packaged path can be a generated size of a photo already in the library.
  $filename = basename($relative);
  $candidates = $wpdb->get_results($wpdb->prepare(
    "SELECT DISTINCT p.ID, p.post_status FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id = p.ID
      WHERE p.post_type = 'attachment' AND ((m.meta_key = '_wp_attached_file' AND m.meta_value = %s)
      OR (m.meta_key = '_wp_attachment_metadata' AND m.meta_value LIKE %s))",
    $relative, '%' . $wpdb->esc_like('"' . $filename . '"') . '%'
  ));
  if ($wpdb->last_error) throw new Exception('Inline image attachment lookup failed');
  $attachment = null;
  foreach ($candidates as $candidate) {
    $attached = (string) get_post_meta($candidate->ID, '_wp_attached_file', true);
    $metadata = wp_get_attachment_metadata($candidate->ID, true);
    $sizes = array_column($metadata['sizes'] ?? [], 'file');
    $sizes[] = $metadata['original_image'] ?? null;
    if ($attached !== $relative && (dirname($attached) !== dirname($relative) || !in_array($filename, $sizes, true))) continue;
    if ($attachment || $candidate->post_status !== 'inherit') {
      echo wp_json_encode(['status'=>'conflict', 'reason'=>'attachment is ambiguous or unavailable']); return;
    }
    $attachment = (int) $candidate->ID;
  }
  if ($present && $attachment) { echo wp_json_encode(['status'=>'exists']); return; }
  if (!$data['write']) { echo wp_json_encode(['status'=>$present ? 'unregistered' : 'missing']); return; }

  require_once ABSPATH . 'wp-admin/includes/image.php';
  $source = $path;
  $temporary = null;
  try {
    if (!$present) {
      $bytes = base64_decode($data['bytes'], true);
      if ($bytes === false || hash('sha256', $bytes) !== $data['sha256']) throw new Exception('Invalid inline image bytes');
      $directory = dirname($path);
      if (!wp_mkdir_p($directory) || realpath($directory) !== $directory) throw new Exception('Unsafe upload directory');
      $temporary = tempnam($directory, '.circus-image-');
      if ($temporary === false || file_put_contents($temporary, $bytes) !== strlen($bytes)) throw new Exception('Inline image upload failed');
      $source = $temporary;
    }
    $dimensions = wp_getimagesize($source);
    if (!$dimensions || $dimensions['mime'] !== $data['mimeType']) throw new Exception('Inline image type does not match its path');
    if (!$present && (!chmod($source, fileperms(dirname($path)) & 0666) || !link($source, $path))) {
      throw new Exception('Could not place inline image without overwriting');
    }
  } finally {
    if ($temporary) unlink($temporary);
  }
  if (!$attachment) {
    $attachment = wp_insert_attachment([
      'post_mime_type'=>$data['mimeType'],
      'post_title'=>sanitize_text_field(pathinfo($filename, PATHINFO_FILENAME)),
      'post_status'=>'inherit',
      'guid'=>trailingslashit($uploads['baseurl']) . implode('/', array_map('rawurlencode', $parts)),
    ], $path, 0, true);
    if (is_wp_error($attachment) || !$attachment) throw new Exception('Inline image attachment creation failed');
    // Use the packaged file as the full-size image and preserve its bytes.
    wp_update_attachment_metadata($attachment, [
      'file'=>$relative, 'width'=>$dimensions[0], 'height'=>$dimensions[1],
      'filesize'=>filesize($path), 'sizes'=>[],
    ]);
    if (get_post_meta($attachment, '_wp_attached_file', true) !== $relative) throw new Exception('Inline image attachment path verification failed');
  }
  echo wp_json_encode(['status'=>$present ? 'registered' : 'uploaded']);
} finally {
  if ($data['write']) $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock));
}`;

export function inspectProductionInlineImage(sshArgs, remotePath, image) {
	return runPhp(sshArgs, remotePath, inlineImagePhp, { path: image.path, sha256: image.sha256, write: false });
}

export function ensureProductionInlineImage(sshArgs, remotePath, image, bytes) {
	return runPhp(sshArgs, remotePath, inlineImagePhp, { path: image.path, sha256: image.sha256, mimeType: mimeTypeForExtension(image.path), write: true, bytes: bytes.toString('base64') });
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

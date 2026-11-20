import { spawnSync } from 'node:child_process';
import { CliError } from './cli-error.mjs';
import { shellQuote } from './shell.mjs';
import { validateUploadEntry } from './upload-provenance.mjs';
import { isUploadReference } from './upload-path.mjs';
import { parseJsonNoDuplicateKeys } from './strict-json.mjs';

export const uploadReferencePhp = String.raw`
$data = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$uploads = wp_get_upload_dir();
$base = realpath($uploads['basedir']);
if (!$base || is_link($uploads['basedir']) || !is_dir($base) || !is_readable($base)) throw new Exception('Uploads directory unavailable');
$path = $data['path'];
if (!is_string($path) || preg_match('~[\\\\\x00-\x1f\x7f]|^[a-z]:~i', $path) || !preg_match('~\.(pdf|mp4|webm)$~i', $path)) throw new Exception('Unsafe reference');
$parts = explode('/', $path);
$current = $base;
foreach ($parts as $index => $part) {
  if ($part === '' || $part === '.' || $part === '..') throw new Exception('Unsafe reference');
  if (!is_dir($current) || !is_readable($current) || !is_executable($current)) throw new Exception('Upload directory inaccessible');
  $current .= '/' . $part;
  if (is_link($current)) throw new Exception('Symlinked upload');
  if (!file_exists($current)) { echo wp_json_encode(['status'=>'missing']); return; }
  $real = realpath($current);
  if (!$real || strpos($real, $base . '/') !== 0) throw new Exception('Upload outside uploads');
}
if (!is_file($current) || !is_readable($current)) throw new Exception('Upload is not a readable regular file');
$hash = hash_file('sha256', $current);
$size = filesize($current);
if ($hash === false || $size === false) throw new Exception('Upload inspection failed');
echo wp_json_encode(['status'=>'present', 'sha256'=>$hash, 'size'=>$size]);`;

export function parseUploadInspection(text, entry) {
	let result;
	try { result = parseJsonNoDuplicateKeys(text, { label: 'production upload inspection' }); }
	catch { throw new CliError('Production upload inspection returned invalid JSON.'); }
	if (result && Object.keys(result).sort().join() === 'status' && result.status === 'missing') return { status: 'missing' };
	if (!result || Object.keys(result).sort().join() !== 'sha256,size,status' || result.status !== 'present') throw new CliError('Invalid production upload inspection response.');
	validateUploadEntry({ path: entry.path, sha256: result.sha256, size: result.size });
	return { status: result.sha256 === entry.sha256 && result.size === entry.size ? 'matching' : 'mismatched' };
}
export function inspectProductionUploadReference(sshArgs, remotePath, entry) {
	validateUploadEntry(entry);
	if (!isUploadReference(entry.path)) throw new CliError(`Unsupported reference: ${entry.path}`);
	const command = `wp --path=${shellQuote(remotePath)} eval ${shellQuote(uploadReferencePhp)}`;
	const result = spawnSync('ssh', [...sshArgs, command], { input: JSON.stringify({ path: entry.path }), encoding: 'utf8', maxBuffer: 1024 * 1024 });
	if (result.error || result.status !== 0) throw new CliError(`Production upload inspection failed (${result.error?.message ?? result.status}).`);
	return parseUploadInspection(result.stdout.trim(), entry);
}
export function referenceConflict(manifest, { siteId, inspect }) {
	const failures = [];
	for (const entry of manifest.uploadReferences ?? []) {
		try {
			const result = inspect(entry);
			if (result.status !== 'matching') failures.push(`${siteId}/${manifest.contentKey}: ${entry.path}: production upload ${result.status}`);
		} catch (error) { throw new CliError(`${siteId}/${manifest.contentKey}: ${entry.path}: ${error.message}`); }
	}
	return failures.length ? failures.join('; ') : null;
}

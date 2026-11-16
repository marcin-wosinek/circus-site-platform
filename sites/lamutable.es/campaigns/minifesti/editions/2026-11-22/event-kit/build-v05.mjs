import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'v05');
if (existsSync(out)) throw Error('Preserving v05; create a new version.');
const env = { ...process.env, FONTCONFIG_FILE: resolve(here, '../../../templates/v03/fontconfig.xml') };
const magick = (args, input) => execFileSync('magick', args, { env, input, maxBuffer: 32 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(here, 'v04/manifest.json')));
cpSync(resolve(here, 'v04'), out, { recursive: true });
const ids = [...new Set(manifest.outputs.map(item => item.file.split('/')[0]))];
for (const id of ids) {
  for (const channel of ['instagram', 'whatsapp']) {
    const path = resolve(out, id, channel);
    let photos = 0;
    const svg = readFileSync(path + '.svg', 'utf8').replace(/<image\b[^>]*\/>/g, tag => {
      // Every card has four photographs followed by the original, uncropped logo.
      if (photos++ >= 4) return tag;
      const width = /\bwidth="(\d+)"/.exec(tag)[1];
      const height = /\bheight="(\d+)"/.exec(tag)[1];
      const data = /data:image\/[^;]+;base64,([^"]+)/.exec(tag);
      if (!data) throw Error(`Missing embedded photograph: ${id}/${channel}`);
      const size = `${width}x${height}`;
      // Bake the proportional cover crop into the embedded photo so SVG viewers
      // and ImageMagick render the same full frame without stretching the image.
      const crop = magick(['-', '-fuzz', '5%', '-trim', '+repage', '-resize', size + '^', '-gravity', 'center', '-extent', size, 'jpeg:-'], Buffer.from(data[1], 'base64'));
      if (magick(['-', '-format', '%wx%h', 'info:'], crop).toString() !== size) throw Error('Incorrect crop size');
      return tag.replace(data[0], `data:image/jpeg;base64,${crop.toString('base64')}`);
    });
    if (photos !== 5) throw Error(`Expected four photos and one logo: ${id}/${channel}`);
    writeFileSync(path + '.svg', svg);
    magick(['-background', '#F9E9D4', 'MSVG:' + path + '.svg', path + '.png']);
    const expected = channel === 'instagram' ? '1080 1350' : '1080 1920';
    if (magick([path + '.png', '-format', '%w %h', 'info:']).toString() !== expected) throw Error('Incorrect output size');
    manifest.outputs.find(item => item.file === `${id}/${channel}.png`).sha256 = sha(readFileSync(path + '.png'));
  }
}
manifest.revision = { base: 'v04', date: '2026-11-16', change: 'All photographs cover their frames with proportional centered crops; supporting photos have identical dimensions within each format.', builder: 'build-v05.mjs' };
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
magick(['montage', ...ids.map(id => resolve(out, id, 'instagram.png')), '-thumbnail', '324x405', '-tile', '5x1', '-geometry', '+10+10', '-background', '#F9E9D4', resolve(out, 'contact-sheet.png')]);
writeFileSync(resolve(out, 'review.md'), `# Event Kit v05 · 22 noviembre 2026

All ten Instagram and WhatsApp cards now use proportional cover crops for
all photographs. Each photo fills its entire existing frame. The three supporting
photos share a uniform frame: 334 × 162 on Instagram and 310 × 230 on WhatsApp.
Center crops are embedded at the frame dimensions for consistent SVG/PNG rendering.
Original source photos and prior kit versions remain intact. Logos, layout and
copy are retained. See ../v04/review.md for prior provenance and review status.

Reproduce from the repository root:
\`node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build-v05.mjs\`

Requires ImageMagick and existing fontconfig/fonts; refuses to overwrite v05.
All 40 photo dimensions and ten output dimensions checked during generation.
Local draft; no publishing or sending performed.
`);
console.log(`Created ${out}`);

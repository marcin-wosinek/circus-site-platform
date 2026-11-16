import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'v06');
if (existsSync(out)) throw Error('Preserving v06; create a new version.');
const env = { ...process.env, FONTCONFIG_FILE: resolve(here, '../../../templates/v03/fontconfig.xml') };
const magick = (args, input) => execFileSync('magick', args, { env, input, maxBuffer: 32 * 1024 * 1024 });
const manifest = JSON.parse(readFileSync(resolve(here, 'v05/manifest.json')));
cpSync(resolve(here, 'v05'), out, { recursive: true });
for (const id of ['thai-yoga-massage', 'dance-lift']) {
  for (const channel of ['instagram', 'whatsapp']) {
    const path = resolve(out, id, channel);
    // Use the uncropped photo: v05 has already discarded the upper pixels.
    const original = readFileSync(resolve(here, 'v04', id, channel + '.svg'), 'utf8').match(/<image\b[^>]*\/>/)[0];
    const width = /\bwidth="(\d+)"/.exec(original)[1];
    const height = /\bheight="(\d+)"/.exec(original)[1];
    const data = /data:image\/[^;]+;base64,([^"]+)/.exec(original);
    const size = `${width}x${height}`;
    const crop = magick(['-', '-fuzz', '5%', '-trim', '+repage', '-resize', size + '^', '-gravity', 'north', '-extent', size, 'jpeg:-'], Buffer.from(data[1], 'base64'));
    if (magick(['-', '-format', '%wx%h', 'info:'], crop).toString() !== size) throw Error('Incorrect crop size');
    const photo = original.replace(data[0], `data:image/jpeg;base64,${crop.toString('base64')}`);
    const svg = readFileSync(path + '.svg', 'utf8').replace(/<image\b[^>]*\/>/, photo);
    writeFileSync(path + '.svg', svg);
    magick(['-background', '#F9E9D4', 'MSVG:' + path + '.svg', path + '.png']);
    const expected = channel === 'instagram' ? '1080 1350' : '1080 1920';
    if (magick([path + '.png', '-format', '%w %h', 'info:']).toString() !== expected) throw Error('Incorrect output size');
    manifest.outputs.find(item => item.file === `${id}/${channel}.png`).sha256 = createHash('sha256').update(readFileSync(path + '.png')).digest('hex');
  }
}
manifest.revision = { base: 'v05', date: '2026-11-16', change: 'Move Thai Massage and Dance Lift featured crops to the top to preserve faces in both formats.', builder: 'build-v06.mjs' };
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const ids = [...new Set(manifest.outputs.map(item => item.file.split('/')[0]))];
magick(['montage', ...ids.map(id => resolve(out, id, 'instagram.png')), '-thumbnail', '324x405', '-tile', '5x1', '-geometry', '+10+10', '-background', '#F9E9D4', resolve(out, 'contact-sheet.png')]);
writeFileSync(resolve(out, 'review.md'), `# Event Kit v06 · 22 noviembre 2026

Thai Massage and Dance Lift featured photos now use top-aligned cover crops
in Instagram and WhatsApp to keep faces visible. Rebuilt from the uncropped
v04 embedded photos. Supporting photos and all other artwork retain v05.
Four photo dimensions and four output dimensions verified during generation.
See ../v05/review.md for provenance and review status.

Reproduce: node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build-v06.mjs
Requires ImageMagick and existing fonts. Refuses to overwrite v06.
Local draft; no publishing or sending performed.
`);
console.log(`Created ${out}`);

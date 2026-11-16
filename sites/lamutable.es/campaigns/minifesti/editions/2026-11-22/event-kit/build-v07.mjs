import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'v07');
if (existsSync(out)) throw Error('Preserving v07; create a new version.');
const env = { ...process.env, FONTCONFIG_FILE: resolve(here, '../../../templates/v03/fontconfig.xml') };
const magick = (args, input) => execFileSync('magick', args, { env, input, maxBuffer: 32 * 1024 * 1024 });
const manifest = JSON.parse(readFileSync(resolve(here, 'v06/manifest.json')));
cpSync(resolve(here, 'v06'), out, { recursive: true });
const workshops = JSON.parse(readFileSync(resolve(here, '../event.json'))).workshops;
for (const { id } of workshops) {
  for (const channel of ['instagram', 'whatsapp']) {
    const path = resolve(out, id, channel);
    const originals = [...readFileSync(resolve(here, 'v04', id, channel + '.svg'), 'utf8').matchAll(/<image\b[^>]*\/>/g)].map(match => match[0]);
    const supporting = workshops.filter(workshop => workshop.id !== id);
    let index = 0;
    const svg = readFileSync(path + '.svg', 'utf8').replace(/<image\b[^>]*\/>/g, tag => {
      const position = index++;
      if (position === 0 || position > 3 || !['thai-yoga-massage', 'dance-lift'].includes(supporting[position - 1].id)) return tag;
      const original = originals[position];
      const width = /\bwidth="(\d+)"/.exec(original)[1];
      const height = /\bheight="(\d+)"/.exec(original)[1];
      const data = /data:image\/[^;]+;base64,([^"]+)/.exec(original);
      const size = `${width}x${height}`;
      const offset = supporting[position - 1].id === 'dance-lift' ? Math.round(Number(width) * 0.18) : 0;
      const crop = magick(['-', '-fuzz', '5%', '-trim', '+repage', '-resize', size + '^', '-gravity', 'northwest', '-crop', size + '+0+' + offset, '+repage', 'jpeg:-'], Buffer.from(data[1], 'base64'));
      if (magick(['-', '-format', '%wx%h', 'info:'], crop).toString() !== size) throw Error('Incorrect crop size');
      return original.replace(data[0], `data:image/jpeg;base64,${crop.toString('base64')}`);
    });
    writeFileSync(path + '.svg', svg);
    magick(['-background', '#F9E9D4', 'MSVG:' + path + '.svg', path + '.png']);
    const expected = channel === 'instagram' ? '1080 1350' : '1080 1920';
    if (magick([path + '.png', '-format', '%w %h', 'info:']).toString() !== expected) throw Error('Incorrect output size');
    manifest.outputs.find(item => item.file === `${id}/${channel}.png`).sha256 = createHash('sha256').update(readFileSync(path + '.png')).digest('hex');
  }
}
manifest.revision = { base: 'v06', date: '2026-11-16', change: 'Move Thai Massage and Dance Lift supporting crops to the top to preserve faces in both formats.', builder: 'build-v07.mjs' };
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const ids = [...new Set(manifest.outputs.map(item => item.file.split('/')[0]))];
magick(['montage', ...ids.map(id => resolve(out, id, 'instagram.png')), '-thumbnail', '324x405', '-tile', '5x1', '-geometry', '+10+10', '-background', '#F9E9D4', resolve(out, 'contact-sheet.png')]);
writeFileSync(resolve(out, 'review.md'), `# Event Kit v07 · 22 noviembre 2026

Thai Massage and Dance Lift small supporting photos now use top-aligned cover
crops in every workshop card in Instagram and WhatsApp. Rebuilt from uncropped
v04 embedded photos. Large photos and all other artwork retain v06.
All adjusted photo dimensions and eight output dimensions verified during generation.
See ../v06/review.md for provenance and review status.

Reproduce: node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build-v07.mjs
Requires ImageMagick and existing fonts. Refuses to overwrite v07.
Local draft; no publishing or sending performed.
`);
console.log(`Created ${out}`);

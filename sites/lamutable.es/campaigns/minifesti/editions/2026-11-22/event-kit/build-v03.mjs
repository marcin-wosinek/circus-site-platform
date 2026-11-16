import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Footer-only revision of the reviewed v02 kit; retain its WhatsApp and copy.
const here = dirname(fileURLToPath(import.meta.url));
const previous = resolve(here, 'v02');
const out = resolve(here, 'v03');
if (existsSync(out)) throw Error('v03 exists; preserve it and create a new version.');
const env = { ...process.env, FONTCONFIG_FILE: resolve(here, '../../../templates/v03/fontconfig.xml') };
const magick = args => execFileSync('magick', args, { env });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(previous, 'manifest.json')));
const subjects = manifest.outputs.filter(item => item.file.endsWith('/instagram.png')).map(item => item.file.split('/')[0]);
cpSync(previous, out, { recursive: true });
for (const id of subjects) {
  const path = resolve(out, id, 'instagram');
  let svg = readFileSync(path + '.svg', 'utf8');
  const logo = svg.match(/<image id="brand-logo"[^>]*\/>/)?.[0];
  if (!logo) throw Error(`Missing logo: ${id}`);
  const footer = `<g id="event-footer">${logo.replace(/x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*"/, 'x="65" y="1210" width="40" height="75"')}
    <text id="venue" x="145" y="1236" fill="#262122" font-family="Arial" font-size="30">Samadhi · Benimaclet · València</text>
    <text id="booking" x="145" y="1278" fill="#E85E14" font-family="Arial" font-size="31">Reserva en lamutable.es</text>
  </g>`;
  svg = svg.replace(/<g id="venue"[\s\S]*?<\/g>/, '').replace(logo, '')
    .replace('La Mutable · Reserva en lamutable.es', 'La Mutable')
    .replace(/<\/svg>\s*$/, footer + '\n</svg>\n');
  writeFileSync(path + '.svg', svg);
  magick(['-background', '#F9E9D4', 'MSVG:' + path + '.svg', path + '.png']);
  if (magick([path + '.png', '-format', '%w %h', 'info:']).toString() !== '1080 1350') throw Error(`Wrong dimensions: ${id}`);
  for (const channel of ['instagram', 'whatsapp']) {
    const record = manifest.outputs.find(item => item.file === `${id}/${channel}.png`);
    record.sha256 = sha(readFileSync(resolve(out, record.file)));
  }
}
manifest.revision = { base: 'v02', change: 'Instagram footer matches WhatsApp: logo left, short venue and orange booking line.', date: '2026-11-16' };
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
magick(['montage', ...subjects.map(id => resolve(out, id, 'instagram.png')), '-thumbnail', '324x405', '-tile', '5x1', '-geometry', '+10+10', '-background', '#F9E9D4', resolve(out, 'contact-sheet.png')]);
writeFileSync(resolve(out, 'review.md'), `# Event Kit v03 · 22 noviembre 2026

Local draft for review, 16 November 2026. Based on v02; all five Instagram
footers now follow the supplied WhatsApp reference: original logo on the left,
Samadhi · Benimaclet · València above the orange Reserva en lamutable.es line.
The former address block and duplicate booking prompt above the photos were
removed. Full addresses remain in accompanying copy. Photos, event facts,
WhatsApp assets and copy are retained from v02.

Brand 0.1.2 and event accent #E85E14 retained. See ../v02/review.md for source,
font, booking and photo provenance; its review status still applies.
Five Instagram PNGs rendered at 1080 × 1350; hashes updated in manifest.json.
Contact sheet shows the five revised Instagram images. Visual approval and
photo permissions remain pending. No sending or publishing is authorized.

Reproduce from the repository root with:
node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build-v03.mjs

Requires ImageMagick and the existing fontconfig/fonts. Refuses to overwrite v03.
`);
console.log(`Updated five Instagram footers in ${out}`);

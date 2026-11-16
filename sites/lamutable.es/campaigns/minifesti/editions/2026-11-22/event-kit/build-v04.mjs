import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'v04');
if (existsSync(out)) throw Error('Preserving v04; create a new version.');
const templates = resolve(here, '../../../templates');
const middle = readFileSync(resolve(templates, 'event-kit-v04/instagram-middle.svg'), 'utf8');
const event = JSON.parse(readFileSync(resolve(here, '../event.json')));
const env = { ...process.env, FONTCONFIG_FILE: resolve(templates, 'v03/fontconfig.xml') };
const magick = args => execFileSync('magick', args, { env });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const titles = {
  'thai-yoga-massage': 'MASAJE THAI YOGA',
  'dance-lift': 'DANCE LIFT',
  'contact-improvisation': 'IMPROVISACIÓN DE CONTACTO',
  'inward-yin-yoga': 'INWARD · YIN YOGA',
};
const details = {
  'thai-yoga-massage': 'con Bart',
  'dance-lift': 'Apoyándonos en movimiento · con Emanuela y Tavi',
  'contact-improvisation': 'Corpo Sutil · con Diana Flor',
  'inward-yin-yoga': 'Meditación guiada · con Arancha',
};
const manifest = JSON.parse(readFileSync(resolve(here, 'v03/manifest.json')));
cpSync(resolve(here, 'v03'), out, { recursive: true });
for (const workshop of event.workshops) {
  const path = resolve(out, workshop.id, 'instagram');
  const values = { date: '22 NOVIEMBRE 2026', title: titles[workshop.id], titleSize: workshop.id === 'contact-improvisation' ? '64' : '76', hours: `${workshop.start}–${workshop.end}`, teacher: details[workshop.id] };
  const block = middle.replace(/\{\{(\w+)\}\}/g, (_, key) => xml(values[key]));
  for (const match of block.matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)) {
    const size = /font-size="(\d+)"/.exec(match[1])[1];
    const font = match[1].includes('font-family="Arial"') ? '/System/Library/Fonts/Supplemental/Arial.ttf' : resolve(templates, 'v03/fonts/BarlowCondensed-ExtraBold.ttf');
    const width = Number(magick(['-font', font, '-pointsize', size, `label:${match[2]}`, '-format', '%w', 'info:']).toString());
    if (width > 950) throw Error(`Text overflow: ${match[2]}`);
  }
  const source = readFileSync(path + '.svg', 'utf8');
  const svg = source.replace(/<g id="workshop-title"[\s\S]*?(?=<g id="supporting-photos")/, block + '\n  ');
  if (svg === source || svg.includes('{{')) throw Error(`Middle replacement failed: ${workshop.id}`);
  writeFileSync(path + '.svg', svg);
  magick(['-background', '#F9E9D4', 'MSVG:' + path + '.svg', path + '.png']);
  if (magick([path + '.png', '-format', '%w %h', 'info:']).toString() !== '1080 1350') throw Error('Wrong dimensions');
  manifest.outputs.find(item => item.file === `${workshop.id}/instagram.png`).sha256 = sha(readFileSync(path + '.png'));
}
manifest.revision = { base: 'v03', date: '2026-11-16', change: 'Instagram workshop middle follows WhatsApp: event name, date, smaller workshop title, time and teacher.', template: 'templates/event-kit-v04/instagram-middle.svg', templateSha256: sha(middle) };
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const ids = ['general', ...event.workshops.map(w => w.id)];
magick(['montage', ...ids.map(id => resolve(out, id, 'instagram.png')), '-thumbnail', '324x405', '-tile', '5x1', '-geometry', '+10+10', '-background', '#F9E9D4', resolve(out, 'contact-sheet.png')]);
writeFileSync(resolve(out, 'review.md'), `# Event Kit v04 · 22 noviembre 2026

Instagram workshop cards now follow the supplied WhatsApp middle hierarchy:
MINIFESTI is the largest headline, followed by the orange event date, smaller
workshop title, orange time and teacher. All four cards regenerated at 1080 × 1350
with measured text widths. Photos, v03 footer, overview, WhatsApp and copy retained.
See ../v03/review.md for prior provenance and review status.

Template: templates/event-kit-v04/instagram-middle.svg in the campaign folder.
Reproduce from repository root:
\`node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build-v04.mjs\`
Requires ImageMagick and existing v03 fonts; refuses to overwrite v04.
Local draft; no publishing or sending performed.
`);
console.log(`Created ${out}`);

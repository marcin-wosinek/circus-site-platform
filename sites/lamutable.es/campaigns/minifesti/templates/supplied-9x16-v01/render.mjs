import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const edition = resolve(here, '../../editions/2026-11-22');
const composition = resolve(edition, 'compositions/supplied-9x16-v01');
const previews = resolve(edition, 'previews/supplied-9x16-v01');
const content = JSON.parse(readFileSync(resolve(composition, 'content.json'), 'utf8'));
const env = { ...process.env, FONTCONFIG_FILE: resolve(here, '../v03/fontconfig.xml') };
const fonts = {
  'Barlow Condensed': resolve(here, '../v03/fonts/BarlowCondensed-ExtraBold.ttf'),
  Arial: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
};
const run = args => execFileSync('magick', args, { env });
for (const file of Object.values(fonts)) {
  if (!existsSync(file)) throw Error(`Missing required font: ${file}`);
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
let svg = readFileSync(resolve(here, 'overview.svg'), 'utf8');
for (const match of svg.matchAll(/<text id="([^"]+)"[^>]*font-family="([^"]+)"[^>]*font-size="([^"]+)"/g)) {
  const [, key, family, size] = match;
  const slot = content.text[key];
  if (!slot || typeof slot.value !== 'string' || !slot.value.trim() || !Number.isFinite(slot.maxWidth) || slot.maxWidth <= 0) throw Error(`Invalid text slot: ${key}`);
  const width = Number(run(['-font', fonts[family], '-pointsize', size, `label:${slot.value}`, '-format', '%w', 'info:']).toString());
  if (width > slot.maxWidth) throw Error(`${key}: ${width}px exceeds ${slot.maxWidth}px; revise copy or template`);
  svg = svg.replaceAll(`{{${key}}}`, escape(slot.value));
}
for (let i = 1; i <= 4; i++) {
  const key = `photo${i}`;
  if (typeof content.photos[key] !== 'string') throw Error(`Missing photo: ${key}`);
  const path = resolve(composition, content.photos[key]);
  const extension = path.split('.').at(-1);
  if (!['jpg', 'jpeg', 'png'].includes(extension)) throw Error(`Unsupported photo: ${path}`);
  svg = svg.replaceAll(`{{${key}}}`, `data:image/${extension === 'png' ? 'png' : 'jpeg'};base64,${readFileSync(path).toString('base64')}`);
}
if (/\{\{[^}]+\}\}/.test(svg)) throw Error('Unbound template slots');
const output = resolve(composition, 'overview.svg');
if (existsSync(output) && !process.argv.includes('--replace-drafts')) throw Error('Draft exists; preserve reviewed versions before using --replace-drafts');
mkdirSync(previews, { recursive: true });
writeFileSync(output, svg);
run(['-background', 'none', `MSVG:${output}`, resolve(previews, 'overview.png')]);
run([resolve(previews, 'overview.png'), '-resize', '360x640', resolve(previews, 'overview-mobile.png')]);
console.log(`Created ${output} and 1080×1920 / 360×640 draft previews`);

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(root, 'whatsapp.json')));
const base = resolve(root, config.edition);
const event = JSON.parse(readFileSync(resolve(base, 'event.json')));
const brand = JSON.parse(readFileSync(resolve(root, '../../../../brand/tokens.json')));
const logoPath = resolve(root, '../../../../brand/assets/logo.png');
const logoBytes = readFileSync(logoPath);
const logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
const brandAsset = { file: 'brand/assets/logo.png', sha256: createHash('sha256').update(logoBytes).digest('hex') };
const font = resolve(root, 'fonts/BarlowCondensed-ExtraBold.ttf');
const bodyFont = '/System/Library/Fonts/Supplemental/Arial.ttf';
const env = { ...process.env, FONTCONFIG_FILE: resolve(root, 'fontconfig.xml') };
const run = args => execFileSync('magick', args, { env });
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const required = value => { if (typeof value !== 'string' || !value.trim()) throw Error('Missing required text'); return value; };
const measure = (text, size, face, max) => {
  required(text);
  const width = Number(run(['-font', face, '-pointsize', String(size), `label:${text}`, '-format', '%w', 'info:']).toString());
  if (width > max) throw Error(`Text overflow: ${text} (${width} > ${max})`);
  return width;
};
if (!existsSync(font) || !existsSync(bodyFont)) throw Error('Required Barlow Condensed ExtraBold or Arial font missing');
if (event.workshops.length !== 4 || new Set(event.workshops.map(w => w.id)).size !== 4) throw Error('Trial supports exactly four unique workshops');
const photos = new Map(event.workshops.map(w => {
  if (!existsSync(resolve(base, w.photo))) throw Error(`Missing photo: ${w.id}`);
  return [w.id, w];
}));
const layouts = JSON.parse(readFileSync(resolve(root, 'featured-workshops.json')));
const selections = process.argv.includes('--workshops') ? event.workshops.map(w => w.id) : [config.featuredWorkshopId];
for (const id of selections) {
const layout = layouts[id];
if (!layout) throw Error('Missing featured layout: ' + id);
const selectedConfig = process.argv.includes('--workshops') ? {
  ...config, featuredWorkshopId: id, displayTitleLines: [layout.title], featuredCrop: layout.crop,
  labels: { ...config.labels, 'dance-lift': 'DANCE LIFT' }
} : config;
const featured = photos.get(selectedConfig.featuredWorkshopId);
if (!featured || !selectedConfig.displayTitleLines.length) throw Error('Trial requires a featured workshop and two title lines');
const date = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${event.date}T12:00:00Z`)).replaceAll(' de ', ' ').toUpperCase();
const records = [];
function photo(id, x, y, w, h, crop) {
  const source = resolve(base, photos.get(id).photo);
  const args = [source];
  if (crop) {
    const [cx, cy, cw, ch] = crop;
    const [sw, sh] = run([source, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
    if (cx < 0 || cy < 0 || cw <= 0 || ch <= 0 || cx + cw > sw || cy + ch > sh) throw Error(`Invalid crop: ${id}`);
    args.push('-crop', `${cw}x${ch}+${cx}+${cy}`, '+repage');
  }
  // Contain after the deliberate source crop: never cut further to fill a frame.
  args.push('-resize', `${w}x${h}`, '-background', brand.colors.cream, '-gravity', 'center', '-extent', `${w}x${h}`, 'jpg:-');
  const bytes = run(args);
  records.push({ workshopId: id, crop: crop || 'whole-original', placement: [x,y,w,h], policy: 'contain' });
  return `<image x="${x}" y="${y}" width="${w}" height="${h}" xlink:href="data:image/jpeg;base64,${bytes.toString('base64')}"/>`;
}

const name = 'whatsapp-' + featured.id;
const out = resolve(base, 'compositions/v03/' + name + '.svg');
const preview = resolve(base, 'previews/v03/' + name + '.png');
if (existsSync(out) && !process.argv.includes('--replace-drafts')) {
  if (process.argv.includes('--workshops')) { console.log('Preserved existing draft: ' + preview); continue; }
  throw Error('Draft exists; preserve reviewed versions before --replace-drafts');
}
const slots = { ...brand.colors, logo, heading: selectedConfig.heading,
 date: new Intl.DateTimeFormat('es', {day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(event.date+'T12:00:00Z')).toUpperCase(),
 title: selectedConfig.displayTitleLines.join(' '), hours: featured.start+'–'+featured.end,
 teacher: 'con '+featured.instructors.join(' y '), venue: selectedConfig.venue, booking: selectedConfig.booking,
 featuredPhoto: photo(featured.id,0,0,1080,700,selectedConfig.featuredCrop),
 supportingPhotos: event.workshops.filter(w=>w.id!==featured.id).map((w,i)=>photo(w.id,60+i*325,1250,310,230,selectedConfig.supportingCrops[w.id])).join(''),
 supportingLabels: event.workshops.filter(w=>w.id!==featured.id).map((w,i)=>{const label=selectedConfig.labels[w.id];measure(label,27,font,310);return '<text x="'+(60+i*325)+'" y="1525">'+xml(label)+'</text>';}).join('') };
let template = readFileSync(resolve(root,'whatsapp.svg'),'utf8');
for (const m of template.matchAll(/<text[^>]*font-family="([^"]+)"[^>]*font-size="(\d+)"[^>]*>\{\{(\w+)\}\}/g)) measure(slots[m[3]],Number(m[2]),m[1]==='Arial'?bodyFont:font,960);
const fragments = new Set(['featuredPhoto','supportingPhotos','supportingLabels','logo']);
const svg=template.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!(key in slots))throw Error('Missing slot '+key);return fragments.has(key)?slots[key]:xml(slots[key]);});
mkdirSync(dirname(out),{recursive:true});mkdirSync(dirname(preview),{recursive:true});
writeFileSync(out,svg);run(['-background',brand.colors.cream,'MSVG:'+out,preview]);
run([preview,'-resize','360x640',preview.replace('.png','-mobile.png')]);
writeFileSync(preview.replace('.png','-delivery.json'),JSON.stringify({status:'draft-pending-review',template:'v03/whatsapp.svg',brandVersion:brand.brandVersion,dimensions:[1080,1920],featuredWorkshopId:featured.id,photos:records},null,2)+'\n');
console.log(preview);
}

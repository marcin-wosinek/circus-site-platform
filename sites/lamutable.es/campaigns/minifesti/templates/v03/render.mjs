import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(root, 'trial.json')));
const base = resolve(root, config.edition);
const event = JSON.parse(readFileSync(resolve(base, 'event.json')));
const brand = JSON.parse(readFileSync(resolve(root, '../../../../brand/tokens.json')));
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
const featured = photos.get(config.featuredWorkshopId);
if (!featured || config.displayTitleLines.length !== 2) throw Error('Trial requires a featured workshop and two title lines');
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
const venue = required(event.venue.name);
measure(venue, 30, bodyFont, 950);
measure(config.addressLines, 26, bodyFont, 950);
const common = Object.fromEntries(Object.entries({ ...brand.colors, venue, address: config.addressLines }).map(([k,v]) => [k, xml(v)]));
const outputs = [];
const landscapeOnly = process.argv.includes('--landscape-only');
const workshopsOnly = process.argv.includes('--workshops');
if (landscapeOnly && workshopsOnly) throw Error('Select either --landscape-only or --workshops');
function render(name, template, slots, dimensions = [1080,1350]) {
  const values = { ...common, ...slots };
  const svg = readFileSync(resolve(root, `${template}.svg`), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw Error(`Unbound slot: ${key}`);
    return values[key];
  });
  if (svg.includes('{{')) throw Error('Unresolved template slot');
  const source = resolve(base, `compositions/v03/${name}.svg`);
  const output = resolve(base, `previews/v03/${name}.png`);
  for (const path of [source, output]) {
    if (existsSync(path) && !process.argv.includes('--replace-drafts')) throw Error(`Preserving existing draft: ${path}; pass --replace-drafts deliberately`);
    mkdirSync(dirname(path), { recursive: true });
  }
  writeFileSync(source, svg);
  run(['-background', brand.colors.cream, `MSVG:${source}`, output]);
  const size = run([output, '-format', '%wx%h', 'info:']).toString();
  if (size !== dimensions.join('x')) throw Error(`Unexpected output size: ${size}`);
  outputs.push({ file: `previews/v03/${name}.png`, composition: `compositions/v03/${name}.svg`, formatId: template === 'facebook' ? 'facebook-event-cover' : template === 'meetup' ? 'meetup-cover' : 'instagram-feed-portrait', dimensions, status: 'draft-pending-user-review' });
}
const hours = `${event.workshops[0].start}–${event.workshops.at(-1).end}`;
if (!landscapeOnly && !workshopsOnly) {
measure(config.heading, 183, font, 957);
measure(config.organizer, 31, bodyFont, 950);
const dateWidth = measure(date, 53, font, 650);
if (dateWidth + measure(hours, 34, bodyFont, 280) + 35 > 950) throw Error('Date and hours collide');
render('instagram-event', 'overview', {
  organizer: xml(config.organizer), heading: xml(config.heading), date: xml(date), hours: xml(hours),
  photos: photo('dance-lift',28,28,506,550,config.overviewCrops['dance-lift']) + photo('thai-yoga-massage',546,28,506,550,config.overviewCrops['thai-yoga-massage']) + photo('contact-improvisation',28,850,506,345,config.overviewCrops['contact-improvisation']) + photo('inward-yin-yoga',546,850,506,345,config.overviewCrops['inward-yin-yoga']),
});
config.displayTitleLines.forEach(line => measure(line,99,font,950));
measure(config.displaySubtitle,32,bodyFont,950);
const dateTime = `${date} · ${featured.start}–${featured.end}`;
measure(dateTime,44,font,950);
const identity = `${event.title} · ${config.organizer === 'La Mutable' ? 'Movimiento en común.' : config.organizer}`;
measure(identity,28,bodyFont,950);
render(`instagram-${featured.id}`, 'workshop', {
  featuredPhoto: photo(featured.id,28,28,1024,660),
  titleLines: config.displayTitleLines.map((line,i) => `<text x="65" y="${754+i*92}">${xml(line)}</text>`).join(''),
  teacher: xml(config.displaySubtitle), dateTime: xml(dateTime), identity: xml(identity),
  supportingPhotos: event.workshops.filter(w => w.id !== featured.id).map((w,i) => photo(w.id,28+i*345,1033,334,162,config.supportingCrops[w.id])).join(''),
});
if (outputs.length !== 2) throw Error('Trial must produce two examples');
run([resolve(base,outputs[0].file), '-resize', '360x450', resolve(base,'previews/v03/mobile-event.png')]);
run([resolve(base,outputs[1].file), '-resize', '360x450', resolve(base,'previews/v03/mobile-workshop.png')]);
execFileSync('magick', ['montage', resolve(base,'previews/v03/mobile-event.png'), resolve(base,'previews/v03/mobile-workshop.png'), '-tile','2x1','-geometry','+12+12','-background',brand.colors.cream,resolve(base,'previews/v03/contact-sheet.png')], { env });
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
writeFileSync(resolve(base,'previews/v03/delivery.json'), JSON.stringify({
  templateVersion: config.templateVersion, status: 'two-examples-pending-user-review', brandVersion: brand.brandVersion,
  renderer: run(['-version']).toString().split('\n')[0], fonts: [{ family: 'Barlow Condensed ExtraBold', file: font.replace(root, 'templates/v03'), sha256: hash(font), license: 'SIL OFL 1.1; fonts/OFL.txt' }, { family: 'Arial', file: bodyFont, license: 'System font; not redistributed' }],
  inputHashes: Object.fromEntries(['event.json','brief.md','art-direction.md'].map(p => [p, hash(resolve(base,p))])),
  templateHashes: Object.fromEntries(['overview.svg','workshop.svg','trial.json','render.mjs'].map(p => [p, hash(resolve(root,p))])),
  sourceHashes: Object.fromEntries(event.workshops.map(w => [w.photo, hash(resolve(base,w.photo))])),
  photoPlacements: records, outputs,
  unresolved: ['User visual review before designing remaining variants', 'Photo usage permissions', 'Destination export checks before final delivery'],
},null,2)+'\n');
console.log('Rendered two v03 portrait examples.');
}

// Separate landscape pass preserves the reviewed portrait examples and record.
if (landscapeOnly) {
  const street = 'C/ de Sant Columbà, 11, bajo';
  const district = 'Benimaclet · València';
  const venueLine1 = 'Asociación Samadhi';
  const venueLine2 = 'de Salud Integral';
  for (const part of ['C/ de Sant Columbà, 11, bajo','Benimaclet','València',venueLine1,venueLine2]) {
    if (!event.venue.address.includes(part) && !venue.includes(part)) throw Error(`Display copy does not match confirmed venue: ${part}`);
  }
  measure(config.heading,208,font,790);
  measure(date,70,font,790);
  measure(venue,34,bodyFont,790);
  measure(street,30,bodyFont,790);
  measure(config.organizer,42,bodyFont,790);
  measure(hours,45,bodyFont,790);
  measure(district,30,bodyFont,790);
  render('facebook-event','facebook',{
    organizer: xml(config.organizer), heading: xml(config.heading), date: xml(date), hours: xml(hours), street: xml(street), district: xml(district),
    photos: photo('dance-lift',28,28,490,605,config.overviewCrops['dance-lift']) + photo('contact-improvisation',28,665,490,387,config.overviewCrops['contact-improvisation']) + photo('thai-yoga-massage',1402,28,490,605,config.overviewCrops['thai-yoga-massage']) + photo('inward-yin-yoga',1402,665,490,387,config.overviewCrops['inward-yin-yoga']),
  },[1920,1080]);
  config.displayTitleLines.forEach(line => measure(line,64,font,420));
  measure(config.displaySubtitle,25,bodyFont,420);
  measure(date,38,font,420);
  measure(street,20,bodyFont,420);
  measure(event.title,25,bodyFont,420);
  measure(`${featured.start}–${featured.end}`,44,font,420);
  measure(venueLine1,22,bodyFont,420);
  measure(venueLine2,22,bodyFont,420);
  measure(district,20,bodyFont,420);
  render(`meetup-${featured.id}`,'meetup',{
    featuredPhoto: photo(featured.id,28,28,570,552),
    titleLines: config.displayTitleLines.map((line,i) => `<text x="620" y="${140+i*62}">${xml(line)}</text>`).join(''),
    teacher: xml(config.displaySubtitle), date: xml(date), hours: xml(`${featured.start}–${featured.end}`), identity: xml(event.title),
    venueLine1: xml(venueLine1), venueLine2: xml(venueLine2), street: xml(street), district: xml(district),
  },[1080,608]);
  for (const output of outputs) run([resolve(base,output.file),'-resize','540x',resolve(base,output.file.replace('.png','-mobile.png'))]);
  execFileSync('magick',['montage',...outputs.map(o => resolve(base,o.file.replace('.png','-mobile.png'))),'-tile','1x2','-geometry','+12+12','-background',brand.colors.cream,resolve(base,'previews/v03/landscape-contact-sheet.png')],{env});
  const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  writeFileSync(resolve(base,'previews/v03/landscape-delivery.json'),JSON.stringify({
    templateVersion: '0.3.1', status:'landscape-examples-pending-user-review', portraitDirection:'Accepted by user; landscape extension requested', brandVersion:brand.brandVersion, mediaCatalogueVersion:'0.2.0',
    renderer:run(['-version']).toString().split('\n')[0],fonts:['Barlow Condensed ExtraBold (bundled, SIL OFL 1.1)','Arial (local macOS system font)'],
    templateHashes:Object.fromEntries(['facebook.svg','meetup.svg','render.mjs','trial.json'].map(p => [p,hash(resolve(root,p))])),
    sourceHashes:Object.fromEntries(['event.json',...event.workshops.map(w => w.photo)].map(p => [p,hash(resolve(base,p))])),
    photoPlacements:records, outputs, unresolved:['Landscape visual review','Photo usage permissions','Destination export checks before publication'],
  },null,2)+'\n');
  console.log('Rendered Facebook and Meetup landscape review examples; portrait outputs preserved.');
}

if (workshopsOnly) {
  const layouts = JSON.parse(readFileSync(resolve(root,'workshops.json')));
  const identity = `${event.title} · Movimiento en común.`;
  const street = 'C/ de Sant Columbà, 11, bajo';
  const district = 'Benimaclet · València';
  for (const workshop of event.workshops) {
    const layout = layouts[workshop.id];
    if (!layout || layout.titleLines.length !== 2) throw Error(`Missing title layout: ${workshop.id}`);
    layout.titleLines.filter(Boolean).forEach(line => { measure(line,99,font,950); measure(line,64,font,420); });
    measure(layout.subtitle,32,bodyFont,950);
    const dateTime = `${date} · ${workshop.start}–${workshop.end}`;
    measure(dateTime,44,font,950);
    render(`instagram-${workshop.id}`,'workshop',{
      featuredPhoto:photo(workshop.id,28,28,1024,660,layout.crop),
      titleLines:layout.titleLines.map((line,i) => `<text x="65" y="${754+i*92}">${xml(line)}</text>`).join(''),
      teacher:xml(layout.subtitle),dateTime:xml(dateTime),identity:xml(identity),
      supportingPhotos:event.workshops.filter(w => w.id !== workshop.id).map((w,i) => photo(w.id,28+i*345,1033,334,162,config.supportingCrops[w.id])).join(''),
    });
    const subtitleLines = layout.meetupSubtitleLines || [layout.subtitle];
    subtitleLines.forEach(line => measure(line,25,bodyFont,420));
    measure(date,38,font,420);
    measure(`${workshop.start}–${workshop.end}`,44,font,420);
    render(`meetup-${workshop.id}`,'meetup',{
      featuredPhoto:photo(workshop.id,28,28,570,552,layout.crop),
      titleLines:layout.titleLines.map((line,i) => `<text x="620" y="${140+i*62}">${xml(line)}</text>`).join(''),
      teacher:subtitleLines.map((line,i) => `<tspan x="620" dy="${i ? 29 : 0}">${xml(line)}</tspan>`).join(''),
      date:xml(date),hours:xml(`${workshop.start}–${workshop.end}`),identity:xml(event.title),
      venueLine1:xml('Asociación Samadhi'),venueLine2:xml('de Salud Integral'),street:xml(street),district:xml(district),
    },[1080,608]);
  }
  if (outputs.length !== 8) throw Error('Expected eight workshop outputs');
  for (const workshop of event.workshops) {
    const caption = `${workshop.title}\nCon ${workshop.instructors.join(' y ')}\n22 noviembre 2026 · ${workshop.start}–${workshop.end}\n${event.venue.name}\n${event.venue.address}\nMinifesti La Mutable`;
    const alt = `${workshop.title}, con ${workshop.instructors.join(' y ')}. 22 noviembre 2026, ${workshop.start}–${workshop.end}. ${event.venue.name}.`;
    writeFileSync(resolve(base,`previews/v03/${workshop.id}.md`),`# ${workshop.title}\n\nDraft assets; visual review and photo usage confirmation remain pending.\n\n- [Instagram PNG](instagram-${workshop.id}.png) (1080 × 1350)\n- [Instagram editable SVG](../../compositions/v03/instagram-${workshop.id}.svg)\n- [Meetup PNG](meetup-${workshop.id}.png) (1080 × 608)\n- [Meetup editable SVG](../../compositions/v03/meetup-${workshop.id}.svg)\n\n## Caption\n\n${caption.split('\n').join('  \n')}\n\n## Alt text\n\n${alt}\n`);
  }
  for (const output of outputs) run([resolve(base,output.file),'-resize',output.formatId === 'meetup-cover' ? '540x' : '360x',resolve(base,output.file.replace('.png','-mobile.png'))]);
  for (const format of ['instagram','meetup']) {
    execFileSync('magick',['montage',...outputs.filter(o => o.file.includes(`/${format}-`)).map(o => resolve(base,o.file.replace('.png','-mobile.png'))),'-tile','2x2','-geometry','+12+12','-background',brand.colors.cream,resolve(base,`previews/v03/${format}-workshops-contact-sheet.png`)],{env});
  }
  const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  writeFileSync(resolve(base,'previews/v03/workshops-delivery.json'),JSON.stringify({
    templateVersion:'0.3.2',status:'complete-workshop-set-pending-review',brandVersion:brand.brandVersion,mediaCatalogueVersion:'0.2.0',
    renderer:run(['-version']).toString().split('\n')[0],fonts:['Barlow Condensed ExtraBold (bundled, SIL OFL 1.1)','Arial (local macOS system font)'],
    inputHashes:Object.fromEntries(['workshop.svg','meetup.svg','render.mjs','workshops.json'].map(p => [p,hash(resolve(root,p))])),
    sourceHashes:Object.fromEntries(['event.json',...event.workshops.map(w => w.photo)].map(p => [p,hash(resolve(base,p))])),
    photoPlacements:records,outputs:outputs.map(o => {
      const workshop = event.workshops.find(w => o.file.includes(w.id));
      return {...o,workshopId:workshop.id,altText:`${workshop.title}, con ${workshop.instructors.join(' y ')}. ${date.toLowerCase()}, ${workshop.start}–${workshop.end}. ${venue}.`,caption:`${workshop.title}\nCon ${workshop.instructors.join(' y ')}\n22 noviembre 2026 · ${workshop.start}–${workshop.end}\n${event.venue.name}\n${event.venue.address}\nMinifesti La Mutable`};
    }),
    unresolved:['Final visual review','Photo usage permissions','Destination export checks before publication'],
  },null,2)+'\n');
  console.log('Rendered all eight workshop SVG/PNG pairs, mobile previews, contact sheets and workshop delivery record.');
}

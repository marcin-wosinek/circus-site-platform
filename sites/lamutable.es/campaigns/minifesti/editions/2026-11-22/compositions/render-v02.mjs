import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// Edition-specific draft compositions. Requires ImageMagick and local Arial fonts.
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const event = JSON.parse(readFileSync(resolve(base, 'event.json')));
const cream = '#F9E9D4', ink = '#262122', burgundy = '#AE184D';
const sprig = readFileSync(resolve(base, 'sources/generated/olive-sprig-v01.png')).toString('base64');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (s,x,y,size,color=ink,bold=false) => `<text x="${x}" y="${y}" font-family="${bold?'Arial Narrow':'Arial'}" font-weight="${bold?700:400}" font-size="${size}" fill="${color}">${esc(s)}</text>`;
const photo = (i,x,y,w,h) => {
  // Fit whole photographs; never crop essential hands, supports or feet.
  const bytes = execFileSync('magick', [resolve(base,event.workshops[i].photo), '-resize', `${w}x${h}`, '-background', cream, '-gravity','center','-extent',`${w}x${h}`,'jpg:-']);
  return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/jpeg;base64,${bytes.toString('base64')}"/>`;
};
const leaf = (x,y,w,h) => `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${sprig}"/>`;
const titles = [['MASAJE','THAI YOGA'],['DANCE LIFT'],['IMPROVISACIÓN','DE CONTACTO'],['INWARD','YIN YOGA']];
const out = [];
function make(name,w,h,format,i=null) {
  let body = `<rect width="${w}" height="${h}" fill="${cream}"/>`;
  const portrait = h>w;
  if (i===null && portrait) {
    body += photo(1,18,18,516,500)+photo(0,546,18,516,500)+photo(2,18,850,516,350)+photo(3,546,850,516,350);
    body += `<path d="M0 525 Q270 455 540 525 T1080 525 V855 Q810 925 540 855 T0 855Z" fill="${cream}"/>`;
    body += text('MINIFESTI',80,660,128,ink,true)+text('22 NOVIEMBRE 2026',80,735,52,burgundy,true)+text('15:00–22:00 · La Mutable',80,795,36)+leaf(900,550,100,210)+text(event.venue.name,75,1215,30)+text('C/ de Sant Columbà, 11, bajo · Benimaclet',75,1250,27)+text('46020 València, Valencia',75,1285,24);
  } else if (i===null) {
    body += photo(1,20,20,440,510)+photo(0,20,550,440,510)+photo(2,1460,20,440,510)+photo(3,1460,550,440,510);
    body += text('MINIFESTI',530,470,150,ink,true)+text('22 NOVIEMBRE 2026',535,570,64,burgundy,true)+text('15:00–22:00',535,650,48)+text('La Mutable',535,730,48)+leaf(1240,650,120,200)+text('Asociación Samadhi',535,820,38)+text('de Salud Integral',535,868,38)+text('C/ de Sant Columbà, 11, bajo',535,930,32)+text('Benimaclet · 46020 València, Valencia',535,975,28);
  } else if (portrait) {
    body += photo(i,18,18,1044,650);
    body += `<path d="M0 660 Q270 610 540 660 T1080 660 V1040 H0Z" fill="${cream}"/>`;
    titles[i].forEach((s,k)=>body+=text(s,75,760+k*82,82,ink,true));
    const y = titles[i].length===1?850:920;
    body += text(`22 NOV. 2026 · ${event.workshops[i].start}–${event.workshops[i].end}`,75,y,38,burgundy,true)+text(event.workshops[i].instructors.join(' + '),75,y+53,34)+text('MINIFESTI · LA MUTABLE',75,y+99,28)+leaf(930,785,80,180)+text(event.venue.name,75,1060,28)+text('C/ de Sant Columbà, 11, bajo · Benimaclet',75,1095,27)+text('46020 València, Valencia',75,1125,24);
    event.workshops.map((_,j)=>j).filter(j=>j!==i).forEach((j,k)=>body+=photo(j,18+k*352,1150,340,182));
  } else {
    body += photo(i,16,16,510,576);
    body += `<path d="M540 0 Q500 152 540 304 T540 608 H1080 V0Z" fill="${cream}"/>`;
    titles[i].forEach((s,k)=>body+=text(s,575,175+k*60,i===2?48:60,ink,true));
    body += text('22 NOVIEMBRE 2026',575,320,32,burgundy,true)+text(`${event.workshops[i].start}–${event.workshops[i].end}`,575,365,32)+text(event.workshops[i].instructors.join(' + '),575,410,28)+text('Asociación Samadhi de Salud Integral',575,460,23)+text('C/ de Sant Columbà, 11, bajo',575,496,23)+text('Benimaclet · 46020 València, Valencia',575,530,22)+text('MINIFESTI · LA MUTABLE',575,575,25);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body.replaceAll(' href=', ' xlink:href=')}</svg>`;
  const source = `compositions/v02/${name}.svg`, file = `previews/v02/${name}.png`;
  writeFileSync(resolve(base,source),svg);
  execFileSync('magick',['-background',cream,`MSVG:${resolve(base,source)}`,resolve(base,file)]);
  out.push({file,composition:source,formatId:format,dimensions:[w,h],fileType:'image/png',workshopId:i===null?null:event.workshops[i].id,sourceAssets:i===null||portrait?event.workshops.map(v=>v.photo):[event.workshops[i].photo],fonts:['Arial Narrow Bold','Arial'],reviewStatus:'draft-pending-visual-review',altText:i===null?'Minifesti La Mutable, 22 noviembre 2026, 15:00–22:00. Collage de las cuatro prácticas.':`${event.workshops[i].title}, con ${event.workshops[i].instructors.join(' y ')}, 22 noviembre 2026, ${event.workshops[i].start}–${event.workshops[i].end}.`,deviations:['Arial Narrow Bold substitutes for unavailable Barlow Condensed.','Original photographs fitted whole to preserve bodies.']});
}
mkdirSync(resolve(base,'previews/v02'),{recursive:true});
mkdirSync(resolve(base,'compositions/v02'),{recursive:true});
make('instagram-event',1080,1350,'instagram-feed-portrait');
make('facebook-event',1920,1080,'facebook-event-cover');
event.workshops.forEach((v,i)=>{make(`instagram-${v.id}`,1080,1350,'instagram-feed-portrait',i);make(`meetup-${v.id}`,1080,608,'meetup-cover',i);});
writeFileSync(resolve(base,'delivery.json'),JSON.stringify({formatVersion:1,status:'facts-confirmed-drafts-in-review',brandVersion:'0.1.0',mediaCatalogueVersion:'0.2.0',expectedOutputCount:10,generationMode:'built-in image_gen for botanical decoration; deterministic SVG composition of original photographs and editable text',unresolved:['Visual review and photo usage confirmation','Destination requirements not independently reverified; project draft presets used'],deliverables:out},null,2)+'\n');

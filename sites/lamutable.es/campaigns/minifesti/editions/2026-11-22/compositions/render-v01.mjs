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
const titles = [['THAI YOGA','MASSAGE'],['DANCE LIFT'],['CONTACT','IMPROVISATION'],['INWARD','YIN YOGA']];
const out = [];
function make(name,w,h,format,i=null) {
  let body = `<rect width="${w}" height="${h}" fill="${cream}"/>`;
  const portrait = h>w;
  if (i===null && portrait) {
    body += photo(1,18,18,516,500)+photo(0,546,18,516,500)+photo(2,18,850,516,482)+photo(3,546,850,516,482);
    body += `<path d="M0 525 Q270 455 540 525 T1080 525 V855 Q810 925 540 855 T0 855Z" fill="${cream}"/>`;
    body += text('MINIFESTI',80,660,128,ink,true)+text('22 NOVIEMBRE',80,735,58,burgundy,true)+text('15:00–22:00 · La Mutable',80,795,36)+leaf(810,540,160,270);
  } else if (i===null) {
    body += photo(1,20,20,440,510)+photo(0,20,550,440,510)+photo(2,1460,20,440,510)+photo(3,1460,550,440,510);
    body += text('MINIFESTI',530,470,150,ink,true)+text('22 NOVIEMBRE',535,570,76,burgundy,true)+text('15:00–22:00',535,650,48)+text('La Mutable',535,730,48)+leaf(1190,650,170,280);
  } else if (portrait) {
    body += photo(i,18,18,1044,650);
    body += `<path d="M0 660 Q270 610 540 660 T1080 660 V1040 H0Z" fill="${cream}"/>`;
    titles[i].forEach((s,k)=>body+=text(s,75,760+k*82,82,ink,true));
    const y = titles[i].length===1?850:920;
    body += text(`22 NOV. · ${event.workshops[i].start}–${event.workshops[i].end}`,75,y,42,burgundy,true)+text(event.workshops[i].instructors.join(' + '),75,y+53,34)+text('MINIFESTI · LA MUTABLE',75,y+99,28)+leaf(880,785,110,200);
    event.workshops.map((_,j)=>j).filter(j=>j!==i).forEach((j,k)=>body+=photo(j,18+k*352,1060,340,272));
  } else {
    body += photo(i,16,16,510,576);
    body += `<path d="M540 0 Q500 152 540 304 T540 608 H1080 V0Z" fill="${cream}"/>`;
    titles[i].forEach((s,k)=>body+=text(s,575,175+k*60,i===2?48:60,ink,true));
    body += text('22 NOVIEMBRE',575,345,36,burgundy,true)+text(`${event.workshops[i].start}–${event.workshops[i].end}`,575,395,32)+text(event.workshops[i].instructors.join(' + '),575,444,28)+text('MINIFESTI · LA MUTABLE',575,540,25)+leaf(940,410,75,115);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body.replaceAll(' href=', ' xlink:href=')}</svg>`;
  const source = `compositions/v01/${name}.svg`, file = `previews/v01/${name}.png`;
  writeFileSync(resolve(base,source),svg);
  execFileSync('magick',['-background',cream,`MSVG:${resolve(base,source)}`,resolve(base,file)]);
  out.push({file,composition:source,formatId:format,dimensions:[w,h],fileType:'image/png',workshopId:i===null?null:event.workshops[i].id,sourceAssets:i===null||portrait?event.workshops.map(v=>v.photo):[event.workshops[i].photo],fonts:['Arial Narrow Bold','Arial'],reviewStatus:'draft-pending-event-facts-and-user-review',altText:i===null?'Minifesti La Mutable, 22 noviembre, 15:00–22:00. Collage de las cuatro prácticas.':`${event.workshops[i].title}, con ${event.workshops[i].instructors.join(' y ')}, 22 noviembre, ${event.workshops[i].start}–${event.workshops[i].end}.`,deviations:['Arial Narrow Bold substitutes for unavailable Barlow Condensed.','Year and venue omitted pending confirmation.','Original photographs fitted whole to preserve bodies.']});
}
mkdirSync(resolve(base,'previews/v01'),{recursive:true});
make('instagram-event',1080,1350,'instagram-feed-portrait');
make('facebook-event',1920,1080,'facebook-event-cover');
event.workshops.forEach((v,i)=>{make(`instagram-${v.id}`,1080,1350,'instagram-feed-portrait',i);make(`meetup-${v.id}`,1080,608,'meetup-cover',i);});
writeFileSync(resolve(base,'delivery.json'),JSON.stringify({formatVersion:1,status:'drafts-generated-pending-confirmation',brandVersion:'0.1.0',mediaCatalogueVersion:'0.2.0',expectedOutputCount:10,generationMode:'built-in image_gen for botanical decoration; deterministic SVG composition of original photographs and editable text',unresolved:['Confirm year, venue and output language','Confirm titles, teachers, times, photo permissions and final copy','Destination requirements not independently reverified; project draft presets used'],deliverables:out},null,2)+'\n');

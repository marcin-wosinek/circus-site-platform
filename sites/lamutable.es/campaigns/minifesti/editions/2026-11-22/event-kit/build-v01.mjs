import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Edition-specific assembly: preserve all existing artwork and earlier deliveries.
const here = dirname(fileURLToPath(import.meta.url));
const edition = resolve(here, '..');
const templates = resolve(edition, '../../templates/v03');
const out = resolve(here, 'v01');
if (existsSync(out)) throw Error('v01 exists; preserve it and create a new version.');
const event = JSON.parse(readFileSync(resolve(edition, 'event.json')));
const brand = JSON.parse(readFileSync(resolve(edition, '../../../../brand/tokens.json')));
const accentColor = '#E85E14'; // User-selected accent for this event kit only.
const env = { ...process.env, FONTCONFIG_FILE: resolve(templates, 'fontconfig.xml') };
const magick = args => execFileSync('magick', args, { env });
const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const booking = event.sourceUrl + '#inscripcion';
const date = '22 noviembre 2026';
const location = `${event.venue.name}, ${event.venue.address}`;
const descriptions = {
  'thai-yoga-massage': 'Ven a dar y recibir estiramientos y masaje en pareja. Taller impartido en inglés.',
  'dance-lift': 'Ven a explorar apoyos, elevaciones y movimiento compartido con Emanuela y Tavi. Taller impartido en español.',
  'contact-improvisation': 'Exploramos el contacto, el peso y nuestra relación con el suelo a través del movimiento. Taller impartido en español.',
  'inward-yin-yoga': 'Una invitación a bajar el ritmo con Yin Yoga y meditación guiada. Taller impartido en inglés.',
};
const subjects = [{ id: 'general', title: event.title, start: '15:00', end: '22:00' }, ...event.workshops];
const records = [];
const sourceHashes = {};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function source(path) {
  const bytes = readFileSync(resolve(edition, path));
  sourceHashes[path] = sha(bytes);
  return bytes.toString();
}
function render(svg, destination, width, height) {
  svg = svg.replaceAll(brand.colors.burgundy, accentColor);
  if (/\{\{\w+\}\}/.test(svg)) throw Error('Unresolved template slot');
  // Check live single-line text against the actual font and remaining canvas width.
  for (const match of svg.matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)) {
    const attrs = match[1];
    const size = /font-size="(\d+)"/.exec(attrs)?.[1];
    if (!size) continue; // Group-inherited typography is preserved from the source.
    const font = attrs.includes('font-family="Arial"') ? '/System/Library/Fonts/Supplemental/Arial.ttf' : resolve(templates, 'fonts/BarlowCondensed-ExtraBold.ttf');
    const text = match[2].replaceAll('&amp;', '&');
    const measured = Number(magick(['-font', font, '-pointsize', size, `label:${text}`, '-format', '%w', 'info:']).toString());
    const x = Number(/\bx="([\d.]+)"/.exec(attrs)?.[1] || 65);
    const max = attrs.includes('text-anchor="end"') ? x - 65 : width - 65 - x;
    if (measured > max) throw Error(`Text overflow: ${text} (${measured} > ${max})`);
  }
  writeFileSync(destination + '.svg', svg);
  magick(['-background', brand.colors.cream, 'MSVG:' + destination + '.svg', destination + '.png']);
  const dimensions = magick([destination + '.png', '-format', '%w %h', 'info:']).toString();
  if (dimensions !== `${width} ${height}`) throw Error('Unexpected dimensions: ' + dimensions);
  records.push({ file: destination.replace(out + '/', '') + '.png', dimensions: [width, height], sha256: sha(readFileSync(destination + '.png')) });
}
mkdirSync(out);
const emails = [];
const alts = [];
for (const subject of subjects) {
  const dir = resolve(out, subject.id);
  mkdirSync(dir);
  const general = subject.id === 'general';
  let instagram = source(`compositions/v03/instagram-${general ? 'event' : subject.id}.svg`);
  instagram = instagram.replace('y="1274" font-size="26"', 'y="1265" font-size="24"')
    .replace('x="947" y="1210"', 'x="947" y="1195"');
  if (general) instagram = instagram.replace('>La Mutable</text>', '>La Mutable · Reserva en lamutable.es</text>');
  else instagram = instagram.replace('Minifesti La Mutable · Movimiento en común.', 'Minifesti La Mutable · Reserva en lamutable.es');
  render(instagram, resolve(dir, 'instagram'), 1080, 1350);
  let whatsapp;
  if (general) {
    const inner = instagram.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    whatsapp = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="${brand.colors.cream}"/><g transform="translate(0 180)">${inner}</g><text x="65" y="1660" font-family="Barlow Condensed" font-weight="800" font-size="55" fill="${accentColor}">VEN A COMPARTIR MOVIMIENTO</text><text x="65" y="1720" font-family="Arial" font-size="34" fill="${brand.colors.ink}">Programa e inscripción en lamutable.es</text></svg>`;
  } else {
    whatsapp = source(`compositions/v03/whatsapp-${subject.id}.svg`);
    whatsapp = whatsapp.replace(/22 DE NOVIEMBRE/g, '22 NOVIEMBRE 2026')
      .replace(/(id="date"[^>]*font-size=")74"/, '$164"')
      .replaceAll('CONTACT IMPROVISATION', 'CONTACTO');
    if (subject.id === 'contact-improvisation') {
      whatsapp = whatsapp.replace(/(id="workshop-name"[^>]*font-size=")96"[^>]*>CONTACTO/, '$170">IMPROVISACIÓN DE CONTACTO');
    }
  }
  render(whatsapp, resolve(dir, 'whatsapp'), 1080, 1920);
  const programme = event.workshops.map(w => `${w.start}–${w.end} · ${w.title} · ${w.instructors.join(' y ')} (${w.language === 'en' ? 'inglés' : 'español'})`).join('\n');
  const intro = general ? 'Ven a compartir una tarde de movimiento, encuentro y cuidado con La Mutable. Elige los talleres en los que quieres participar.' : descriptions[subject.id];
  const teacher = general ? '' : `Con ${subject.instructors.join(' y ')}. `;
  const whatsappText = `*${subject.title}* · ${teacher}📅 ${date} · ${subject.start}–${subject.end} · 📍 ${location} · ${intro} ${general ? '' : 'Dentro de Minifesti La Mutable. '}Participa y reserva tu plaza: ${booking}`;
  const instagramText = `${subject.title}\n${general ? '' : `Con ${subject.instructors.join(' y ')}\n`}\n${intro}\n\n${date} · ${subject.start}–${subject.end}\n${location}\n\n${general ? programme + '\n\n' : 'Dentro de Minifesti La Mutable.\n\n'}Consulta precios y condiciones e inscríbete: ${booking}\n\nOrganiza La Mutable. Movimiento en común.`;
  if (whatsappText.includes('\n')) throw Error('WhatsApp copy must be one line');
  writeFileSync(resolve(dir, 'whatsapp.txt'), whatsappText);
  writeFileSync(resolve(dir, 'instagram.txt'), instagramText + '\n');
  emails.push(`## ${subject.title}\n\nAsunto: Para compartir · ${subject.title} · 22 noviembre\n\nAdjuntos: ${subject.id}/whatsapp.png y ${subject.id}/instagram.png\n\nHola,\n\nAquí tienes las dos piezas de ${subject.title} para compartir desde tu cuenta cuando el equipo apruebe el kit. Guarda la imagen del canal que vayas a usar y copia su texto.\n\n### Estado de WhatsApp\n\n${whatsappText}\n\n### Publicación de Instagram\n\n${instagramText}\n\nGracias por compartir movimiento en común.\n`);
  alts.push(`## ${subject.title}\n\n${general ? 'Collage de cuatro fotografías: una elevación en pareja, masaje en el suelo, una práctica grupal de movimiento y una postura de Yin Yoga.' : `Fotografía principal de ${subject.title}, acompañada por tres fotos de las otras prácticas del Minifesti.`} Cartel en crema, tinta y naranja. ${date}, ${subject.start}–${subject.end}. ${location}. Inscripción en lamutable.es.\n`);
}
writeFileSync(resolve(out, 'email-drafts.md'), '# Borradores de correo · pendientes de aprobación y envío manual\n\n' + emails.join('\n'));
writeFileSync(resolve(out, 'alt-text.md'), '# Textos alternativos sugeridos\n\n' + alts.join('\n'));
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify({ status: 'draft-pending-user-review', brandVersion: brand.brandVersion, accentColor, mediaCatalogueVersion: '0.3.1', bookingUrl: booking, bookingChecked: '2026-11-16; HTTP GET only; form anchor inscripcion present; no checkout submitted', templates: ['v03/overview.svg', 'v03/workshop.svg', 'v03/whatsapp.svg'], fonts: ['Barlow Condensed ExtraBold (bundled, SIL OFL 1.1)', 'Arial (macOS system font, not redistributed)'], renderer: magick(['-version']).toString().split('\n')[0], sourceHashes, outputs: records }, null, 2) + '\n');
writeFileSync(resolve(out, 'index.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Minifesti · Event Kit</title><style>body{font:18px system-ui;max-width:1100px;margin:40px auto;padding:20px;background:${brand.colors.cream};color:${brand.colors.ink}}section{margin:60px 0}article{display:inline-block;vertical-align:top;width:46%;margin:1%}img{width:100%;height:540px;object-fit:contain}a{color:${accentColor}}@media(max-width:600px){article{width:98%}}</style><h1>Minifesti · 22 noviembre 2026</h1><p>Borrador para revisión. Cinco paquetes para compartir manualmente.</p><p><a href="review.md">Notas de revisión</a> · <a href="email-drafts.md">Correos</a> · <a href="alt-text.md">Textos alternativos</a></p>${subjects.map(s => `<section><h2>${xml(s.title)}</h2>${['whatsapp', 'instagram'].map(c => `<article><h3>${c === 'whatsapp' ? 'Estado de WhatsApp' : 'Publicación de Instagram'}</h3><a href="${s.id}/${c}.png"><img src="${s.id}/${c}.png" alt="${xml(s.title)}"></a><p><a href="${s.id}/${c}.png">Imagen PNG</a> · <a href="${s.id}/${c}.txt">Texto para copiar</a> · <a href="${s.id}/${c}.svg">SVG editable</a></p></article>`).join('')}</section>`).join('')}</html>`);
console.log(`Created ${records.length} images, ten texts, editable sources and review index in ${out}`);

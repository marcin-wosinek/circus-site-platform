// Renders the WhatsApp group image templates (1080 × 1350, preset
// `whatsapp-group-image` in docs/media-formats.md) for this edition: one SVG
// per subject with its cropped photos and the brand logo embedded, and a
// {{label}} slot in every <text> element. Wording comes only from campaign
// text, bound later by ../build.mjs. Requires ImageMagick. Deterministic, so
// rerunning with unchanged photos rewrites identical files.
//
// node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/whatsapp-group/render-templates.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJsonNoDuplicateKeys } from '../../../../../../../../scripts/lib/strict-json.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const edition = resolve(here, '../..');
const brand = JSON.parse(readFileSync(resolve(edition, '../../../../brand/tokens.json'), 'utf8'));
const config = parseJsonNoDuplicateKeys(readFileSync(resolve(here, 'templates.json'), 'utf8'), { label: 'templates.json' });
const { cream, ink } = brand.colors;
const accent = config.accentColor;
const HEADING = 'font-family="Barlow Condensed" font-weight="800"';
const GRAVITIES = new Set(['center', 'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest']);

const magick = (args) => execFileSync('magick', args, { maxBuffer: 64 * 1024 * 1024 });
// The brand mark used by every earlier kit, taken from the v07 visual baseline.
const logo = /id="brand-logo"[^>]*xlink:href="(data:image\/png;base64,[^"]+)"/.exec(readFileSync(resolve(here, '../v07/general/instagram.svg'), 'utf8'))?.[1];
if (!logo) throw Error('Brand logo not found in event-kit/v07/general/instagram.svg.');

function photo({ src, gravity }, width, height) {
	if (!GRAVITIES.has(gravity)) throw Error(`${src}: unsupported gravity "${gravity}".`);
	const jpeg = magick([resolve(edition, src), '-resize', `${width}x${height}^`, '-gravity', gravity, '-extent', `${width}x${height}`, '-strip', '-quality', '88', 'jpg:-']);
	return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

const open = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="1350" fill="${cream}"/>`;
const mark = `  <image id="brand-logo" x="65" y="1210" width="40" height="75" preserveAspectRatio="xMidYMid meet" xlink:href="${logo}"/>`;

const layouts = {
	general: (subject) => `${open}
  <g id="overview-photos">
${subject.photos.map((item, index) => `    <image x="${index % 2 ? 546 : 28}" y="${index < 2 ? 28 : 440}" width="506" height="400" xlink:href="${photo(item, 506, 400)}"/>`).join('\n')}
  </g>
  <path id="wave" d="M0 790 C200 830 330 760 540 790 S880 845 1080 775 V1350 H0Z" fill="${cream}"/>
  <text id="organizer" x="65" y="905" fill="${ink}" font-family="Arial" font-size="36">{{organizer}}</text>
  <text id="event-name" x="56" y="1085" fill="${ink}" ${HEADING} font-size="205">{{event-name}}</text>
  <text id="date-location" x="65" y="1165" fill="${accent}" ${HEADING} font-size="62">{{date-location}}</text>
${mark}
</svg>
`,
	// Text is anchored to the footer; a one-line name gives the photo the
	// height of the second line.
	workshop: (subject) => workshop(subject, 1),
	'workshop-two-line-name': (subject) => workshop(subject, 2),
};

function workshop(subject, lines) {
	const shift = (lines - 1) * 118;
	const names = lines === 1
		? `  <text id="workshop-name" x="62" y="1093" fill="${ink}" ${HEADING} font-size="125">{{workshop-name}}</text>`
		: `  <text id="workshop-name-1" x="62" y="975" fill="${ink}" ${HEADING} font-size="125">{{workshop-name-1}}</text>
  <text id="workshop-name-2" x="62" y="1093" fill="${ink}" ${HEADING} font-size="125">{{workshop-name-2}}</text>`;
	return `${open}
  <g id="featured-photo"><image x="28" y="28" width="1024" height="${878 - shift}" xlink:href="${photo(subject.photo, 1024, 878 - shift)}"/></g>
  <path id="wave" d="M0 ${853 - shift} C210 ${898 - shift} 360 ${813 - shift} 560 ${843 - shift} S900 ${898 - shift} 1080 ${833 - shift} V1350 H0Z" fill="${cream}"/>
  <text id="event-date" x="65" y="${973 - shift}" fill="${accent}" ${HEADING} font-size="62">{{event-date}}</text>
${names}
  <text id="teachers" x="65" y="1160" fill="${ink}" font-family="Arial" font-size="40">{{teachers}}</text>
  <text id="venue" x="125" y="1262" fill="${ink}" font-family="Arial" font-size="34">{{venue}}</text>
${mark}
</svg>
`;
}

for (const [id, subject] of Object.entries(config)) {
	if (['formatVersion', 'note', 'accentColor'].includes(id)) continue;
	const render = layouts[subject.layout];
	if (!render) throw Error(`${id}: unknown layout "${subject.layout}".`);
	writeFileSync(resolve(here, `${id}.svg`), render(subject));
	console.log(`Wrote ${id}.svg (${subject.layout})`);
}

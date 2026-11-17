// Renders the WhatsApp Status image templates (1080 × 1920, preset
// `whatsapp-status` in docs/media-formats.md) for this edition: one SVG per
// subject with its cropped photos and the brand logo embedded, and a
// {{label}} slot in every <text> element. WhatsApp lays the status caption
// over the bottom of the image, so every label and the logo end above
// SAFE_BOTTOM; below it there is only a decorative ink band, which also keeps
// the caption's white text readable. Wording comes only from campaign text,
// bound later by ../build.mjs. Requires ImageMagick. Deterministic, so
// rerunning with unchanged photos rewrites identical files.
//
// node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/whatsapp-status/render-templates.mjs
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
const SAFE_BOTTOM = 1480;

const magick = (args) => execFileSync('magick', args, { maxBuffer: 64 * 1024 * 1024 });
// The brand mark used by every earlier kit, taken from the v07 visual baseline.
const logo = /id="brand-logo"[^>]*xlink:href="(data:image\/png;base64,[^"]+)"/.exec(readFileSync(resolve(here, '../v07/general/instagram.svg'), 'utf8'))?.[1];
if (!logo) throw Error('Brand logo not found in event-kit/v07/general/instagram.svg.');

// focusY (0–1, optional) centres the crop on that fraction of the resized
// photo's height, for portrait photos whose subject is not at an edge.
function photo({ src, gravity, focusY }, width, height) {
	if (!GRAVITIES.has(gravity)) throw Error(`${src}: unsupported gravity "${gravity}".`);
	const resize = [resolve(edition, src), '-resize', `${width}x${height}^`];
	let crop = ['-gravity', gravity, '-extent', `${width}x${height}`];
	if (focusY !== undefined) {
		if (!(focusY >= 0 && focusY <= 1)) throw Error(`${src}: focusY must be between 0 and 1.`);
		const resizedHeight = Number(magick([...resize, '-format', '%h', 'info:']).toString());
		const top = Math.round(Math.min(Math.max(focusY * resizedHeight - height / 2, 0), resizedHeight - height));
		crop = ['-crop', `${width}x${height}+0+${top}`, '+repage'];
	}
	const jpeg = magick([...resize, ...crop, '-strip', '-quality', '88', 'jpg:-']);
	return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

const open = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="${cream}"/>`;
// Caption area: decoration only, nothing that must be read.
const footer = `  <path id="caption-band" d="M0 1565 C220 1525 430 1600 650 1570 S960 1530 1080 1555 V1920 H0Z" fill="${ink}"/>
</svg>
`;

const layouts = {
	general: (subject) => `${open}
  <g id="overview-photos">
${subject.photos.map((item, index) => {
		const [y, height] = index < 2 ? [28, 550] : [850, 345];
		return `    <image x="${index % 2 ? 546 : 28}" y="${y}" width="506" height="${height}" xlink:href="${photo(item, 506, height)}"/>`;
	}).join('\n')}
  </g>
  <path id="information-wave" d="M0 550 C180 580 255 510 440 535 S790 595 1080 530 L1080 870 C850 820 750 900 535 865 S190 830 0 885Z" fill="${cream}"/>
  <text id="organizer" x="65" y="605" fill="${ink}" font-family="Arial" font-size="31">{{organizer}}</text>
  <text id="event-name" x="58" y="750" fill="${ink}" ${HEADING} font-size="183">{{event-name}}</text>
  <text id="date" x="65" y="818" fill="${accent}" ${HEADING} font-size="53">{{date}}</text>
  <text id="hours" x="1015" y="818" text-anchor="end" fill="${ink}" font-family="Arial" font-size="34">{{hours}}</text>
  <image id="brand-logo" x="905" y="595" width="65" height="121" preserveAspectRatio="xMidYMid meet" xlink:href="${logo}"/>
  <text id="venue-name" x="65" y="1245" fill="${ink}" font-family="Arial" font-size="30">{{venue-name}}</text>
  <text id="venue-address" x="65" y="1282" fill="${ink}" font-family="Arial" font-size="24">{{venue-address}}</text>
  <text id="call-to-action" x="65" y="1385" fill="${accent}" ${HEADING} font-size="55">{{call-to-action}}</text>
  <text id="programme-link" x="65" y="1442" fill="${ink}" font-family="Arial" font-size="34">{{programme-link}}</text>
${footer}`,
	workshop: (subject) => `${open}
  <g id="featured-photo"><image x="0" y="0" width="1080" height="660" xlink:href="${photo(subject.photo, 1080, 660)}"/></g>
  <path id="wave" d="M0 600 C230 545 425 695 690 640 C870 600 980 580 1080 610 V720 H0Z" fill="${cream}"/>
  <text id="event-name" x="60" y="790" fill="${ink}" ${HEADING} font-size="158">{{event-name}}</text>
  <image id="brand-logo" x="950" y="680" width="65" height="121" preserveAspectRatio="xMidYMid meet" xlink:href="${logo}"/>
  <text id="date" x="65" y="870" fill="${accent}" ${HEADING} font-size="64">{{date}}</text>
  <text id="workshop-name" x="65" y="990" fill="${ink}" ${HEADING} font-size="96">{{workshop-name}}</text>
  <text id="hours" x="65" y="1063" fill="${accent}" ${HEADING} font-size="64">{{hours}}</text>
  <text id="teachers" x="65" y="1118" fill="${ink}" font-family="Arial" font-size="34">{{teachers}}</text>
  <g id="supporting-photos">
${subject.supporting.map((item, index) => `    <image x="${60 + index * 325}" y="1150" width="310" height="190" xlink:href="${photo(item, 310, 190)}"/>`).join('\n')}
  </g>
${subject.supporting.map((_, index) => `  <text id="supporting-${index + 1}" x="${60 + index * 325}" y="1378" fill="${ink}" ${HEADING} font-size="27">{{supporting-${index + 1}}}</text>`).join('\n')}
  <text id="venue" x="65" y="1428" fill="${ink}" font-family="Arial" font-size="31">{{venue}}</text>
  <text id="booking" x="65" y="1475" fill="${accent}" font-family="Arial" font-size="34">{{booking}}</text>
${footer}`,
};

for (const [id, subject] of Object.entries(config)) {
	if (['formatVersion', 'note', 'accentColor'].includes(id)) continue;
	const render = layouts[subject.layout];
	if (!render) throw Error(`${id}: unknown layout "${subject.layout}".`);
	if (subject.layout === 'workshop' && subject.supporting?.length !== 3) throw Error(`${id}: a workshop needs three supporting photos.`);
	writeFileSync(resolve(here, `${id}.svg`), render(subject));
	console.log(`Wrote ${id}.svg (${subject.layout})`);
}

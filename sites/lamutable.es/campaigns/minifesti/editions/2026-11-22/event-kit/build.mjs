// Renders a new event kit from an explicitly selected campaign text file,
// using the v07 artwork as the visual baseline for Instagram and WhatsApp
// Status and the whatsapp-group/ templates for WhatsApp group images. All wording on the images and
// in the exported copy comes from that file; nothing is derived
// from event.json or an earlier kit's copy files. Historical kits and the
// build-v01…v07 builders are preserved. See docs/campaign-text.md.
//
// node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs \
//   --text sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02 --version v09
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportedCopy, readCampaignText, sha256 } from '../../../../../../../scripts/lib/campaign-text.mjs';
import { bindLabels, escapeXml } from '../../../../../../../scripts/lib/svg-text-binding.mjs';
import { parseJsonNoDuplicateKeys } from '../../../../../../../scripts/lib/strict-json.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const edition = resolve(here, '..');
const repository = resolve(here, '../../../../../../..');
const templates = resolve(edition, '../../templates/v03');
const FONTS = {
	Arial: '/System/Library/Fonts/Supplemental/Arial.ttf',
	'Barlow Condensed': resolve(templates, 'fonts/BarlowCondensed-ExtraBold.ttf'),
};
const MARGIN = 65;
const CHANNEL_NAMES = { whatsapp: 'Estado de WhatsApp', instagram: 'Publicación de Instagram', 'whatsapp-group': 'Grupo de WhatsApp' };
const EXPECT = { site: 'lamutable.es', campaign: 'minifesti', edition: '2026-11-22' };

const repoPath = (path) => {
	const shown = relative(repository, path);
	return shown.startsWith('..') ? path : shown;
};
const readJson = (path) => parseJsonNoDuplicateKeys(readFileSync(path, 'utf8'), { label: repoPath(path) });

export function parseArgs(argv) {
	const values = {};
	for (let index = 0; index < argv.length; index += 1) {
		const match = /^--(text|version|output-root)(?:=(.*))?$/s.exec(argv[index]);
		if (!match) throw Error(`Unsupported argument "${argv[index]}". Usage: build.mjs --text <campaign text.json> --version <new kit version>`);
		const value = match[2] ?? argv[(index += 1)];
		if (!value || value.startsWith('--')) throw Error(`--${match[1]} requires a value.`);
		if (values[match[1]]) throw Error(`Duplicate --${match[1]}.`);
		values[match[1]] = value;
	}
	if (!values.text) throw Error('Missing --text: select the campaign text file explicitly.');
	if (!values.version) throw Error('Missing --version: name the new kit version, for example v08.');
	if (!/^v\d{2,}$/.test(values.version)) throw Error(`Invalid --version "${values.version}"; use v08, v09, …`);
	return values;
}

// groupCopy is optional; without it the draft keeps its original two-piece form.
export function emailDraft(subject, whatsappCopy, instagramCopy, groupCopy) {
	const attachments = groupCopy === undefined
		? `${subject.id}/whatsapp.png y ${subject.id}/instagram.png`
		: `${subject.id}/whatsapp.png, ${subject.id}/instagram.png y ${subject.id}/whatsapp-group.png`;
	const pieces = groupCopy === undefined ? 'las dos piezas' : 'las tres piezas';
	const group = groupCopy === undefined ? '' : `\n\n### Grupo de WhatsApp\n\n${groupCopy.replace(/\n$/, '')}`;
	return `## ${subject.title}\n\nAsunto: Para compartir · ${subject.title} · 22 noviembre\n\nAdjuntos: ${attachments}\n\nHola,\n\nAquí tienes ${pieces} de ${subject.title} para compartir desde tu cuenta cuando el equipo apruebe el kit. Guarda la imagen del canal que vayas a usar y copia su texto.\n\n### Estado de WhatsApp\n\n${whatsappCopy}\n\n### Publicación de Instagram\n\n${instagramCopy.replace(/\n$/, '')}${group}\n\nGracias por compartir movimiento en común.\n`;
}

export function emailDrafts(text) {
	const hasGroup = text.channels.includes('whatsapp-group');
	return '# Borradores de correo · pendientes de aprobación y envío manual\n\n' + text.subjects
		.map((subject) => emailDraft(subject, exportedCopy(text, subject.id, 'whatsapp'), exportedCopy(text, subject.id, 'instagram'), hasGroup ? exportedCopy(text, subject.id, 'whatsapp-group') : undefined))
		.join('\n');
}

// Validates everything and binds every label without touching the output
// location or invoking ImageMagick.
export function prepareBuild({ textPath, version, outputRoot = here, cwd = process.cwd() }) {
	const absoluteText = resolve(cwd, textPath);
	const campaignText = readCampaignText(absoluteText, { label: repoPath(absoluteText), expect: EXPECT });
	const { text } = campaignText;
	const bindingsPath = resolve(here, 'text-bindings.json');
	const bindingsBytes = readFileSync(bindingsPath);
	const bindings = readJson(bindingsPath);
	const baseline = resolve(here, bindings.baseline);
	const baselineManifest = readJson(resolve(baseline, 'manifest.json'));
	const baselineSubjects = [...new Set(baselineManifest.outputs.map((item) => item.file.split('/')[0]))];
	const subjectIds = text.subjects.map((subject) => subject.id);
	if (subjectIds.join() !== baselineSubjects.join()) {
		throw Error(`Campaign text subjects [${subjectIds}] do not match the ${bindings.baseline} baseline [${baselineSubjects}].`);
	}
	// Render the channels the text lists, in its order. Instagram and WhatsApp
	// Status are required; other bound channels, such as whatsapp-group, are
	// rendered when the text provides them.
	const channels = text.channels;
	const unknown = channels.filter((channel) => !(channel in bindings.channels));
	if (unknown.length) throw Error(`Campaign text channels [${unknown}] have no bindings; known channels are [${Object.keys(bindings.channels)}].`);
	for (const required of ['instagram', 'whatsapp']) {
		if (!channels.includes(required)) throw Error(`Campaign text must include the "${required}" channel.`);
	}
	const outputs = [];
	const sourceHashes = {};
	for (const subject of text.subjects) {
		if (subject.copy.whatsapp.includes('\n')) throw Error(`${subject.id}: WhatsApp copy must be one line.`);
		const layout = bindings.layouts[bindings.subjectLayouts[subject.id] ?? bindings.defaultLayout];
		for (const channel of channels) {
			const { source: sourceDir, width, height } = bindings.channels[channel];
			const file = sourceDir ? `${sourceDir}/${subject.id}.svg` : `${bindings.baseline}/${subject.id}/${channel}.svg`;
			const source = readFileSync(resolve(here, file));
			sourceHashes[`event-kit/${file}`] = sha256(source);
			if (!layout[channel]) throw Error(`${subject.id}: layout has no bindings for channel "${channel}".`);
			const { svg, placements } = bindLabels(source.toString('utf8'), layout[channel], subject.labels[channel], { where: `${subject.id}/${channel}` });
			outputs.push({ subject: subject.id, channel, svg, placements, width, height, copy: exportedCopy(text, subject.id, channel) });
		}
	}
	const out = resolve(cwd, outputRoot, version);
	if (existsSync(out)) throw Error(`${repoPath(out)} exists; preserve it and choose a new version.`);
	const altText = resolve(here, bindings.altText ?? `${bindings.baseline}/alt-text.md`);
	return { campaignText, bindings, altText, bindingsSha256: sha256(bindingsBytes), baseline, baselineManifest, sourceHashes, outputs, out, version };
}

function measure(magick, placement, width) {
	const { effective } = placement.element;
	const font = FONTS[effective['font-family']];
	if (!font) throw Error(`No font file for "${effective['font-family']}" (${placement.label}).`);
	const size = effective['font-size'];
	if (!size) throw Error(`No font size for label "${placement.label}".`);
	const measured = Number(magick(['-font', font, '-pointsize', size, `label:${placement.text}`, '-format', '%w', 'info:']).toString());
	const x = Number(effective.x);
	const max = placement.locator.maxWidth ?? (effective['text-anchor'] === 'end' ? x - MARGIN : width - MARGIN - x);
	if (measured > max) throw Error(`Text overflow in label "${placement.label}": ${JSON.stringify(placement.text)} (${measured} > ${max} px).`);
}

export function build(plan) {
	const brand = readJson(resolve(edition, '../../../../brand/tokens.json'));
	const env = { ...process.env, FONTCONFIG_FILE: resolve(templates, 'fontconfig.xml') };
	const magick = (args) => execFileSync('magick', args, { env, maxBuffer: 32 * 1024 * 1024 });
	const { campaignText, out } = plan;
	const { text } = campaignText;
	const staging = resolve(dirname(out), `.${plan.version}.staging-${process.pid}`);
	rmSync(staging, { recursive: true, force: true });
	mkdirSync(staging);
	try {
		const records = [];
		for (const output of plan.outputs) {
			for (const placement of output.placements) measure(magick, placement, output.width);
			const dir = resolve(staging, output.subject);
			mkdirSync(dir, { recursive: true });
			const base = resolve(dir, output.channel);
			writeFileSync(base + '.svg', output.svg);
			writeFileSync(base + '.txt', output.copy);
			// Omit timestamp chunks so repeated runs produce identical PNG bytes.
			magick(['-background', brand.colors.cream, 'MSVG:' + base + '.svg', '-define', 'png:exclude-chunks=date,time', base + '.png']);
			const dimensions = magick([base + '.png', '-format', '%w %h', 'info:']).toString();
			if (dimensions !== `${output.width} ${output.height}`) throw Error(`Unexpected dimensions for ${output.subject}/${output.channel}: ${dimensions}`);
			records.push({ file: `${output.subject}/${output.channel}.png`, dimensions: [output.width, output.height], sha256: sha256(readFileSync(base + '.png')) });
		}
		writeFileSync(resolve(staging, 'email-drafts.md'), emailDrafts(text));
		// Alt text describes the visuals, not the campaign text, so it is kept
		// next to the bindings (or with the visual baseline) and reviewed per kit.
		cpSync(plan.altText, resolve(staging, 'alt-text.md'));
		const manifest = {
			status: 'draft-pending-user-review',
			brandVersion: plan.baselineManifest.brandVersion,
			accentColor: plan.baselineManifest.accentColor,
			mediaCatalogueVersion: plan.baselineManifest.mediaCatalogueVersion,
			bookingUrl: plan.baselineManifest.bookingUrl,
			bookingChecked: plan.baselineManifest.bookingChecked,
			fonts: plan.baselineManifest.fonts,
			renderer: magick(['-version']).toString().split('\n')[0],
			text: {
				path: repoPath(campaignText.file),
				language: text.language,
				sha256: campaignText.sha256,
				...(text.googleDoc ? { googleDoc: text.googleDoc } : {}),
			},
			visualBaseline: { version: plan.bindings.baseline, bindings: 'event-kit/text-bindings.json', bindingsSha256: plan.bindingsSha256, sourceHashes: plan.sourceHashes },
			altText: { source: repoPath(plan.altText), status: 'carried-pending-review' },
			revision: { base: plan.bindings.baseline, date: new Date().toISOString().slice(0, 10), change: `Labels and copy from ${repoPath(campaignText.file)}; artwork from ${plan.bindings.baseline}.`, builder: 'build.mjs' },
			outputs: records,
		};
		writeFileSync(resolve(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
		const accent = plan.baselineManifest.accentColor;
		writeFileSync(resolve(staging, 'index.html'), `<!doctype html><html lang="${text.language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Minifesti · Event Kit</title><style>body{font:18px system-ui;max-width:1100px;margin:40px auto;padding:20px;background:${brand.colors.cream};color:${brand.colors.ink}}section{margin:60px 0}article{display:inline-block;vertical-align:top;width:46%;margin:1%}img{width:100%;height:540px;object-fit:contain}a{color:${accent}}@media(max-width:600px){article{width:98%}}</style><h1>Minifesti · 22 noviembre 2026</h1><p>Borrador para revisión.</p><p><a href="review.md">Notas de revisión</a> · <a href="email-drafts.md">Correos</a> · <a href="alt-text.md">Textos alternativos</a></p>${text.subjects.map((s) => `<section><h2>${escapeXml(s.title)}</h2>${text.channels.map((c) => `<article><h3>${CHANNEL_NAMES[c]}</h3><a href="${s.id}/${c}.png"><img src="${s.id}/${c}.png" alt="${escapeXml(s.title)}"></a><p><a href="${s.id}/${c}.png">Imagen PNG</a> · <a href="${s.id}/${c}.txt">Texto para copiar</a> · <a href="${s.id}/${c}.svg">SVG editable</a></p></article>`).join('')}</section>`).join('')}</html>`);
		magick(['montage', ...text.subjects.map((s) => resolve(staging, s.id, 'instagram.png')), '-thumbnail', '324x405', '-tile', `${text.subjects.length}x1`, '-geometry', '+10+10', '-background', brand.colors.cream, '-define', 'png:exclude-chunks=date,time', resolve(staging, 'contact-sheet.png')]);
		writeFileSync(resolve(staging, 'review.md'), `# Event Kit ${plan.version} · 22 noviembre 2026

Local draft for review. Every image label and all exported copy come from
${manifest.text.path} (SHA-256 ${campaignText.sha256})${text.googleDoc ? `, delivered as
${text.googleDoc}` : ''}. Artwork, photos and crops are the
${plan.bindings.baseline} baseline${text.channels.includes('whatsapp-group') ? ' and, for WhatsApp group images, the\nevent-kit/whatsapp-group templates,' : ''} bound through event-kit/text-bindings.json.
Text widths were measured with the actual fonts; ${records.length} output
dimensions verified.

Visuals, alt text, photo permissions, publication and sending are reviewed
separately. alt-text.md is carried from ${manifest.altText.source}
and must be checked against these images. Visual review is pending.

Reproduce: node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs --text ${manifest.text.path} --version <new version>
Requires ImageMagick and the existing fonts. Refuses to overwrite an existing
version. Local draft; no publishing or sending performed.
`);
		if (existsSync(out)) throw Error(`${repoPath(out)} appeared during the build; preserving it.`);
		renameSync(staging, out);
		return { out, records, manifest };
	} catch (error) {
		rmSync(staging, { recursive: true, force: true });
		throw error;
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = parseArgs(process.argv.slice(2));
		const plan = prepareBuild({ textPath: args.text, version: args.version, outputRoot: args['output-root'] ?? here });
		const { out, records } = build(plan);
		console.log(`Created ${records.length} images and their copy from ${plan.campaignText.label} in ${repoPath(out)}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exitCode = 1;
	}
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	CampaignTextError,
	campaignTextDiagnostics,
	exportedCopy,
	formatDocument,
	parseCampaignText,
	readCampaignText,
	serializeText,
	sha256,
	terminologyFindings,
} from '../scripts/lib/campaign-text.mjs';
import { main as campaignTextMain } from '../scripts/campaign-text.mjs';
import { bindLabels, extractLabels, listTextElements, SvgBindingError } from '../scripts/lib/svg-text-binding.mjs';
import { loadEffectiveTerminology } from '../scripts/lib/terminology.mjs';
import { emailDrafts, prepareBuild } from '../sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const edition = resolve(platformDir, 'sites/lamutable.es/campaigns/minifesti/editions/2026-11-22');
const v01Path = resolve(edition, 'text/v01/text.json');
const v07 = resolve(edition, 'event-kit/v07');
const bindings = JSON.parse(readFileSync(resolve(edition, 'event-kit/text-bindings.json'), 'utf8'));
const terminology = loadEffectiveTerminology(platformDir, 'lamutable.es');

function tempDir(context) {
	const directory = mkdtempSync(resolve(tmpdir(), 'circus-campaign-text-'));
	context.after(() => rmSync(directory, { recursive: true }));
	return directory;
}

function v01() {
	return JSON.parse(readFileSync(v01Path, 'utf8'));
}

// Writes text.json into a directory and returns its path.
function writeText(dir, text) {
	mkdirSync(dir, { recursive: true });
	const file = resolve(dir, 'text.json');
	writeFileSync(file, serializeText(text));
	return file;
}

function layoutFor(id) {
	return bindings.layouts[bindings.subjectLayouts[id] ?? bindings.defaultLayout];
}

test('migrated v01 preserves every v07 channel copy file byte-for-byte', () => {
	const text = v01();
	assert.deepEqual(text.subjects.map((subject) => subject.id), ['general', 'thai-yoga-massage', 'dance-lift', 'contact-improvisation', 'inward-yin-yoga']);
	let compared = 0;
	for (const subject of text.subjects) {
		for (const channel of text.channels) {
			const original = readFileSync(resolve(v07, subject.id, `${channel}.txt`));
			assert.ok(Buffer.from(exportedCopy(text, subject.id, channel)).equals(original), `${subject.id}/${channel}.txt`);
			compared += 1;
		}
	}
	assert.equal(compared, 10);
});

test('migrated v01 labels reproduce the v07 SVGs exactly and its email drafts', () => {
	const text = v01();
	for (const subject of text.subjects) {
		for (const channel of text.channels) {
			const svg = readFileSync(resolve(v07, subject.id, `${channel}.svg`), 'utf8');
			const layout = layoutFor(subject.id)[channel];
			assert.deepEqual(extractLabels(svg, layout), subject.labels[channel], `${subject.id}/${channel} labels`);
			assert.equal(bindLabels(svg, layout, subject.labels[channel]).svg, svg, `${subject.id}/${channel} rebinding`);
		}
	}
	assert.equal(emailDrafts(text), readFileSync(resolve(v07, 'email-drafts.md'), 'utf8'));
});

test('migrated v01 records matching source hashes and its historical terminology', () => {
	const { text } = readCampaignText(v01Path);
	assert.equal(Object.keys(text.migration.files).length, 20);
	for (const [path, hash] of Object.entries(text.migration.files)) {
		assert.equal(sha256(readFileSync(resolve(edition, path))), hash, path);
	}
	const concepts = new Set(terminologyFindings(text, terminology).map((finding) => finding.concept));
	assert.deepEqual([...concepts], ['contact-improvisation']);
});

test('validation rejects malformed and incomplete text with every problem listed', () => {
	const valid = v01();
	assert.deepEqual(campaignTextDiagnostics(valid), []);
	const broken = structuredClone(valid);
	broken.formatVersion = 2;
	broken.extra = true;
	broken.subjects[1].id = 'general';
	broken.subjects[2].id = '../escape';
	delete broken.subjects[3].copy.whatsapp;
	broken.subjects[4].labels.instagram.hours = '';
	broken.subjects[4].labels.whatsapp.date = 'two\nlines';
	broken.subjects[0].labels.instagram.venue = ' padded';
	broken.subjects[0].copy.facebook = 'Not a listed channel';
	broken.subjects[1].copy.instagram = 'carriage\r\nreturn';
	const diagnostics = campaignTextDiagnostics(broken).join('\n');
	for (const expected of [
		/formatVersion: unsupported value 2/,
		/unsupported key "extra"/,
		/duplicate subject "general"/,
		/"\.\.\/escape" is not a safe/,
		/subject "contact-improvisation"\.copy: missing channel "whatsapp"/,
		/inward-yin-yoga"\.labels\.instagram\.hours: missing or empty label/,
		/inward-yin-yoga"\.labels\.whatsapp\.date: labels are single-line/,
		/general"\.labels\.instagram\.venue: label has leading or trailing whitespace/,
		/channel "facebook" is not listed/,
		/no other control characters/,
	]) assert.match(diagnostics, expected);
	assert.throws(() => parseCampaignText(Buffer.from('{"formatVersion":1,"formatVersion":1}'), 'dup.json'), /Duplicate key "formatVersion"/);
	assert.throws(() => parseCampaignText(Buffer.from([0xff, 0xfe]), 'bad.json'), /not valid UTF-8/);
});

test('text is read from a file or directory, without revision metadata, and edited in place', (context) => {
	const root = tempDir(context);
	const text = v01();
	delete text.revision;
	delete text.migration;
	text.googleDoc = 'https://docs.google.com/document/d/abc_123-XY/edit';
	const file = writeText(resolve(root, 'any-name'), text);
	assert.equal(readCampaignText(resolve(root, 'any-name')).file, file);
	assert.equal(readCampaignText(file).text.googleDoc, text.googleDoc);
	writeFileSync(file, readFileSync(file, 'utf8').replace('MINIFESTI', 'MINIFESTI 2026'));
	assert.equal(readCampaignText(file).text.subjects[0].labels.instagram['event-name'], 'MINIFESTI 2026');
	assert.throws(() => readCampaignText(file, { expect: { edition: '2026-12-13' } }), /edition is "2026-11-22"/);
	assert.throws(() => readCampaignText(resolve(root, 'missing')), /not found/);
	assert.match(campaignTextDiagnostics({ ...text, googleDoc: 'https://example.com/doc' }).join('\n'), /googleDoc: must be/);
});

test('document export lists every label and keeps copy line breaks, escaped', () => {
	const text = v01();
	text.subjects[2].labels.whatsapp['workshop-name'] = 'DANCE & LIFT <EN PAREJA>';
	text.subjects[2].copy.instagram = 'Primera línea\nSegunda línea\n\nOtro párrafo\n';
	const html = formatDocument(text, { title: 'Minifesti · 22 noviembre' });
	assert.match(html, /<html lang="es">/);
	assert.match(html, /<h1>Minifesti · 22 noviembre<\/h1>/);
	assert.equal(html.match(/<h2>/g).length, text.subjects.length);
	assert.match(html, /<h3>WhatsApp<\/h3>/);
	assert.match(html, /<b>Texto en la imagen<\/b>/);
	assert.match(html, /<li>DANCE &amp; LIFT &lt;EN PAREJA&gt;<\/li>/);
	assert.match(html, /<p>Primera línea<br>Segunda línea<\/p>\n<p>Otro párrafo<\/p>/);
	for (const subject of text.subjects) for (const channel of text.channels) for (const label of Object.values(subject.labels[channel])) {
		assert.ok(html.includes(`<li>${label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`), label);
	}
	assert.match(formatDocument({ ...text, language: 'pl' }), /<b>Text on the image<\/b>/);
});

test('CLI shows text and writes the document without ImageMagick on PATH', (context) => {
	const root = tempDir(context);
	const { notes, ...text } = v01();
	assert.ok(notes);
	writeText(resolve(root, 'text'), text);
	const cli = resolve(platformDir, 'scripts/campaign-text.mjs');
	const env = { PATH: '', INIT_CWD: root };
	const show = spawnSync(process.execPath, [cli, 'show', 'text'], { env, encoding: 'utf8' });
	assert.equal(show.status, 0, show.stderr);
	assert.match(show.stdout, /Google Doc: not delivered yet/);
	assert.match(show.stdout, /supporting-2: CONTACTO/);
	assert.match(show.stdout, /Terminology findings \(6\)/);
	assert.doesNotMatch(show.stdout, /SHA-256|approv/i);
	const doc = spawnSync(process.execPath, [cli, 'doc', 'text', '--output', 'doc.html'], { env, encoding: 'utf8' });
	assert.equal(doc.status, 0, doc.stderr);
	assert.match(doc.stdout, /Wrote doc\.html[\s\S]*6 terminology finding/);
	assert.match(readFileSync(resolve(root, 'doc.html'), 'utf8'), /^<!doctype html>/);
	const again = spawnSync(process.execPath, [cli, 'doc', 'text', '--output', 'doc.html'], { env, encoding: 'utf8' });
	assert.equal(again.status, 2);
	assert.match(again.stderr, /exists; pass --force/);
	const lines = [];
	campaignTextMain(['doc', 'text', '--output', 'doc.html', '--force', '--title', 'T'], { out: (line) => lines.push(line), baseDir: root });
	assert.match(readFileSync(resolve(root, 'doc.html'), 'utf8'), /<h1>T<\/h1>/);
	assert.throws(() => campaignTextMain(['doc', 'text'], { baseDir: root }), /Missing --output/);
	assert.throws(() => campaignTextMain(['approve', 'text'], { baseDir: root }), /Unknown operation "approve"/);
});

test('builder refuses invalid or missing text before creating output', (context) => {
	const root = tempDir(context);
	const text = v01();
	delete text.subjects[0].copy.whatsapp;
	const file = writeText(resolve(root, 'text'), text);
	const outputRoot = resolve(root, 'kits');
	assert.throws(() => prepareBuild({ textPath: file, version: 'v08', outputRoot }), /missing channel "whatsapp"/);
	assert.throws(() => prepareBuild({ textPath: resolve(root, 'nowhere'), version: 'v08', outputRoot }), /not found/);
	assert.equal(existsSync(outputRoot), false);
});

test('builder binds labels and exports exact copy, identically on every run', (context) => {
	const root = tempDir(context);
	const text = v01();
	text.revision = 'v02';
	text.subjects[2].labels.whatsapp['workshop-name'] = 'DANCE & LIFT <EN PAREJA>';
	text.subjects[2].copy.instagram = 'Texto  con  espacios\n\n';
	const file = writeText(resolve(root, 'text'), text);
	const outputRoot = resolve(root, 'kits');
	const first = prepareBuild({ textPath: file, version: 'v08', outputRoot });
	const second = prepareBuild({ textPath: file, version: 'v08', outputRoot });
	assert.equal(first.outputs.length, 10);
	assert.deepEqual(first.outputs.map((output) => [output.svg, output.copy]), second.outputs.map((output) => [output.svg, output.copy]));
	const dance = first.outputs.find((output) => output.subject === 'dance-lift' && output.channel === 'whatsapp');
	assert.match(dance.svg, />DANCE &amp; LIFT &lt;EN PAREJA&gt;<\/text>/);
	assert.ok(!dance.svg.includes('>DANCE LIFT</text>'));
	assert.equal(first.outputs.find((output) => output.subject === 'dance-lift' && output.channel === 'instagram').copy, 'Texto  con  espacios\n\n');
	assert.equal(first.campaignText.file, file);
	assert.equal(existsSync(outputRoot), false, 'prepareBuild never writes output');
	mkdirSync(resolve(outputRoot, 'v08'), { recursive: true });
	assert.throws(() => prepareBuild({ textPath: file, version: 'v08', outputRoot }), /exists; preserve it/);
});

test('builder renders WhatsApp group images from their templates when the text lists the channel', (context) => {
	const root = tempDir(context);
	const current = resolve(edition, 'text/v02/text.json');
	const plan = prepareBuild({ textPath: current, version: 'v99', outputRoot: resolve(root, 'kits') });
	const { text } = plan.campaignText;
	assert.deepEqual(text.channels, ['instagram', 'whatsapp', 'whatsapp-group']);
	assert.equal(plan.outputs.length, 15);
	for (const subject of text.subjects) {
		const group = plan.outputs.find((output) => output.subject === subject.id && output.channel === 'whatsapp-group');
		assert.deepEqual([group.width, group.height], [1080, 1350]);
		assert.equal(group.copy, subject.copy['whatsapp-group']);
		assert.doesNotMatch(group.svg, /\{\{/);
		for (const label of Object.values(subject.labels['whatsapp-group'])) assert.ok(group.svg.includes(`>${label}</text>`), `${subject.id}: ${label}`);
		assert.ok(`event-kit/whatsapp-group/${subject.id}.svg` in plan.sourceHashes);
	}
	assert.match(emailDrafts(text), /### Grupo de WhatsApp\n\n\*Dance Lift: apoyándonos en movimiento\*\n/);
	assert.equal(plan.altText, resolve(edition, 'event-kit/alt-text.md'));

	const unknown = structuredClone(text);
	unknown.channels.push('facebook');
	for (const subject of unknown.subjects) { subject.labels.facebook = { x: 'X' }; subject.copy.facebook = 'X'; }
	assert.throws(() => prepareBuild({ textPath: writeText(resolve(root, 'unknown'), unknown), version: 'v99', outputRoot: resolve(root, 'kits') }), /\[facebook\] have no bindings/);
	const swapped = structuredClone(text);
	const contact = swapped.subjects.find((subject) => subject.id === 'contact-improvisation');
	contact.labels['whatsapp-group'] = { ...swapped.subjects[1].labels['whatsapp-group'] };
	assert.throws(() => prepareBuild({ textPath: writeText(resolve(root, 'swapped'), swapped), version: 'v99', outputRoot: resolve(root, 'kits') }), /no label for binding\(s\): workshop-name-1, workshop-name-2/);
});

test('builder rejects text that does not match its bindings or edition', (context) => {
	const root = tempDir(context);
	const cases = [
		[(text) => { delete text.subjects[1].labels.whatsapp['supporting-2']; }, /no label for binding\(s\): supporting-2/],
		[(text) => { text.subjects[1].labels.whatsapp.extra = 'Hidden'; }, /without a binding would not appear: extra/],
		[(text) => { text.subjects.pop(); }, /do not match the v07 baseline/],
		[(text) => { text.subjects[0].copy.whatsapp = 'two\nlines'; }, /WhatsApp copy must be one line/],
		[(text) => { text.edition = '2026-12-13'; }, /edition is "2026-12-13"/],
	];
	cases.forEach(([mutate, expected], index) => {
		const text = v01();
		mutate(text);
		const file = writeText(resolve(root, `text-${index}`), text);
		assert.throws(() => prepareBuild({ textPath: file, version: 'v08', outputRoot: resolve(root, 'kits') }), expected);
	});
});

test('SVG binding escapes text, inherits typography, and refuses residual or nested text', () => {
	const svg = '<svg font-family="Arial"><g font-size="27" fill="#000"><text x="1" y="2">OLD</text></g><text id="a" font-size="40">A</text></svg>';
	const [inherited, own] = listTextElements(svg);
	assert.equal(inherited.effective['font-size'], '27');
	assert.equal(inherited.effective['font-family'], 'Arial');
	assert.equal(own.effective['font-size'], '40');
	const layout = { first: { x: '1', y: '2' }, second: { id: 'a' } };
	assert.equal(bindLabels(svg, layout, { first: 'Q&A <1>', second: 'B' }).svg, svg.replace('>OLD<', '>Q&amp;A &lt;1&gt;<').replace('>A<', '>B<'));
	assert.deepEqual(extractLabels(svg.replace('OLD', 'Q&amp;A'), layout), { first: 'Q&A', second: 'A' });
	assert.throws(() => bindLabels(svg, { first: layout.first }, { first: 'x' }), /unbound <text> would keep baseline wording: "A"/);
	assert.throws(() => bindLabels(svg, { ...layout, third: { id: 'missing' } }, { first: 'x', second: 'y', third: 'z' }), /no <text> element matches id="missing"/);
	assert.throws(() => bindLabels(svg, { first: layout.first, again: layout.first, second: layout.second }, { first: 'x', again: 'y', second: 'z' }), /bind the same <text> element/);
	assert.throws(() => bindLabels(svg, layout, { first: '{{date}}', second: 'y' }), /unresolved template slot/);
	assert.throws(() => listTextElements('<svg><text>a<tspan>b</tspan></text></svg>'), SvgBindingError);
	assert.ok(new CampaignTextError('x') instanceof Error);
});

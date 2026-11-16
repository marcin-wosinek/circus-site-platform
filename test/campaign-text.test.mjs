import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	approvalStatus,
	approveRevision,
	CampaignTextError,
	campaignTextDiagnostics,
	createRevision,
	exportedCopy,
	parseCampaignText,
	readRevision,
	requireApprovedRevision,
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
const PRESERVE = { preserve: ['contact-improvisation'], reason: 'Historical v07 wording kept for the migration.' };

function tempDir(context) {
	const directory = mkdtempSync(resolve(tmpdir(), 'circus-campaign-text-'));
	context.after(() => rmSync(directory, { recursive: true }));
	return directory;
}

function v01() {
	return JSON.parse(readFileSync(v01Path, 'utf8'));
}

// Writes a revision directory named after its revision and returns its text.json path.
function writeRevision(root, text) {
	const dir = resolve(root, text.revision);
	mkdirSync(dir, { recursive: true });
	const file = resolve(dir, 'text.json');
	writeFileSync(file, serializeText(text));
	return file;
}

function approve(file, overrides = {}) {
	const revision = readRevision(file);
	return approveRevision({ path: file, expectedSha256: revision.sha256, reviewer: 'Test reviewer', terminology, now: new Date('2026-11-16T12:00:00Z'), ...PRESERVE, ...overrides });
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

test('migrated v01 records matching source hashes and stays unapproved', () => {
	const revision = readRevision(v01Path);
	assert.equal(Object.keys(revision.text.migration.files).length, 20);
	for (const [path, hash] of Object.entries(revision.text.migration.files)) {
		assert.equal(sha256(readFileSync(resolve(edition, path))), hash, path);
	}
	assert.equal(approvalStatus(revision).state, 'unapproved');
	const concepts = new Set(terminologyFindings(revision.text, terminology).map((finding) => finding.concept));
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

test('a revision must live in a directory named after it', (context) => {
	const root = tempDir(context);
	const dir = resolve(root, 'v99');
	mkdirSync(dir);
	writeFileSync(resolve(dir, 'text.json'), serializeText(v01()));
	assert.throws(() => readRevision(dir), /must live in a directory named "v01"/);
});

test('approval binds the reviewed hash and requires explicit terminology exceptions', (context) => {
	const file = writeRevision(tempDir(context), v01());
	const revision = readRevision(file);
	const base = { path: file, reviewer: 'Reviewer', terminology };
	assert.throws(() => approveRevision({ ...base, expectedSha256: 'abc' }), /--sha256/);
	assert.throws(() => approveRevision({ ...base, expectedSha256: '0'.repeat(64), ...PRESERVE }), /changed since it was reviewed/);
	assert.throws(() => approveRevision({ ...base, expectedSha256: revision.sha256 }), /unresolved terminology findings[\s\S]*contact-improvisation\.labels\.whatsapp\.workshop-name/);
	assert.throws(() => approveRevision({ ...base, expectedSha256: revision.sha256, preserve: ['contact-improvisation'] }), /requires --reason/);
	assert.throws(() => approveRevision({ ...base, expectedSha256: revision.sha256, preserve: ['contact-improvisation', 'acroyoga'], reason: 'x' }), /No terminology findings for: acroyoga/);
	assert.equal(existsSync(resolve(dirname(file), 'approval.json')), false);

	const { record } = approve(file);
	assert.equal(record.sha256, revision.sha256);
	assert.equal(record.reviewer, 'Test reviewer');
	assert.equal(record.approvedAt, '2026-11-16T12:00:00.000Z');
	assert.deepEqual(record.terminology.exceptions, [{ concept: 'contact-improvisation', reason: PRESERVE.reason, findings: 6 }]);
	assert.match(record.scope, /Does not approve visuals/);
	assert.equal(requireApprovedRevision(file).sha256, revision.sha256);
	assert.throws(() => approve(file), /already approved/);
	assert.deepEqual(readdirSync(dirname(file)).sort(), ['approval.json', 'text.json']);
});

test('text without findings is approved without exceptions', (context) => {
	const text = v01();
	text.subjects = text.subjects.filter((subject) => subject.id === 'thai-yoga-massage');
	const file = writeRevision(tempDir(context), text);
	const { record } = approve(file, { preserve: [], reason: undefined });
	assert.deepEqual(record.terminology, { site: 'lamutable.es', language: 'es', findings: [], exceptions: [] });
});

test('any change after approval invalidates it, including whitespace', (context) => {
	const file = writeRevision(tempDir(context), v01());
	assert.throws(() => requireApprovedRevision(file), /is not approved/);
	approve(file);
	writeFileSync(file, readFileSync(file, 'utf8').replace('Reserva en lamutable.es', 'Reserva en  lamutable.es'));
	assert.equal(approvalStatus(readRevision(file)).state, 'modified');
	assert.throws(() => requireApprovedRevision(file), /modified after approval/);
	assert.throws(() => approve(file), /never re-approved; create a new revision/);
	writeFileSync(file, `${readFileSync(file, 'utf8')}\n`);
	assert.throws(() => requireApprovedRevision(file), /modified after approval/);
});

test('create makes a new unapproved revision from a prior one and never overwrites', (context) => {
	const root = tempDir(context);
	const v01File = writeRevision(root, v01());
	approve(v01File);
	const created = createRevision({ sourcePath: v01File, sourceLabel: 'text/v01/text.json', outputDir: resolve(root, 'v02') });
	assert.equal(created.text.revision, 'v02');
	assert.deepEqual(created.text.basedOn, { path: 'text/v01/text.json', revision: 'v01', sha256: readRevision(v01File).sha256 });
	assert.equal(created.text.migration, undefined);
	assert.equal(approvalStatus(created).state, 'unapproved');
	assert.deepEqual(created.text.subjects, v01().subjects);
	assert.throws(() => createRevision({ sourcePath: v01File, outputDir: resolve(root, 'v02') }), /already exists/);

	const draft = v01();
	delete draft.revision;
	delete draft.subjects[0].copy.whatsapp;
	writeFileSync(resolve(root, 'draft.json'), JSON.stringify(draft));
	assert.throws(() => createRevision({ sourcePath: resolve(root, 'draft.json'), outputDir: resolve(root, 'v03') }), /general"\.copy: missing channel "whatsapp"/);
	assert.equal(existsSync(resolve(root, 'v03')), false);
});

test('CLI shows and approves text without ImageMagick on PATH', (context) => {
	const root = tempDir(context);
	const file = writeRevision(root, v01());
	const cli = resolve(platformDir, 'scripts/campaign-text.mjs');
	const env = { PATH: '', INIT_CWD: root };
	const show = spawnSync(process.execPath, [cli, 'show', 'v01'], { env, encoding: 'utf8' });
	assert.equal(show.status, 0, show.stderr);
	assert.match(show.stdout, /Approval: not approved/);
	assert.match(show.stdout, /supporting-2: CONTACTO/);
	assert.match(show.stdout, /Terminology findings \(6\)/);
	const hash = readRevision(file).sha256;
	assert.match(show.stdout, new RegExp(`--sha256 ${hash} --reviewer <name> --preserve-terminology contact-improvisation --reason <text>`));
	const refused = spawnSync(process.execPath, [cli, 'approve', 'v01', '--sha256', hash, '--reviewer', 'R'], { env, encoding: 'utf8' });
	assert.equal(refused.status, 2);
	assert.match(refused.stderr, /unresolved terminology findings/);
	const lines = [];
	campaignTextMain(['approve', 'v01', '--sha256', hash, '--reviewer', 'R', '--preserve-terminology', 'contact-improvisation', '--reason', 'Historical'], { out: (line) => lines.push(line), baseDir: root });
	assert.match(lines.join('\n'), /Approved revision "v01"/);
	assert.match(spawnSync(process.execPath, [cli, 'show', 'v01'], { env, encoding: 'utf8' }).stdout, /Approval: approved by R/);
	assert.throws(() => campaignTextMain(['approve', 'v01', '--reviewer', 'R'], { baseDir: root }), /Missing --sha256/);
	assert.throws(() => campaignTextMain(['create', '--from', 'v01/text.json'], { baseDir: root }), /Missing --output/);
});

test('builder refuses unapproved or modified text before creating output', (context) => {
	const root = tempDir(context);
	const file = writeRevision(resolve(root, 'text'), v01());
	const outputRoot = resolve(root, 'kits');
	assert.throws(() => prepareBuild({ textPath: file, version: 'v08', outputRoot }), /is not approved/);
	approve(file);
	writeFileSync(file, readFileSync(file, 'utf8').replace('MINIFESTI', 'MINIFEST'));
	assert.throws(() => prepareBuild({ textPath: file, version: 'v08', outputRoot }), /modified after approval/);
	assert.throws(() => prepareBuild({ textPath: resolve(root, 'text/v05'), version: 'v08', outputRoot }), /not found/);
	assert.equal(existsSync(outputRoot), false);
});

test('builder binds approved labels and exports exact copy, identically on every run', (context) => {
	const root = tempDir(context);
	const text = v01();
	text.revision = 'v02';
	text.subjects[2].labels.whatsapp['workshop-name'] = 'DANCE & LIFT <EN PAREJA>';
	text.subjects[2].copy.instagram = 'Texto  con  espacios\n\n';
	const file = writeRevision(resolve(root, 'text'), text);
	approve(file);
	const outputRoot = resolve(root, 'kits');
	const first = prepareBuild({ textPath: file, version: 'v08', outputRoot });
	const second = prepareBuild({ textPath: file, version: 'v08', outputRoot });
	assert.equal(first.outputs.length, 10);
	assert.deepEqual(first.outputs.map((output) => [output.svg, output.copy]), second.outputs.map((output) => [output.svg, output.copy]));
	const dance = first.outputs.find((output) => output.subject === 'dance-lift' && output.channel === 'whatsapp');
	assert.match(dance.svg, />DANCE &amp; LIFT &lt;EN PAREJA&gt;<\/text>/);
	assert.ok(!dance.svg.includes('>DANCE LIFT</text>'));
	assert.equal(first.outputs.find((output) => output.subject === 'dance-lift' && output.channel === 'instagram').copy, 'Texto  con  espacios\n\n');
	assert.equal(first.revision.text.revision, 'v02');
	assert.equal(existsSync(outputRoot), false, 'prepareBuild never writes output');
	mkdirSync(resolve(outputRoot, 'v08'), { recursive: true });
	assert.throws(() => prepareBuild({ textPath: file, version: 'v08', outputRoot }), /exists; preserve it/);
});

test('builder rejects revisions that do not match its bindings or edition', (context) => {
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
		text.revision = `v1${index}`;
		mutate(text);
		const file = writeRevision(resolve(root, 'text'), text);
		const hasFindings = terminologyFindings(text, terminology).length > 0;
		approve(file, hasFindings ? {} : { preserve: [], reason: undefined });
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

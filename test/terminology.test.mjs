import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	buildEffectiveTerminology,
	discouragedTerms,
	effectiveEntry,
	findDiscouragedTerms,
	loadEffectiveTerminology,
	missingTranslations,
	requireConcepts,
	TerminologyError,
} from '../scripts/lib/terminology.mjs';

const platformDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function tempDir(context) {
	const directory = mkdtempSync(resolve(tmpdir(), 'circus-terminology-'));
	context.after(() => rmSync(directory, { recursive: true }));
	return directory;
}

function glossary(concepts) {
	return { formatVersion: 1, concepts };
}

const SHARED = {
	label: 'terminology.json',
	data: glossary({
		'contact-improvisation': {
			context: 'Movement practice.',
			sources: ['issue-20'],
			languages: {
				es: { preferred: 'Contact improvisación', discouraged: ['Improvisación de contacto'] },
				en: { preferred: 'Contact improvisation', discouraged: ['Contact improv'] },
			},
		},
		acroyoga: {
			context: 'Partner practice.',
			sources: ['fixture'],
			languages: { es: { preferred: 'Acroyoga', discouraged: ['Acro yoga'] } },
		},
	}),
};

function project(concepts) {
	return { label: 'sites/example.org/brand/terminology.json', data: glossary(concepts) };
}

function rejects(shared, projectGlossary, pattern) {
	assert.throws(() => buildEffectiveTerminology(shared, projectGlossary), (error) => {
		assert.ok(error instanceof TerminologyError);
		assert.match(error.message, pattern);
		return true;
	});
}

test('shared terminology is effective when the project adds nothing', () => {
	const terminology = buildEffectiveTerminology(SHARED);
	assert.deepEqual(Object.keys(terminology.concepts), ['acroyoga', 'contact-improvisation']);
	const entry = effectiveEntry(terminology.concepts['contact-improvisation'], 'es');
	assert.equal(entry.preferred, 'Contact improvisación');
	assert.equal(entry.source, 'terminology.json');
	assert.equal(entry.overrides, null);
	assert.equal(terminology.files.project, null);
});

test('project additions and explicit overrides preserve unrelated shared languages and concepts', () => {
	const terminology = buildEffectiveTerminology(
		SHARED,
		project({
			'contact-improvisation': {
				languages: {
					es: { override: true, preferred: 'Contact impro', discouraged: ['Improvisación de contacto'], sources: ['project decision'] },
					ca: { preferred: 'Contact improvisació' },
				},
			},
			'site-name': { context: 'Project name.', sources: ['brand kit'], invariant: 'Example' },
		}),
	);
	const concept = terminology.concepts['contact-improvisation'];
	assert.equal(concept.context, 'Movement practice.');
	assert.equal(concept.definedIn, 'terminology.json');
	assert.deepEqual(effectiveEntry(concept, 'es'), {
		preferred: 'Contact impro',
		discouraged: ['Improvisación de contacto'],
		sources: ['project decision'],
		override: true,
		source: 'sites/example.org/brand/terminology.json',
		overrides: 'terminology.json',
		invariant: false,
	});
	assert.equal(effectiveEntry(concept, 'en').preferred, 'Contact improvisation');
	assert.equal(effectiveEntry(concept, 'en').source, 'terminology.json');
	assert.equal(effectiveEntry(concept, 'ca').overrides, null);
	assert.equal(effectiveEntry(terminology.concepts.acroyoga, 'es').preferred, 'Acroyoga');
	assert.equal(terminology.concepts['site-name'].definedIn, 'sites/example.org/brand/terminology.json');
});

test('an override without "override": true is rejected with file, concept and language', () => {
	rejects(
		SHARED,
		project({ acroyoga: { languages: { es: { preferred: 'Acro-yoga' } } } }),
		/sites\/example\.org\/brand\/terminology\.json, concept "acroyoga", language "es": replaces the terminology\.json entry; add "override": true/,
	);
});

test('an override declaration without a shared entry is rejected', () => {
	rejects(SHARED, project({ acroyoga: { languages: { fr: { override: true, preferred: 'Acroyoga' } } } }), /language "fr": declares "override": true but there is no shared entry/);
	rejects(SHARED, project({ juggling: { context: 'x', sources: ['y'], languages: { es: { override: true, preferred: 'Malabares' } } } }), /concept "juggling", language "es": declares "override"/);
	rejects(SHARED, project({ acroyoga: { languages: { ca: { override: false, preferred: 'Acroioga' } } } }), /"override" may only be true/);
	rejects({ label: 'terminology.json', data: glossary({ a: { context: 'x', sources: ['y'], languages: { es: { override: true, preferred: 'A' } } } }) }, null, /declares "override"/);
});

test('a project cannot change the identity or context of a shared concept', () => {
	rejects(SHARED, project({ acroyoga: { context: 'Changed.', languages: { ca: { preferred: 'Acroioga' } } } }), /cannot change "context" of a shared concept/);
});

test('do-not-translate names apply in every language without inventing translations', () => {
	const terminology = buildEffectiveTerminology(SHARED, project({ 'site-name': { context: 'Name.', sources: ['kit'], invariant: 'La Mutable' } }));
	const concept = terminology.concepts['site-name'];
	for (const language of ['es', 'en', 'fr', 'pt-BR']) {
		const entry = effectiveEntry(concept, language);
		assert.equal(entry.preferred, 'La Mutable');
		assert.equal(entry.invariant, true);
	}
	assert.deepEqual(missingTranslations(terminology, 'fr', ['site-name', 'acroyoga']), ['acroyoga']);
	rejects(SHARED, project({ n: { context: 'x', sources: ['y'], invariant: 'Name', languages: { es: { preferred: 'Nombre' } } } }), /"preferred" is not allowed: the concept is the do-not-translate name "Name"/);
});

test('invalid glossary data produces actionable diagnostics', () => {
	rejects({ label: 'terminology.json', data: { formatVersion: 2, concepts: {} } }, null, /unsupported formatVersion 2; expected 1/);
	rejects({ label: 'terminology.json', data: { formatVersion: 1, concepts: {}, extra: true } }, null, /unsupported field "extra"/);
	rejects({ label: 'terminology.json', data: glossary({ Bad_ID: { context: 'x', sources: ['y'], languages: { es: { preferred: 'A' } } } }) }, null, /concept IDs must be lowercase kebab-case/);
	rejects({ label: 'terminology.json', data: glossary({ a: { context: 'x', sources: ['y'], languages: { ES: { preferred: 'A' } } } }) }, null, /language "ES": language keys must look like/);
	rejects({ label: 'terminology.json', data: glossary({ a: { context: 'x', sources: ['y'], languages: { es: { preferred: ' ' } } } }) }, null, /"preferred" must be a non-empty string/);
	rejects({ label: 'terminology.json', data: glossary({ a: { sources: ['y'], languages: { es: { preferred: 'A' } } } }) }, null, /"context" must be a non-empty string/);
	rejects({ label: 'terminology.json', data: glossary({ a: { context: 'x', languages: { es: { preferred: 'A' } } } }) }, null, /"sources" must list at least one reference/);
	rejects({ label: 'terminology.json', data: glossary({ a: { context: 'x', sources: ['y'] } }) }, null, /define at least one language entry or an "invariant"/);
});

test('every diagnostic is reported together', () => {
	assert.throws(
		() => buildEffectiveTerminology({ label: 'terminology.json', data: glossary({ a: { context: 'x', sources: ['y'] }, b: { context: '', sources: ['y'], languages: { es: { preferred: 'B' } } } }) }),
		(error) => error.diagnostics.length === 2,
	);
});

test('conflicting preferred and discouraged wording is rejected', () => {
	const shared = (languages) => ({ label: 'terminology.json', data: glossary({ a: { context: 'x', sources: ['y'], languages } }) });
	rejects(shared({ es: { preferred: 'Acroyoga', discouraged: ['ACROYOGA'] } }), null, /"ACROYOGA" is both preferred and discouraged/);
	rejects(shared({ es: { preferred: 'Contact improvisación', discouraged: ['improvisación'] } }), null, /occurs inside the preferred wording/);
	rejects(shared({ es: { preferred: 'A', discouraged: ['B', 'b'] } }), null, /"b" is listed more than once/);
	rejects(
		SHARED,
		project({ partner: { context: 'x', sources: ['y'], languages: { es: { preferred: 'Partner', discouraged: ['Acroyoga'] } } } }),
		/discouraged variant "Acroyoga" occurs in the approved wording "Acroyoga" of concept "acroyoga"/,
	);
	rejects(
		SHARED,
		project({ other: { context: 'x', sources: ['y'], languages: { es: { preferred: 'Otro', discouraged: ['Acro yoga'] } } } }),
		/also discouraged by concept "acroyoga"/,
	);
});

test('absent project glossaries are allowed and malformed ones are rejected', (context) => {
	const directory = tempDir(context);
	writeFileSync(resolve(directory, 'terminology.json'), JSON.stringify(SHARED.data));
	mkdirSync(resolve(directory, 'sites/brand-only.org/brand'), { recursive: true });
	mkdirSync(resolve(directory, 'sites/empty.org'), { recursive: true });

	const terminology = loadEffectiveTerminology(directory, 'empty.org');
	assert.equal(terminology.files.project, null);
	assert.equal(terminology.siteId, 'empty.org');

	const projectFile = resolve(directory, 'sites/brand-only.org/brand/terminology.json');
	writeFileSync(projectFile, '{"formatVersion": 1, "concepts": {}, "concepts": {}}');
	assert.throws(() => loadEffectiveTerminology(directory, 'brand-only.org'), /Duplicate key "concepts" in sites\/brand-only\.org\/brand\/terminology\.json/);
	writeFileSync(projectFile, '{ not json');
	assert.throws(() => loadEffectiveTerminology(directory, 'brand-only.org'), /Invalid sites\/brand-only\.org\/brand\/terminology\.json/);
	writeFileSync(projectFile, Buffer.from([0x7b, 0xff, 0x7d]));
	assert.throws(() => loadEffectiveTerminology(directory, 'brand-only.org'), /is not valid UTF-8/);
	writeFileSync(projectFile, JSON.stringify(glossary({})));
	assert.equal(loadEffectiveTerminology(directory, 'brand-only.org').files.project, 'sites/brand-only.org/brand/terminology.json');
});

test('project folders resolve safely under sites/', (context) => {
	const directory = tempDir(context);
	writeFileSync(resolve(directory, 'terminology.json'), JSON.stringify(SHARED.data));
	mkdirSync(resolve(directory, 'sites'));
	mkdirSync(resolve(directory, 'outside'));
	symlinkSync(resolve(directory, 'outside'), resolve(directory, 'sites/linked.org'));
	for (const siteId of ['../outside', 'sites/x', '', '.', 'a/../b']) {
		assert.throws(() => loadEffectiveTerminology(directory, siteId), /Invalid site ID/);
	}
	assert.throws(() => loadEffectiveTerminology(directory, 'missing.org'), /Unknown project "missing\.org"/);
	assert.throws(() => loadEffectiveTerminology(directory, 'linked.org'), /resolves outside sites\//);
});

test('unknown concepts are rejected', () => {
	const terminology = buildEffectiveTerminology(SHARED);
	assert.throws(() => requireConcepts(terminology, ['acroyoga', 'nope']), /Unknown concept: nope\. Available: acroyoga, contact-improvisation/);
});

const ES_TERMS = discouragedTerms(buildEffectiveTerminology(SHARED), 'es');

test('discouraged variants match lowercase, mixed-case and uppercase presentation', () => {
	const text = 'improvisación de contacto\nImprovisación De Contacto\nIMPROVISACIÓN DE CONTACTO';
	const findings = findDiscouragedTerms(text, ES_TERMS);
	assert.deepEqual(findings.map(({ line, column, matched }) => [line, column, matched]), [
		[1, 1, 'improvisación de contacto'],
		[2, 1, 'Improvisación De Contacto'],
		[3, 1, 'IMPROVISACIÓN DE CONTACTO'],
	]);
	assert.equal(findings[0].preferred, 'Contact improvisación');
	assert.equal(findings[0].concept, 'contact-improvisation');
	assert.equal(findings[0].source, 'terminology.json');
});

test('matching reports correct source locations after accents, astral characters and punctuation', () => {
	const text = 'Línea uno\n🎪 Ven: «Improvisación de contacto», el sábado.\n';
	const [finding] = findDiscouragedTerms(text, ES_TERMS);
	assert.equal(finding.line, 2);
	assert.equal(finding.column, 9);
	assert.equal(finding.matched, 'Improvisación de contacto');
	assert.equal(finding.context, '🎪 Ven: «Improvisación de contacto», el sábado.');
});

test('matching normalizes Unicode and keeps decomposed source text intact', () => {
	const decomposed = 'Taller: Improvisación de contacto';
	const [finding] = findDiscouragedTerms(decomposed, ES_TERMS);
	assert.equal(finding.matched, 'Improvisación de contacto');
	assert.equal(finding.column, 9);
});

test('accents are significant and larger words are not matched', () => {
	const text = [
		'Improvisacion de contacto', // missing accent: a different spelling
		'Improvisación de contactos',
		'SuperImprovisación de contacto',
		'Acro yogaflow',
	].join('\n');
	assert.deepEqual(findDiscouragedTerms(text, ES_TERMS), []);
});

test('variants wrapped across lines or separated by extra whitespace are found', () => {
	const findings = findDiscouragedTerms('Taller: IMPROVISACIÓN DE\nCONTACTO and Acro  yoga', ES_TERMS);
	assert.deepEqual(findings.map(({ line, column, concept }) => [line, column, concept]), [
		[1, 9, 'contact-improvisation'],
		[2, 14, 'acroyoga'],
	]);
	assert.equal(findings[0].context, 'Taller: IMPROVISACIÓN DE ⏎ CONTACTO and Acro  yoga');
});

test('overlapping variants of one concept report the longest match once', () => {
	const terms = [
		{ concept: 'c', variant: 'Contact improv', preferred: 'P', source: 's' },
		{ concept: 'c', variant: 'Contact', preferred: 'P', source: 's' },
	];
	assert.deepEqual(findDiscouragedTerms('Contact improv jam', terms).map((finding) => finding.matched), ['Contact improv']);
});

function runCli(args, options = {}) {
	return spawnSync(process.execPath, [resolve(platformDir, 'scripts/terminology.mjs'), ...args], { cwd: platformDir, encoding: 'utf8', ...options });
}

test('the seeded glossary contains the reported Spanish term and La Mutable', () => {
	const terminology = loadEffectiveTerminology(platformDir, 'lamutable.es');
	assert.equal(effectiveEntry(terminology.concepts['contact-improvisation'], 'es').preferred, 'Contact improvisación');
	assert.deepEqual(effectiveEntry(terminology.concepts['contact-improvisation'], 'es').discouraged, ['Improvisación de contacto']);
	assert.equal(effectiveEntry(terminology.concepts['la-mutable'], 'en').preferred, 'La Mutable');
});

test('terminology:check reports findings with exit 1 and leaves the copy unchanged', (context) => {
	const directory = tempDir(context);
	const file = resolve(directory, 'copy.txt');
	const bytes = 'Clase de Contact improvisación.\nTALLER: IMPROVISACIÓN DE CONTACTO\n';
	writeFileSync(file, bytes);
	const result = runCli(['check', '--site', 'lamutable.es', '--language', 'es', file]);
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stdout, /copy\.txt:2:9: discouraged "IMPROVISACIÓN DE CONTACTO" \(concept "contact-improvisation", terminology\.json\); preferred: "Contact improvisación"/);
	assert.match(result.stdout, /context: TALLER: IMPROVISACIÓN DE CONTACTO/);
	assert.match(result.stdout, /1 terminology issue/);
	assert.equal(readFileSync(file, 'utf8'), bytes);
});

test('terminology:check passes clean copy and flags missing requested translations', (context) => {
	const directory = tempDir(context);
	const file = resolve(directory, 'copy.txt');
	writeFileSync(file, 'Contact improvisación con La Mutable.\n');
	const clean = runCli(['check', '--site=lamutable.es', '--language=es', '--concept', 'contact-improvisation', '--concept', 'la-mutable', file]);
	assert.equal(clean.status, 0, clean.stdout + clean.stderr);
	assert.match(clean.stdout, /No discouraged terminology found/);

	const missing = runCli(['check', '--site', 'lamutable.es', '--language', 'fr', '--concept', 'contact-improvisation', '--concept', 'la-mutable', file]);
	assert.equal(missing.status, 1);
	assert.match(missing.stdout, /missing translation: concept "contact-improvisation" has no approved "fr" wording/);
	assert.doesNotMatch(missing.stdout, /concept "la-mutable" has no/);
});

test('terminology:show displays effective terminology with provenance', () => {
	const result = runCli(['show', '--site', 'lamutable.es', '--language', 'es']);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Project glossary: sites\/lamutable\.es\/brand\/terminology\.json/);
	assert.match(result.stdout, /contact-improvisation \(defined in terminology\.json\)\n {2}Preferred: Contact improvisación\n {2}Discouraged: Improvisación de contacto/);
	assert.match(result.stdout, /la-mutable \(defined in sites\/lamutable\.es\/brand\/terminology\.json\)\n {2}Do not translate: La Mutable/);

	const missing = runCli(['show', '--site', 'lamutable.es', '--language', 'fr', '--concept', 'contact-improvisation']);
	assert.equal(missing.status, 1);
	assert.match(missing.stdout, /Missing: no approved "fr" wording/);
});

test('terminology commands reject invalid input with exit 2', (context) => {
	const directory = tempDir(context);
	const invalid = resolve(directory, 'invalid.txt');
	writeFileSync(invalid, Buffer.from([0x49, 0xff, 0x0a]));
	const cases = [
		[['check', '--site', 'lamutable.es', '--language', 'es', invalid], /invalid\.txt is not valid UTF-8/],
		[['check', '--site', 'lamutable.es', '--language', 'es', resolve(directory, 'missing.txt')], /Copy file not found/],
		[['check', '--site', 'lamutable.es', '--language', 'es', directory], /directories are not scanned recursively/],
		[['check', '--site', 'lamutable.es', '--language', 'es'], /requires at least one copy file/],
		[['check', '--site', '../sites', '--language', 'es', invalid], /Invalid site ID/],
		[['check', '--site', 'no-such-site.example', '--language', 'es', invalid], /Unknown project/],
		[['check', '--language', 'es', invalid], /Missing --site/],
		[['check', '--site', 'lamutable.es', '--language', 'Spanish', invalid], /Invalid language "Spanish"/],
		[['check', '--site', 'lamutable.es', '--language', 'es', '--concept', 'nope', invalid], /Unknown concept: nope/],
		[['check', '--site', 'lamutable.es', '--site', 'lamutable.es', '--language', 'es', invalid], /Duplicate option: --site/],
		[['check', '--site', 'lamutable.es', '--language', 'es', '--fix', invalid], /Unsupported option "--fix"/],
		[['show', '--site', 'lamutable.es', '--language', 'es', invalid], /does not take files/],
		[['rewrite', '--site', 'lamutable.es'], /Unknown operation "rewrite"/],
	];
	for (const [args, pattern] of cases) {
		const result = runCli(args);
		assert.equal(result.status, 2, `${args.join(' ')}\n${result.stdout}${result.stderr}`);
		assert.match(result.stderr, pattern);
	}
});

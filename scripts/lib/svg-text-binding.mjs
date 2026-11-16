// Binds reviewed labels into the live <text> elements of an SVG baseline.
//
// Each binding names one label and locates exactly one <text> element by its
// `id` or by its literal `x`/`y` attributes. Every <text> element in the SVG
// must be bound, so wording from an earlier visual can never survive
// unnoticed, and every label must be placed. Inserted text is XML-escaped.
import { CliError } from './cli-error.mjs';

export class SvgBindingError extends CliError {}

const TEXT_ELEMENT = /<text\b([^>]*)>([^<]*)<\/text>/g;
const GROUP_TAG = /<(\/?)(g|svg)\b([^>]*?)(\/?)>/g;
const ATTRIBUTE = /([:\w-]+)="([^"]*)"/g;
const INHERITABLE = ['font-family', 'font-size', 'font-weight', 'text-anchor', 'fill'];

export function escapeXml(value) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function unescapeXml(value) {
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'")
		.replaceAll('&amp;', '&');
}

function parseAttributes(source) {
	const attributes = {};
	for (const [, name, value] of source.matchAll(ATTRIBUTE)) attributes[name] = value;
	return attributes;
}

// Attributes inherited from enclosing <svg>/<g> elements at `offset`.
function inheritedAt(svg, offset) {
	const stack = [];
	for (const match of svg.slice(0, offset).matchAll(GROUP_TAG)) {
		const [, closing, , attributes, selfClosing] = match;
		if (selfClosing) continue;
		if (closing) stack.pop();
		else stack.push(parseAttributes(attributes));
	}
	const inherited = {};
	for (const attributes of stack) {
		for (const name of INHERITABLE) if (name in attributes) inherited[name] = attributes[name];
	}
	return inherited;
}

// Lists every <text> element with its own and effective attributes. Nested
// markup inside <text> (such as <tspan>) is rejected rather than half-bound.
export function listTextElements(svg) {
	const elements = [];
	for (const match of svg.matchAll(TEXT_ELEMENT)) {
		const attributes = parseAttributes(match[1]);
		elements.push({
			start: match.index,
			end: match.index + match[0].length,
			contentStart: match.index + match[0].indexOf('>') + 1,
			attributes,
			effective: { ...inheritedAt(svg, match.index), ...attributes },
			text: unescapeXml(match[2]),
		});
	}
	const opened = [...svg.matchAll(/<text\b/g)].length;
	if (opened !== elements.length) throw new SvgBindingError(`SVG contains ${opened - elements.length} <text> element(s) with nested markup; only plain single-line <text> elements can be bound.`);
	return elements;
}

function describeLocator(locator) {
	return locator.id ? `id="${locator.id}"` : `x="${locator.x}" y="${locator.y}"`;
}

function locate(elements, locator, where) {
	if (locator.id === undefined && (locator.x === undefined || locator.y === undefined)) {
		throw new SvgBindingError(`${where}: a binding needs "id" or both "x" and "y".`);
	}
	const matches = elements.filter((element) => (locator.id !== undefined
		? element.attributes.id === locator.id
		: element.attributes.x === String(locator.x) && element.attributes.y === String(locator.y)));
	if (matches.length !== 1) throw new SvgBindingError(`${where}: ${matches.length ? `${matches.length} <text> elements match` : 'no <text> element matches'} ${describeLocator(locator)}.`);
	return matches[0];
}

function resolveBindings(svg, bindings, where) {
	const elements = listTextElements(svg);
	const resolved = new Map();
	for (const [label, locator] of Object.entries(bindings)) {
		const element = locate(elements, locator, `${where} label "${label}"`);
		for (const [other, existing] of resolved) {
			if (existing.element === element) throw new SvgBindingError(`${where}: labels "${other}" and "${label}" bind the same <text> element.`);
		}
		resolved.set(label, { element, locator });
	}
	const bound = new Set([...resolved.values()].map(({ element }) => element));
	const residual = elements.filter((element) => !bound.has(element));
	if (residual.length) {
		throw new SvgBindingError(`${where}: unbound <text> would keep baseline wording: ${residual.map((element) => JSON.stringify(element.text)).join(', ')}.`);
	}
	return resolved;
}

// Reads the current wording of every bound element (for migrations and checks).
export function extractLabels(svg, bindings, { where = 'SVG' } = {}) {
	const labels = {};
	for (const [label, { element }] of resolveBindings(svg, bindings, where)) labels[label] = element.text;
	return labels;
}

// Returns the SVG with every bound element's content replaced by its label,
// plus the placed elements for measurement.
export function bindLabels(svg, bindings, labels, { where = 'SVG' } = {}) {
	const missing = Object.keys(bindings).filter((label) => !(label in labels));
	if (missing.length) throw new SvgBindingError(`${where}: reviewed text has no label for binding(s): ${missing.join(', ')}.`);
	const unbound = Object.keys(labels).filter((label) => !(label in bindings));
	if (unbound.length) throw new SvgBindingError(`${where}: reviewed label(s) without a binding would not appear: ${unbound.join(', ')}.`);
	const resolved = resolveBindings(svg, bindings, where);
	const placements = [...resolved].map(([label, { element, locator }]) => ({ label, text: labels[label], element, locator }))
		.sort((a, b) => a.element.start - b.element.start);
	let output = '';
	let cursor = 0;
	for (const { element, text } of placements) {
		const closing = element.end - '</text>'.length;
		output += svg.slice(cursor, element.contentStart) + escapeXml(text);
		cursor = closing;
	}
	output += svg.slice(cursor);
	if (/\{\{\s*[\w.-]+\s*\}\}/.test(output)) throw new SvgBindingError(`${where}: unresolved template slot remains.`);
	return { svg: output, placements };
}

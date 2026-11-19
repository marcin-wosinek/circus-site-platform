#!/usr/bin/env node
// Issue #27: measure WCAG contrast of hero text against the pixels behind it.
//
//   PLAYWRIGHT=~/workspace/fair-event-plugins/node_modules/@playwright/test/index.js \
//   node sites/brussels.fusion-circus.com/design/issue-27/contrast.mjs > contrast.json
//
// For each page, variant and viewport it hides the hero's text, captures the
// background under every heading, paragraph and button label, and reports the
// contrast against the text colour at the 2nd-percentile (near worst) pixel.
// Read-only against the local site at http://localhost:9794.
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const playwrightPath =
	process.env.PLAYWRIGHT ||
	join(homedir(), 'workspace/fair-event-plugins/node_modules/@playwright/test/index.js');
const playwright = await import(pathToFileURL(playwrightPath).href);
const chromium = playwright.chromium ?? playwright.default.chromium;

const BASE = process.env.BASE_URL || 'http://localhost:9794';
const PAGES = {
	home: '/',
	bodywork: '/personalised-bodywork-brussels/',
	thai: '/thai-yoga-massage-brussels/',
	kobido: '/kobido-massage-brussels/',
	vouchers: '/massage-gift-vouchers/',
	relax: '/relax-together/',
};
const VARIANTS = (process.env.VARIANTS || 'before,stack,scrim,fade,rec').split(',');
const VIEWPORTS = (process.env.VIEWPORTS || '360x800,390x844,768x1024,1280x900').split(',');

const lin = (c) => {
	c /= 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

function pixels(png) {
	const txt = execFileSync('magick', ['png:-', '-alpha', 'off', '-depth', '8', 'txt:-'], {
		input: png,
		maxBuffer: 1 << 28,
	}).toString();
	const out = [];
	for (const m of txt.matchAll(/:\s*\((\d+),(\d+),(\d+)/g)) {
		out.push([+m[1], +m[2], +m[3]]);
	}
	return out;
}

const browser = await chromium.launch();
const results = [];
for (const [key, path] of Object.entries(PAGES)) {
	for (const variant of VARIANTS) {
		const url = BASE + (variant === 'before' ? path : `/issue-27-${variant}-${key}/`);
		for (const vp of VIEWPORTS) {
			const [width, height] = vp.split('x').map(Number);
			const page = await browser.newPage({ viewport: { width, height } });
			await page.goto(url, { waitUntil: 'networkidle' });
			const items = await page.evaluate(() => {
				const hero = document.querySelector('main .wp-block-cover, .wp-block-cover');
				const els = hero.querySelectorAll(
					'.wp-block-cover__inner-container :is(h1, h2, p, .wp-block-button__link)'
				);
				const parse = (c) => c.match(/[\d.]+/g).slice(0, 4).map(Number);
				return [...els]
					.filter((el) => el.textContent.trim())
					.map((el, i) => {
						el.dataset.issue27 = String(i);
						const cs = getComputedStyle(el);
						const button = el.classList.contains('wp-block-button__link');
						return {
							i,
							tag: button ? 'button' : el.tagName.toLowerCase(),
							text: el.textContent.trim().slice(0, 40),
							color: parse(cs.color).slice(0, 3),
							fontSize: parseFloat(cs.fontSize),
							fontWeight: Number(cs.fontWeight),
							buttonBg: button && (parse(cs.backgroundColor)[3] ?? 1) > 0 ? parse(cs.backgroundColor).slice(0, 3) : null,
						};
					});
			});
			await page.addStyleTag({
				content: '[data-issue27], [data-issue27] * { -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; border-color: transparent !important; }',
			});
			for (const item of items) {
				let worst;
				if (item.buttonBg) {
					worst = ratio(item.color, item.buttonBg);
				} else {
					const locator = page.locator(`[data-issue27="${item.i}"]`);
					// Buttons: sample 4px inside the edge so an outline border is not
					// mistaken for background.
					const inset = item.tag === 'button' ? 4 : 0;
					const box = await locator.boundingBox();
					const png = inset
						? await page.screenshot({
								fullPage: true,
								clip: { x: box.x + inset, y: box.y + inset + (await page.evaluate(() => scrollY)), width: box.width - 2 * inset, height: box.height - 2 * inset },
							})
						: await locator.screenshot();
					const ratios = pixels(png).map((p) => ratio(item.color, p)).sort((a, b) => a - b);
					worst = ratios[Math.floor(ratios.length * 0.02)];
				}
				const large = item.fontSize >= 24 || (item.fontSize >= 18.66 && item.fontWeight >= 700);
				const need = large ? 3 : 4.5;
				results.push({
					key,
					variant,
					viewport: vp,
					element: item.tag,
					text: item.text,
					ratio: Math.round(worst * 100) / 100,
					need,
					pass: worst >= need,
				});
			}
			await page.close();
		}
	}
}
await browser.close();
console.log(JSON.stringify(results, null, 1));

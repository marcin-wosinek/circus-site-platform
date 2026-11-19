#!/usr/bin/env node
// Issue #27: overflow, 200% zoom and keyboard-focus checks for the hero
// previews. Read-only against http://localhost:9794. Focus captures are saved
// to screenshots/checks/.
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwright = await import(
	pathToFileURL(
		process.env.PLAYWRIGHT ||
			join(homedir(), 'workspace/fair-event-plugins/node_modules/@playwright/test/index.js')
	).href
);
const chromium = playwright.chromium ?? playwright.default.chromium;
const BASE = process.env.BASE_URL || 'http://localhost:9794';
const out = join(dirname(fileURLToPath(import.meta.url)), 'screenshots', 'checks');
mkdirSync(out, { recursive: true });

const KEYS = ['home', 'bodywork', 'thai', 'kobido', 'vouchers', 'relax'];
const VARIANT = process.env.VARIANT || 'rec';
// VARIANT=live checks the real pages carrying the shipped Photo hero style.
const LIVE = { home: '/', bodywork: '/personalised-bodywork-brussels/', thai: '/thai-yoga-massage-brussels/', kobido: '/kobido-massage-brussels/', vouchers: '/massage-gift-vouchers/', relax: '/relax-together/' };
const HERO = VARIANT === 'live' ? '.wp-block-cover.is-style-photo-hero' : '.wp-block-cover.fc-hero';
// 200% zoom of 360/390-wide phones and of the 1280 desktop.
const VIEWPORTS = ['360x800', '390x844', '768x1024', '1280x900', '180x400', '195x422', '640x450'];

const browser = await chromium.launch();
const rows = [];
for (const key of KEYS) {
	for (const vp of VIEWPORTS) {
		const [width, height] = vp.split('x').map(Number);
		const page = await browser.newPage({ viewport: { width, height } });
		await page.goto(VARIANT === 'live' ? `${BASE}${LIVE[key]}` : `${BASE}/issue-27-${VARIANT}-${key}/`, { waitUntil: 'networkidle' });
		const r = await page.evaluate((HERO) => {
			const hero = document.querySelector(HERO);
			const inner = hero.querySelector('.wp-block-cover__inner-container');
			const heroBox = hero.getBoundingClientRect();
			const clipped = [...inner.querySelectorAll('h1, p, .wp-block-button__link')].filter((el) => {
				const b = el.getBoundingClientRect();
				return b.right > heroBox.right + 1 || b.left < heroBox.left - 1 || b.bottom > heroBox.bottom + 1;
			}).length;
			const img = hero.querySelector('.wp-block-cover__image-background').getBoundingClientRect();
			return {
				overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
				clipped,
				imageH: Math.round(img.height),
			};
		}, HERO);
		rows.push({ key, vp, ...r });
		if (vp === '390x844' || vp === '1280x900') {
			// Tab until focus reaches the first hero button (if any), then capture it.
			const hasButton = await page.locator(`${HERO} .wp-block-button__link`).count();
			let reached = false;
			for (let i = 0; hasButton && i < 80 && !reached; i++) {
				await page.keyboard.press('Tab');
				reached = await page.evaluate(
					(HERO) => !!document.activeElement?.closest(`${HERO} .wp-block-button`),
					HERO
				);
			}
			rows.at(-1).focusReached = hasButton ? reached : 'no buttons';
			if (reached) {
				const box = await page.evaluate(() => {
					const el = document.activeElement;
					el.scrollIntoView({ block: 'center' });
					const b = el.getBoundingClientRect();
					return { y: b.y };
				});
				await page.screenshot({
					path: join(out, `focus-${VARIANT}-${key}-${vp}.png`),
					clip: { x: 0, y: Math.max(0, box.y - 60), width, height: Math.min(200, height - Math.max(0, box.y - 60)) },
				});
			}
		}
		await page.close();
	}
}
await browser.close();
console.table(rows);

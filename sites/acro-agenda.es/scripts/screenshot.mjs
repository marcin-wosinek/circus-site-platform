import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import screenshotConfig from '../screenshot.config.cjs';

const { screenshotDefaults, siteUrl } = screenshotConfig;

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const pagePath = args.find((argument, index) => !argument.startsWith('--') && args[index - 1] !== '--output') || '/';
const outputIndex = args.indexOf('--output');
const requestedOutput = outputIndex === -1 ? null : args[outputIndex + 1];
const pageUrl = new URL(pagePath, process.env.PAGE_URL || siteUrl).href;
const viewport = mobile ? screenshotDefaults.mobile : screenshotDefaults.desktop;
const pageName = pagePath.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'front-page';
const outputPath = resolve(requestedOutput || `artifacts/${pageName}-${mobile ? 'mobile' : 'desktop'}.png`);

await mkdir(resolve(outputPath, '..'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });

try {
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Screenshot saved to ${outputPath} (${viewport.width}px wide)`);
} finally {
  await browser.close();
}

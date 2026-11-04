// Renders the dev-only /og page (src/pages/[og].astro) to public/og.png,
// and the favicon to public/apple-touch-icon.png.
// Run with `npm run og`. Needs a Chromium for Playwright: `npx playwright install chromium`.
import { dev } from 'astro';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await dev({ root, logLevel: 'warn', server: { port: 4399 }, devToolbar: { enabled: false } });
const base = `http://localhost:${server.address.port}`;
const browser = await chromium.launch();

try {
	// A fixed time and zone, so the clocks pane reads the same on every run.
	const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce', timezoneId: 'UTC' });
	await page.clock.setFixedTime(new Date('2026-11-04T09:42:43Z'));
	// The demos fill their charts with Math.random(), so seed it (mulberry32) for the same image each run.
	await page.addInitScript(() => {
		let s = 0x6f707363;
		Math.random = () => {
			s = (s + 0x6d2b79f5) | 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	});
	await page.goto(`${base}/og`);
	await page.waitForSelector('html[data-ready]');
	await page.screenshot({ path: `${root}public/og.png` });

	const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
	// Square corners: iOS rounds the icon itself.
	const svg = (await readFile(`${root}public/favicon.svg`, 'utf8')).replace(' rx="6"', '');
	await icon.setContent(`<style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style>${svg}`);
	await icon.screenshot({ path: `${root}public/apple-touch-icon.png` });
	console.log('wrote public/og.png and public/apple-touch-icon.png');
} finally {
	await browser.close();
	await server.stop();
}

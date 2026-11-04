// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	// The production address: canonical and Open Graph URLs are built from it.
	site: 'https://opscope.stealth-factory.co',
	// Web Analytics comes from the <Analytics /> component in Base.astro (@vercel/analytics),
	// so the adapter must not inject its own copy of the script.
	// sitemap-index.xml, linked from robots.txt.
	integrations: [sitemap()],
	adapter: vercel({
		webAnalytics: { enabled: false },
	}),
});

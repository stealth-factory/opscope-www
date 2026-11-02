// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	// The production address: canonical and Open Graph URLs are built from it.
	site: 'https://opscope.stealth-factory.co',
	adapter: vercel({
		webAnalytics: { enabled: true },
	}),
});

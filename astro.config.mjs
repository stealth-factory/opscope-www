// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	// The production address: canonical and Open Graph URLs are built from it.
	site: 'https://opscope.stealth-factory.co',
	env: {
		schema: {
			// Google Analytics 4. Unset (previews, local builds): GA4 is off. See src/lib/analytics.ts.
			PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true, startsWith: 'G-' }),
		},
	},
	// Web Analytics comes from the <Analytics /> component in Base.astro (@vercel/analytics),
	// so the adapter must not inject its own copy of the script.
	// sitemap-index.xml, linked from robots.txt.
	integrations: [sitemap()],
	adapter: vercel({
		webAnalytics: { enabled: false },
	}),
});

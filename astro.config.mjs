// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	adapter: vercel({
		webAnalytics: { enabled: true },
	}),
});

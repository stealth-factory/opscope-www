/**
 * One way to send an analytics event: `track(name, data)` hands it to every
 * provider that is on.
 *
 * - Vercel Web Analytics: always. Its script comes from <Analytics /> in Base.astro.
 * - Google Analytics 4: when PUBLIC_GA_MEASUREMENT_ID is set at build time.
 *   GoogleAnalytics.astro then loads gtag.js, which also counts page views.
 *
 * Call sites never talk to a provider directly, so adding or dropping one
 * happens here only. Event names are snake_case, up to 40 characters (GA4's
 * limit), with a few flat properties each.
 */
import { track as vercelTrack } from '@vercel/analytics';
import { PUBLIC_GA_MEASUREMENT_ID } from 'astro:env/client';

export type EventData = Record<string, string | number | boolean | null>;

interface Provider {
	name: string;
	send(event: string, data: EventData): void;
}

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

const vercel: Provider = {
	name: 'vercel',
	send: (event, data) => vercelTrack(event, data),
};

const ga4: Provider = {
	name: 'ga4',
	send(event, data) {
		// GA4 has no null; leave the key out instead.
		const params = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));
		window.gtag?.('event', event, params);
	},
};

// gtag only exists when GoogleAnalytics.astro put it on the page.
const providers: Provider[] = [vercel, ...(PUBLIC_GA_MEASUREMENT_ID ? [ga4] : [])];

/** Send an event to every provider. One failing never stops the others, or the page. */
export function track(event: string, data: EventData = {}) {
	for (const p of providers) {
		try {
			p.send(event, data);
		} catch (e) {
			if (import.meta.env.DEV) console.warn(`[analytics] ${p.name} failed to send ${event}`, e);
		}
	}
}

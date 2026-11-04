/**
 * Custom events for Vercel Web Analytics. Pageviews come from <Analytics /> in
 * Base.astro; this adds what visitors do on the page.
 *
 * Every event carries at most two properties, and every value comes from a
 * fixed set (widget, theme and window ids, link names), except the gallery
 * search query, which is clipped. Nothing identifies a visitor.
 * The opscope CLI sends `opscope_start` to the same project.
 */
import { track } from '@vercel/analytics';
import { widgets } from '../data/widgets';

type Data = Record<string, string | number | boolean | null>;

const send = (name: string, data: Data) => {
	try {
		track(name, data);
	} catch {}
};

const names = new Set(widgets.map((w) => w.name));

/** A short name for an outbound link, or null for one we don't count. */
const linkName = (url: URL): Data | null => {
	if (url.hostname === 'www.npmjs.com') return { link: 'npm' };
	if (url.hostname !== 'github.com') return null;
	const widget = url.pathname.match(/\/widgets\/src\/widgets\/([^/]+)\//)?.[1];
	if (widget) return { link: 'widget_docs', widget: names.has(widget) ? widget : 'other' };
	if (url.pathname.endsWith('/releases')) return { link: 'releases' };
	if (url.hash === '#getting-them') return { link: 'install' };
	if (url.hash === '#readme') return { link: 'docs' };
	return { link: 'github' };
};

export function startAnalytics() {
	// Outbound links, by name. Middle clicks open tabs too, so count auxclick as well.
	const outbound = (e: MouseEvent) => {
		const a = (e.target as Element | null)?.closest?.('a[href^="http"]');
		if (!(a instanceof HTMLAnchorElement)) return;
		const hit = linkName(new URL(a.href));
		if (hit) send('outbound_click', hit);
	};
	document.addEventListener('click', outbound);
	document.addEventListener('auxclick', outbound);

	// Switching windows from the status line (or the back button). Not the first load.
	const windows = new Set([...document.querySelectorAll<HTMLElement>('[data-window]')].map((w) => w.id));
	window.addEventListener('hashchange', () => {
		const id = location.hash.slice(1);
		if (windows.has(id)) send('window_view', { window: id });
	});

	// Themes, from the status-line menu or the shell (see index.astro), or a ?theme= link.
	const fromUrl = new URLSearchParams(location.search).get('theme');
	if (fromUrl && fromUrl === document.documentElement.dataset.theme) send('theme_select', { theme: fromUrl, via: 'link' });
	document.addEventListener('opscope:theme-chosen', (e) => {
		const { id, via } = (e as CustomEvent<{ id: string; via: string }>).detail;
		send('theme_select', { theme: id, via });
	});

	// Gallery: group chips, and the search box once typing settles.
	document.addEventListener('click', (e) => {
		const chip = (e.target as Element | null)?.closest?.<HTMLElement>('.chip[data-group]');
		if (chip) send('widget_filter', { group: chip.dataset.group ?? 'all' });
	});
	const q = document.getElementById('q') as HTMLInputElement | null;
	const count = document.querySelector('[data-count]');
	let timer = 0;
	let last = '';
	q?.addEventListener('input', () => {
		clearTimeout(timer);
		timer = window.setTimeout(() => {
			const query = q.value.trim().toLowerCase().slice(0, 40);
			if (!query || query === last) return;
			last = query;
			send('widget_search', { query, results: parseInt(count?.textContent ?? '', 10) || 0 });
		}, 1200);
	});

	// The shell (see shell.ts): each command, and each widget demo that starts.
	document.addEventListener('opscope:command', (e) => {
		send('shell_command', { command: (e as CustomEvent<string>).detail });
	});
	document.addEventListener('opscope:widget-run', (e) => {
		const { name, via } = (e as CustomEvent<{ name: string; via: string }>).detail;
		send('widget_run', { widget: name, via });
	});

	// Copying a command from the page: the strongest sign someone is about to run it.
	document.addEventListener('copy', () => {
		const m = document.getSelection()?.toString().match(/npx opscope(?:[ \t]+([a-z-]+))?/);
		if (!m) return;
		const sub = m[1];
		const command = !sub ? 'npx opscope' : names.has(sub) || sub === 'doctor' ? `npx opscope ${sub}` : 'npx opscope other';
		send('command_copy', { command });
	});
}

/**
 * What visitors do on the page, as analytics events. Page views are counted by
 * the providers themselves; src/lib/analytics.ts sends each event to all of them
 * (Vercel Web Analytics, and GA4 when it is configured).
 *
 * Every event carries a few flat properties, and every value comes from a
 * fixed set (widget, theme and window ids, link names), except the gallery
 * search query, which is clipped. Nothing identifies a visitor.
 * The opscope CLI sends `opscope_start` to the same Vercel project.
 */
import { track as send, type EventData as Data } from '../lib/analytics';
import { widgets } from '../data/widgets';

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
	// Outbound links, by name. Middle clicks open tabs too, so count those as well,
	// but not right clicks, which only open the context menu.
	const outbound = (e: MouseEvent) => {
		const a = (e.target as Element | null)?.closest?.('a[href^="http"]');
		if (!(a instanceof HTMLAnchorElement)) return;
		const hit = linkName(new URL(a.href));
		if (hit) send('outbound_click', hit);
	};
	document.addEventListener('click', outbound);
	document.addEventListener('auxclick', (e) => {
		if (e.button === 1) outbound(e);
	});

	// Arriving on a window other than the first, from a link like /#widgets.
	const windows = document.querySelectorAll<HTMLElement>('[data-window]');
	const landed = [...windows].find((w) => !w.hidden);
	if (landed && landed !== windows[0]) send('window_view', { window: landed.id, via: 'link' });

	// Switching windows, and how: a status-line tab, or back/forward.
	// index.astro raises this from its window switch.
	document.addEventListener('opscope:window-shown', (e) => {
		const { id, via } = (e as CustomEvent<{ id: string; via: string }>).detail;
		send('window_view', { window: id, via });
	});

	// Widget panes: a click on the title bar or the live demo. Neither does anything; the
	// clicks show which widgets people are drawn to. Counted where it was clicked.
	document.addEventListener('click', (e) => {
		const t = e.target as Element | null;
		const pane = t?.closest?.<HTMLElement>('.pane[data-name]');
		if (!pane?.dataset.name || t?.closest('a')) return;
		const part = t?.closest('.pane-bar') ? 'bar' : t?.closest('.pane-body') ? 'demo' : null;
		if (!part) return;
		send('widget_click', { widget: pane.dataset.name, part, window: pane.closest<HTMLElement>('[data-window]')?.id ?? 'other' });
	});

	// The shell: the first time someone clicks into it, once per page view.
	document.querySelector('[data-term]')?.addEventListener('pointerdown', () => send('shell_focus'), { once: true });

	// Themes, from the status-line menu or the shell (see index.astro), or a ?theme= link.
	const fromUrl = new URLSearchParams(location.search).get('theme');
	if (fromUrl && fromUrl === document.documentElement.dataset.theme) send('theme_select', { theme: fromUrl, via: 'link' });
	document.addEventListener('opscope:theme-chosen', (e) => {
		const { id, via, from } = (e as CustomEvent<{ id: string; via: string; from: string }>).detail;
		send('theme_select', { theme: id, via, from });
	});
	// The status-line theme menu: opened, or closed without a pick. With the chosen
	// theme, not a previewed one: what people had on when they went looking.
	document.addEventListener('opscope:theme-menu', (e) => {
		const theme = document.querySelector('[data-theme-name]')?.textContent ?? 'other';
		send('theme_menu', { action: (e as CustomEvent<string>).detail, theme });
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
			// A cleared box ends a search, so the same query typed again counts again.
			if (!query) last = '';
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
		send('widget_run', { widget: (e as CustomEvent<string>).detail });
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

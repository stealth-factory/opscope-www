/** Terminal colour themes, from each theme's published palette. */
export const themes = [
	{ id: 'catppuccin-mocha', bg: '#1e1e2e', dark: '#11111b', slot: '#181825', fg: '#cdd6f4', muted: '#a6adc8', border: '#45475a', accent: '#cba6f7', onAccent: '#11111b', green: '#a6e3a1', blue: '#89b4fa', yellow: '#f9e2af' },
	{ id: 'tokyo-night', bg: '#1a1b26', dark: '#16161e', slot: '#16161e', fg: '#c0caf5', muted: '#a9b1d6', border: '#3b4261', accent: '#7aa2f7', onAccent: '#16161e', green: '#9ece6a', blue: '#7dcfff', yellow: '#e0af68' },
	{ id: 'gruvbox-dark', bg: '#282828', dark: '#1d2021', slot: '#1d2021', fg: '#ebdbb2', muted: '#bdae93', border: '#504945', accent: '#fabd2f', onAccent: '#1d2021', green: '#b8bb26', blue: '#83a598', yellow: '#fe8019' },
] as const;

export type Theme = (typeof themes)[number];

export const themeCss = themes
	.map((t, i) => {
		const sel = i === 0 ? `:root, [data-theme="${t.id}"]` : `[data-theme="${t.id}"]`;
		return `${sel}{--bg:${t.bg};--dark:${t.dark};--slot:${t.slot};--fg:${t.fg};--muted:${t.muted};--border:${t.border};--accent:${t.accent};--on-accent:${t.onAccent};--green:${t.green};--blue:${t.blue};--yellow:${t.yellow};}`;
	})
	.join('\n');

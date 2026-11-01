/**
 * Terminal colour themes, from each theme's published palette.
 *
 * Roles: `bg` is the terminal background, `dark` the status and title bars,
 * `muted` secondary text and `dim` decoration only (bar tracks, rules). Every
 * text role keeps at least 4.5:1 against `bg` and `dark`: where a theme's
 * own grey falls short the nearest palette colour stands in, and a red,
 * magenta, orange or blue that falls short is lightened just enough.
 */
export const themes = [
	{ id: 'catppuccin-mocha', name: 'Catppuccin Mocha', bg: '#1e1e2e', dark: '#11111b', slot: '#181825', fg: '#cdd6f4', muted: '#a6adc8', border: '#45475a', accent: '#cba6f7', onAccent: '#11111b', green: '#a6e3a1', blue: '#89b4fa', yellow: '#f9e2af', red: '#f38ba8', cyan: '#94e2d5', magenta: '#f5c2e7', orange: '#fab387', dim: '#585b70' },
	{ id: 'tokyo-night', name: 'Tokyo Night', bg: '#1a1b26', dark: '#16161e', slot: '#16161e', fg: '#c0caf5', muted: '#a9b1d6', border: '#3b4261', accent: '#7aa2f7', onAccent: '#16161e', green: '#9ece6a', blue: '#7aa2f7', yellow: '#e0af68', red: '#f7768e', cyan: '#7dcfff', magenta: '#bb9af7', orange: '#ff9e64', dim: '#414868' },
	{ id: 'gruvbox-dark', name: 'Gruvbox Dark', bg: '#282828', dark: '#1d2021', slot: '#1d2021', fg: '#ebdbb2', muted: '#bdae93', border: '#504945', accent: '#fabd2f', onAccent: '#1d2021', green: '#b8bb26', blue: '#83a598', yellow: '#fabd2f', red: '#fb5440', cyan: '#8ec07c', magenta: '#d3869b', orange: '#fe8019', dim: '#665c54' },
	{ id: 'dracula', name: 'Dracula', bg: '#282a36', dark: '#21222c', slot: '#21222c', fg: '#f8f8f2', muted: '#bfbfbf', border: '#44475a', accent: '#bd93f9', onAccent: '#21222c', green: '#50fa7b', blue: '#8be9fd', yellow: '#f1fa8c', red: '#ff5555', cyan: '#8be9fd', magenta: '#ff79c6', orange: '#ffb86c', dim: '#6272a4' },
	{ id: 'nord', name: 'Nord', bg: '#2e3440', dark: '#272c36', slot: '#272c36', fg: '#eceff4', muted: '#d8dee9', border: '#4c566a', accent: '#88c0d0', onAccent: '#2e3440', green: '#a3be8c', blue: '#81a1c1', yellow: '#ebcb8b', red: '#cf888f', cyan: '#8fbcbb', magenta: '#b690af', orange: '#d18b74', dim: '#4c566a' },
	{ id: 'rose-pine', name: 'Rosé Pine', bg: '#191724', dark: '#12101b', slot: '#1f1d2e', fg: '#e0def4', muted: '#908caa', border: '#403d52', accent: '#c4a7e7', onAccent: '#191724', green: '#9ccfd8', blue: '#9ccfd8', yellow: '#f6c177', red: '#eb6f92', cyan: '#ebbcba', magenta: '#c4a7e7', orange: '#ebbcba', dim: '#524f67' },
	{ id: 'one-dark', name: 'One Dark', bg: '#282c34', dark: '#21252b', slot: '#21252b', fg: '#d7dae0', muted: '#abb2bf', border: '#3e4451', accent: '#61afef', onAccent: '#21252b', green: '#98c379', blue: '#61afef', yellow: '#e5c07b', red: '#e17079', cyan: '#56b6c2', magenta: '#c678dd', orange: '#d19a66', dim: '#5c6370' },
	{ id: 'kanagawa', name: 'Kanagawa', bg: '#1f1f28', dark: '#16161d', slot: '#16161d', fg: '#dcd7ba', muted: '#c8c093', border: '#54546d', accent: '#7e9cd8', onAccent: '#16161d', green: '#98bb6c', blue: '#7fb4ca', yellow: '#e6c384', red: '#e46876', cyan: '#7aa89f', magenta: '#d27e99', orange: '#ffa066', dim: '#54546d' },
	{ id: 'everforest', name: 'Everforest', bg: '#2d353b', dark: '#232a2e', slot: '#232a2e', fg: '#d3c6aa', muted: '#9da9a0', border: '#475258', accent: '#a7c080', onAccent: '#232a2e', green: '#a7c080', blue: '#7fbbb3', yellow: '#dbbc7f', red: '#e67e80', cyan: '#83c092', magenta: '#d699b6', orange: '#e69875', dim: '#4f585e' },
	{ id: 'solarized-dark', name: 'Solarized Dark', bg: '#002b36', dark: '#00212b', slot: '#00212b', fg: '#eee8d5', muted: '#93a1a1', border: '#073642', accent: '#b58900', onAccent: '#002b36', green: '#859900', blue: '#3794d6', yellow: '#b58900', red: '#e56563', cyan: '#2aa198', magenta: '#dd629e', orange: '#d67147', dim: '#586e75' },
] as const;

export type Theme = (typeof themes)[number];

export const themeCss = themes
	.map((t, i) => {
		const sel = i === 0 ? `:root, [data-theme="${t.id}"]` : `[data-theme="${t.id}"]`;
		return `${sel}{--bg:${t.bg};--dark:${t.dark};--slot:${t.slot};--fg:${t.fg};--muted:${t.muted};--border:${t.border};--accent:${t.accent};--on-accent:${t.onAccent};--green:${t.green};--blue:${t.blue};--yellow:${t.yellow};--red:${t.red};--cyan:${t.cyan};--magenta:${t.magenta};--orange:${t.orange};--dim:${t.dim};}`;
	})
	.join('\n');

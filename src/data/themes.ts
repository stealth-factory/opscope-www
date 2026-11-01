/**
 * Terminal colour themes, from each theme's published palette.
 *
 * Roles: `bg` is the terminal background, `dark` the status and title bars,
 * `muted` secondary text and `dim` decoration only (bar tracks, rules). Every
 * text role keeps at least 4.5:1 against `bg` and `dark`: where a theme's
 * own grey falls short the nearest palette colour stands in, and a red,
 * magenta, orange or blue that falls short is lightened just enough.
 *
 * `from` groups the picker: palettes born as terminal or editor-wide
 * schemes, then popular VS Code themes carried over to the terminal.
 */
export const themes = [
	{ id: 'catppuccin-mocha', name: 'Catppuccin Mocha', bg: '#1e1e2e', dark: '#11111b', slot: '#181825', fg: '#cdd6f4', muted: '#a6adc8', border: '#45475a', accent: '#cba6f7', onAccent: '#11111b', green: '#a6e3a1', blue: '#89b4fa', yellow: '#f9e2af', red: '#f38ba8', cyan: '#94e2d5', magenta: '#f5c2e7', orange: '#fab387', dim: '#585b70', from: 'terminal' },
	{ id: 'tokyo-night', name: 'Tokyo Night', bg: '#1a1b26', dark: '#16161e', slot: '#16161e', fg: '#c0caf5', muted: '#a9b1d6', border: '#3b4261', accent: '#7aa2f7', onAccent: '#16161e', green: '#9ece6a', blue: '#7aa2f7', yellow: '#e0af68', red: '#f7768e', cyan: '#7dcfff', magenta: '#bb9af7', orange: '#ff9e64', dim: '#414868', from: 'terminal' },
	{ id: 'gruvbox-dark', name: 'Gruvbox Dark', bg: '#282828', dark: '#1d2021', slot: '#1d2021', fg: '#ebdbb2', muted: '#bdae93', border: '#504945', accent: '#fabd2f', onAccent: '#1d2021', green: '#b8bb26', blue: '#83a598', yellow: '#fabd2f', red: '#fb5440', cyan: '#8ec07c', magenta: '#d3869b', orange: '#fe8019', dim: '#665c54', from: 'terminal' },
	{ id: 'dracula', name: 'Dracula', bg: '#282a36', dark: '#21222c', slot: '#21222c', fg: '#f8f8f2', muted: '#bfbfbf', border: '#44475a', accent: '#bd93f9', onAccent: '#21222c', green: '#50fa7b', blue: '#8be9fd', yellow: '#f1fa8c', red: '#ff5555', cyan: '#8be9fd', magenta: '#ff79c6', orange: '#ffb86c', dim: '#6272a4', from: 'terminal' },
	{ id: 'nord', name: 'Nord', bg: '#2e3440', dark: '#272c36', slot: '#272c36', fg: '#eceff4', muted: '#d8dee9', border: '#4c566a', accent: '#88c0d0', onAccent: '#2e3440', green: '#a3be8c', blue: '#81a1c1', yellow: '#ebcb8b', red: '#cf888f', cyan: '#8fbcbb', magenta: '#b690af', orange: '#d18b74', dim: '#4c566a', from: 'terminal' },
	{ id: 'rose-pine', name: 'Rosé Pine', bg: '#191724', dark: '#12101b', slot: '#1f1d2e', fg: '#e0def4', muted: '#908caa', border: '#403d52', accent: '#c4a7e7', onAccent: '#191724', green: '#9ccfd8', blue: '#9ccfd8', yellow: '#f6c177', red: '#eb6f92', cyan: '#ebbcba', magenta: '#c4a7e7', orange: '#ebbcba', dim: '#524f67', from: 'terminal' },
	{ id: 'one-dark', name: 'One Dark', bg: '#282c34', dark: '#21252b', slot: '#21252b', fg: '#d7dae0', muted: '#abb2bf', border: '#3e4451', accent: '#61afef', onAccent: '#21252b', green: '#98c379', blue: '#61afef', yellow: '#e5c07b', red: '#e17079', cyan: '#56b6c2', magenta: '#c678dd', orange: '#d19a66', dim: '#5c6370', from: 'terminal' },
	{ id: 'kanagawa', name: 'Kanagawa', bg: '#1f1f28', dark: '#16161d', slot: '#16161d', fg: '#dcd7ba', muted: '#c8c093', border: '#54546d', accent: '#7e9cd8', onAccent: '#16161d', green: '#98bb6c', blue: '#7fb4ca', yellow: '#e6c384', red: '#e46876', cyan: '#7aa89f', magenta: '#d27e99', orange: '#ffa066', dim: '#54546d', from: 'terminal' },
	{ id: 'everforest', name: 'Everforest', bg: '#2d353b', dark: '#232a2e', slot: '#232a2e', fg: '#d3c6aa', muted: '#9da9a0', border: '#475258', accent: '#a7c080', onAccent: '#232a2e', green: '#a7c080', blue: '#7fbbb3', yellow: '#dbbc7f', red: '#e67e80', cyan: '#83c092', magenta: '#d699b6', orange: '#e69875', dim: '#4f585e', from: 'terminal' },
	{ id: 'solarized-dark', name: 'Solarized Dark', bg: '#002b36', dark: '#00212b', slot: '#00212b', fg: '#eee8d5', muted: '#93a1a1', border: '#073642', accent: '#b58900', onAccent: '#002b36', green: '#859900', blue: '#3794d6', yellow: '#b58900', red: '#e56563', cyan: '#2aa198', magenta: '#dd629e', orange: '#d67147', dim: '#586e75', from: 'terminal' },
	{ id: 'dark-modern', name: 'VS Code Dark Modern', bg: '#1f1f1f', dark: '#181818', slot: '#181818', fg: '#cccccc', muted: '#9d9d9d', border: '#3c3c3c', accent: '#4daafc', onAccent: '#181818', green: '#23d18b', blue: '#3b8eea', yellow: '#e5e510', red: '#f14c4c', cyan: '#29b8db', magenta: '#d670d6', orange: '#ce9178', dim: '#454545', from: 'vscode' },
	{ id: 'github-dark', name: 'GitHub Dark', bg: '#0d1117', dark: '#010409', slot: '#161b22', fg: '#e6edf3', muted: '#8d96a0', border: '#30363d', accent: '#58a6ff', onAccent: '#010409', green: '#3fb950', blue: '#58a6ff', yellow: '#d29922', red: '#ff7b72', cyan: '#39c5cf', magenta: '#bc8cff', orange: '#ffa657', dim: '#484f58', from: 'vscode' },
	{ id: 'monokai', name: 'Monokai', bg: '#272822', dark: '#1e1f1c', slot: '#1e1f1c', fg: '#f8f8f2', muted: '#a59f85', border: '#414339', accent: '#a6e22e', onAccent: '#1e1f1c', green: '#a6e22e', blue: '#66d9ef', yellow: '#e6db74', red: '#fa4989', cyan: '#66d9ef', magenta: '#ae81ff', orange: '#fd971f', dim: '#75715e', from: 'vscode' },
	{ id: 'night-owl', name: 'Night Owl', bg: '#011627', dark: '#010e1a', slot: '#0b2942', fg: '#d6deeb', muted: '#62829c', border: '#1d3b53', accent: '#82aaff', onAccent: '#011627', green: '#addb67', blue: '#82aaff', yellow: '#ecc48d', red: '#ef5350', cyan: '#7fdbca', magenta: '#c792ea', orange: '#f78c6c', dim: '#2c4a63', from: 'vscode' },
	{ id: 'ayu-mirage', name: 'Ayu Mirage', bg: '#1f2430', dark: '#1c212b', slot: '#1c212b', fg: '#cccac2', muted: '#828b9b', border: '#343b4c', accent: '#ffcc66', onAccent: '#1f2430', green: '#d5ff80', blue: '#73d0ff', yellow: '#ffd173', red: '#f28779', cyan: '#95e6cb', magenta: '#dfbfff', orange: '#ffad66', dim: '#4b5366', from: 'vscode' },
	{ id: 'palenight', name: 'Material Palenight', bg: '#292d3e', dark: '#202331', slot: '#202331', fg: '#a6accd', muted: '#8e93b1', border: '#3a3f58', accent: '#c792ea', onAccent: '#202331', green: '#c3e88d', blue: '#82aaff', yellow: '#ffcb6b', red: '#f07178', cyan: '#89ddff', magenta: '#c792ea', orange: '#f78c6c', dim: '#4e5579', from: 'vscode' },
	{ id: 'synthwave-84', name: "SynthWave '84", bg: '#262335', dark: '#1e1a2e', slot: '#241b2f', fg: '#f4eee4', muted: '#848bbd', border: '#495495', accent: '#ff7edb', onAccent: '#1e1a2e', green: '#72f1b8', blue: '#36f9f6', yellow: '#fede5d', red: '#fe4752', cyan: '#03edf9', magenta: '#ff7edb', orange: '#f97e72', dim: '#495495', from: 'vscode' },
	{ id: 'cobalt2', name: 'Cobalt2', bg: '#193549', dark: '#122738', slot: '#15232d', fg: '#ffffff', muted: '#aaaaaa', border: '#234e6d', accent: '#ffc600', onAccent: '#122738', green: '#3ad900', blue: '#4d9eef', yellow: '#ffc600', red: '#ff658e', cyan: '#80fcff', magenta: '#ff6294', orange: '#ff9d00', dim: '#2b5a7a', from: 'vscode' },
	{ id: 'shades-of-purple', name: 'Shades of Purple', bg: '#2d2b55', dark: '#1e1e3f', slot: '#28284e', fg: '#ffffff', muted: '#a599e9', border: '#4d4b85', accent: '#fad000', onAccent: '#1e1e3f', green: '#a5ff90', blue: '#878eff', yellow: '#fad000', red: '#ff628c', cyan: '#80fcff', magenta: '#fb94ff', orange: '#ff9d00', dim: '#5c5a99', from: 'vscode' },
	{ id: 'horizon', name: 'Horizon', bg: '#1c1e26', dark: '#16161c', slot: '#232530', fg: '#e0e0e0', muted: '#8183a2', border: '#2e303e', accent: '#e95378', onAccent: '#16161c', green: '#29d398', blue: '#26bbd9', yellow: '#fab795', red: '#e95678', cyan: '#59e1e3', magenta: '#ee64ac', orange: '#f09383', dim: '#3d4050', from: 'vscode' },
	{ id: 'poimandres', name: 'Poimandres', bg: '#1b1e28', dark: '#171922', slot: '#171922', fg: '#e4f0fb', muted: '#a6accd', border: '#303340', accent: '#5de4c7', onAccent: '#1b1e28', green: '#5de4c7', blue: '#89ddff', yellow: '#fffac2', red: '#d0679d', cyan: '#add7ff', magenta: '#fcc5e9', orange: '#f087bd', dim: '#506477', from: 'vscode' },
] as const;

export type Theme = (typeof themes)[number];

export const themeCss = themes
	.map((t, i) => {
		const sel = i === 0 ? `:root, [data-theme="${t.id}"]` : `[data-theme="${t.id}"]`;
		return `${sel}{--bg:${t.bg};--dark:${t.dark};--slot:${t.slot};--fg:${t.fg};--muted:${t.muted};--border:${t.border};--accent:${t.accent};--on-accent:${t.onAccent};--green:${t.green};--blue:${t.blue};--yellow:${t.yellow};--red:${t.red};--cyan:${t.cyan};--magenta:${t.magenta};--orange:${t.orange};--dim:${t.dim};}`;
	})
	.join('\n');

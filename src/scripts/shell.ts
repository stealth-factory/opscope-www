/**
 * The shell pane's terminal: a real terminal emulator (wterm) with a small
 * pretend shell. Visitors can list widgets, run a widget's demo full-pane,
 * switch themes and print install commands. Nothing runs on a server; the
 * demos are the same made-up ones the panes show.
 */
import { WTerm } from '@wterm/dom';
import '@wterm/dom/css';
import { demos } from './demos';
import type { Line } from './tui';
import { groups, widgets, docsUrl } from '../data/widgets';
import { themeGroups, themes } from '../data/themes';

const ESC = '\x1b[';
// Colour classes to SGR codes. The ANSI palette slots are mapped to the
// page theme in global.css (.term), so output follows theme changes.
const SGR: Record<string, string> = {
	fg: '39', mu: '90', dim: '30', acc: '92', g: '32', r: '31', y: '33', b: '34', c: '36', m: '35', o: '91', inv: '7',
};
const paint = (text: string, c = 'fg') => `${ESC}${SGR[c] ?? '39'}m${text}${ESC}0m`;
const link = (url: string, text = url) => `\x1b]8;;${url}\x1b\\${paint(text, 'b')}\x1b]8;;\x1b\\`;

/** A demo line as ANSI, clipped to `cols` characters. */
const ansi = (line: Line, cols: number) => {
	let left = cols;
	let out = '';
	for (const [text, c = 'fg'] of line) {
		if (left <= 0) break;
		const chars = [...text].slice(0, left);
		left -= chars.length;
		if (chars.length) out += paint(chars.join(''), c);
	}
	return out;
};

const names = widgets.map((w) => w.name);
const COMMANDS = ['help', 'ls', 'widgets', 'opscope', 'npx', 'theme', 'install', 'about', 'docs', 'github', 'clear', 'whoami', 'history', 'exit'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export async function startShell() {
	const host = document.querySelector<HTMLElement>('[data-term]');
	const shell = host?.closest<HTMLElement>('.shell');
	if (!host || !shell) return;

	host.textContent = '';
	const term = new WTerm(host, { autoResize: true, cursorBlink: !reduced.matches });
	await term.init();
	host.classList.add('ready');

	const out = (s = '') => term.write(s.replace(/\n/g, '\r\n'));

	// The intro above the terminal is ordinary output: once the cursor goes below the
	// pane's visible area, scroll the pane so it shows, pushing the intro up.
	const pane = host.parentElement;
	const follow = () =>
		requestAnimationFrame(() => {
			if (!pane || running) return;
			const row = term.bridge?.getCursor().row ?? term.rows - 1;
			const rowHeight = host.clientHeight / Math.max(1, term.rows);
			const top = host.offsetTop + row * rowHeight;
			const bottom = top + rowHeight + 8 - pane.clientHeight;
			// Down to show the cursor row; up too, if the pane was scrolled past it.
			if (bottom > pane.scrollTop) pane.scrollTop = bottom;
			else if (top < pane.scrollTop) pane.scrollTop = top;
		});
	// Clear the screen, and the intro above the terminal with it.
	const clear = () => {
		out(`${ESC}2J${ESC}3J${ESC}H`);
		shell.classList.add('cleared');
		pane?.scrollTo(0, 0);
	};
	const line = (s = '') => out(s + '\n');
	const prompt = () => out(`${paint('~/src', 'g')} ${paint('$', 'acc')} `);

	let buf = '';
	const history: string[] = [];
	let at = 0;
	let running: { stop: () => void } | null = null;

	const help = () => {
		line(paint('a pretend shell: the panes are demos with made-up numbers', 'mu'));
		line();
		const rows: [string, string][] = [
			['ls', 'list the widgets'],
			['opscope <widget>', 'run a widget here, q to quit'],
			['theme [name]', 'list themes, or switch to one'],
			['install [apt]', 'ways to get opscope: npx, brew, apt'],
			['about', 'what this is'],
			['docs', 'links to the docs'],
			['clear', 'clear the screen (or ctrl-l)'],
			['help', 'pick a command from a menu'],
		];
		for (const [c, d] of rows) line(`  ${paint(c.padEnd(18), 'acc')}${paint(d, 'mu')}`);
	};

	const ls = () => {
		for (const g of groups) {
			line(paint(`── ${g.label} ──`, 'mu'));
			for (const w of widgets.filter((x) => x.group === g.key)) {
				const room = Math.max(0, term.cols - 22);
				const desc = w.line.length > room ? w.line.slice(0, Math.max(0, room - 1)) + '…' : w.line;
				line(`  ${paint(w.name.padEnd(20), 'g')}${paint(desc, 'mu')}`);
			}
		}
		line(paint('run one with: opscope <widget>', 'mu'));
	};

	const theme = (arg?: string) => {
		const now = document.documentElement.dataset.theme;
		if (!arg) {
			for (const g of themeGroups) {
				line(paint(`── ${g.label} ──`, 'mu'));
				const ids = themes.filter((t) => t.group === g.id).map((t) => (t.id === now ? paint(t.id + '*', 'acc') : t.id));
				line('  ' + ids.join('  '));
			}
			line(paint('switch with: theme <name>', 'mu'));
			return;
		}
		if (!themes.some((t) => t.id === arg)) {
			line(`${paint('theme:', 'r')} no theme called ${arg}. ${paint('theme', 'acc')} lists them.`);
			return;
		}
		document.dispatchEvent(new CustomEvent('opscope:theme', { detail: arg }));
		line(`${paint('theme:', 'mu')} ${arg}`);
	};

	const run = (name: string) => {
		// Own keys only, so `opscope constructor` is not taken for a widget.
		const make = Object.hasOwn(demos, name) ? demos[name] : undefined;
		if (!make) {
			line(`${paint('opscope:', 'r')} no widget called ${name}. ${paint('ls', 'acc')} lists them.`);
			return false;
		}
		const demo = make();
		shell.classList.add('running');
		// The program covers the pane from its top, so bring the pane's own scroll back there.
		pane?.scrollTo(0, 0);
		// Clear scrollback so no old line peeks above the program in the spare height.
		out(`${ESC}?1049h${ESC}3J${ESC}?25l`);
		const draw = () => {
			const rows = Math.max(4, term.rows - 1);
			const frame = demo.render(term.cols, rows).slice(0, rows).map((l) => ansi(l, term.cols) + `${ESC}K`);
			const bar = ansi([[` q quit · ${name} · demo with made-up numbers · npx opscope ${name} for the real one`, 'mu']], term.cols);
			term.write(`${ESC}H${frame.join('\r\n')}${ESC}J${ESC}${term.rows};1H${bar}${ESC}K`);
		};
		// Animate only while the shell is on screen, the tab is visible and motion is allowed,
		// like the panes in run-demos.ts.
		let timer = 0;
		let visible = true;
		const sync = () => {
			clearInterval(timer);
			timer = 0;
			if (visible && !document.hidden && !reduced.matches) timer = window.setInterval(() => (demo.tick(), draw()), demo.every);
		};
		const seen = new IntersectionObserver((entries) => {
			visible = entries[entries.length - 1].isIntersecting;
			if (visible) draw();
			sync();
		});
		seen.observe(host);
		document.addEventListener('visibilitychange', sync);
		reduced.addEventListener('change', sync);
		sync();
		term.onResize = () => draw();
		// The pane just grew to full size: refit the grid, then draw.
		requestAnimationFrame(() => {
			term.fit();
			draw();
		});
		running = {
			stop() {
				clearInterval(timer);
				seen.disconnect();
				document.removeEventListener('visibilitychange', sync);
				reduced.removeEventListener('change', sync);
				term.onResize = idleResize;
				out(`${ESC}?1049l${ESC}?25h`);
				shell.classList.remove('running');
				requestAnimationFrame(() => {
					term.fit();
					follow();
				});
				running = null;
				prompt();
			},
		};
		return true;
	};

	const exec = (input: string) => {
		const [cmd = '', ...args] = input.trim().split(/\s+/);
		const words = cmd === 'npx' ? args : [cmd, ...args];
		const [head = '', arg] = words;
		switch (head) {
			case '':
				return;
			case 'help':
			case '?':
				return arg === '--list' ? help() : mainMenu();
			case 'ls':
			case 'widgets':
				return ls();
			case 'opscope':
				if (arg === '--about' || arg === 'about') return about();
				if (arg === 'doctor') return line(paint('doctor checks what your machine has. Run it for real: npx opscope doctor', 'mu'));
				if (!arg) {
					line(paint('the launcher picks a widget for you. Here, name one:', 'mu'));
					return ls();
				}
				return void run(arg);
			case 'theme':
				return theme(arg);
			case 'install':
				return install(arg);
			case 'about':
				return about();
			case 'docs':
			case 'github':
				line(link('https://github.com/stealth-factory/opscope#readme'));
				if (arg && names.includes(arg)) line(link(docsUrl(arg)));
				return;
			case 'clear':
				return clear();
			case 'whoami':
				return line('guest');
			case 'history':
				return history.forEach((h, i) => line(`${paint(String(i + 1).padStart(4), 'mu')}  ${h}`));
			case 'exit':
			case 'logout':
				return line(paint('There is no way out. Try: theme digital-rain', 'mu'));
			case 'sudo':
				return line(paint('Nice try.', 'r'));
			default:
				if (names.includes(head)) return void run(head);
				line(`zsh: command not found: ${head}  ${paint('(try help)', 'mu')}`);
		}
	};

	// The same steps as the opscope README's "Getting them" and docs/debian.md.
	const install = (which?: string) => {
		const cmd = (c: string) => line(`${paint('$', 'acc')} ${c}`);
		const all = !which || !['npx', 'npm', 'brew', 'apt'].includes(which);
		if (all || which === 'npx' || which === 'npm') {
			line(paint('# npx (recommended): nothing to install, needs Node', 'mu'));
			cmd('npx opscope');
		}
		if (all || which === 'brew') {
			if (all) line();
			line(paint('# Homebrew on macOS: the full name taps stealth-factory/tap', 'mu'));
			cmd('brew install stealth-factory/tap/opscope');
		}
		if (all) {
			// The source setup is long for this pane, so the overview points at it.
			line();
			line(paint('# APT on Debian 12+ / Ubuntu 22.04+, amd64: add our signed source once', 'mu'));
			cmd('sudo apt install opscope');
			line(`${paint('the one-time setup:', 'mu')} ${paint('install apt', 'acc')}`);
		}
		if (which === 'apt') {
			line(paint('# APT on Debian 12+ / Ubuntu 22.04+, amd64: add the signed source once', 'mu'));
			cmd('sudo apt install ca-certificates curl gnupg');
			cmd('sudo install -d -m 0755 /etc/apt/keyrings');
			cmd('curl -fsSL https://stealth-factory.github.io/apt-repo/stealth-factory.asc | sudo tee /etc/apt/keyrings/stealth-factory.asc >/dev/null');
			cmd('gpg --show-keys --fingerprint /etc/apt/keyrings/stealth-factory.asc');
			line(paint('# stop unless it shows 95AD 7776 2F38 D1AE CCD7  BFC9 2A5C 45AE C00E 7388', 'y'));
			cmd("echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/stealth-factory.asc] https://stealth-factory.github.io/apt-repo stable main' | sudo tee /etc/apt/sources.list.d/stealth-factory.list");
			cmd('sudo apt update && sudo apt install opscope');
			line(`${paint('details:', 'mu')} ${link('https://github.com/stealth-factory/opscope/blob/main/docs/debian.md', 'docs/debian.md')}`);
		}
		if (all) {
			line();
			line(`${paint('more:', 'mu')} ${link('https://github.com/stealth-factory/opscope#getting-them')}  ${paint('(or install npx|brew|apt)', 'mu')}`);
		}
	};

	const about = () => {
		line(paint('# Hollywood called. They want their terminal back.', 'mu'));
		line(`Sci-fi hacker panels, except every number on them is ${paint('real', 'acc')}.`);
		line(`${widgets.length} widgets for Linux and macOS. ${paint('ls', 'acc')} to see them.`);
	};

	const complete = () => {
		const parts = buf.split(' ');
		const last = parts[parts.length - 1];
		const pool = parts.length === 1 ? [...COMMANDS, ...names] : parts[0] === 'theme' ? themes.map((t) => t.id) : parts[0] === 'install' ? ['npx', 'brew', 'apt'] : names;
		const hits = pool.filter((p) => p.startsWith(last));
		if (hits.length === 1) {
			const add = hits[0].slice(last.length) + ' ';
			buf += add;
			out(add);
		} else if (hits.length > 1) {
			out('\n' + paint(hits.join('  '), 'mu') + '\n');
			prompt();
			out(buf);
		}
	};

	// Replace the typed command by redrawing it from the prompt, so a command that
	// wrapped onto more rows is cleared too ("\b" cannot climb back to an earlier row).
	const PROMPT_WIDTH = '~/src $ '.length;
	const replace = (next: string) => {
		const used = PROMPT_WIDTH + [...buf].length;
		// The row the cursor sits on: after exactly filling a row it waits at the last column.
		const up = used > 0 ? Math.floor((used - 1) / term.cols) : 0;
		out(`\r${up ? `${ESC}${up}A` : ''}${ESC}J`);
		prompt();
		buf = next;
		out(buf);
	};

	// A picker like `gum choose`: arrow keys or the mouse move, enter or a click runs.
	// It is drawn under the prompt and redrawn in place; typing anything else closes it
	// and starts an ordinary command line.
	type Item = { label: string; hint: string; pick: () => void };
	// `lens` holds the visible length of each drawn line, to count its rows after a reflow.
	type Menu = { title: string; items: Item[]; at: number; top: number; drawn: number; lens: number[]; move?: (i: number) => void; cancel?: () => void };
	let menu: Menu | null = null;
	// Any-motion mouse reports (for hover) in SGR form, only while a picker is open.
	const MOUSE_ON = `${ESC}?1003h${ESC}?1006h`;
	const MOUSE_OFF = `${ESC}?1003l${ESC}?1006l`;
	const clip = (text: string, n: number) => {
		const chars = [...text];
		return chars.length > n ? chars.slice(0, Math.max(0, n - 1)).join('') + '…' : text;
	};
	const visible = (m: Menu) => Math.max(3, Math.min(m.items.length, term.rows - 4));
	const scrolls = (m: Menu) => m.items.length > visible(m);
	// Rows the drawn picker takes now: the terminal reflows its lines when it narrows.
	const rowsTaken = (m: Menu) => m.lens.reduce((n, len) => n + Math.max(1, Math.ceil(len / term.cols)), 0);
	const erase = (m: Menu) => {
		const rows = rowsTaken(m);
		if (rows) out(`\r${rows > 1 ? `${ESC}${rows - 1}A` : ''}${ESC}J`);
		m.drawn = 0;
		m.lens = [];
	};
	const draw = (m: Menu) => {
		const n = visible(m);
		if (m.at < m.top) m.top = m.at;
		if (m.at >= m.top + n) m.top = m.at - n + 1;
		const width = term.cols - 1;
		const labelWidth = Math.min(Math.floor(width / 2), Math.max(...m.items.map((i) => [...i.label].length)) + 2);
		const lines = [`${paint('?', 'g')} ${ESC}1m${clip(m.title, width - 2)}${ESC}0m`];
		for (let i = m.top; i < Math.min(m.items.length, m.top + n); i++) {
			const it = m.items[i];
			const label = clip(it.label, labelWidth - 1).padEnd(labelWidth);
			const room = Math.max(0, width - 2 - labelWidth);
			const hint = clip(it.hint, room);
			// The chosen row is a full-width bar (ANSI colour 0, the theme's dim colour).
			lines.push(
				i === m.at
					? `${ESC}40;92m❯ ${ESC}1m${label}${ESC}22;39m${hint.padEnd(room)}${ESC}0m`
					: `  ${label}${paint(hint, 'mu')}`,
			);
		}
		const keys = '↑↓ move · enter run · esc type instead';
		const more = scrolls(m) ? `${m.top + 1}-${Math.min(m.items.length, m.top + n)} of ${m.items.length} · ` : '';
		lines.push(paint(clip(more + keys, width), 'mu'));
		erase(m);
		out(lines.join('\n'));
		m.drawn = lines.length;
		m.lens = lines.map((l) => [...l.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')].length);
		follow();
	};
	const open = (title: string, items: Item[], at = 0, more: Partial<Menu> = {}) => {
		if (!menu) out(`${MOUSE_ON}${ESC}?25l`);
		menu = { title, items, at, top: 0, drawn: 0, lens: [], ...more };
		draw(menu);
	};
	const close = () => {
		if (!menu) return;
		erase(menu);
		menu = null;
		out(`${MOUSE_OFF}${ESC}?25h`);
	};
	const move = (m: Menu, to: number) => {
		const next = Math.max(0, Math.min(m.items.length - 1, to));
		if (next === m.at) return;
		m.at = next;
		m.move?.(next);
		draw(m);
	};
	const choose = (m: Menu) => {
		const it = m.items[m.at];
		close();
		it.pick();
	};
	const dismiss = (m: Menu) => {
		close();
		m.cancel?.();
		prompt();
	};
	// Run a picked command as if it was typed at the prompt, so the screen keeps a history.
	const typed = (cmd: string) => {
		prompt();
		line(cmd);
		history.push(cmd);
		at = history.length;
		exec(cmd);
		if (!running && !menu) prompt();
		follow();
	};
	const mainMenu = () =>
		open('What would you like to do?', [
			{ label: 'opscope <widget>', hint: 'run a widget demo here', pick: widgetMenu },
			{ label: 'ls', hint: 'list the widgets', pick: () => typed('ls') },
			{ label: 'install', hint: 'get opscope: npx, brew, apt', pick: () => typed('install') },
			{ label: 'theme', hint: 'change the colours', pick: themeMenu },
			{ label: 'docs', hint: 'links to the docs', pick: () => typed('docs') },
			{ label: 'about', hint: 'what this is', pick: () => typed('about') },
			{ label: 'clear', hint: 'clear the screen', pick: () => typed('clear') },
		]);
	const widgetMenu = () =>
		open(
			'Which widget? (made-up numbers, q quits it)',
			widgets.map((w) => ({ label: w.name, hint: w.line, pick: () => typed(`opscope ${w.name}`) })),
			Math.max(0, names.indexOf('clocks')),
		);
	const themeMenu = () => {
		const was = document.documentElement.dataset.theme ?? '';
		const list = themes.map((t) => ({ label: t.id, hint: t.name, pick: () => typed(`theme ${t.id}`) }));
		const preview = (i: number) => document.dispatchEvent(new CustomEvent('opscope:theme-preview', { detail: themes[i].id }));
		open('Which theme? (previews as you move)', list, Math.max(0, themes.findIndex((t) => t.id === was)), {
			move: preview,
			cancel: () => document.dispatchEvent(new CustomEvent('opscope:theme-preview', { detail: was })),
		});
	};
	// A resize (a phone turning, a window narrowing) redraws an open picker for the new size.
	const idleResize = () => {
		if (menu && !running) draw(menu);
	};
	term.onResize = idleResize;
	// SGR mouse reports: ESC [ < button ; column ; row M (press or motion) or m (release).
	const mouse = (m: Menu, data: string) => {
		for (const [, b, , y, kind] of data.matchAll(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/g)) {
			const button = Number(b);
			if (button === 64) move(m, m.at - 1);
			else if (button === 65) move(m, m.at + 1);
			else {
				// The picker's first item sits one row under its title; the cursor is on its last row.
				const cursor = term.bridge?.getCursor().row ?? term.rows - 1;
				const first = cursor - (m.drawn - 1) + 1;
				const i = m.top + (Number(y) - 1 - first);
				const inside = i >= m.top && i < Math.min(m.items.length, m.top + visible(m));
				if (!inside) continue;
				if (button & 32) move(m, i);
				else if (button === 0 && kind === 'M') {
					move(m, i);
					return choose(m);
				}
			}
		}
	};

	term.onData = (data) => {
		if (menu && !running) {
			const m = menu;
			if (data.startsWith('\x1b[<')) return mouse(m, data);
			if (data === `${ESC}A` || data === '\x1bOA' || data === '\x1b[Z') return move(m, m.at - 1);
			if (data === `${ESC}B` || data === '\x1bOB' || data === '\t') return move(m, m.at + 1);
			if (data === `${ESC}5~`) return move(m, m.at - visible(m));
			if (data === `${ESC}6~`) return move(m, m.at + visible(m));
			if (data === `${ESC}H` || data === '\x1bOH') return move(m, 0);
			if (data === `${ESC}F` || data === '\x1bOF') return move(m, m.items.length - 1);
			if (data === '\r' || data === ' ') return choose(m);
			if (data === '\x1b' || data === '\x03' || data === '\x7f') return dismiss(m);
			if (data.startsWith('\x1b')) return;
			// Anything else: close the picker and treat the key as the start of a command.
			dismiss(m);
		}
		if (running) {
			if (data === 'q' || data === '\x03' || data === '\x1b') running.stop();
			return;
		}
		if (data === '\r') {
			out('\n');
			const input = buf;
			buf = '';
			if (input.trim()) history.push(input.trim());
			at = history.length;
			exec(input);
			if (!running && !menu) prompt();
		} else if (data === '\x7f' || data === '\b') {
			if (buf) replace([...buf].slice(0, -1).join(''));
		} else if (data === '\x03') {
			out('^C\n');
			buf = '';
			prompt();
		} else if (data === '\x0c') {
			clear();
			prompt();
			out(buf);
		} else if (data === '\x15') {
			replace('');
		} else if (data === '\t') {
			complete();
		} else if (data === `${ESC}A` || data === '\x1bOA') {
			if (at > 0) replace(history[--at]);
		} else if (data === `${ESC}B` || data === '\x1bOB') {
			if (at < history.length - 1) replace(history[++at]);
			else {
				at = history.length;
				replace('');
			}
		} else if (!data.startsWith('\x1b')) {
			const text = [...data].filter((ch) => ch >= ' ' && ch !== '\x7f').join('');
			buf += text;
			out(text);
		}
		follow();
	};

	// Start as if the visitor had typed `help`: a picker of things to try.
	prompt();
	line('help');
	mainMenu();
	// Show the intro first; the picker is just below it.
	requestAnimationFrame(() => requestAnimationFrame(() => pane?.scrollTo(0, 0)));
}

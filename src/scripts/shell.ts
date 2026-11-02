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
			['install', 'ways to get opscope'],
			['about', 'what this is'],
			['docs', 'links to the docs'],
			['clear', 'clear the screen (or ctrl-l)'],
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
		const make = demos[name];
		if (!make) {
			line(`${paint('opscope:', 'r')} no widget called ${name}. ${paint('ls', 'acc')} lists them.`);
			return false;
		}
		const demo = make();
		shell.classList.add('running');
		// Clear scrollback so no old line peeks above the program in the spare height.
		out(`${ESC}?1049h${ESC}3J${ESC}?25l`);
		const draw = () => {
			const rows = Math.max(4, term.rows - 1);
			const frame = demo.render(term.cols, rows).slice(0, rows).map((l) => ansi(l, term.cols) + `${ESC}K`);
			const bar = ansi([[` q quit · ${name} · demo with made-up numbers · npx opscope ${name} for the real one`, 'mu']], term.cols);
			term.write(`${ESC}H${frame.join('\r\n')}${ESC}J${ESC}${term.rows};1H${bar}${ESC}K`);
		};
		const timer = reduced.matches ? 0 : window.setInterval(() => (demo.tick(), draw()), demo.every);
		term.onResize = () => draw();
		// The pane just grew to full size: refit the grid, then draw.
		requestAnimationFrame(() => {
			term.fit();
			draw();
		});
		running = {
			stop() {
				clearInterval(timer);
				term.onResize = null;
				out(`${ESC}?1049l${ESC}?25h`);
				shell.classList.remove('running');
				requestAnimationFrame(() => term.fit());
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
				return help();
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
				line(`${paint('$', 'acc')} npx opscope            ${paint('# nothing to install', 'mu')}`);
				line(`${paint('$', 'acc')} brew install opscope   ${paint('# Homebrew', 'mu')}`);
				line(`${paint('more:', 'mu')} ${link('https://github.com/stealth-factory/opscope#getting-them')}`);
				return;
			case 'about':
				return about();
			case 'docs':
			case 'github':
				line(link('https://github.com/stealth-factory/opscope#readme'));
				if (arg && names.includes(arg)) line(link(docsUrl(arg)));
				return;
			case 'clear':
				return out(`${ESC}2J${ESC}3J${ESC}H`);
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

	const about = () => {
		line(paint('# Hollywood called. They want their terminal back.', 'mu'));
		line(`Sci-fi hacker panels, except every number on them is ${paint('real', 'acc')}.`);
		line(`${widgets.length} widgets for Linux and macOS. ${paint('ls', 'acc')} to see them.`);
	};

	const complete = () => {
		const parts = buf.split(' ');
		const last = parts[parts.length - 1];
		const pool = parts.length === 1 ? [...COMMANDS, ...names] : parts[0] === 'theme' ? themes.map((t) => t.id) : names;
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

	const replace = (next: string) => {
		out('\b \b'.repeat([...buf].length));
		buf = next;
		out(buf);
	};

	term.onData = (data) => {
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
			if (!running) prompt();
		} else if (data === '\x7f' || data === '\b') {
			if (buf) {
				buf = [...buf].slice(0, -1).join('');
				out('\b \b');
			}
		} else if (data === '\x03') {
			out('^C\n');
			buf = '';
			prompt();
		} else if (data === '\x0c') {
			out(`${ESC}2J${ESC}H`);
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
	};

	line(`${paint('type', 'mu')} ${paint('help', 'acc')}${paint(', or try', 'mu')} ${paint('opscope matrix', 'acc')}`);
	prompt();
}

/**
 * A tiny text-mode kit for the widget demos. A line is a list of segments,
 * each a run of text with a colour class (see global.css, .c-*).
 */

export type Colour = 'fg' | 'mu' | 'dim' | 'acc' | 'g' | 'r' | 'y' | 'b' | 'c' | 'm' | 'o' | 'inv';
export type Seg = [string, Colour?];
export type Line = Seg[];

export const BLOCKS = ' ▁▂▃▄▅▆▇█';
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];

export const pad = (s: string | number, n: number) => {
	const t = String(s);
	return t.length >= n ? t.slice(0, n) : t + ' '.repeat(n - t.length);
};
export const padL = (s: string | number, n: number) => {
	const t = String(s);
	return t.length >= n ? t.slice(0, n) : ' '.repeat(n - t.length) + t;
};
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
/** Random walk that stays in [lo, hi]. */
export const walk = (v: number, step: number, lo: number, hi: number) => clamp(v + rnd(-step, step), lo, hi);
/** Push onto a fixed-length history. */
export const push = (xs: number[], v: number, n: number) => {
	xs.push(v);
	while (xs.length > n) xs.shift();
	return xs;
};

export const header = (title: string, cols: number, extra = ''): Line => {
	const head = `╺━ ${title} `;
	const tail = extra ? ` ${extra}` : '';
	const fill = Math.max(2, cols - head.length - tail.length - 1);
	return [[head, 'acc'], ['━'.repeat(fill) + '╸', 'acc'], [tail, 'mu']];
};

export const section = (name: string, note = ''): Line => [
	[' ── ', 'mu'],
	[name, 'fg'],
	[' ──', 'mu'],
	[note ? ' ' + note : '', 'mu'],
];

export const blank = (): Line => [[' ']];

export const keys = (text: string): Line => [[' ' + text, 'dim']];

/** Sparkline from values scaled to the largest (or `max`). */
export const spark = (vals: number[], max?: number) => {
	const m = max ?? Math.max(1e-9, ...vals);
	return vals.map((v) => BLOCKS[clamp(Math.round((v / m) * 8), v > 0 ? 1 : 0, 8)]).join('');
};

/** Horizontal bar in eighth-cells. */
export const bar = (frac: number, width: number) => {
	const cells = clamp(frac, 0, 1) * width;
	const full = Math.floor(cells);
	const part = EIGHTHS[Math.floor((cells - full) * 8)] ?? '';
	const used = full + (part ? 1 : 0);
	return { on: '█'.repeat(full) + part, off: '░'.repeat(Math.max(0, width - used)) };
};

/** Stacked one-row bar from proportions. */
export const stack = (parts: [number, Colour][], width: number): Line => {
	const total = parts.reduce((a, [v]) => a + v, 0) || 1;
	let left = width;
	return parts.map(([v, c], i) => {
		const n = i === parts.length - 1 ? left : Math.round((v / total) * width);
		left -= n;
		return ['█'.repeat(Math.max(0, n)), c] as Seg;
	});
};

/** Column chart, `rows` tall, from top to bottom. */
export const columns = (vals: number[], rows: number, max?: number) => {
	const m = max ?? Math.max(1e-9, ...vals);
	const out: string[] = [];
	for (let r = rows - 1; r >= 0; r--) {
		out.push(
			vals
				.map((v) => {
					const h = (v / m) * rows - r;
					return h >= 1 ? '█' : h > 0 ? BLOCKS[clamp(Math.round(h * 8), 1, 8)] : ' ';
				})
				.join(''),
		);
	}
	return out;
};

export const fmtBytes = (b: number) => {
	const u = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;
	while (b >= 1000 && i < u.length - 1) {
		b /= 1000;
		i++;
	}
	return `${b < 10 && i ? b.toFixed(1) : Math.round(b)} ${u[i]}`;
};
export const fmtRate = (b: number) => (b < 1 ? '-' : `${fmtBytes(b)}/s`);
export const fmtMs = (ms: number) => (ms < 1 ? `${Math.round(ms * 1000)}µs` : ms < 100 ? `${ms.toFixed(2)}ms` : `${ms.toFixed(1)}ms`);
export const fmtDur = (s: number) => {
	s = Math.round(s);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`;
	return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
};
export const clock = (d: Date, secs = true) =>
	[d.getHours(), d.getMinutes(), ...(secs ? [d.getSeconds()] : [])].map((n) => String(n).padStart(2, '0')).join(':');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Lines to HTML, each clipped to `cols` characters and the list to `rows`. */
export const toHtml = (lines: Line[], cols: number, rows: number) =>
	lines
		.slice(0, rows)
		.map((line) => {
			let left = cols;
			let html = '';
			for (const [text, c = 'fg'] of line) {
				if (left <= 0) break;
				const chars = [...text];
				const t = chars.slice(0, left).join('');
				left -= Math.min(chars.length, left);
				if (t) html += `<span class="c-${c}">${esc(t)}</span>`;
			}
			return html;
		})
		.join('\n');

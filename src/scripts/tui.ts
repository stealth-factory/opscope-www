/**
 * A tiny text-mode kit for the widget demos. A line is a list of segments,
 * each a run of text with a colour class (see global.css, .c-*).
 */

// h0-h4: heat-map levels, from an empty cell to the busiest (theme green mixed into the background).
export type Colour = 'fg' | 'mu' | 'dim' | 'acc' | 'g' | 'r' | 'y' | 'b' | 'c' | 'm' | 'o' | 'inv' | 'h0' | 'h1' | 'h2' | 'h3' | 'h4';
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

/* ── motion ─────────────────────────────────────────────────────────────
 * Time-based helpers, so a demo can animate between its data ticks: the page
 * redraws every visible demo a few times a second (run-demos.ts, FRAME_MS).
 */

const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
/** A braille spinner frame from the clock; `offset` staggers several spinners. */
export const spin = (offset = 0) => SPIN[(Math.floor(Date.now() / 90) + offset) % SPIN.length];
/** True for the first half of every `ms`: a blink. */
export const blink = (ms = 1000) => Date.now() % ms < ms / 2;
/** A bouncing block for indeterminate progress, `width` cells wide. */
export const scan = (width: number, ms = 1400) => {
	const t = (Date.now() % ms) / ms;
	const pos = Math.round((t < 0.5 ? t * 2 : 2 - t * 2) * Math.max(0, width - 3));
	return { before: '░'.repeat(pos), lit: '▓▓▓', after: '░'.repeat(Math.max(0, width - pos - 3)) };
};

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** A number that rolls to each new value over `ms`, like an odometer. */
export class Roll {
	private from: number;
	private to: number;
	private at = 0;
	constructor(v: number, private ms = 700) {
		this.from = this.to = v;
	}
	set(v: number) {
		if (v === this.to) return;
		this.from = this.now();
		this.to = v;
		this.at = Date.now();
	}
	add(d: number) {
		this.set(this.to + d);
	}
	get target() {
		return this.to;
	}
	/** True while it is still rolling, for a highlight. */
	get moving() {
		return Date.now() - this.at < this.ms;
	}
	now() {
		const t = Math.min(1, (Date.now() - this.at) / this.ms);
		return this.from + (this.to - this.from) * ease(t);
	}
	/** The rolled value, rounded. */
	get n() {
		return Math.round(this.now());
	}
}

/**
 * A widget's own refresh cycle: "updated 12s ago" counts up in real time, then
 * a spinner shows for a moment while it "fetches", then it starts again.
 * `onFetch` runs when each fetch lands, to change the data.
 */
export class Refresh {
	private last: number;
	private busyFrom = 0;
	constructor(
		private everyS: number,
		private onFetch: () => void = () => {},
		startAgo = 0,
		private busyMs = 1100,
	) {
		this.last = Date.now() - startAgo * 1000;
	}
	/** Call from tick() or render(); runs the fetch when it is due. */
	poll() {
		const now = Date.now();
		if (this.busyFrom) {
			if (now - this.busyFrom >= this.busyMs) {
				this.busyFrom = 0;
				this.last = now;
				this.onFetch();
			}
		} else if (now - this.last >= this.everyS * 1000) this.busyFrom = now;
	}
	get busy() {
		return this.busyFrom > 0;
	}
	/** True for a moment after a fetch lands, to light what changed. */
	get fresh() {
		return !this.busyFrom && Date.now() - this.last < 900;
	}
	get ago() {
		return Math.floor((Date.now() - this.last) / 1000);
	}
	/** "updated 12s ago", or a spinner while fetching. */
	seg(word = 'updated'): Seg {
		if (this.busy) return [`${spin()} refreshing…`, 'acc'];
		const s = this.ago;
		return [`${word} ${s < 60 ? s + 's' : Math.floor(s / 60) + 'm'} ago`, this.fresh ? 'g' : 'mu'];
	}
}

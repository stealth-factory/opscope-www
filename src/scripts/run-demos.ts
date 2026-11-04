import { demos } from './demos';
import { bar, blank, header, scan, spin, toHtml, type Line } from './tui';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** Rows a demo asks for at most, when measuring how tall it wants to be. */
const PROBE_ROWS = 200;

/**
 * A pane is stacked when it spans its grid's whole width (one column, as on a
 * phone). There the pane grows to fit its demo, instead of clipping it.
 */
const stacked = (pane: HTMLElement) => {
	const grid = pane.parentElement;
	return !!grid && pane.offsetWidth >= grid.clientWidth - 1;
};

/** Visible demos redraw this often between data ticks, so spinners spin and numbers roll. */
const FRAME_MS = 120;

/** How long a pane shows its start-up loader the first time it comes into view. */
const BOOT_MS = 1500;

/** The start-up screen: the widget connecting and fetching, before its first frame. */
const boot = (name: string, cols: number, t: number): Line[] => {
	const steps = ['reading config', 'checking credentials', `fetching ${name} data`, 'drawing'];
	const done = Math.min(steps.length, Math.floor(t * steps.length));
	const L: Line[] = [header(name.toUpperCase(), cols), blank(), [[` ${spin()} `, 'acc'], [`starting ${name}…`, 'fg']], blank()];
	steps.forEach((s, i) => {
		if (i < done) L.push([['  ✓ ', 'g'], [s, 'mu']]);
		else if (i === done) L.push([[`  ${spin(i)} `, 'y'], [s + '…', 'fg']]);
	});
	L.push(blank());
	const w = Math.max(10, cols - 10);
	const b = bar(t, w);
	L.push([['  ' + b.on, 'acc'], [b.off, 'dim'], [' ' + String(Math.round(t * 100)).padStart(3) + '%', 'mu']]);
	const sc = scan(w);
	L.push([['  ' + sc.before, 'dim'], [sc.lit, 'c'], [sc.after, 'dim']]);
	return L;
};

/** Start a text-mode demo in every `pre[data-demo]`, sized to its box. */
export function runDemos() {
	const probe = document.createElement('span');
	probe.textContent = 'M'.repeat(20);
	probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';

	document.querySelectorAll<HTMLElement>('pre[data-demo]').forEach((pre) => {
		const make = demos[pre.dataset.demo ?? ''];
		if (!make) return;
		const demo = make();
		pre.appendChild(probe.cloneNode(true));
		const p = pre.lastElementChild as HTMLElement;
		const size = (): [number, number] => {
			const cw = p.getBoundingClientRect().width / 20 || 7;
			const lh = parseFloat(getComputedStyle(pre).lineHeight) || 14;
			return [Math.max(20, Math.floor((pre.clientWidth - 2) / cw)), Math.max(4, Math.floor(pre.clientHeight / lh))];
		};
		const body = pre.parentElement as HTMLElement;
		const pane = pre.closest<HTMLElement>('.pane');
		// The tallest the demo has been at this width, so a list that grows and
		// shrinks doesn't make the page jump on every frame.
		let fitCols = 0;
		let fitLines = 0;
		const fit = () => {
			if (demo.fills || !pane || !stacked(pane)) {
				if (body.style.height) body.style.height = '';
				fitCols = 0;
				return;
			}
			const [cols] = size();
			const lines = demo.render(cols, PROBE_ROWS).length;
			if (cols !== fitCols) fitLines = 0;
			fitCols = cols;
			if (lines <= fitLines) return;
			fitLines = lines;
			const cs = getComputedStyle(pre);
			const lh = parseFloat(cs.lineHeight) || 14;
			const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
			body.style.height = `${Math.ceil(lines * lh + pad + 2)}px`;
		};
		let visible = false;
		let timer = 0;
		let frames = 0;
		// Set the first time the pane is seen with motion allowed; a little stagger so
		// panes on screen together don't finish loading in lockstep.
		let bootAt = 0;
		const bootFor = BOOT_MS + Math.random() * 700;
		const draw = () => {
			fit();
			const [cols, rows] = size();
			const t = bootAt ? (Date.now() - bootAt) / bootFor : 1;
			const lines = t < 1 ? boot(pre.dataset.demo ?? '', cols, t) : demo.render(cols, rows);
			pre.innerHTML = toHtml(lines, cols, rows);
			pre.appendChild(p);
		};
		const loop = () => {
			demo.tick();
			draw();
		};
		const sync = () => {
			clearInterval(timer);
			clearInterval(frames);
			if (!visible || document.hidden || reduced.matches) return;
			if (!bootAt) bootAt = Date.now();
			timer = window.setInterval(loop, demo.every);
			if (demo.every > FRAME_MS) frames = window.setInterval(draw, FRAME_MS);
		};
		new IntersectionObserver((entries) => {
			// The last entry is the newest if several queued up.
			visible = entries[entries.length - 1].isIntersecting;
			sync();
			if (visible) draw();
		}).observe(pre);
		new ResizeObserver(() => visible && draw()).observe(pre);
		document.addEventListener('visibilitychange', sync);
		reduced.addEventListener('change', sync);
		pre.setAttribute('aria-hidden', 'true');
		draw();
	});
}

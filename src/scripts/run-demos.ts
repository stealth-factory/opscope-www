import { demos } from './demos';
import { toHtml } from './tui';

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
		const draw = () => {
			fit();
			const [cols, rows] = size();
			pre.innerHTML = toHtml(demo.render(cols, rows), cols, rows);
			pre.appendChild(p);
		};
		const loop = () => {
			demo.tick();
			draw();
		};
		const sync = () => {
			clearInterval(timer);
			if (visible && !document.hidden && !reduced.matches) timer = window.setInterval(loop, demo.every);
		};
		new IntersectionObserver((entries) => {
			// The last entry is the newest if several queued up.
			visible = entries[entries.length - 1].isIntersecting;
			if (visible) draw();
			sync();
		}).observe(pre);
		new ResizeObserver(() => visible && draw()).observe(pre);
		document.addEventListener('visibilitychange', sync);
		reduced.addEventListener('change', sync);
		pre.setAttribute('aria-hidden', 'true');
		draw();
	});
}

import { demos } from './demos';
import { toHtml } from './tui';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

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
		let visible = false;
		let timer = 0;
		const draw = () => {
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
		new IntersectionObserver(([e]) => {
			visible = e.isIntersecting;
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

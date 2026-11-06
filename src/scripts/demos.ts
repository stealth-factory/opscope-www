/**
 * Text-mode stand-ins for each opscope widget, laid out after the widgets'
 * own README mock-ups and the demo video. Every number is made up and moves
 * on its own; nothing here reads a real machine.
 */
import {
	bar, blank, clamp, clock, columns, fmtBytes, fmtDur, fmtMs, fmtRate, header, keys, pad, padL, pick, push, rnd,
	section, spark, stack, walk, blink, spin, BLOCKS, Refresh, Roll, type Colour, type Line,
} from './tui';

export interface Demo {
	/** Milliseconds between frames. */
	every: number;
	tick(): void;
	render(cols: number, rows: number): Line[];
	/** True when the demo fills whatever rows it is given, so it has no natural height. */
	fills?: boolean;
}

const ago = (s: number) => (s < 60 ? `${Math.round(s)}s` : s < 3600 ? `${Math.round(s / 60)}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`);
const hist = (n: number, f: () => number) => Array.from({ length: n }, f);

/* ── network ─────────────────────────────────────────────────────────── */

function latency(): Demo {
	const hosts: { name: string; c: Colour; base: number; jit: number; h: number[] }[] = [
		{ name: 'studio.ts', c: 'c', base: 42, jit: 18, h: [] },
		{ name: 'nas.ts', c: 'o', base: 9, jit: 4, h: [] },
		{ name: 'edge-syd', c: 'm', base: 128, jit: 2, h: [] },
		{ name: '1.1.1.1', c: 'r', base: 3.6, jit: 0.5, h: [] },
		{ name: '8.8.8.8', c: 'y', base: 0.3, jit: 0.08, h: [] },
	];
	const events: Line[] = [];
	let warm = true;
	const sample = () =>
		hosts.forEach((h) => {
			const lost = h.name === 'studio.ts' && Math.random() < 0.03;
			push(h.h, lost ? NaN : Math.max(h.base * 0.5, h.base + rnd(-h.jit, h.jit) * (Math.random() < 0.1 ? 3 : 1)), 120);
			if (lost && !warm) {
				const t = clock(new Date());
				events.unshift([[` ${t} `, 'mu'], ['LOSS ', 'r'], [pad(h.name, 12), h.c], ['no reply', 'mu']]);
				events.splice(4);
			}
		});
	for (let i = 0; i < 80; i++) sample();
	warm = false;
	return {
		every: 500,
		tick: sample,
		render(cols, rows) {
			const L: Line[] = [header('NETWORK LATENCY MONITOR', cols), [[` ${hosts.length} targets · 0.5s interval · `, 'mu'], [clock(new Date()), 'fg'], [`  ${spin()} pinging`, 'acc']], blank()];
			const w = Math.max(6, Math.floor((cols - 14) / 4));
			L.push([[' ' + pad('HOST', 12), 'c'], [padL('NOW', w) + padL('AVG', w) + padL('MIN', w) + padL('JITTER', w), 'c']]);
			for (const h of hosts) {
				const v = h.h.filter((x) => !isNaN(x));
				const now = h.h[h.h.length - 1];
				const avg = v.reduce((a, b) => a + b, 0) / v.length;
				const jit = v.slice(1).reduce((a, x, i) => a + Math.abs(x - v[i]), 0) / (v.length - 1);
				L.push([['▌', h.c], [pad(h.name, 12), 'fg'], [padL(isNaN(now) ? 'lost' : fmtMs(now), w), isNaN(now) ? 'r' : 'fg'], [padL(fmtMs(avg), w), 'fg'], [padL(fmtMs(Math.min(...v)), w), 'mu'], [padL(fmtMs(jit), w), 'fg']]);
			}
			L.push(blank());
			// log-scale dot plot, one ping per column
			const plotRows = clamp(rows - L.length - 8, 4, 14);
			const width = cols - 8;
			const lo = Math.log(0.15), hi = Math.log(200);
			const grid: [string, Colour][][] = Array.from({ length: plotRows }, () => Array.from({ length: width }, () => [' ', 'fg'] as [string, Colour]));
			for (const h of hosts) {
				const tail = h.h.slice(-width);
				tail.forEach((v, i) => {
					if (isNaN(v)) return;
					const r = plotRows - 1 - Math.round(((Math.log(v) - lo) / (hi - lo)) * (plotRows - 1));
					grid[clamp(r, 0, plotRows - 1)][i + width - tail.length] = ['•', h.c];
				});
			}
			grid.forEach((row, r) => {
				const label = r === 0 ? '200ms' : r === plotRows - 1 ? '150µs' : r === Math.floor(plotRows / 2) ? '5.5ms' : '';
				L.push([[padL(label, 6) + ' ', 'mu'], ...row]);
			});
			L.push([[' '.repeat(7) + pad('60s ago', width - 3) + 'now', 'mu']]);
			L.push(section('EVENTS'));
			L.push(...(events.length ? events : [[[' no loss in this window', 'mu']] as Line]));
			L.push(keys('↑↓ focus  [i]nterval  [g]roup  [r]efresh  [q]uit'));
			return L;
		},
	};
}

function tailnet(): Demo {
	const peers = [
		{ name: 'workstation', os: 'macOS', path: 'DIRECT', on: true, rx: 2.6e9, tx: 2.8e9, rate: 2400, up: 1100, h: [] as number[], u: [] as number[] },
		{ name: 'nas', os: 'linux', path: 'DIRECT', on: true, rx: 1.1e6, tx: 1.2e6, rate: 300, up: 90, h: [] as number[], u: [] as number[] },
		{ name: 'build-mac', os: 'macOS', path: 'sfo', on: true, rx: 4.2e8, tx: 9.1e7, rate: 0, up: 0, h: [] as number[], u: [] as number[] },
		{ name: 'living-room-tv', os: 'tvOS', path: 'hkg', on: true, rx: 0, tx: 0, rate: 0, up: 0, h: [] as number[], u: [] as number[] },
		{ name: 'pi-garage', os: 'linux', path: 'DIRECT', on: true, rx: 8.3e7, tx: 2.2e7, rate: 40, up: 12, h: [] as number[], u: [] as number[] },
		{ name: 'old-vm', os: 'linux', path: '-', on: false, rx: 0, tx: 0, rate: 0, up: 0, h: [] as number[], u: [] as number[] },
	];
	const step = () =>
		peers.forEach((p) => {
			if (!p.on || p.name === 'living-room-tv') return;
			const burst = Math.random() < 0.08 ? rnd(5, 40) : 1;
			const d = p.rate * rnd(0.2, 1.8) * burst, u = p.up * rnd(0.2, 1.8) * burst;
			p.rx += d * 2; p.tx += u * 2;
			push(p.h, d, 16); push(p.u, u, 16);
		});
	for (let i = 0; i < 16; i++) step();
	const refresh = new Refresh(2, undefined, 1, 500);
	return {
		every: 2000,
		tick: step,
		render(cols) {
			refresh.poll();
			const live = peers.filter((p) => p.h.some((v) => v > 50));
			const L: Line[] = [
				header('TAILNET', cols),
				[[' server-01  ', 'fg'], ['100.64.0.10  ', 'c'], ['example.ts.net', 'mu']],
				[[' 5 online / 6 peers   ', 'fg'], ['3 direct', 'g'], ['   2 relayed', 'y'], ['   ', 'mu'], refresh.seg('polled')],
				blank(),
				section('LIVE THROUGHPUT', 'peers moving data'),
			];
			for (const p of live) {
				const d = p.h[p.h.length - 1], u = p.u[p.u.length - 1];
				L.push([[(blink(600) ? '⇅' : ' ') + pad(p.name, 15), 'fg'], ['↓', 'g'], [spark(p.h), 'g'], [' ↑', 'b'], [spark(p.u), 'b'], [padL(fmtRate(d), 11) + padL(fmtRate(u), 10), 'mu']]);
			}
			L.push(blank(), [[' ' + pad('MACHINE', 17) + pad('OS', 7) + pad('PATH', 8) + padL('RX', 7) + padL('TX', 7) + padL('SEEN', 6), 'c']]);
			peers.forEach((p, i) => {
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [p.on ? '● ' : '○ ', p.on ? 'g' : 'mu'], [pad(p.name, 15), p.on ? 'fg' : 'mu'], [pad(p.os, 7), 'mu'], [pad(p.path, 8), p.path === 'DIRECT' ? 'g' : p.on ? 'y' : 'mu'], [padL(fmtBytes(p.rx).replace(' ', ''), 7) + padL(fmtBytes(p.tx).replace(' ', ''), 7), 'fg'], [padL(p.on ? 'now' : '156d', 6), 'mu']]);
			});
			L.push(blank(), keys('↑↓ select  ↵ details  [c]opy ip  [r]efresh  [q]uit'));
			return L;
		},
	};
}

function ports(): Demo {
	const rows = [
		{ port: 3000, bind: 'all', what: 'Next.js 16.3', project: 'web-app', up: 79200, ex: '-' },
		{ port: 4321, bind: 'local', what: 'Astro 7.4', project: 'opscope-www', up: 3600, ex: '-' },
		{ port: 5173, bind: 'local', what: 'Vite 7', project: 'dashboard', up: 1500, ex: 'tailnet' },
		{ port: 8080, bind: 'all', what: 'python3', project: 'scratch', up: 420, ex: '-' },
		{ port: 5432, bind: 'local', what: 'postgres 17', project: '-', up: 864000, ex: '-' },
	];
	const out: number[] = hist(60, () => 0), inn: number[] = hist(60, () => 0);
	// A dev server that starts, listens for a while, then stops again.
	const extra = { port: 6006, bind: 'local', what: 'Storybook 9', project: 'ui-kit', up: 0, ex: '-' };
	let phase = 0;
	const refresh = new Refresh(4, () => {
		phase = (phase + 1) % 8;
		if (phase === 1) { extra.up = 0; rows.splice(2, 0, extra); }
		if (phase === 6) rows.splice(rows.indexOf(extra), 1);
	});
	const step = () => {
		rows.forEach((r) => (r.up += 1));
		const burst = Math.random() < 0.3;
		push(out, burst ? rnd(1e5, 4.7e6) : rnd(0, 2e4), 60);
		push(inn, burst ? rnd(5e4, 1.2e6) : rnd(0, 1e4), 60);
	};
	for (let i = 0; i < 60; i++) step();
	return {
		every: 1000,
		tick: step,
		render(cols) {
			refresh.poll();
			const w = cols - 13;
			const L: Line[] = [header('DEV SERVERS', cols), [[` ${rows.length + 7} listening · `, 'fg'], [`${rows.length} yours`, 'acc'], [' · ', 'fg'], ['1 reachable off-box', 'y'], ['   ', 'mu'], refresh.seg('scanned')], blank()];
			L.push([[padL('PORT', 6) + '  ' + pad('BIND', 7) + pad('WHAT', 13) + pad('PROJECT', 13) + padL('UP', 5) + '  ' + 'EXPOSED', 'c']]);
			rows.forEach((r, i) => {
				// The new server is still starting for its first few seconds, then lit as new.
				const starting = r === extra && r.up < 3;
				const isNew = r === extra && r.up < 9;
				L.push([[i === 1 ? '▸' : ' ', 'acc'], [padL(r.port, 5) + '  ', isNew ? 'g' : 'fg'], [pad(r.bind, 7), r.bind === 'all' ? 'y' : 'mu'], [pad(r.what, 13), isNew ? 'g' : 'fg'], [pad(r.project, 13), 'c'], [starting ? `${spin()} up  ` : padL(ago(r.up), 5) + '  ', starting ? 'y' : 'mu'], [starting ? 'starting…' : isNew ? 'new' : r.ex, starting ? 'y' : isNew ? 'g' : r.ex === '-' ? 'mu' : 'g']]);
			});
			L.push(blank(), section('TRAFFIC', '↑ out above · ↓ in below'));
			const m = Math.max(...out, ...inn, 1);
			columns(out.slice(-w).map((v) => (v < m * 0.03 ? 0 : v)), 3, m).forEach((s, i) => L.push([[i === 2 ? padL('↑ ' + fmtRate(out[out.length - 1]), 11) + ' ' : ' '.repeat(12), 'mu'], [s, 'b']]));
			L.push([[' '.repeat(12) + '─'.repeat(w), 'mu']]);
			columns(inn.slice(-w).map((v) => (v < m * 0.03 ? 0 : v)), 2, m).reverse().forEach((s, i) => L.push([[i === 0 ? padL('↓ ' + fmtRate(inn[inn.length - 1]), 11) + ' ' : ' '.repeat(12), 'mu'], [s.replace(/[▁▂▃▄▅▆▇]/g, '▀'), 'g']]));
			L.push(blank(), keys('↑↓ select  [k]ill  ↵ open  [o] system  [r]efresh  [q]uit'));
			return L;
		},
	};
}

function netwatch(): Demo {
	const procs = [
		{ name: 'next-server', pid: 190856, total: 1.4e9, base: 2.1e6 },
		{ name: 'claude', pid: 6953, total: 3.12e8, base: 9.4e4 },
		{ name: 'chrome', pid: 2951, total: 2.6e8, base: 4.1e4 },
		{ name: 'tailscaled', pid: 812, total: 8.8e7, base: 6e3 },
		{ name: '(unattributed)', pid: 0, total: 4.4e7, base: 1.2e3 },
		{ name: 'git-remote-https', pid: 44120, total: 1.9e7, base: 0 },
		{ name: 'curl', pid: 1234875, total: 8.2e6, base: 0 },
	].map((p) => ({ ...p, down: 0, up: 0 }));
	const all: number[] = [];
	const step = () => {
		procs.forEach((p) => {
			const on = p.base > 0 && Math.random() < 0.85;
			p.down = on ? p.base * rnd(0.3, 1.6) : 0;
			p.up = on ? p.down * rnd(0.03, 0.2) : 0;
			p.total += p.down + p.up;
		});
		push(all, procs.reduce((a, p) => a + p.down, 0), 120);
	};
	for (let i = 0; i < 60; i++) step();
	return {
		every: 1000,
		tick: step,
		render(cols) {
			const down = procs.reduce((a, p) => a + p.down, 0), up = procs.reduce((a, p) => a + p.up, 0);
			const L: Line[] = [
				header('NETWATCH', cols),
				[[` ${procs.length} processes · ${procs.filter((p) => p.down).length} moving · sorted by total   `, 'fg'], [blink(1000) ? '● ' : '○ ', 'g'], ['every 1s', 'mu']],
				[[' TCP only · ', 'mu'], ['↓ ' + fmtRate(down), 'g'], ['  ↑ ' + fmtRate(up), 'b']],
				blank(),
				section('PROCESS WATCH', '↓ rx, last 2 minutes'),
			];
			const w = cols - 2;
			columns(all.slice(-w), 4).forEach((s) => L.push([[' ' + s, 'acc']]));
			L.push(blank(), [[' ' + pad('PROCESS', 17) + padL('PID', 8) + padL('TOTAL', 10) + padL('DOWN', 11) + padL('UP', 10), 'c']]);
			[...procs].sort((a, b) => b.total - a.total).forEach((p, i) =>
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [pad(p.name, 17), p.down ? 'fg' : 'mu'], [padL(p.pid || '-', 8), 'mu'], [padL(fmtBytes(p.total), 10), 'fg'], [padL(fmtRate(p.down), 11), 'g'], [padL(fmtRate(p.up), 10), 'b']]));
			L.push(blank(), keys('[1] total  [2] live  [r]ezero  [q]uit'));
			return L;
		},
	};
}

function link(): Demo {
	const peers = [
		{ peer: '198.51.100.7:62392', port: 3003, base: 45, floor: 30, jit: 8, loss: 0, rate: '13.0Mbps', idle: '19h', h: [] as number[] },
		{ peer: '198.51.100.114:56865', port: 3333, base: 76, floor: 52, jit: 30, loss: 0, rate: '328kbps', idle: '14s', h: [] as number[] },
		{ peer: '100.100.100.100:59448', port: 22, base: 58, floor: 20, jit: 20, loss: 0.13, rate: '23.5Mbps', idle: '0s', h: [] as number[] },
	];
	const step = () => peers.forEach((p) => push(p.h, Math.max(p.floor, p.base + rnd(-p.jit, p.jit)), 120));
	for (let i = 0; i < 120; i++) step();
	const refresh = new Refresh(2, undefined, 0, 400);
	return {
		every: 1000,
		tick: step,
		render(cols, rows) {
			refresh.poll();
			const L: Line[] = [header('CONNECTIONS', cols), [[` ${peers.length} inbound · measured by the kernel, nothing sent   `, 'fg'], refresh.seg('read')], blank()];
			L.push([['  ' + pad('PEER', 22) + padL('PORT', 5) + padL('NOW', 6) + padL('FLOOR', 7) + padL('LOSS', 7) + padL('ACHIEVED', 10), 'c']]);
			const cs: Colour[] = ['c', 'o', 'm'];
			peers.forEach((p, i) => L.push([['▐ ', cs[i]], [pad(p.peer, 22), 'fg'], [padL(p.port, 5), 'mu'], [padL(Math.round(p.h[p.h.length - 1]) + 'ms', 6), 'fg'], [padL(p.floor + 'ms', 7), 'mu'], [padL(p.loss.toFixed(2) + '%', 7), p.loss ? 'y' : 'mu'], [padL(p.rate, 10), 'g']]));
			L.push(blank());
			const pr = clamp(rows - L.length - 3, 4, 14), w = cols - 9;
			const grid: [string, Colour][][] = Array.from({ length: pr }, () => Array.from({ length: w }, () => [' ', 'fg'] as [string, Colour]));
			peers.forEach((p, k) => p.h.slice(-w).forEach((v, i) => {
				const r = pr - 1 - Math.round(((v - 15) / 100) * (pr - 1));
				grid[clamp(r, 0, pr - 1)][i] = ['⠒', cs[k]];
			}));
			grid.forEach((row, r) => L.push([[padL(r === 0 ? '115ms' : r === pr - 1 ? '15ms' : '', 6) + ' │', 'mu'], ...row]));
			L.push(keys('↑↓ select  ↵ chart  [r]efresh  [q]uit'));
			return L;
		},
	};
}

/* ── dev & deploy ───────────────────────────────────────────────────── */

/** The line under a running build or job: its current step and a progress bar. */
const stepLine = (steps: string[], frac: number, cols: number, c: Colour): Line => {
	const i = clamp(Math.floor(frac * steps.length), 0, steps.length - 1);
	const label = pad(`${i + 1}/${steps.length} ${steps[i]}`, 18);
	const b = bar(frac, Math.max(6, cols - 30));
	return [['   ' + spin() + ' ', c], [label, 'fg'], [b.on, c], [b.off, 'dim'], [padL(Math.round(frac * 100) + '%', 5), 'mu']];
};

const commits = ['fix(a11y): announce the answer when it loads', 'feat: add the timetable view', 'chore(deps): bump the build toolchain', 'docs: explain the cache key', 'refactor: split the parser', 'test: cover the empty feed', 'feat(api): page the results'];
const repos = ['acme/web-app', 'acme/api', 'acme/deploy-tools', 'labs/toy', 'acme/docs'];

function vercel(): Demo {
	const act = hist(48, () => (Math.random() < 0.5 ? 0 : Math.round(rnd(0, 6))));
	const build = hist(60, () => rnd(150, 240));
	// doneAt: when a build finished, to flash it for a moment.
	type D = { ok: boolean; proj: string; t: number; age: number; sha: string; br: string; msg: string; building?: boolean; doneAt?: number };
	const rec: D[] = Array.from({ length: 6 }, (_, i) => ({ ok: i !== 2, proj: pick(['site', 'marketing', 'docs', 'web-app']), t: rnd(18, 240), age: 600 + i * 1700, sha: Math.random().toString(16).slice(2, 9), br: pick(['main', 'feature/timetable', 'fix/a11y']), msg: pick(commits) }));
	let n = 0;
	const ready = new Roll(179), errors = new Roll(21), total = new Roll(200);
	const refresh = new Refresh(5);
	return {
		every: 1000,
		tick() {
			rec.forEach((d) => (d.age += 1));
			const cur = rec[0];
			if (cur.building) {
				cur.t += 1;
				if (cur.t > 70) {
					cur.building = false;
					cur.doneAt = Date.now();
					cur.ok = Math.random() > 0.15;
					push(build, cur.t, 60);
					(cur.ok ? ready : errors).add(1);
				}
			} else if (++n % 12 === 0) {
				total.add(1);
				rec.unshift({ ok: true, building: true, proj: pick(['site', 'docs', 'web-app']), t: 0, age: 0, sha: Math.random().toString(16).slice(2, 9), br: pick(['main', 'feature/timetable']), msg: pick(commits) });
				rec.pop();
				act[act.length - 1]++;
			}
		},
		render(cols) {
			refresh.poll();
			const w = cols - 2;
			const L: Line[] = [
				header('VERCEL DEPLOYMENTS', cols),
				[[` ${total.n} deploys · 6 proj  `, 'fg'], [`${ready.n} ready`, ready.moving ? 'acc' : 'g'], [`  ${errors.n} error`, 'r'], ['   ', 'mu'], refresh.seg('synced')],
				keys('↑↓ select · →/↵ details · [s]tate failed · [/]filter · [r]efresh · [q]uit'),
				blank(),
				section('ACTIVITY', 'deploys/hour, last 48h'),
				[[' ' + act.slice(-w).map((v) => (v ? BLOCKS[clamp(Math.round(v / 6 * 8), 1, 8)] : '·')).join(''), 'acc']],
				[[' ' + pad('48h ago', w - 9) + 'peak 6/h', 'mu']],
				section('BUILD TIME', `median ${fmtDur(build.slice().sort((a, b) => a - b)[30])}  p95 ${fmtDur(Math.max(...build) * 0.97)}`),
				[[' ' + spark(build.slice(-w)), 'b']],
				blank(),
				section('RECENT', `1 of ${total.n}`),
			];
			rec.forEach((d, i) => {
				// Just finished: lit for a few seconds.
				const fresh = !d.building && !!d.doneAt && Date.now() - d.doneAt < 4000;
				const st: [string, Colour] = d.building ? [`${spin()} Building`, 'y'] : d.ok ? ['● Ready   ', fresh && blink(400) ? 'acc' : 'g'] : ['✖ Error   ', 'r'];
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [st[0] + ' ', st[1]], [pad(d.proj, 10), 'fg'], [padL(fmtDur(d.t), 6), 'mu'], [padL(ago(d.age), 5) + '  ', 'mu'], [d.sha + ' ', 'c'], [d.br, 'm']]);
				L.push(d.building ? stepLine(['cloning', 'installing', 'building', 'uploading', 'assigning'], d.t / 70, cols, 'y') : [['   ' + d.msg, 'mu']]);
			});
			return L;
		},
	};
}

function github(): Demo {
	const awaitingR = new Roll(486), readyR = new Roll(180), mergedR = new Roll(17), api = new Roll(4100, 1200);
	let draft = 16, dropped = 4, todayAt = 0;
	const refresh = new Refresh(9, () => api.set(api.target > 3000 ? api.target - Math.round(rnd(20, 90)) : 4980), 7);
	const opened = [3, 1, 7, 2, 11, 9, 6], mergedD = [1, 4, 2, 5, 7, 3, 8];
	// A year of contributions, one per day ending today: busy weeks and quiet ones,
	// weekdays busier than weekends, some days with nothing.
	const DAYS = 53 * 7;
	let pace = 0.6;
	const contrib = hist(DAYS, () => 0).map((_, i) => {
		const day = new Date(Date.now() - (DAYS - 1 - i) * 86_400_000).getDay();
		if (day === 0) pace = walk(pace, 0.35, 0.05, 1);
		const weekend = day === 0 || day === 6;
		if (Math.random() > (weekend ? 0.25 : 0.85) * (0.4 + pace)) return 0;
		return Math.round(rnd(1, weekend ? 4 : 14) * pace) + 1;
	});
	// Levels like GitHub's: none, then four steps up to the busiest day.
	const level = (n: number, top: number): Colour => (n <= 0 ? 'h0' : (['h1', 'h2', 'h3', 'h4'] as const)[Math.min(3, Math.floor((n / top) * 4))]);
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return {
		every: 2000,
		tick() {
			if (Math.random() < 0.4) awaitingR.add(pick([-1, 1]));
			if (Math.random() < 0.25) { mergedR.add(1); readyR.set(Math.max(0, readyR.target - 1)); mergedD[6]++; }
			if (Math.random() < 0.3) { opened[6]++; awaitingR.add(1); contrib[contrib.length - 1]++; todayAt = Date.now(); }
		},
		render(cols, rows) {
			refresh.poll();
			const awaiting = awaitingR.n, ready = readyR.n, merged = mergedR.n;
			const w = cols - 2;
			const tot = awaiting + ready + draft;
			const rate = merged / (merged + dropped);
			const b = bar(rate, Math.max(10, w - 30));
			const L: Line[] = [
				header('GITHUB OPS', cols),
				[[' 9 accounts   ', 'fg'], refresh.seg(), [`   ${api.n}/5000 api`, api.moving ? 'y' : 'mu']],
				section('OPEN PR STATE', `${tot} PRs · 220 issues open`),
				[[' ', 'fg'], ...stack([[awaiting, 'y'], [ready, 'g'], [draft, 'mu']], w)],
				[[' ▇ ', 'y'], [`awaiting review ${awaiting}  `, 'fg'], ['▇ ', 'g'], [`ready to merge ${ready}  `, 'fg'], ['▇ ', 'mu'], [`draft ${draft}`, 'fg']],
				blank(),
				section('MERGE RATE', 'last 7 days'),
				[[' ' + padL(Math.round(rate * 100) + '%', 4) + '  ', 'r'], [b.on, 'r'], [b.off, 'dim'], [`  ${merged} merged / ${dropped} dropped`, 'mu']],
			];
			// The PR flow chart gets the rows the calendar (11) and the keys (2) leave: up to
			// 3 each way, or none in a short pane, so the calendar always fits.
			const h = Math.min(3, Math.floor((rows - L.length - 2 - 11 - 2) / 2));
			if (h >= 1) {
				L.push(blank(), section('PR FLOW', '7d · ▲ opened · ▼ merged'));
				const cw = Math.max(2, Math.floor((w - 2) / 7) - 1);
				const up = columns(opened, h, 12), dn = columns(mergedD, h, 12);
				up.forEach((r) => L.push([[' ' + [...r].map((ch) => ch.repeat(cw) + ' ').join(''), 'm']]));
				L.push([[' ' + '─'.repeat((cw + 1) * 7), 'mu']]);
				dn.reverse().forEach((r) => L.push([[' ' + [...r].map((ch) => (ch === ' ' ? ' ' : '█').repeat(cw) + ' ').join(''), 'g']]));
			}
			// The calendar: a column per week (Sunday at the top), a square per day, today last.
			const now = new Date();
			const weeks = clamp(Math.floor((w - 5) / 2), 4, 53);
			const lastSunday = DAYS - 1 - now.getDay();
			const start = lastSunday - (weeks - 1) * 7;
			const shown = contrib.slice(Math.max(0, start));
			const top = Math.max(1, ...shown);
			const total = shown.reduce((a, b) => a + b, 0);
			L.push(blank(), section('CONTRIBUTIONS', `${total} in ${weeks} weeks`));
			// Month names over the week where each month starts.
			let months = '';
			for (let k = 0; k < weeks; k++) {
				const at = new Date(now.getTime() - (DAYS - 1 - (start + k * 7)) * 86_400_000);
				const first = k === 0 ? at.getDate() <= 14 : at.getDate() <= 7;
				// Only where the whole name fits before the last week's column ends.
				if (first && months.length <= k * 2 && k * 2 + 3 <= weeks * 2) months = months.padEnd(k * 2) + MONTHS[at.getMonth()];
			}
			L.push([['     ' + months.slice(0, weeks * 2), 'mu']]);
			['   ', 'Mon', '   ', 'Wed', '   ', 'Fri', '   '].forEach((d, r) => {
				const row: Line = [[' ' + d + ' ', 'mu']];
				for (let k = 0; k < weeks; k++) {
					const i = start + k * 7 + r;
					// Days after today, in this week's column, stay blank.
					// Today's square flashes when a new contribution lands.
					const flash = i === DAYS - 1 && Date.now() - todayAt < 1500 && blink(300);
					row.push(i >= DAYS ? ['  ', 'fg'] : [flash ? '□ ' : '■ ', flash ? 'acc' : level(contrib[i] ?? 0, top)]);
				}
				L.push(row);
			});
			const legend: Line = [[' '.repeat(Math.max(1, 5 + weeks * 2 - 18)) + 'less ', 'mu']];
			(['h0', 'h1', 'h2', 'h3', 'h4'] as const).forEach((c) => legend.push(['■ ', c]));
			legend.push(['more', 'mu']);
			L.push(legend);
			L.push(blank(), keys('↑↓ account  ↵ open  [w]indow  [r]efresh  [q]uit'));
			return L;
		},
	};
}

function githubActions(): Demo {
	const act = hist(48, () => (Math.random() < 0.2 ? 0 : rnd(1, 6)));
	const dur = hist(48, () => rnd(60, 400));
	type R = { st: 'success' | 'failure' | 'running' | 'queued'; t: number; age: number; repo: string; wf: string; msg: string };
	const runs: R[] = [
		{ st: 'running', t: 72, age: 72, repo: 'acme/web-app', wf: 'CI', msg: 'feat: add the timetable view' },
		{ st: 'success', t: 192, age: 140, repo: 'acme/api', wf: 'CI', msg: 'fix: page the results' },
		{ st: 'failure', t: 62, age: 540, repo: 'acme/deploy-tools', wf: 'Nightly release', msg: 'the build that broke' },
		{ st: 'success', t: 8, age: 1020, repo: 'labs/toy', wf: 'CI', msg: 'fix: the thing' },
		{ st: 'success', t: 241, age: 2100, repo: 'acme/docs', wf: 'Deploy', msg: 'docs: explain the cache key' },
	];
	const refresh = new Refresh(10, undefined, 6);
	return {
		every: 1000,
		tick() {
			runs.forEach((r) => { r.age++; if (r.st === 'running') r.t++; });
			const r = runs[0];
			if (r.st === 'running' && r.t > 110) r.st = Math.random() < 0.8 ? 'success' : 'failure';
			else if (r.st !== 'running' && Math.random() < 0.15) {
				runs.unshift({ st: 'running', t: 0, age: 0, repo: pick(repos), wf: pick(['CI', 'Deploy', 'Lint']), msg: pick(commits) });
				runs.pop();
				act[act.length - 1] += 1;
			}
		},
		render(cols) {
			refresh.poll();
			const w = cols - 2;
			const f = runs.filter((r) => r.st === 'failure').length;
			const icon: Record<R['st'], [string, Colour]> = { success: ['● success', 'g'], failure: ['✖ failure', 'r'], running: [`${spin()} running`, 'y'], queued: ['○ queued ', 'mu'] };
			const L: Line[] = [
				header('GITHUB ACTIONS', cols),
				[[' 10 accounts   ', 'fg'], refresh.seg(), ['   4840/5000 api', 'mu']],
				[[' 48 runs · 12 repos  ', 'fg'], ['41 success', 'g'], [`  ${f + 3} failed`, 'r'], ['  1 running', 'y']],
				blank(),
				section('ACTIVITY', 'runs/hour, last 48h'),
				[[' ' + spark(act.slice(-w)), 'acc']],
				[[' ' + pad('48h ago', w - 9) + 'peak 6/h', 'mu']],
				section('DURATION', 'median 2m14s  p95 8m02s'),
				[[' ' + spark(dur.slice(-w)), 'b']],
				blank(),
				section('REPEATED FAILURES'),
				[['  3×  ', 'r'], ['Nightly release  ', 'fg'], ['acme/deploy-tools', 'mu']],
				blank(),
				section('RECENT'),
			];
			runs.forEach((r, i) => {
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [icon[r.st][0] + ' ', icon[r.st][1]], [padL(fmtDur(r.t), 6), 'mu'], [padL(ago(r.age), 5) + '  ', 'mu'], [r.repo, 'c']]);
				L.push(r.st === 'running' ? stepLine(['checkout', 'setup node', 'install', 'lint', 'test', 'build'], r.t / 110, cols, 'y') : [[`   ${r.wf} · ${r.msg}`, 'mu']]);
			});
			L.push(keys('↑↓ select  →/↵ details  [s]tate failed  [/]filter  [q]uit'));
			return L;
		},
	};
}

function githubPrs(): Demo {
	const prs = [
		{ n: 493, repo: 'web-app', title: 'feat(analytics): stamp every hit', review: 'approved', checks: 'pass', idle: 60 },
		{ n: 538, repo: 'web-app', title: 'draft · feat(seo): give each page', review: 'needs review', checks: 'pass', idle: 345600 },
		{ n: 501, repo: 'api', title: 'test: guard the empty response', review: 'approved', checks: 'pass', idle: 350000 },
		{ n: 517, repo: 'api', title: 'fix: retry the token refresh', review: 'changes', checks: 'FAIL', idle: 7200 },
		{ n: 312, repo: 'deploy-tools', title: 'chore(deps): bump the runner', review: 'needs review', checks: 'pass', idle: 900000 },
		{ n: 488, repo: 'docs', title: 'docs: the stack map, explained', review: 'needs review', checks: 'running', idle: 120 },
	];
	const opened = hist(30, () => Math.round(rnd(0, 10)));
	const refresh = new Refresh(12, undefined, 4);
	return {
		every: 1500,
		tick() {
			prs.forEach((p) => (p.idle += 1.5));
			// Running checks finish after a few seconds; now and then a push starts new ones.
			prs.forEach((p) => { if (p.checks === 'running' && Math.random() < 0.25) p.checks = Math.random() < 0.8 ? 'pass' : 'FAIL'; });
			const p = pick(prs);
			if (p.checks !== 'running' && Math.random() < 0.15) { p.idle = 0; p.checks = 'running'; }
		},
		render(cols) {
			refresh.poll();
			const w = cols - 2;
			const appr = prs.filter((p) => p.review === 'approved').length, ch = prs.filter((p) => p.review === 'changes').length;
			const L: Line[] = [
				header('GITHUB PRS', cols),
				[[' 4 accounts   ', 'fg'], refresh.seg(), ['   4567/5000 api', 'mu']],
				section('STATE', '34 open · 10 draft · 9 conflicting · 1 ready to merge'),
				[[' ', 'fg'], ...stack([[appr, 'g'], [ch, 'r'], [27, 'y'], [3, 'mu']], w)],
				[[' ▇ ', 'g'], [`approved ${appr}  `, 'fg'], ['▇ ', 'r'], [`changes ${ch}  `, 'fg'], ['▇ ', 'y'], ['needs review 27', 'fg']],
				blank(),
				section('OPENED / DAY', 'last 30d · peak 10/day'),
			];
			columns(opened.slice(-w), 3).forEach((r) => L.push([[' ' + r, 'm']]));
			L.push([[' ' + pad('30d ago', Math.min(w, 30) - 5) + 'today', 'mu']], blank(), section('OPEN PRs', 'by updated ↓'));
			L.push([[' ' + pad('PR', 6) + pad('REPO', 13) + pad('TITLE', Math.max(8, cols - 47)) + padL('REVIEW', 13) + padL('CHECKS', 8) + padL('IDLE', 6), 'c']]);
			[...prs].sort((a, b) => a.idle - b.idle).forEach((p, i) =>
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [pad('#' + p.n, 6), 'fg'], [pad(p.repo, 13), 'c'], [pad(p.title, Math.max(8, cols - 47)), 'fg'], [padL(p.review, 13), p.review === 'approved' ? 'g' : p.review === 'changes' ? 'r' : 'y'], [padL(p.checks === 'running' ? `${spin()} run` : p.checks, 8), p.checks === 'pass' ? 'g' : p.checks === 'FAIL' ? 'r' : 'y'], [padL(ago(p.idle), 6), 'mu']]));
			L.push(blank(), keys('↑↓ select  [↵] open  [/]filter  [s]ort  [c]opy url  [q]uit'));
			return L;
		},
	};
}

function linear(): Demo {
	const cycles = [
		{ name: 'WEB Cycle 3', done: 205, pts: 284, left: 2, added: 175 },
		{ name: 'CLI Cycle 16', done: 3, pts: 7, left: 9, added: 3 },
		{ name: 'LAB Cycle 3', done: 1, pts: 3, left: 2, added: 0 },
		{ name: 'OPS Cycle 111', done: 0, pts: 8, left: 2, added: 0 },
	];
	const created = [4, 5, 9, 3, 8, 6, 2, 2, 12, 0, 1, 4, 4, 1], completed = [0, 0, 0, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	const triageR = new Roll(704), backlogR = new Roll(314), todoR = new Roll(155), progR = new Roll(48);
	const doneR = cycles.map((c) => new Roll(c.done, 900));
	const refresh = new Refresh(20, undefined, 14);
	return {
		every: 2000,
		tick() {
			const k = Math.floor(Math.random() * cycles.length), c = cycles[k];
			// A finished cycle rolls over to the next one.
			if (c.done >= c.pts) { c.done = Math.round(c.pts * rnd(0.05, 0.3)); doneR[k].set(c.done); }
			else if (Math.random() < 0.6) { c.done += Math.ceil(c.pts / 40); c.done = Math.min(c.done, c.pts); doneR[k].set(c.done); }
			if (Math.random() < 0.4) { triageR.add(1); created[13]++; }
			if (Math.random() < 0.3) { progR.set(Math.max(0, progR.target - 1)); completed[13]++; }
			if (Math.random() < 0.3) { triageR.add(-1); todoR.add(1); }
			if (Math.random() < 0.2) { todoR.add(-1); progR.add(1); }
		},
		render(cols) {
			refresh.poll();
			const triage = triageR.n, backlog = backlogR.n, todo = todoR.n, prog = progR.n;
			const w = cols - 2;
			const bw = Math.max(8, cols - 34);
			const L: Line[] = [
				header('LINEAR OPS', cols),
				[[' 14 teams   ', 'fg'], refresh.seg(), ['   2490 req left/hr', 'mu']],
				section('HOW LONG', 'all teams · median of 88 completed in 14d'),
				[['  lead ', 'mu'], ['10.9h', 'fg'], ['   cycle ', 'mu'], ['3.7h', 'fg'], ['   oldest open ', 'mu'], ['STU-97 2.8y', 'r']],
				blank(),
				section('OPEN', `${triage + backlog + todo + prog} issues open`),
				[[' ', 'fg'], ...stack([[triage, 'r'], [backlog, 'mu'], [todo, 'b'], [prog, 'y']], w)],
				[[' ▇ ', 'r'], [`triage ${triage}  `, 'fg'], ['▇ ', 'mu'], [`backlog ${backlog}  `, 'fg'], ['▇ ', 'b'], [`todo ${todo}  `, 'fg'], ['▇ ', 'y'], [`in progress ${prog}`, 'fg']],
				blank(),
				section('ACTIVE CYCLES', `${cycles.length} running`),
			];
			cycles.forEach((c, i) => {
				const done = doneR[i].now();
				const b = bar(done / c.pts, bw);
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [pad(c.name, 14), 'fg'], [b.on, doneR[i].moving ? 'g' : 'acc'], [b.off, 'dim'], [padL(Math.round((done / c.pts) * 100) + '%', 5), doneR[i].moving ? 'g' : 'fg'], [`  ${c.left}d left`, 'mu'], [c.added ? `  +${c.added}` : '', 'y']]);
			});
			L.push(blank(), section('ISSUE FLOW', '14d · ▲ created · ▼ completed'));
			const cw = Math.max(1, Math.floor(w / 14) - 1);
			columns(created, 3, 12).forEach((r) => L.push([[' ' + [...r].map((ch) => ch.repeat(cw) + ' ').join(''), 'acc']]));
			L.push([[' ' + '─'.repeat((cw + 1) * 14), 'mu']]);
			columns(completed, 2, 12).reverse().forEach((r) => L.push([[' ' + [...r].map((ch) => (ch === ' ' ? ' ' : '▀').repeat(cw) + ' ').join(''), 'g']]));
			L.push(blank(), keys('↑↓ 1-4 of 4  tab section  ↵ open  [r]efresh  [q]uit'));
			return L;
		},
	};
}

/* ── agents ─────────────────────────────────────────────────────────── */

const spinner = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

function herdr(): Demo {
	let f = 0;
	const agents = [
		{ who: 'claude', st: 'working', for: 16, cpu: 14, mem: '763M', ws: 'infra', task: 'Refactor the schedule module' },
		{ who: 'codex', st: 'DONE', for: 16, cpu: 6, mem: '231M', ws: 'some-cli', task: 'Investigate the failing test' },
		{ who: 'claude', st: 'BLOCKED', for: 240, cpu: 0, mem: '512M', ws: 'site', task: 'Needs approval to run the migration' },
		{ who: 'gemini', st: 'idle', for: 960, cpu: 1, mem: '491M', ws: 'docs', task: 'Plan the repository structure' },
	];
	return {
		every: 250,
		tick() {
			f++;
			agents.forEach((a) => (a.for += 0.25));
			agents[0].cpu = Math.round(walk(agents[0].cpu, 4, 4, 60));
			if (f % 60 === 0) agents[1].st = agents[1].st === 'DONE' ? 'working' : 'DONE';
		},
		render(cols) {
			const icon = (s: string): [string, Colour] => (s === 'working' ? [spinner[f % 10], 'y'] : s === 'DONE' ? ['✓', 'g'] : s === 'BLOCKED' ? ['⚠', 'r'] : ['·', 'mu']);
			const waiting = agents.filter((a) => a.st === 'DONE' || a.st === 'BLOCKED').length;
			const L: Line[] = [
				header('HERDR PANES', cols),
				[[` ${agents.length} agents · 3 workspaces   `, 'fg'], [`${agents.filter((a) => a.st === 'working').length} working`, 'y'], ['   1 blocked', 'r']],
				[[` ▸ ${waiting} agents waiting for you`, 'acc']],
				blank(),
				section('AGENTS', String(agents.length)),
				[[' ' + pad('AGENT', 9) + pad('STATE', 9) + padL('FOR', 5) + padL('CPU', 6) + padL('MEM', 6) + '  WORKSPACE', 'c']],
			];
			// needs-a-human first
			const order = [...agents].sort((a, b) => ['BLOCKED', 'DONE', 'working', 'idle'].indexOf(a.st) - ['BLOCKED', 'DONE', 'working', 'idle'].indexOf(b.st));
			order.forEach((a, i) => {
				const [ic, c] = icon(a.st);
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [ic + ' ', c], [pad(a.who, 7), 'fg'], [pad(a.st, 9), c], [padL(ago(a.for), 5), 'mu'], [padL(a.cpu + '%', 6), 'fg'], [padL(a.mem, 6), 'mu'], ['  ' + a.ws, 'c']]);
				L.push([[`   ${a.task}`, 'mu']]);
			});
			L.push(blank(), section('PROCESSES', '2 panes running something'), [[' ▪ ', 'b'], [pad('pnpm dev', 18), 'fg'], [padL('3%', 5) + padL('116M', 7) + '  site', 'mu']], [[' ▪ ', 'b'], [pad('tailnet', 18), 'fg'], [padL('1%', 5) + padL('16M', 7) + '  infra', 'mu']]);
			L.push(blank(), section('IDLE', '6 panes at a prompt'), [[' ▫ work/site', 'mu']], [[' ▫ …/monorepo', 'mu']]);
			L.push(blank(), keys('↑↓ select  ↵ switch to this pane  [i]dle  [r]efresh  [q]uit'));
			return L;
		},
	};
}

function luvus(): Demo {
	let f = 0;
	type A = { who: string; st: 'BLOCKED' | 'DONE' | 'working' | 'idle'; since: number; ws: string; br: string; via: string };
	const now = Date.now();
	const agents: A[] = [
		{ who: 'claude', st: 'BLOCKED', since: now - 240e3, ws: 'some-cli', br: 'feature/port-the-parser', via: 'integration_report' },
		{ who: 'codex', st: 'DONE', since: now - 960e3, ws: 'site', br: 'main', via: 'manifest_rule' },
		{ who: 'claude', st: 'working', since: now - 120e3, ws: 'infra', br: 'feature/schedule-module', via: 'screen_text' },
		{ who: 'gemini', st: 'idle', since: now - 960e3, ws: 'docs', br: 'main', via: 'screen_text' },
	];
	const tasks = [
		{ id: 't-014', st: 'claimed', what: 'Port the parser to the new envelope' },
		{ id: 't-015', st: 'ready', what: 'Rewrite the lease conflict message' },
	];
	// Every few seconds the work moves on: the working agent finishes, the idle one
	// picks up the ready task, the done one goes idle. The blocked one waits for you.
	const next: Record<A['st'], A['st']> = { working: 'DONE', idle: 'working', DONE: 'idle', BLOCKED: 'BLOCKED' };
	const ORDER = ['BLOCKED', 'DONE', 'working', 'idle'];
	return {
		every: 250,
		tick() {
			f++;
			if (f % 28 === 0) {
				agents.forEach((a) => { if (a.st !== 'BLOCKED') { a.st = next[a.st]; a.since = Date.now(); } });
				tasks[1].st = tasks[1].st === 'ready' ? 'claimed' : 'ready';
			}
		},
		render(cols) {
			const count = (st: A['st']) => agents.filter((a) => a.st === st).length;
			const icon = (st: A['st']): [string, Colour] => (st === 'working' ? [spin(), 'y'] : st === 'DONE' ? ['✓', 'g'] : st === 'BLOCKED' ? ['⚠', 'r'] : ['·', 'mu']);
			const L: Line[] = [
				header('LUVUS PANES', cols),
				[[' 4 agents · 9 panes   ', 'fg'], [`${count('BLOCKED')} blocked`, 'r'], [`   ${count('DONE')} done`, 'g'], [`   ${count('working')} working`, 'y'], [`   ${count('idle')} idle`, 'mu']],
				[[' session default · uhp 1.0 · 3 workspaces · seq ', 'mu'], [String(4186 + f), 'fg']],
				[[` ▸ ${count('BLOCKED') + count('DONE')} agents waiting for you`, blink(1200) ? 'acc' : 'fg']],
				blank(),
				section('AGENTS', '4'),
				[[' ' + pad('AGENT', 10) + pad('STATE', 9) + padL('FOR', 5) + '  ' + pad('WORKSPACE', 10) + 'BRANCH', 'c']],
			];
			[...agents].sort((a, b) => ORDER.indexOf(a.st) - ORDER.indexOf(b.st)).forEach((a, i) => {
				const [ic, c] = icon(a.st);
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [ic + ' ', c], [pad(a.who, 8), 'fg'], [pad(a.st, 9), c], [padL(ago((Date.now() - a.since) / 1000), 5) + '  ', 'mu'], [pad(a.ws, 10), 'c'], [a.br, 'm']]);
				L.push([[`   state via ${a.via}`, 'mu']]);
			});
			L.push(blank(), section('TASKS', String(tasks.length)));
			tasks.forEach((t) => L.push([[' ◆ ', 'acc'], [pad(t.id, 8), 'fg'], [pad(t.st, 10), t.st === 'claimed' ? 'y' : 'g'], [t.what, 'fg']]));
			L.push(
				blank(),
				section('LEASES', '1'),
				[[' ⛒ ', 'o'], [pad('t-014', 8), 'fg'], ['src/parser/**  ', 'c'], ['(claude)', 'mu']],
				blank(),
				keys('↑↓ select  ↵ switch to this pane  [t]asks  [r]efresh  [q]uit'),
			);
			return L;
		},
	};
}

function agentUsage(): Demo {
	const groups: { name: string; c: Colour; rows: { label: string; used: number; pace: number; delta: number; reset: string }[] }[] = [
		{ name: 'CLAUDE', c: 'o', rows: [{ label: 'session 5h', used: 0.07, pace: 0.62, delta: 57, reset: '1h 47m' }, { label: 'overall 7d', used: 0.77, pace: 0.58, delta: -23, reset: '3d 4h' }, { label: 'opus 7d', used: 0.14, pace: 0.58, delta: 40, reset: '3d 4h' }] },
		{ name: 'CODEX', c: 'fg', rows: [{ label: '7d', used: 0.07, pace: 0.27, delta: 18, reset: '5d 5h' }, { label: 'spark 5h', used: 0, pace: 0.02, delta: 0, reset: '4h 59m' }] },
		{ name: 'COPILOT', c: 'm', rows: [{ label: 'premium reqs', used: 0.72, pace: 0.86, delta: 13, reset: '4d 14h' }] },
		{ name: 'CURSOR', c: 'g', rows: [{ label: 'included', used: 0.15, pace: 0.5, delta: 34, reset: '15d 21h' }, { label: 'auto', used: 0.16, pace: 0.5, delta: 33, reset: '15d 21h' }] },
		{ name: 'GROK', c: 'b', rows: [{ label: 'credits', used: 0.28, pace: 0.24, delta: -9, reset: '5d 16h' }] },
	];
	const rolls = new Map(groups.flatMap((g) => g.rows.map((r) => [r, new Roll(r.used, 1000)] as const)));
	// Each read finds a few agents have used a little more; the session window
	// empties again when it fills.
	const refresh = new Refresh(6, () => {
		groups.forEach((g) => g.rows.forEach((r) => {
			if (Math.random() < 0.5) return;
			r.used = r.used > 0.95 ? 0.02 : Math.min(1, r.used + rnd(0.005, 0.03));
			r.delta = Math.round((r.pace - r.used) * 100);
			rolls.get(r)?.set(r.used);
		}));
	}, 4);
	return {
		every: 1000,
		tick() {
			const r = groups[0].rows[0];
			r.used = r.used > 0.95 ? 0.02 : Math.min(1, r.used + rnd(0, 0.006));
			r.delta = Math.round((r.pace - r.used) * 100);
			rolls.get(r)?.set(r.used);
		},
		render(cols) {
			refresh.poll();
			const bw = clamp(cols - 34, 10, 30);
			const L: Line[] = [
				header('AGENT USAGE', cols),
				[[' local state · live quota · ', 'mu'], refresh.seg('read')],
				[['[+] ', 'acc'], ['CLAUDE · CODEX · COPILOT · CURSOR · GROK', 'b']],
				blank(),
				section('QUOTAS', '9 limits across 5 agents · ranked by usage'),
			];
			groups.forEach((g) => {
				L.push([[' ' + g.name, g.c]]);
				g.rows.forEach((r) => {
					const roll = rolls.get(r);
					const used = roll ? roll.now() : r.used;
					const b = bar(used, bw);
					const mark = clamp(Math.round(r.pace * bw), 0, bw - 1);
					const offArr = [...b.off];
					const onLen = [...b.on].length;
					if (mark >= onLen && mark - onLen < offArr.length) offArr[mark - onLen] = '│';
					L.push([['  ' + pad(r.label, 13), 'fg'], [b.on, g.c === 'fg' ? 'mu' : g.c], [offArr.join(''), 'dim'], [padL((used * 100).toFixed(used < 0.1 ? 1 : 0) + '%', 7), roll?.moving ? 'acc' : g.c === 'fg' ? 'fg' : g.c], [padL((r.delta > 0 ? '+' : '') + r.delta + '%', 6), r.delta >= 0 ? 'g' : 'y'], ['  ' + r.reset, 'mu']]);
				});
				L.push(blank());
			});
			L.push(keys('↔ agent  [r]efresh  [q]uit'));
			return L;
		},
	};
}

/* ── ambient ────────────────────────────────────────────────────────── */

const DIGITS: Record<string, string[]> = {
	'0': ['█▀█', '█ █', '▀▀▀'], '1': [' ▀█', '  █', '  ▀'], '2': ['▀▀█', '█▀▀', '▀▀▀'], '3': ['▀▀█', ' ▀█', '▀▀▀'], '4': ['█ █', '▀▀█', '  ▀'],
	'5': ['█▀▀', '▀▀█', '▀▀▀'], '6': ['█▀▀', '█▀█', '▀▀▀'], '7': ['▀▀█', '  █', '  ▀'], '8': ['█▀█', '█▀█', '▀▀▀'], '9': ['█▀█', '▀▀█', '▀▀▀'], ':': [' ', '▪', ' '], ' ': [' ', ' ', ' '],
};
const big = (s: string) => [0, 1, 2].map((r) => [...s].map((ch) => DIGITS[ch][r]).join(' '));

/** Wall-clock parts for an IANA zone, from the browser's own zone data (so DST is right). */
const zoneFmt = new Map<string, Intl.DateTimeFormat>();
const inZone = (zone: string, at: Date) => {
	let f = zoneFmt.get(zone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'shortOffset' });
		zoneFmt.set(zone, f);
	}
	const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
	const off = (p.timeZoneName ?? 'GMT').replace('GMT', 'UTC');
	return { h: Number(p.hour), m: p.minute, s: p.second, day: p.weekday, date: `${p.year}-${p.month}-${p.day}`, off: off === 'UTC' ? 'UTC+0' : off };
};
/** "Australia/Brisbane" → "Brisbane". */
const cityOf = (zone: string) => (zone.split('/').pop() ?? zone).replace(/_/g, ' ');

function clocks(): Demo {
	const here = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const world = ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Brisbane', 'Australia/Sydney'];
	const names: Record<string, string> = { 'America/Los_Angeles': 'San Francisco', 'Asia/Kolkata': 'Bengaluru' };
	// The visitor's own zone leads the list; it is not repeated further down.
	const zones = [here, ...world.filter((z) => z !== here)].slice(0, 10);
	let pom = 25 * 60 - 337;
	return {
		every: 1000,
		tick: () => void (pom = pom > 0 ? pom - 1 : 25 * 60),
		render(cols) {
			const now = new Date();
			const bw = cols - 2;
			const local = inZone(here, now);
			const L: Line[] = [header('CLOCKS', cols), section('SERVER TIME', `· ${names[here] ?? cityOf(here)}`)];
			const colon = blink(1000) ? ':' : ' ';
			big(`${String(local.h).padStart(2, '0')}${colon}${local.m}${colon}${local.s}`).forEach((r) => L.push([[' ' + r, 'g']]));
			const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
			L.push([[' ' + local.date + '  ', 'fg'], [days[now.getDay()] + '  ', 'c'], [local.off, 'mu']], blank(), section('COUNTDOWN'));
			const secOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
			const rowsC: [string, number, number, Colour][] = [
				['Pomodoro · FOCUS', pom, 1500, 'r'],
				['Next hour', 3600 - (secOfDay % 3600), 3600, 'c'],
				['End of office hours', Math.max(0, 18 * 3600 - secOfDay), 9 * 3600, 'y'],
				['End of day', 86400 - secOfDay, 86400, 'm'],
			];
			rowsC.forEach(([name, left, span, c]) => {
				const b = bar(1 - left / span, bw);
				const hms = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, '0')).join(':');
				L.push([[' ' + pad(name, 22), 'fg'], [hms, c]]);
				L.push([[' ' + b.on, c], [b.off, 'dim']]);
			});
			L.push(blank(), section('WORLD CLOCK', `${zones.length} cities`));
			zones.forEach((z) => {
				const t = inZone(z, now);
				const day = t.h >= 7 && t.h < 19;
				L.push([[z === here ? '▸' : ' ', 'acc'], [day ? '● ' : '☾ ', day ? 'y' : 'b'], [pad(names[z] ?? cityOf(z), 15), z === here ? 'acc' : 'fg'], [`${String(t.h).padStart(2, '0')}:${t.m}  `, 'fg'], [t.day + '  ', 'mu'], [t.off, 'mu']]);
			});
			L.push(blank(), keys('↑↓ cities  [space] pause  [b]reak  [r]estart  [q]uit'));
			return L;
		},
	};
}

function months(): Demo {
	return {
		every: 1000,
		tick() {},
		render(cols) {
			const now = new Date();
			const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
			const off = -now.getTimezoneOffset() / 60;
			// How far through the day and the year we are, by the second.
			const y0 = new Date(now.getFullYear(), 0, 1).getTime(), y1 = new Date(now.getFullYear() + 1, 0, 1).getTime();
			// From calendar dates, so a daylight-saving shift can't move the day number.
			const dayOfYear = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / 864e5) + 1;
			const dayFrac = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
			const bw = Math.max(8, cols - 24);
			const dayBar = bar(dayFrac, bw), yearBar = bar((now.getTime() - y0) / (y1 - y0), bw);
			const L: Line[] = [
				header('MONTHS', cols),
				[[` ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${days[now.getDay()]} `, 'fg'], [clock(now), 'acc'], [` · this machine (UTC${off >= 0 ? '+' : ''}${off})`, 'mu']],
				[[' weeks start Monday · wk is the ISO 8601 week', 'mu']],
				[[' ' + pad('today', 8), 'mu'], [dayBar.on, 'c'], [dayBar.off, 'dim'], [padL((dayFrac * 100).toFixed(1) + '%', 7), 'fg']],
				[[' ' + pad(`day ${dayOfYear}`, 8), 'mu'], [yearBar.on, 'm'], [yearBar.off, 'dim'], [padL((((now.getTime() - y0) / (y1 - y0)) * 100).toFixed(1) + '%', 7), 'fg']],
				blank(),
			];
			const isoWeek = (d: Date) => {
				const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
				const day = t.getUTCDay() || 7;
				t.setUTCDate(t.getUTCDate() + 4 - day);
				return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
			};
			const month = (y: number, m: number): Line[] => {
				const name = new Date(y, m, 1).toLocaleString('en-GB', { month: 'long' }).toUpperCase() + ' ' + y;
				const out: Line[] = [[[' ' + pad(name, 26), 'acc']], [['  wk Mo Tu We Th Fr Sa Su', 'mu']]];
				const first = new Date(y, m, 1);
				const start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
				for (let w = 0; w < 6; w++) {
					const line: Line = [['  ' + padL(isoWeek(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7)), 2), 'c']];
					for (let d = 0; d < 7; d++) {
						const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
						const today = day.getMonth() === m && day.toDateString() === now.toDateString();
						line.push([' ', 'fg'], [padL(day.getDate(), 2), today ? (blink(1600) ? 'inv' : 'acc') : day.getMonth() === m ? (d >= 5 ? 'y' : 'fg') : 'dim']);
					}
					out.push(line);
				}
				return out;
			};
			const y = now.getFullYear(), m = now.getMonth();
			const a = month(y, m), b = month(m === 11 ? y + 1 : y, (m + 1) % 12), c = month(m >= 10 ? y + 1 : y, (m + 2) % 12);
			if (cols >= 56) {
				const len = (ln: Line) => ln.reduce((n, seg) => n + seg[0].length, 0);
				a.forEach((ln, i) => L.push([...ln, [' '.repeat(Math.max(1, 29 - len(ln))), 'fg'], ...b[i]]));
			} else {
				L.push(...a, blank(), ...b);
			}
			L.push(blank(), ...c);
			L.push(blank(), keys('←→ month  ↑↓ year  [t]oday  [q]uit'));
			return L;
		},
	};
}

function trends(): Demo {
	const terms = [
		{ q: 'zorblax festival', traffic: '5000+', started: 65, seen: 4, news: 'Example News · Sample Gazette' },
		{ q: 'flumbo cup final', traffic: '2000+', started: 34, seen: 3, news: 'Example Times' },
		{ q: 'quux launch', traffic: '500+', started: 12, seen: 0, news: 'Sample Gazette' },
		{ q: 'widgetcon keynote', traffic: '200+', started: 135, seen: 6, news: 'Example News' },
		{ q: 'meteor shower tonight', traffic: '200+', started: 48, seen: 2, news: 'Sky Weekly' },
	];
	// Made-up terms that rise into the feed, one every other fetch; the oldest falls out.
	const rising = [
		{ q: 'gloop marathon', traffic: '1000+', news: 'Example Times' },
		{ q: 'snorkel ban lifted', traffic: '500+', news: 'Sample Gazette' },
		{ q: 'blorp release date', traffic: '2000+', news: 'Example News' },
		{ q: 'harbour fireworks', traffic: '200+', news: 'Sky Weekly' },
	];
	let sel = 0, n = 0, newAt = 0;
	let left = { q: 'old example term', traffic: '1000+' };
	// When the last term left, and when the feed was last fetched (ages count real time).
	let leftAt = Date.now() - 15_000;
	let fetchedAt = Date.now();
	const refresh = new Refresh(15, () => {
		const mins = (Date.now() - fetchedAt) / 60_000;
		fetchedAt = Date.now();
		terms.forEach((t) => { t.seen++; t.started += mins; });
		if (++n % 2) return;
		const r = rising[(n / 2) % rising.length];
		// A term already in the feed rises again rather than showing twice.
		const again = terms.findIndex((t) => t.q === r.q);
		const gone = again >= 0 ? terms.splice(again, 1)[0] : terms.pop();
		if (gone) {
			left = gone;
			leftAt = Date.now();
		}
		terms.unshift({ ...r, started: 0, seen: 0 });
		sel = 0;
		newAt = Date.now();
	}, 9);
	return {
		every: 1000,
		tick() {
			if (Date.now() - newAt > 3000 && Math.floor(Date.now() / 1000) % 3 === 0) sel = (sel + 1) % terms.length;
		},
		render(cols) {
			refresh.poll();
			const fresh = Date.now() - newAt < 3000;
			const L: Line[] = [
				header('TRENDS AU', cols),
				[[' [AU]', 'inv'], ['·1  US ·  GB ·', 'mu']],
				[[' ', 'mu'], refresh.seg('fetched'), [` · Google's Trending Now feed`, 'mu']],
				blank(),
				[[' TRENDING NOW', 'acc']],
				[[` "approx traffic" is Google's bucket, not a count · ${terms.length} of ${terms.length} · ${terms.filter((t) => !t.seen).length} new`, 'mu']],
				[['  ' + pad('SEARCH', 22) + pad('TRAFFIC', 8) + pad('STARTED', 8) + pad('SEEN', 5) + 'NEWS', 'c']],
			];
			terms.forEach((t, i) => L.push([[i === sel ? '▸ ' : '  ', 'acc'], [pad(t.q, 22), i === 0 && fresh && blink(400) ? 'g' : i === sel ? 'acc' : 'fg'], [pad(t.traffic, 8), 'y'], [pad(ago(t.started * 60), 8), 'mu'], [pad(t.seen ? t.seen + '×' : 'new', 5), t.seen ? 'mu' : 'g'], [t.news, 'mu']]));
			L.push(blank(), [[' LEFT THE FEED', 'acc']], [[' this widget\'s own observation · kept an hour', 'mu']], [[`  ${left.q}  `, 'fg'], [`was ${left.traffic} · gone ${ago((Date.now() - leftAt) / 1000)} ago`, 'mu']]);
			L.push(blank(), keys('↑↓ select  tab section  ←→ region  [↵] news  [/] filter  [q]uit'));
			return L;
		},
	};
}

function matrix(): Demo {
	const glyphs = '0123456789ABCDEFXZ<>[]{}#$%&*+=?/|:;~^';
	let drops: { y: number; v: number; len: number }[] = [];
	let grid: string[][] = [];
	let w = 0, h = 0;
	return {
		every: 80,
		fills: true,
		tick() {
			drops.forEach((d, x) => {
				d.y += d.v;
				if (d.y - d.len > h) { d.y = -rnd(0, h * 2); d.v = rnd(0.3, 1); d.len = Math.round(rnd(4, h * 0.7)); }
				const yy = Math.floor(d.y);
				if (yy >= 0 && yy < h) grid[yy][x] = pick([...glyphs]);
			});
		},
		render(cols, rows) {
			if (cols !== w || rows !== h) {
				w = cols; h = rows;
				// Start some drops already on screen, so the first (and, under reduced motion, only) frame shows rain.
				drops = Array.from({ length: w }, () => {
					const len = Math.round(rnd(4, h * 0.7));
					return { y: rnd(-h, h + len), v: rnd(0.3, 1), len };
				});
				grid = Array.from({ length: h }, () => Array.from({ length: w }, () => pick([...glyphs])));
			}
			return grid.map((row, y) =>
				row.map((ch, x) => {
					const d = drops[x];
					const dist = d.y - y;
					if (dist < 0 || dist >= d.len) return [' ', 'fg'] as [string, Colour];
					const c: Colour = dist < 1 ? 'fg' : dist < d.len * 0.4 ? 'g' : 'dim';
					return [ch, c] as [string, Colour];
				}),
			);
		},
	};
}

/* ── system ──────────────────────────────────────────────────────────── */

function disk(): Demo {
	const GB = 1e9;
	const mounts = [
		{ mount: '/', type: 'ext4', size: 100 * GB, used: 80.4 * GB, rate: 1.2 * GB },
		{ mount: '/home', type: 'xfs', size: 200 * GB, used: 40 * GB, rate: 0 },
		{ mount: '/srv', type: 'ext4', size: 500 * GB, used: 310 * GB, rate: 6.5 * GB },
	];
	const disks = [
		{ name: 'nvme0n1', type: 'ssd', size: '1T', r: 1.5e6, w: 18e6, busy: 18 },
		{ name: 'sda', type: 'hdd', size: '4T', r: 4e5, w: 1e6, busy: 2 },
	];
	const rd: number[] = hist(90, () => rnd(2e5, 3e6)), wr: number[] = hist(90, () => rnd(1e6, 3e7));
	let some = 23.1, full = 7.2, sel = 0, f = 0;
	const step = () => {
		f++;
		const burst = Math.random() < 0.15;
		push(rd, burst ? rnd(2e6, 9e6) : rnd(2e5, 3e6), 90);
		push(wr, burst ? rnd(2e7, 6e7) : rnd(1e6, 2.5e7), 90);
		disks[0].r = rd[rd.length - 1] * 0.8;
		disks[0].w = wr[wr.length - 1] * 0.9;
		disks[0].busy = Math.round(clamp(disks[0].w / 4e5, 3, 96));
		disks[1].r = rd[rd.length - 1] * 0.2;
		disks[1].w = wr[wr.length - 1] * 0.1;
		disks[1].busy = Math.round(clamp(disks[1].w / 2e5, 0, 40));
		// A demo hour passes every 2s, so the filling mounts creep up.
		mounts.forEach((m) => (m.used = Math.min(m.size * 0.995, m.used + m.rate / 1800)));
		some = walk(some, 1.5, 4, 40);
		full = walk(full, 0.8, 0, some / 2);
		if (f % 8 === 0) sel = (sel + 1) % mounts.length;
	};
	const fills = (m: (typeof mounts)[number]) => {
		if (!m.rate) return 'not filling';
		const h = (m.size - m.used) / m.rate;
		return h < 24 ? `~${Math.round(h)}h` : `~${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
	};
	return {
		every: 1000,
		tick: step,
		render(cols) {
			const L: Line[] = [
				header('DISK', cols),
				[[` sampled ${f % 2}s ago · every 2s`, 'mu']],
				[[` ${mounts.length} of 11 shown · pseudo, bind, read-only hidden`, 'mu']],
				blank(),
				section('FILESYSTEMS', 'usable excludes root reserve'),
				[[' ' + pad('MOUNT', 7) + padL('SIZE', 6) + padL('USABLE', 8) + ' '.repeat(12) + 'FULL IN', 'c']],
			];
			mounts.forEach((m, i) => {
				const frac = m.used / m.size;
				const b = bar(frac, 6);
				const c: Colour = frac > 0.9 ? 'r' : frac > 0.8 ? 'y' : 'g';
				const fi = fills(m);
				L.push([[i === sel ? '▸' : ' ', 'acc'], [pad(m.mount, 7), 'fg'], [padL(fmtBytes(m.size).replace(' ', ''), 6), 'mu'], [padL(fmtBytes(m.size - m.used).replace(' ', ''), 8) + ' ', 'fg'], [b.on, c], [b.off, 'dim'], [padL(Math.round(frac * 100) + '%', 4) + ' ', c], [fi, fi.startsWith('~') && !fi.includes('d') ? 'r' : fi.startsWith('~') ? 'y' : 'mu']]);
			});
			L.push([[' FULL IN at the rate of the last 24h', 'mu']]);
			L.push(blank(), section('DISKS', 'whole disks · sorted: write'));
			L.push([[' ' + pad('DISK', 10) + pad('TYPE', 6) + padL('SIZE', 5) + padL('READ', 9) + padL('WRITE', 9) + padL('BUSY', 6), 'c']]);
			disks.forEach((d) => L.push([[' ' + pad(d.name, 10), 'fg'], [pad(d.type, 6) + padL(d.size, 5), 'mu'], [padL(fmtRate(d.r).replace(' ', ''), 9), 'b'], [padL(fmtRate(d.w).replace(' ', ''), 9), 'm'], [padL(d.busy + '%', 6), d.busy > 80 ? 'r' : d.busy > 50 ? 'y' : 'fg']]));
			// Read above the line, write below, each on its own scale (writes run ten times larger).
			const w = cols - 15;
			L.push(blank());
			columns(rd.slice(-w), 2).forEach((s, i) => L.push([[i === 1 ? padL('read ' + fmtRate(rd[rd.length - 1]).replace(' ', ''), 13) + ' ' : ' '.repeat(14), 'mu'], [s, 'b']]));
			L.push([[' '.repeat(14) + '─'.repeat(w), 'mu']]);
			columns(wr.slice(-w), 2).reverse().forEach((s, i) => L.push([[i === 0 ? padL('write ' + fmtRate(wr[wr.length - 1]).replace(' ', ''), 13) + ' ' : ' '.repeat(14), 'mu'], [s.replace(/[▁▂▃▄▅▆▇]/g, '▀'), 'm']]));
			L.push(blank(), [[' /proc/pressure/io · stall time, not busy time', 'mu']]);
			L.push([[' some ', 'mu'], [`${some.toFixed(1)}%`, some > 30 ? 'r' : some > 15 ? 'y' : 'fg'], [' avg10   full ', 'mu'], [`${full.toFixed(1)}%`, full > 10 ? 'r' : 'fg'], [' avg10', 'mu']]);
			L.push(blank(), keys('↑↓ select  [↵] detail  [s]ort  tab section  [w] 6h  [p]ause  [q]uit'));
			return L;
		},
	};
}

/* ── web ─────────────────────────────────────────────────────────────── */

function googleAnalytics(): Demo {
	// Active users per minute for the last 30 minutes, and the baseline for this minute of the week.
	const perMin: number[] = hist(30, () => Math.round(rnd(30, 60)));
	// The opscope site itself: its one page, its windows, and the events it sends.
	const active = new Roll(71);
	const base = 48;
	const pages = [
		{ t: '/', n: 34 },
		{ t: '/#widgets', n: 19 },
		{ t: '/?theme=nord', n: 11 },
	];
	const countries = [
		{ t: 'United States', n: 41 },
		{ t: 'Australia', n: 9 },
		{ t: 'Germany', n: 7 },
	];
	const events = [
		{ name: 'command_copy', today: 23, last: 31, d7: [5, 6, 5, 7, 6, 7] },
		{ name: 'outbound_click', today: 41, last: 38, d7: [3, 4, 3, 5, 4, 5] },
	];
	let views = 540, today = 1842;
	const lastWeek = 1690;
	const realtime = new Refresh(6, () => {
		// A new minute lands: the oldest falls off the chart.
		const n = Math.round(clamp(active.target + rnd(-9, 10), 28, 110));
		active.set(n);
		push(perMin, Math.round(n * rnd(0.5, 0.9)), 30);
		views += Math.round(rnd(-20, 30));
		pages.forEach((p) => (p.n = Math.max(1, p.n + Math.round(rnd(-3, 3)))));
		pages.sort((a, b) => b.n - a.n);
		countries.forEach((c) => (c.n = Math.max(1, c.n + Math.round(rnd(-2, 2)))));
		countries.sort((a, b) => b.n - a.n);
		if (Math.random() < 0.4) events[1].today++;
		if (Math.random() < 0.2) events[0].today++;
		today += Math.round(rnd(4, 18));
	}, 3);
	return {
		every: 1000,
		tick() {
			realtime.poll();
		},
		render(cols) {
			const now = active.n;
			const d = Math.round(((now - base) / base) * 100);
			const L: Line[] = [
				header('GOOGLE ANALYTICS', cols),
				[[' opscope.stealth-factory.co', 'fg'], ['  ←→ 1 of 2  ', 'mu'], realtime.seg('realtime')],
				blank(),
				section('RIGHT NOW', 'last 30 min · GA realtime'),
				[[' active users ', 'mu'], [String(now), active.moving ? 'g' : 'fg'], [`   baseline ${base} · from 2 of 4 weeks   `, 'mu'], [`${d >= 0 ? '+' : ''}${d}% ${d > 20 ? '▲' : d < -20 ? '▼' : ''}`, d > 20 ? 'g' : d < -20 ? 'r' : 'fg']],
			];
			const w = Math.min(30, cols - 16);
			const pk = Math.max(...perMin);
			columns(perMin.slice(-w), 3, pk).forEach((s, i) => L.push([[pad(i === 0 ? ' per minute' : i === 1 ? ` peak ${pk}` : ' 30 min → now', 15), 'mu'], [s, 'acc']]));
			L.push([[' views 30m ', 'mu'], [views.toLocaleString('en-US'), 'fg']]);
			L.push([[' key events 30m: ', 'mu'], ['command_copy 3', 'fg'], [' (base 2)', 'mu']]);
			const half = Math.floor((cols - 2) / 2);
			const two = half >= 24;
			const tw = (two ? half : cols - 2) - 6;
			if (two) {
				L.push([[' ' + pad('PAGE', tw) + padL('NOW', 5) + '  ' + pad('COUNTRY', tw - 1) + padL('NOW', 5), 'c']]);
				pages.forEach((p, i) => L.push([[' ' + pad(p.t, tw), 'fg'], [padL(p.n, 5) + '  ', 'acc'], [pad(countries[i].t, tw - 1), 'fg'], [padL(countries[i].n, 5), 'acc']]));
			} else {
				L.push([[' ' + pad('PAGE', tw) + padL('NOW', 5), 'c']]);
				pages.forEach((p) => L.push([[' ' + pad(p.t, tw), 'fg'], [padL(p.n, 5), 'acc']]));
			}
			L.push(blank(), section('TODAY VS SAME WEEKDAY', 'sessions · 2–6 h behind'));
			const dt = Math.round(((today - lastWeek) / lastWeek) * 100);
			L.push([[' to 15:00: today ', 'mu'], [today.toLocaleString('en-US'), 'fg'], [`  last Tue ${lastWeek.toLocaleString('en-US')} `, 'mu'], [`${dt >= 0 ? '+' : ''}${dt}%`, dt >= 0 ? 'g' : 'r']]);
			L.push(blank(), section('KEY EVENTS', 'today to 15:00 vs same weekday'));
			L.push([[' ' + pad('EVENT', 15) + padL('TODAY', 6) + padL('LAST', 6) + padL('Δ', 7) + '  LAST 7 D', 'c']]);
			events.forEach((e, i) => {
				const de = Math.round(((e.today - e.last) / e.last) * 100);
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [pad(e.name, 15), 'fg'], [padL(e.today, 6), 'fg'], [padL(e.last, 6), 'mu'], [padL(`${de >= 0 ? '+' : ''}${de}%`, 7), de <= -20 ? 'r' : de >= 20 ? 'g' : 'fg'], ['  ' + spark(e.d7, 8), 'acc'], ['░', 'dim']]);
			});
			L.push(blank(), keys('↑↓ row  tab section  ←→ property  ↵ detail  [m]etric  [l]ive  [q]uit'));
			return L;
		},
	};
}

function googleSearchConsole(): Demo {
	// Clicks per hour, last 24; the newest hours are still being collected.
	const shape = (h: number) => 40 + 100 * Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2)) + rnd(-12, 12);
	let hour = 11;
	const clicks: number[] = Array.from({ length: 24 }, (_, i) => Math.round(shape(hour - 23 + i)));
	let collecting = 3;
	const queries = [
		{ q: 'example widget pricing', impr: 6000, d: 50, pos: 5.0, dp: 0 },
		{ q: 'example dashboard', impr: 3200, d: 12, pos: 7.4, dp: 0.6 },
		{ q: 'example', impr: 1000, d: NaN, pos: 5.0, dp: 0 },
		{ q: 'example cli docs', impr: 840, d: -31, pos: 11.2, dp: -2.1 },
	];
	const index = [
		{ st: 'FAIL', c: 'r' as Colour, page: '/docs/getting-started', why: 'SOFT_404 · Google chose /pricing' },
		{ st: 'ERROR', c: 'y' as Colour, page: '/docs/old-guide', why: 'HTTP 404 · crawled 34h ago' },
	];
	let inspections = 3, sel = 0, f = 0;
	const refresh = new Refresh(12, () => {
		// Google finishes an hour: it stops collecting, and a new hour starts.
		hour = (hour + 1) % 24;
		push(clicks, Math.round(shape(hour)), 24);
		collecting = 3;
		inspections += 1;
		queries.forEach((q) => (q.impr = Math.round(q.impr * rnd(0.98, 1.04))));
	}, 4);
	return {
		every: 1000,
		tick() {
			f++;
			refresh.poll();
			if (f % 5 === 0) sel = (sel + 1) % queries.length;
		},
		render(cols) {
			const L: Line[] = [
				header('SEARCH CONSOLE', cols),
				[[' sc-domain:example.com', 'fg'], ['   site 1 of 2   ', 'mu'], refresh.seg('fetched')],
				[[` hourly to ${String(hour).padStart(2, '0')}:00 · Google runs a few hours behind`, 'mu']],
				blank(),
				section('LAST 24 HOURS', 'clicks by hour'),
			];
			const done = clicks.slice(0, 24 - collecting);
			const pk = Math.max(...done);
			// Wide bars (2 chars + a gap) need 12 + 24 * 3 - 1 = 83 columns; below that, 1-char bars keep every hour visible.
			const cw = cols >= 83 ? 2 : 1;
			const grid = columns(clicks.map((v, i) => (i >= 24 - collecting ? 0 : v)), 3, pk);
			grid.forEach((s, r) => {
				const row = [...s]
					.map((ch, i) => (r === 2 && i >= 24 - collecting ? '░' : ch).repeat(cw))
					.join(cw > 1 ? ' ' : '');
				L.push([[pad(r === 0 ? ' clicks' : r === 1 ? ` peak ${pk}` : '', 12), 'mu'], [row, 'g']]);
			});
			const total = done.reduce((a, b) => a + b, 0);
			L.push([[` ${done.length} complete hours: `, 'mu'], [`${total.toLocaleString('en-US')} clicks`, 'fg'], ['  vs last week ', 'mu'], ['+8%', 'g']]);
			L.push([[' ░ still collecting', 'dim']]);
			L.push(blank(), section('MOVERS · QUERIES', '7 days vs prior 7'));
			const qw = Math.max(14, Math.min(26, cols - 26));
			L.push([['  ' + pad('QUERY', qw) + padL('IMPR', 7) + padL('Δ', 7) + padL('POS', 6), 'c']]);
			queries.forEach((q, i) => L.push([[i === sel ? '▸ ' : '  ', 'acc'], [pad(q.q, qw), i === sel ? 'acc' : 'fg'], [padL(q.impr.toLocaleString('en-US'), 7), 'fg'], [padL(isNaN(q.d) ? 'new' : `${q.d > 0 ? '+' : ''}${q.d}%`, 7), isNaN(q.d) || q.d > 0 ? 'g' : 'r'], [padL(q.pos.toFixed(1), 6), 'mu'], [q.dp ? (q.dp > 0 ? ' ▲' : ' ▼') + Math.abs(q.dp).toFixed(1) : '', q.dp > 0 ? 'g' : 'r']]));
			L.push(blank(), section('INDEX HEALTH', `inspected daily · ${inspections}/2,000`));
			index.forEach((x) => {
				L.push([['  ' + pad(x.st, 7), x.c], [x.page, 'fg']]);
				L.push([['           ' + x.why, 'mu']]);
			});
			L.push([['  ' + pad('PASS', 7), 'g'], ['23 pages   crawled within 34h', 'mu']]);
			L.push(blank(), keys('↑↓ select  tab section  ←→ site  ↵ open  [m]etric  [i]nspect  [q]uit'));
			return L;
		},
	};
}

/* ── agents (Rex) ────────────────────────────────────────────────────── */

function rex(): Demo {
	let f = 0, pct = 40;
	const agents = [
		{ who: 'claude', st: 'BLOCKED', for: 120, cpu: 1, mem: '412M', at: 'api:1', dir: '~/src/api', title: '◑ api', msg: 'permission · approve: cargo test --workspace' },
		{ who: 'codex', st: 'working', for: 300, cpu: 22, mem: '231M', at: 'web:2', dir: '~/src/web', title: '◑ web', msg: 'rewriting the checkout form' },
		{ who: 'claude', st: 'done', for: 960, cpu: 0, mem: '388M', at: 'site:2', dir: '~/work/site', title: 'Ok', msg: 'replied \'ok\' as requested' },
		{ who: 'claude', st: 'unknown', for: 720, cpu: 0, mem: '193M', at: 'work:1', dir: '~', title: '◑ opscope', msg: 'no status reported' },
	];
	const order = ['BLOCKED', 'done', 'working', 'unknown'];
	return {
		every: 250,
		tick() {
			f++;
			agents.forEach((a) => (a.for += 0.25));
			agents[1].cpu = Math.round(walk(agents[1].cpu, 4, 4, 70));
			if (f % 4 === 0) pct = pct >= 100 ? 0 : pct + 1;
			// Every so often the working agent finishes, then starts on something new.
			if (f % 80 === 0) {
				const a = agents[1];
				a.st = a.st === 'done' ? 'working' : 'done';
				a.for = 0;
				a.msg = a.st === 'done' ? 'checkout form rewritten, tests pass' : 'rewriting the checkout form';
			}
		},
		render(cols) {
			const icon = (s: string): [string, Colour] => (s === 'working' ? [spinner[f % 10], 'y'] : s === 'done' ? ['✓', 'g'] : s === 'BLOCKED' ? ['⚠', 'r'] : ['?', 'mu']);
			const count = (s: string) => agents.filter((a) => a.st === s).length;
			const waiting = count('BLOCKED') + count('done');
			const L: Line[] = [
				header('REX PANES', cols),
				[[` ${agents.length} agents · 3 sessions · 10 panes  `, 'fg'], [`${count('BLOCKED')} blocked  `, 'r'], [`${count('done')} done  `, 'g'], [`${count('working')} working`, 'y']],
				[[' ', 'fg'], ...stack([[count('BLOCKED'), 'r'], [count('done'), 'g'], [count('working'), 'y'], [count('unknown') + 5, 'dim']], cols - 2)],
				[[` ▸ ${waiting} panes waiting for you`, 'acc']],
				blank(),
				section('AGENTS', String(agents.length)),
				[[' ' + pad('AGENT', 10) + pad('STATE', 9) + padL('FOR', 5) + padL('CPU', 6) + padL('MEM', 6) + '  SESSION', 'c']],
			];
			[...agents].sort((a, b) => order.indexOf(a.st) - order.indexOf(b.st)).forEach((a, i) => {
				const [ic, c] = icon(a.st);
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [ic + ' ', c], [pad(a.who, 8), 'fg'], [pad(a.st, 9), c], [padL((a.st === 'unknown' ? '≥' : '') + ago(a.for), 5), 'mu'], [padL(a.cpu + '%', 6), 'fg'], [padL(a.mem, 6), 'mu'], ['  ' + a.at, 'c']]);
				L.push([[`   ${a.dir}  `, 'mu'], [a.title, 'fg']]);
				L.push([[`   ${a.msg}`, a.st === 'BLOCKED' ? 'y' : 'mu']]);
			});
			L.push(blank(), section('PROCESSES', '2 panes running something'));
			L.push([[' ▪ ', 'b'], [pad('terraform', 14), 'fg'], [pad('working', 9), 'y'], [padL(pct + '%', 5), 'fg'], ['  infra:1', 'c']]);
			L.push([['   ├ ', 'mu'], ['plan  ', 'fg'], ['done  ', 'g'], ['├ apply  ', 'mu'], [pct < 100 ? `${spinner[f % 10]} running` : '✓ done', pct < 100 ? 'y' : 'g']]);
			L.push([[' ▪ ', 'b'], [pad('cargo', 14), 'fg'], [pad('', 9), 'mu'], [padL('87%', 5), 'fg'], ['  web:1', 'c']]);
			L.push(blank(), section('IDLE', '4 panes at a prompt'), [[' ▫ ~/work/site', 'mu']], [[' ▫ ~/src/api', 'mu']]);
			L.push(blank(), keys('↑↓ select  ↵ switch to this pane  tab section  [e]xplain  [r]efresh  [q]uit'));
			return L;
		},
	};
}

export const demos: Record<string, () => Demo> = {
	latency, tailnet, ports, netwatch, link, disk,
	'vercel-deployments': vercel, github, 'github-actions': githubActions, 'github-prs': githubPrs, linear,
	'google-analytics': googleAnalytics, 'google-search-console': googleSearchConsole,
	'herdr-panes': herdr, 'luvus-panes': luvus, 'rex-panes': rex, 'agent-usage': agentUsage,
	'google-trends': trends, clocks, months, matrix,
};

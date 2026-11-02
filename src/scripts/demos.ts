/**
 * Text-mode stand-ins for each opscope widget, laid out after the widgets'
 * own README mock-ups and the demo video. Every number is made up and moves
 * on its own; nothing here reads a real machine.
 */
import {
	bar, blank, clamp, clock, columns, fmtBytes, fmtDur, fmtMs, fmtRate, header, keys, pad, padL, pick, push, rnd,
	section, spark, stack, walk, BLOCKS, type Colour, type Line,
} from './tui';

export interface Demo {
	/** Milliseconds between frames. */
	every: number;
	tick(): void;
	render(cols: number, rows: number): Line[];
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
			const L: Line[] = [header('NETWORK LATENCY MONITOR', cols), [[` ${hosts.length} targets · 0.5s interval · `, 'mu'], [clock(new Date()), 'fg']], blank()];
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
	return {
		every: 2000,
		tick: step,
		render(cols) {
			const live = peers.filter((p) => p.h.some((v) => v > 50));
			const L: Line[] = [
				header('TAILNET', cols),
				[[' server-01  ', 'fg'], ['100.64.0.10  ', 'c'], ['example.ts.net', 'mu']],
				[[' 5 online / 6 peers   ', 'fg'], ['3 direct', 'g'], ['   2 relayed', 'y'], ['   every 2s', 'mu']],
				blank(),
				section('LIVE THROUGHPUT', 'peers moving data'),
			];
			for (const p of live) {
				const d = p.h[p.h.length - 1], u = p.u[p.u.length - 1];
				L.push([[' ' + pad(p.name, 15), 'fg'], ['↓', 'g'], [spark(p.h), 'g'], [' ↑', 'b'], [spark(p.u), 'b'], [padL(fmtRate(d), 11) + padL(fmtRate(u), 10), 'mu']]);
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
			const w = cols - 13;
			const L: Line[] = [header('DEV SERVERS', cols), [[' 12 listening · ', 'fg'], ['5 yours', 'acc'], [' · ', 'fg'], ['1 reachable off-box', 'y'], ['   every 4s', 'mu']], blank()];
			L.push([[padL('PORT', 6) + '  ' + pad('BIND', 7) + pad('WHAT', 13) + pad('PROJECT', 13) + padL('UP', 5) + '  ' + 'EXPOSED', 'c']]);
			rows.forEach((r, i) => L.push([[i === 1 ? '▸' : ' ', 'acc'], [padL(r.port, 5) + '  ', 'fg'], [pad(r.bind, 7), r.bind === 'all' ? 'y' : 'mu'], [pad(r.what, 13), 'fg'], [pad(r.project, 13), 'c'], [padL(ago(r.up), 5) + '  ', 'mu'], [r.ex, r.ex === '-' ? 'mu' : 'g']]));
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
				[[` ${procs.length} processes · ${procs.filter((p) => p.down).length} moving · sorted by total   `, 'fg'], ['every 1s', 'mu']],
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
	return {
		every: 1000,
		tick: step,
		render(cols, rows) {
			const L: Line[] = [header('CONNECTIONS', cols), [[` ${peers.length} inbound · measured by the kernel, nothing sent   `, 'fg'], ['every 2s', 'mu']], blank()];
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

const commits = ['fix(a11y): announce the answer when it loads', 'feat: add the timetable view', 'chore(deps): bump the build toolchain', 'docs: explain the cache key', 'refactor: split the parser', 'test: cover the empty feed', 'feat(api): page the results'];
const repos = ['acme/web-app', 'acme/api', 'acme/deploy-tools', 'labs/toy', 'acme/docs'];

function vercel(): Demo {
	const act = hist(48, () => (Math.random() < 0.5 ? 0 : Math.round(rnd(0, 6))));
	const build = hist(60, () => rnd(150, 240));
	type D = { ok: boolean; proj: string; t: number; age: number; sha: string; br: string; msg: string; building?: boolean };
	const rec: D[] = Array.from({ length: 6 }, (_, i) => ({ ok: i !== 2, proj: pick(['site', 'marketing', 'docs', 'web-app']), t: rnd(18, 240), age: 600 + i * 1700, sha: Math.random().toString(16).slice(2, 9), br: pick(['main', 'feature/timetable', 'fix/a11y']), msg: pick(commits) }));
	let n = 0;
	return {
		every: 1000,
		tick() {
			rec.forEach((d) => (d.age += 1));
			const cur = rec[0];
			if (cur.building) {
				cur.t += 1;
				if (cur.t > 70) { cur.building = false; cur.ok = Math.random() > 0.15; push(build, cur.t, 60); }
			} else if (++n % 25 === 0) {
				rec.unshift({ ok: true, building: true, proj: pick(['site', 'docs', 'web-app']), t: 0, age: 0, sha: Math.random().toString(16).slice(2, 9), br: pick(['main', 'feature/timetable']), msg: pick(commits) });
				rec.pop();
				act[act.length - 1]++;
			}
		},
		render(cols) {
			const w = cols - 2;
			const L: Line[] = [
				header('VERCEL DEPLOYMENTS', cols),
				[[' 200 deploys · 6 proj  ', 'fg'], ['179 ready', 'g'], ['  21 error', 'r'], ['   0s ago', 'mu']],
				keys('↑↓ select · →/↵ details · [s]tate failed · [/]filter · [r]efresh · [q]uit'),
				blank(),
				section('ACTIVITY', 'deploys/hour, last 48h'),
				[[' ' + act.slice(-w).map((v) => (v ? BLOCKS[clamp(Math.round(v / 6 * 8), 1, 8)] : '·')).join(''), 'acc']],
				[[' ' + pad('48h ago', w - 9) + 'peak 6/h', 'mu']],
				section('BUILD TIME', `median ${fmtDur(build.slice().sort((a, b) => a - b)[30])}  p95 ${fmtDur(Math.max(...build) * 0.97)}`),
				[[' ' + spark(build.slice(-w)), 'b']],
				blank(),
				section('RECENT', `1 of 200`),
			];
			rec.forEach((d, i) => {
				const st: [string, Colour] = d.building ? ['◐ Building', 'y'] : d.ok ? ['● Ready   ', 'g'] : ['✖ Error   ', 'r'];
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [st[0] + ' ', st[1]], [pad(d.proj, 10), 'fg'], [padL(fmtDur(d.t), 6), 'mu'], [padL(ago(d.age), 5) + '  ', 'mu'], [d.sha + ' ', 'c'], [d.br, 'm']]);
				L.push([['   ' + d.msg, 'mu']]);
			});
			return L;
		},
	};
}

function github(): Demo {
	let awaiting = 486, ready = 180, draft = 16, merged = 17, dropped = 4;
	const opened = [3, 1, 7, 2, 11, 9, 6], mergedD = [1, 4, 2, 5, 7, 3, 8];
	const contrib = hist(7 * 40, () => (Math.random() < 0.35 ? 0 : Math.random()));
	const shade = (v: number) => (v === 0 ? ' ' : v < 0.35 ? '░' : v < 0.7 ? '▒' : '▓');
	return {
		every: 2000,
		tick() {
			if (Math.random() < 0.4) { awaiting += pick([-1, 1]); }
			if (Math.random() < 0.25) { merged++; ready = Math.max(0, ready - 1); mergedD[6]++; }
			if (Math.random() < 0.3) { opened[6]++; awaiting++; contrib[contrib.length - 1] = Math.min(1, contrib[contrib.length - 1] + 0.2); }
		},
		render(cols) {
			const w = cols - 2;
			const tot = awaiting + ready + draft;
			const rate = merged / (merged + dropped);
			const b = bar(rate, Math.max(10, w - 30));
			const L: Line[] = [
				header('GITHUB OPS', cols),
				[[' 9 accounts   updated 41s ago   ', 'fg'], ['4100/5000 api', 'mu']],
				section('OPEN PR STATE', `${tot} PRs · 220 issues open`),
				[[' ', 'fg'], ...stack([[awaiting, 'y'], [ready, 'g'], [draft, 'mu']], w)],
				[[' ▇ ', 'y'], [`awaiting review ${awaiting}  `, 'fg'], ['▇ ', 'g'], [`ready to merge ${ready}  `, 'fg'], ['▇ ', 'mu'], [`draft ${draft}`, 'fg']],
				blank(),
				section('MERGE RATE', 'last 7 days'),
				[[' ' + padL(Math.round(rate * 100) + '%', 4) + '  ', 'r'], [b.on, 'r'], [b.off, 'dim'], [`  ${merged} merged / ${dropped} dropped`, 'mu']],
				blank(),
				section('PR FLOW', '7d · ▲ opened · ▼ merged'),
			];
			const cw = Math.max(2, Math.floor((w - 2) / 7) - 1);
			const up = columns(opened, 3, 12), dn = columns(mergedD, 3, 12);
			up.forEach((r) => L.push([[' ' + [...r].map((ch) => ch.repeat(cw) + ' ').join(''), 'm']]));
			L.push([[' ' + '─'.repeat((cw + 1) * 7), 'mu']]);
			dn.reverse().forEach((r) => L.push([[' ' + [...r].map((ch) => (ch === ' ' ? ' ' : '█').repeat(cw) + ' ').join(''), 'g']]));
			L.push(blank(), section('CONTRIBUTIONS', 'yours, everywhere · 52 weeks'));
			const weeks = Math.min(40, w - 5);
			['Mon', '   ', 'Wed', '   ', 'Fri'].forEach((d, r) => {
				let s = '';
				for (let k = 40 - weeks; k < 40; k++) s += shade(contrib[k * 7 + r]);
				L.push([[' ' + d + ' ', 'mu'], [s, 'g']]);
			});
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
	return {
		every: 1000,
		tick() {
			runs.forEach((r) => { r.age++; if (r.st === 'running') r.t++; });
			const r = runs[0];
			if (r.st === 'running' && r.t > 110) r.st = Math.random() < 0.8 ? 'success' : 'failure';
			else if (r.st !== 'running' && Math.random() < 0.06) {
				runs.unshift({ st: 'running', t: 0, age: 0, repo: pick(repos), wf: pick(['CI', 'Deploy', 'Lint']), msg: pick(commits) });
				runs.pop();
				act[act.length - 1] += 1;
			}
		},
		render(cols) {
			const w = cols - 2;
			const f = runs.filter((r) => r.st === 'failure').length;
			const icon: Record<R['st'], [string, Colour]> = { success: ['● success', 'g'], failure: ['✖ failure', 'r'], running: ['◐ running', 'y'], queued: ['○ queued ', 'mu'] };
			const L: Line[] = [
				header('GITHUB ACTIONS', cols),
				[[' 10 accounts   updated 20s ago   ', 'fg'], ['4840/5000 api', 'mu']],
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
				L.push([[`   ${r.wf} · ${r.msg}`, 'mu']]);
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
	return {
		every: 1500,
		tick() {
			prs.forEach((p) => (p.idle += 1.5));
			const p = pick(prs);
			if (p.checks === 'running' && Math.random() < 0.3) p.checks = Math.random() < 0.8 ? 'pass' : 'FAIL';
			else if (Math.random() < 0.08) { p.idle = 0; p.checks = 'running'; }
		},
		render(cols) {
			const w = cols - 2;
			const appr = prs.filter((p) => p.review === 'approved').length, ch = prs.filter((p) => p.review === 'changes').length;
			const L: Line[] = [
				header('GITHUB PRS', cols),
				[[' 4 accounts   updated 12s ago   ', 'fg'], ['4567/5000 api', 'mu']],
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
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [pad('#' + p.n, 6), 'fg'], [pad(p.repo, 13), 'c'], [pad(p.title, Math.max(8, cols - 47)), 'fg'], [padL(p.review, 13), p.review === 'approved' ? 'g' : p.review === 'changes' ? 'r' : 'y'], [padL(p.checks, 8), p.checks === 'pass' ? 'g' : p.checks === 'FAIL' ? 'r' : 'y'], [padL(ago(p.idle), 6), 'mu']]));
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
	let triage = 704, backlog = 314, todo = 155, prog = 48;
	return {
		every: 2000,
		tick() {
			const c = pick(cycles);
			if (c.done < c.pts && Math.random() < 0.5) c.done++;
			if (Math.random() < 0.3) { triage++; created[13]++; }
			if (Math.random() < 0.3) { prog = Math.max(0, prog - 1); completed[13]++; }
			if (Math.random() < 0.2) { triage--; todo++; }
		},
		render(cols) {
			const w = cols - 2;
			const bw = Math.max(8, cols - 34);
			const L: Line[] = [
				header('LINEAR OPS', cols),
				[[' 14 teams   updated 1m ago   ', 'fg'], ['2490 req left/hr', 'mu']],
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
				const b = bar(c.done / c.pts, bw);
				L.push([[i === 0 ? '▸' : ' ', 'acc'], [pad(c.name, 14), 'fg'], [b.on, 'acc'], [b.off, 'dim'], [padL(Math.round((c.done / c.pts) * 100) + '%', 5), 'fg'], [`  ${c.left}d left`, 'mu'], [c.added ? `  +${c.added}` : '', 'y']]);
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
	return {
		every: 250,
		tick: () => void f++,
		render(cols) {
			const L: Line[] = [
				header('LUVUS PANES', cols),
				[[' 4 agents · 9 panes   ', 'fg'], ['1 blocked', 'r'], ['   1 done', 'g'], ['   1 working', 'y'], ['   1 idle', 'mu']],
				[[' session default · uhp 1.0 · 3 workspaces · seq ', 'mu'], [String(4186 + f), 'fg']],
				[[' ▸ 2 agents waiting for you', 'acc']],
				blank(),
				section('AGENTS', '4'),
				[[' ' + pad('AGENT', 10) + pad('STATE', 9) + padL('FOR', 5) + '  ' + pad('WORKSPACE', 10) + 'BRANCH', 'c']],
				[['▸', 'acc'], ['⚠ ', 'r'], [pad('claude', 8), 'fg'], [pad('BLOCKED', 9), 'r'], [padL('4m', 5) + '  ', 'mu'], [pad('some-cli', 10), 'c'], ['feature/port-the-parser', 'm']],
				[['   state via integration_report', 'mu']],
				[[' ', 'acc'], ['✓ ', 'g'], [pad('codex', 8), 'fg'], [pad('DONE', 9), 'g'], [padL('16m', 5) + '  ', 'mu'], [pad('site', 10), 'c'], ['main', 'm']],
				[['   state via manifest_rule', 'mu']],
				[[' ', 'acc'], [spinner[f % 10] + ' ', 'y'], [pad('claude', 8), 'fg'], [pad('working', 9), 'y'], [padL('2m', 5) + '  ', 'mu'], [pad('infra', 10), 'c'], ['feature/schedule-module', 'm']],
				[['   state via screen_text', 'mu']],
				[[' ', 'acc'], ['· ', 'mu'], [pad('gemini', 8), 'fg'], [pad('idle', 9), 'mu'], [padL('16m', 5) + '  ', 'mu'], [pad('docs', 10), 'c'], ['main', 'm']],
				blank(),
				section('TASKS', '2'),
				[[' ◆ ', 'acc'], [pad('t-014', 8), 'fg'], [pad('claimed', 10), 'y'], ['Port the parser to the new envelope', 'fg']],
				[[' ◆ ', 'acc'], [pad('t-015', 8), 'fg'], [pad('ready', 10), 'g'], ['Rewrite the lease conflict message', 'fg']],
				blank(),
				section('LEASES', '1'),
				[[' ⛒ ', 'o'], [pad('t-014', 8), 'fg'], ['src/parser/**  ', 'c'], ['(claude)', 'mu']],
				blank(),
				keys('↑↓ select  ↵ switch to this pane  [t]asks  [r]efresh  [q]uit'),
			];
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
	let read = 13;
	return {
		every: 1000,
		tick() {
			read = (read + 1) % 60;
			const r = groups[0].rows[0];
			r.used = Math.min(1, r.used + rnd(0, 0.004));
			r.delta = Math.round((r.pace - r.used) * 100);
		},
		render(cols) {
			const bw = clamp(cols - 34, 10, 30);
			const L: Line[] = [
				header('AGENT USAGE', cols),
				[[` local state · live quota · read ${read}s ago`, 'mu']],
				[['[+] ', 'acc'], ['CLAUDE · CODEX · COPILOT · CURSOR · GROK', 'b']],
				blank(),
				section('QUOTAS', '9 limits across 5 agents · ranked by usage'),
			];
			groups.forEach((g) => {
				L.push([[' ' + g.name, g.c]]);
				g.rows.forEach((r) => {
					const b = bar(r.used, bw);
					const mark = clamp(Math.round(r.pace * bw), 0, bw - 1);
					const offArr = [...b.off];
					const onLen = [...b.on].length;
					if (mark >= onLen && mark - onLen < offArr.length) offArr[mark - onLen] = '│';
					L.push([['  ' + pad(r.label, 13), 'fg'], [b.on, g.c === 'fg' ? 'mu' : g.c], [offArr.join(''), 'dim'], [padL((r.used * 100).toFixed(r.used < 0.1 ? 1 : 0) + '%', 7), g.c === 'fg' ? 'fg' : g.c], [padL((r.delta > 0 ? '+' : '') + r.delta + '%', 6), r.delta >= 0 ? 'g' : 'y'], ['  ' + r.reset, 'mu']]);
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
	'5': ['█▀▀', '▀▀█', '▀▀▀'], '6': ['█▀▀', '█▀█', '▀▀▀'], '7': ['▀▀█', '  █', '  ▀'], '8': ['█▀█', '█▀█', '▀▀▀'], '9': ['█▀█', '▀▀█', '▀▀▀'], ':': [' ', '▪', ' '],
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
			big(`${String(local.h).padStart(2, '0')}:${local.m}:${local.s}`).forEach((r) => L.push([[' ' + r, 'g']]));
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
		every: 60000,
		tick() {},
		render(cols) {
			const now = new Date();
			const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
			const off = -now.getTimezoneOffset() / 60;
			const L: Line[] = [
				header('MONTHS', cols),
				[[` ${now.toISOString().slice(0, 10)} ${days[now.getDay()]} · reckoned on this machine (UTC${off >= 0 ? '+' : ''}${off})`, 'fg']],
				[[' weeks start Monday · wk is the ISO 8601 week', 'mu']],
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
					const line: Line = [['  ' + padL(isoWeek(new Date(start.getTime() + w * 7 * 864e5)), 2), 'c']];
					for (let d = 0; d < 7; d++) {
						const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
						const today = day.getMonth() === m && day.toDateString() === now.toDateString();
						line.push([' ', 'fg'], [padL(day.getDate(), 2), today ? 'inv' : day.getMonth() === m ? (d >= 5 ? 'y' : 'fg') : 'dim']);
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
	let fetched = 2 * 60, sel = 0;
	return {
		every: 1000,
		tick() {
			fetched++;
			if (fetched % 4 === 0) sel = (sel + 1) % terms.length;
			if (fetched > 300) { fetched = 0; terms.forEach((t) => { t.seen++; t.started += 5; }); }
		},
		render(cols) {
			const L: Line[] = [
				header('TRENDS AU', cols),
				[[' [AU]', 'inv'], ['·1  US ·  GB ·', 'mu']],
				[[` fetched ${ago(fetched)} ago · Google's Trending Now feed, every 5 min`, 'mu']],
				blank(),
				[[' TRENDING NOW', 'acc']],
				[[` "approx traffic" is Google's bucket, not a count · ${terms.length} of ${terms.length} · 1 new`, 'mu']],
				[['  ' + pad('SEARCH', 22) + pad('TRAFFIC', 8) + pad('STARTED', 8) + pad('SEEN', 5) + 'NEWS', 'c']],
			];
			terms.forEach((t, i) => L.push([[i === sel ? '▸ ' : '  ', 'acc'], [pad(t.q, 22), i === sel ? 'acc' : 'fg'], [pad(t.traffic, 8), 'y'], [pad(ago(t.started * 60), 8), 'mu'], [pad(t.seen ? t.seen + '×' : 'new', 5), t.seen ? 'mu' : 'g'], [t.news, 'mu']]));
			L.push(blank(), [[' LEFT THE FEED', 'acc']], [[' this widget\'s own observation · kept an hour', 'mu']], [['  old example term  ', 'fg'], ['was 1000+ · in 9 fetches over 40m · gone 7m ago', 'mu']]);
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

export const demos: Record<string, () => Demo> = {
	latency, tailnet, ports, netwatch, link,
	'vercel-deployments': vercel, github, 'github-actions': githubActions, 'github-prs': githubPrs, linear,
	'herdr-panes': herdr, 'luvus-panes': luvus, 'agent-usage': agentUsage,
	'google-trends': trends, clocks, months, matrix,
};

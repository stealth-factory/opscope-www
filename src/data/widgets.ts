export type Group = 'network' | 'dev' | 'agents' | 'ambient';

export interface Widget {
	name: string;
	group: Group;
	/** One line for the pane footer. Keep it in step with the opscope README. */
	line: string;
	needs: string;
}

export const groups: { key: Group; label: string }[] = [
	{ key: 'network', label: 'network' },
	{ key: 'dev', label: 'dev & deploy' },
	{ key: 'agents', label: 'agents' },
	{ key: 'ambient', label: 'ambient' },
];

export const widgets: Widget[] = [
	{ name: 'latency', group: 'network', line: 'Median, jitter and loss to your hosts on a log-scale graph, so a slow link and an unsteady one look different.', needs: 'ping' },
	{ name: 'tailnet', group: 'network', line: 'Tailscale peers and whether each is reached directly or through a relay, with live throughput.', needs: 'tailscale' },
	{ name: 'ports', group: 'network', line: 'What is listening on this machine, which project started it, and whether anything outside can reach it.', needs: 'lsof on macOS' },
	{ name: 'netwatch', group: 'network', line: 'Which processes are using the network, up and down, from the operating system’s own counters.', needs: 'ip + ss / nettop' },
	{ name: 'link', group: 'network', line: 'Round-trip time, jitter and loss for every inbound session, read rather than probed.', needs: 'ss / nettop' },
	{ name: 'vercel-deployments', group: 'dev', line: 'Vercel deployments over time, build-time drift, and the build log of the one you open.', needs: 'curl, Vercel token' },
	{ name: 'github', group: 'dev', line: 'Pull requests across every org: merge rate, review backlog and the contribution calendar.', needs: 'curl, GitHub token' },
	{ name: 'github-actions', group: 'dev', line: 'What is running or queued, which workflows keep failing, and whether the pipeline is getting slower.', needs: 'curl, GitHub token' },
	{ name: 'github-prs', group: 'dev', line: 'The pull requests you have to follow up on: checks, reviews, mergeability and a stack map.', needs: 'curl, GitHub token' },
	{ name: 'linear', group: 'dev', line: 'Linear across every team: outstanding work, running cycles and their scope creep.', needs: 'curl, Linear API key' },
	{ name: 'herdr-panes', group: 'agents', line: 'Every agent and process across all workspaces, ordered by which one needs a human.', needs: 'herdr' },
	{ name: 'luvus-panes', group: 'agents', line: 'Agents in a Luvus session ordered by who needs a human, plus their tasks and reserved paths.', needs: 'luvus' },
	{ name: 'agent-usage', group: 'agents', line: 'How much each coding agent has been used, and what is left of each one’s rate limit.', needs: 'the agents’ own logins' },
	{ name: 'google-trends', group: 'ambient', line: 'What a region is searching for right now, from Google’s Trending Now feed. No account or key.', needs: 'curl' },
	{ name: 'clocks', group: 'ambient', line: 'Server clock, countdowns to the hour and end of day, a pomodoro and a world clock.', needs: 'nothing' },
	{ name: 'months', group: 'ambient', line: 'A month grid you can page through, with ISO week numbers and the zone the dates are reckoned in.', needs: 'nothing' },
	{ name: 'matrix', group: 'ambient', line: 'Nothing whatsoever. Digital rain, with truecolor fade trails.', needs: 'nothing' },
];

/**
 * The home windows, each a set of panes. The first opens by default and sits
 * beside the shell (six panes, three across); the rest fill the screen on
 * their own (eight panes, four across).
 */
export const screens = [
	{ id: 'factory', title: 'software factory', widgets: ['vercel-deployments', 'github-actions', 'clocks', 'herdr-panes', 'github-prs', 'agent-usage'] },
	{ id: 'dashboard', title: 'dashboard', widgets: ['github', 'linear', 'google-trends', 'netwatch', 'latency', 'tailnet', 'ports', 'months'] },
] as const;

export const docsUrl = (name: string) =>
	`https://github.com/stealth-factory/opscope/blob/main/widgets/src/widgets/${name}/README.md`;

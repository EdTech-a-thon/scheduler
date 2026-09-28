<script lang="ts">
	import { DAY, type Span } from './sample';

	/**
	 * One day as the Planner draws it: each Schedule's ruled-out time in its
	 * color, stripes where several overlap, white where everyone is free, and
	 * Sessions as dark blocks on top.
	 */
	let {
		layers,
		sessions = [],
		height = 34
	}: {
		layers: { color: string; spans: Span[] }[];
		sessions?: { start: number; end: number; label: string }[];
		height?: number;
	} = $props();

	const pct = (m: number) => ((m - DAY[0]) / (DAY[1] - DAY[0])) * 100;

	const segments = $derived.by(() => {
		const cuts = [...new Set([DAY[0], DAY[1], ...layers.flatMap((l) => l.spans.flat())])].sort(
			(a, b) => a - b
		);
		const out: { start: number; end: number; colors: string[] }[] = [];
		for (let i = 0; i < cuts.length - 1; i++) {
			const [a, b] = [cuts[i], cuts[i + 1]];
			const colors = layers
				.filter((l) => l.spans.some(([s, e]) => s <= a && b <= e))
				.map((l) => l.color);
			if (colors.length) out.push({ start: a, end: b, colors });
		}
		return out;
	});

	function fill(colors: string[]) {
		const soft = colors.map((c) => `color-mix(in srgb, ${c} 42%, white)`);
		if (soft.length === 1) return soft[0];
		const stops = soft.map((c, i) => `${c} ${i * 6}px ${(i + 1) * 6}px`).join(', ');
		return `repeating-linear-gradient(135deg, ${stops})`;
	}
</script>

<div class="wrap">
	<div class="strip" style:height="{height}px">
		{#each [9, 10, 11, 12, 13, 14] as hr (hr)}<i style:left="{pct(hr * 60)}%"></i>{/each}
		{#each segments as seg (seg.start)}
			<span
				class="seg"
				style:left="{pct(seg.start)}%"
				style:width="{pct(seg.end) - pct(seg.start)}%"
				style:background={fill(seg.colors)}
			></span>
		{/each}
		{#each sessions as s (s.start)}
			<span class="session" style:left="{pct(s.start)}%" style:width="{pct(s.end) - pct(s.start)}%"
			></span>
		{/each}
	</div>
	{#each sessions as s (s.start)}
		<!-- Too narrow to hold its own label, so the Session gets a callout. -->
		<span class="callout" style:left="{(pct(s.start) + pct(s.end)) / 2}%">{s.label}</span>
	{/each}
</div>

<style>
	.wrap {
		position: relative;
	}
	.strip {
		position: relative;
		background: white;
		border: 1px solid var(--line);
		border-radius: 6px;
		overflow: hidden;
	}
	i {
		position: absolute;
		top: 0;
		bottom: 0;
		border-left: 1px solid #eef0f3;
	}
	.seg {
		position: absolute;
		top: 0;
		bottom: 0;
		/* One pattern for the whole page, so stripes line up across rows. */
		background-attachment: fixed !important;
	}
	.session {
		position: absolute;
		top: 3px;
		bottom: 3px;
		box-sizing: border-box;
		border-radius: 4px;
		border-left: 3px solid #60a5fa;
		background: #273142;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
	}
	.callout {
		position: absolute;
		bottom: calc(100% + 7px);
		transform: translateX(-50%);
		padding: 3px 8px;
		border-radius: 6px;
		background: #273142;
		color: white;
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.2);
	}
	.callout::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		margin-left: -5px;
		border: 5px solid transparent;
		border-top-color: #273142;
	}
</style>

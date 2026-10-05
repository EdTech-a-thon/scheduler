<script lang="ts">
	import { DAYS, GRID_END, GRID_START } from '$lib/domain/time';
	import type { Provider, Session } from '$lib/domain/types';

	/** A Provider's week at a glance: their Sessions on each day. */
	let { provider, sessions }: { provider: Provider; sessions: Session[] } = $props();

	const W = 110;
	const ROW = 9;
	const GAP = 2;
	const H = ROW * 5 + GAP * 4;
	const x = (m: number) => ((m - GRID_START) / (GRID_END - GRID_START)) * W;
</script>

<svg
	width={W}
	height={H}
	viewBox="0 0 {W} {H}"
	role="img"
	aria-label="Week preview of {provider.name}’s Sessions"
>
	{#each DAYS as d (d)}
		<rect x="0" y={d * (ROW + GAP)} width={W} height={ROW} rx="2" fill="#f1f2f4" />
		{#each sessions.filter((s) => s.startDay <= d && d <= s.endDay) as s (s.id)}
			<rect
				x={x(s.start)}
				y={d * (ROW + GAP)}
				width={Math.max(1.5, x(s.end) - x(s.start))}
				height={ROW}
				rx="2"
				fill={provider.color}
				opacity="0.8"
			/>
		{/each}
	{/each}
</svg>

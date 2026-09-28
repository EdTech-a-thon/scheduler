<script lang="ts">
	import { GRID_END, GRID_START } from '$lib/domain/time';
	import type { Schedule } from '$lib/domain/types';

	let { schedule }: { schedule: Schedule } = $props();

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
	aria-label="Week preview of {schedule.name}"
>
	{#each [0, 1, 2, 3, 4] as d (d)}
		<rect x="0" y={d * (ROW + GAP)} width={W} height={ROW} rx="2" fill="#f1f2f4" />
	{/each}
	{#each schedule.windows as w (w.id)}
		<rect
			x={x(w.start)}
			y={w.startDay * (ROW + GAP)}
			width={Math.max(1.5, x(w.end) - x(w.start))}
			height={(w.endDay - w.startDay + 1) * (ROW + GAP) - GAP}
			rx="2"
			fill={schedule.color}
			opacity="0.75"
		/>
	{/each}
</svg>

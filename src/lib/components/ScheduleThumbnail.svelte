<script lang="ts">
	import { subtract, union, type Interval } from '$lib/domain/intervals';
	import { DAYS, GRID_END, GRID_START } from '$lib/domain/time';
	import type { Schedule } from '$lib/domain/types';

	let { schedule }: { schedule: Schedule } = $props();

	const W = 110;
	const ROW = 9;
	const GAP = 2;
	const H = ROW * 5 + GAP * 4;
	const x = (m: number) => ((m - GRID_START) / (GRID_END - GRID_START)) * W;

	/**
	 * Always drawn as the time the Schedule leaves open, so a Deny Schedule shows
	 * its inverse: the whole day minus its Windows.
	 */
	const open = $derived(
		DAYS.map((d) => {
			const windows = union(
				schedule.windows
					.filter((w) => w.startDay <= d && d <= w.endDay)
					.map((w) => [w.start, w.end] as Interval)
			);
			return schedule.mode === 'allow' ? windows : subtract([[GRID_START, GRID_END]], windows);
		})
	);
</script>

<svg
	width={W}
	height={H}
	viewBox="0 0 {W} {H}"
	role="img"
	aria-label="Week preview of when {schedule.name} leaves time open"
>
	{#each DAYS as d (d)}
		<rect x="0" y={d * (ROW + GAP)} width={W} height={ROW} rx="2" fill="#f1f2f4" />
		{#each open[d] as [start, end] (start)}
			<rect
				x={x(start)}
				y={d * (ROW + GAP)}
				width={Math.max(1.5, x(end) - x(start))}
				height={ROW}
				rx="2"
				fill={schedule.color}
				opacity="0.75"
			/>
		{/each}
	{/each}
</svg>

<script lang="ts">
	import { DAY_NAMES, DAYS, GRID_END, GRID_START, formatRange, formatTime } from '$lib/domain/time';
	import { NO_PROVIDER_COLOR } from '$lib/domain/providers';
	import type { Provider, Session } from '$lib/domain/types';
	import PropertyIcon from './PropertyIcon.svelte';

	/**
	 * The Planner's Sessions laid out for paper, shown only when printing:
	 * the week at a glance, then each day's Sessions in full.
	 */
	let {
		sessions,
		nameOf,
		providers,
		forProvider,
		forNames
	}: {
		sessions: Session[];
		nameOf: Map<string, string>;
		providers: Provider[];
		/** The Provider whose week this is; unset for Everyone. */
		forProvider?: string;
		forNames: string[];
	} = $props();

	const providersOf = (s: Session) =>
		s.providerIds.map((id) => providers.find((p) => p.id === id)).filter((p) => !!p);

	const names = (s: Session) =>
		s.studentIds
			.map((id) => nameOf.get(id))
			.filter(Boolean)
			.join(', ');
	const titleOf = (s: Session) => s.title || names(s) || 'Untitled Session';

	/** Each day's Sessions in time order, with overlapping ones in side-by-side lanes. */
	const days = $derived(
		DAYS.map((d) => {
			const list = sessions
				.filter((s) => s.startDay <= d && d <= s.endDay)
				.sort((a, b) => a.start - b.start || a.end - b.end);
			const laneEnds: number[] = [];
			const placed = list.map((s) => {
				let lane = laneEnds.findIndex((end) => end <= s.start);
				if (lane === -1) lane = laneEnds.length;
				laneEnds[lane] = s.end;
				return { s, lane };
			});
			return { d, placed, lanes: Math.max(1, laneEnds.length) };
		})
	);

	const hours = Array.from(
		{ length: (GRID_END - GRID_START) / 60 + 1 },
		(_, i) => GRID_START + i * 60
	);
	const pct = (m: number) => ((m - GRID_START) / (GRID_END - GRID_START)) * 100;
	const printed = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
</script>

<div class="print-only sheet">
	<header>
		<h1>{forProvider ? `${forProvider}’s Sessions` : 'Sessions'}</h1>
		<p>
			{forNames.length ? `With ${forNames.join(', ')}` : 'All Students'} · {sessions.length} Session{sessions.length ===
			1
				? ''
				: 's'} · Printed {printed}
		</p>
	</header>

	<div class="week">
		<div class="hours">
			{#each hours as h (h)}<span style:left="{pct(h)}%">{formatTime(h)}</span>{/each}
		</div>
		{#each days as { d, placed, lanes } (d)}
			<div class="day">
				<div class="dname">{DAY_NAMES[d].slice(0, 3)}</div>
				<div class="track">
					{#each hours as h (h)}<i style:left="{pct(h)}%"></i>{/each}
					{#each placed as { s, lane } (s.id)}
						{@const ps = providersOf(s)}
						<div
							class="block"
							style:--c={ps[0]?.color ?? NO_PROVIDER_COLOR}
							style:left="{pct(s.start)}%"
							style:width="{pct(s.end) - pct(s.start)}%"
							style:top="{(lane / lanes) * 100}%"
							style:height="{100 / lanes}%"
						>
							<strong
								>{#each ps as p (p.id)}<PropertyIcon name={p.icon} size={9} />{/each}
								{titleOf(s)}</strong
							>
							<span>{formatRange(s.start, s.end)}</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<section class="agenda">
		{#each days as { d, placed } (d)}
			<h2>{DAY_NAMES[d]}</h2>
			{#if placed.length}
				<table>
					<thead>
						<tr>
							<th class="time">Time</th><th>Session</th><th>Providers</th><th>Students</th><th
								>Notes</th
							>
						</tr>
					</thead>
					<tbody>
						{#each placed as { s } (s.id)}
							<tr>
								<td class="time">{formatRange(s.start, s.end)}</td>
								<td>{titleOf(s)}</td>
								<td
									>{providersOf(s)
										.map((p) => p.name)
										.join(', ') || '—'}</td
								>
								<td>{names(s) || '—'}</td>
								<td class="notes">{s.notes}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="none">No Sessions</p>
			{/if}
		{/each}
	</section>
</div>

<style>
	.sheet {
		color: #111;
		font-size: 11px;
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
	header h1 {
		margin: 0;
		font-size: 20px;
	}
	header p {
		margin: 2px 0 12px;
		color: #555;
	}
	.week {
		--label: 40px;
	}
	.hours {
		position: relative;
		height: 14px;
		margin-left: var(--label);
		margin-right: 16px;
		color: #555;
		font-size: 9px;
	}
	.hours span {
		position: absolute;
		transform: translateX(-50%);
	}
	.day {
		display: flex;
		height: 64px;
		border-top: 1px solid #ccc;
		margin-right: 16px;
	}
	.day:last-child {
		border-bottom: 1px solid #ccc;
	}
	.dname {
		width: var(--label);
		flex: none;
		padding-top: 4px;
		font-weight: 600;
	}
	.track {
		position: relative;
		flex: 1;
	}
	.track i {
		position: absolute;
		top: 0;
		bottom: 0;
		border-left: 1px solid #e3e3e3;
	}
	.block {
		position: absolute;
		box-sizing: border-box;
		padding: 2px 4px;
		border: 1px solid var(--c);
		border-left-width: 3px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--c) 16%, white);
		overflow: hidden;
		font-size: 9px;
		line-height: 1.25;
	}
	.block strong,
	.block span {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.agenda {
		break-before: page;
	}
	.agenda h2 {
		font-size: 14px;
		margin: 14px 0 4px;
		break-after: avoid;
	}
	.agenda h2:first-child {
		margin-top: 0;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		vertical-align: top;
		padding: 4px 6px;
		border-bottom: 1px solid #ddd;
	}
	th {
		font-size: 10px;
		color: #555;
		font-weight: 600;
	}
	tr {
		break-inside: avoid;
	}
	.time {
		white-space: nowrap;
		width: 90px;
	}
	.notes {
		white-space: pre-wrap;
		width: 40%;
	}
	.none {
		margin: 0;
		color: #777;
	}
</style>

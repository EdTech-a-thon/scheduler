<script lang="ts">
	import { DAY_NAMES, DAYS, GRID_END, GRID_START, formatRange, formatTime } from '$lib/domain/time';
	import { NO_PROVIDER_COLOR } from '$lib/domain/providers';
	import type { Day, Provider, Session } from '$lib/domain/types';
	import type { StudentLine } from '$lib/domain/sessionDetails';
	import type { Attachment } from 'svelte/attachments';
	import PropertyIcon from './PropertyIcon.svelte';
	import { bandLayout } from './bands';

	/**
	 * The Planner's Sessions laid out for paper, shown only when printing:
	 * the week at a glance with every Session's Students in full, then each
	 * day's Sessions with their Notes.
	 */
	let {
		sessions,
		linesOf,
		providers,
		forProvider,
		forNames
	}: {
		sessions: Session[];
		/** A Session's Students, each with the Properties shown in Sessions. */
		linesOf: (s: Session) => StudentLine[];
		providers: Provider[];
		/** The Provider whose week this is; unset for Everyone. */
		forProvider?: string;
		forNames: string[];
	} = $props();

	const providersOf = (s: Session) =>
		s.providerIds.map((id) => providers.find((p) => p.id === id)).filter((p) => !!p);

	/** Each day's Sessions in time order, overlapping ones splitting the row into bands. */
	const days = $derived(
		DAYS.map((d) => {
			const list = sessions
				.filter((s) => s.startDay <= d && d <= s.endDay)
				.sort((a, b) => a.start - b.start || a.end - b.end);
			const bands = bandLayout(list.map((s) => ({ ...s, startDay: d, endDay: d as Day })));
			const placed = list.map((s) => ({ s, lines: linesOf(s), ...bands.get(s.id)! }));
			return { d, placed };
		})
	);

	/** Text sizes a crowded block steps down through; the last is about 6.5pt. */
	const SIZES = [10, 9.5, 9, 8.5];

	/**
	 * Shrinks a block's text a step at a time until it fits; at the smallest
	 * size, hides Students from the end behind "+N more" (the table has them all).
	 */
	function fit(lines: StudentLine[]): Attachment<HTMLElement> {
		return (node) => {
			void lines;
			const measure = () => {
				const rows = [...node.querySelectorAll<HTMLElement>('.line')];
				const more = node.querySelector<HTMLElement>('.more')!;
				const fits = () => node.scrollHeight <= node.clientHeight;
				for (const r of rows) r.style.display = '';
				more.style.display = 'none';
				for (const size of SIZES) {
					node.style.fontSize = `${size}px`;
					if (fits()) return;
				}
				more.style.display = '';
				let n = 0;
				while (!fits() && n < rows.length) {
					rows[rows.length - 1 - n].style.display = 'none';
					n++;
					more.textContent = `+${n} more`;
				}
			};
			const observer = new ResizeObserver(measure);
			observer.observe(node);
			measure();
			return () => observer.disconnect();
		};
	}

	/**
	 * Paper only shows the hours the Sessions use, so each Session gets as much
	 * width as the page allows for its Students.
	 */
	const from = $derived(
		sessions.length ? Math.floor(Math.min(...sessions.map((s) => s.start)) / 60) * 60 : GRID_START
	);
	const to = $derived(
		sessions.length ? Math.ceil(Math.max(...sessions.map((s) => s.end)) / 60) * 60 : GRID_END
	);
	const hours = $derived(Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60));
	const pct = (m: number) => ((m - from) / (to - from)) * 100;
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
		{#each days as { d, placed } (d)}
			<div class="day">
				<div class="dname">{DAY_NAMES[d].slice(0, 3)}</div>
				<div class="track">
					{#each hours as h (h)}<i style:left="{pct(h)}%"></i>{/each}
					{#each placed as { s, lines, band, of } (s.id)}
						{@const ps = providersOf(s)}
						<div
							class="block"
							style:--c={ps[0]?.color ?? NO_PROVIDER_COLOR}
							style:left="{pct(s.start)}%"
							style:width="{pct(s.end) - pct(s.start)}%"
							style:top="{(band / of) * 100}%"
							style:height="{100 / of}%"
							{@attach fit(lines)}
						>
							<div class="head">
								{#each ps as p (p.id)}<PropertyIcon name={p.icon} size={9} />{/each}
								{#if s.title || !lines.length}<strong>{s.title || 'Untitled Session'}</strong>{/if}
								<span class="when">{formatRange(s.start, s.end)}</span>
							</div>
							{#if ps.length && !(ps.length === 1 && ps[0].name === forProvider)}<div class="who">
									{ps.map((p) => p.name).join(' + ')}
								</div>{/if}
							{#each lines as line, i (i)}
								<div class="line">
									{line.name}{#if line.details.length}<span class="detail"
											>{' · ' + line.details.join(' · ')}</span
										>{/if}
								</div>
							{/each}
							<div class="more"></div>
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
						{#each placed as { s, lines } (s.id)}
							<tr>
								<td class="time">{formatRange(s.start, s.end)}</td>
								<td>{s.title || '—'}</td>
								<td
									>{providersOf(s)
										.map((p) => p.name)
										.join(', ') || '—'}</td
								>
								<td>
									{#each lines as line, i (i)}<div>
											{line.name}{#if line.details.length}<span class="detail"
													>{' · ' + line.details.join(' · ')}</span
												>{/if}
										</div>{:else}—{/each}
								</td>
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
	/*
	 * On screen the sheet is laid out out of sight at a landscape Letter page's
	 * width, so each block can measure how much it holds before printing.
	 */
	@media screen {
		.sheet {
			display: block;
			position: fixed;
			top: 0;
			left: -10000px;
			width: 964px;
			visibility: hidden;
			pointer-events: none;
		}
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
		/* Five of these fill a landscape page. */
		height: 118px;
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
		font-size: 10px;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 4px;
	}
	.when,
	.who,
	.detail {
		color: #555;
	}
	.more {
		font-weight: 600;
		color: #555;
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
	td .detail {
		color: #555;
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

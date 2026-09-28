<script lang="ts">
	import { Check, GraduationCap, Plus, User, X } from '@lucide/svelte';
	import DayStrip from './DayStrip.svelte';
	import {
		FIFTH,
		FOURTH,
		SCHOOL,
		SESSION,
		STUDENTS,
		blocked,
		formatHour,
		type SampleSchedule
	} from './sample';

	/**
	 * The picture beside each welcome step, drawn with the app's own look so it
	 * matches what the Provider sees next: the Caseload, its Properties, a few
	 * Schedules, and those Schedules combined in the Planner.
	 */
	let { step }: { step: 'caseload' | 'properties' | 'schedules' | 'combine' } = $props();

	const layer = (s: SampleSchedule) => ({ color: s.color, spans: blocked(s) });
	const hours = [8, 10, 12, 14].map((h) => h * 60);
	const pct = (m: number) => ((m - 8 * 60) / (7 * 60)) * 100;
</script>

<div class="art" aria-hidden="true">
	{#if step === 'caseload' || step === 'properties'}
		<div class="window">
			<div class="bar">
				<span class="dot"></span><span class="dot"></span><span class="dot"></span>
			</div>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						{#if step === 'properties'}
							<th class="pop"><GraduationCap size={12} /> Grade</th>
							<th class="pop"><User size={12} /> Teacher</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each STUDENTS as s, i (s.name)}
						<tr style:--i={i}>
							<td class="name">{s.name}</td>
							{#if step === 'properties'}
								<td class="pop"><span class="chip grade-{s.grade}">{s.grade}</span></td>
								<td class="pop"><span class="chip">{s.teacher}</span></td>
							{/if}
						</tr>
					{/each}
					<tr class="new" style:--i={STUDENTS.length}>
						<td colspan="3"><Plus size={13} /> New Student</td>
					</tr>
				</tbody>
			</table>
		</div>
	{:else if step === 'schedules'}
		<div class="cards">
			{#each [SCHOOL, FOURTH, FIFTH] as s, i (s.name)}
				<div class="card" style:--c={s.color} style:--i={i}>
					<div class="card-top">
						<span class="swatch"></span>
						<strong>{s.name}</strong>
						<span class="mode {s.mode}">
							{#if s.mode === 'allow'}<Check size={11} /> Allow{:else}<X size={11} /> Deny{/if}
						</span>
					</div>
					<div class="audience">{s.audience}</div>
					<div class="windows">
						{#each s.windows as [a, b] (a)}
							<span style:left="{pct(a)}%" style:width="{pct(b) - pct(a)}%"></span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="combine">
			<div class="row" style:--i={0}>
				<span class="who"><span class="chip grade-4th">4th</span> Ava, Iris</span>
				<DayStrip layers={[layer(SCHOOL), layer(FOURTH)]} />
			</div>
			<div class="row" style:--i={1}>
				<span class="who"><span class="chip grade-5th">5th</span> Lena</span>
				<DayStrip layers={[layer(SCHOOL), layer(FIFTH)]} />
			</div>
			<div class="together" style:--i={2}>
				<span class="who"><strong>Together</strong></span>
				<DayStrip
					layers={[layer(SCHOOL), layer(FOURTH), layer(FIFTH)]}
					height={48}
					sessions={[SESSION]}
				/>
				<div class="hours">
					{#each hours as m (m)}<span style:left="{pct(m)}%">{formatHour(m)}</span>{/each}
				</div>
			</div>
			<div class="legend" style:--i={3}>
				<span><i class="free"></i> Free for everyone</span>
				{#each [SCHOOL, FOURTH, FIFTH] as s (s.name)}
					<span><i style:background="color-mix(in srgb, {s.color} 42%, white)"></i>{s.name}</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.art {
		width: 100%;
		max-width: 540px;
		font-size: 13px;
	}
	/* Pieces arrive one after another. */
	.art :global([style*='--i']) {
		animation: rise 420ms both cubic-bezier(0.2, 0.7, 0.3, 1);
		animation-delay: calc(var(--i) * 90ms);
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.art :global([style*='--i']) {
			animation: none;
		}
	}

	.window {
		background: white;
		border: 1px solid var(--line);
		border-radius: 12px;
		box-shadow: 0 14px 40px rgb(15 23 42 / 0.1);
		overflow: hidden;
	}
	.bar {
		display: flex;
		gap: 5px;
		padding: 10px 12px;
		border-bottom: 1px solid var(--line);
		background: var(--surface-2);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #d4d7dd;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		padding: 8px 14px;
		border-bottom: 1px solid #eef0f3;
		white-space: nowrap;
	}
	th {
		font-size: 11px;
		font-weight: 600;
		color: var(--muted);
	}
	th :global(svg) {
		vertical-align: -2px;
	}
	.name {
		font-weight: 500;
	}
	.new td {
		color: var(--muted);
		border-bottom: none;
	}
	.new :global(svg) {
		vertical-align: -2px;
	}
	.pop {
		animation: pop 380ms both 250ms;
	}
	@keyframes pop {
		from {
			opacity: 0;
		}
	}
	.chip {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--surface-2);
		font-size: 12px;
	}
	.chip.grade-4th {
		background: color-mix(in srgb, #e2a336 30%, white);
	}
	.chip.grade-5th {
		background: color-mix(in srgb, #6e56cf 22%, white);
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.card {
		background: white;
		border: 1px solid var(--line);
		border-left: 5px solid var(--c);
		border-radius: 10px;
		padding: 12px 14px;
		box-shadow: 0 6px 18px rgb(15 23 42 / 0.06);
	}
	.card-top {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		background: var(--c);
	}
	.mode {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 11px;
		font-weight: 600;
	}
	.mode.allow {
		color: #1f7a4d;
	}
	.mode.deny {
		color: #b4232a;
	}
	.audience {
		margin: 3px 0 8px;
		color: var(--muted);
		font-size: 12px;
	}
	.windows {
		position: relative;
		height: 14px;
		border-radius: 4px;
		background: #f1f2f4;
	}
	.windows span {
		position: absolute;
		top: 0;
		bottom: 0;
		border-radius: 4px;
		background: color-mix(in srgb, var(--c) 55%, white);
		border-left: 3px solid var(--c);
		box-sizing: border-box;
	}

	.combine {
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: white;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 16px;
		box-shadow: 0 14px 40px rgb(15 23 42 / 0.1);
	}
	.row,
	.together {
		display: grid;
		grid-template-columns: 84px 1fr;
		align-items: center;
		gap: 10px;
	}
	.together {
		margin-top: 6px;
		padding-top: 38px;
		border-top: 1px dashed var(--line);
	}
	.who {
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
	}
	.who strong {
		color: var(--text);
	}
	.hours {
		grid-column: 2;
		position: relative;
		height: 12px;
		font-size: 10px;
		color: var(--muted);
	}
	.hours span {
		position: absolute;
		transform: translateX(-50%);
	}
	.hours span:first-child {
		transform: none;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 12px;
		font-size: 11px;
		color: var(--muted);
	}
	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.legend i {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}
	.legend i.free {
		background: white;
		border: 1px solid var(--line);
		box-sizing: border-box;
	}
</style>

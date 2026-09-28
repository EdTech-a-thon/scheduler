<script lang="ts">
	import { matchesAudience } from '$lib/domain/audience';
	import { blockersFor, plannerLayers, sessionConflicts } from '$lib/domain/freeTime';
	import { applySpanAction, eraseFromSpan, replaceSpan } from '$lib/domain/spans';
	import { DAYS, SNAP } from '$lib/domain/time';
	import type { Day, Minute } from '$lib/domain/types';
	import { Printer } from '@lucide/svelte';
	import GridToolbar from '$lib/components/GridToolbar.svelte';
	import PrintSessions from '$lib/components/PrintSessions.svelte';
	import FloatingPanel from '$lib/components/FloatingPanel.svelte';
	import SessionPanel from '$lib/components/SessionPanel.svelte';
	import StudentPicker from '$lib/components/StudentPicker.svelte';
	import TimeGrid, {
		type GridItem,
		type GridRect,
		type MenuAction,
		type RectChange
	} from '$lib/components/TimeGrid.svelte';
	import { handleGridKeys } from '$lib/components/shortcuts';
	import { plannerUi } from '$lib/state/persisted.svelte';
	import { newId, store } from '$lib/state/store.svelte';

	const SESSION_COLOR = '#60a5fa';

	const data = $derived(store.data);
	const nameOf = $derived(new Map(data.students.map((s) => [s.id, s.name])));
	const chosen = $derived(data.students.filter((s) => plannerUi.selected.includes(s.id)));

	const legend = $derived(
		data.schedules
			.map((s) => ({ s, count: chosen.filter((st) => matchesAudience(st, s.audience)).length }))
			.filter((x) => x.count > 0)
	);

	const background = $derived(
		DAYS.map((d) =>
			plannerLayers(chosen, data.schedules, d).map((l) => ({
				start: l.start,
				end: l.end,
				colors: l.scheduleIds.map((id) => data.schedules.find((s) => s.id === id)!.color)
			}))
		)
	);

	/** With nobody selected, every Session shows; otherwise those with a selected Student. */
	const visibleSessions = $derived(
		plannerUi.selected.length === 0
			? data.sessions
			: data.sessions.filter((s) => s.studentIds.some((id) => plannerUi.selected.includes(id)))
	);
	const visibleIds = $derived(new Set(visibleSessions.map((s) => s.id)));

	const items = $derived<GridItem[]>(
		visibleSessions.map((s) => {
			const names = s.studentIds
				.map((id) => nameOf.get(id))
				.filter(Boolean)
				.join(', ');
			return {
				...s,
				color: SESSION_COLOR,
				title: s.title || names || 'Untitled Session',
				subtitle: s.title ? names : undefined,
				warning: sessionConflicts(s, data).length > 0
			};
		})
	);

	/**
	 * Whether the last selection action has finished non-additively. The popup
	 * waits for that, so Shift/⌘-clicks and marquee drags don't open it midway.
	 */
	let settled = $state(false);

	function select(ids: string[], isSettled = true) {
		plannerUi.sessionIds = ids;
		settled = isSettled;
	}

	/** The Session popup shows once a finished action leaves exactly one Session selected. */
	const openSession = $derived(
		settled && plannerUi.sessionIds.length === 1
			? data.sessions.find((s) => s.id === plannerUi.sessionIds[0])
			: undefined
	);
	let grid: ReturnType<typeof TimeGrid> | undefined = $state();

	/** Sessions only merge when they serve the same Students. */
	function mergeBlocker(ids: string[]): string | null {
		const sets = ids.map((id) =>
			[...(data.sessions.find((s) => s.id === id)?.studentIds ?? [])].sort().join()
		);
		return sets.every((x) => x === sets[0])
			? null
			: 'Only Sessions with the same Students can merge';
	}

	function tooltip(day: Day, minute: Minute): string[] | null {
		if (chosen.length === 0) return null;
		const byBlocker = new Map<string, string[]>();
		for (const st of chosen) {
			for (const b of blockersFor(st, data, day, [minute, minute + SNAP])) {
				if (b.kind === 'session') continue;
				byBlocker.set(b.label, [...(byBlocker.get(b.label) ?? []), st.name]);
			}
		}
		if (byBlocker.size === 0) return null;
		return [...byBlocker].map(([label, names]) => `${label}: ${names.join(', ')}`);
	}

	function onduplicate(copies: RectChange[]) {
		select(store.duplicateSessions(copies));
	}

	function oncreate(rect: GridRect) {
		select([store.createSession(rect, [...plannerUi.selected])]);
	}

	function onchange(changes: RectChange[]) {
		store.moveSessions(changes);
	}

	function ondelete(ids: string[]) {
		store.deleteSessions(ids);
		plannerUi.sessionIds = [];
	}

	function onmerge(ids: string[], rect: GridRect) {
		select([store.mergeSessions(ids, rect)]);
	}

	function onerase(rect: GridRect) {
		store.setSessions(
			data.sessions.flatMap((s) => (visibleIds.has(s.id) ? eraseFromSpan(s, rect, newId) : [s]))
		);
	}

	function onmenu(action: MenuAction, id: string, day: Day) {
		const s = data.sessions.find((s) => s.id === id);
		if (!s) return;
		store.setSessions(replaceSpan(data.sessions, id, applySpanAction(action, s, day, newId)));
		if (action === 'delete') plannerUi.sessionIds = [];
	}
</script>

<svelte:window
	onkeyup={(e) => {
		// Letting go of Shift/⌘/Ctrl finishes an additive selection.
		if (['Shift', 'Meta', 'Control'].includes(e.key)) settled = true;
	}}
	onkeydown={(e) =>
		handleGridKeys(e, {
			setTool: (t) => (plannerUi.tool = t),
			deleteSelected: () => plannerUi.sessionIds.length && ondelete(plannerUi.sessionIds),
			deselect: () => (plannerUi.sessionIds = []),
			selectAll: () =>
				select(
					visibleSessions.map((s) => s.id),
					false
				)
		})}
/>

<div class="planner no-print">
	<aside class="left">
		<StudentPicker
			bind:selected={plannerUi.selected}
			bind:query={plannerUi.query}
			bind:filters={plannerUi.filters}
		/>
	</aside>

	<div class="center">
		<div class="center-head">
			<GridToolbar
				bind:tool={plannerUi.tool}
				noun="Session"
				selection={{
					count: plannerUi.sessionIds.length,
					mergeReason: grid?.getMergeReason() ?? null,
					onmerge: () => grid?.mergeSelection(),
					onmergehover: (on) => grid?.previewMerge(on),
					ondelete: () => ondelete(plannerUi.sessionIds),
					onclear: () => (plannerUi.sessionIds = [])
				}}
			/>
			<button
				class="print"
				disabled={visibleSessions.length === 0}
				title="Print the Sessions shown, or save them as a PDF"
				onclick={() => window.print()}
			>
				<Printer size={15} /> Print
			</button>
		</div>
		<div class="scroll">
			<TimeGrid
				bind:this={grid}
				{items}
				tool={plannerUi.tool}
				selectedIds={plannerUi.sessionIds}
				noun="Session"
				variant="session"
				{background}
				{tooltip}
				{mergeBlocker}
				onselect={(ids, isSettled) => select(ids, isSettled ?? true)}
				{oncreate}
				{onchange}
				{onerase}
				{onmenu}
				{onduplicate}
				{ondelete}
				{onmerge}
			/>
		</div>
		<div class="legend">
			<span class="key"><span class="sw free"></span> Common Free Time</span>
			{#each legend as { s, count } (s.id)}
				<a class="key" href="/schedules/{s.id}" title="Edit {s.name}">
					<span
						class="sw"
						style:background="color-mix(in srgb, {s.color} 42%, white)"
						style:border-color={s.color}
					></span>
					{s.name}
					<span class="muted">{count} of {chosen.length}</span>
				</a>
			{/each}
			<span class="key"><span class="sw session"></span> Session</span>
		</div>
	</div>
</div>

<PrintSessions sessions={visibleSessions} {nameOf} forNames={chosen.map((s) => s.name)} />

{#if openSession}
	<FloatingPanel anchorId={openSession.id} onclose={() => (plannerUi.sessionIds = [])}>
		<SessionPanel session={openSession} onclose={() => (plannerUi.sessionIds = [])} />
	</FloatingPanel>
{/if}

<style>
	.planner {
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr);
		min-height: calc(100vh - var(--topbar-h));
	}
	aside {
		background: white;
		padding: 16px;
		box-sizing: border-box;
		max-height: calc(100vh - var(--topbar-h));
		position: sticky;
		top: var(--topbar-h);
		overflow: auto;
	}
	.left {
		border-right: 1px solid var(--line);
		display: flex;
		flex-direction: column;
	}
	.center-head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}
	.center-head > :global(:first-child) {
		flex: 1;
		min-width: 0;
	}
	.print {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}
	.center {
		padding: 18px 24px;
		min-width: 0;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		margin-top: 10px;
		font-size: 12px;
	}
	.key {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: inherit;
		text-decoration: none;
	}
	a.key:hover {
		text-decoration: underline;
	}
	.sw {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid;
		box-sizing: border-box;
	}
	.sw.free {
		background: white;
		border-color: #c9cbd1;
	}
	.sw.session {
		background: #273142;
		border-color: #273142;
	}
	.scroll {
		overflow-x: auto;
		padding-bottom: 8px;
	}
</style>

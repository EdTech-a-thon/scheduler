<script lang="ts">
	import { matchesAudience } from '$lib/domain/audience';
	import { blockersFor, hasConflict, plannerLayers } from '$lib/domain/freeTime';
	import {
		NO_PROVIDER_COLOR,
		plannerSessions,
		providerLabel,
		resolvePlanningFor
	} from '$lib/domain/providers';
	import { applySpanAction, eraseFromSpan, replaceSpan } from '$lib/domain/spans';
	import { DAYS, SNAP } from '$lib/domain/time';
	import type { Day, Minute, Session } from '$lib/domain/types';
	import { CalendarPlus, Printer, UsersRound } from '@lucide/svelte';
	import PropertyIcon from '$lib/components/PropertyIcon.svelte';
	import { downloadText } from '$lib/components/download';
	import { buildIcs, firstMonday } from '$lib/domain/ics';
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
	import { onboarding, plannerUi } from '$lib/state/persisted.svelte';
	import { newId, store } from '$lib/state/store.svelte';

	// Opening the Planner ticks “Start planning” off the getting-started
	// checklist, but only once there are Students and Schedules to plan with.
	if (store.data.students.length > 0 && store.data.schedules.length > 0)
		onboarding.visitedPlanner = true;

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

	const providerOf = $derived(new Map(data.providers.map((p) => [p.id, p])));
	/** The Provider whose week this is, or null for Everyone. */
	const planningFor = $derived(resolvePlanningFor(plannerUi.planningFor, data));
	const focused = $derived(planningFor ? providerOf.get(planningFor) : undefined);

	/**
	 * The Provider's whole week, plus other Sessions with a selected Student
	 * (muted). For Everyone: every Session, or those with a selected Student.
	 */
	const shown = $derived.by(() => {
		const list = plannerSessions(data.sessions, planningFor, plannerUi.selected);
		// A selected Session stays put (muted) even once it's no longer this Provider's,
		// so reassigning it in the popup doesn't make it vanish mid-edit.
		const ids = new Set(list.map((x) => x.session.id));
		const kept = data.sessions
			.filter((s) => plannerUi.sessionIds.includes(s.id) && !ids.has(s.id))
			.map((session) => ({ session, muted: true }));
		return [...list, ...kept];
	});
	const visibleSessions = $derived(shown.map((x) => x.session));
	const visibleIds = $derived(new Set(visibleSessions.map((s) => s.id)));

	const items = $derived<GridItem[]>(
		shown.map(({ session: s, muted }) => {
			const names = s.studentIds
				.map((id) => nameOf.get(id))
				.filter(Boolean)
				.join(', ');
			const providers = s.providerIds.map((id) => providerOf.get(id)).filter((p) => !!p);
			// A co-treat lists every Provider, so their names lead the subtitle.
			const who = providers.length > 1 ? providers.map((p) => p.name).join(' + ') : '';
			const subtitle = [who, s.title ? names : ''].filter(Boolean).join(' · ');
			return {
				...s,
				color: providers[0]?.color ?? NO_PROVIDER_COLOR,
				icons: providers.map((p) => p.icon),
				title: s.title || names || 'Untitled Session',
				subtitle: subtitle || undefined,
				warning: hasConflict(s, data),
				muted
			};
		})
	);

	/** Who a new Session goes to: the Provider planned for, or Me when planning for Everyone. */
	const newSessionProviders = $derived(planningFor ? [planningFor] : data.meId ? [data.meId] : []);

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

	/** Sessions only merge when they serve the same Students with the same Providers. */
	function mergeBlocker(ids: string[]): string | null {
		const key = (pick: (s: Session) => string[]) =>
			ids.map((id) => {
				const s = data.sessions.find((s) => s.id === id);
				return [...(s ? pick(s) : [])].sort().join();
			});
		const same = (keys: string[]) => keys.every((x) => x === keys[0]);
		if (!same(key((s) => s.studentIds))) return 'Only Sessions with the same Students can merge';
		if (!same(key((s) => s.providerIds))) return 'Only Sessions with the same Providers can merge';
		return null;
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

	/** The Sessions shown, for Google Calendar, Outlook and the like. */
	function exportIcs() {
		const ics = buildIcs($state.snapshot(visibleSessions), nameOf, firstMonday(new Date()), {
			providerNameOf: new Map(data.providers.map((p) => [p.id, p.name])),
			calendarName: focused ? `${focused.name}’s Sessions` : 'Sessions'
		});
		const who = focused ? `${slug(focused.name)}-` : '';
		downloadText(
			`${who}sessions-${new Date().toISOString().slice(0, 10)}.ics`,
			ics,
			'text/calendar'
		);
	}

	const slug = (name: string) =>
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'provider';

	function onduplicate(copies: RectChange[]) {
		select(store.duplicateSessions(copies));
	}

	function oncreate(rect: GridRect) {
		select([store.createSession(rect, [...plannerUi.selected], newSessionProviders)]);
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
		<label class="planning-for">
			<span>Planning for</span>
			<span class="pick">
				<span class="dot" class:all={!focused} style:background={focused?.color}>
					{#if focused}<PropertyIcon name={focused.icon} size={12} />{:else}<UsersRound
							size={14}
						/>{/if}
				</span>
				<select
					value={planningFor ?? 'everyone'}
					onchange={(e) => {
						const v = e.currentTarget.value;
						plannerUi.planningFor = v === data.meId ? '' : v;
					}}
				>
					{#each data.providers as p (p.id)}
						<option value={p.id}>{providerLabel(p, data.meId)}</option>
					{/each}
					<option value="everyone">Everyone</option>
				</select>
			</span>
		</label>
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
			<div class="exports">
				<button
					class="print"
					disabled={visibleSessions.length === 0}
					title="Download the Sessions shown as a calendar file, repeating weekly from this week"
					onclick={exportIcs}
				>
					<CalendarPlus size={15} /> Export .ics
				</button>
				<button
					class="print"
					disabled={visibleSessions.length === 0}
					title="Print the Sessions shown, or save them as a PDF"
					onclick={() => window.print()}
				>
					<Printer size={15} /> Print
				</button>
			</div>
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
			{#if focused}
				<span class="key">
					<span class="sw session" style:border-left-color={focused.color}></span>
					{focused.name}’s Sessions
				</span>
				{#if items.some((i) => i.muted)}
					<span class="key"><span class="sw session muted"></span> Other Providers’ Sessions</span>
				{/if}
			{:else}
				<span class="key"><span class="sw session"></span> Session</span>
			{/if}
		</div>
	</div>
</div>

<PrintSessions
	sessions={visibleSessions}
	{nameOf}
	providers={data.providers}
	forProvider={focused?.name}
	forNames={chosen.map((s) => s.name)}
/>

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
	.exports {
		display: flex;
		gap: 8px;
		flex: none;
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
		border-left-width: 4px;
	}
	.sw.session.muted {
		opacity: 0.5;
	}
	.planning-for {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--line);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	.pick {
		display: flex;
		align-items: center;
		gap: 8px;
		text-transform: none;
		letter-spacing: normal;
	}
	.pick select {
		flex: 1;
		min-width: 0;
		font-size: 14px;
		font-weight: 600;
	}
	.dot {
		display: grid;
		place-items: center;
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		color: white;
	}
	.dot.all {
		background: var(--surface-2);
		color: var(--muted);
	}
	.scroll {
		overflow-x: auto;
		padding-bottom: 8px;
	}
</style>

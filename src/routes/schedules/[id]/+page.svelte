<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Check, Trash2, TriangleAlert, X } from '@lucide/svelte';
	import { audienceMembers, hasNoAudience } from '$lib/domain/audience';
	import { PALETTE } from '$lib/domain/palette';
	import { applySpanAction, eraseFromSpans, replaceSpan } from '$lib/domain/spans';
	import type { Day, ScheduleMode, Window } from '$lib/domain/types';
	import ConditionsEditor from '$lib/components/ConditionsEditor.svelte';
	import GridToolbar from '$lib/components/GridToolbar.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import TimeGrid, {
		type GridRect,
		type MenuAction,
		type RectChange
	} from '$lib/components/TimeGrid.svelte';
	import { handleGridKeys } from '$lib/components/shortcuts';
	import { editorUi } from '$lib/state/persisted.svelte';
	import { newId, store } from '$lib/state/store.svelte';

	const schedule = $derived(store.data.schedules.find((s) => s.id === page.params.id));
	const members = $derived(schedule ? audienceMembers(store.data.students, schedule.audience) : []);

	let selectedIds = $state<string[]>([]);
	let confirmingDelete = $state(false);
	let grid: ReturnType<typeof TimeGrid> | undefined = $state();

	const items = $derived((schedule?.windows ?? []).map((w) => ({ ...w, color: schedule!.color })));

	function setWindows(windows: Window[]) {
		if (schedule) store.setWindows(schedule.id, windows);
	}

	function oncreate(rect: GridRect) {
		const id = newId();
		setWindows([...schedule!.windows, { id, ...rect }]);
		selectedIds = [id];
	}

	function onduplicate(copies: RectChange[]) {
		const added = copies.map((c) => ({ ...c.rect, id: newId() }));
		setWindows([...schedule!.windows, ...added]);
		selectedIds = added.map((w) => w.id);
	}

	function onchange(changes: RectChange[]) {
		const byId = new Map(changes.map((c) => [c.id, c.rect]));
		setWindows(schedule!.windows.map((w) => (byId.has(w.id) ? { ...w, ...byId.get(w.id)! } : w)));
	}

	function onerase(rect: GridRect) {
		setWindows(eraseFromSpans(schedule!.windows, rect, newId));
	}

	function onmenu(action: MenuAction, id: string, day: Day) {
		const w = schedule!.windows.find((w) => w.id === id);
		if (!w) return;
		setWindows(replaceSpan(schedule!.windows, id, applySpanAction(action, w, day, newId)));
	}

	function ondelete(ids: string[]) {
		setWindows(schedule!.windows.filter((w) => !ids.includes(w.id)));
		selectedIds = [];
	}

	/** The merged Window keeps the first one's id, so it stays selected. */
	function onmerge(ids: string[], rect: GridRect) {
		const keep = ids[0];
		setWindows(
			schedule!.windows
				.filter((w) => w.id === keep || !ids.includes(w.id))
				.map((w) => (w.id === keep ? { ...w, ...rect } : w))
		);
		selectedIds = [keep];
	}

	function setMode(mode: ScheduleMode) {
		store.updateSchedule(schedule!.id, (s) => (s.mode = mode));
	}

	function setEveryone(everyone: boolean) {
		store.updateSchedule(schedule!.id, (s) => {
			s.audience.kind = everyone ? 'everyone' : 'conditions';
		});
	}
</script>

<svelte:window
	onkeydown={(e) =>
		schedule &&
		handleGridKeys(e, {
			setTool: (t) => (editorUi.tool = t),
			deleteSelected: () => selectedIds.length && ondelete(selectedIds),
			deselect: () => (selectedIds = []),
			selectAll: () => (selectedIds = schedule.windows.map((w) => w.id))
		})}
/>

{#if !schedule}
	<div class="page">
		<p>This Schedule doesn’t exist. <a href="/schedules">Back to Schedules</a></p>
	</div>
{:else}
	<div class="editor">
		<aside>
			<a class="back" href="/schedules"><ArrowLeft size={15} /> Schedules</a>

			<input
				class="name"
				value={schedule.name}
				aria-label="Schedule name"
				onchange={(e) =>
					store.updateSchedule(
						schedule.id,
						(s) => (s.name = e.currentTarget.value.trim() || s.name)
					)}
			/>

			<section>
				<h3>Color</h3>
				<div class="palette">
					{#each PALETTE as c (c)}
						<button
							class="swatch"
							class:active={schedule.color === c}
							style:background={c}
							aria-label="Color {c}"
							onclick={() => store.updateSchedule(schedule.id, (s) => (s.color = c))}
						></button>
					{/each}
				</div>
			</section>

			<section>
				<h3>Mode</h3>
				<div class="segmented">
					<button
						class="allow"
						class:active={schedule.mode === 'allow'}
						onclick={() => setMode('allow')}
					>
						<Check size={15} /> Allow
					</button>
					<button
						class="deny"
						class:active={schedule.mode === 'deny'}
						onclick={() => setMode('deny')}
					>
						<X size={15} /> Deny
					</button>
				</div>
				<p class="muted help">
					{schedule.mode === 'allow'
						? 'Students can only be seen during the marked time.'
						: 'Students can’t be seen during the marked time.'}
				</p>
			</section>

			<section>
				<h3>Audience</h3>
				<label class="radio">
					<input
						type="radio"
						checked={schedule.audience.kind === 'everyone'}
						onchange={() => setEveryone(true)}
					/>
					Everyone
				</label>
				<label class="radio">
					<input
						type="radio"
						checked={schedule.audience.kind === 'conditions'}
						onchange={() => setEveryone(false)}
					/>
					Students matching…
				</label>
				{#if schedule.audience.kind === 'conditions'}
					<div class="conditions">
						<ConditionsEditor
							addLabel="Condition"
							conditions={schedule.audience.conditions}
							onchange={(conditions) =>
								store.updateSchedule(schedule.id, (s) => (s.audience.conditions = conditions))}
						/>
					</div>
					{#if hasNoAudience(schedule.audience)}
						<p class="warn">
							<TriangleAlert size={14} /> No Audience: add a Condition so this Schedule applies to someone.
						</p>
					{/if}
				{/if}
			</section>

			<section class="members">
				<h3>Applies to {members.length} Student{members.length === 1 ? '' : 's'}</h3>
				<ul>
					{#each members as m (m.id)}<li>{m.name}</li>{/each}
				</ul>
			</section>

			<button class="delete" onclick={() => (confirmingDelete = true)}
				><Trash2 size={14} /> Delete Schedule</button
			>
		</aside>

		<div class="canvas">
			<GridToolbar
				bind:tool={editorUi.tool}
				noun="Window"
				selection={{
					count: selectedIds.length,
					mergeReason: grid?.getMergeReason() ?? null,
					onmerge: () => grid?.mergeSelection(),
					onmergehover: (on) => grid?.previewMerge(on),
					ondelete: () => ondelete(selectedIds),
					onclear: () => (selectedIds = [])
				}}
			/>
			<div class="scroll">
				<TimeGrid
					bind:this={grid}
					{items}
					tool={editorUi.tool}
					{selectedIds}
					noun="Window"
					variant="window"
					onselect={(ids) => (selectedIds = ids)}
					{oncreate}
					{onchange}
					{onerase}
					{onmenu}
					{onduplicate}
					{ondelete}
					{onmerge}
				/>
			</div>
		</div>
	</div>

	{#if confirmingDelete}
		<Modal
			title="Delete “{schedule.name}”?"
			confirmLabel="Delete Schedule"
			danger
			oncancel={() => (confirmingDelete = false)}
			onconfirm={() => {
				store.deleteSchedule(schedule.id);
				goto('/schedules');
			}}
		>
			<p>
				It currently applies to {members.length} Student{members.length === 1 ? '' : 's'}. You can
				undo this.
			</p>
		</Modal>
	{/if}
{/if}

<style>
	.editor {
		display: flex;
		min-height: calc(100vh - 53px);
	}
	aside {
		width: 290px;
		flex: none;
		background: white;
		border-right: 1px solid var(--line);
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		box-sizing: border-box;
	}
	.back {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--muted);
		text-decoration: none;
		font-size: 13px;
	}
	.name {
		font-size: 18px;
		font-weight: 600;
		border-color: transparent;
		padding: 4px 6px;
		margin: 0 -6px;
	}
	.name:hover {
		border-color: var(--line);
	}
	h3 {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin: 0 0 8px;
	}
	.palette {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}
	.swatch {
		aspect-ratio: 1;
		border: none;
		border-radius: 6px;
		padding: 0;
	}
	.swatch.active {
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px var(--text);
	}
	.segmented {
		display: flex;
		background: var(--surface-2);
		border-radius: 8px;
		padding: 2px;
	}
	.segmented button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		border: none;
		background: none;
	}
	.segmented button.allow.active {
		color: #1f7a4d;
	}
	.segmented button.deny.active {
		color: #b4232a;
	}
	.segmented button.active {
		background: white;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
		font-weight: 600;
	}
	.help {
		font-size: 12px;
		margin: 6px 0 0;
	}
	.radio {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
	}
	.conditions {
		margin: 6px 0 0 23px;
	}
	.warn {
		display: flex;
		gap: 6px;
		color: #9a5b00;
		font-size: 12px;
		margin: 8px 0 0;
	}
	.members ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.members li {
		background: var(--surface-2);
		border-radius: 999px;
		padding: 2px 9px;
		font-size: 12px;
	}
	.delete {
		margin-top: auto;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--danger);
		align-self: flex-start;
	}
	.canvas {
		flex: 1;
		min-width: 0;
		padding: 18px 24px;
	}
	.scroll {
		overflow-x: auto;
		padding-bottom: 8px;
	}
</style>

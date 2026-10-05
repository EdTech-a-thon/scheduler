<script lang="ts">
	import { focusOnMount } from '$lib/components/focus';
	import { tick } from 'svelte';
	import {
		CalendarDays,
		CheckSquare,
		CircleChevronDown,
		FileDown,
		FileUp,
		Plus,
		Trash2
	} from '@lucide/svelte';
	import {
		audienceMembers,
		audienceUsesProperty,
		normalizeText,
		removePropertyFromAudience
	} from '$lib/domain/audience';
	import { clone } from '$lib/domain/clone';
	import { sessionsFor } from '$lib/domain/freeTime';
	import { deleteOption } from '$lib/domain/options';
	import type { Property, Student } from '$lib/domain/types';
	import ExportDialog from '$lib/components/ExportDialog.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import PropertyIcon, { ICON_NAMES } from '$lib/components/PropertyIcon.svelte';
	import SelectCell from '$lib/components/SelectCell.svelte';
	import UndoButtons from '$lib/components/UndoButtons.svelte';
	import { importer } from '$lib/state/importer.svelte';
	import { store } from '$lib/state/store.svelte';

	const data = $derived(store.data);

	/** A new row being typed; it becomes a Student once it has a unique Name. */
	let draft = $state<{ name: string; error: string } | null>(null);
	let draftInput: HTMLInputElement | undefined = $state();
	let nameErrors = $state<Record<string, string>>({});
	let addingColumn = $state(false);
	let openHeader = $state<string | null>(null);
	let deletingProperty = $state<Property | null>(null);
	let deletingOption = $state<{ property: Property; option: string } | null>(null);
	let deletingStudent = $state<Student | null>(null);
	let exporting = $state(false);

	async function startDraft() {
		draft = { name: '', error: '' };
		await tick();
		draftInput?.focus();
	}

	/** Enter saves and starts the next row, so a whole Caseload can be typed in a row. */
	async function commitDraft(next: boolean) {
		if (!draft) return;
		const name = draft.name.trim();
		if (!name) {
			draft = null;
			return;
		}
		if (!store.addStudent(name)) {
			draft.error = `A Student named “${name}” already exists.`;
			return;
		}
		draft = null;
		if (next) await startDraft();
	}

	function rename(student: Student, input: HTMLInputElement) {
		if (store.renameStudent(student.id, input.value)) {
			delete nameErrors[student.id];
			return;
		}
		nameErrors[student.id] = input.value.trim()
			? `“${input.value.trim()}” is already taken.`
			: 'A Name is required.';
		input.value = student.name;
	}

	function addColumn(type: Property['type']) {
		const p = store.addProperty(type);
		addingColumn = false;
		openHeader = p.id;
	}

	function impactOn(after: (typeof data)['schedules']) {
		return data.schedules
			.map((s) => {
				const a = after.find((x) => x.id === s.id)!;
				return {
					id: s.id,
					name: s.name,
					before: audienceMembers(data.students, s.audience).length,
					after: audienceMembers(data.students, a.audience).length,
					changed: JSON.stringify(a.audience) !== JSON.stringify(s.audience),
					noAudience: a.audience.kind === 'conditions' && a.audience.conditions.length === 0
				};
			})
			.filter((x) => x.changed);
	}

	const propertyImpact = $derived.by(() => {
		const p = deletingProperty;
		if (!p) return null;
		return {
			valueCount: data.students.filter((s) => s.values[p.id] !== undefined).length,
			schedules: impactOn(
				data.schedules
					.filter((s) => audienceUsesProperty(s.audience, p.id))
					.map((s) => ({ ...s, audience: removePropertyFromAudience(s.audience, p.id) }))
					.concat(data.schedules.filter((s) => !audienceUsesProperty(s.audience, p.id)))
			)
		};
	});

	const optionImpact = $derived.by(() => {
		if (!deletingOption) return null;
		const { property, option } = deletingOption;
		const copy = clone(data);
		deleteOption(copy, property.id, option);
		return {
			valueCount: data.students.filter(
				(s) =>
					typeof s.values[property.id] === 'string' &&
					normalizeText(s.values[property.id] as string) === normalizeText(option)
			).length,
			schedules: impactOn(copy.schedules)
		};
	});
</script>

<div class="page">
	<div class="page-head">
		<div>
			<h1>Caseload</h1>
			<p class="muted">
				{data.students.length} Student{data.students.length === 1 ? '' : 's'} · Properties decide which
				Schedules apply to each Student.
			</p>
		</div>
		<div class="head-actions">
			<UndoButtons />
			<button class="export" onclick={() => importer.pick()}>
				<FileUp size={16} /> Import
			</button>
			<button
				class="export"
				disabled={data.students.length === 0}
				onclick={() => (exporting = true)}
			>
				<FileDown size={16} /> Export
			</button>
		</div>
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th class="name-col"><span class="th-label">Name</span></th>
					{#each data.properties as p (p.id)}
						<th>
							<Popover
								block
								bind:open={() => openHeader === p.id, (v) => (openHeader = v ? p.id : null)}
							>
								{#snippet trigger({ toggle })}
									<button class="header-btn" onclick={toggle}>
										<PropertyIcon name={p.icon} size={13} />
										{p.name}
										{#if p.showInSessions}<span class="shown" title="Shown in Sessions"
												><CalendarDays size={12} /></span
											>{/if}
									</button>
								{/snippet}
								{#snippet children({ close })}
									<label class="field">
										Property name
										<input
											use:focusOnMount
											value={p.name}
											onchange={(e) => store.renameProperty(p.id, e.currentTarget.value)}
											onkeydown={(e) => e.key === 'Enter' && close()}
										/>
									</label>
									<div class="icon-label muted">Icon</div>
									<div class="icon-grid">
										{#each ICON_NAMES as icon (icon)}
											<button
												class="icon-choice"
												class:active={p.icon === icon}
												aria-label="Icon {icon}"
												title={icon}
												onclick={() => store.setPropertyIcon(p.id, icon)}
											>
												<PropertyIcon name={icon} size={15} />
											</button>
										{/each}
									</div>
									<div class="muted type-note">
										{p.type === 'select' ? `Select · ${p.options.length} Options` : 'Checkbox'}
									</div>
									<label
										class="show-toggle"
										title="Show each Student’s {p.name} beside their Name in the Planner, Printout and Calendar File"
									>
										<input
											type="checkbox"
											checked={p.showInSessions}
											onchange={(e) => store.setShowInSessions(p.id, e.currentTarget.checked)}
										/>
										<CalendarDays size={14} /> Show in Sessions
									</label>
									<button
										class="menu-danger"
										onclick={() => {
											close();
											deletingProperty = p;
										}}
									>
										<Trash2 size={14} /> Delete Property
									</button>
								{/snippet}
							</Popover>
						</th>
					{/each}
					<th class="add-col">
						<Popover bind:open={addingColumn} align="right" block>
							{#snippet trigger({ toggle })}
								<button class="header-btn center" title="Add a Property" onclick={toggle}>
									<Plus size={16} />
								</button>
							{/snippet}
							{#snippet children()}
								<button class="pick" onclick={() => addColumn('select')}>
									<CircleChevronDown size={14} /> Select
								</button>
								<button class="pick" onclick={() => addColumn('checkbox')}>
									<CheckSquare size={14} /> Checkbox
								</button>
							{/snippet}
						</Popover>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each data.students as s (s.id)}
					<tr>
						<td class="name-col">
							<input
								class="cell"
								class:invalid={nameErrors[s.id]}
								value={s.name}
								title={nameErrors[s.id] ?? ''}
								onchange={(e) => rename(s, e.currentTarget)}
								onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
							/>
						</td>
						{#each data.properties as p (p.id)}
							<td>
								{#if p.type === 'select'}
									<SelectCell
										value={typeof s.values[p.id] === 'string'
											? (s.values[p.id] as string)
											: undefined}
										options={p.options}
										onselect={(v) => store.setValue(s.id, p.id, v)}
										ondeleteoption={(option) => (deletingOption = { property: p, option })}
									/>
								{:else}
									<label class="check">
										<input
											type="checkbox"
											checked={s.values[p.id] === true}
											onchange={(e) => store.setValue(s.id, p.id, e.currentTarget.checked)}
										/>
									</label>
								{/if}
							</td>
						{/each}
						<td class="add-col">
							<button
								class="icon row-delete"
								title="Delete Student"
								onclick={() => (deletingStudent = s)}
							>
								<Trash2 size={15} />
							</button>
						</td>
					</tr>
				{/each}
				{#if draft}
					<tr>
						<td class="name-col">
							<input
								bind:this={draftInput}
								class="cell"
								class:invalid={draft.error}
								placeholder="Name"
								bind:value={draft.name}
								oninput={() => draft && (draft.error = '')}
								onkeydown={(e) => {
									if (e.key === 'Enter') commitDraft(true);
									if (e.key === 'Escape') draft = null;
								}}
								onblur={() => commitDraft(false)}
							/>
						</td>
						<td colspan={data.properties.length + 1} class="error">{draft.error}</td>
					</tr>
				{/if}
				<tr>
					<td colspan={data.properties.length + 2} class="new-row">
						<button class="new-btn" onclick={startDraft}><Plus size={15} /> New Student</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	{#each Object.entries(nameErrors) as [, msg] (msg)}
		<p class="error">{msg}</p>
	{/each}
</div>

{#if deletingProperty && propertyImpact}
	{@const p = deletingProperty}
	<Modal
		title="Delete “{p.name}”?"
		confirmLabel="Delete Property"
		danger
		typeToConfirm={p.name}
		oncancel={() => (deletingProperty = null)}
		onconfirm={() => {
			store.deleteProperty(p.id);
			deletingProperty = null;
		}}
	>
		<p>
			This removes the value from {propertyImpact.valueCount} Student{propertyImpact.valueCount ===
			1
				? ''
				: 's'}.
		</p>
		{#if propertyImpact.schedules.length}
			<p>Conditions on “{p.name}” will be removed from these Schedules:</p>
			<ul class="impact">
				{#each propertyImpact.schedules as s (s.id)}
					<li>
						<strong>{s.name}</strong>: {s.before} → {s.after} Students
						{#if s.noAudience}<span class="warn">(left with No Audience)</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p>No Schedules use this Property.</p>
		{/if}
	</Modal>
{/if}

{#if deletingOption && optionImpact}
	{@const { property, option } = deletingOption}
	<Modal
		title="Delete the Option “{option}”?"
		confirmLabel="Delete Option"
		danger
		oncancel={() => (deletingOption = null)}
		onconfirm={() => {
			store.deleteOption(property.id, option);
			deletingOption = null;
		}}
	>
		<p>
			{optionImpact.valueCount} Student{optionImpact.valueCount === 1 ? '' : 's'} will have their {property.name}
			cleared.
		</p>
		{#if optionImpact.schedules.length}
			<p>“{option}” will be removed from these Schedules’ Conditions:</p>
			<ul class="impact">
				{#each optionImpact.schedules as s (s.id)}
					<li><strong>{s.name}</strong>: {s.before} → {s.after} Students</li>
				{/each}
			</ul>
		{/if}
	</Modal>
{/if}

{#if deletingStudent}
	{@const s = deletingStudent}
	{@const count = sessionsFor(s.id, data.sessions).length}
	<Modal
		title="Delete {s.name}?"
		confirmLabel="Delete Student"
		danger
		oncancel={() => (deletingStudent = null)}
		onconfirm={() => {
			store.deleteStudent(s.id);
			deletingStudent = null;
		}}
	>
		{#if count}
			<p>
				{s.name} will be removed from {count} Session{count === 1 ? '' : 's'}. The Sessions
				themselves are kept.
			</p>
		{:else}
			<p>{s.name} isn’t in any Sessions.</p>
		{/if}
	</Modal>
{/if}

{#if exporting}
	<ExportDialog
		initial={{ includeCaseload: true, scheduleIds: [] }}
		onclose={() => (exporting = false)}
	/>
{/if}

<style>
	.head-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.export {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.page-head p {
		margin: 4px 0 0;
	}
	.table-wrap {
		background: white;
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: auto;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		border-bottom: 1px solid var(--line);
		border-right: 1px solid var(--line);
		padding: 0;
		text-align: left;
		min-width: 150px;
		height: 36px;
	}
	th {
		font-weight: 500;
		color: var(--muted);
		font-size: 13px;
		background: #fcfcfd;
	}
	.th-label {
		padding: 0 10px;
	}
	.name-col {
		min-width: 200px;
	}
	.add-col {
		min-width: 44px;
		width: 44px;
		border-right: none;
		text-align: center;
	}
	.header-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		border: none;
		background: none;
		width: 100%;
		height: 36px;
		border-radius: 0;
		color: var(--muted);
		padding: 0 10px;
	}
	.header-btn.center {
		justify-content: center;
	}
	.check {
		display: flex;
		align-items: center;
		height: 36px;
		padding: 0 10px;
		cursor: pointer;
	}
	.cell {
		border: none;
		border-radius: 0;
		width: 100%;
		box-sizing: border-box;
		height: 36px;
		background: transparent;
		padding: 0 10px;
	}
	.cell:focus {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
		background: white;
	}
	.cell.invalid {
		outline: 2px solid var(--danger);
		outline-offset: -2px;
	}
	.new-row {
		border-bottom: none;
		border-right: none;
	}
	.new-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		height: 36px;
		border: none;
		border-radius: 0;
		background: none;
		color: var(--muted);
		padding: 0 10px;
		text-align: left;
	}
	.row-delete {
		opacity: 0;
		color: var(--muted);
	}
	tr:hover .row-delete {
		opacity: 1;
	}
	.error {
		color: var(--danger);
		font-size: 13px;
		padding: 0 10px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		color: var(--muted);
		padding: 6px;
	}
	.icon-label {
		font-size: 12px;
		padding: 0 6px 4px;
	}
	.icon-grid {
		display: grid;
		grid-template-columns: repeat(8, 28px);
		gap: 2px;
		padding: 0 6px 8px;
	}
	.icon-choice {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		border-radius: 6px;
		background: none;
		color: var(--muted);
	}
	.icon-choice:hover:not(:disabled) {
		background: var(--surface-2);
		color: var(--text);
	}
	.icon-choice.active {
		background: var(--accent-soft);
		color: var(--accent-strong);
	}
	.type-note {
		font-size: 12px;
		padding: 0 6px 6px;
	}
	.show-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 8px;
		border-top: 1px solid var(--line);
		cursor: pointer;
	}
	.shown {
		display: inline-flex;
		margin-left: auto;
		color: var(--muted);
	}
	.pick,
	.menu-danger {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		border: none;
		background: none;
		padding: 7px 8px;
		border-radius: 5px;
		text-align: left;
	}
	.pick:hover,
	.menu-danger:hover {
		background: var(--surface-2);
	}
	.menu-danger {
		color: var(--danger);
		border-top: 1px solid var(--line);
		border-radius: 0;
	}
	.impact {
		padding-left: 18px;
	}
	.warn {
		color: #9a5b00;
	}
</style>

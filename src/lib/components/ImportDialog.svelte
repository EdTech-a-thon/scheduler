<script lang="ts">
	import { planImport, type TransferFile } from '$lib/domain/transfer';
	import { store } from '$lib/state/store.svelte';
	import Modal from './Modal.svelte';

	let { file, filename, onclose }: { file: TransferFile; filename: string; onclose: () => void } =
		$props();

	// Planned once against the data as it was when the file was dropped.
	// svelte-ignore state_referenced_locally
	const plan = planImport(store.data, file);
	const hasCaseload = plan.students.length > 0;

	let includeCaseload = $state(hasCaseload);
	// Schedules whose name is already taken start unchecked, to avoid accidental duplicates.
	let scheduleIds = $state(plan.schedules.filter((s) => !s.exists).map((s) => s.id));

	const newStudents = plan.students.filter((s) => !s.exists).length;
	const newProperties = plan.propertyMatches.filter((m) => m.existingId === null);

	function toggle(id: string) {
		scheduleIds = scheduleIds.includes(id)
			? scheduleIds.filter((x) => x !== id)
			: [...scheduleIds, id];
	}

	function importNow() {
		store.importFile(file, { includeCaseload, scheduleIds });
		onclose();
	}
</script>

<Modal
	title="Import {filename}"
	confirmLabel="Import"
	disabled={!includeCaseload && scheduleIds.length === 0}
	oncancel={onclose}
	onconfirm={importNow}
>
	{#if hasCaseload}
		<label class="row strong">
			<input type="checkbox" bind:checked={includeCaseload} />
			Caseload
			<span class="muted">
				{plan.students.length} Students · {newStudents} new{#if plan.students.length > newStudents},
					{plan.students.length - newStudents} already on your Caseload (their values will be updated){/if}
			</span>
		</label>
	{/if}

	{#if plan.schedules.length}
		<div class="row strong">Schedules</div>
		<div class="list">
			{#each plan.schedules as s (s.id)}
				<label class="row">
					<input
						type="checkbox"
						checked={scheduleIds.includes(s.id)}
						onchange={() => toggle(s.id)}
					/>
					<span class="swatch" style:background={s.color}></span>
					{s.name}
					{#if s.exists}<span class="exists">already exists; adds a copy</span>{/if}
				</label>
			{/each}
		</div>
	{/if}

	{#if newProperties.length}
		<p class="muted note">
			New Properties will be added if needed: {newProperties
				.map((m) => m.property.name)
				.join(', ')}. Others are matched to your Properties by name.
		</p>
	{/if}
</Modal>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 0;
	}
	.strong {
		font-weight: 600;
	}
	.strong .muted {
		font-weight: 400;
		font-size: 12px;
	}
	.list {
		max-height: 260px;
		overflow: auto;
		padding-left: 24px;
	}
	.swatch {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		flex: none;
	}
	.exists {
		font-size: 12px;
		color: #9a5b00;
	}
	.note {
		font-size: 12px;
		margin-bottom: 0;
	}
</style>

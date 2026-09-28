<script lang="ts">
	import { buildExport, type ExportChoice } from '$lib/domain/transfer';
	import { store } from '$lib/state/store.svelte';
	import { downloadJson } from './download';
	import Modal from './Modal.svelte';

	let { initial, onclose }: { initial: ExportChoice; onclose: () => void } = $props();

	// svelte-ignore state_referenced_locally
	let includeCaseload = $state(initial.includeCaseload);
	// svelte-ignore state_referenced_locally
	let scheduleIds = $state([...initial.scheduleIds]);

	const data = $derived(store.data);
	const allSelected = $derived(
		data.schedules.length > 0 && data.schedules.every((s) => scheduleIds.includes(s.id))
	);

	function toggle(id: string) {
		scheduleIds = scheduleIds.includes(id)
			? scheduleIds.filter((x) => x !== id)
			: [...scheduleIds, id];
	}

	function filename() {
		const what =
			includeCaseload && scheduleIds.length
				? 'caseload-and-schedules'
				: includeCaseload
					? 'caseload'
					: 'schedules';
		return `${what}-${new Date().toISOString().slice(0, 10)}.json`;
	}

	function exportNow() {
		downloadJson(filename(), buildExport(store.data, { includeCaseload, scheduleIds }));
		onclose();
	}
</script>

<Modal
	title="Export"
	confirmLabel="Download file"
	disabled={!includeCaseload && scheduleIds.length === 0}
	oncancel={onclose}
	onconfirm={exportNow}
>
	<p class="muted">
		Send the file to teammates so they can import it instead of re-entering everything. Sessions are
		never included.
	</p>

	<label class="row strong">
		<input type="checkbox" bind:checked={includeCaseload} />
		Caseload
		<span class="muted">
			{data.students.length} Students, {data.properties.length} Properties
		</span>
	</label>

	<div class="group">
		<label class="row strong">
			<input
				type="checkbox"
				checked={allSelected}
				disabled={data.schedules.length === 0}
				onchange={() => (scheduleIds = allSelected ? [] : data.schedules.map((s) => s.id))}
			/>
			Schedules
			<span class="muted">{scheduleIds.length} of {data.schedules.length}</span>
		</label>
		<div class="list">
			{#each data.schedules as s (s.id)}
				<label class="row">
					<input
						type="checkbox"
						checked={scheduleIds.includes(s.id)}
						onchange={() => toggle(s.id)}
					/>
					<span class="swatch" style:background={s.color}></span>
					{s.name}
				</label>
			{/each}
		</div>
	</div>

	{#if !includeCaseload && scheduleIds.length}
		<p class="muted note">
			Properties the chosen Schedules’ Audiences use are included, so they keep matching the right
			Students after import.
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
	.group {
		margin-top: 6px;
	}
	.list {
		max-height: 240px;
		overflow: auto;
		padding-left: 24px;
	}
	.swatch {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		flex: none;
	}
	.note {
		font-size: 12px;
		margin-bottom: 0;
	}
</style>

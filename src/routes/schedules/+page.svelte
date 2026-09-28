<script lang="ts">
	import { goto } from '$app/navigation';
	import { Check, FileDown, Plus, TriangleAlert, X } from '@lucide/svelte';
	import ExportDialog from '$lib/components/ExportDialog.svelte';
	import ScheduleThumbnail from '$lib/components/ScheduleThumbnail.svelte';
	import { audienceMembers, describeAudience, hasNoAudience } from '$lib/domain/audience';
	import { store } from '$lib/state/store.svelte';

	const data = $derived(store.data);

	let exporting = $state(false);

	function create() {
		goto(`/schedules/${store.createSchedule()}`);
	}
</script>

<div class="page">
	<div class="page-head">
		<h1>Schedules</h1>
		<div class="actions">
			<button class="new" disabled={data.schedules.length === 0} onclick={() => (exporting = true)}>
				<FileDown size={16} /> Export
			</button>
			<button class="primary new" onclick={create}><Plus size={16} /> New Schedule</button>
		</div>
	</div>

	{#if data.schedules.length === 0}
		<div class="empty">
			<p>No Schedules yet.</p>
			<p class="muted">
				Start with an <strong>Allow</strong> Schedule like School Hours for Everyone, then layer
				<strong>Deny</strong> Schedules like recess and lunch on top.
			</p>
		</div>
	{:else}
		<div class="cards">
			{#each data.schedules as s (s.id)}
				{@const members = audienceMembers(data.students, s.audience).length}
				<a class="card" href="/schedules/{s.id}" style:--c={s.color}>
					<div class="top">
						<span class="swatch"></span>
						<strong>{s.name}</strong>
						<span class="mode" class:allow={s.mode === 'allow'}>
							{#if s.mode === 'allow'}<Check size={12} /> Allow{:else}<X size={12} /> Deny{/if}
						</span>
					</div>
					<div class="audience" class:warn={hasNoAudience(s.audience)}>
						{#if hasNoAudience(s.audience)}<TriangleAlert size={13} />{/if}
						{describeAudience(s.audience, data.properties)}
					</div>
					<div class="bottom">
						<div class="muted meta">
							{members} Student{members === 1 ? '' : 's'} · {s.windows.length} Window{s.windows
								.length === 1
								? ''
								: 's'}
						</div>
						<ScheduleThumbnail schedule={s} />
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

{#if exporting}
	<ExportDialog
		initial={{ includeCaseload: false, scheduleIds: data.schedules.map((s) => s.id) }}
		onclose={() => (exporting = false)}
	/>
{/if}

<style>
	.mode.allow {
		color: #1f7a4d;
	}
	.mode:not(.allow) {
		color: #b4232a;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	.new {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.empty {
		background: white;
		border: 1px dashed var(--line);
		border-radius: 10px;
		padding: 28px;
		text-align: center;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: white;
		border: 1px solid var(--line);
		border-left: 5px solid var(--c);
		border-radius: 10px;
		padding: 14px 16px;
		color: inherit;
		text-decoration: none;
	}
	.card:hover {
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.07);
	}
	.top {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		background: var(--c);
	}
	.mode {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		margin-left: auto;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	.audience {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
	}
	.audience.warn {
		color: #9a5b00;
		font-weight: 600;
	}
	.bottom {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 10px;
		margin-top: auto;
	}
	.meta {
		white-space: nowrap;
		font-size: 12px;
	}
</style>

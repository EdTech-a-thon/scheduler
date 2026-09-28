<script lang="ts">
	import { goto } from '$app/navigation';
	import { Ellipsis, FileDown, FileUp, Plus, Trash2, TriangleAlert } from '@lucide/svelte';
	import { downloadJson } from '$lib/components/download';
	import Modal from '$lib/components/Modal.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import ScheduleThumbnail from '$lib/components/ScheduleThumbnail.svelte';
	import { audienceMembers, describeAudience, hasNoAudience } from '$lib/domain/audience';
	import { buildExport } from '$lib/domain/transfer';
	import type { Schedule } from '$lib/domain/types';
	import { importer } from '$lib/state/importer.svelte';
	import { store } from '$lib/state/store.svelte';

	const data = $derived(store.data);

	/** Which card's quick-action menu is open. */
	let menuFor = $state<string | null>(null);
	let deleting = $state<Schedule | null>(null);

	const today = () => new Date().toISOString().slice(0, 10);
	const slug = (name: string) =>
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'schedule';

	function exportSchedules(list: Schedule[], filename: string) {
		const scheduleIds = list.map((s) => s.id);
		downloadJson(filename, buildExport(store.data, { includeCaseload: false, scheduleIds }));
	}

	function create() {
		goto(`/schedules/${store.createSchedule()}`);
	}
</script>

<div class="page">
	<div class="page-head">
		<h1>Schedules</h1>
		<div class="actions">
			<button class="new" onclick={() => importer.pick()}><FileUp size={16} /> Import</button>
			<button
				class="new"
				disabled={data.schedules.length === 0}
				onclick={() => exportSchedules(data.schedules, `schedules-${today()}.json`)}
			>
				<FileDown size={16} /> Export all
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
				<div class="card" style:--c={s.color}>
					<div class="top">
						<span class="swatch"></span>
						<!-- The link covers the whole card; the menu sits above it. -->
						<a class="open" href="/schedules/{s.id}">{s.name}</a>
						<div class="more">
							<Popover
								align="right"
								minWidth={180}
								bind:open={() => menuFor === s.id, (v) => (menuFor = v ? s.id : null)}
							>
								{#snippet trigger({ toggle })}
									<button
										class="icon"
										aria-label="Actions for {s.name}"
										aria-haspopup="menu"
										onclick={toggle}
									>
										<Ellipsis size={16} />
									</button>
								{/snippet}
								{#snippet children({ close })}
									<div class="menu" role="menu">
										<button
											role="menuitem"
											onclick={() => {
												exportSchedules([s], `${slug(s.name)}-schedule.json`);
												close();
											}}
										>
											<FileDown size={14} /> Export Schedule
										</button>
										<button
											role="menuitem"
											class="danger"
											onclick={() => {
												deleting = s;
												close();
											}}
										>
											<Trash2 size={14} /> Delete Schedule
										</button>
									</div>
								{/snippet}
							</Popover>
						</div>
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
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if deleting}
	{@const target = deleting}
	{@const count = audienceMembers(data.students, target.audience).length}
	<Modal
		title="Delete “{target.name}”?"
		confirmLabel="Delete Schedule"
		danger
		oncancel={() => (deleting = null)}
		onconfirm={() => {
			store.deleteSchedule(target.id);
			deleting = null;
		}}
	>
		<p>It currently applies to {count} Student{count === 1 ? '' : 's'}. You can undo this.</p>
	</Modal>
{/if}

<style>
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
		position: relative;
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
	.open {
		font-weight: 600;
		color: inherit;
		text-decoration: none;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.open::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
	.open:focus-visible {
		outline: none;
	}
	.card:has(.open:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.more {
		position: relative;
		z-index: 1;
		margin: -6px -8px -6px auto;
	}
	.more .icon {
		color: var(--muted);
	}
	.menu {
		display: flex;
		flex-direction: column;
	}
	.menu button {
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
		background: none;
		text-align: left;
		padding: 7px 10px;
		border-radius: 5px;
		font-size: 13px;
	}
	.menu button:hover {
		background: var(--surface-2);
	}
	.menu .danger {
		color: var(--danger);
	}
	.swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		background: var(--c);
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

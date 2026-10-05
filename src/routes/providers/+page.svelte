<script lang="ts">
	import { goto } from '$app/navigation';
	import { LayoutGrid, Plus, Trash2 } from '@lucide/svelte';
	import { focusOnMount } from '$lib/components/focus';
	import Modal from '$lib/components/Modal.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import PropertyIcon from '$lib/components/PropertyIcon.svelte';
	import ProviderThumbnail from '$lib/components/ProviderThumbnail.svelte';
	import { PALETTE } from '$lib/domain/palette';
	import { PROVIDER_ICONS, sessionsOf, studentsServedBy } from '$lib/domain/providers';
	import type { Provider } from '$lib/domain/types';
	import { plannerUi } from '$lib/state/persisted.svelte';
	import { store } from '$lib/state/store.svelte';

	const data = $derived(store.data);

	/** Me first, then everyone else in the order they were added. */
	const providers = $derived([
		...data.providers.filter((p) => p.id === data.meId),
		...data.providers.filter((p) => p.id !== data.meId)
	]);

	let adding = $state(false);
	let newName = $state('');
	let removing = $state<Provider | null>(null);
	let styleFor = $state<string | null>(null);
	/** A rename that clashed with another Provider's name, shown under its card. */
	let nameError = $state<{ id: string; text: string } | null>(null);

	function add() {
		if (!newName.trim()) return;
		if (store.isProviderNameTaken(newName)) {
			nameError = { id: 'new', text: 'There’s already a Provider with that name.' };
			return;
		}
		store.addProvider(newName);
		newName = '';
		adding = false;
		nameError = null;
	}

	function rename(p: Provider, input: HTMLInputElement) {
		if (store.renameProvider(p.id, input.value)) {
			nameError = null;
			return;
		}
		nameError = input.value.trim()
			? { id: p.id, text: 'There’s already a Provider with that name.' }
			: null;
		input.value = p.name;
	}

	function planFor(p: Provider) {
		plannerUi.planningFor = p.id === data.meId ? '' : p.id;
		plannerUi.selected = [];
		plannerUi.sessionIds = [];
		goto('/planner');
	}
</script>

<div class="page">
	<div class="page-head">
		<h1>Providers</h1>
		<button class="primary new" onclick={() => (adding = true)}>
			<Plus size={16} /> New Provider
		</button>
	</div>

	<p class="muted intro">
		Everyone who runs Sessions. Each Session shows its Providers’ color and icon, and the Planner
		can plan any Provider’s week.
	</p>

	<div class="cards">
		{#if adding}
			<div class="card adding">
				<input
					placeholder="Provider’s name"
					aria-label="New Provider’s name"
					use:focusOnMount
					bind:value={newName}
					onkeydown={(e) => {
						if (e.key === 'Enter') add();
						if (e.key === 'Escape') adding = false;
					}}
				/>
				{#if nameError?.id === 'new'}<p class="error">{nameError.text}</p>{/if}
				<div class="row">
					<button onclick={() => ((adding = false), (nameError = null))}>Cancel</button>
					<button class="primary" disabled={!newName.trim()} onclick={add}>Add</button>
				</div>
			</div>
		{/if}

		{#each providers as p (p.id)}
			{@const sessions = sessionsOf(p.id, data.sessions)}
			{@const students = studentsServedBy(p.id, data.sessions).size}
			{@const isMe = p.id === data.meId}
			<div class="card" style:--c={p.color}>
				<div class="top">
					<Popover
						minWidth={232}
						bind:open={() => styleFor === p.id, (v) => (styleFor = v ? p.id : null)}
					>
						{#snippet trigger({ toggle })}
							<button
								class="badge"
								aria-label="Change {p.name}’s color and icon"
								aria-haspopup="dialog"
								onclick={toggle}
							>
								<PropertyIcon name={p.icon} size={16} />
							</button>
						{/snippet}
						{#snippet children()}
							<div class="style">
								<div class="label">Color</div>
								<div class="swatches">
									{#each PALETTE as c (c)}
										<button
											class="sw"
											class:on={c === p.color}
											style:background={c}
											aria-label="Color {c}"
											onclick={() => store.updateProvider(p.id, (x) => (x.color = c))}
										></button>
									{/each}
								</div>
								<div class="label">Icon</div>
								<div class="icons">
									{#each PROVIDER_ICONS as icon (icon)}
										<button
											class="ic"
											class:on={icon === p.icon}
											aria-label="Icon {icon}"
											onclick={() => store.updateProvider(p.id, (x) => (x.icon = icon))}
										>
											<PropertyIcon name={icon} size={16} />
										</button>
									{/each}
								</div>
							</div>
						{/snippet}
					</Popover>
					<input
						class="name"
						value={p.name}
						aria-label="{p.name}’s name"
						onchange={(e) => rename(p, e.currentTarget)}
						onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
					/>
					{#if isMe}<span class="you">You</span>{/if}
				</div>
				{#if nameError?.id === p.id}<p class="error">{nameError.text}</p>{/if}
				<div class="bottom">
					<div class="muted meta">
						{sessions.length} Session{sessions.length === 1 ? '' : 's'} · {students} Student{students ===
						1
							? ''
							: 's'}
					</div>
					<ProviderThumbnail provider={p} {sessions} />
				</div>
				<div class="row">
					<button class="plan" onclick={() => planFor(p)}>
						<LayoutGrid size={14} /> Plan for {isMe ? 'me' : p.name}
					</button>
					{#if !isMe}
						<button class="icon remove" aria-label="Remove {p.name}" onclick={() => (removing = p)}>
							<Trash2 size={15} />
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

{#if removing}
	{@const target = removing}
	{@const count = sessionsOf(target.id, data.sessions).length}
	<Modal
		title="Remove {target.name}?"
		confirmLabel="Remove Provider"
		danger
		oncancel={() => (removing = null)}
		onconfirm={() => {
			store.deleteProvider(target.id);
			removing = null;
		}}
	>
		<p>
			{#if count}
				{target.name} has {count} Session{count === 1 ? '' : 's'}. They’ll be kept, without
				{target.name} on them.
			{:else}
				{target.name} has no Sessions.
			{/if}
			You can undo this.
		</p>
	</Modal>
{/if}

<style>
	.new {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.intro {
		margin: -8px 0 18px;
		max-width: 640px;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: white;
		border: 1px solid var(--line);
		border-left: 5px solid var(--c);
		border-radius: 10px;
		padding: 14px 16px;
	}
	.card.adding {
		border-left-color: var(--line);
		justify-content: center;
	}
	.top {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.badge {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: var(--c);
		color: white;
		flex: none;
	}
	.badge:hover:not(:disabled) {
		background: color-mix(in srgb, var(--c) 85%, black);
	}
	.name {
		flex: 1;
		min-width: 0;
		font-weight: 600;
		font-size: 15px;
		border-color: transparent;
		background: transparent;
	}
	.name:hover,
	.name:focus {
		border-color: var(--line);
		background: white;
	}
	.you {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
	}
	.bottom {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 10px;
	}
	.meta {
		white-space: nowrap;
		font-size: 12px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.adding .row {
		justify-content: flex-end;
	}
	.plan {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.remove {
		color: var(--muted);
	}
	.remove:hover {
		color: var(--danger);
	}
	.error {
		margin: 0;
		color: var(--danger);
		font-size: 12px;
	}
	.style {
		padding: 6px;
	}
	.label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin: 4px 0 6px;
	}
	.swatches,
	.icons {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		margin-bottom: 8px;
	}
	.sw {
		width: 28px;
		height: 28px;
		padding: 0;
		border-radius: 999px;
		border: 2px solid white;
		box-shadow: 0 0 0 1px var(--line);
	}
	.sw.on {
		box-shadow: 0 0 0 2px #273142;
	}
	.ic {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border-radius: 6px;
	}
	.ic.on {
		background: var(--surface-2);
		border-color: #273142;
	}
</style>

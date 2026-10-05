<script lang="ts">
	import { Plus, X } from '@lucide/svelte';
	import { normalizeText } from '$lib/domain/audience';
	import { providerLabel } from '$lib/domain/providers';
	import type { Provider } from '$lib/domain/types';
	import PropertyIcon from './PropertyIcon.svelte';

	/**
	 * A Session's Providers as chips, with a box that finds a Provider by name
	 * or adds a new one with the name typed.
	 */
	let {
		providers,
		meId,
		selectedIds,
		onadd,
		onremove,
		oncreate
	}: {
		providers: Provider[];
		meId: string | null;
		selectedIds: string[];
		onadd: (id: string) => void;
		onremove: (id: string) => void;
		/** Adds a Provider with this name and returns their id. */
		oncreate: (name: string) => string | null;
	} = $props();

	let query = $state('');
	let open = $state(false);
	let active = $state(0);

	const selected = $derived(
		selectedIds.map((id) => providers.find((p) => p.id === id)).filter((p) => !!p)
	);
	const matches = $derived(
		providers.filter(
			(p) => !selectedIds.includes(p.id) && normalizeText(p.name).includes(normalizeText(query))
		)
	);
	const exact = $derived(providers.some((p) => normalizeText(p.name) === normalizeText(query)));
	/** Each row is an existing Provider or, last, "Add" for a new name. */
	const rows = $derived<({ kind: 'pick'; p: Provider } | { kind: 'new'; name: string })[]>([
		...matches.map((p) => ({ kind: 'pick' as const, p })),
		...(query.trim() && !exact ? [{ kind: 'new' as const, name: query.trim() }] : [])
	]);

	function choose(row: (typeof rows)[number]) {
		const id = row.kind === 'pick' ? row.p.id : oncreate(row.name);
		if (id) onadd(id);
		query = '';
		active = 0;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') active = Math.min(active + 1, rows.length - 1);
		else if (e.key === 'ArrowUp') active = Math.max(active - 1, 0);
		else if (e.key === 'Enter' && rows[active]) choose(rows[active]);
		else if (e.key === 'Escape' && open) {
			open = false;
			e.stopPropagation();
		} else return;
		e.preventDefault();
	}
</script>

<div class="chips">
	{#each selected as p (p.id)}
		<span class="chip" style:--c={p.color}>
			<span class="icon"><PropertyIcon name={p.icon} size={11} /></span>
			{providerLabel(p, meId)}
			<button class="x" aria-label="Remove {p.name}" onclick={() => onremove(p.id)}>
				<X size={12} />
			</button>
		</span>
	{:else}
		<span class="muted">No Provider</span>
	{/each}
</div>

<div class="combo">
	<input
		placeholder="+ Add Provider…"
		bind:value={query}
		role="combobox"
		aria-expanded={open && rows.length > 0}
		aria-controls="provider-options"
		onfocus={() => (open = true)}
		onblur={() => (open = false)}
		oninput={() => {
			open = true;
			active = 0;
		}}
		{onkeydown}
	/>
	{#if open && rows.length > 0}
		<ul id="provider-options" role="listbox">
			{#each rows as row, i (row.kind === 'pick' ? row.p.id : 'new')}
				<li role="option" aria-selected={i === active}>
					<button
						class:active={i === active}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => choose(row)}
					>
						{#if row.kind === 'pick'}
							<span class="icon" style:--c={row.p.color}
								><PropertyIcon name={row.p.icon} size={11} /></span
							>
							{providerLabel(row.p, meId)}
						{:else}
							<Plus size={14} /> Add “{row.name}”
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: color-mix(in srgb, var(--c) 14%, white);
		border-radius: 999px;
		padding: 2px 4px 2px 3px;
		font-size: 12px;
	}
	.icon {
		display: inline-grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: var(--c);
		color: white;
		flex: none;
	}
	.x {
		border: none;
		background: none;
		padding: 2px;
		display: grid;
		border-radius: 999px;
	}
	.combo {
		position: relative;
	}
	input {
		width: 100%;
		box-sizing: border-box;
	}
	ul {
		position: absolute;
		z-index: 5;
		left: 0;
		right: 0;
		top: calc(100% + 4px);
		margin: 0;
		padding: 4px;
		list-style: none;
		background: white;
		border: 1px solid var(--line);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
		max-height: 220px;
		overflow: auto;
	}
	ul button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		border: none;
		background: none;
		text-align: left;
		padding: 6px 8px;
		border-radius: 6px;
		font-size: 13px;
	}
	ul button.active {
		background: var(--surface-2);
	}
</style>

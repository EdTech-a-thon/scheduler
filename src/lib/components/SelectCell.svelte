<script lang="ts">
	import { focusOnMount } from './focus';
	import { Check, Plus, Trash2, X } from '@lucide/svelte';
	import { normalizeText } from '$lib/domain/audience';
	import { findOption } from '$lib/domain/options';
	import OptionBadge from './OptionBadge.svelte';
	import Popover from './Popover.svelte';

	interface Props {
		value: string | undefined;
		options: string[];
		onselect: (value: string | undefined) => void;
		ondeleteoption: (option: string) => void;
	}

	let { value, options, onselect, ondeleteoption }: Props = $props();

	let open = $state(false);
	let query = $state('');
	let active = $state(0);

	const matches = $derived(options.filter((o) => normalizeText(o).includes(normalizeText(query))));
	const canCreate = $derived(query.trim() !== '' && !findOption(options, query));
	const rows = $derived<{ kind: 'pick' | 'create'; label: string }[]>([
		...matches.map((label) => ({ kind: 'pick' as const, label })),
		...(canCreate ? [{ kind: 'create' as const, label: query.trim() }] : [])
	]);

	$effect(() => {
		if (!open) {
			query = '';
			active = 0;
		}
	});

	function choose(label: string) {
		onselect(label);
		open = false;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') active = Math.min(rows.length - 1, active + 1);
		else if (e.key === 'ArrowUp') active = Math.max(0, active - 1);
		else if (e.key === 'Enter' && rows[active]) choose(rows[active].label);
		else if (e.key === 'Backspace' && query === '' && value) onselect(undefined);
		else return;
		e.preventDefault();
	}
</script>

<Popover bind:open block minWidth={240}>
	{#snippet trigger({ toggle })}
		<button class="cell" onclick={toggle}>
			{#if value}<OptionBadge label={value} />{/if}
		</button>
	{/snippet}
	{#snippet children()}
		<div class="search">
			{#if value}
				<OptionBadge label={value}>
					<button class="clear" aria-label="Clear" onclick={() => onselect(undefined)}>
						<X size={12} />
					</button>
				</OptionBadge>
			{/if}
			<input
				use:focusOnMount
				placeholder={value ? '' : 'Search or create an Option…'}
				bind:value={query}
				oninput={() => (active = 0)}
				{onkeydown}
			/>
		</div>
		<div class="hint">Select an Option or create one</div>
		<div class="rows">
			{#each rows as row, i (row.kind + row.label)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="row"
					class:active={i === active}
					role="option"
					tabindex="-1"
					aria-selected={i === active}
					onpointerenter={() => (active = i)}
					onclick={() => choose(row.label)}
				>
					{#if row.kind === 'create'}
						<Plus size={14} /> Create <OptionBadge label={row.label} />
					{:else}
						<OptionBadge label={row.label} />
						<span class="spacer"></span>
						{#if value && normalizeText(value) === normalizeText(row.label)}<Check size={14} />{/if}
						<button
							class="delete"
							aria-label="Delete Option {row.label}"
							title="Delete Option"
							onclick={(e) => {
								e.stopPropagation();
								open = false;
								ondeleteoption(row.label);
							}}
						>
							<Trash2 size={13} />
						</button>
					{/if}
				</div>
			{:else}
				<div class="none">No Options yet. Type to create one.</div>
			{/each}
		</div>
	{/snippet}
</Popover>

<style>
	.cell {
		display: flex;
		align-items: center;
		width: 100%;
		height: 36px;
		border: none;
		border-radius: 0;
		background: transparent;
		padding: 0 10px;
		text-align: left;
	}
	.cell:hover {
		background: var(--surface-2);
	}
	.search {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		border-bottom: 1px solid var(--line);
		padding: 2px 4px 8px;
		margin: -2px -2px 4px;
	}
	.search input {
		flex: 1;
		min-width: 80px;
		border: none;
		outline: none;
		padding: 4px;
	}
	.clear {
		border: none;
		background: none;
		padding: 0 0 0 2px;
		color: inherit;
		display: grid;
	}
	.hint {
		font-size: 12px;
		color: var(--muted);
		padding: 4px 6px;
	}
	.rows {
		max-height: 260px;
		overflow: auto;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 6px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 13px;
	}
	.row.active {
		background: var(--surface-2);
	}
	.spacer {
		flex: 1;
	}
	.delete {
		border: none;
		background: none;
		padding: 2px;
		display: grid;
		color: var(--muted);
		opacity: 0;
	}
	.row:hover .delete {
		opacity: 1;
	}
	.delete:hover:not(:disabled) {
		color: var(--danger);
		background: none;
	}
	.none {
		padding: 6px;
		color: var(--muted);
		font-size: 13px;
	}
</style>

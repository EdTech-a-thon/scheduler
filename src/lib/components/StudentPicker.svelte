<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { matchesCondition, normalizeText } from '$lib/domain/audience';
	import type { Condition } from '$lib/domain/types';
	import { store } from '$lib/state/store.svelte';
	import ConditionsEditor from './ConditionsEditor.svelte';
	import PropertyIcon from './PropertyIcon.svelte';

	let {
		selected = $bindable(),
		query = $bindable(),
		filters = $bindable()
	}: { selected: string[]; query: string; filters: Condition[] } = $props();

	let anchor = $state<string | null>(null);

	const students = $derived(store.data.students);
	const byId = $derived(new Map(students.map((s) => [s.id, s])));
	const visible = $derived(
		students.filter(
			(s) =>
				normalizeText(s.name).includes(normalizeText(query)) &&
				// A filter with no values picked yet doesn't narrow anything.
				filters.every((c) => (c.op === 'anyOf' && c.values.length === 0) || matchesCondition(s, c))
		)
	);

	// Forget selections of Students that were deleted.
	$effect(() => {
		const live = selected.filter((id) => byId.has(id));
		if (live.length !== selected.length) selected = live;
	});

	function range(toId: string): string[] {
		const ids = visible.map((s) => s.id);
		const a = anchor ? ids.indexOf(anchor) : -1;
		const b = ids.indexOf(toId);
		if (a === -1) return [toId];
		return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
	}

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	/** A row behaves like its checkbox: a click toggles, Shift-click adds the range. */
	function onRowClick(e: MouseEvent, id: string) {
		if (e.shiftKey) selected = [...new Set([...selected, ...range(id)])];
		else {
			toggle(id);
			anchor = id;
		}
	}

	function onCheckbox(e: MouseEvent, id: string) {
		e.stopPropagation();
		if (e.shiftKey) {
			e.preventDefault();
			selected = [...new Set([...selected, ...range(id)])];
		} else {
			toggle(id);
			anchor = id;
		}
	}

	const allVisibleSelected = $derived(
		visible.length > 0 && visible.every((s) => selected.includes(s.id))
	);
</script>

<div class="picker">
	<div class="search">
		<Search size={15} />
		<input placeholder="Search Students" bind:value={query} />
	</div>
	<ConditionsEditor addLabel="Filter" conditions={filters} onchange={(c) => (filters = c)} />

	<div class="list-head">
		<label>
			<input
				type="checkbox"
				checked={allVisibleSelected}
				onchange={() => {
					const ids = visible.map((s) => s.id);
					selected = allVisibleSelected
						? selected.filter((id) => !ids.includes(id))
						: [...new Set([...selected, ...ids])];
				}}
			/>
			{visible.length} shown
		</label>
		{#if selected.length}
			<button class="clear" onclick={() => (selected = [])}>Clear {selected.length} selected</button
			>
		{/if}
	</div>

	<ul class="list">
		{#each visible as s (s.id)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<li
				class:selected={selected.includes(s.id)}
				onclick={(e) => onRowClick(e, s.id)}
				role="option"
				aria-selected={selected.includes(s.id)}
			>
				<input
					type="checkbox"
					checked={selected.includes(s.id)}
					onclick={(e) => onCheckbox(e, s.id)}
				/>
				<span class="name">{s.name}</span>
				<span class="props">
					{#each store.data.properties.filter((p) => p.type === 'select' && typeof s.values[p.id] === 'string') as p (p.id)}
						<span class="prop" title={p.name}>
							<PropertyIcon name={p.icon} size={12} />{s.values[p.id]}
						</span>
					{/each}
				</span>
			</li>
		{:else}
			<li class="none muted">
				{students.length ? 'No Students match.' : 'Add Students on the Caseload page first.'}
			</li>
		{/each}
	</ul>
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 0;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 6px;
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 0 8px;
		color: var(--muted);
		background: white;
	}
	.search input {
		border: none;
		outline: none;
		flex: 1;
		padding: 7px 0;
	}
	.list-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--muted);
		padding: 0 8px;
		min-height: 24px;
	}
	.clear {
		border: none;
		background: none;
		color: var(--accent);
		font-size: 12px;
		padding: 2px 4px;
	}
	.list-head label {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: auto;
		user-select: none;
	}
	.list li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 8px;
		border-radius: 6px;
		cursor: pointer;
	}
	.list li:hover {
		background: var(--surface-2);
	}
	.list li.selected {
		background: var(--accent-soft);
	}
	/* Neighbouring selected rows join into one box. */
	.list li.selected:has(+ li.selected) {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	.list li.selected + li.selected {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}
	.name {
		font-weight: 500;
	}
	.props {
		display: flex;
		gap: 8px;
		min-width: 0;
		margin-left: auto;
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.prop {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}
	.prop :global(svg) {
		flex: none;
		opacity: 0.8;
	}
	.none {
		cursor: default;
	}
</style>

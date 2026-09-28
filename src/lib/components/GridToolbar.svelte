<script lang="ts">
	import { Combine, Eraser, MousePointer2, Pencil, SquarePlus, Trash2, X } from '@lucide/svelte';
	import UndoButtons from './UndoButtons.svelte';
	import type { Tool } from './TimeGrid.svelte';

	interface Selection {
		count: number;
		/** Why the selection can't merge, or null if it can. */
		mergeReason: string | null;
		onmerge: () => void;
		/** Hovering Merge previews it on the grid. */
		onmergehover: (on: boolean) => void;
		ondelete: () => void;
		onclear: () => void;
	}

	let {
		tool = $bindable(),
		noun,
		selection
	}: { tool: Tool; noun: string; selection?: Selection } = $props();

	const alt =
		typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌥' : 'Alt';

	const tools = $derived([
		{
			id: 'select' as const,
			icon: MousePointer2,
			label: 'Select (V)',
			hint: `Drag across empty space to select several · Shift/⌘-click to add · ${alt}-drag to duplicate`
		},
		{
			id: 'draw' as const,
			icon: Pencil,
			label: 'Draw (D)',
			hint: `Drag on empty space to add a ${noun} · drag a ${noun} to move or resize it · ${alt}-drag to duplicate`
		},
		{
			id: 'add' as const,
			icon: SquarePlus,
			label: 'Add (A)',
			hint: `Drag anywhere to add a ${noun}, even on top of others · nothing gets moved`
		},
		{
			id: 'erase' as const,
			icon: Eraser,
			label: 'Erase (E)',
			hint: 'Drag across time to erase it · erased days split off from the rest'
		}
	]);
	const current = $derived(tools.find((t) => t.id === tool)!);
</script>

<div class="toolbar" role="toolbar" data-keeps-selection>
	<div class="group">
		{#each tools as t (t.id)}
			<button
				class="icon"
				class:active={tool === t.id}
				title={t.label}
				aria-label={t.label}
				aria-pressed={tool === t.id}
				onclick={() => (tool = t.id)}
			>
				<t.icon size={16} />
			</button>
		{/each}
	</div>
	<UndoButtons />
	{#if selection && selection.count > 1}
		<div class="selection">
			<span>{selection.count} {noun}s selected</span>
			<button
				disabled={!!selection.mergeReason}
				title={selection.mergeReason ?? `Merge into one ${noun}`}
				onclick={() => {
					selection.onmergehover(false);
					selection.onmerge();
				}}
				onpointerenter={() => selection.onmergehover(true)}
				onpointerleave={() => selection.onmergehover(false)}
			>
				<Combine size={14} /> Merge
			</button>
			<button class="danger-text" onclick={selection.ondelete}><Trash2 size={14} /> Delete</button>
			<button class="icon" title="Clear selection (Esc)" onclick={selection.onclear}>
				<X size={14} />
			</button>
		</div>
	{:else}
		<span class="hint">{current.hint}</span>
	{/if}
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	.group {
		display: flex;
		gap: 2px;
		padding: 2px;
		background: var(--surface-2);
		border-radius: 8px;
	}
	.icon.active {
		background: white;
		color: var(--accent);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
	}
	.selection {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
	}
	.selection button:not(.icon) {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
	}
	.danger-text {
		color: var(--danger);
	}
	.hint {
		font-size: 12px;
		color: var(--muted);
	}
</style>

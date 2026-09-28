<script lang="ts">
	import { Redo2, Undo2 } from '@lucide/svelte';
	import { store } from '$lib/state/store.svelte';

	const mod =
		typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
</script>

<div class="group">
	<button class="icon" title="Undo ({mod}Z)" disabled={!store.canUndo} onclick={() => store.undo()}>
		<Undo2 size={16} />
	</button>
	<button
		class="icon"
		title="Redo (⇧{mod}Z)"
		disabled={!store.canRedo}
		onclick={() => store.redo()}
	>
		<Redo2 size={16} />
	</button>
</div>

<style>
	.group {
		display: flex;
		gap: 2px;
		padding: 2px;
		background: var(--surface-2);
		border-radius: 8px;
	}
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		trigger: Snippet<[{ toggle: () => void }]>;
		children: Snippet<[{ close: () => void }]>;
		align?: 'left' | 'right';
		/** Make the anchor fill its container, e.g. a whole table cell. */
		block?: boolean;
		minWidth?: number;
	}

	let {
		open = $bindable(false),
		trigger,
		children,
		align = 'left',
		block = false,
		minWidth = 220
	}: Props = $props();

	let anchor: HTMLDivElement | undefined = $state();
	let panel: HTMLDivElement | undefined = $state();
	let pos = $state({ top: 0, left: 0, width: 0, above: false, bottom: 0, right: 0 });

	const close = () => (open = false);
	const toggle = () => (open = !open);

	// Fixed positioning keeps the panel from being clipped by scrolling containers like the table.
	function place() {
		if (!anchor) return;
		const r = anchor.getBoundingClientRect();
		const above = r.bottom + 320 > window.innerHeight && r.top > 320;
		pos = {
			top: r.bottom + 4,
			bottom: window.innerHeight - r.top + 4,
			left: r.left,
			right: window.innerWidth - r.right,
			width: r.width,
			above
		};
	}

	$effect(() => {
		if (!open) return;
		place();
		const onMove = () => place();
		window.addEventListener('scroll', onMove, true);
		window.addEventListener('resize', onMove);
		return () => {
			window.removeEventListener('scroll', onMove, true);
			window.removeEventListener('resize', onMove);
		};
	});

	function onOutside(e: PointerEvent) {
		const t = e.target as Node;
		if (open && !anchor?.contains(t) && !panel?.contains(t)) close();
	}
</script>

<svelte:window
	onpointerdown={onOutside}
	onkeydown={(e) => {
		if (!open || e.key !== 'Escape') return;
		// Commit whatever field is being edited (they save on change) before closing.
		if (panel?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
		close();
	}}
/>

<div class="popover-anchor" class:block bind:this={anchor}>
	{@render trigger({ toggle })}
</div>

{#if open}
	<div
		class="popover"
		bind:this={panel}
		style:top={pos.above ? 'auto' : `${pos.top}px`}
		style:bottom={pos.above ? `${pos.bottom}px` : 'auto'}
		style:left={align === 'left' ? `${pos.left}px` : 'auto'}
		style:right={align === 'right' ? `${pos.right}px` : 'auto'}
		style:min-width="{Math.max(minWidth, block ? pos.width : 0)}px"
	>
		{@render children({ close })}
	</div>
{/if}

<style>
	.popover-anchor {
		display: inline-block;
	}
	.popover-anchor.block {
		display: block;
		width: 100%;
		height: 100%;
	}
	.popover {
		position: fixed;
		z-index: 60;
		background: white;
		border: 1px solid var(--line);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
		padding: 6px;
		max-width: 360px;
		box-sizing: border-box;
	}
</style>

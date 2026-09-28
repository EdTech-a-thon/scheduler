<script lang="ts">
	import type { Snippet } from 'svelte';
	import { GripHorizontal } from '@lucide/svelte';

	interface Props {
		/** The `data-item` id of the block to sit beside. */
		anchorId: string;
		width?: number;
		onclose: () => void;
		children: Snippet;
	}

	let { anchorId, width = 300, onclose, children }: Props = $props();

	/**
	 * Escape closes even from inside a field: blurring first commits the edit
	 * (fields save on change), then the panel closes.
	 */
	function onkeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		e.preventDefault();
		e.stopPropagation();
		(document.activeElement as HTMLElement | null)?.blur();
		onclose();
	}

	const GAP = 12;
	const MARGIN = 12;

	let panel: HTMLDivElement | undefined = $state();
	let pos = $state({ left: 0, top: 0 });
	/** Set once the Provider drags the panel; it then stays put until another block opens. */
	let moved = $state(false);
	let drag: { dx: number; dy: number } | null = null;

	/**
	 * Beside the block like Google Calendar: to its right, else left, below, or
	 * above — the first side with room. If none fits fully, the one that shows
	 * the most, kept on screen.
	 */
	function place() {
		if (moved || !panel) return;
		const block = document.querySelector<HTMLElement>(`[data-item="${CSS.escape(anchorId)}"]`);
		if (!block) return;
		const r = block.getBoundingClientRect();
		const h = panel.offsetHeight;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const alignTop = Math.min(r.top, vh - h - MARGIN);
		const alignLeft = Math.min(r.left, vw - width - MARGIN);
		const sides = [
			{ left: r.right + GAP, top: alignTop },
			{ left: r.left - GAP - width, top: alignTop },
			{ left: alignLeft, top: r.bottom + GAP },
			{ left: alignLeft, top: r.top - GAP - h }
		];
		const visible = (s: { left: number; top: number }) =>
			Math.max(0, Math.min(s.left + width, vw - MARGIN) - Math.max(s.left, MARGIN)) *
			Math.max(0, Math.min(s.top + h, vh - MARGIN) - Math.max(s.top, MARGIN));
		const fits = sides.find((s) => visible(s) >= width * h - 1);
		const best = fits ?? sides.reduce((a, b) => (visible(b) > visible(a) ? b : a));
		pos = {
			left: Math.max(MARGIN, Math.min(best.left, vw - width - MARGIN)),
			top: Math.max(MARGIN, Math.min(best.top, vh - h - MARGIN))
		};
	}

	// A different block: start again beside it.
	$effect(() => {
		void anchorId;
		moved = false;
		requestAnimationFrame(place);
	});

	$effect(() => {
		const onMove = () => place();
		window.addEventListener('scroll', onMove, true);
		window.addEventListener('resize', onMove);
		// The block itself can move (dragged, resized, edited in the panel).
		// Only watch the grid, never the panel itself, so repositioning can't loop.
		const observer = new MutationObserver(() => requestAnimationFrame(place));
		const grid = document.querySelector('.track');
		if (grid)
			observer.observe(grid, { attributes: true, subtree: true, attributeFilter: ['style'] });
		return () => {
			window.removeEventListener('scroll', onMove, true);
			window.removeEventListener('resize', onMove);
			observer.disconnect();
		};
	});

	function onpointerdown(e: PointerEvent) {
		if (e.button !== 0) return;
		drag = { dx: e.clientX - pos.left, dy: e.clientY - pos.top };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onpointermove(e: PointerEvent) {
		if (!drag || !panel) return;
		moved = true;
		pos = {
			left: Math.max(0, Math.min(e.clientX - drag.dx, window.innerWidth - width)),
			top: Math.max(0, Math.min(e.clientY - drag.dy, window.innerHeight - 40))
		};
	}
</script>

<div
	class="floating no-print"
	bind:this={panel}
	data-keeps-selection
	style:left="{pos.left}px"
	style:top="{pos.top}px"
	style:width="{width}px"
	role="dialog"
	tabindex="-1"
	{onkeydown}
>
	<div
		class="grip"
		title="Drag to move"
		role="presentation"
		{onpointerdown}
		{onpointermove}
		onpointerup={() => (drag = null)}
		onpointercancel={() => (drag = null)}
	>
		<GripHorizontal size={16} />
	</div>
	<div class="body">{@render children()}</div>
</div>

<style>
	.floating {
		position: fixed;
		z-index: 80;
		background: white;
		border: 1px solid var(--line);
		border-radius: 12px;
		box-shadow:
			0 12px 32px rgb(0 0 0 / 0.16),
			0 2px 6px rgb(0 0 0 / 0.08);
		max-height: calc(100vh - 24px);
		display: flex;
		flex-direction: column;
	}
	.grip {
		display: grid;
		place-items: center;
		height: 18px;
		color: #b8bcc4;
		cursor: grab;
		touch-action: none;
		flex: none;
	}
	.grip:active {
		cursor: grabbing;
	}
	.body {
		padding: 0 16px 16px;
		overflow: auto;
	}
</style>

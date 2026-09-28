<script lang="ts" module>
	import type { Day, Minute } from '$lib/domain/types';
	import type { SpanAction } from '$lib/domain/spans';
	import type { GridRect } from './gridDrag';

	export type { GridRect };

	export interface GridItem extends GridRect {
		id: string;
		color: string;
		title?: string;
		subtitle?: string;
		warning?: boolean;
	}

	export interface BackgroundSegment {
		start: Minute;
		end: Minute;
		colors: string[];
	}

	/**
	 * select: move, resize, and marquee-select. draw: also create on empty space.
	 * add: every drag creates, even over items. erase: every drag erases.
	 */
	export type Tool = 'select' | 'draw' | 'add' | 'erase';
	export type MenuAction = SpanAction;
	export type RectChange = { id: string; rect: GridRect };
</script>

<script lang="ts">
	import {
		GRID_END,
		GRID_START,
		DAY_SHORT,
		DAYS,
		SNAP,
		clampDay,
		formatRange,
		formatTime,
		snap
	} from '$lib/domain/time';
	import {
		Combine,
		Scissors,
		SplitSquareVertical,
		Trash2,
		CalendarMinus,
		TriangleAlert
	} from '@lucide/svelte';
	import { applySpanAction, mergeAdditions, mergeCheck } from '$lib/domain/spans';
	import {
		HANDLE_CURSOR,
		applyDrag,
		moveGroup,
		resizeGroup,
		sameRect,
		type Handle,
		type Point
	} from './gridDrag';

	interface Props {
		items: GridItem[];
		tool: Tool;
		selectedIds: string[];
		/** What one item is called in menus, e.g. "Window" or "Session". */
		noun: string;
		variant: 'window' | 'session';
		background?: BackgroundSegment[][];
		tooltip?: (day: Day, minute: Minute) => string[] | null;
		/** Extra reason a geometrically mergeable selection can't merge (e.g. different Students). */
		mergeBlocker?: (ids: string[]) => string | null;
		/**
		 * `settled` is true when a selection action is finished and wasn't additive
		 * (a plain click, the end of a drag or marquee): the moment to show details.
		 */
		onselect: (ids: string[], settled?: boolean) => void;
		oncreate: (rect: GridRect) => void;
		/** One or more items moved or resized together, as one step. */
		onchange: (changes: RectChange[]) => void;
		onerase: (rect: GridRect) => void;
		onmenu: (action: MenuAction, id: string, day: Day) => void;
		/** Option/Alt-drag drops copies at the new spot and leaves the originals, like Figma. */
		onduplicate: (copies: RectChange[]) => void;
		ondelete: (ids: string[]) => void;
		onmerge: (ids: string[], rect: GridRect) => void;
	}

	let {
		items,
		tool,
		selectedIds,
		noun,
		variant,
		background,
		tooltip,
		mergeBlocker,
		onselect,
		oncreate,
		onchange,
		onerase,
		onmenu,
		onduplicate,
		ondelete,
		onmerge
	}: Props = $props();

	const RANGE = GRID_END - GRID_START;
	const ROW_H = 76;
	const PAD = 8;
	const LANE = 8;
	const HOURS = Array.from({ length: RANGE / 60 + 1 }, (_, i) => GRID_START + i * 60);
	const EDGES: Handle[] = ['l', 'r', 't', 'b', 'tl', 'tr', 'bl', 'br'];
	const SIDE_EDGES: Handle[] = ['l', 'r'];
	const COPY_SUFFIX = '::copy';

	let track: HTMLDivElement | undefined = $state();
	let root: HTMLDivElement | undefined = $state();

	type Drag =
		| { kind: 'create' | 'erase'; from: Point; to: Point; moved: boolean }
		| {
				kind: 'marquee';
				/** Viewport pixels, for drawing the box. */
				x0: number;
				y0: number;
				x1: number;
				y1: number;
				from: Point;
				to: Point;
				moved: boolean;
				/** What stays selected underneath, when Shift/⌘ was held. */
				base: string[];
		  }
		| {
				kind: 'item';
				handle: Handle;
				orig: GridItem;
				/** Everything that moves with it: the whole selection for a body drag, else just it. */
				group: GridItem[];
				x0: number;
				y0: number;
				down: Point;
				now: Point;
				moved: boolean;
				/** Option/Alt held while moving the body: the drop makes copies. */
				copy: boolean;
				/** Shift/⌘/Ctrl held: a click toggles instead of replacing the selection. */
				additive: boolean;
		  };

	let drag = $state<Drag | null>(null);
	let menu = $state<{ x: number; y: number; id: string; day: Day; multi: boolean } | null>(null);
	let tip = $state<{ x: number; y: number; lines: string[] } | null>(null);

	const editable = $derived(tool === 'select' || tool === 'draw');
	const selected = $derived(new Set(selectedIds));
	const pct = (m: Minute) => ((m - GRID_START) / RANGE) * 100;
	const isAdditive = (e: MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey;

	function pointAt(e: PointerEvent | MouseEvent): Point {
		const r = track!.getBoundingClientRect();
		const m = GRID_START + ((e.clientX - r.left) / r.width) * RANGE;
		const d = clampDay(Math.floor((e.clientY - r.top) / ROW_H));
		return { d, m: Math.min(GRID_END, Math.max(GRID_START, m)) };
	}

	function rectBetween(a: Point, b: Point): GridRect {
		const start = snap(Math.min(a.m, b.m), 'floor');
		return {
			startDay: Math.min(a.d, b.d) as Day,
			endDay: Math.max(a.d, b.d) as Day,
			start,
			end: Math.max(snap(Math.max(a.m, b.m), 'ceil'), start + SNAP)
		};
	}

	/** Where each dragged item ends up, keyed by id. */
	/** Just the geometry: ids, colors and labels must never leak into saved data. */
	const rectOf = ({ startDay, endDay, start, end }: GridRect): GridRect => ({
		startDay,
		endDay,
		start,
		end
	});

	function dragResult(d: Extract<Drag, { kind: 'item' }>): Map<string, GridRect> {
		if (d.handle === 'body') {
			const moved = moveGroup(d.group, d.down, d.now);
			return new Map(moved.map((m) => [m.id, rectOf(m)]));
		}
		if ((d.handle === 'l' || d.handle === 'r') && d.group.length > 1) {
			const resized = resizeGroup(d.group, d.handle, d.down, d.now);
			return new Map(resized.map((m) => [m.id, rectOf(m)]));
		}
		return new Map([[d.orig.id, applyDrag(d.orig, d.handle, d.down, d.now)]]);
	}

	const moving = $derived.by(() => {
		const d = drag;
		return d && d.kind === 'item' && d.moved ? dragResult(d) : null;
	});

	/** The right-click action being hovered, previewed on the grid until the menu closes. */
	let menuHover = $state<MenuAction | 'merge' | 'deleteAll' | null>(null);

	type Shown = GridItem & { look?: 'piece' | 'removed' | 'copy' | 'added' };

	/** Set while the toolbar's Merge button is hovered, to preview the merge from outside the menu. */
	let mergePreview = $state(false);

	export function previewMerge(on: boolean) {
		mergePreview = on;
	}

	/** Items as they look mid-drag: moved in place, or with copies following the pointer. */
	function withDrag(list: GridItem[]): Shown[] {
		const d = drag;
		if (!moving || !d || d.kind !== 'item') return list;
		if (!d.copy) return list.map((i) => (moving.has(i.id) ? { ...i, ...moving.get(i.id)! } : i));
		const copies = list
			.filter((i) => moving.has(i.id))
			.map((i) => ({ ...i, ...moving.get(i.id)!, id: i.id + COPY_SUFFIX, look: 'copy' as const }));
		return [...list, ...copies];
	}

	/** Items with a hovered menu action applied: the resulting pieces, over a ghost of what's removed. */
	function withMenuPreview(list: Shown[]): Shown[] {
		const hover = mergePreview ? 'merge' : menu ? menuHover : null;
		if (!hover) return list;
		const ghost = (i: GridItem, patch: Partial<GridRect> = {}) => ({
			...i,
			...patch,
			id: `${i.id}::before`,
			look: 'removed' as const
		});
		if (hover === 'deleteAll')
			return [
				...list.filter((i) => !selected.has(i.id)),
				...list.filter((i) => selected.has(i.id)).map((i) => ghost(i))
			];
		if (hover === 'merge') {
			const chosen = list.filter((i) => selected.has(i.id));
			const check = mergeCheck(chosen);
			if (!check.rect || mergeReason) return list;
			// The merged block, with the time it fills in that nobody covered shown as added.
			return [
				...list.filter((i) => !selected.has(i.id)),
				{ ...chosen[0], ...check.rect, id: `${chosen[0].id}::merged`, look: 'piece' as const },
				...mergeAdditions(chosen).map((a, n) => ({
					...chosen[0],
					...a,
					title: undefined,
					subtitle: undefined,
					id: `${chosen[0].id}::added${n}`,
					look: 'added' as const
				}))
			];
		}
		if (!menu) return list;
		const target = list.find((i) => i.id === menu!.id);
		if (!target) return list;
		let n = 0;
		const pieces = applySpanAction(hover, target, menu.day, () => `${target.id}::p${++n}`);
		// Ghost only what goes away: the whole block, or just the one day.
		const removed =
			hover === 'delete'
				? [ghost(target)]
				: hover === 'deleteDay'
					? [ghost(target, { startDay: menu.day, endDay: menu.day })]
					: [];
		return [
			...list.filter((i) => i.id !== target.id),
			...removed,
			...pieces.map((p) => ({ ...p, id: `${p.id}::piece`, look: 'piece' as const }))
		];
	}

	const shown = $derived<Shown[]>(withMenuPreview(withDrag(items)));

	const area = (i: GridRect) => (i.end - i.start) * (i.endDay - i.startDay + 1);

	/**
	 * Overlapping items are nudged down a lane each, like Google Calendar. Bigger
	 * items take the lower lanes and sit underneath, so nothing is ever fully hidden.
	 */
	const lanes = $derived.by(() => {
		const out = new Map<string, number>();
		const sorted = [...shown].sort((a, b) => area(b) - area(a) || a.start - b.start);
		const placed: { item: GridItem; lane: number }[] = [];
		for (const item of sorted) {
			const used = new Set(
				placed
					.filter(
						(p) =>
							p.item.start < item.end &&
							item.start < p.item.end &&
							p.item.startDay <= item.endDay &&
							item.startDay <= p.item.endDay
					)
					.map((p) => p.lane)
			);
			let lane = 0;
			while (used.has(lane)) lane++;
			placed.push({ item, lane });
			out.set(item.id, Math.min(lane, 4));
		}
		return out;
	});

	/** Stacking order: the smaller an item, the higher it sits. */
	const stack = $derived(
		new Map(
			[...shown].sort((a, b) => area(b) - area(a)).map((item, i) => [item.id, 2 + i] as const)
		)
	);

	const ghost = $derived.by(() => {
		const d = drag;
		if (!d || (d.kind !== 'create' && d.kind !== 'erase') || !d.moved || tool === 'select')
			return null;
		return { kind: d.kind, ...rectBetween(d.from, d.to) };
	});

	const marquee = $derived.by(() => {
		const d = drag;
		if (!d || d.kind !== 'marquee' || !d.moved) return null;
		return {
			left: Math.min(d.x0, d.x1),
			top: Math.min(d.y0, d.y1),
			width: Math.abs(d.x1 - d.x0),
			height: Math.abs(d.y1 - d.y0)
		};
	});

	/** While dragging, the whole grid shows the cursor for what's being dragged. */
	const dragCursor = $derived.by(() => {
		const d = drag;
		if (!d) return null;
		if (d.kind === 'marquee') return 'default';
		if (d.kind !== 'item') return d.kind === 'erase' ? 'cell' : 'crosshair';
		if (d.copy) return 'copy';
		return d.handle === 'body' ? 'grabbing' : HANDLE_CURSOR[d.handle];
	});

	/** Viewport coordinates: the marquee is drawn fixed, above everything, never clipped. */
	function local(e: PointerEvent) {
		return { x: e.clientX, y: e.clientY };
	}

	/** Items a marquee between two points touches. */
	function hits(a: Point, b: Point): string[] {
		const [d0, d1] = [Math.min(a.d, b.d), Math.max(a.d, b.d)];
		const [m0, m1] = [Math.min(a.m, b.m), Math.max(a.m, b.m)];
		return items
			.filter((i) => i.startDay <= d1 && d0 <= i.endDay && i.start < m1 && m0 < i.end)
			.map((i) => i.id);
	}

	function onpointerdown(e: PointerEvent) {
		if (e.button !== 0) return;
		closeMenu();
		tip = null;
		const target = e.target as HTMLElement;
		const block = target.closest<HTMLElement>('[data-item]');
		const p = pointAt(e);
		track!.setPointerCapture(e.pointerId);
		if (tool === 'erase' || tool === 'add' || (!block && tool === 'draw')) {
			drag = { kind: tool === 'erase' ? 'erase' : 'create', from: p, to: p, moved: false };
			return;
		}
		if (!block) {
			const { x, y } = local(e);
			const base = isAdditive(e) ? [...selectedIds] : [];
			drag = { kind: 'marquee', x0: x, y0: y, x1: x, y1: y, from: p, to: p, moved: false, base };
			return;
		}
		const orig = items.find((i) => i.id === block.dataset.item)!;
		const handle = (target.closest<HTMLElement>('[data-handle]')?.dataset.handle ??
			'body') as Handle;
		const additive = isAdditive(e);
		const inSelection = selected.has(orig.id);
		// A plain press on an unselected item selects just it, ready to drag.
		if (!additive && !inSelection) onselect([orig.id], false);
		// The body moves the whole selection; a side edge resizes that side on all of it.
		const side = handle === 'l' || handle === 'r';
		const groupIds =
			(handle === 'body' && (inSelection || additive)) || (side && inSelection)
				? new Set([...selectedIds, orig.id])
				: new Set([orig.id]);
		drag = {
			kind: 'item',
			handle,
			orig,
			group: items.filter((i) => groupIds.has(i.id)),
			x0: e.clientX,
			y0: e.clientY,
			down: p,
			now: p,
			moved: false,
			copy: handle === 'body' && e.altKey,
			additive
		};
	}

	function onpointermove(e: PointerEvent) {
		const d = drag;
		if (!d) {
			updateTip(e);
			return;
		}
		const p = pointAt(e);
		if (d.kind === 'item') {
			if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 3) return;
			d.moved = true;
			d.now = p;
			// Like Figma, pressing or releasing Option/Alt mid-drag switches between move and copy.
			d.copy = d.handle === 'body' && e.altKey;
		} else if (d.kind === 'marquee') {
			const { x, y } = local(e);
			d.x1 = x;
			d.y1 = y;
			d.to = p;
			if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 3) d.moved = true;
			if (d.moved) onselect([...new Set([...d.base, ...hits(d.from, d.to)])], false);
		} else {
			d.to = p;
			if (Math.abs(pct(d.to.m) - pct(d.from.m)) > 0.3 || d.to.d !== d.from.d) d.moved = true;
		}
	}

	function onpointerup(e: PointerEvent) {
		const d = drag;
		if (!d) return;
		drag = null;
		if (d.kind === 'item') {
			if (!d.moved) {
				// Shift/⌘-click toggles; a plain click narrows to just this item.
				if (d.additive)
					onselect(
						selected.has(d.orig.id)
							? selectedIds.filter((id) => id !== d.orig.id)
							: [...selectedIds, d.orig.id],
						false
					);
				else onselect([d.orig.id], true);
				return;
			}
			const result = dragResult(d);
			const changes = d.group
				.filter((g) => result.has(g.id) && !sameRect(result.get(g.id)!, g))
				.map((g) => ({ id: g.id, rect: result.get(g.id)! }));
			if (changes.length === 0) {
				if (!d.additive) onselect([...selectedIds], true);
				return;
			}
			if (d.copy) onduplicate(changes);
			else {
				const ids = selected.has(d.orig.id) ? [...selectedIds] : [...selectedIds, d.orig.id];
				onselect(ids, !d.additive);
				onchange(changes);
			}
			return;
		}
		if (d.kind === 'marquee') {
			if (!d.moved) onselect(d.base, d.base.length === 0);
			else onselect([...new Set([...d.base, ...hits(d.from, d.to)])], d.base.length === 0);
			return;
		}
		if (!d.moved) {
			// A plain click selects what's under it (in Add/Erase too) or clears the selection.
			const block = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
			onselect(block ? [block.dataset.item!] : [], true);
			return;
		}
		const rect = rectBetween(d.from, d.to);
		if (d.kind === 'create') oncreate(rect);
		else onerase(rect);
	}

	function oncontextmenu(e: MouseEvent) {
		const block = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
		if (!block) return;
		e.preventDefault();
		const item = items.find((i) => i.id === block.dataset.item)!;
		const day = Math.min(item.endDay, Math.max(item.startDay, pointAt(e).d)) as Day;
		const multi = selected.has(item.id) && selectedIds.length > 1;
		if (!multi) onselect([item.id], false);
		// Viewport coordinates: the menu is fixed so the grid's scroll area can't clip it.
		const MENU_W = 220;
		const MENU_H = 150;
		menu = {
			x: Math.min(e.clientX, window.innerWidth - MENU_W - 8),
			y: e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY,
			id: item.id,
			day,
			multi
		};
	}

	function updateTip(e: PointerEvent) {
		if (!tooltip || (e.target as HTMLElement).closest('[data-item]')) {
			tip = null;
			return;
		}
		const p = pointAt(e);
		const lines = tooltip(p.d, snap(p.m, 'floor'));
		tip = lines && lines.length ? { x: e.clientX + 14, y: e.clientY + 14, lines } : null;
	}

	function closeMenu() {
		menu = null;
		menuHover = null;
	}

	/** Why the current selection can't merge, or null if it can. */
	const mergeReason = $derived.by(() => {
		if (selectedIds.length < 2) return 'Select two or more to merge';
		const check = mergeCheck(items.filter((i) => selected.has(i.id)));
		return check.reason ?? mergeBlocker?.(selectedIds) ?? null;
	});

	export function getMergeReason() {
		return mergeReason;
	}

	export function mergeSelection() {
		const check = mergeCheck(items.filter((i) => selected.has(i.id)));
		if (check.rect && !mergeReason) onmerge([...selectedIds], rectOf(check.rect));
	}

	function act(action: MenuAction | 'merge' | 'deleteAll') {
		if (!menu) return;
		if (action === 'merge') mergeSelection();
		else if (action === 'deleteAll') ondelete([...selectedIds]);
		else onmenu(action, menu.id, menu.day);
		closeMenu();
	}

	let trackWidth = $state(0);
	const STRIPE = 7;

	/**
	 * Every striped zone shows its own window onto one grid-sized pattern, so the
	 * diagonals run straight across day rows and between zones with different
	 * color combinations. Every stripe is the same width, whatever the count.
	 */
	function stripes(colors: string[], day: Day, start: Minute) {
		const soft = colors.map((c) => `color-mix(in srgb, ${c} 42%, white)`);
		if (soft.length === 1) return { color: soft[0], image: 'none', size: 'auto', position: '0 0' };
		const stops = soft.map((c, i) => `${c} ${i * STRIPE}px ${(i + 1) * STRIPE}px`).join(', ');
		const left = (pct(start) / 100) * trackWidth;
		return {
			color: 'transparent',
			image: `repeating-linear-gradient(135deg, ${stops})`,
			size: `${trackWidth}px ${ROW_H * 5}px`,
			position: `${-left}px ${-day * ROW_H}px`
		};
	}

	const menuItem = $derived(menu ? items.find((i) => i.id === menu!.id) : undefined);
	const multiDay = $derived(menuItem ? menuItem.startDay !== menuItem.endDay : false);
	const menuActions = $derived.by(() => {
		if (!menu) return [];
		if (menu.multi) {
			const n = selectedIds.length;
			return [
				{
					action: 'merge' as const,
					icon: Combine,
					label: `Merge ${n} ${noun}s`,
					disabled: mergeReason
				},
				{
					action: 'deleteAll' as const,
					icon: Trash2,
					label: `Delete ${n} ${noun}s`,
					disabled: null
				}
			];
		}
		const day = DAY_SHORT[menu.day];
		return [
			...(multiDay
				? [
						{ action: 'detach' as const, icon: Scissors, label: `Detach ${day}`, disabled: null },
						{
							action: 'split' as const,
							icon: SplitSquareVertical,
							label: 'Split all days',
							disabled: null
						},
						{
							action: 'deleteDay' as const,
							icon: CalendarMinus,
							label: `Delete ${day} only`,
							disabled: null
						}
					]
				: []),
			{ action: 'delete' as const, icon: Trash2, label: `Delete ${noun}`, disabled: null }
		];
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			closeMenu();
			drag = null;
		}
	}}
	onpointerdown={(e) => {
		const target = e.target as HTMLElement;
		if (menu && !target.closest('.menu')) closeMenu();
		// Clicking anywhere outside the grid deselects, except in places that edit the selection.
		if (selectedIds.length && !root?.contains(target) && !target.closest('[data-keeps-selection]'))
			onselect([]);
	}}
/>

<div
	class="grid tool-{tool}"
	bind:this={root}
	class:dragging={dragCursor}
	style:--drag-cursor={dragCursor}
>
	<div class="header">
		<div class="corner"></div>
		<div class="hours">
			{#each HOURS as h (h)}
				<span class="hour" style:left="{pct(h)}%">{formatTime(h)}</span>
			{/each}
		</div>
	</div>
	<div class="body">
		<div class="days">
			{#each DAYS as d (d)}
				<div class="day" style:height="{ROW_H}px">{DAY_SHORT[d]}</div>
			{/each}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="track"
			bind:this={track}
			bind:clientWidth={trackWidth}
			style:height="{ROW_H * 5}px"
			{onpointerdown}
			{onpointermove}
			{onpointerup}
			onpointercancel={() => (drag = null)}
			onpointerleave={() => (tip = null)}
			{oncontextmenu}
		>
			{#each DAYS as d (d)}
				<div class="row" style:top="{d * ROW_H}px" style:height="{ROW_H}px"></div>
			{/each}

			{#if background}
				{#each background as segs, d (d)}
					{#each segs as seg (seg.start)}
						{@const fill = stripes(seg.colors, d as Day, seg.start)}
						<div
							class="bg"
							style:top="{d * ROW_H}px"
							style:height="{ROW_H}px"
							style:left="{pct(seg.start)}%"
							style:width="{pct(seg.end) - pct(seg.start)}%"
							style:background-color={fill.color}
							style:background-image={fill.image}
							style:background-size={fill.size}
							style:background-position={fill.position}
						></div>
					{/each}
				{/each}
			{/if}

			{#each shown as item (item.id)}
				{@const lane = lanes.get(item.id) ?? 0}
				{@const isSelected = selected.has(item.id) && !item.look}
				<div
					class="item {variant}"
					class:selected={isSelected || item.look === 'copy'}
					class:copying={item.look === 'copy'}
					class:piece={item.look === 'piece'}
					class:removed={item.look === 'removed'}
					class:added={item.look === 'added'}
					class:warning={item.warning}
					data-item={item.id}
					style:--c={item.color}
					style:left="{pct(item.start)}%"
					style:width="{pct(item.end) - pct(item.start)}%"
					style:top="{item.startDay * ROW_H + PAD + lane * LANE}px"
					style:height="{Math.max(
						18,
						(item.endDay - item.startDay + 1) * ROW_H - 2 * PAD - lane * LANE
					)}px"
					style:z-index={stack.get(item.id) ?? 2}
				>
					<div class="content">
						<div class="label">
							{#if item.warning}<TriangleAlert size={12} />{/if}
							{#if item.title}<strong>{item.title}</strong>{/if}
							<span>{formatRange(item.start, item.end)}</span>
						</div>
						{#if item.subtitle}<div class="sub">{item.subtitle}</div>{/if}
					</div>
					{#if editable && !item.look}
						<!-- With several selected, only side edges resize (together); no vertical resizing. -->
						{#each isSelected && selectedIds.length > 1 ? SIDE_EDGES : EDGES as h (h)}
							<div class="handle h-{h}" data-handle={h} style:cursor={HANDLE_CURSOR[h]}></div>
						{/each}
						{#if isSelected && selectedIds.length === 1}
							{#each ['tl', 'tr', 'bl', 'br'] as c (c)}<span class="knob k-{c}"></span>{/each}
						{/if}
					{/if}
				</div>
			{/each}

			{#if ghost}
				<div
					class="ghost {ghost.kind}"
					style:top="{ghost.startDay * ROW_H + PAD}px"
					style:height="{(ghost.endDay - ghost.startDay + 1) * ROW_H - 2 * PAD}px"
					style:left="{pct(ghost.start)}%"
					style:width="{pct(ghost.end) - pct(ghost.start)}%"
				>
					<span>{formatRange(ghost.start, ghost.end)}</span>
				</div>
			{/if}

			{#if marquee}
				<div
					class="marquee"
					style:left="{marquee.left}px"
					style:top="{marquee.top}px"
					style:width="{marquee.width}px"
					style:height="{marquee.height}px"
				></div>
			{/if}
		</div>
	</div>

	{#if menu}
		<div
			class="menu"
			style:left="{menu.x}px"
			style:top="{menu.y}px"
			role="menu"
			tabindex="-1"
			onpointerleave={() => (menuHover = null)}
		>
			{#each menuActions as a (a.action)}
				<button
					role="menuitem"
					class:danger={a.action === 'delete' || a.action === 'deleteAll'}
					disabled={!!a.disabled}
					title={a.disabled ?? ''}
					onpointerenter={() => (menuHover = a.disabled ? null : a.action)}
					onfocus={() => (menuHover = a.disabled ? null : a.action)}
					onclick={() => act(a.action)}
				>
					<a.icon size={14} />
					{a.label}
				</button>
				{#if a.disabled}<div class="why">{a.disabled}</div>{/if}
			{/each}
		</div>
	{/if}

	{#if tip}
		<div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">
			{#each tip.lines as line, i (i)}<div>{line}</div>{/each}
		</div>
	{/if}
</div>

<style>
	.grid {
		position: relative;
		min-width: 860px;
		user-select: none;
		--line: #e7e7ea;
		--line-strong: #d4d4d8;
	}
	/* Keep the dragged-thing's cursor no matter what the pointer passes over. */
	.grid.dragging,
	.grid.dragging :global(*) {
		cursor: var(--drag-cursor) !important;
	}
	.header {
		display: flex;
		height: 26px;
	}
	.corner,
	.days {
		width: 52px;
		flex: none;
	}
	.hours {
		position: relative;
		flex: 1;
	}
	.hour {
		position: absolute;
		transform: translateX(-50%);
		font-size: 11px;
		color: var(--muted);
		top: 6px;
	}
	.hour:first-child {
		transform: none;
	}
	.hour:last-child {
		transform: translateX(-100%);
	}
	.body {
		display: flex;
	}
	.day {
		display: flex;
		align-items: center;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}
	.track {
		position: relative;
		flex: 1;
		cursor: default;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background:
			repeating-linear-gradient(
				to right,
				var(--line-strong) 0 1px,
				transparent 1px calc(100% / 10)
			),
			repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px calc(100% / 40)), white;
		touch-action: none;
	}
	.tool-draw .track,
	.tool-add .track,
	.tool-add .item {
		cursor: crosshair;
	}
	.tool-erase .track,
	.tool-erase .item {
		cursor: cell;
	}
	.row {
		position: absolute;
		left: 0;
		right: 0;
		border-top: 1px solid var(--line-strong);
		pointer-events: none;
	}
	.row:first-child {
		border-top: none;
	}
	.bg {
		position: absolute;
		pointer-events: none;
		opacity: 0.9;
	}
	.item {
		position: absolute;
		box-sizing: border-box;
		border-radius: 5px;
		font-size: 11px;
		line-height: 1.3;
		cursor: grab;
	}
	.content {
		position: absolute;
		inset: 0;
		padding: 3px 6px;
		overflow: hidden;
	}
	.item.window {
		background: color-mix(in srgb, var(--c) 24%, white);
		border: 1px solid color-mix(in srgb, var(--c) 60%, white);
		border-left: 4px solid var(--c);
		color: #1f2328;
	}
	.item.session {
		background: #273142;
		border: 1px solid #1b2230;
		border-left: 4px solid var(--c);
		color: white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
	}
	.item.selected {
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px var(--c);
	}
	.item.session.selected {
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px #273142;
	}
	.item.copying {
		opacity: 0.75;
		z-index: 1000 !important;
	}
	/* Right-click preview: the pieces an action would leave, over a ghost of what goes away. */
	.item.piece {
		outline: 2px dashed var(--c);
		outline-offset: 1px;
		pointer-events: none;
	}
	.item.session.piece {
		outline-color: #273142;
	}
	.item.removed {
		background: rgb(229 72 77 / 0.08) !important;
		border: 2px dashed #e5484d !important;
		color: #c62a2f !important;
		pointer-events: none;
		z-index: 1 !important;
	}
	/* Merge preview: time the merge fills in that no selected block covered. */
	.item.added {
		background: repeating-linear-gradient(
			135deg,
			rgb(48 164 108 / 0.28) 0 6px,
			rgb(48 164 108 / 0.12) 6px 12px
		) !important;
		border: 2px dashed #30a46c !important;
		color: #1f7a4d;
		pointer-events: none;
		z-index: 1002 !important;
	}
	.item.warning {
		outline: 2px dashed #e5484d;
		outline-offset: 1px;
	}
	.label {
		display: flex;
		gap: 4px;
		align-items: center;
		white-space: nowrap;
	}
	.label span {
		opacity: 0.75;
	}
	.sub {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		opacity: 0.85;
	}
	/* Grab zones straddle the edge, so they reach just outside the block too. */
	.handle {
		position: absolute;
		z-index: 1;
	}
	.h-l,
	.h-r {
		top: 6px;
		bottom: 6px;
		width: 12px;
	}
	.h-l {
		left: -7px;
	}
	.h-r {
		right: -7px;
	}
	.h-t,
	.h-b {
		left: 6px;
		right: 6px;
		height: 12px;
	}
	.h-t {
		top: -7px;
	}
	.h-b {
		bottom: -7px;
	}
	.h-tl,
	.h-tr,
	.h-bl,
	.h-br {
		width: 16px;
		height: 16px;
		z-index: 2;
	}
	.h-tl {
		left: -8px;
		top: -8px;
	}
	.h-tr {
		right: -8px;
		top: -8px;
	}
	.h-bl {
		left: -8px;
		bottom: -8px;
	}
	.h-br {
		right: -8px;
		bottom: -8px;
	}
	.knob {
		position: absolute;
		width: 8px;
		height: 8px;
		background: white;
		border: 2px solid var(--c);
		border-radius: 2px;
		box-sizing: border-box;
		pointer-events: none;
		z-index: 3;
	}
	.session .knob {
		border-color: #273142;
	}
	/*
	 * Knobs sit centred on the corners of the selection ring (2px gap + 2px ring
	 * outside the border). Offsets are from the padding edge, so they include
	 * each side's border: 4px on the left, 1px elsewhere.
	 */
	.k-tl {
		left: -11px;
		top: -8px;
	}
	.k-tr {
		right: -8px;
		top: -8px;
	}
	.k-bl {
		left: -11px;
		bottom: -8px;
	}
	.k-br {
		right: -8px;
		bottom: -8px;
	}
	.marquee {
		position: fixed;
		z-index: 1001;
		pointer-events: none;
		background: rgb(37 99 235 / 0.08);
		border: 1px solid rgb(37 99 235 / 0.7);
	}
	.ghost {
		position: absolute;
		border-radius: 5px;
		pointer-events: none;
		z-index: 1001;
		font-size: 11px;
		padding: 3px 6px;
		box-sizing: border-box;
	}
	.ghost.create {
		background: rgb(0 144 255 / 0.15);
		border: 2px solid #0090ff;
	}
	.ghost.erase {
		background: rgb(229 72 77 / 0.12);
		border: 2px dashed #e5484d;
	}
	.menu {
		position: fixed;
		z-index: 1003;
		background: white;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
		padding: 4px;
		display: flex;
		flex-direction: column;
		min-width: 180px;
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
		cursor: pointer;
	}
	.menu button:hover {
		background: #f2f2f4;
	}
	.menu button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.menu button:disabled:hover {
		background: none;
	}
	.menu .why {
		font-size: 11px;
		color: var(--muted);
		padding: 0 10px 6px 32px;
		max-width: 200px;
	}
	.menu .danger {
		color: #c62a2f;
	}
	.tip {
		position: fixed;
		z-index: 1002;
		pointer-events: none;
		background: #1f2328;
		color: white;
		font-size: 12px;
		padding: 6px 8px;
		border-radius: 6px;
		max-width: 320px;
		line-height: 1.45;
	}
</style>

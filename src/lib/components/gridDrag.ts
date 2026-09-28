import { GRID_END, GRID_START, SNAP, snap } from '$lib/domain/time';
import type { Day, Minute } from '$lib/domain/types';

export type GridRect = { startDay: Day; endDay: Day; start: Minute; end: Minute };

/** Where a drag grabbed an item: its body, one of four edges, or one of four corners. */
export type Handle = 'body' | 'l' | 'r' | 't' | 'b' | 'tl' | 'tr' | 'bl' | 'br';

export interface Point {
	d: Day;
	m: Minute;
}

export const HANDLE_CURSOR: Record<Handle, string> = {
	body: 'grab',
	l: 'ew-resize',
	r: 'ew-resize',
	t: 'ns-resize',
	b: 'ns-resize',
	tl: 'nwse-resize',
	br: 'nwse-resize',
	tr: 'nesw-resize',
	bl: 'nesw-resize'
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The rectangle an item becomes while dragged. The body moves in time and
 * across days; edges and corners resize (time on the sides, days on top and bottom).
 */
export function applyDrag(o: GridRect, handle: Handle, down: Point, now: Point): GridRect {
	if (handle === 'body') {
		const len = o.end - o.start;
		const span = o.endDay - o.startDay;
		const start = clamp(o.start + snap(now.m - down.m), GRID_START, GRID_END - len);
		const startDay = clamp(o.startDay + (now.d - down.d), 0, 4 - span) as Day;
		return { start, end: start + len, startDay, endDay: (startDay + span) as Day };
	}
	let { start, end, startDay, endDay } = o;
	const t = snap(clamp(now.m, GRID_START, GRID_END));
	if (handle.includes('l')) start = Math.min(t, end - SNAP);
	if (handle.includes('r')) end = Math.max(t, start + SNAP);
	if (handle.includes('t')) startDay = Math.min(now.d, endDay) as Day;
	if (handle.includes('b')) endDay = Math.max(now.d, startDay) as Day;
	return { start, end, startDay, endDay };
}

export function sameRect(a: GridRect, b: GridRect) {
	return (
		a.start === b.start && a.end === b.end && a.startDay === b.startDay && a.endDay === b.endDay
	);
}

/**
 * Move several items by the same amount, as far as the whole group can go
 * without any of them leaving the week.
 */
export function moveGroup<T extends GridRect>(items: T[], down: Point, now: Point): T[] {
	const dm = clamp(
		snap(now.m - down.m),
		GRID_START - Math.min(...items.map((i) => i.start)),
		GRID_END - Math.max(...items.map((i) => i.end))
	);
	const dd = clamp(
		now.d - down.d,
		-Math.min(...items.map((i) => i.startDay)),
		4 - Math.max(...items.map((i) => i.endDay))
	);
	return items.map((i) => ({
		...i,
		start: i.start + dm,
		end: i.end + dm,
		startDay: (i.startDay + dd) as Day,
		endDay: (i.endDay + dd) as Day
	}));
}

/**
 * Pull the same side of several items by the same amount. Each keeps its own
 * times (a 9:00 and a 9:30 start both move +15), stopping at the grid's edges
 * and never shrinking below one step.
 */
export function resizeGroup<T extends GridRect>(
	items: T[],
	side: 'l' | 'r',
	down: Point,
	now: Point
): T[] {
	const delta = snap(now.m - down.m);
	return items.map((i) =>
		side === 'l'
			? { ...i, start: clamp(i.start + delta, GRID_START, i.end - SNAP) }
			: { ...i, end: clamp(i.end + delta, i.start + SNAP, GRID_END) }
	);
}

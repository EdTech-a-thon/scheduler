import type { GridRect } from './gridDrag';

/** Which band an item sits in, out of how many its overlapping group shares. */
export interface Band {
	band: number;
	of: number;
}

const overlaps = (a: GridRect, b: GridRect) =>
	a.start < b.end && b.start < a.end && a.startDay <= b.endDay && b.startDay <= a.endDay;

/**
 * Overlapping items split their rows into top-to-bottom bands, earliest on top,
 * so each stays fully visible. Every item in a group of overlapping items
 * (directly or through others) gets the same band count, so their bands line up.
 */
export function bandLayout<T extends GridRect & { id: string }>(items: T[]): Map<string, Band> {
	const sorted = [...items].sort(
		(a, b) => a.start - b.start || b.end - b.start - (a.end - a.start) || a.startDay - b.startDay
	);
	const band = new Map<string, number>();
	const parent = new Map(items.map((i) => [i.id, i.id]));
	const root = (id: string): string => {
		while (parent.get(id) !== id) id = parent.get(id)!;
		return id;
	};

	sorted.forEach((item, n) => {
		const used = new Set<number>();
		for (const other of sorted.slice(0, n)) {
			if (!overlaps(item, other)) continue;
			used.add(band.get(other.id)!);
			parent.set(root(other.id), root(item.id));
		}
		let b = 0;
		while (used.has(b)) b++;
		band.set(item.id, b);
	});

	const groupSize = new Map<string, number>();
	for (const item of items) {
		const r = root(item.id);
		groupSize.set(r, Math.max(groupSize.get(r) ?? 0, band.get(item.id)! + 1));
	}
	return new Map(
		items.map((i) => [i.id, { band: band.get(i.id)!, of: groupSize.get(root(i.id))! }])
	);
}

import type { Minute } from './types';

/** Half-open [start, end). Interval lists are kept sorted and non-overlapping. */
export type Interval = [Minute, Minute];

export function normalize(list: Interval[]): Interval[] {
	const sorted = list.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
	const out: Interval[] = [];
	for (const [s, e] of sorted) {
		const last = out[out.length - 1];
		if (last && s <= last[1]) last[1] = Math.max(last[1], e);
		else out.push([s, e]);
	}
	return out;
}

export function union(...lists: Interval[][]): Interval[] {
	return normalize(lists.flat().map(([s, e]) => [s, e] as Interval));
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
	const na = normalize(a.map(([s, e]) => [s, e] as Interval));
	const nb = normalize(b.map(([s, e]) => [s, e] as Interval));
	const out: Interval[] = [];
	let i = 0;
	let j = 0;
	while (i < na.length && j < nb.length) {
		const s = Math.max(na[i][0], nb[j][0]);
		const e = Math.min(na[i][1], nb[j][1]);
		if (e > s) out.push([s, e]);
		if (na[i][1] < nb[j][1]) i++;
		else j++;
	}
	return out;
}

export function subtract(from: Interval[], remove: Interval[]): Interval[] {
	let result = normalize(from.map(([s, e]) => [s, e] as Interval));
	for (const [rs, re] of normalize(remove.map(([s, e]) => [s, e] as Interval))) {
		const next: Interval[] = [];
		for (const [s, e] of result) {
			if (re <= s || rs >= e) {
				next.push([s, e]);
				continue;
			}
			if (rs > s) next.push([s, rs]);
			if (re < e) next.push([re, e]);
		}
		result = next;
	}
	return result;
}

export function overlaps(a: Interval[], b: Interval[]): boolean {
	return intersect(a, b).length > 0;
}

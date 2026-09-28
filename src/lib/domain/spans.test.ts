import { describe, expect, it } from 'vitest';
import {
	deleteDay,
	detachDay,
	eraseFromSpan,
	mergeAdditions,
	mergeBounds,
	mergeCheck,
	splitAllDays
} from './spans';
import type { Span } from './types';

function ids() {
	let n = 0;
	return () => `new${++n}`;
}

const school: Span = { id: 'w', startDay: 0, endDay: 4, start: 540, end: 855 };

const shape = (spans: Span[]) =>
	spans.map(({ startDay, endDay, start, end }) => [startDay, endDay, start, end]);

describe('eraseFromSpan', () => {
	it('leaves a Span alone when the eraser misses it', () => {
		expect(eraseFromSpan(school, { startDay: 0, endDay: 4, start: 420, end: 540 }, ids())).toEqual([
			school
		]);
	});

	it('erasing the end of Wednesday splits Wednesday out', () => {
		const result = eraseFromSpan(school, { startDay: 2, endDay: 2, start: 750, end: 900 }, ids());
		expect(shape(result)).toEqual([
			[0, 1, 540, 855],
			[2, 2, 540, 750],
			[3, 4, 540, 855]
		]);
		expect(result[0].id).toBe('w');
		expect(new Set(result.map((s) => s.id)).size).toBe(3);
	});

	it('days erased together stay linked', () => {
		const result = eraseFromSpan(school, { startDay: 2, endDay: 3, start: 780, end: 900 }, ids());
		expect(shape(result)).toEqual([
			[0, 1, 540, 855],
			[2, 3, 540, 780],
			[4, 4, 540, 855]
		]);
	});

	it('erasing the middle of a day leaves two Windows on it', () => {
		const result = eraseFromSpan(school, { startDay: 2, endDay: 2, start: 660, end: 690 }, ids());
		expect(shape(result)).toEqual([
			[0, 1, 540, 855],
			[2, 2, 540, 660],
			[2, 2, 690, 855],
			[3, 4, 540, 855]
		]);
	});

	it('erasing all of it removes it', () => {
		expect(eraseFromSpan(school, { startDay: 0, endDay: 4, start: 420, end: 1020 }, ids())).toEqual(
			[]
		);
	});

	it('copies extra fields onto every piece', () => {
		const session = { ...school, title: 'Artic', studentIds: ['a'] };
		const result = eraseFromSpan(session, { startDay: 1, endDay: 1, start: 0, end: 2000 }, ids());
		expect(result.map((s) => s.title)).toEqual(['Artic', 'Artic']);
		expect(result[1].studentIds).not.toBe(result[0].studentIds);
	});
});

describe('reactive input', () => {
	it('splits Spans wrapped in a proxy, as Svelte state is', () => {
		const session = new Proxy({ ...school, studentIds: new Proxy(['a'], {}) }, {});
		expect(splitAllDays(session, ids())).toHaveLength(5);
	});
});

describe('day operations', () => {
	it('detachDay keeps the days on either side linked', () => {
		expect(shape(detachDay(school, 2, ids()))).toEqual([
			[0, 1, 540, 855],
			[2, 2, 540, 855],
			[3, 4, 540, 855]
		]);
	});

	it('splitAllDays gives one Span per day', () => {
		expect(splitAllDays(school, ids())).toHaveLength(5);
	});

	it('deleteDay removes one day', () => {
		expect(shape(deleteDay(school, 0, ids()))).toEqual([[1, 4, 540, 855]]);
	});
});

describe('merging', () => {
	const at = (startDay: number, endDay: number, start: number, end: number) =>
		({ startDay, endDay, start, end }) as Parameters<typeof mergeBounds>[0][number];

	it('fills out to the smallest rectangle around everything', () => {
		const mon = at(0, 0, 540, 720); // 9–12
		const tue = at(1, 1, 540, 780); // 9–1
		expect(mergeCheck([mon, tue]).rect).toEqual(at(0, 1, 540, 780));
		// Order doesn't matter.
		expect(mergeCheck([tue, mon]).rect).toEqual(at(0, 1, 540, 780));
	});

	it('reports exactly what gets added', () => {
		expect(mergeAdditions([at(0, 0, 540, 720), at(1, 1, 540, 780)])).toEqual([at(0, 0, 720, 780)]);
		// A missing day in between is added whole.
		expect(mergeAdditions([at(0, 0, 540, 600), at(2, 2, 540, 600)])).toEqual([at(1, 1, 540, 600)]);
		// A gap in time on the same day.
		expect(mergeAdditions([at(0, 0, 540, 600), at(0, 0, 630, 660)])).toEqual([at(0, 0, 600, 630)]);
	});

	it('joins matching gaps on neighbouring days', () => {
		expect(mergeAdditions([at(0, 1, 780, 875), at(2, 2, 575, 785)])).toEqual([
			at(0, 1, 575, 780),
			at(2, 2, 785, 875)
		]);
	});

	it('adds nothing when the blocks already make a rectangle', () => {
		expect(mergeAdditions([at(0, 1, 540, 600), at(2, 2, 540, 600)])).toEqual([]);
		expect(mergeAdditions([at(0, 4, 540, 600), at(0, 4, 600, 660)])).toEqual([]);
	});

	it('needs at least two blocks', () => {
		expect(mergeCheck([at(0, 0, 540, 600)]).reason).toBeTruthy();
	});
});

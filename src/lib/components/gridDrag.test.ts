import { describe, expect, it } from 'vitest';
import { applyDrag, moveGroup, resizeGroup, type GridRect } from './gridDrag';

const w: GridRect = { startDay: 1, endDay: 2, start: 600, end: 660 };

describe('applyDrag', () => {
	it('moves the body in time and across days, keeping its size', () => {
		expect(applyDrag(w, 'body', { d: 1, m: 610 }, { d: 2, m: 642 })).toEqual({
			startDay: 2,
			endDay: 3,
			start: 630,
			end: 690
		});
	});

	it('keeps the body inside the week', () => {
		expect(applyDrag(w, 'body', { d: 1, m: 600 }, { d: 4, m: 600 })).toMatchObject({
			startDay: 3,
			endDay: 4
		});
	});

	it('resizes time from the side edges', () => {
		expect(applyDrag(w, 'r', { d: 1, m: 660 }, { d: 1, m: 723 })).toMatchObject({ end: 725 });
		expect(applyDrag(w, 'l', { d: 1, m: 600 }, { d: 1, m: 900 })).toMatchObject({ start: 655 });
	});

	it('resizes days from the top and bottom edges', () => {
		expect(applyDrag(w, 'b', { d: 2, m: 0 }, { d: 4, m: 0 })).toMatchObject({
			startDay: 1,
			endDay: 4
		});
		expect(applyDrag(w, 't', { d: 1, m: 0 }, { d: 0, m: 0 })).toMatchObject({
			startDay: 0,
			endDay: 2
		});
		expect(applyDrag(w, 't', { d: 1, m: 0 }, { d: 4, m: 0 })).toMatchObject({
			startDay: 2,
			endDay: 2
		});
	});

	it('corners resize time and days at once', () => {
		expect(applyDrag(w, 'tl', { d: 1, m: 600 }, { d: 0, m: 540 })).toEqual({
			startDay: 0,
			endDay: 2,
			start: 540,
			end: 660
		});
		expect(applyDrag(w, 'br', { d: 2, m: 660 }, { d: 3, m: 700 })).toEqual({
			startDay: 1,
			endDay: 3,
			start: 600,
			end: 700
		});
	});
});

describe('moveGroup', () => {
	it('moves every item by the same amount', () => {
		const a: GridRect = { startDay: 0, endDay: 0, start: 600, end: 630 };
		const b: GridRect = { startDay: 2, endDay: 3, start: 700, end: 760 };
		expect(moveGroup([a, b], { d: 0, m: 600 }, { d: 1, m: 630 })).toEqual([
			{ startDay: 1, endDay: 1, start: 630, end: 660 },
			{ startDay: 3, endDay: 4, start: 730, end: 790 }
		]);
	});

	it('stops when any item would leave the week', () => {
		const a: GridRect = { startDay: 0, endDay: 0, start: 600, end: 630 };
		const b: GridRect = { startDay: 3, endDay: 4, start: 700, end: 760 };
		expect(moveGroup([a, b], { d: 0, m: 0 }, { d: 2, m: 0 }).map((i) => i.startDay)).toEqual([
			0, 3
		]);
	});
});

describe('resizeGroup', () => {
	const a: GridRect = { startDay: 0, endDay: 0, start: 540, end: 600 };
	const b: GridRect = { startDay: 2, endDay: 3, start: 570, end: 660 };

	it('moves the same side of every item by the same amount', () => {
		expect(resizeGroup([a, b], 'r', { d: 0, m: 600 }, { d: 0, m: 614 }).map((i) => i.end)).toEqual([
			615, 675
		]);
		expect(
			resizeGroup([a, b], 'l', { d: 0, m: 540 }, { d: 0, m: 525 }).map((i) => i.start)
		).toEqual([525, 555]);
	});

	it('stops each item at the grid edge and at one step long', () => {
		const edge: GridRect = { startDay: 0, endDay: 0, start: 1000, end: 1015 };
		expect(resizeGroup([a, edge], 'r', { d: 0, m: 0 }, { d: 0, m: 30 }).map((i) => i.end)).toEqual([
			630, 1020
		]);
		expect(resizeGroup([a], 'r', { d: 0, m: 0 }, { d: 0, m: -200 })[0].end).toBe(545);
	});
});

import { describe, expect, it } from 'vitest';
import { bandLayout } from './bands';
import type { Day } from '$lib/domain/types';

const item = (id: string, start: number, end: number, startDay: Day = 0, endDay = startDay) => ({
	id,
	start,
	end,
	startDay,
	endDay
});

describe('bandLayout', () => {
	it('gives a lone item the whole row', () => {
		expect(bandLayout([item('a', 540, 570)]).get('a')).toEqual({ band: 0, of: 1 });
	});

	it('halves the row for two overlapping items, earliest on top', () => {
		const out = bandLayout([item('late', 550, 600), item('early', 540, 570)]);
		expect(out.get('early')).toEqual({ band: 0, of: 2 });
		expect(out.get('late')).toEqual({ band: 1, of: 2 });
	});

	it('shares the band count across a chain of overlaps', () => {
		// a overlaps b, b overlaps c, a and c don't: two bands, c reuses a's.
		const out = bandLayout([item('a', 540, 570), item('b', 560, 620), item('c', 600, 630)]);
		expect(out.get('a')).toEqual({ band: 0, of: 2 });
		expect(out.get('b')).toEqual({ band: 1, of: 2 });
		expect(out.get('c')).toEqual({ band: 0, of: 2 });
	});

	it('keeps separate groups and separate days independent', () => {
		const out = bandLayout([
			item('a', 540, 570),
			item('b', 545, 575),
			item('c', 540, 570, 1),
			item('d', 700, 730)
		]);
		expect(out.get('c')).toEqual({ band: 0, of: 1 });
		expect(out.get('d')).toEqual({ band: 0, of: 1 });
	});

	it('counts an item on Linked Days against each day it covers', () => {
		const out = bandLayout([item('week', 540, 570, 0, 4), item('wed', 550, 580, 2)]);
		expect(out.get('week')).toEqual({ band: 0, of: 2 });
		expect(out.get('wed')).toEqual({ band: 1, of: 2 });
	});
});

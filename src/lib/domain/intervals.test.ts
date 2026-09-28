import { describe, expect, it } from 'vitest';
import { intersect, normalize, subtract, union } from './intervals';

describe('intervals', () => {
	it('normalizes overlapping and touching intervals', () => {
		expect(
			normalize([
				[60, 90],
				[10, 20],
				[20, 30],
				[85, 100]
			])
		).toEqual([
			[10, 30],
			[60, 100]
		]);
	});

	it('drops empty intervals', () => {
		expect(normalize([[10, 10]])).toEqual([]);
	});

	it('unions several lists', () => {
		expect(union([[0, 10]], [[5, 20]], [[30, 40]])).toEqual([
			[0, 20],
			[30, 40]
		]);
	});

	it('intersects', () => {
		expect(
			intersect(
				[
					[0, 10],
					[20, 30]
				],
				[[5, 25]]
			)
		).toEqual([
			[5, 10],
			[20, 25]
		]);
	});

	it('subtracts a hole from the middle', () => {
		expect(subtract([[540, 855]], [[600, 645]])).toEqual([
			[540, 600],
			[645, 855]
		]);
	});

	it('subtracts everything', () => {
		expect(subtract([[10, 20]], [[0, 30]])).toEqual([]);
	});
});

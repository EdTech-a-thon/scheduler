import { describe, expect, it } from 'vitest';
import { carryMinuteWrap } from './time';

const t = (h: number, m: number) => h * 60 + m;

describe('carryMinuteWrap', () => {
	it('carries :55 up into the next hour', () => {
		expect(carryMinuteWrap(t(13, 55), t(13, 0))).toBe(t(14, 0));
	});

	it('carries :00 down into the previous hour', () => {
		expect(carryMinuteWrap(t(14, 0), t(14, 55))).toBe(t(13, 55));
	});

	it('leaves ordinary changes alone', () => {
		expect(carryMinuteWrap(t(13, 50), t(13, 55))).toBe(t(13, 55));
		expect(carryMinuteWrap(t(13, 30), t(14, 30))).toBe(t(14, 30));
		expect(carryMinuteWrap(t(13, 30), t(9, 15))).toBe(t(9, 15));
	});
});

import type { Day, Minute } from './types';

export const GRID_START: Minute = 7 * 60;
export const GRID_END: Minute = 17 * 60;
export const SNAP: Minute = 5;

export const DAYS: Day[] = [0, 1, 2, 3, 4];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export function snap(m: Minute, mode: 'round' | 'floor' | 'ceil' = 'round'): Minute {
	return Math[mode](m / SNAP) * SNAP;
}

export function clampMinute(m: Minute): Minute {
	return Math.min(GRID_END, Math.max(GRID_START, m));
}

export function clampDay(d: number): Day {
	return Math.min(4, Math.max(0, Math.round(d))) as Day;
}

/** "9:05" / "2:15" — 12-hour clock without a suffix, as schools usually write it. */
export function formatTime(m: Minute): string {
	const h = Math.floor(m / 60);
	const min = m % 60;
	const h12 = ((h + 11) % 12) + 1;
	return `${h12}:${String(min).padStart(2, '0')}`;
}

export function formatRange(start: Minute, end: Minute): string {
	return `${formatTime(start)}–${formatTime(end)}`;
}

export function formatDays(startDay: Day, endDay: Day): string {
	return startDay === endDay ? DAY_SHORT[startDay] : `${DAY_SHORT[startDay]}–${DAY_SHORT[endDay]}`;
}

/** "HH:MM" for <input type="time">. */
export function toTimeInput(m: Minute): string {
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function fromTimeInput(value: string): Minute | null {
	const match = /^(\d{1,2}):(\d{2})/.exec(value);
	if (!match) return null;
	return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Time inputs wrap the minutes (:55 → :00) without touching the hour. When a
 * change looks like that wrap, carry into the next or previous hour instead.
 */
export function carryMinuteWrap(prev: Minute, next: Minute, step: Minute = SNAP): Minute {
	if (next - prev === -(60 - step)) return prev + step;
	if (next - prev === 60 - step) return prev - step;
	return next;
}

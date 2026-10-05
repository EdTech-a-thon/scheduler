import { describe, expect, it } from 'vitest';
import { buildIcs, firstMonday } from './ics';
import type { Session } from './types';

const session = (over: Partial<Session> = {}): Session => ({
	id: 'x1',
	startDay: 1,
	endDay: 1,
	start: 9 * 60 + 5,
	end: 9 * 60 + 35,
	studentIds: ['a', 'b'],
	providerIds: [],
	title: '',
	notes: '',
	...over
});
const names = new Map([
	['a', 'Ava'],
	['b', 'Ben']
]);
const monday = new Date(2026, 8, 28);
const stamp = new Date(Date.UTC(2026, 8, 28, 12, 0, 0));

describe('firstMonday', () => {
	it('uses this week’s Monday on a weekday, and next week’s at the weekend', () => {
		expect(firstMonday(new Date(2026, 9, 1)).getDate()).toBe(28); // Thu Oct 1 → Mon Sep 28
		expect(firstMonday(new Date(2026, 9, 3)).getDate()).toBe(5); // Sat Oct 3 → Mon Oct 5
	});
});

describe('buildIcs', () => {
	it('makes each Session a weekly event on its days, in local time', () => {
		const ics = buildIcs([session()], names, monday, { now: stamp });
		expect(ics).toContain('BEGIN:VCALENDAR\r\n');
		expect(ics).toContain('DTSTART:20260929T090500\r\n'); // Tuesday
		expect(ics).toContain('DTEND:20260929T093500\r\n');
		expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU\r\n');
		expect(ics).toContain('SUMMARY:Ava\\, Ben\r\n');
		expect(ics).toContain('UID:x1@scheduler.teacher.dev\r\n');
		expect(ics).toContain('DTSTAMP:20260928T120000Z\r\n');
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
	});

	it('repeats a Session on each of its Linked Days', () => {
		const ics = buildIcs([session({ startDay: 0, endDay: 2 })], names, monday, { now: stamp });
		expect(ics).toContain('DTSTART:20260928T090500\r\n');
		expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE\r\n');
	});

	it('uses the title, and puts Students and notes in the description, escaped', () => {
		const ics = buildIcs(
			[session({ title: 'Artic; group', notes: 'Bring cards\nand stickers' })],
			names,
			monday,
			{ now: stamp }
		);
		expect(ics).toContain('SUMMARY:Artic\; group\r\n');
		expect(ics).toContain('DESCRIPTION:Students:\\nAva\\nBen\\n\\nBring cards\\nand stickers\r\n');
	});

	it('names the calendar and lists the Session’s Providers', () => {
		const ics = buildIcs([session({ providerIds: ['p', 'q'] })], names, monday, {
			now: stamp,
			calendarName: 'Jones’s Sessions',
			providerNameOf: new Map([
				['p', 'Jones'],
				['q', 'Elliot']
			])
		});
		expect(ics).toContain('X-WR-CALNAME:Jones’s Sessions\r\n');
		expect(ics).toContain('DESCRIPTION:Providers: Jones\\, Elliot\\n\\nStudents:\\nAva\\nBen\r\n');
	});

	it('lists each Student on their own line with the details shown in Sessions', () => {
		const ics = buildIcs([session()], names, monday, {
			now: stamp,
			detailsOf: new Map([['a', ['4th', 'EL']]])
		});
		expect(ics.replace(/\r\n /g, '')).toContain('DESCRIPTION:Students:\\nAva · 4th · EL\\nBen\r\n');
	});

	it('folds long lines at 75 bytes', () => {
		const ics = buildIcs([session({ notes: 'x'.repeat(200) })], names, monday, { now: stamp });
		for (const line of ics.split('\r\n'))
			expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
		expect(ics).toContain('\r\n x');
	});
});

/**
 * The made-up school day the welcome art draws, one Monday from 8:00 to 3:00:
 * School Hours for Everyone, then recess, lunch and specials for 4th and 5th
 * grade. Together they leave three gaps, and a Session is booked in one.
 */
export type Span = [number, number];

export const DAY: Span = [8 * 60, 15 * 60];

export interface SampleSchedule {
	name: string;
	audience: string;
	mode: 'allow' | 'deny';
	color: string;
	windows: Span[];
}

const h = (hour: number, minute = 0) => hour * 60 + minute;

export const SCHOOL: SampleSchedule = {
	name: 'School Hours',
	audience: 'Everyone',
	mode: 'allow',
	color: '#5b6b82',
	windows: [[h(8, 30), h(14, 30)]]
};

export const FOURTH: SampleSchedule = {
	name: '4th Grade Day',
	audience: 'Grade is 4th',
	mode: 'deny',
	color: '#e2a336',
	windows: [
		[h(10), h(10, 30)],
		[h(11, 30), h(12, 15)],
		[h(13, 15), h(14)]
	]
};

export const FIFTH: SampleSchedule = {
	name: '5th Grade Day',
	audience: 'Grade is 5th',
	mode: 'deny',
	color: '#6e56cf',
	windows: [
		[h(10, 30), h(11)],
		[h(12), h(12, 30)],
		[h(14), h(14, 30)]
	]
};

export const SESSION = { start: h(12, 30), end: h(13, 15), label: 'Speech group · 12:30' };

/** The time a Schedule rules out: outside an Allow Schedule, inside a Deny one. */
export function blocked(s: SampleSchedule): Span[] {
	if (s.mode === 'deny') return s.windows;
	const out: Span[] = [];
	let at = DAY[0];
	for (const [a, b] of s.windows) {
		if (a > at) out.push([at, a]);
		at = b;
	}
	if (at < DAY[1]) out.push([at, DAY[1]]);
	return out;
}

export const STUDENTS = [
	{ name: 'Ava Brooks', grade: '4th', teacher: 'Ms. Rivera' },
	{ name: 'Iris Chen', grade: '4th', teacher: 'Ms. Rivera' },
	{ name: 'Jonah Patel', grade: '4th', teacher: 'Mr. Chen' },
	{ name: 'Lena Park', grade: '5th', teacher: 'Mr. Brooks' },
	{ name: 'Milo Ortiz', grade: '5th', teacher: 'Mr. Brooks' }
];

export const formatHour = (m: number) => {
	const hr = Math.floor(m / 60);
	return `${hr > 12 ? hr - 12 : hr}:${String(m % 60).padStart(2, '0')}`;
};

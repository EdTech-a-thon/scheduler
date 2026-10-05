import type { Day, Session } from './types';

/**
 * Sessions as an iCalendar file for Google Calendar, Outlook and the like.
 * The Template Week has no dates, so each Session becomes an event repeating
 * weekly on its Linked Days, starting the week given. Times are "floating":
 * the calendar reads them in whatever time zone it's set to.
 */

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR'] as const;

/** This week's Monday on a weekday; at the weekend, the coming one. */
export function firstMonday(today: Date): Date {
	const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const dow = d.getDay(); // 0 = Sunday
	const shift = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
	d.setDate(d.getDate() + shift);
	return d;
}

const pad = (n: number) => String(n).padStart(2, '0');

function localStamp(monday: Date, day: Day, minute: number): string {
	const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day);
	return (
		`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
		`T${pad(Math.floor(minute / 60))}${pad(minute % 60)}00`
	);
}

function utcStamp(d: Date): string {
	return d
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

const escape = (text: string) =>
	text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes continue on the next line after a space. */
function fold(line: string): string {
	const bytes = new TextEncoder();
	const out: string[] = [];
	let current = '';
	for (const ch of line) {
		const limit = out.length ? 74 : 75;
		if (bytes.encode(current + ch).length > limit) {
			out.push(current);
			current = ch;
		} else current += ch;
	}
	out.push(current);
	return out.join('\r\n ');
}

export function buildIcs(
	sessions: Session[],
	nameOf: Map<string, string>,
	monday: Date,
	{
		now = new Date(),
		providerNameOf = new Map<string, string>(),
		detailsOf = new Map<string, string[]>(),
		calendarName = 'Sessions'
	}: {
		now?: Date;
		providerNameOf?: Map<string, string>;
		/** Each Student's values for the Properties shown in Sessions, by Student id. */
		detailsOf?: Map<string, string[]>;
		calendarName?: string;
	} = {}
): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//teacher.dev//Service Scheduler//EN',
		'CALSCALE:GREGORIAN',
		`X-WR-CALNAME:${escape(calendarName)}`
	];
	for (const s of sessions) {
		const present = s.studentIds.filter((id) => nameOf.has(id));
		const names = present.map((id) => nameOf.get(id)!);
		const studentLines = present.map((id) =>
			[nameOf.get(id)!, ...(detailsOf.get(id) ?? [])].join(' · ')
		);
		const providers = s.providerIds.map((id) => providerNameOf.get(id)).filter(Boolean);
		const days = BYDAY.slice(s.startDay, s.endDay + 1).join(',');
		const description = [
			providers.length ? `Providers: ${providers.join(', ')}` : '',
			studentLines.length ? `Students:\n${studentLines.join('\n')}` : '',
			s.notes.trim()
		]
			.filter(Boolean)
			.join('\n\n');
		lines.push(
			'BEGIN:VEVENT',
			`UID:${s.id}@scheduler.teacher.dev`,
			`DTSTAMP:${utcStamp(now)}`,
			`DTSTART:${localStamp(monday, s.startDay, s.start)}`,
			`DTEND:${localStamp(monday, s.startDay, s.end)}`,
			`RRULE:FREQ=WEEKLY;BYDAY=${days}`,
			`SUMMARY:${escape(s.title || names.join(', ') || 'Session')}`,
			...(description ? [`DESCRIPTION:${escape(description)}`] : []),
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}

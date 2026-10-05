import { matchesAudience } from './audience';
import { intersect, overlaps, subtract, union, type Interval } from './intervals';
import { coversDay } from './spans';
import { GRID_END, GRID_START } from './time';
import type { AppData, Day, Schedule, Session, Span, Student } from './types';

const WHOLE_DAY: Interval[] = [[GRID_START, GRID_END]];

export function spansOnDay(spans: Span[], day: Day): Interval[] {
	return union(spans.filter((s) => coversDay(s, day)).map((s) => [s.start, s.end] as Interval));
}

/** The time a Schedule takes away from its Students on a day. */
export function takenBySchedule(schedule: Schedule, day: Day): Interval[] {
	const marked = spansOnDay(schedule.windows, day);
	return schedule.mode === 'deny' ? marked : subtract(WHOLE_DAY, marked);
}

export function schedulesFor(student: Student, schedules: Schedule[]): Schedule[] {
	return schedules.filter((s) => matchesAudience(student, s.audience));
}

export function sessionsFor(studentId: string, sessions: Session[]): Session[] {
	return sessions.filter((s) => s.studentIds.includes(studentId));
}

/**
 * Time inside every Allow Schedule and outside every Deny Schedule and
 * Session. A Student with no Allow Schedules is free all day.
 */
export function freeTime(
	student: Student,
	data: Pick<AppData, 'schedules' | 'sessions'>,
	day: Day,
	options: { excludeSessionId?: string } = {}
): Interval[] {
	const applicable = schedulesFor(student, data.schedules);
	let free = WHOLE_DAY;
	for (const s of applicable.filter((s) => s.mode === 'allow')) {
		free = intersect(free, spansOnDay(s.windows, day));
	}
	const blocked = union(
		...applicable.filter((s) => s.mode === 'deny').map((s) => spansOnDay(s.windows, day)),
		spansOnDay(
			sessionsFor(student.id, data.sessions).filter((s) => s.id !== options.excludeSessionId),
			day
		)
	);
	return subtract(free, blocked);
}

export function commonFreeTime(
	students: Student[],
	data: Pick<AppData, 'schedules' | 'sessions'>,
	day: Day
): Interval[] {
	return students.reduce((acc, s) => intersect(acc, freeTime(s, data, day)), WHOLE_DAY);
}

export interface Layer {
	start: number;
	end: number;
	/** Schedules taking this time away from at least one selected Student, in Schedule order. */
	scheduleIds: string[];
}

/** Split a day into segments by which Schedules cover each part, for the Planner. */
export function plannerLayers(students: Student[], schedules: Schedule[], day: Day): Layer[] {
	const relevant = schedules.filter((s) => students.some((st) => matchesAudience(st, s.audience)));
	const taken = relevant.map((s) => ({ id: s.id, intervals: takenBySchedule(s, day) }));
	const edges = new Set<number>();
	for (const t of taken) for (const [s, e] of t.intervals) edges.add(s).add(e);
	const sorted = [...edges].sort((a, b) => a - b);

	const layers: Layer[] = [];
	for (let i = 0; i < sorted.length - 1; i++) {
		const [start, end] = [sorted[i], sorted[i + 1]];
		const scheduleIds = taken
			.filter((t) => t.intervals.some(([s, e]) => s <= start && end <= e))
			.map((t) => t.id);
		if (scheduleIds.length === 0) continue;
		const last = layers[layers.length - 1];
		if (last && last.end === start && sameIds(last.scheduleIds, scheduleIds)) last.end = end;
		else layers.push({ start, end, scheduleIds });
	}
	return layers;
}

function sameIds(a: string[], b: string[]) {
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

export interface Blocker {
	label: string;
	kind: 'schedule' | 'session';
	id: string;
}

/** What keeps a Student from being free at some point inside a range on a day. */
export function blockersFor(
	student: Student,
	data: Pick<AppData, 'schedules' | 'sessions'>,
	day: Day,
	range: Interval,
	options: { excludeSessionId?: string } = {}
): Blocker[] {
	const out: Blocker[] = [];
	for (const s of schedulesFor(student, data.schedules)) {
		if (overlaps(takenBySchedule(s, day), [range]))
			out.push({ label: s.name || 'Untitled schedule', kind: 'schedule', id: s.id });
	}
	for (const s of sessionsFor(student.id, data.sessions)) {
		if (s.id === options.excludeSessionId) continue;
		if (overlaps(spansOnDay([s], day), [range]))
			out.push({ label: s.title || 'Another Session', kind: 'session', id: s.id });
	}
	return out;
}

export interface Conflict {
	studentId: string;
	day: Day;
	blockers: Blocker[];
}

/** A Session conflicts wherever it covers time that isn't one of its Students' Free Time. */
export function sessionConflicts(session: Session, data: AppData): Conflict[] {
	const out: Conflict[] = [];
	for (const id of session.studentIds) {
		const student = data.students.find((s) => s.id === id);
		if (!student) continue;
		for (let d = session.startDay; d <= session.endDay; d++) {
			const day = d as Day;
			const blockers = blockersFor(student, data, day, [session.start, session.end], {
				excludeSessionId: session.id
			});
			if (blockers.length > 0) out.push({ studentId: id, day, blockers });
		}
	}
	return out;
}

export interface ProviderConflict {
	providerId: string;
	day: Day;
	/** The Provider's other Session at the same time. */
	other: Session;
}

/** A Session conflicts wherever one of its Providers has another Session at the same time. */
export function providerConflicts(session: Session, sessions: Session[]): ProviderConflict[] {
	const out: ProviderConflict[] = [];
	for (const providerId of session.providerIds) {
		for (const other of sessions) {
			if (other.id === session.id || !other.providerIds.includes(providerId)) continue;
			if (other.start >= session.end || session.start >= other.end) continue;
			for (let d = session.startDay; d <= session.endDay; d++) {
				const day = d as Day;
				if (coversDay(other, day)) out.push({ providerId, day, other });
			}
		}
	}
	return out;
}

/** Whether a Session has any Conflict, for its Students or its Providers. */
export function hasConflict(session: Session, data: AppData): boolean {
	return (
		providerConflicts(session, data.sessions).length > 0 ||
		sessionConflicts(session, data).length > 0
	);
}

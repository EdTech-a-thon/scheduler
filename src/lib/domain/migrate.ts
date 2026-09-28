import { defaultIcon, ensureOptions } from './options';
import { RETIRED_COLORS } from './palette';
import type { AppData, Property, Schedule, Session, Window } from './types';

/** Select Properties were called Text before; older saves and files still say so. */
export function migrateProperties(properties: Property[]): Property[] {
	return properties.map((p) => {
		const type = (p.type as string) === 'text' ? 'select' : p.type;
		return { ...p, type, options: p.options ?? [], icon: p.icon ?? defaultIcon(p.name, type) };
	});
}

/** Allow and Deny were called Availability and Blocking before; Everyone Audiences had no Conditions. */
export function migrateSchedules(schedules: Schedule[]): Schedule[] {
	const renamed: Record<string, Schedule['mode']> = { availability: 'allow', blocking: 'deny' };
	return schedules.map((s) => ({
		...s,
		mode: renamed[s.mode] ?? s.mode,
		color: RETIRED_COLORS[s.color] ?? s.color,
		// Everyone Audiences used to carry no Conditions.
		audience: { ...s.audience, conditions: s.audience.conditions ?? [] }
	}));
}

/**
 * An earlier bug let an Option/Alt-drag copy keep its source's id (and display
 * fields like color). Give repeated ids fresh ones and keep only real fields.
 */
export function repairSpans(data: AppData, newId: () => string = () => crypto.randomUUID()) {
	const seen = new Set<string>();
	const unique = (id: string) => {
		const next = seen.has(id) ? newId() : id;
		seen.add(next);
		return next;
	};
	for (const s of data.schedules) {
		s.windows = s.windows.map((w): Window => ({
			id: unique(w.id),
			startDay: w.startDay,
			endDay: w.endDay,
			start: w.start,
			end: w.end
		}));
	}
	data.sessions = data.sessions.map((s): Session => ({
		id: unique(s.id),
		startDay: s.startDay,
		endDay: s.endDay,
		start: s.start,
		end: s.end,
		title: s.title,
		notes: s.notes,
		studentIds: s.studentIds
	}));
}

/** Bring saved data from any earlier version up to the current shape. */
export function migrateData(data: AppData): AppData {
	const next = {
		...data,
		properties: migrateProperties(data.properties),
		schedules: migrateSchedules(data.schedules)
	};
	ensureOptions(next);
	repairSpans(next);
	return next;
}

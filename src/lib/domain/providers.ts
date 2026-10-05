import { normalizeText } from './audience';
import { nextColor } from './palette';
import type { AppData, Provider, Session } from './types';

/** The icons a Provider can use, by stored name (a subset of the Property icons). */
export const PROVIDER_ICONS = [
	'user',
	'mic',
	'message-circle',
	'ear',
	'hand',
	'brain',
	'puzzle',
	'book-open',
	'heart',
	'star',
	'sparkles',
	'music',
	'apple',
	'dumbbell',
	'accessibility',
	'flag'
] as const;

/** Shown for Sessions that no Provider serves. */
export const NO_PROVIDER_COLOR = '#8b919c';

/** A Provider with the next unused color and icon. */
export function newProvider(id: string, name: string, existing: Provider[]): Provider {
	const usedIcons = existing.map((p) => p.icon);
	return {
		id,
		name: name.trim(),
		color: nextColor(existing.map((p) => p.color)),
		icon:
			PROVIDER_ICONS.find((i) => !usedIcons.includes(i)) ??
			PROVIDER_ICONS[existing.length % PROVIDER_ICONS.length]
	};
}

export function findProviderByName(providers: Provider[], name: string): Provider | undefined {
	const key = normalizeText(name);
	return providers.find((p) => normalizeText(p.name) === key);
}

/** The name as shown, with "(you)" after Me. */
export function providerLabel(provider: Provider, meId: string | null): string {
	return provider.id === meId ? `${provider.name} (you)` : provider.name;
}

export function sessionsOf(providerId: string, sessions: Session[]): Session[] {
	return sessions.filter((s) => s.providerIds.includes(providerId));
}

/** Distinct Students across a Provider's Sessions. */
export function studentsServedBy(providerId: string, sessions: Session[]): Set<string> {
	return new Set(sessionsOf(providerId, sessions).flatMap((s) => s.studentIds));
}

/** Who the Planner is planning for: a Provider's id, or null for Everyone. */
export type PlanningFor = string | null;

/**
 * The Sessions the Planner shows. Planning for a Provider shows all of their
 * Sessions, plus any other Session with a selected Student, muted. Planning
 * for Everyone shows every Session, or those with a selected Student.
 */
export function plannerSessions(
	sessions: Session[],
	planningFor: PlanningFor,
	selected: string[]
): { session: Session; muted: boolean }[] {
	const withSelected = (s: Session) => s.studentIds.some((id) => selected.includes(id));
	if (planningFor === null) {
		return sessions
			.filter((s) => selected.length === 0 || withSelected(s))
			.map((session) => ({ session, muted: false }));
	}
	return sessions.flatMap((session): { session: Session; muted: boolean }[] => {
		if (session.providerIds.includes(planningFor)) return [{ session, muted: false }];
		if (withSelected(session)) return [{ session, muted: true }];
		return [];
	});
}

/** Resolves a remembered choice: a Provider that's gone falls back to Me. */
export function resolvePlanningFor(
	choice: string,
	data: Pick<AppData, 'providers' | 'meId'>
): PlanningFor {
	if (choice === 'everyone') return null;
	if (data.providers.some((p) => p.id === choice)) return choice;
	return data.meId && data.providers.some((p) => p.id === data.meId) ? data.meId : null;
}

import { normalizeText } from './audience';
import { NAME_PROPERTY_ID, type AppData, type Condition, type Property } from './types';

export function hasOption(options: string[], value: string): boolean {
	const key = normalizeText(value);
	return options.some((o) => normalizeText(o) === key);
}

/** The option as already spelled in the list, if it matches ignoring case. */
export function findOption(options: string[], value: string): string | undefined {
	const key = normalizeText(value);
	return options.find((o) => normalizeText(o) === key);
}

export function withOption(options: string[], value: string): string[] {
	const v = value.trim();
	return !v || hasOption(options, v) ? options : [...options, v];
}

/**
 * What a Condition's value picker offers: every Option (or Name), plus any value
 * the Condition already holds, so a stale value can always be unchecked.
 */
export function conditionChoices(
	condition: Extract<Condition, { op: 'anyOf' }>,
	data: Pick<AppData, 'properties' | 'students'>
): string[] {
	const base =
		condition.propertyId === NAME_PROPERTY_ID
			? data.students.map((s) => s.name)
			: (data.properties.find((p) => p.id === condition.propertyId)?.options ?? []);
	return condition.values.reduce(withOption, base);
}

/**
 * Make every Select Property's Options include the values its Students and
 * Conditions use. Used after loading or importing data from older formats.
 */
export function ensureOptions(data: AppData): void {
	for (const p of data.properties) {
		p.options ??= [];
		if (p.type !== 'select') continue;
		for (const s of data.students) {
			const v = s.values[p.id];
			if (typeof v === 'string') p.options = withOption(p.options, v);
		}
		for (const sch of data.schedules) {
			for (const c of sch.audience.conditions)
				if (c.propertyId === p.id && c.op === 'anyOf')
					p.options = c.values.reduce(withOption, p.options);
		}
	}
}

/** Delete an Option: Students lose that value and Conditions stop listing it. */
export function deleteOption(data: AppData, propertyId: string, option: string): void {
	const key = normalizeText(option);
	const p = data.properties.find((x) => x.id === propertyId);
	if (!p) return;
	p.options = p.options.filter((o) => normalizeText(o) !== key);
	for (const s of data.students) {
		const v = s.values[propertyId];
		if (typeof v === 'string' && normalizeText(v) === key) delete s.values[propertyId];
	}
	for (const sch of data.schedules) {
		for (const c of sch.audience.conditions)
			if (c.propertyId === propertyId && c.op === 'anyOf')
				c.values = c.values.filter((v) => normalizeText(v) !== key);
	}
}

/** A sensible icon for a Property from its name, falling back to one for its type. */
export function defaultIcon(name: string, type: Property['type']): string {
	const n = normalizeText(name);
	if (/grade|year|level/.test(n)) return 'graduation-cap';
	if (/teacher|homeroom|staff/.test(n)) return 'user';
	if (/^el$|ell|language|esl/.test(n)) return 'languages';
	return type === 'checkbox' ? 'square-check' : 'circle-chevron-down';
}

export function newProperty(
	id: string,
	name: string,
	type: Property['type'],
	icon = defaultIcon(name, type)
): Property {
	return { id, name, type, options: [], icon, showInSessions: false };
}

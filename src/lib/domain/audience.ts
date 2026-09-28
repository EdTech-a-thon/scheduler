import {
	NAME_PROPERTY_ID,
	type Audience,
	type Condition,
	type Property,
	type Student
} from './types';

/** Text values match ignoring case and surrounding whitespace. */
export function normalizeText(value: string): string {
	return value.trim().toLowerCase();
}

export function textValue(student: Student, propertyId: string): string | undefined {
	if (propertyId === NAME_PROPERTY_ID) return student.name;
	const v = student.values[propertyId];
	return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

export function matchesCondition(student: Student, condition: Condition): boolean {
	if (condition.op === 'anyOf') {
		const v = textValue(student, condition.propertyId);
		if (v === undefined) return false;
		const wanted = new Set(condition.values.map(normalizeText));
		return wanted.has(normalizeText(v));
	}
	const checked = student.values[condition.propertyId] === true;
	return condition.op === 'checked' ? checked : !checked;
}

/** An Audience with no Conditions matches no one; only Everyone matches everyone. */
export function matchesAudience(student: Student, audience: Audience): boolean {
	if (audience.kind === 'everyone') return true;
	if (audience.conditions.length === 0) return false;
	return audience.conditions.every((c) => matchesCondition(student, c));
}

export function audienceMembers(students: Student[], audience: Audience): Student[] {
	return students.filter((s) => matchesAudience(s, audience));
}

export function hasNoAudience(audience: Audience): boolean {
	return audience.kind === 'conditions' && audience.conditions.length === 0;
}

export function removePropertyFromAudience(audience: Audience, propertyId: string): Audience {
	return {
		...audience,
		conditions: audience.conditions.filter((c) => c.propertyId !== propertyId)
	};
}

export function audienceUsesProperty(audience: Audience, propertyId: string): boolean {
	return audience.conditions.some((c) => c.propertyId === propertyId);
}

export function describeCondition(condition: Condition, properties: Property[]): string {
	const name =
		condition.propertyId === NAME_PROPERTY_ID
			? 'Name'
			: (properties.find((p) => p.id === condition.propertyId)?.name ?? 'Unknown');
	if (condition.op !== 'anyOf') return `${name} is ${condition.op}`;
	if (condition.values.length === 0) return `${name} is …`;
	return `${name} is ${condition.values.join(' or ')}`;
}

export function describeAudience(audience: Audience, properties: Property[]): string {
	if (audience.kind === 'everyone') return 'Everyone';
	if (audience.conditions.length === 0) return 'No Audience';
	return audience.conditions.map((c) => describeCondition(c, properties)).join(' and ');
}

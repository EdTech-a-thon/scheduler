import { describe, expect, it } from 'vitest';
import { matchesAudience, removePropertyFromAudience } from './audience';
import { NAME_PROPERTY_ID, type Audience, type Student } from './types';

const grade = 'grade';
const el = 'el';

const timmy: Student = { id: 't', name: 'Timmy', values: { [grade]: '4th', [el]: true } };
const stacy: Student = { id: 's', name: 'Stacy', values: {} };
const john: Student = { id: 'j', name: 'John', values: { [grade]: ' 4TH ' } };

describe('matchesAudience', () => {
	it('Everyone matches every Student', () => {
		expect(matchesAudience(stacy, { kind: 'everyone', conditions: [] })).toBe(true);
	});

	it('an Audience with no Conditions matches no one', () => {
		expect(matchesAudience(timmy, { kind: 'conditions', conditions: [] })).toBe(false);
	});

	it('matches Text values ignoring case and whitespace', () => {
		const a: Audience = {
			kind: 'conditions',
			conditions: [{ propertyId: grade, op: 'anyOf', values: ['4th', '5th'] }]
		};
		expect(matchesAudience(timmy, a)).toBe(true);
		expect(matchesAudience(john, a)).toBe(true);
		expect(matchesAudience(stacy, a)).toBe(false);
	});

	it('requires every Condition to match', () => {
		const a: Audience = {
			kind: 'conditions',
			conditions: [
				{ propertyId: grade, op: 'anyOf', values: ['4th'] },
				{ propertyId: el, op: 'checked' }
			]
		};
		expect(matchesAudience(timmy, a)).toBe(true);
		expect(matchesAudience(john, a)).toBe(false);
	});

	it('treats an unset Checkbox as unchecked', () => {
		const a: Audience = { kind: 'conditions', conditions: [{ propertyId: el, op: 'unchecked' }] };
		expect(matchesAudience(stacy, a)).toBe(true);
		expect(matchesAudience(timmy, a)).toBe(false);
	});

	it('can match on Name', () => {
		const a: Audience = {
			kind: 'conditions',
			conditions: [{ propertyId: NAME_PROPERTY_ID, op: 'anyOf', values: ['timmy'] }]
		};
		expect(matchesAudience(timmy, a)).toBe(true);
		expect(matchesAudience(stacy, a)).toBe(false);
	});
});

describe('removePropertyFromAudience', () => {
	it('drops only Conditions on that Property, possibly leaving No Audience', () => {
		const a: Audience = {
			kind: 'conditions',
			conditions: [{ propertyId: grade, op: 'anyOf', values: ['4th'] }]
		};
		expect(removePropertyFromAudience(a, grade)).toEqual({ kind: 'conditions', conditions: [] });
	});
});

describe('switching to Everyone', () => {
	it('keeps the Conditions for later without applying them', () => {
		const a: Audience = {
			kind: 'everyone',
			conditions: [{ propertyId: NAME_PROPERTY_ID, op: 'anyOf', values: ['Timmy'] }]
		};
		expect(matchesAudience(stacy, a)).toBe(true);
		expect(matchesAudience(stacy, { ...a, kind: 'conditions' })).toBe(false);
	});
});

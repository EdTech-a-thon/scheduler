import { describe, expect, it } from 'vitest';
import { conditionChoices, defaultIcon, deleteOption, ensureOptions, withOption } from './options';
import type { AppData } from './types';

function data(): AppData {
	return {
		properties: [
			{
				id: 'g',
				name: 'Grade',
				type: 'select',
				options: ['4th', '5th'],
				icon: 'tag',
				showInSessions: false
			}
		],
		students: [
			{ id: 'a', name: 'Iris', values: { g: '5th' } },
			{ id: 'b', name: 'Lena', values: { g: '5th' } }
		],
		schedules: [
			{
				id: 's',
				name: '4th Grade Recess',
				color: '#000',
				mode: 'deny',
				audience: {
					kind: 'conditions',
					conditions: [{ propertyId: 'g', op: 'anyOf', values: ['4th', '5th'] }]
				},
				windows: []
			}
		],
		sessions: [],
		providers: [],
		meId: null
	};
}

describe('Options', () => {
	it('adds an Option once, ignoring case', () => {
		expect(withOption(['4th'], ' 4TH ')).toEqual(['4th']);
		expect(withOption(['4th'], '5th')).toEqual(['4th', '5th']);
	});

	it('keeps an Option no Student uses so Conditions can still offer it', () => {
		const d = data();
		const c = d.schedules[0].audience;
		if (c.kind !== 'conditions' || c.conditions[0].op !== 'anyOf') throw new Error();
		expect(conditionChoices(c.conditions[0], d)).toEqual(['4th', '5th']);
	});

	it('offers a Condition’s own values even if the Option was lost', () => {
		const d = data();
		d.properties[0].options = [];
		const c = d.schedules[0].audience;
		if (c.kind !== 'conditions' || c.conditions[0].op !== 'anyOf') throw new Error();
		expect(conditionChoices(c.conditions[0], d)).toEqual(['4th', '5th']);
	});

	it('deleting an Option clears it from Students and Conditions', () => {
		const d = data();
		deleteOption(d, 'g', '5TH');
		expect(d.properties[0].options).toEqual(['4th']);
		expect(d.students.map((s) => s.values)).toEqual([{}, {}]);
		const a = d.schedules[0].audience;
		expect(a.kind === 'conditions' && a.conditions[0]).toEqual({
			propertyId: 'g',
			op: 'anyOf',
			values: ['4th']
		});
	});

	it('fills in Options for data saved before Options existed', () => {
		const d = data();
		// @ts-expect-error older saves have no options
		delete d.properties[0].options;
		d.students[0].values.g = '3rd';
		ensureOptions(d);
		expect(d.properties[0].options).toEqual(['3rd', '5th', '4th']);
	});
});

describe('defaultIcon', () => {
	it('picks icons that fit common Properties', () => {
		expect(defaultIcon('Grade', 'select')).toBe('graduation-cap');
		expect(defaultIcon('Teacher', 'select')).toBe('user');
		expect(defaultIcon('EL', 'checkbox')).toBe('languages');
		expect(defaultIcon('Bus rider', 'checkbox')).toBe('square-check');
		expect(defaultIcon('Room', 'select')).toBe('circle-chevron-down');
	});
});

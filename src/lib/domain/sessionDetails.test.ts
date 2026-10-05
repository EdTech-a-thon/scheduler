import { describe, expect, it } from 'vitest';
import { formatStudentLine, studentDetails, studentLines } from './sessionDetails';
import type { Property, Session, Student } from './types';

const prop = (
	id: string,
	name: string,
	type: Property['type'],
	showInSessions = true
): Property => ({
	id,
	name,
	type,
	options: [],
	icon: 'tag',
	showInSessions
});

const properties = [
	prop('g', 'Grade', 'select'),
	prop('t', 'Teacher', 'select'),
	prop('el', 'EL', 'checkbox'),
	prop('room', 'Room', 'select', false)
];

const ava: Student = {
	id: 'a',
	name: 'Ava Lopez',
	values: { g: '4th', t: 'Mrs. Smith', el: true, room: '12' }
};

describe('studentDetails', () => {
	it('lists shown Properties in Caseload order, Checkboxes by name', () => {
		expect(studentDetails(ava, properties)).toEqual(['4th', 'Mrs. Smith', 'EL']);
	});

	it('leaves out unset values and unchecked Checkboxes', () => {
		const ben: Student = { id: 'b', name: 'Ben', values: { t: 'Mr. Ortiz', el: false } };
		expect(studentDetails(ben, properties)).toEqual(['Mr. Ortiz']);
	});

	it('follows Caseload order, not the order values were set', () => {
		const reordered = [properties[2], properties[0]];
		expect(studentDetails(ava, reordered)).toEqual(['EL', '4th']);
	});
});

describe('studentLines', () => {
	const session: Session = {
		id: 'x',
		startDay: 0,
		endDay: 0,
		start: 540,
		end: 570,
		title: '',
		notes: '',
		studentIds: ['a', 'gone', 'c'],
		providerIds: []
	};
	const cal: Student = { id: 'c', name: 'Cal', values: {} };

	it('gives one line per Student still on the Caseload, in the Session’s order', () => {
		const lines = studentLines(session, [cal, ava], properties);
		expect(lines.map(formatStudentLine)).toEqual(['Ava Lopez · 4th · Mrs. Smith · EL', 'Cal']);
	});
});

import { describe, expect, it } from 'vitest';
import { commonFreeTime, freeTime, plannerLayers, sessionConflicts } from './freeTime';
import { GRID_END, GRID_START } from './time';
import type { AppData, Schedule, Session, Student } from './types';

const timmy: Student = { id: 't', name: 'Timmy', values: { g: '4th' } };
const stacy: Student = { id: 's', name: 'Stacy', values: { g: '5th' } };

const schoolHours: Schedule = {
	id: 'school',
	name: 'School Hours',
	color: '#000',
	mode: 'allow',
	audience: { kind: 'everyone', conditions: [] },
	windows: [{ id: 'w1', startDay: 0, endDay: 4, start: 540, end: 855 }]
};

const recess4: Schedule = {
	id: 'recess4',
	name: '4th Grade Recess',
	color: '#000',
	mode: 'deny',
	audience: { kind: 'conditions', conditions: [{ propertyId: 'g', op: 'anyOf', values: ['4th'] }] },
	windows: [{ id: 'w2', startDay: 0, endDay: 4, start: 600, end: 645 }]
};

const data = (schedules: Schedule[], sessions: Session[] = []): AppData => ({
	properties: [],
	students: [timmy, stacy],
	schedules,
	sessions,
	providers: [],
	meId: null
});

describe('freeTime', () => {
	it('is the whole grid with no Schedules', () => {
		expect(freeTime(timmy, data([]), 0)).toEqual([[GRID_START, GRID_END]]);
	});

	it('is limited to Allow Schedules', () => {
		expect(freeTime(timmy, data([schoolHours]), 0)).toEqual([[540, 855]]);
	});

	it('intersects several Allow Schedules', () => {
		const inBuilding: Schedule = {
			...schoolHours,
			id: 'b',
			windows: [{ id: 'x', startDay: 0, endDay: 0, start: 480, end: 600 }]
		};
		expect(freeTime(timmy, data([schoolHours, inBuilding]), 0)).toEqual([[540, 600]]);
		expect(freeTime(timmy, data([schoolHours, inBuilding]), 1)).toEqual([]);
	});

	it('removes Deny Schedules that apply to the Student', () => {
		expect(freeTime(timmy, data([schoolHours, recess4]), 0)).toEqual([
			[540, 600],
			[645, 855]
		]);
		expect(freeTime(stacy, data([schoolHours, recess4]), 0)).toEqual([[540, 855]]);
	});

	it('removes the Student’s Sessions', () => {
		const session: Session = {
			id: 'x',
			startDay: 0,
			endDay: 0,
			start: 700,
			end: 730,
			title: '',
			notes: '',
			studentIds: ['s'],
			providerIds: []
		};
		expect(freeTime(stacy, data([schoolHours], [session]), 0)).toEqual([
			[540, 700],
			[730, 855]
		]);
	});
});

describe('commonFreeTime', () => {
	it('is where every selected Student is free', () => {
		expect(commonFreeTime([timmy, stacy], data([schoolHours, recess4]), 0)).toEqual([
			[540, 600],
			[645, 855]
		]);
	});
});

describe('plannerLayers', () => {
	it('marks outside Allow and inside Deny, with overlaps listing both', () => {
		const lunch: Schedule = {
			...recess4,
			id: 'lunch',
			audience: { kind: 'everyone', conditions: [] },
			windows: [{ id: 'l', startDay: 0, endDay: 4, start: 630, end: 660 }]
		};
		expect(plannerLayers([timmy], [schoolHours, recess4, lunch], 0)).toEqual([
			{ start: GRID_START, end: 540, scheduleIds: ['school'] },
			{ start: 600, end: 630, scheduleIds: ['recess4'] },
			{ start: 630, end: 645, scheduleIds: ['recess4', 'lunch'] },
			{ start: 645, end: 660, scheduleIds: ['lunch'] },
			{ start: 855, end: GRID_END, scheduleIds: ['school'] }
		]);
	});

	it('ignores Schedules that apply to none of the selected Students', () => {
		expect(plannerLayers([stacy], [recess4], 0)).toEqual([]);
	});
});

describe('sessionConflicts', () => {
	it('flags Students whose Free Time the Session leaves', () => {
		const session: Session = {
			id: 'x',
			startDay: 0,
			endDay: 1,
			start: 630,
			end: 660,
			title: '',
			notes: '',
			studentIds: ['t', 's'],
			providerIds: []
		};
		const conflicts = sessionConflicts(session, data([schoolHours, recess4], [session]));
		expect(conflicts.map((c) => [c.studentId, c.day, c.blockers.map((b) => b.label)])).toEqual([
			['t', 0, ['4th Grade Recess']],
			['t', 1, ['4th Grade Recess']]
		]);
	});
});

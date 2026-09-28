import { describe, expect, it } from 'vitest';
import { buildBackup, isBackup, parseBackup } from './backup';
import { newProperty } from './options';
import type { AppData } from './types';

const data: AppData = {
	properties: [{ ...newProperty('p1', 'Grade', 'select'), options: ['K'] }],
	students: [{ id: 's1', name: 'Ava', values: { p1: 'K' } }],
	schedules: [],
	sessions: [
		{
			id: 'x1',
			startDay: 0,
			endDay: 0,
			start: 540,
			end: 570,
			studentIds: ['s1'],
			title: '',
			notes: 'Articulation'
		}
	]
};

describe('backup', () => {
	it('round-trips everything, Sessions and ids included', () => {
		const file = JSON.parse(JSON.stringify(buildBackup(data)));
		expect(isBackup(file)).toBe(true);
		expect(parseBackup(file)).toEqual(data);
	});

	it('rejects transfer files and incomplete backups', () => {
		expect(() => parseBackup({ app: 'service-scheduler', version: 1, properties: [] })).toThrow();
		expect(() =>
			parseBackup({ app: 'service-scheduler', kind: 'backup', version: 1, data: { students: [] } })
		).toThrow('missing');
	});
});

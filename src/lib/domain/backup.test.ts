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
			providerIds: [],
			title: '',
			notes: 'Articulation'
		}
	],
	providers: [{ id: 'p', name: 'Elliot', color: '#e5484d', icon: 'user' }],
	meId: 'p'
};

describe('backup', () => {
	it('round-trips everything, Sessions and ids included', () => {
		const file = JSON.parse(JSON.stringify(buildBackup(data)));
		expect(isBackup(file)).toBe(true);
		expect(parseBackup(file)).toEqual(data);
	});

	it('gives an older backup no Providers and nobody named', () => {
		const old = JSON.parse(JSON.stringify(buildBackup(data)));
		delete old.data.providers;
		delete old.data.meId;
		for (const s of old.data.sessions) delete s.providerIds;
		const parsed = parseBackup(old);
		expect(parsed.providers).toEqual([]);
		expect(parsed.meId).toBeNull();
		expect(parsed.sessions[0].providerIds).toEqual([]);
	});

	it('rejects transfer files and incomplete backups', () => {
		expect(() => parseBackup({ app: 'service-scheduler', version: 1, properties: [] })).toThrow();
		expect(() =>
			parseBackup({ app: 'service-scheduler', kind: 'backup', version: 1, data: { students: [] } })
		).toThrow('missing');
	});
});

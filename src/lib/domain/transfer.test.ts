import { describe, expect, it } from 'vitest';
import { audienceMembers } from './audience';
import { applyImport, buildExport, parseTransferFile, planImport, TransferError } from './transfer';
import { NAME_PROPERTY_ID, type AppData } from './types';

function ids(prefix: string) {
	let n = 0;
	return () => `${prefix}${++n}`;
}

function source(): AppData {
	return {
		properties: [
			{ id: 'g', name: 'Grade', type: 'select', options: [], icon: 'tag' },
			{ id: 't', name: 'Teacher', type: 'select', options: [], icon: 'tag' },
			{ id: 'el', name: 'EL', type: 'checkbox', options: [], icon: 'tag' }
		],
		students: [
			{ id: 's1', name: 'Iris', values: { g: '4th', el: true } },
			{ id: 's2', name: 'Lena', values: { g: '5th' } }
		],
		schedules: [
			{
				id: 'school',
				name: 'School Hours',
				color: '#111',
				mode: 'allow',
				audience: { kind: 'everyone', conditions: [] },
				windows: [{ id: 'w1', startDay: 0, endDay: 4, start: 540, end: 855 }]
			},
			{
				id: 'recess',
				name: '4th Grade Recess',
				color: '#222',
				mode: 'deny',
				audience: {
					kind: 'conditions',
					conditions: [{ propertyId: 'g', op: 'anyOf', values: ['4th'] }]
				},
				windows: [{ id: 'w2', startDay: 0, endDay: 4, start: 600, end: 645 }]
			}
		],
		sessions: [
			{
				id: 'x',
				startDay: 0,
				endDay: 0,
				start: 700,
				end: 730,
				title: '',
				notes: '',
				studentIds: ['s1'],
				providerIds: []
			}
		],
		providers: [],
		meId: null
	};
}

function teammate(): AppData {
	return {
		properties: [
			{ id: 'grade2', name: 'grade', type: 'select', options: [], icon: 'tag' },
			{ id: 'room', name: 'Room', type: 'select', options: [], icon: 'tag' }
		],
		students: [{ id: 'a', name: 'IRIS', values: { room: '12' } }],
		schedules: [],
		sessions: [],
		providers: [],
		meId: null
	};
}

const roundTrip = (file: unknown) => parseTransferFile(JSON.stringify(file));

describe('buildExport', () => {
	it('exports only the chosen Schedules and the Properties they use', () => {
		const file = buildExport(source(), { includeCaseload: false, scheduleIds: ['recess'] });
		expect(file.schedules?.map((s) => s.name)).toEqual(['4th Grade Recess']);
		expect(file.properties.map((p) => p.name)).toEqual(['Grade']);
		expect(file.students).toBeUndefined();
	});

	it('exports the Caseload with every Property but never Sessions', () => {
		const file = buildExport(source(), { includeCaseload: true, scheduleIds: [] });
		expect(file.students).toEqual([
			{ name: 'Iris', values: { g: '4th', el: true } },
			{ name: 'Lena', values: { g: '5th' } }
		]);
		expect(file.properties).toHaveLength(3);
		expect(file).not.toHaveProperty('sessions');
	});
});

describe('parseTransferFile', () => {
	it('rejects files that are not ours', () => {
		expect(() => parseTransferFile('{"hello":1}')).toThrow(TransferError);
		expect(() => parseTransferFile('not json')).toThrow(TransferError);
	});
});

describe('applyImport', () => {
	it('maps Properties by name so Audiences keep working', () => {
		const file = roundTrip(
			buildExport(source(), { includeCaseload: false, scheduleIds: ['recess'] })
		);
		const target = teammate();
		target.students.push({ id: 'b', name: 'Jonah', values: { grade2: '4TH' } });
		applyImport(target, file, { includeCaseload: false, scheduleIds: ['recess'] }, ids('n'));

		expect(target.properties.map((p) => p.name)).toEqual(['grade', 'Room']);
		const recess = target.schedules[0];
		expect(recess.audience).toEqual({
			kind: 'conditions',
			conditions: [{ propertyId: 'grade2', op: 'anyOf', values: ['4th'] }]
		});
		expect(audienceMembers(target.students, recess.audience).map((s) => s.name)).toEqual(['Jonah']);
	});

	it('gives imported Schedules and Windows fresh ids', () => {
		const file = roundTrip(
			buildExport(source(), { includeCaseload: false, scheduleIds: ['school'] })
		);
		const target = teammate();
		applyImport(target, file, { includeCaseload: false, scheduleIds: ['school'] }, ids('n'));
		applyImport(target, file, { includeCaseload: false, scheduleIds: ['school'] }, ids('m'));
		const allIds = target.schedules.flatMap((s) => [s.id, ...s.windows.map((w) => w.id)]);
		expect(new Set(allIds).size).toBe(4);
	});

	it('merges the Caseload by Name and creates missing Properties', () => {
		const file = roundTrip(buildExport(source(), { includeCaseload: true, scheduleIds: [] }));
		const target = teammate();
		applyImport(target, file, { includeCaseload: true, scheduleIds: [] }, ids('n'));

		expect(target.students.map((s) => s.name)).toEqual(['IRIS', 'Lena']);
		const el = target.properties.find((p) => p.name === 'EL')!;
		expect(target.students[0].values).toEqual({ room: '12', grade2: '4th', [el.id]: true });
		expect(target.students[1].values).toEqual({ grade2: '5th' });
	});

	it('accepts a file wrapped in a proxy, as Svelte state is', () => {
		const file = roundTrip(
			buildExport(source(), { includeCaseload: true, scheduleIds: ['recess'] })
		);
		const target = teammate();
		const proxied = new Proxy(file, {
			get: (t, k) => {
				const v = Reflect.get(t, k);
				return v && typeof v === 'object' ? new Proxy(v, {}) : v;
			}
		});
		applyImport(target, proxied, { includeCaseload: true, scheduleIds: ['recess'] }, ids('n'));
		expect(target.schedules).toHaveLength(1);
	});

	it('keeps Name Conditions', () => {
		const data = source();
		data.schedules[1].audience = {
			kind: 'conditions',
			conditions: [{ propertyId: NAME_PROPERTY_ID, op: 'anyOf', values: ['Iris'] }]
		};
		const file = roundTrip(buildExport(data, { includeCaseload: false, scheduleIds: ['recess'] }));
		const target = teammate();
		applyImport(target, file, { includeCaseload: false, scheduleIds: ['recess'] }, ids('n'));
		expect(audienceMembers(target.students, target.schedules[0].audience)).toHaveLength(1);
	});
});

describe('planImport', () => {
	it('reports which Students and Schedules already exist', () => {
		const file = roundTrip(
			buildExport(source(), { includeCaseload: true, scheduleIds: ['school'] })
		);
		const target = teammate();
		target.schedules.push({ ...source().schedules[0], id: 'mine', name: 'school hours' });
		const plan = planImport(target, file);
		expect(plan.students).toEqual([
			{ name: 'Iris', exists: true },
			{ name: 'Lena', exists: false }
		]);
		expect(plan.schedules[0].exists).toBe(true);
		expect(plan.propertyMatches.map((m) => m.existingId)).toEqual(['grade2', null, null]);
	});
});

describe('older files', () => {
	it('reads Properties saved with the old Text type as Select', () => {
		const file = parseTransferFile(
			JSON.stringify({
				app: 'service-scheduler',
				version: 1,
				properties: [{ id: 'g', name: 'Grade', type: 'text' }]
			})
		);
		expect(file.properties[0].type).toBe('select');
	});
});

describe('older Schedule modes', () => {
	it('reads Availability/Blocking as Allow/Deny', () => {
		const file = parseTransferFile(
			JSON.stringify({
				app: 'service-scheduler',
				version: 1,
				properties: [],
				schedules: [
					{ ...source().schedules[0], mode: 'availability' },
					{ ...source().schedules[1], mode: 'blocking' }
				]
			})
		);
		expect(file.schedules?.map((s) => s.mode)).toEqual(['allow', 'deny']);
	});
});

describe('Schedule colors', () => {
	it('travel with the file so teammates see the same colors', () => {
		const file = roundTrip(
			buildExport(source(), { includeCaseload: false, scheduleIds: ['school', 'recess'] })
		);
		const target = teammate();
		applyImport(
			target,
			file,
			{ includeCaseload: false, scheduleIds: ['school', 'recess'] },
			ids('n')
		);
		expect(target.schedules.map((s) => s.color)).toEqual(['#111', '#222']);
	});

	it('update retired colors from older files', () => {
		const file = parseTransferFile(
			JSON.stringify({
				app: 'service-scheduler',
				version: 1,
				properties: [],
				schedules: [{ ...source().schedules[0], color: '#7c7c75' }]
			})
		);
		expect(file.schedules?.[0].color).toBe('#5b6b82');
	});
});

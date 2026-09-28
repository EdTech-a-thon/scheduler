import { describe, expect, it } from 'vitest';
import { repairSpans } from './migrate';
import type { AppData } from './types';

describe('repairSpans', () => {
	it('gives repeated Window ids fresh ones and drops display fields', () => {
		const data = {
			properties: [],
			students: [],
			sessions: [],
			schedules: [
				{
					id: 's',
					name: 'School Hours',
					color: '#000',
					mode: 'allow',
					audience: { kind: 'everyone', conditions: [] },
					windows: [
						{ id: 'w', startDay: 0, endDay: 0, start: 480, end: 655 },
						{ id: 'w', startDay: 0, endDay: 0, start: 665, end: 840, color: '#978365' }
					]
				}
			]
		} as unknown as AppData;
		let n = 0;
		repairSpans(data, () => `fresh${++n}`);
		expect(data.schedules[0].windows).toEqual([
			{ id: 'w', startDay: 0, endDay: 0, start: 480, end: 655 },
			{ id: 'fresh1', startDay: 0, endDay: 0, start: 665, end: 840 }
		]);
	});
});

import { describe, expect, it } from 'vitest';
import { providerConflicts } from './freeTime';
import { PROVIDER_ICONS, newProvider, plannerSessions, resolvePlanningFor } from './providers';
import type { Session } from './types';

const session = (id: string, patch: Partial<Session> = {}): Session => ({
	id,
	startDay: 0,
	endDay: 0,
	start: 540,
	end: 570,
	title: '',
	notes: '',
	studentIds: [],
	providerIds: [],
	...patch
});

describe('newProvider', () => {
	it('takes the next unused color and icon', () => {
		const first = newProvider('a', ' Elliot ', []);
		const second = newProvider('b', 'Jones', [first]);
		expect(first.name).toBe('Elliot');
		expect(second.color).not.toBe(first.color);
		expect(second.icon).toBe(PROVIDER_ICONS[1]);
	});
});

describe('plannerSessions', () => {
	const mine = session('mine', { providerIds: ['me'], studentIds: ['x'] });
	const theirsShared = session('shared', { providerIds: ['ot'], studentIds: ['maya'] });
	const theirs = session('theirs', { providerIds: ['ot'], studentIds: ['leo'] });
	const nobody = session('nobody', { studentIds: ['leo'] });
	const all = [mine, theirsShared, theirs, nobody];
	const ids = (r: { session: Session; muted: boolean }[]) =>
		r.map((x) => `${x.session.id}${x.muted ? ' (muted)' : ''}`);

	it('shows only the Provider’s week with nobody selected', () => {
		expect(ids(plannerSessions(all, 'me', []))).toEqual(['mine']);
	});

	it('adds other Sessions with a selected Student, muted', () => {
		expect(ids(plannerSessions(all, 'me', ['maya']))).toEqual(['mine', 'shared (muted)']);
	});

	it('shows everything for Everyone', () => {
		expect(ids(plannerSessions(all, null, []))).toEqual(['mine', 'shared', 'theirs', 'nobody']);
		expect(ids(plannerSessions(all, null, ['leo']))).toEqual(['theirs', 'nobody']);
	});
});

describe('resolvePlanningFor', () => {
	const data = { providers: [{ id: 'me', name: 'E', color: '', icon: '' }], meId: 'me' };
	it('falls back to Me when the Provider is gone', () => {
		expect(resolvePlanningFor('gone', data)).toBe('me');
		expect(resolvePlanningFor('everyone', data)).toBeNull();
		expect(resolvePlanningFor('gone', { providers: [], meId: null })).toBeNull();
	});
});

describe('providerConflicts', () => {
	it('flags another Session of the same Provider at the same time', () => {
		const a = session('a', { providerIds: ['me'], endDay: 2 });
		const b = session('b', { providerIds: ['me'], startDay: 2, endDay: 2, start: 560, end: 600 });
		const c = session('c', { providerIds: ['ot'] });
		const d = session('d', { providerIds: ['me'], start: 570, end: 600 });
		const found = providerConflicts(a, [a, b, c, d]);
		expect(found.map((f) => [f.other.id, f.day])).toEqual([['b', 2]]);
	});
});

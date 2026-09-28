import { normalizeText } from './audience';
import { clone } from './clone';
import { migrateProperties, migrateSchedules } from './migrate';
import { ensureOptions, newProperty, withOption } from './options';
import {
	NAME_PROPERTY_ID,
	type AppData,
	type Audience,
	type Property,
	type PropertyValue,
	type Schedule
} from './types';

/**
 * A file a Provider can send to teammates: some Schedules, a Caseload, or both.
 * Ids inside the file are only meaningful within the file; on import, Properties
 * are matched by name and everything else gets fresh ids.
 */
export interface TransferFile {
	app: 'service-scheduler';
	version: 1;
	properties: Property[];
	students?: { name: string; values: Record<string, PropertyValue> }[];
	schedules?: Schedule[];
}

export interface ExportChoice {
	includeCaseload: boolean;
	scheduleIds: string[];
}

function usedPropertyIds(audience: Audience): string[] {
	return audience.conditions.map((c) => c.propertyId);
}

export function buildExport(data: AppData, choice: ExportChoice): TransferFile {
	const schedules = data.schedules.filter((s) => choice.scheduleIds.includes(s.id));
	const needed = new Set(schedules.flatMap((s) => usedPropertyIds(s.audience)));
	const file: TransferFile = {
		app: 'service-scheduler',
		version: 1,
		properties: data.properties.filter((p) => choice.includeCaseload || needed.has(p.id))
	};
	if (choice.includeCaseload)
		file.students = data.students.map(({ name, values }) => ({ name, values }));
	if (schedules.length) file.schedules = schedules;
	return clone(file);
}

export class TransferError extends Error {}

export function parseTransferFile(text: string): TransferFile {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new TransferError('This file isn’t valid JSON.');
	}
	const f = raw as Partial<TransferFile>;
	if (!f || f.app !== 'service-scheduler')
		throw new TransferError('This isn’t a Service Scheduler file.');
	if (f.version !== 1) throw new TransferError(`Unsupported file version: ${String(f.version)}.`);
	if (!Array.isArray(f.properties) || f.properties.some((p) => !p?.id || !p.name || !p.type))
		throw new TransferError('The file’s Properties are malformed.');
	if (f.students && !f.students.every((s) => typeof s?.name === 'string' && s.values))
		throw new TransferError('The file’s Students are malformed.');
	if (f.schedules && !f.schedules.every((s) => s?.id && Array.isArray(s.windows) && s.audience))
		throw new TransferError('The file’s Schedules are malformed.');
	return {
		...f,
		properties: migrateProperties(f.properties),
		...(f.schedules ? { schedules: migrateSchedules(f.schedules) } : {})
	} as TransferFile;
}

export interface ImportPlan {
	/** File Property id → existing Property id, or null if it will be created. */
	propertyMatches: { property: Property; existingId: string | null }[];
	students: { name: string; exists: boolean }[];
	schedules: { id: string; name: string; color: string; exists: boolean }[];
}

function findProperty(existing: Property[], p: Property): Property | undefined {
	return existing.find((e) => e.type === p.type && normalizeText(e.name) === normalizeText(p.name));
}

export function planImport(data: AppData, file: TransferFile): ImportPlan {
	const names = new Set(data.students.map((s) => normalizeText(s.name)));
	const scheduleNames = new Set(data.schedules.map((s) => normalizeText(s.name)));
	return {
		propertyMatches: file.properties.map((p) => ({
			property: p,
			existingId: findProperty(data.properties, p)?.id ?? null
		})),
		students: (file.students ?? []).map((s) => ({
			name: s.name,
			exists: names.has(normalizeText(s.name))
		})),
		schedules: (file.schedules ?? []).map((s) => ({
			id: s.id,
			name: s.name,
			color: s.color,
			exists: scheduleNames.has(normalizeText(s.name))
		}))
	};
}

/**
 * Merge a file into the app's data. Students are matched by Name and updated;
 * chosen Schedules are always added as new Schedules.
 */
export function applyImport(
	data: AppData,
	file: TransferFile,
	choice: ExportChoice,
	newId: () => string
): void {
	const schedules = (file.schedules ?? []).filter((s) => choice.scheduleIds.includes(s.id));
	const needed = new Set(schedules.flatMap((s) => usedPropertyIds(s.audience)));
	const idMap = new Map<string, string>([[NAME_PROPERTY_ID, NAME_PROPERTY_ID]]);

	for (const p of file.properties) {
		if (!choice.includeCaseload && !needed.has(p.id)) continue;
		const match = findProperty(data.properties, p);
		if (match) {
			idMap.set(p.id, match.id);
			match.options = [...match.options, ...p.options].reduce(withOption, [] as string[]);
		} else {
			const id = newId();
			data.properties.push({ ...newProperty(id, p.name, p.type, p.icon), options: [...p.options] });
			idMap.set(p.id, id);
		}
	}

	if (choice.includeCaseload) {
		for (const incoming of file.students ?? []) {
			if (!incoming.name.trim()) continue;
			const values: Record<string, PropertyValue> = {};
			for (const [fileId, v] of Object.entries(incoming.values)) {
				const id = idMap.get(fileId);
				if (id) values[id] = v;
			}
			const existing = data.students.find(
				(s) => normalizeText(s.name) === normalizeText(incoming.name)
			);
			if (existing) Object.assign(existing.values, values);
			else data.students.push({ id: newId(), name: incoming.name.trim(), values });
		}
	}

	for (const s of schedules) {
		const audience: Audience = {
			kind: s.audience.kind,
			conditions: s.audience.conditions
				.filter((c) => idMap.has(c.propertyId))
				.map((c) => ({ ...clone(c), propertyId: idMap.get(c.propertyId)! }))
		};
		data.schedules.push({
			id: newId(),
			name: s.name,
			color: s.color,
			mode: s.mode,
			audience,
			windows: s.windows.map((w) => ({ ...w, id: newId() }))
		});
	}
	ensureOptions(data);
}

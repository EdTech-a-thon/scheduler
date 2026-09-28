import { clone } from './clone';
import { migrateData } from './migrate';
import { TransferError } from './transfer';
import type { AppData } from './types';

/**
 * Everything in the app, Sessions included, for a Provider to keep a copy of
 * locally. Unlike a transfer file it restores by replacing, ids and all.
 */
export interface BackupFile {
	app: 'service-scheduler';
	kind: 'backup';
	version: 1;
	exportedAt: string;
	data: AppData;
}

export function buildBackup(data: AppData, now = new Date()): BackupFile {
	return {
		app: 'service-scheduler',
		kind: 'backup',
		version: 1,
		exportedAt: now.toISOString(),
		data: clone(data)
	};
}

export function isBackup(raw: unknown): boolean {
	return (raw as Partial<BackupFile> | null)?.kind === 'backup';
}

export function parseBackup(raw: unknown): AppData {
	const f = raw as Partial<BackupFile> | null;
	if (!f || f.app !== 'service-scheduler' || f.kind !== 'backup')
		throw new TransferError('This isn’t a Service Scheduler backup.');
	if (f.version !== 1) throw new TransferError(`Unsupported backup version: ${String(f.version)}.`);
	const d = f.data as Partial<AppData> | undefined;
	if (
		!d ||
		!Array.isArray(d.properties) ||
		!Array.isArray(d.students) ||
		!Array.isArray(d.schedules) ||
		!Array.isArray(d.sessions)
	)
		throw new TransferError('The backup is missing some of its data.');
	return migrateData(clone(d as AppData));
}

import { isBackup, parseBackup } from '$lib/domain/backup';
import { parseTransferFile, TransferError, type TransferFile } from '$lib/domain/transfer';
import type { AppData } from '$lib/domain/types';

/**
 * The one import flow, started from the Caseload, Schedules or Settings page
 * or by dropping a file anywhere. A transfer file is reviewed and merged in;
 * a backup replaces everything once confirmed. The layout shows the dialogs.
 */
class Importer {
	pending = $state<{ file: TransferFile; filename: string } | null>(null);
	restoring = $state<{ data: AppData; filename: string } | null>(null);
	error = $state<string | null>(null);

	async open(f: File | undefined) {
		if (!f) return;
		try {
			const text = await f.text();
			let raw: unknown;
			try {
				raw = JSON.parse(text);
			} catch {
				throw new TransferError('This file isn’t valid JSON.');
			}
			if (isBackup(raw)) this.restoring = { data: parseBackup(raw), filename: f.name };
			else this.pending = { file: parseTransferFile(text), filename: f.name };
		} catch (e) {
			this.error = e instanceof TransferError ? e.message : 'This file couldn’t be read.';
		}
	}

	pick() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json,application/json';
		input.onchange = () => this.open(input.files?.[0]);
		input.click();
	}
}

export const importer = new Importer();

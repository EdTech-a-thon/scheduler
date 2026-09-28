import { normalizeText, removePropertyFromAudience } from '$lib/domain/audience';
import { migrateData } from '$lib/domain/migrate';
import { deleteOption, newProperty, withOption } from '$lib/domain/options';
import { nextColor } from '$lib/domain/palette';
import { applyImport, type ExportChoice, type TransferFile } from '$lib/domain/transfer';
import type {
	AppData,
	Property,
	PropertyType,
	PropertyValue,
	Schedule,
	Session,
	Span,
	Window
} from '$lib/domain/types';

const STORAGE_KEY = 'service-scheduler:v1';
const HISTORY_KEY = 'service-scheduler:v1:history';
const HISTORY_LIMIT = 100;

interface History {
	past: string[];
	future: string[];
}

export const newId = () => crypto.randomUUID();

function emptyData(): AppData {
	return {
		properties: [
			newProperty(newId(), 'Grade', 'select'),
			newProperty(newId(), 'Teacher', 'select')
		],
		students: [],
		schedules: [],
		sessions: []
	};
}

function load(): AppData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			return migrateData(JSON.parse(raw) as AppData);
		}
	} catch {
		// Unreadable or blocked storage: start fresh.
	}
	return emptyData();
}

function loadHistory(): History {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		if (raw) {
			const h = JSON.parse(raw) as History;
			if (Array.isArray(h.past) && Array.isArray(h.future)) return h;
		}
	} catch {
		// No usable history; start with none.
	}
	return { past: [], future: [] };
}

const initialHistory = loadHistory();

/** Snapshots may predate the current data shape. */
const restore = (snapshot: string): AppData => migrateData(JSON.parse(snapshot));

/**
 * All app data, kept in browser storage (ADR-0001). Every change goes through
 * `change`, which records an undo snapshot and persists both the data and the
 * undo history, so a refresh loses neither.
 */
class Store {
	data = $state<AppData>(load());
	#past = $state<string[]>(initialHistory.past);
	#future = $state<string[]>(initialHistory.future);

	get canUndo() {
		return this.#past.length > 0;
	}
	get canRedo() {
		return this.#future.length > 0;
	}

	/** Applies `fn` to a copy and swaps it in only if it succeeds, so a failed change leaves no trace. */
	change(fn: (d: AppData) => void) {
		const before = JSON.stringify($state.snapshot(this.data));
		const draft: AppData = JSON.parse(before);
		fn(draft);
		const after = JSON.stringify(draft);
		if (after === before) return;
		this.#past = [...this.#past.slice(-HISTORY_LIMIT + 1), before];
		this.#future = [];
		this.data = JSON.parse(after);
		this.#save();
	}

	undo() {
		const prev = this.#past.at(-1);
		if (!prev) return;
		this.#future = [...this.#future, JSON.stringify($state.snapshot(this.data))];
		this.#past = this.#past.slice(0, -1);
		this.data = restore(prev);
		this.#save();
	}

	redo() {
		const next = this.#future.at(-1);
		if (!next) return;
		this.#past = [...this.#past, JSON.stringify($state.snapshot(this.data))];
		this.#future = this.#future.slice(0, -1);
		this.data = restore(next);
		this.#save();
	}

	#save() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.data)));
		} catch {
			// Storage full or blocked; the in-memory copy still works for this visit.
			return;
		}
		this.#saveHistory();
	}

	/** History is a nice-to-have: if storage runs short, drop the oldest steps until it fits. */
	#saveHistory() {
		let past = this.#past;
		const future = this.#future;
		while (true) {
			try {
				localStorage.setItem(HISTORY_KEY, JSON.stringify({ past, future }));
				return;
			} catch {
				if (past.length === 0) {
					try {
						localStorage.removeItem(HISTORY_KEY);
					} catch {
						// Nothing more to do.
					}
					return;
				}
				past = past.slice(Math.ceil(past.length / 2));
				this.#past = past;
			}
		}
	}

	importFile(file: TransferFile, choice: ExportChoice) {
		this.change((d) => applyImport(d, file, choice, newId));
	}

	/** Replaces everything with a backup. It's one step, so Undo brings the old data back. */
	restoreBackup(backup: AppData) {
		this.change((d) => {
			d.properties = backup.properties;
			d.students = backup.students;
			d.schedules = backup.schedules;
			d.sessions = backup.sessions;
		});
	}

	// Properties

	addProperty(type: PropertyType): Property {
		const property = newProperty(newId(), type === 'select' ? 'Select' : 'Checkbox', type);
		this.change((d) => void d.properties.push(property));
		return property;
	}

	renameProperty(id: string, name: string) {
		this.change((d) => {
			const p = d.properties.find((p) => p.id === id);
			if (p && name.trim()) p.name = name.trim();
		});
	}

	setPropertyIcon(id: string, icon: string) {
		this.change((d) => {
			const p = d.properties.find((p) => p.id === id);
			if (p) p.icon = icon;
		});
	}

	/** Also drops the Property's values and every Condition that used it. */
	deleteProperty(id: string) {
		this.change((d) => {
			d.properties = d.properties.filter((p) => p.id !== id);
			for (const s of d.students) delete s.values[id];
			for (const s of d.schedules) s.audience = removePropertyFromAudience(s.audience, id);
		});
	}

	// Students

	isNameTaken(name: string, exceptId?: string) {
		const key = normalizeText(name);
		return this.data.students.some((s) => s.id !== exceptId && normalizeText(s.name) === key);
	}

	addStudent(name: string): string | null {
		if (!name.trim() || this.isNameTaken(name)) return null;
		const id = newId();
		this.change((d) => void d.students.push({ id, name: name.trim(), values: {} }));
		return id;
	}

	renameStudent(id: string, name: string): boolean {
		if (!name.trim() || this.isNameTaken(name, id)) return false;
		this.change((d) => {
			const s = d.students.find((s) => s.id === id);
			if (s) s.name = name.trim();
		});
		return true;
	}

	setValue(studentId: string, propertyId: string, value: PropertyValue | undefined) {
		this.change((d) => {
			const s = d.students.find((s) => s.id === studentId);
			const p = d.properties.find((p) => p.id === propertyId);
			if (!s || !p) return;
			if (value === undefined || value === '' || value === false) {
				delete s.values[propertyId];
				return;
			}
			if (typeof value === 'string') {
				p.options = withOption(p.options, value);
				value = value.trim();
			}
			s.values[propertyId] = value;
		});
	}

	deleteOption(propertyId: string, option: string) {
		this.change((d) => deleteOption(d, propertyId, option));
	}

	/** Removes the Student from their Sessions; the Sessions themselves are kept. */
	deleteStudent(id: string) {
		this.change((d) => {
			d.students = d.students.filter((s) => s.id !== id);
			for (const s of d.sessions) s.studentIds = s.studentIds.filter((x) => x !== id);
		});
	}

	// Schedules

	createSchedule(): string {
		const id = newId();
		this.change((d) =>
			d.schedules.push({
				id,
				name: 'Untitled schedule',
				color: nextColor(d.schedules.map((s) => s.color)),
				mode: 'deny',
				audience: { kind: 'conditions', conditions: [] },
				windows: []
			})
		);
		return id;
	}

	updateSchedule(id: string, fn: (s: Schedule) => void) {
		this.change((d) => {
			const s = d.schedules.find((s) => s.id === id);
			if (s) fn(s);
		});
	}

	setWindows(id: string, windows: Window[]) {
		this.updateSchedule(id, (s) => (s.windows = windows));
	}

	deleteSchedule(id: string) {
		this.change((d) => (d.schedules = d.schedules.filter((s) => s.id !== id)));
	}

	// Sessions

	createSession(span: Omit<Span, 'id'>, studentIds: string[]): string {
		const id = newId();
		this.change((d) => d.sessions.push({ ...span, id, title: '', notes: '', studentIds }));
		return id;
	}

	updateSession(id: string, fn: (s: Session) => void) {
		this.change((d) => {
			const s = d.sessions.find((s) => s.id === id);
			if (s) fn(s);
		});
	}

	setSessions(sessions: Session[]) {
		this.change((d) => (d.sessions = sessions));
	}

	/** Move or resize several Sessions as one step. */
	moveSessions(changes: { id: string; rect: Omit<Span, 'id'> }[]) {
		this.change((d) => {
			for (const c of changes) {
				const s = d.sessions.find((s) => s.id === c.id);
				if (s) Object.assign(s, c.rect);
			}
		});
	}

	/** Copies with the same Students, title and notes at new times. Returns the copies' ids. */
	duplicateSessions(copies: { id: string; rect: Omit<Span, 'id'> }[]): string[] {
		const ids: string[] = [];
		this.change((d) => {
			for (const c of copies) {
				const source = d.sessions.find((s) => s.id === c.id);
				if (!source) continue;
				const id = newId();
				ids.push(id);
				d.sessions.push({ ...structuredClone(source), ...c.rect, id });
			}
		});
		return ids;
	}

	deleteSessions(ids: string[]) {
		this.change((d) => (d.sessions = d.sessions.filter((s) => !ids.includes(s.id))));
	}

	/**
	 * Merge Sessions into the first one: it takes the combined time, keeps its
	 * title, and gathers every distinct note.
	 */
	mergeSessions(ids: string[], rect: Omit<Span, 'id'>): string {
		const [keep] = ids;
		this.change((d) => {
			const merged = ids.map((id) => d.sessions.find((s) => s.id === id)!).filter(Boolean);
			const first = merged[0];
			Object.assign(first, rect);
			first.notes = [...new Set(merged.map((s) => s.notes.trim()).filter(Boolean))].join('\n\n');
			d.sessions = d.sessions.filter((s) => s.id === keep || !ids.includes(s.id));
		});
		return keep;
	}

	deleteSession(id: string) {
		this.change((d) => (d.sessions = d.sessions.filter((s) => s.id !== id)));
	}
}

export const store = new Store();

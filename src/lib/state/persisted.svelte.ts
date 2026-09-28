import type { Condition } from '$lib/domain/types';
import type { Tool } from '$lib/components/TimeGrid.svelte';

/**
 * A bit of per-page editor state (selection, filters, tool) that survives
 * navigation and refreshes. Separate from app data and not part of undo.
 */
class Persisted<T extends object> {
	value: T;

	constructor(key: string, initial: T) {
		let stored: Partial<T> = {};
		try {
			stored = JSON.parse(localStorage.getItem(key) ?? '{}');
		} catch {
			// Unreadable: use the defaults.
		}
		this.value = $state({ ...initial, ...stored });
		$effect.root(() => {
			$effect(() => {
				const json = JSON.stringify($state.snapshot(this.value));
				try {
					localStorage.setItem(key, json);
				} catch {
					// Storage full or blocked; the state still works for this visit.
				}
			});
		});
	}
}

export const plannerUi = new Persisted('service-scheduler:v1:ui:planner', {
	selected: [] as string[],
	filters: [] as Condition[],
	query: '',
	tool: 'draw' as Tool,
	sessionIds: [] as string[]
}).value;

export const editorUi = new Persisted('service-scheduler:v1:ui:editor', {
	tool: 'draw' as Tool
}).value;

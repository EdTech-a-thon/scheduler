import { redirect } from '@sveltejs/kit';
import { onboarding } from '$lib/state/persisted.svelte';
import { store } from '$lib/state/store.svelte';

/** A first visit lands on the welcome page; anyone with work here goes straight to it. */
export function load() {
	const hasWork = store.data.students.length > 0 || store.data.schedules.length > 0;
	redirect(307, onboarding.welcomed || hasWork ? '/caseload' : '/welcome');
}

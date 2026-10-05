<script lang="ts">
	import { store } from '$lib/state/store.svelte';
	import { focusOnMount } from './focus';
	import Modal from './Modal.svelte';

	/** Asks who's using the tool, once, so their Sessions can carry their name. */
	let name = $state('');
	const save = () => name.trim() && store.setMe(name);
	/** Sessions nobody serves yet become theirs. */
	const unassigned = $derived(store.data.sessions.filter((s) => s.providerIds.length === 0).length);
</script>

<Modal
	title="What should we call you?"
	confirmLabel="Save"
	disabled={!name.trim()}
	onconfirm={save}
>
	<p>
		Sessions now show which Provider runs them. Enter the name you’d like to go by on the schedule.
		{#if unassigned}Your {unassigned} existing Session{unassigned === 1 ? '' : 's'} will be marked as
			yours.{/if}
	</p>
	<input
		class="name"
		placeholder="e.g. Ms. Roe"
		aria-label="Your name"
		use:focusOnMount
		bind:value={name}
		onkeydown={(e) => e.key === 'Enter' && save()}
	/>
	<p class="muted small">You can change it any time on the Providers page.</p>
</Modal>

<style>
	.name {
		width: 100%;
		box-sizing: border-box;
		font-size: 15px;
		margin: 4px 0 2px;
	}
</style>

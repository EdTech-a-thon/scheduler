<script lang="ts">
	import { Download, PlayCircle, Upload } from '@lucide/svelte';
	import { downloadJson } from '$lib/components/download';
	import { buildBackup } from '$lib/domain/backup';
	import { importer } from '$lib/state/importer.svelte';
	import { onboarding } from '$lib/state/persisted.svelte';
	import { store } from '$lib/state/store.svelte';

	const me = $derived(store.data.providers.find((p) => p.id === store.data.meId));
	let nameTaken = $state(false);

	function exportAccount() {
		const date = new Date().toISOString().slice(0, 10);
		downloadJson(`service-scheduler-backup-${date}.json`, buildBackup($state.snapshot(store.data)));
	}
</script>

<section class="card">
	<h2>Your name</h2>
	<p class="muted">
		How you appear on Sessions you run. Manage everyone else on the <a href="/providers"
			>Providers</a
		> page.
	</p>
	{#if me}
		<input
			class="me"
			value={me.name}
			aria-label="Your name"
			onchange={(e) => {
				nameTaken = !store.renameProvider(me.id, e.currentTarget.value);
				if (nameTaken) e.currentTarget.value = me.name;
			}}
		/>
		{#if nameTaken}<p class="small error">
				That name is empty or already used by another Provider.
			</p>{/if}
	{/if}
</section>

<section class="card">
	<h2>Getting started</h2>
	<label class="switch">
		<input type="checkbox" bind:checked={onboarding.showChecklist} />
		<span>
			Show the getting-started checklist
			<span class="muted small">In the bottom-right corner, until each step is done.</span>
		</span>
	</label>
	<a class="replay" href="/welcome/tour"><PlayCircle size={15} /> Replay the welcome tour</a>
</section>

<section class="card">
	<h2>Back up your account</h2>
	<p class="muted">
		Everything you make stays in this browser and nowhere else. Export a backup to keep a copy on
		your computer or to move to another browser. It holds everything: your Caseload, Properties,
		Schedules, Providers and Sessions.
	</p>
	<div class="actions">
		<button class="primary" onclick={exportAccount}><Download size={15} /> Export account</button>
		<button onclick={() => importer.pick()}><Upload size={15} /> Import account</button>
	</div>
	<p class="muted small">
		Importing a backup replaces everything here. You can undo it right after.
	</p>
</section>

<style>
	.me {
		width: min(320px, 100%);
		margin-top: 10px;
	}
	.error {
		color: var(--danger);
		margin: 6px 0 0;
	}
	.actions {
		display: flex;
		gap: 8px;
		margin: 16px 0 10px;
	}
	.actions button {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.switch {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin: 10px 0 14px;
		cursor: pointer;
	}
	.switch input {
		margin-top: 3px;
	}
	.switch .small {
		display: block;
		margin-top: 2px;
	}
	.replay {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid var(--line);
		border-radius: 7px;
		color: var(--text) !important;
		text-decoration: none;
	}
	.replay:hover {
		background: var(--surface-2);
	}
	.small {
		font-size: 12px;
	}
</style>

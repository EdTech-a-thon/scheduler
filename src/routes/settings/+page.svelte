<script lang="ts">
	import { Download, Upload } from '@lucide/svelte';
	import { downloadJson } from '$lib/components/download';
	import { buildBackup } from '$lib/domain/backup';
	import { importer } from '$lib/state/importer.svelte';
	import { store } from '$lib/state/store.svelte';

	function exportAccount() {
		const date = new Date().toISOString().slice(0, 10);
		downloadJson(`service-scheduler-backup-${date}.json`, buildBackup($state.snapshot(store.data)));
	}
</script>

<section class="card">
	<h2>Back up your account</h2>
	<p class="muted">
		Everything you make stays in this browser and nowhere else. Export a backup to keep a copy on
		your computer or to move to another browser. It holds everything: your Caseload, Properties,
		Schedules and Sessions.
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
	.small {
		font-size: 12px;
	}
</style>

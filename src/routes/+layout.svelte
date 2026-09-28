<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { CalendarRange, FileUp, LayoutGrid, Users } from '@lucide/svelte';
	import ImportDialog from '$lib/components/ImportDialog.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { handleUndoKeys } from '$lib/components/shortcuts';
	import { parseTransferFile, TransferError, type TransferFile } from '$lib/domain/transfer';
	import { store } from '$lib/state/store.svelte';

	let { children } = $props();

	const links = [
		{ href: '/caseload', label: 'Caseload', icon: Users },
		{ href: '/schedules', label: 'Schedules', icon: CalendarRange },
		{ href: '/planner', label: 'Planner', icon: LayoutGrid }
	];

	let picker: HTMLInputElement | undefined = $state();
	let pending = $state<{ file: TransferFile; filename: string } | null>(null);
	let error = $state<string | null>(null);
	let dragDepth = $state(0);

	async function open(f: File | undefined) {
		if (!f) return;
		try {
			pending = { file: parseTransferFile(await f.text()), filename: f.name };
		} catch (e) {
			error = e instanceof TransferError ? e.message : 'This file couldn’t be read.';
		}
	}

	const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;
</script>

<svelte:head>
	<title>Service Scheduler</title>
</svelte:head>

<header>
	<span class="brand">Service Scheduler</span>
	<nav>
		{#each links as { href, label, icon: Icon } (href)}
			<a {href} class:active={page.url.pathname.startsWith(href)}><Icon size={16} /> {label}</a>
		{/each}
	</nav>
	<button class="import" onclick={() => picker?.click()}><FileUp size={15} /> Import</button>
	<input
		bind:this={picker}
		type="file"
		accept=".json,application/json"
		hidden
		onchange={(e) => {
			open(e.currentTarget.files?.[0]);
			e.currentTarget.value = '';
		}}
	/>
</header>

<main>{@render children()}</main>

<!-- Drop an exported file anywhere to import it. -->
<svelte:window
	onkeydown={(e) =>
		handleUndoKeys(
			e,
			() => store.undo(),
			() => store.redo()
		)}
	ondragenter={(e) => hasFiles(e) && dragDepth++}
	ondragleave={(e) => hasFiles(e) && (dragDepth = Math.max(0, dragDepth - 1))}
	ondragover={(e) => hasFiles(e) && e.preventDefault()}
	ondrop={(e) => {
		if (!hasFiles(e)) return;
		e.preventDefault();
		dragDepth = 0;
		open(e.dataTransfer?.files[0]);
	}}
/>

{#if dragDepth > 0}
	<div class="dropzone">
		<div><FileUp size={28} /> Drop a Service Scheduler file to import it</div>
	</div>
{/if}

{#if pending}
	<ImportDialog file={pending.file} filename={pending.filename} onclose={() => (pending = null)} />
{/if}

{#if error}
	<Modal
		title="Couldn’t import that file"
		confirmLabel="OK"
		onconfirm={() => (error = null)}
		oncancel={() => (error = null)}
	>
		<p>{error}</p>
	</Modal>
{/if}

<style>
	header {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 0 28px;
		height: 52px;
		background: white;
		border-bottom: 1px solid var(--line);
		position: sticky;
		top: 0;
		z-index: 30;
	}
	.brand {
		font-weight: 700;
	}
	nav {
		display: flex;
		gap: 4px;
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 7px;
		color: var(--muted);
		text-decoration: none;
		font-weight: 500;
	}
	nav a:hover {
		background: var(--surface-2);
	}
	nav a.active {
		color: var(--accent-strong);
		background: var(--accent-soft);
	}
	.import {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dropzone {
		position: fixed;
		inset: 0;
		z-index: 90;
		background: rgb(37 99 235 / 0.08);
		border: 3px dashed var(--accent);
		display: grid;
		place-items: center;
		pointer-events: none;
	}
	.dropzone div {
		display: flex;
		align-items: center;
		gap: 10px;
		background: white;
		padding: 16px 22px;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 600;
		color: var(--accent-strong);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.12);
	}
</style>

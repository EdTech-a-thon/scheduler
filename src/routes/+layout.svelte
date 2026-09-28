<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import {
		CalendarRange,
		ChevronRight,
		CircleQuestionMark,
		FileUp,
		LayoutGrid,
		Settings,
		Users
	} from '@lucide/svelte';
	import GettingStarted from '$lib/components/GettingStarted.svelte';
	import HelpDialog from '$lib/components/HelpDialog.svelte';
	import ImportDialog from '$lib/components/ImportDialog.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { handleUndoKeys } from '$lib/components/shortcuts';
	import type { AppData } from '$lib/domain/types';
	import { importer } from '$lib/state/importer.svelte';
	import { onboarding } from '$lib/state/persisted.svelte';
	import { store } from '$lib/state/store.svelte';

	let { children } = $props();

	const links = [
		{ href: '/caseload', label: 'Caseload', icon: Users },
		{ href: '/schedules', label: 'Schedules', icon: CalendarRange },
		{ href: '/planner', label: 'Planner', icon: LayoutGrid }
	];

	type Crumb = { label: string; href?: string };
	const crumbs = $derived.by((): Crumb[] => {
		const path = page.url.pathname;
		if (path.startsWith('/schedules/')) {
			const id = decodeURIComponent(path.slice('/schedules/'.length));
			const name = store.data.schedules.find((s) => s.id === id)?.name ?? 'Schedule';
			return [{ label: 'Schedules', href: '/schedules' }, { label: name }];
		}
		const tab = (
			{ '/settings/about': 'About', '/settings/privacy': 'Privacy' } as Record<string, string>
		)[path];
		if (tab) return [{ label: 'Settings', href: '/settings' }, { label: tab }];
		const top = [...links, { href: '/settings', label: 'Settings' }].find((l) =>
			path.startsWith(l.href)
		);
		return top ? [{ label: top.label }] : [];
	});

	const isActive = (href: string) => page.url.pathname.startsWith(href);
	const bare = $derived(page.url.pathname.startsWith('/welcome'));

	let dragDepth = $state(0);
	const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;

	let helpOpen = $state(false);

	/**
	 * The nav is an icon rail that slides out over the page after the pointer
	 * rests on it for a moment, so passing over it on the way somewhere doesn't
	 * flash it open. It never pushes the page aside.
	 */
	const OPEN_DELAY = 300;
	const CLOSE_DELAY = 150;
	let expanded = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	function expandLater(next: boolean) {
		clearTimeout(timer);
		timer = setTimeout(() => (expanded = next), next ? OPEN_DELAY : CLOSE_DELAY);
	}
	function collapseNow() {
		clearTimeout(timer);
		expanded = false;
	}

	const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
	const summary = (d: AppData) =>
		`${plural(d.students.length, 'Student')}, ${plural(d.schedules.length, 'Schedule')} and ${plural(d.sessions.length, 'Session')}`;
</script>

<svelte:head>
	<title>{crumbs.at(-1) ? `${crumbs.at(-1)!.label} · ` : ''}Service Scheduler</title>
</svelte:head>

<!-- The welcome pages stand on their own, without the app around them. -->
{#if !bare}
	<nav
		class="rail no-print"
		class:expanded
		aria-label="Sections"
		onpointerenter={(e) => e.pointerType === 'mouse' && expandLater(true)}
		onpointerleave={(e) => e.pointerType === 'mouse' && expandLater(false)}
		onfocusin={() => {
			clearTimeout(timer);
			expanded = true;
		}}
		onfocusout={(e) => {
			if (!e.currentTarget.contains(e.relatedTarget as Node | null)) collapseNow();
		}}
	>
		<a class="item brand" href="/caseload" onclick={collapseNow}>
			<span class="glyph"><img src="/favicon.svg" alt="" width="28" height="28" /></span>
			<span class="label">Service Scheduler</span>
		</a>
		{#each links as { href, label, icon: Icon } (href)}
			<a
				{href}
				class="item"
				class:active={isActive(href)}
				aria-current={isActive(href) ? 'page' : undefined}
				title={expanded ? undefined : label}
				onclick={collapseNow}
			>
				<span class="glyph"><Icon size={18} /></span>
				<span class="label">{label}</span>
			</a>
		{/each}
		<div class="foot">
			<a
				href="/settings"
				class="item"
				class:active={isActive('/settings')}
				aria-current={isActive('/settings') ? 'page' : undefined}
				title={expanded ? undefined : 'Settings'}
				onclick={collapseNow}
			>
				<span class="glyph"><Settings size={18} /></span>
				<span class="label">Settings</span>
			</a>
			<button
				class="item"
				aria-haspopup="dialog"
				title={expanded ? undefined : 'Help'}
				onclick={() => {
					collapseNow();
					helpOpen = true;
				}}
			>
				<span class="glyph"><CircleQuestionMark size={20} /></span>
				<span class="label">Help</span>
			</button>
		</div>
	</nav>

	<div class="frame">
		<header class="topbar no-print">
			<nav aria-label="Breadcrumb">
				<ol class="crumbs">
					{#each crumbs as crumb, i (i)}
						<li>
							{#if i > 0}<ChevronRight size={14} aria-hidden="true" />{/if}
							{#if crumb.href && i < crumbs.length - 1}
								<a href={crumb.href}>{crumb.label}</a>
							{:else}
								<span aria-current="page">{crumb.label}</span>
							{/if}
						</li>
					{/each}
				</ol>
			</nav>
			<a class="credit" href="https://teacher.dev" target="_blank" rel="noopener noreferrer">
				<img src="/edtechathon-logo.svg" alt="" width="20" height="20" />
				Built by teacher.dev
			</a>
		</header>
		<main>{@render children()}</main>
	</div>
{:else}
	{@render children()}
{/if}

{#if !bare && onboarding.showChecklist}
	<GettingStarted />
{/if}

<!-- Drop an exported file or a backup anywhere to import it. -->
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
		importer.open(e.dataTransfer?.files[0]);
	}}
/>

{#if dragDepth > 0}
	<div class="dropzone">
		<div><FileUp size={28} /> Drop a Service Scheduler file to import it</div>
	</div>
{/if}

{#if importer.pending}
	<ImportDialog
		file={importer.pending.file}
		filename={importer.pending.filename}
		onclose={() => (importer.pending = null)}
	/>
{/if}

{#if importer.restoring}
	{@const backup = importer.restoring}
	<Modal
		title="Restore this backup?"
		confirmLabel="Replace everything"
		danger
		oncancel={() => (importer.restoring = null)}
		onconfirm={() => {
			store.restoreBackup(backup.data);
			importer.restoring = null;
		}}
	>
		<p>
			Everything here now ({summary(store.data)}) will be replaced by
			<strong>{backup.filename}</strong> ({summary(backup.data)}).
		</p>
		<p class="muted">You can undo this right after.</p>
	</Modal>
{/if}

{#if helpOpen}
	<HelpDialog onclose={() => (helpOpen = false)} />
{/if}

{#if importer.error}
	<Modal
		title="Couldn’t import that file"
		confirmLabel="OK"
		onconfirm={() => (importer.error = null)}
		oncancel={() => (importer.error = null)}
	>
		<p>{importer.error}</p>
	</Modal>
{/if}

<style>
	.rail {
		--rail: 56px;
		position: fixed;
		inset: 0 auto 0 0;
		z-index: 40;
		width: var(--rail);
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 8px;
		box-sizing: border-box;
		background: white;
		border-right: 1px solid var(--line);
		overflow: hidden;
		transition:
			width 160ms ease,
			box-shadow 160ms ease;
	}
	.rail.expanded {
		width: 220px;
		box-shadow: 8px 0 28px rgb(0 0 0 / 0.12);
	}
	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 38px;
		padding: 0;
		border: none;
		border-radius: 8px;
		background: none;
		color: var(--muted);
		text-decoration: none;
		font-weight: 500;
		white-space: nowrap;
		text-align: left;
	}
	.item:hover:not(:disabled) {
		background: var(--surface-2);
		color: var(--text);
	}
	.item.active {
		color: var(--accent-strong);
		background: var(--accent-soft);
	}
	.glyph {
		flex: none;
		width: 40px;
		display: grid;
		place-items: center;
	}
	.label {
		opacity: 0;
		transition: opacity 120ms ease;
	}
	.expanded .label {
		opacity: 1;
	}
	.brand {
		color: var(--text);
		font-weight: 700;
		margin-bottom: 10px;
	}
	.brand:hover {
		background: none;
	}
	.brand .glyph img {
		display: block;
	}
	.foot {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.credit {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
		font-size: 13px;
		text-decoration: none;
		white-space: nowrap;
	}
	.credit:hover {
		color: var(--accent-strong);
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		height: var(--topbar-h);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		padding: 0 28px;
		background: white;
		border-bottom: 1px solid var(--line);
	}
	.crumbs {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 14px;
	}
	.crumbs li {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--muted);
	}
	.crumbs a {
		color: var(--muted);
		text-decoration: none;
	}
	.crumbs a:hover {
		color: var(--text);
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.crumbs [aria-current='page'] {
		color: var(--text);
		font-weight: 600;
	}
	.frame {
		margin-left: 56px;
	}
	@media print {
		.frame {
			margin-left: 0;
		}
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

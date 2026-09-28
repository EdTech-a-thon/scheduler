<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		{ href: '/settings', label: 'Account' },
		{ href: '/settings/about', label: 'About' },
		{ href: '/settings/privacy', label: 'Privacy' }
	];
</script>

<div class="page">
	<div class="page-head">
		<h1>Settings</h1>
	</div>
	<nav class="tabs" aria-label="Settings">
		{#each tabs as t (t.href)}
			<a
				href={t.href}
				class:active={page.url.pathname === t.href}
				aria-current={page.url.pathname === t.href ? 'page' : undefined}>{t.label}</a
			>
		{/each}
	</nav>
	<div class="body">{@render children()}</div>
</div>

<style>
	.tabs {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--line);
		margin-bottom: 18px;
	}
	.tabs a {
		padding: 8px 12px;
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
		color: var(--muted);
		text-decoration: none;
		font-weight: 500;
	}
	.tabs a:hover {
		color: var(--text);
	}
	.tabs a.active {
		color: var(--accent-strong);
		border-bottom-color: var(--accent);
	}
	.body {
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	/* The tabs' shared card look. */
	.body :global(.card) {
		background: white;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 20px 22px;
	}
	.body :global(.card h2) {
		margin: 0 0 6px;
		font-size: 16px;
	}
	.body :global(.card p) {
		margin: 0 0 8px;
		line-height: 1.55;
	}
	.body :global(.card p:last-child) {
		margin-bottom: 0;
	}
	.body :global(.card a) {
		color: var(--accent-strong);
		text-underline-offset: 3px;
	}
</style>

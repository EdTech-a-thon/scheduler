<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<header>
	<a class="wordmark" href="/welcome">
		<img src="/favicon.svg" alt="" width="32" height="32" />
		Service Scheduler
	</a>
	<nav aria-label="Site">{@render children?.()}</nav>
</header>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		max-width: 1120px;
		margin: 0 auto;
		padding: 18px 28px;
	}
	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		font-size: 17px;
		font-weight: 700;
		text-decoration: none;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 6px 22px;
	}
	nav :global(a:not(.cta)) {
		color: var(--muted);
		font-weight: 600;
		text-decoration: none;
	}
	nav :global(a:not(.cta):hover) {
		color: var(--text);
	}
</style>

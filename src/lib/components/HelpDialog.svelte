<script lang="ts">
	import { Lightbulb, X } from '@lucide/svelte';
	import { focusOnMount } from './focus';

	let { onclose }: { onclose: () => void } = $props();

	const SUPPORT_EMAIL = 'support@teacher.dev';

	// Focus goes back to the help button (or wherever it was) on close.
	const previous = document.activeElement as HTMLElement | null;
	$effect(() => () => requestAnimationFrame(() => previous?.isConnected && previous.focus()));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div
	class="backdrop"
	role="presentation"
	onpointerdown={(e) => e.target === e.currentTarget && onclose()}
>
	<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
		<header>
			<h2 id="help-title">Need a hand?</h2>
			<button class="icon" aria-label="Close help" onclick={onclose}><X size={16} /></button>
		</header>
		<p>
			If you’re running into trouble or have suggestions, email us at
			<a use:focusOnMount href="mailto:{SUPPORT_EMAIL}?subject=Service%20Scheduler"
				>{SUPPORT_EMAIL}</a
			>.
		</p>
		<p class="more">
			Wondering how your data is handled, or who made this? See our
			<a href="/settings/about" onclick={onclose}>About</a> and
			<a href="/settings/privacy" onclick={onclose}>Privacy</a> pages.
		</p>
		<p class="hint">
			<Lightbulb size={14} />
			<span
				>Tip: everything is saved in this browser only. Back it up anytime from
				<a href="/settings" onclick={onclose}>Settings</a>.</span
			>
		</p>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgb(15 18 25 / 0.35);
		display: grid;
		place-items: center;
		z-index: 100;
	}
	.dialog {
		background: white;
		border-radius: 12px;
		padding: 18px 22px 22px;
		width: min(440px, calc(100vw - 32px));
		box-shadow: 0 20px 50px rgb(0 0 0 / 0.25);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	h2 {
		margin: 0;
		font-size: 17px;
	}
	p {
		margin: 0;
		font-size: 15px;
		line-height: 1.6;
	}
	.more {
		margin-top: 12px;
		font-size: 14px;
		color: #3b3f46;
	}
	.hint {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		margin-top: 16px;
		padding: 10px 12px;
		border-radius: 8px;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 13px;
		line-height: 1.5;
	}
	.hint :global(svg) {
		flex: none;
		margin-top: 3px;
	}
	.more a,
	.hint a {
		font-weight: 500;
	}
	a {
		color: var(--accent-strong);
		font-weight: 600;
		text-underline-offset: 4px;
	}
</style>

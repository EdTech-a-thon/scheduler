<script lang="ts">
	import { focusOnMount } from './focus';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		confirmLabel: string;
		danger?: boolean;
		/** When set, the Provider must type this to enable the confirm button. */
		typeToConfirm?: string;
		disabled?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
		children: Snippet;
	}

	let {
		title,
		confirmLabel,
		danger = false,
		typeToConfirm,
		disabled = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	let typed = $state('');
	const ready = $derived(!disabled && (!typeToConfirm || typed.trim() === typeToConfirm.trim()));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && oncancel()} />

<div
	class="backdrop"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && oncancel()}
>
	<div class="modal" role="dialog" aria-modal="true" aria-label={title}>
		<h2>{title}</h2>
		<div class="content">{@render children()}</div>
		{#if typeToConfirm}
			<label class="type">
				<span>Type <strong>{typeToConfirm}</strong> to confirm</span>
				<input
					use:focusOnMount
					bind:value={typed}
					onkeydown={(e) => e.key === 'Enter' && ready && onconfirm()}
				/>
			</label>
		{/if}
		<div class="actions">
			<button onclick={oncancel}>Cancel</button>
			<button class={danger ? 'danger' : 'primary'} disabled={!ready} onclick={onconfirm}>
				{confirmLabel}
			</button>
		</div>
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
	.modal {
		background: white;
		border-radius: 12px;
		padding: 20px 22px;
		width: min(480px, calc(100vw - 32px));
		box-shadow: 0 20px 50px rgb(0 0 0 / 0.25);
	}
	h2 {
		margin: 0 0 10px;
		font-size: 17px;
	}
	.content {
		font-size: 14px;
		line-height: 1.5;
		color: #3b3f46;
	}
	.type {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 14px;
		font-size: 13px;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 18px;
	}
</style>

<script lang="ts">
	import { Check, ChevronDown, ChevronUp, X } from '@lucide/svelte';
	import { onboarding } from '$lib/state/persisted.svelte';
	import { store } from '$lib/state/store.svelte';

	/**
	 * The getting-started checklist in the corner. Each item ticks itself off
	 * from what's really there; once the last one ticks, it says so and goes.
	 * Settings can bring it back.
	 */
	const items = $derived([
		{ label: 'Add your Students', href: '/caseload', done: store.data.students.length > 0 },
		{ label: 'Add your Schedules', href: '/schedules', done: store.data.schedules.length > 0 },
		{ label: 'Start planning', href: '/planner', done: onboarding.visitedPlanner }
	]);
	const count = $derived(items.filter((i) => i.done).length);
	const allDone = $derived(count === items.length);

	let collapsed = $state(false);

	// Finishing the last item while it's showing celebrates briefly, then hides it.
	// Brought back from Settings already complete, it stays until closed.
	// svelte-ignore state_referenced_locally
	const doneOnOpen = allDone;
	$effect(() => {
		if (!allDone || doneOnOpen) return;
		const t = setTimeout(() => (onboarding.showChecklist = false), 2600);
		return () => clearTimeout(t);
	});
</script>

<aside class="checklist no-print" class:collapsed aria-label="Getting started">
	<header>
		<button class="toggle" aria-expanded={!collapsed} onclick={() => (collapsed = !collapsed)}>
			<span class="title">{allDone ? 'You’re all set!' : 'Getting started'}</span>
			<span class="progress">{count} of {items.length}</span>
			{#if collapsed}<ChevronUp size={15} />{:else}<ChevronDown size={15} />{/if}
		</button>
		<button
			class="icon close"
			aria-label="Hide the checklist"
			title="Hide (bring it back from Settings)"
			onclick={() => (onboarding.showChecklist = false)}
		>
			<X size={15} />
		</button>
	</header>
	<div class="meter"><span style:width="{(count / items.length) * 100}%"></span></div>
	{#if !collapsed}
		<ol>
			{#each items as item (item.label)}
				<li class:done={item.done}>
					<span class="box"
						>{#if item.done}<Check size={12} strokeWidth={3} />{/if}</span
					>
					{#if item.done}
						<span>{item.label}</span>
					{:else}
						<a href={item.href}>{item.label}</a>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</aside>

<style>
	.checklist {
		position: fixed;
		right: 20px;
		bottom: 20px;
		z-index: 45;
		width: 250px;
		background: white;
		border: 1px solid var(--line);
		border-radius: 12px;
		box-shadow:
			0 12px 32px rgb(0 0 0 / 0.14),
			0 2px 6px rgb(0 0 0 / 0.06);
		overflow: hidden;
		animation: arrive 260ms both;
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
	header {
		display: flex;
		align-items: center;
		padding: 4px 4px 4px 0;
	}
	.toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
		background: none;
		padding: 8px 6px 8px 14px;
		text-align: left;
	}
	.toggle:hover:not(:disabled) {
		background: none;
	}
	.title {
		font-weight: 700;
	}
	.progress {
		margin-left: auto;
		color: var(--muted);
		font-size: 12px;
	}
	.close {
		color: var(--muted);
	}
	.meter {
		height: 3px;
		margin: 0 14px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.meter span {
		display: block;
		height: 100%;
		background: #16a34a;
		transition: width 300ms ease;
	}
	.collapsed .meter {
		margin-bottom: 12px;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 10px 14px 14px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.box {
		flex: none;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		box-sizing: border-box;
		border: 1.5px solid #c4c8cf;
		border-radius: 50%;
		color: white;
	}
	li.done .box {
		background: #16a34a;
		border-color: #16a34a;
		animation: tick 260ms both;
	}
	@keyframes tick {
		from {
			transform: scale(0.6);
		}
	}
	li.done span:last-child {
		color: var(--muted);
		text-decoration: line-through;
	}
	a {
		color: var(--text);
		font-weight: 500;
		text-decoration: none;
	}
	a:hover {
		color: var(--accent-strong);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>

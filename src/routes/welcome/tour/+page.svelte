<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';
	import StepArt from '$lib/components/welcome/StepArt.svelte';
	import WelcomeHeader from '$lib/components/welcome/WelcomeHeader.svelte';
	import { STEPS } from '$lib/components/welcome/steps';
	import { onboarding } from '$lib/state/persisted.svelte';

	// Reaching the tour counts as being welcomed, so Home isn't the pitch again.
	onboarding.welcomed = true;

	let index = $state(0);
	const step = $derived(STEPS[index]);
	const last = $derived(index === STEPS.length - 1);

	function finish() {
		onboarding.showChecklist = true;
		goto('/caseload');
	}

	function next() {
		if (last) finish();
		else index++;
	}
</script>

<svelte:head><title>Get started · Service Scheduler</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'ArrowRight' && !last) index++;
		if (e.key === 'ArrowLeft' && index > 0) index--;
	}}
/>

<div class="tour">
	<WelcomeHeader>
		<a href="/caseload" onclick={() => (onboarding.showChecklist = true)}>Skip the tour</a>
	</WelcomeHeader>

	<main>
		<div class="copy">
			{#key index}
				<!-- Room for a two-line title on every step, so the buttons never jump. -->
				<div class="heading">
					<p class="count">Step {index + 1} of {STEPS.length}</p>
					<h1>{step.title}</h1>
				</div>
				<p class="lede">{step.text}</p>
			{/key}
			<div class="actions">
				{#if index > 0}
					<button class="back" onclick={() => index--}><ArrowLeft size={16} /> Back</button>
				{/if}
				<button class="next" onclick={next}>
					{last ? 'Get started' : 'Next'}
					<ArrowRight size={16} />
				</button>
			</div>
			<div class="dots" role="tablist" aria-label="Steps">
				{#each STEPS as s, i (s.key)}
					<button
						role="tab"
						aria-selected={i === index}
						aria-label="Step {i + 1}: {s.title}"
						class:on={i === index}
						onclick={() => (index = i)}
					></button>
				{/each}
			</div>
		</div>
		<div class="picture">
			{#key index}<StepArt step={step.key} />{/key}
		</div>
	</main>
</div>

<style>
	.tour {
		min-height: 100vh;
		background: linear-gradient(180deg, #f0fdf4, white 60%);
	}
	main {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: 56px;
		max-width: 1120px;
		/* Fill the window below the header, so the step sits in the middle. */
		min-height: calc(100vh - 68px);
		box-sizing: border-box;
		margin: 0 auto;
		padding: 0 28px 68px;
	}
	.heading {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		min-height: calc(2.16 * clamp(32px, 3.8vw, 44px) + 42px);
	}
	.count {
		margin: 0 0 12px;
		color: #16a34a;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0 0 16px;
		font-size: clamp(32px, 3.8vw, 44px);
		line-height: 1.08;
		letter-spacing: -0.02em;
		animation: fade 300ms both;
	}
	.lede {
		max-width: 480px;
		min-height: 6.4em;
		margin: 0 0 28px;
		color: #4b5160;
		font-size: 17px;
		line-height: 1.6;
		animation: fade 300ms both 60ms;
	}
	@keyframes fade {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		h1,
		.lede {
			animation: none;
		}
	}
	.actions {
		display: flex;
		gap: 10px;
	}
	.actions button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 18px;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 600;
	}
	.next {
		background: #16a34a;
		border-color: #16a34a;
		color: white;
		box-shadow: 0 6px 18px rgb(22 163 74 / 0.25);
	}
	.next:hover:not(:disabled) {
		background: #15803d;
	}
	.dots {
		display: flex;
		gap: 8px;
		margin-top: 32px;
	}
	.dots button {
		width: 28px;
		height: 6px;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: #d1d5db;
	}
	.dots button:hover:not(:disabled) {
		background: #9ca3af;
	}
	.dots button.on {
		background: #16a34a;
	}
	.picture {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 360px;
	}
	@media (max-width: 860px) {
		main {
			grid-template-columns: 1fr;
			gap: 32px;
		}
	}
</style>

<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import StepArt from '$lib/components/welcome/StepArt.svelte';
	import WelcomeHeader from '$lib/components/welcome/WelcomeHeader.svelte';
	import { STEPS } from '$lib/components/welcome/steps';
	import { onboarding } from '$lib/state/persisted.svelte';
	import { store } from '$lib/state/store.svelte';

	/** Someone with work here is offered the way back to it. */
	const returning = $derived(
		onboarding.welcomed || store.data.students.length > 0 || store.data.schedules.length > 0
	);
</script>

<svelte:head><title>Welcome · Service Scheduler</title></svelte:head>

<div class="landing">
	<WelcomeHeader>
		<a href="#how-it-works">How it works</a>
		<a href="/settings/about">About</a>
		{#if returning}<a href="/caseload">Open the app</a>{/if}
		<a class="cta small" href="/welcome/tour">Get started <ArrowRight size={15} /></a>
	</WelcomeHeader>

	<main>
		<section class="hero">
			<div class="copy">
				<h1>Find the time that works for every Student.</h1>
				<p class="lede">
					Layer the school day, each grade’s recess and lunch, and every Student’s own schedule on
					top of each other. Service Scheduler shows you the time your whole group is free, so you
					can book Sessions without the guesswork.
				</p>
				<a class="cta" href="/welcome/tour">Get started, it’s free <ArrowRight size={18} /></a>
				<p class="fineprint">Runs in your browser. Nothing to install, no account to make.</p>
			</div>
			<StepArt step="combine" />
		</section>

		<section class="band" id="how-it-works" aria-labelledby="how-heading">
			<div class="section">
				<h2 id="how-heading">How it works</h2>
				<ol class="steps">
					{#each STEPS as { key, Icon, title, short }, i (key)}
						<li>
							<span class="mark"><span class="num">{i + 1}</span><Icon size={20} /></span>
							<h3>{title}</h3>
							<p>{short}</p>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<section class="section" aria-labelledby="local-heading">
			<div class="local">
				<h2 id="local-heading">We’re completely local.</h2>
				<p>
					Your Caseload, Schedules and Sessions are saved in your own browser and never uploaded
					anywhere. There’s no account, no server and no tracking, and you can back everything up to
					a file whenever you like.
				</p>
				<a class="cta" href="/welcome/tour">Get started <ArrowRight size={18} /></a>
			</div>
		</section>
	</main>
</div>

<style>
	.landing {
		min-height: 100vh;
		background: white;
	}
	h1,
	h2 {
		letter-spacing: -0.02em;
	}
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
		align-items: center;
		gap: 48px;
		max-width: 1120px;
		margin: 0 auto;
		padding: 48px 28px 80px;
	}
	.hero :global(.art) {
		justify-self: end;
		max-width: 540px;
	}
	h1 {
		margin: 0 0 18px;
		font-size: clamp(36px, 4.6vw, 54px);
		line-height: 1.05;
	}
	.lede {
		max-width: 520px;
		margin: 0 0 30px;
		color: #4b5160;
		font-size: 18px;
		line-height: 1.55;
	}
	.fineprint {
		margin: 14px 0 0;
		color: var(--muted);
		font-size: 13.5px;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 13px 22px;
		border-radius: 10px;
		background: #16a34a;
		color: white;
		font-size: 16px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 6px 18px rgb(22 163 74 / 0.25);
	}
	.cta:hover {
		background: #15803d;
	}
	:global(.cta.small) {
		padding: 8px 14px;
		font-size: 14px;
		box-shadow: none;
	}
	.band {
		background: var(--page);
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.section {
		max-width: 1120px;
		margin: 0 auto;
		padding: 64px 28px;
	}
	.section h2 {
		margin: 0 0 28px;
		font-size: clamp(26px, 3vw, 34px);
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 18px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		padding: 22px 20px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: white;
	}
	.mark {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
		color: #16a34a;
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #dcfce7;
		font-weight: 700;
	}
	.steps h3 {
		margin: 0 0 8px;
		font-size: 16px;
	}
	.steps p {
		margin: 0;
		color: #4b5160;
		line-height: 1.55;
	}
	.local {
		max-width: 760px;
		margin: 0 auto;
		padding: 44px 32px 40px;
		text-align: center;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: #f0fdf4;
	}
	.local h2 {
		margin-bottom: 14px;
	}
	.local p {
		margin: 0 auto 26px;
		max-width: 600px;
		color: #4b5160;
		font-size: 16px;
		line-height: 1.6;
	}
	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
		}
		.hero :global(.art) {
			justify-self: stretch;
			max-width: none;
		}
		.steps {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>

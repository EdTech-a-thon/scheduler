<script lang="ts">
	import { Plus, User, X } from '@lucide/svelte';
	import { describeCondition, normalizeText } from '$lib/domain/audience';
	import { conditionChoices } from '$lib/domain/options';
	import { NAME_PROPERTY_ID, type Condition } from '$lib/domain/types';
	import { store } from '$lib/state/store.svelte';
	import { focusOnMount } from './focus';
	import Popover from './Popover.svelte';
	import PropertyIcon from './PropertyIcon.svelte';

	interface Props {
		conditions: Condition[];
		onchange: (conditions: Condition[]) => void;
		addLabel: string;
	}

	let { conditions, onchange, addLabel }: Props = $props();

	let openIdx = $state<number | null>(null);
	let adding = $state(false);
	let search = $state('');

	const properties = $derived(store.data.properties);

	function typeOf(propertyId: string) {
		if (propertyId === NAME_PROPERTY_ID) return 'select';
		return properties.find((p) => p.id === propertyId)?.type ?? 'select';
	}

	function add(propertyId: string) {
		const c: Condition =
			typeOf(propertyId) === 'checkbox'
				? { propertyId, op: 'checked' }
				: { propertyId, op: 'anyOf', values: [] };
		// Take the index first: `conditions` already includes the new one once onchange returns.
		const index = conditions.length;
		onchange([...conditions, c]);
		adding = false;
		search = '';
		openIdx = index;
	}

	function replace(i: number, c: Condition) {
		onchange(conditions.map((x, j) => (j === i ? c : x)));
	}

	function remove(i: number) {
		onchange(conditions.filter((_, j) => j !== i));
		openIdx = null;
	}

	function toggleValue(i: number, value: string) {
		const c = conditions[i];
		if (c.op !== 'anyOf') return;
		const has = c.values.some((v) => normalizeText(v) === normalizeText(value));
		replace(i, {
			...c,
			values: has
				? c.values.filter((v) => normalizeText(v) !== normalizeText(value))
				: [...c.values, value]
		});
	}
</script>

<div class="conditions">
	{#each conditions as c, i (i)}
		<Popover bind:open={() => openIdx === i, (v) => (openIdx = v ? i : null)}>
			{#snippet trigger({ toggle })}
				<button
					class="chip"
					class:empty={c.op === 'anyOf' && c.values.length === 0}
					onclick={() => {
						search = '';
						toggle();
					}}
				>
					{describeCondition(c, properties)}
				</button>
			{/snippet}
			{#snippet children()}
				{#if c.op === 'anyOf'}
					{@const values = conditionChoices(c, store.data)}
					<input class="search" placeholder="Search values…" bind:value={search} use:focusOnMount />
					<div class="options">
						{#each values.filter((v) => normalizeText(v).includes(normalizeText(search))) as v (v)}
							<label class="option">
								<input
									type="checkbox"
									checked={c.values.some((x) => normalizeText(x) === normalizeText(v))}
									onchange={() => toggleValue(i, v)}
								/>
								{v}
							</label>
						{:else}
							<div class="none">
								{values.length === 0 ? 'This Property has no Options yet.' : 'No matches.'}
							</div>
						{/each}
					</div>
				{:else}
					<div class="options">
						<label class="option">
							<input
								type="radio"
								checked={c.op === 'checked'}
								onchange={() => replace(i, { propertyId: c.propertyId, op: 'checked' })}
							/>
							Is checked
						</label>
						<label class="option">
							<input
								type="radio"
								checked={c.op === 'unchecked'}
								onchange={() => replace(i, { propertyId: c.propertyId, op: 'unchecked' })}
							/>
							Is unchecked
						</label>
					</div>
				{/if}
				<button class="remove" onclick={() => remove(i)}><X size={14} /> Remove</button>
			{/snippet}
		</Popover>
	{/each}

	<Popover bind:open={adding}>
		{#snippet trigger({ toggle })}
			<button class="add" onclick={toggle}><Plus size={14} /> {addLabel}</button>
		{/snippet}
		{#snippet children()}
			<div class="options">
				<button class="pick" onclick={() => add(NAME_PROPERTY_ID)}><User size={14} /> Name</button>
				{#each properties as p (p.id)}
					<button class="pick" onclick={() => add(p.id)}>
						<PropertyIcon name={p.icon} />
						{p.name}
					</button>
				{/each}
			</div>
		{/snippet}
	</Popover>
</div>

<style>
	.conditions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	.chip {
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent-strong);
		border: 1px solid transparent;
		padding: 4px 10px;
		font-size: 13px;
	}
	.chip.empty {
		background: #fff4e5;
		color: #9a5b00;
	}
	.add {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
		background: none;
		border: 1px dashed var(--line);
		border-radius: 999px;
		padding: 4px 10px;
	}
	.search {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 4px;
	}
	.options {
		display: flex;
		flex-direction: column;
		max-height: 240px;
		overflow: auto;
	}
	.option,
	.pick {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 5px;
		font-size: 13px;
		cursor: pointer;
		background: none;
		border: none;
		text-align: left;
	}
	.option:hover,
	.pick:hover {
		background: var(--surface-2);
	}
	.none {
		padding: 6px 8px;
		color: var(--muted);
		font-size: 13px;
	}
	.remove {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		margin-top: 4px;
		border: none;
		border-top: 1px solid var(--line);
		border-radius: 0;
		background: none;
		padding: 8px;
		color: #c62a2f;
		font-size: 13px;
	}
</style>

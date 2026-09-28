<script lang="ts" module>
	import { normalizeText } from '$lib/domain/audience';

	// Soft Notion-like tints; an Option always gets the same one.
	const TINTS = [
		['#e3e2e0', '#32302c'],
		['#eee0da', '#442a1e'],
		['#fadec9', '#49290e'],
		['#fbeecc', '#402c1b'],
		['#dbeddb', '#1c3829'],
		['#d3e5ef', '#183347'],
		['#e8deee', '#412454'],
		['#f5e0e9', '#4c2337'],
		['#ffe2dd', '#5d1715']
	];

	export function tint(value: string): string[] {
		let h = 0;
		for (const ch of normalizeText(value)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
		return TINTS[h % TINTS.length];
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children?: Snippet } = $props();
	const [bg, fg] = $derived(tint(label));
</script>

<span class="badge" style:background={bg} style:color={fg}>{label}{@render children?.()}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		max-width: 100%;
		border-radius: 4px;
		padding: 1px 7px;
		font-size: 13px;
		line-height: 1.5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>

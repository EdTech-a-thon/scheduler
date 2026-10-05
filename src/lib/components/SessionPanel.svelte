<script lang="ts">
	import { Trash2, TriangleAlert, X } from '@lucide/svelte';
	import { providerConflicts, sessionConflicts } from '$lib/domain/freeTime';
	import {
		DAY_NAMES,
		DAY_SHORT,
		DAYS,
		GRID_END,
		GRID_START,
		carryMinuteWrap,
		formatDays,
		formatRange,
		fromTimeInput,
		toTimeInput
	} from '$lib/domain/time';
	import type { Day, Session } from '$lib/domain/types';
	import { store } from '$lib/state/store.svelte';
	import ProviderPicker from './ProviderPicker.svelte';

	let { session, onclose }: { session: Session; onclose: () => void } = $props();

	const students = $derived(store.data.students);
	const names = $derived(
		session.studentIds.map((id) => students.find((s) => s.id === id)?.name).filter(Boolean)
	);
	/** One line per Student and blocker, listing the days it clashes. */
	const conflicts = $derived.by(() => {
		const grouped = new Map<string, { name: string; label: string; days: Day[] }>();
		for (const c of sessionConflicts(session, store.data)) {
			const name = students.find((s) => s.id === c.studentId)?.name ?? '';
			for (const b of c.blockers) {
				const key = `${c.studentId}|${b.id}`;
				const entry = grouped.get(key) ?? { name, label: b.label, days: [] };
				entry.days.push(c.day);
				grouped.set(key, entry);
			}
		}
		for (const c of providerConflicts(session, store.data.sessions)) {
			const name = store.data.providers.find((p) => p.id === c.providerId)?.name ?? '';
			const key = `${c.providerId}|${c.other.id}`;
			const entry = grouped.get(key) ?? {
				name,
				label: c.other.title || otherNames(c.other.studentIds) || 'Another Session',
				days: []
			};
			entry.days.push(c.day);
			grouped.set(key, entry);
		}
		return [...grouped.entries()];
	});
	function otherNames(ids: string[]) {
		return ids
			.map((id) => students.find((s) => s.id === id)?.name)
			.filter(Boolean)
			.join(', ');
	}
	const addable = $derived(students.filter((s) => !session.studentIds.includes(s.id)));

	const update = (fn: (s: Session) => void) => store.updateSession(session.id, fn);

	function setDays(startDay: Day, endDay: Day) {
		update((s) => {
			s.startDay = Math.min(startDay, endDay) as Day;
			s.endDay = Math.max(startDay, endDay) as Day;
		});
	}

	/** Only arrow-key steps carry into the hour; typing ":00" means :00. */
	let stepping = false;

	function setTime(which: 'start' | 'end', input: HTMLInputElement) {
		const typed = fromTimeInput(input.value);
		const m = typed === null ? null : stepping ? carryMinuteWrap(session[which], typed) : typed;
		const ok =
			m !== null &&
			m >= GRID_START &&
			m <= GRID_END &&
			(which === 'start' ? m < session.end : m > session.start);
		if (!ok) {
			input.value = toTimeInput(session[which]);
			return;
		}
		if (m !== typed) input.value = toTimeInput(m);
		update((s) => (s[which] = m));
	}
</script>

<div class="panel">
	<div class="head">
		<span class="muted"
			>{formatDays(session.startDay, session.endDay)} · {formatRange(
				session.start,
				session.end
			)}</span
		>
		<button class="icon" aria-label="Close" onclick={onclose}><X size={16} /></button>
	</div>

	<input
		class="title"
		placeholder={names.join(', ') || 'Untitled Session'}
		value={session.title}
		onchange={(e) => update((s) => (s.title = e.currentTarget.value.trim()))}
	/>

	<div class="row">
		<label>
			From
			<select
				value={session.startDay}
				onchange={(e) => setDays(Number(e.currentTarget.value) as Day, session.endDay)}
			>
				{#each DAYS as d (d)}<option value={d}>{DAY_NAMES[d]}</option>{/each}
			</select>
		</label>
		<label>
			To
			<select
				value={session.endDay}
				onchange={(e) => setDays(session.startDay, Number(e.currentTarget.value) as Day)}
			>
				{#each DAYS as d (d)}<option value={d}>{DAY_NAMES[d]}</option>{/each}
			</select>
		</label>
	</div>
	<div class="row">
		<label>
			Start
			<input
				type="time"
				step="300"
				value={toTimeInput(session.start)}
				onkeydown={(e) => (stepping = e.key === 'ArrowUp' || e.key === 'ArrowDown')}
				onchange={(e) => setTime('start', e.currentTarget)}
			/>
		</label>
		<label>
			End
			<input
				type="time"
				step="300"
				value={toTimeInput(session.end)}
				onkeydown={(e) => (stepping = e.key === 'ArrowUp' || e.key === 'ArrowDown')}
				onchange={(e) => setTime('end', e.currentTarget)}
			/>
		</label>
	</div>

	<section>
		<h3>Providers</h3>
		<ProviderPicker
			providers={store.data.providers}
			meId={store.data.meId}
			selectedIds={session.providerIds}
			onadd={(id) => update((x) => void (x.providerIds.includes(id) || x.providerIds.push(id)))}
			onremove={(id) => update((x) => (x.providerIds = x.providerIds.filter((i) => i !== id)))}
			oncreate={(name) => store.addProvider(name)}
		/>
	</section>

	<section>
		<h3>Students</h3>
		<div class="chips">
			{#each session.studentIds as id (id)}
				{@const s = students.find((x) => x.id === id)}
				{#if s}
					<span class="chip">
						{s.name}
						<button
							class="x"
							aria-label="Remove {s.name}"
							onclick={() => update((x) => (x.studentIds = x.studentIds.filter((i) => i !== id)))}
						>
							<X size={12} />
						</button>
					</span>
				{/if}
			{:else}
				<span class="muted">No Students</span>
			{/each}
		</div>
		{#if addable.length}
			<select
				class="add"
				value=""
				onchange={(e) => {
					const id = e.currentTarget.value;
					if (id) update((x) => x.studentIds.push(id));
					e.currentTarget.value = '';
				}}
			>
				<option value="">+ Add Student…</option>
				{#each addable as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
			</select>
		{/if}
	</section>

	{#if conflicts.length}
		<section class="conflicts">
			<h3><TriangleAlert size={13} /> Conflicts</h3>
			<ul>
				{#each conflicts as [key, c] (key)}
					<li>
						<strong>{c.name}</strong>: {c.label}
						<span class="muted">({c.days.map((d) => DAY_SHORT[d]).join(', ')})</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section>
		<h3>Notes</h3>
		<textarea
			rows="5"
			value={session.notes}
			onchange={(e) => update((s) => (s.notes = e.currentTarget.value))}></textarea>
	</section>

	<button
		class="delete"
		onclick={() => {
			store.deleteSession(session.id);
			onclose();
		}}
	>
		<Trash2 size={14} /> Delete Session
	</button>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
	}
	.title {
		font-size: 16px;
		font-weight: 600;
	}
	.row {
		display: flex;
		gap: 8px;
	}
	.row label {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		color: var(--muted);
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin: 0 0 8px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: var(--surface-2);
		border-radius: 999px;
		padding: 2px 4px 2px 10px;
		font-size: 12px;
	}
	.x {
		border: none;
		background: none;
		padding: 2px;
		display: grid;
		border-radius: 999px;
	}
	.add {
		width: 100%;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
	}
	.conflicts h3 {
		color: #c62a2f;
	}
	.conflicts ul {
		margin: 0;
		padding-left: 16px;
		font-size: 13px;
		line-height: 1.5;
	}
	.delete {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--danger);
		align-self: flex-start;
	}
</style>

import { clone } from './clone';
import type { Day, Minute, Span } from './types';

export interface Rect {
	startDay: Day;
	endDay: Day;
	start: Minute;
	end: Minute;
}

export function coversDay(span: Rect, day: Day): boolean {
	return day >= span.startDay && day <= span.endDay;
}

export function spanOverlapsRect(span: Rect, rect: Rect): boolean {
	return (
		span.startDay <= rect.endDay &&
		rect.startDay <= span.endDay &&
		span.start < rect.end &&
		rect.start < span.end
	);
}

export type NewId = () => string;

/**
 * Copy a Span with changes. The first piece of any split keeps the original id
 * so selection follows it; every other piece gets a fresh id.
 */
function piece<T extends Span>(original: T, patch: Partial<Rect>, id: string): T {
	return clone({ ...original, ...patch, id });
}

function pieces<T extends Span>(original: T, parts: Partial<Rect>[], newId: NewId): T[] {
	return parts.map((p, i) => piece(original, p, i === 0 ? original.id : newId()));
}

/**
 * Erase a rectangle out of a Span. Each day the eraser touches is split out
 * of the Linked Days; days erased together stay linked to each other.
 */
export function eraseFromSpan<T extends Span>(span: T, rect: Rect, newId: NewId): T[] {
	if (!spanOverlapsRect(span, rect)) return [span];
	const parts: Partial<Rect>[] = [];
	const hitStart = Math.max(span.startDay, rect.startDay) as Day;
	const hitEnd = Math.min(span.endDay, rect.endDay) as Day;

	if (span.startDay < hitStart)
		parts.push({ startDay: span.startDay, endDay: (hitStart - 1) as Day });
	if (span.start < rect.start)
		parts.push({ startDay: hitStart, endDay: hitEnd, start: span.start, end: rect.start });
	if (rect.end < span.end)
		parts.push({ startDay: hitStart, endDay: hitEnd, start: rect.end, end: span.end });
	if (hitEnd < span.endDay) parts.push({ startDay: (hitEnd + 1) as Day, endDay: span.endDay });

	return pieces(span, parts, newId);
}

export function eraseFromSpans<T extends Span>(spans: T[], rect: Rect, newId: NewId): T[] {
	return spans.flatMap((s) => eraseFromSpan(s, rect, newId));
}

/** Split one day out of the Linked Days, leaving the rest linked on either side. */
export function detachDay<T extends Span>(span: T, day: Day, newId: NewId): T[] {
	if (!coversDay(span, day) || span.startDay === span.endDay) return [span];
	const parts: Partial<Rect>[] = [];
	if (span.startDay < day) parts.push({ startDay: span.startDay, endDay: (day - 1) as Day });
	parts.push({ startDay: day, endDay: day });
	if (day < span.endDay) parts.push({ startDay: (day + 1) as Day, endDay: span.endDay });
	return pieces(span, parts, newId);
}

export function splitAllDays<T extends Span>(span: T, newId: NewId): T[] {
	const parts: Partial<Rect>[] = [];
	for (let d = span.startDay; d <= span.endDay; d++) parts.push({ startDay: d, endDay: d });
	return pieces(span, parts, newId);
}

export function deleteDay<T extends Span>(span: T, day: Day, newId: NewId): T[] {
	if (!coversDay(span, day)) return [span];
	const parts: Partial<Rect>[] = [];
	if (span.startDay < day) parts.push({ startDay: span.startDay, endDay: (day - 1) as Day });
	if (day < span.endDay) parts.push({ startDay: (day + 1) as Day, endDay: span.endDay });
	return pieces(span, parts, newId);
}

/** Replace one Span in a list with the pieces an operation produced, keeping order. */
export function replaceSpan<T extends Span>(list: T[], id: string, replacement: T[]): T[] {
	const i = list.findIndex((s) => s.id === id);
	if (i === -1) return list;
	return [...list.slice(0, i), ...replacement, ...list.slice(i + 1)];
}

/** The right-click actions on a Window or Session. */
export type SpanAction = 'detach' | 'split' | 'deleteDay' | 'delete';

/** What a Span becomes under an action, for both applying and previewing it. */
export function applySpanAction<T extends Span>(
	action: SpanAction,
	span: T,
	day: Day,
	newId: NewId
): T[] {
	switch (action) {
		case 'detach':
			return detachDay(span, day, newId);
		case 'split':
			return splitAllDays(span, newId);
		case 'deleteDay':
			return deleteDay(span, day, newId);
		case 'delete':
			return [];
	}
}

/** The smallest single Span containing every given Span: what a merge produces. */
export function mergeBounds(spans: Rect[]): Rect {
	return {
		startDay: Math.min(...spans.map((s) => s.startDay)) as Day,
		endDay: Math.max(...spans.map((s) => s.endDay)) as Day,
		start: Math.min(...spans.map((s) => s.start)),
		end: Math.max(...spans.map((s) => s.end))
	};
}

/**
 * The time a merge fills in that none of the Spans covered, one Rect per gap
 * per day, so a preview can show exactly what gets added.
 */
export function mergeAdditions(spans: Rect[]): Rect[] {
	const b = mergeBounds(spans);
	const out: Rect[] = [];
	for (let d = b.startDay; d <= b.endDay; d++) {
		const day = d as Day;
		const covered = spans
			.filter((s) => coversDay(s, day))
			.map((s) => [s.start, s.end] as const)
			.sort((x, y) => x[0] - y[0]);
		let reached = b.start;
		for (const [s, e] of covered) {
			if (s > reached) out.push({ startDay: day, endDay: day, start: reached, end: s });
			reached = Math.max(reached, e);
		}
		if (reached < b.end) out.push({ startDay: day, endDay: day, start: reached, end: b.end });
	}
	// Join identical gaps on neighbouring days into one block.
	const joined: Rect[] = [];
	for (const r of out) {
		const prev = joined.find(
			(j) => j.start === r.start && j.end === r.end && j.endDay === r.startDay - 1
		);
		if (prev) prev.endDay = r.endDay;
		else joined.push({ ...r });
	}
	return joined;
}

/**
 * Whether a selection can merge, and why not if it can't. Any two or more can:
 * the result fills out to the smallest rectangle around them all.
 */
export function mergeCheck(
	spans: Rect[]
): { rect: Rect; reason?: undefined } | { rect?: undefined; reason: string } {
	if (spans.length < 2) return { reason: 'Select two or more to merge' };
	return { rect: mergeBounds(spans) };
}

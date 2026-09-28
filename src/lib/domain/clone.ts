/**
 * Deep copy for plain data. Unlike structuredClone, this also copies
 * reactive proxies (e.g. Svelte $state), which callers may hand the domain.
 */
export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

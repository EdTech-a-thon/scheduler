/** Schedule colors, chosen to stay distinguishable when striped together. */
export const PALETTE = [
	'#e5484d',
	'#f76b15',
	'#e2a336',
	'#30a46c',
	'#12a594',
	'#00a2c7',
	'#0090ff',
	'#6e56cf',
	'#ab4aba',
	'#e93d82',
	'#8fb31d',
	'#5b6b82'
] as const;

export function nextColor(used: string[]): string {
	return PALETTE.find((c) => !used.includes(c)) ?? PALETTE[used.length % PALETTE.length];
}

/** Colors retired for being too close to each other, and what replaced them. */
export const RETIRED_COLORS: Record<string, string> = {
	'#978365': '#8fb31d',
	'#7c7c75': '#5b6b82'
};

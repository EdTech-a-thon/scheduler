import { CalendarRange, LayoutGrid, Tags, Users } from '@lucide/svelte';

/** The four ideas the welcome page and tour walk through, in order. */
export const STEPS = [
	{
		key: 'caseload',
		Icon: Users,
		title: 'Start with your Caseload',
		short: 'List every Student you serve. A name is all it takes to begin.',
		text: 'Add every Student you serve, one per row. A name is all it takes to get going, and you can import a Caseload a teammate exported.'
	},
	{
		key: 'properties',
		Icon: Tags,
		title: 'Tag Students with Properties',
		short: 'Give each Student a Grade and a Teacher, so Schedules know who they’re for.',
		text: 'Give each Student a Grade and a Teacher. Properties are how a Schedule finds the Students it applies to, so tagging once saves you picking Students by hand later.'
	},
	{
		key: 'schedules',
		Icon: CalendarRange,
		title: 'Draw the Schedules they follow',
		short: 'School Hours for everyone, then recess and lunch for each grade.',
		text: 'Draw each Schedule once on the week. An Allow Schedule like School Hours marks when Students can be seen; a Deny Schedule like 4th Grade recess and lunch marks when they can’t. Choose who each one applies to by Property.'
	},
	{
		key: 'combine',
		Icon: LayoutGrid,
		title: 'Combine them and plan',
		short: 'Pick Students in the Planner and see the time they’re all free.',
		text: 'In the Planner, pick Students and all of their Schedules layer together: here a 4th grader and a 5th grader. What stays white is free for everyone, so book your Session right there.'
	}
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

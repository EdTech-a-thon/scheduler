/** Minutes since midnight. */
export type Minute = number;

/** 0 = Monday … 4 = Friday. */
export type Day = 0 | 1 | 2 | 3 | 4;

export type PropertyType = 'select' | 'checkbox';

export interface Property {
	id: string;
	name: string;
	type: PropertyType;
	/** A Select Property's Options, kept even when no Student uses them. Empty for Checkboxes. */
	options: string[];
	/** Name of the icon shown with the Property, from the curated set. */
	icon: string;
}

export type PropertyValue = string | boolean;

export interface Student {
	id: string;
	name: string;
	/** Keyed by Property id. A missing key means the value is unset. */
	values: Record<string, PropertyValue>;
}

/** Sentinel property id for Conditions on a Student's Name. */
export const NAME_PROPERTY_ID = '__name__';

export type Condition =
	| { propertyId: string; op: 'anyOf'; values: string[] }
	| { propertyId: string; op: 'checked' | 'unchecked' };

/**
 * Everyone, or Students matching all Conditions. The Conditions are kept while
 * Everyone is chosen, so switching back doesn't lose them.
 */
export interface Audience {
	kind: 'everyone' | 'conditions';
	conditions: Condition[];
}

/**
 * A time range repeated across a contiguous run of Linked Days
 * (startDay..endDay inclusive). Both Windows and Sessions are Spans.
 */
export interface Span {
	id: string;
	startDay: Day;
	endDay: Day;
	start: Minute;
	end: Minute;
}

export type Window = Span;

/** Allow: Students can only be seen in the marked time. Deny: they can't be seen in it. */
export type ScheduleMode = 'allow' | 'deny';

export interface Schedule {
	id: string;
	name: string;
	color: string;
	mode: ScheduleMode;
	audience: Audience;
	windows: Window[];
}

export interface Session extends Span {
	title: string;
	notes: string;
	studentIds: string[];
}

export interface AppData {
	properties: Property[];
	students: Student[];
	schedules: Schedule[];
	sessions: Session[];
}

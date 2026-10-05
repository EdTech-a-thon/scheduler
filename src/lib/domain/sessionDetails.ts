import type { Property, Session, Student } from './types';

/** One Student as Sessions show them: their Name, then their values for the Properties shown in Sessions. */
export interface StudentLine {
	name: string;
	details: string[];
}

/**
 * A Student's values for the Properties shown in Sessions, in Caseload order.
 * A Select shows its Option; a Checkbox shows its name when checked. Unset
 * values are left out.
 */
export function studentDetails(student: Student, properties: Property[]): string[] {
	const out: string[] = [];
	for (const p of properties) {
		if (!p.showInSessions) continue;
		const v = student.values[p.id];
		if (p.type === 'checkbox') {
			if (v === true) out.push(p.name);
		} else if (p.type === 'select') {
			if (typeof v === 'string' && v.trim()) out.push(v);
		}
	}
	return out;
}

/** A Session's Students, one line each, skipping any no longer on the Caseload. */
export function studentLines(
	session: Session,
	students: Student[],
	properties: Property[]
): StudentLine[] {
	const byId = new Map(students.map((s) => [s.id, s]));
	return session.studentIds
		.map((id) => byId.get(id))
		.filter((s) => !!s)
		.map((s) => ({ name: s.name, details: studentDetails(s, properties) }));
}

/** "Ava Lopez · 4th · EL" */
export const formatStudentLine = (line: StudentLine) => [line.name, ...line.details].join(' · ');

// ABOUTME: The KCSE subject catalogue as KNEC publishes it in the KCSE user guide, Table 2: code,
// ABOUTME: name and group, plus the combinations the entry rules test for.

import { KNEC_KCSE_USER_GUIDE, type KnecSource } from './sources';

/** The group a KCSE subject is entered under. Group I is compulsory, the rest are options. */
export type SubjectGroup = 1 | 2 | 3 | 4 | 5;

export interface Subject {
  readonly code: string;
  readonly name: string;
  readonly group: SubjectGroup;
  /** A condition KNEC prints beside the subject, such as the one attached to 237. */
  readonly note?: string;
}

/** Where the catalogue comes from, so the plug-in can show it rather than assert it. */
export const KCSE_SUBJECT_SOURCE: KnecSource = KNEC_KCSE_USER_GUIDE;

/**
 * The subject list of the KCSE user guide, §2.8.1 Table 2.
 *
 * The names are KNEC's, with typographic quotes and ampersands written plainly so the file stays
 * ASCII where the subject itself is. The codes are the ones the portal keys a candidate's subjects
 * by; `CODE`, not the name, is what a registration is refused over.
 */
export const KCSE_SUBJECTS: readonly Subject[] = [
  // Group I: all compulsory, one Mathematics option.
  { code: '101', name: 'English', group: 1 },
  { code: '102', name: 'Kiswahili', group: 1 },
  { code: '121', name: 'Mathematics Option A', group: 1 },
  { code: '122', name: 'Mathematics Option B', group: 1 },
  // Group II: the sciences.
  { code: '231', name: 'Biology', group: 2 },
  { code: '232', name: 'Physics', group: 2 },
  { code: '233', name: 'Chemistry', group: 2 },
  { code: '236', name: 'Biology for the Blind', group: 2 },
  { code: '237', name: 'General Science', group: 2, note: 'to be taken with 122' },
  // Group III: the humanities, with one religious education option.
  { code: '311', name: 'History and Government', group: 3 },
  { code: '312', name: 'Geography', group: 3 },
  { code: '313', name: 'Christian Religious Education', group: 3 },
  { code: '314', name: 'Islamic Religious Education', group: 3 },
  { code: '315', name: 'Hindu Religious Education', group: 3 },
  // Group IV: the applied and technical subjects.
  { code: '441', name: 'Home Science', group: 4 },
  { code: '442', name: 'Art and Design', group: 4 },
  { code: '443', name: 'Agriculture', group: 4 },
  { code: '444', name: 'Woodwork', group: 4 },
  { code: '445', name: 'Metal Work', group: 4 },
  { code: '446', name: 'Building Construction', group: 4 },
  { code: '447', name: 'Power Mechanics', group: 4 },
  { code: '448', name: 'Electricity', group: 4 },
  { code: '449', name: 'Drawing and Design', group: 4 },
  { code: '450', name: 'Aviation Technology', group: 4 },
  { code: '451', name: 'Computer Studies', group: 4 },
  // Group V: the languages and the remaining options.
  { code: '501', name: 'French', group: 5 },
  { code: '502', name: 'German', group: 5 },
  { code: '503', name: 'Arabic', group: 5 },
  { code: '504', name: 'Kenyan Sign Language', group: 5 },
  { code: '511', name: 'Music', group: 5 },
  { code: '565', name: 'Business Studies', group: 5 },
];

/** The two subjects every candidate enters, except where the sign-language route replaces 102. */
export const COMPULSORY_CODES: readonly string[] = ['101', '102'];

/** A candidate takes one of these and not both. */
export const MATHEMATICS_OPTIONS: readonly string[] = ['121', '122'];

/** A candidate takes at most one religious education subject. */
export const RELIGIOUS_EDUCATION_OPTIONS: readonly string[] = ['313', '314', '315'];

const BY_CODE = new Map(KCSE_SUBJECTS.map((subject) => [subject.code, subject]));

/** The subject a code names, or undefined when KNEC's list does not hold it. */
export function subjectByCode(code: string): Subject | undefined {
  return BY_CODE.get(code);
}

/** True when `code` is a KCSE subject code the catalogue holds. */
export function isKnownSubjectCode(code: string): boolean {
  return BY_CODE.has(code);
}

/** The subjects of one group, in catalogue order. */
export function subjectsInGroup(group: SubjectGroup): Subject[] {
  return KCSE_SUBJECTS.filter((subject) => subject.group === group);
}

// ABOUTME: The rules migration M3 applies to the legacy people rows: the phone normalisation the
// ABOUTME: guardian de-duplication compares, the name split, and the canonical statuses.

import type {
  ENTRY_REASONS,
  EXIT_REASONS,
  ENROLMENT_STATUSES,
  GENDERS,
  GUARDIAN_RELATIONSHIPS,
  LEARNER_STATUSES,
} from '@/domain/schema';

export type Gender = (typeof GENDERS)[number];
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];
export type LearnerStatus = (typeof LEARNER_STATUSES)[number];
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];
export type EntryReason = (typeof ENTRY_REASONS)[number];
export type ExitReason = (typeof EXIT_REASONS)[number];

/** The country the test data and the legacy seed were written in. */
export const PHONE_COUNTRY = 'KE';

/** The calling code a national number takes. */
export const PHONE_COUNTRY_CODE = '+254';

/**
 * What the guardian de-duplication compares.
 *
 * The legacy data writes one guardian's number two ways: `0711 223 344` in a national
 * field, `+254 711 223 344` when the row came from an import. The canonical form is E.164,
 * so the rule is:
 *
 * 1. Drop the separators a person types: spaces, dots, dashes, parentheses and slashes.
 * 2. A number that already starts with `+` keeps its digits as they are.
 * 3. A number that starts with `00` replaces that prefix with `+`.
 * 4. A 12-digit number that starts with `254` takes a `+`.
 * 5. A 10-digit number that starts with `0` replaces that `0` with `+254`.
 * 6. A 9-digit number that starts with `7` or `1` takes `+254` (the leading `0` was dropped).
 * 7. Anything else cannot be normalised, and the row is reported rather than guessed at.
 *
 * Two rows whose numbers normalise to the same value name one guardian. `+254711223344`,
 * `254711223344`, `0711223344` and `0711 223 344` are therefore one phone.
 */
export const PHONE_NORMALISATION_RULE =
  'a phone is normalised to E.164: separators are dropped, `00` becomes `+`, a national `0` and a 9-digit number take the +254 country code, and a number that cannot be normalised is reported';

const E164 = /^\+[1-9]\d{1,14}$/;

/** The E.164 value of a legacy phone, or null with the rule that refused it. */
export interface NormalisedPhone {
  readonly value: string | null;
  /** What the rule did, for the migration report. */
  readonly rule: string;
  /** True when the legacy value held nothing to normalise. */
  readonly empty: boolean;
}

function settled(value: string, rule: string): NormalisedPhone {
  if (!E164.test(value)) {
    return { value: null, rule: `${rule}, but "${value}" is not an E.164 number`, empty: false };
  }
  return { value, rule, empty: false };
}

/** Normalises a legacy phone number to the E.164 form the de-duplication compares. */
export function normaliseLegacyPhone(raw: string | null): NormalisedPhone {
  if (raw === null || raw.trim() === '') {
    return { value: null, rule: 'the row carries no phone', empty: true };
  }

  const compact = raw.trim().replace(/[\s().\-/]/g, '');
  const digits = compact.replace(/\D/g, '');
  if (digits === '') {
    return { value: null, rule: `the phone "${raw}" carries no digit`, empty: false };
  }

  if (compact.startsWith('+')) {
    return settled(`+${digits}`, `the phone "${raw}" carries its country code`);
  }
  if (digits.startsWith('00')) {
    return settled(`+${digits.slice(2)}`, `the phone "${raw}" starts with the international prefix 00`);
  }
  if (digits.length === 12 && digits.startsWith('254')) {
    return settled(`+${digits}`, `the phone "${raw}" carries the country code 254`);
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return settled(
      `${PHONE_COUNTRY_CODE}${digits.slice(1)}`,
      `the phone "${raw}" is a national number whose leading 0 becomes ${PHONE_COUNTRY_CODE}`
    );
  }
  if (digits.length === 9 && /^[17]/.test(digits)) {
    return settled(
      `${PHONE_COUNTRY_CODE}${digits}`,
      `the phone "${raw}" is a national number without its leading 0 and takes ${PHONE_COUNTRY_CODE}`
    );
  }
  return {
    value: null,
    rule: `the phone "${raw}" is not a number the migration can normalise to E.164`,
    empty: false,
  };
}

/** A legacy person name, split into the canonical person fields. */
export interface PersonNameParts {
  readonly givenName: string;
  readonly middleNames: readonly string[];
  /** Null when the name carries one word and no family name can be read from it. */
  readonly familyName: string | null;
}

/**
 * Splits a legacy free-text name: the first word is the given name, the last is the family
 * name, and anything between them is a middle name. A one-word name has no family name the
 * migration can read, so the row is reported rather than half-written.
 */
export function legacyNameParts(raw: string | null): PersonNameParts | null {
  if (raw === null) return null;
  const words = raw.trim().split(/\s+/).filter((word) => word !== '');
  if (words.length === 0) return null;
  if (words.length === 1) {
    return { givenName: words[0], middleNames: [], familyName: null };
  }
  return {
    givenName: words[0],
    middleNames: words.slice(1, -1),
    familyName: words[words.length - 1],
  };
}

const RELATIONSHIPS: Readonly<Record<string, GuardianRelationship>> = {
  father: 'father',
  dad: 'father',
  daddy: 'father',
  mother: 'mother',
  mum: 'mother',
  mom: 'mother',
  mummy: 'mother',
  parent: 'guardian',
  guardian: 'guardian',
  grandparent: 'grandparent',
  grandfather: 'grandparent',
  grandmother: 'grandparent',
  grandpa: 'grandparent',
  grandma: 'grandparent',
  granny: 'grandparent',
  sibling: 'sibling',
  brother: 'sibling',
  sister: 'sibling',
  sponsor: 'sponsor',
};

/**
 * The canonical relationship a legacy relationship type names.
 *
 * A type the canonical enum does not carry (`Uncle`, `Aunt`, `Cousin`) is `other`; a row
 * that names none is a `guardian`, the word the legacy table uses for every guardian.
 */
export function guardianRelationship(raw: string | null): GuardianRelationship {
  if (raw === null) return 'guardian';
  return RELATIONSHIPS[raw.trim().toLowerCase()] ?? 'other';
}

/** The canonical gender a legacy gender names. */
export function learnerGender(raw: string | null): Gender {
  const value = raw === null ? '' : raw.trim().toLowerCase();
  if (value === 'male' || value === 'm') return 'male';
  if (value === 'female' || value === 'f') return 'female';
  if (value === 'other') return 'other';
  return 'not_stated';
}

/** What a legacy learner status becomes: the learner row and the enrolment row it implies. */
export interface LearnerStatusMapping {
  readonly learnerStatus: LearnerStatus;
  readonly enrolmentStatus: EnrolmentStatus;
  /** The reason the enrolment ended, when the learner left. */
  readonly exitReason: ExitReason | null;
  /** False when the legacy status is one the canonical model does not name. */
  readonly known: boolean;
}

/**
 * The learner and enrolment status a legacy student status becomes.
 *
 * The legacy status is a lifecycle: `Active` is an enrolled learner, `Alumni` graduated,
 * `Transferred` left for another school, `Expelled` and `Withdrawn` left, and `Suspended`
 * is still enrolled. A status the legacy build never wrote leaves the learner enrolled and
 * is reported, never guessed at.
 */
export function learnerStatus(raw: string | null): LearnerStatusMapping {
  const value = raw === null ? '' : raw.trim().toLowerCase();
  switch (value) {
    case 'active':
      return { learnerStatus: 'enrolled', enrolmentStatus: 'active', exitReason: null, known: true };
    case 'alumni':
    case 'graduated':
      return {
        learnerStatus: 'graduated',
        enrolmentStatus: 'completed',
        exitReason: 'graduated',
        known: true,
      };
    case 'transferred':
      return {
        learnerStatus: 'transferred_out',
        enrolmentStatus: 'left',
        exitReason: 'transferred_out',
        known: true,
      };
    case 'expelled':
      return {
        learnerStatus: 'withdrawn',
        enrolmentStatus: 'left',
        exitReason: 'expelled',
        known: true,
      };
    case 'withdrawn':
      return {
        learnerStatus: 'withdrawn',
        enrolmentStatus: 'left',
        exitReason: 'withdrawn',
        known: true,
      };
    case 'suspended':
      return { learnerStatus: 'suspended', enrolmentStatus: 'active', exitReason: null, known: true };
    case 'deceased':
      return {
        learnerStatus: 'deceased',
        enrolmentStatus: 'left',
        exitReason: 'deceased',
        known: true,
      };
    default:
      return { learnerStatus: 'enrolled', enrolmentStatus: 'active', exitReason: null, known: false };
  }
}

/**
 * Why the learner entered the class group the enrolment records.
 *
 * A learner admitted on or after the first day of the academic year entered it as a new
 * admission; one admitted earlier was already at the school and the year's class is a
 * promotion. A legacy row without an admission date is an admission: the migration has no
 * earlier year to call it a continuation of.
 */
export function entryReason(admissionDate: string | null, yearStartDate: string): EntryReason {
  if (admissionDate === null) return 'new_admission';
  return admissionDate >= yearStartDate ? 'new_admission' : 'promoted';
}

/**
 * The day an enrolment starts.
 *
 * The legacy row gives the learner's admission date and nothing about the year's enrolment, so
 * the enrolment starts on that date. It falls back to the academic year's first day when the
 * legacy row carries no date, and when the date is after the year the enrolment belongs to and
 * the enrolment also ends (an end before its start would be a row the canonical model refuses).
 */
export function enrolmentStartDate(
  admissionDate: string | null,
  yearStartDate: string,
  yearEndDate: string,
  endsTheEnrolment: boolean
): string {
  if (admissionDate === null) return yearStartDate;
  if (endsTheEnrolment && admissionDate > yearEndDate) return yearStartDate;
  return admissionDate;
}

/**
 * True for the relationships the migration treats as carrying parental responsibility.
 *
 * The legacy row carries no such flag, so the primary guardian and the parent relationships
 * carry it. The assumption is recorded in the migration report.
 */
export function carriesParentalResponsibility(
  relationship: GuardianRelationship,
  isPrimary: boolean
): boolean {
  return isPrimary || relationship === 'mother' || relationship === 'father' || relationship === 'guardian';
}

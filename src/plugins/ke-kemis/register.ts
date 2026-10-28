// ABOUTME: Builds the KEMIS learner register: one CSV row per active learner, the documented column
// ABOUTME: list and quoting rules, and a refusal that names every row the register cannot hold.

/** The status a learner must hold to appear in the register: the one the directory calls active. */
const ACTIVE_STATUS = 'enrolled';

/**
 * The column list, in the order the file writes it.
 *
 * The header is this module's own: no KEMIS file layout is published, so the names are chosen to be
 * unambiguous rather than copied. See README.md for what a registrar must confirm.
 */
export const KEMIS_COLUMNS = [
  { key: 'upi', header: 'UPI' },
  { key: 'surname', header: 'SURNAME' },
  { key: 'first_name', header: 'FIRST_NAME' },
  { key: 'middle_names', header: 'MIDDLE_NAMES' },
  { key: 'sex', header: 'SEX' },
  { key: 'date_of_birth', header: 'DATE_OF_BIRTH' },
  { key: 'class_name', header: 'CLASS' },
  { key: 'admission_number', header: 'ADMISSION_NUMBER' },
  { key: 'guardian_name', header: 'GUARDIAN_NAME' },
  { key: 'guardian_relationship', header: 'GUARDIAN_RELATIONSHIP' },
  { key: 'guardian_phone', header: 'GUARDIAN_PHONE' },
  { key: 'institution_code', header: 'INSTITUTION_CODE' },
] as const;

export type KemisColumnKey = (typeof KEMIS_COLUMNS)[number]['key'];

/** One register row, already reduced to the text that goes in the file. */
export type KemisRow = Readonly<Record<KemisColumnKey, string>>;

/** The genders the canonical learner schema holds, in this plug-in's own vocabulary. */
export const GENDERS = ['female', 'male', 'other', 'not_stated'] as const;

export type LearnerGender = (typeof GENDERS)[number];

/** How each gender is written in the file. No official code list is published, so the word is used. */
const GENDER_TEXT: Readonly<Record<LearnerGender, string>> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  not_stated: 'Not stated',
};

/** The learner statuses the canonical schema holds. */
export const LEARNER_STATUSES = [
  'applicant',
  'enrolled',
  'suspended',
  'withdrawn',
  'transferred_out',
  'graduated',
  'deceased',
] as const;

export type LearnerStatus = (typeof LEARNER_STATUSES)[number];

/** The learner's primary contact, as far as the register carries one. */
export interface GuardianContact {
  readonly name: string;
  readonly relationship?: string;
  readonly phone?: string;
}

/** One learner, in the shape the register reads. A host adapter maps the school's records to this. */
export interface KemisLearner {
  /** The school's own identifier, used only to name a refused row and a skipped learner. */
  readonly learnerId: string;
  readonly upi: string;
  readonly givenName: string;
  readonly middleNames?: readonly string[];
  readonly familyName: string;
  readonly gender: LearnerGender;
  readonly dateOfBirth?: string;
  readonly admissionNumber: string;
  readonly className: string;
  readonly status: LearnerStatus;
  readonly guardian?: GuardianContact;
}

export interface KemisRegisterInput {
  /** The school's code as printed on its KEMIS record. */
  readonly institutionCode: string;
  readonly learners: readonly KemisLearner[];
  /** When the file was produced; the caller passes the clock so the output is reproducible. */
  readonly generatedAt: string;
  /** Whether the guardian columns are filled in. They stay in the header either way. */
  readonly includeGuardianContacts?: boolean;
  /** Whether the file starts with a UTF-8 byte-order mark, which Excel needs to read it as UTF-8. */
  readonly byteOrderMark?: boolean;
}

/** A learner the register left out, and why. */
export interface SkippedLearner {
  readonly learnerId: string;
  readonly status: LearnerStatus;
  readonly reason: string;
}

export interface KemisRegister {
  readonly rows: readonly KemisRow[];
  /** The whole file as text, byte-order mark included when the options ask for one. */
  readonly csv: string;
  readonly encoding: 'utf-8';
  readonly fileName: string;
  readonly skipped: readonly SkippedLearner[];
  /** How far the layout has been checked against the authority's own. Nothing here is verified. */
  readonly formatStatus: 'draft';
}

/** One reason a register was refused: the field it was reading, and what is wrong with it. */
export interface ExportIssue {
  readonly path: string;
  readonly message: string;
}

/** Thrown when a register cannot be written; `issues` lists every refused row, not just the first. */
export class KemisExportError extends Error {
  readonly issues: readonly ExportIssue[];

  constructor(issues: readonly ExportIssue[]) {
    super(`the KEMIS register cannot be written: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`);
    this.name = 'KemisExportError';
    this.issues = issues;
  }
}

const E164 = /^\+[1-9]\d{1,14}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isGender(value: string): value is LearnerGender {
  return (GENDERS as readonly string[]).includes(value);
}

/** True for a `YYYY-MM-DD` date that exists in the calendar. */
function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Escapes one field: a comma, a quote, a newline, or a leading or trailing space forces quoting. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value) || value.trim() !== value) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Plain code-unit order, so the same set of learners always produces the same file on any host. */
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

function compareRows(left: KemisRow, right: KemisRow): number {
  return (
    compareText(left.class_name, right.class_name) ||
    compareText(left.surname, right.surname) ||
    compareText(left.first_name, right.first_name) ||
    compareText(left.admission_number, right.admission_number)
  );
}

/** The part of the institution code a file name can carry. */
function fileSafeCode(institutionCode: string): string {
  return institutionCode
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function text(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Builds the KEMIS learner register.
 *
 * One row per active learner, sorted by class then name so the same learners always give the same
 * file. Every mandatory field is checked before a single row is written: a register that would
 * upload a partial learner is refused whole, and the refusal names each row and field.
 */
export function buildRegister(input: KemisRegisterInput): KemisRegister {
  const issues: ExportIssue[] = [];
  const institutionCode = text(input.institutionCode);
  if (!institutionCode) {
    issues.push({ path: 'institutionCode', message: 'the school institution code is mandatory' });
  }
  const generatedAt = new Date(input.generatedAt);
  if (Number.isNaN(generatedAt.getTime())) {
    issues.push({ path: 'generatedAt', message: 'the generation time must be an instant such as 2026-10-28T09:15:00.000Z' });
  }

  const includeGuardianContacts = input.includeGuardianContacts !== false;
  const byteOrderMark = input.byteOrderMark !== false;

  const rows: KemisRow[] = [];
  const skipped: SkippedLearner[] = [];
  const firstSeenAt = new Map<string, number>();

  input.learners.forEach((learner, index) => {
    const path = `learners[${index}]`;
    if (learner.status !== ACTIVE_STATUS) {
      skipped.push({
        learnerId: learner.learnerId,
        status: learner.status,
        reason: `status "${learner.status}" is not "${ACTIVE_STATUS}"`,
      });
      return;
    }

    const upi = text(learner.upi);
    if (!upi) issues.push({ path: `${path}.upi`, message: 'the KEMIS UPI is mandatory' });
    const familyName = text(learner.familyName);
    if (!familyName) issues.push({ path: `${path}.familyName`, message: 'the surname is mandatory' });
    const givenName = text(learner.givenName);
    if (!givenName) issues.push({ path: `${path}.givenName`, message: 'the first name is mandatory' });
    if (!isGender(learner.gender)) {
      issues.push({ path: `${path}.gender`, message: 'the sex must be female, male, other or not_stated' });
    }
    const dateOfBirth = text(learner.dateOfBirth);
    if (!dateOfBirth) {
      issues.push({ path: `${path}.dateOfBirth`, message: 'the date of birth is mandatory' });
    } else if (!isRealDate(dateOfBirth)) {
      issues.push({ path: `${path}.dateOfBirth`, message: 'the date of birth must be a real date written YYYY-MM-DD' });
    }
    const className = text(learner.className);
    if (!className) issues.push({ path: `${path}.className`, message: 'the class is mandatory' });
    const admissionNumber = text(learner.admissionNumber);
    if (!admissionNumber) {
      issues.push({ path: `${path}.admissionNumber`, message: 'the admission number is mandatory' });
    }

    const guardian = learner.guardian;
    const guardianName = text(guardian?.name);
    if (guardian && !guardianName) {
      issues.push({ path: `${path}.guardian.name`, message: 'a guardian contact must have a name' });
    }
    const guardianPhone = text(guardian?.phone);
    if (guardianPhone && !E164.test(guardianPhone)) {
      issues.push({
        path: `${path}.guardian.phone`,
        message: 'the guardian phone must be in international form, such as +254712345678',
      });
    }

    if (upi) {
      const seenAt = firstSeenAt.get(upi);
      if (seenAt === undefined) {
        firstSeenAt.set(upi, index);
      } else {
        issues.push({
          path: `${path}.upi`,
          message: `the UPI "${upi}" is already held by the learner at learners[${seenAt}]`,
        });
      }
    }

    rows.push({
      upi,
      surname: familyName,
      first_name: givenName,
      middle_names: (learner.middleNames ?? []).map(text).filter(Boolean).join(' '),
      sex: isGender(learner.gender) ? GENDER_TEXT[learner.gender] : '',
      date_of_birth: dateOfBirth,
      class_name: className,
      admission_number: admissionNumber,
      guardian_name: includeGuardianContacts ? guardianName : '',
      guardian_relationship: includeGuardianContacts ? text(guardian?.relationship) : '',
      guardian_phone: includeGuardianContacts ? guardianPhone : '',
      institution_code: institutionCode,
    });
  });

  if (issues.length > 0) throw new KemisExportError(issues);

  const ordered = [...rows].sort(compareRows);
  const records = [
    KEMIS_COLUMNS.map((column) => column.header),
    ...ordered.map((row) => KEMIS_COLUMNS.map((column) => row[column.key])),
  ];
  const body = `${records.map((record) => record.map(csvField).join(',')).join('\r\n')}\r\n`;
  const day = generatedAt.toISOString().slice(0, 10);

  return {
    rows: ordered,
    csv: byteOrderMark ? `\uFEFF${body}` : body,
    encoding: 'utf-8',
    fileName: `kemis-learner-register_${fileSafeCode(institutionCode)}_${day}.csv`,
    skipped,
    formatStatus: 'draft',
  };
}

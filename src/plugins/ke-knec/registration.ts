// ABOUTME: Builds the KNEC candidate registration: candidate and subject-entry CSV files plus a JSON
// ABOUTME: bundle, with the published index-number bands and the KCSE entry rules enforced.

import {
  INDEX_BANDS,
  bandForSubjectCount,
  centrePrefix,
  formatIndexNumber,
  parseIndexNumber,
  validateCentre,
  type CentreIdentity,
  type IndexBand,
} from './indexNumbers';
import {
  KNEC_KCSE_USER_GUIDE,
  KNEC_EXAMINATION_PORTAL,
  KNEC_REGISTRATION_SERVICE_PAGE,
  type KnecSource,
} from './sources';
import {
  MATHEMATICS_OPTIONS,
  RELIGIOUS_EDUCATION_OPTIONS,
  subjectByCode,
  type Subject,
} from './subjects';

/** The KNEC examinations this plug-in knows about. */
export type KnecExamId = 'kcse' | 'kcpe';

export interface KnecExam {
  readonly id: KnecExamId;
  readonly label: string;
  /** `modelled` exams can be exported; a `retired` one is listed so the refusal can explain it. */
  readonly status: 'modelled' | 'retired';
  readonly note: string;
}

/**
 * The examinations the portal lists, and how far this plug-in models each.
 *
 * KCSE is the one the KNEC user guide gives entry and index-number rules for. KCPE is kept in the
 * catalogue so a school asking for it is told what happened to it instead of getting a guess.
 */
export const KNEC_EXAMS: Readonly<Record<KnecExamId, KnecExam>> = {
  kcse: {
    id: 'kcse',
    label: 'Kenya Certificate of Secondary Education',
    status: 'modelled',
    note: 'candidate entry and index numbers follow the KCSE user guide, 2nd Edition 2024',
  },
  kcpe: {
    id: 'kcpe',
    label: 'Kenya Certificate of Primary Education',
    status: 'retired',
    note: 'KCPE cannot be exported from this plug-in: the KNEC portal now lists primary and junior school assessment under the CBA portal and offers no KCPE candidate registration, and no KCPE registration layout is published. Export a KCSE registration instead, or key legacy KCPE records on the portal.',
  },
};

/** How a candidate is entered: first attempt, or one of the two repeater codes (user guide §2.3.20). */
export type KnecEntryType = 'first_attempt' | 'full_repeater' | 'partial_repeater';

/** The single-digit code KNEC keys the entry type by. */
export const ENTRY_CODES: Readonly<Record<KnecEntryType, string>> = {
  first_attempt: '1',
  full_repeater: '2',
  partial_repeater: '3',
};

/** Which subject takes the second compulsory language slot (user guide §2.8.4). */
export type KnecLanguageRoute = 'kiswahili' | 'kenyan_sign_language';

/** One candidate, in the shape a registration reads. A host adapter maps the school's records here. */
export interface KnecCandidate {
  readonly learnerId: string;
  readonly admissionNumber: string;
  readonly surname: string;
  readonly givenNames: string;
  readonly sex: 'female' | 'male' | 'other' | 'not_stated';
  readonly dateOfBirth: string;
  readonly entryType: KnecEntryType;
  /** The subject codes entered, in any order; the file writes them ascending. */
  readonly subjects: readonly string[];
  /** Defaults to the Kiswahili route. */
  readonly languageRoute?: KnecLanguageRoute;
  /** An index number the school has already been given; omitted means this export allocates one. */
  readonly indexNumber?: string;
  readonly kcpeIndexNumber?: string;
  readonly kcpeYear?: string;
}

export interface KnecRegistrationInput {
  readonly exam: KnecExamId;
  readonly centre: CentreIdentity;
  readonly candidates: readonly KnecCandidate[];
  /** When the files were produced; the caller passes the clock so the output is reproducible. */
  readonly generatedAt: string;
  /** Whether the JSON bundle is written beside the two CSV files. */
  readonly writeJsonBundle?: boolean;
}

/** One subject as it appears on a candidate's entry. */
export interface KnecRegisteredSubject {
  readonly code: string;
  readonly name: string;
  readonly group: number;
}

/** One candidate row: the index number it was given and the fields the files write. */
export interface KnecCandidateRow {
  readonly indexNumber: string;
  readonly candidateNumber: number;
  readonly band: IndexBand['id'];
  readonly surname: string;
  readonly givenNames: string;
  readonly sex: string;
  readonly dateOfBirth: string;
  readonly entryCode: string;
  readonly subjectCodes: readonly string[];
  readonly subjects: readonly KnecRegisteredSubject[];
  readonly subjectCount: number;
  readonly kcpeIndexNumber: string;
  readonly kcpeYear: string;
  readonly admissionNumber: string;
}

/** One candidate-and-subject pair: the long form the portal's subject entries take. */
export interface KnecSubjectEntry {
  readonly indexNumber: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly subjectGroup: number;
}

export interface KnecRegistration {
  readonly exam: KnecExam;
  readonly centre: CentreIdentity;
  readonly candidates: readonly KnecCandidateRow[];
  readonly subjectEntries: readonly KnecSubjectEntry[];
  /** The candidate file as text, byte-order mark included. */
  readonly candidatesCsv: string;
  /** The subject-entry file as text, byte-order mark included. */
  readonly subjectEntriesCsv: string;
  /** The JSON bundle, or null when the school only asked for the CSV files. */
  readonly json: string | null;
  readonly fileNames: {
    readonly candidates: string;
    readonly subjectEntries: string;
    readonly json: string | null;
  };
  readonly encoding: 'utf-8';
  /** How far the layout has been checked against the authority's own. Nothing here is verified. */
  readonly formatStatus: 'draft';
}

/** One reason a registration was refused: where the problem is, and what is wrong. */
export interface ExportIssue {
  readonly path: string;
  readonly message: string;
}

/** Thrown when a registration cannot be written; `issues` lists every refused candidate. */
export class KnecRegistrationError extends Error {
  readonly issues: readonly ExportIssue[];

  constructor(issues: readonly ExportIssue[]) {
    super(
      `the KNEC registration cannot be written: ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`
    );
    this.name = 'KnecRegistrationError';
    this.issues = issues;
  }
}

const CANDIDATE_COLUMNS = [
  'INDEX_NUMBER',
  'SURNAME',
  'GIVEN_NAMES',
  'SEX',
  'DATE_OF_BIRTH',
  'ENTRY_CODE',
  'SUBJECT_CODES',
  'SUBJECT_COUNT',
  'KCPE_INDEX_NUMBER',
  'KCPE_YEAR',
  'ADMISSION_NUMBER',
] as const;

const SUBJECT_ENTRY_COLUMNS = [
  'INDEX_NUMBER',
  'SUBJECT_CODE',
  'SUBJECT_NAME',
  'SUBJECT_GROUP',
] as const;

/** The three documents the rules and the portal were read from, carried into the JSON bundle. */
const SOURCES: readonly KnecSource[] = [
  KNEC_KCSE_USER_GUIDE,
  KNEC_REGISTRATION_SERVICE_PAGE,
  KNEC_EXAMINATION_PORTAL,
];

const SEX_TEXT: Readonly<Record<KnecCandidate['sex'], string>> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  not_stated: 'Not stated',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isSex(value: string): value is KnecCandidate['sex'] {
  return value in SEX_TEXT;
}

function isEntryType(value: string): value is KnecEntryType {
  return value in ENTRY_CODES;
}

/** Escapes one field: a comma, a quote, a newline, or a leading or trailing space forces quoting. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value) || value.trim() !== value) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** One CSV document: the header, then a record per row, every record ended with CRLF. */
function csvDocument(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const records = [header, ...rows].map((record) => record.map(csvField).join(','));
  return `\uFEFF${records.join('\r\n')}\r\n`;
}

function text(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * The problems an entry has with the KCSE combination rules, for a candidate sitting seven subjects
 * or more (user guide §2.8.1 and §2.8.2). A repeater entered for fewer subjects is not checked
 * against them: the guide applies the seven-subject minimum to everyone else.
 */
function entryProblems(candidate: KnecCandidate, codes: readonly string[]): string[] {
  const problems: string[] = [];
  const has = (code: string) => codes.includes(code);
  const groupOf = (code: string) => subjectByCode(code)?.group;

  const mathematics = MATHEMATICS_OPTIONS.filter((code) => has(code));
  if (mathematics.length !== 1) {
    problems.push(
      `the entry must take exactly one Mathematics option (121 or 122); it takes ${mathematics.length}`
    );
  }

  if (!has('101')) {
    problems.push('101 English is compulsory for every candidate');
  }
  const route = candidate.languageRoute ?? 'kiswahili';
  if (route === 'kiswahili' && !has('102')) {
    problems.push(
      '102 Kiswahili is compulsory unless the candidate is entered on the Kenyan Sign Language route'
    );
  }
  if (route === 'kenyan_sign_language' && !has('504')) {
    problems.push('the Kenyan Sign Language route requires subject 504');
  }

  if (has('237') && !has('122')) {
    problems.push('237 General Science is entered with 122 Mathematics Option B, not 121');
  }

  const religious = RELIGIOUS_EDUCATION_OPTIONS.filter((code) => has(code));
  if (religious.length > 1) {
    problems.push(
      `at most one religious education subject (313, 314 or 315) may be entered; this entry names ${religious.join(', ')}`
    );
  }

  const sciences = codes.filter((code) => groupOf(code) === 2);
  const requiredSciences = has('237') ? 1 : 2;
  if (sciences.length < requiredSciences) {
    problems.push(
      'the entry needs at least two Group II subjects (231, 232 or 233), or 237 General Science with 122'
    );
  }
  if (!codes.some((code) => groupOf(code) === 3)) {
    problems.push('the entry needs at least one Group III subject (311 to 315)');
  }
  return problems;
}

/** The candidate number a supplied index number carries, once it is known to belong to the centre. */
function suppliedCandidateNumber(
  value: string,
  centre: CentreIdentity,
  path: string,
  issues: ExportIssue[]
): number | null {
  const parsed = parseIndexNumber(value);
  if (!parsed) {
    issues.push({
      path,
      message: `"${value}" is not an eleven-digit index number of two county digits, six centre digits and three candidate digits`,
    });
    return null;
  }
  if (centrePrefix(parsed.centre) !== centrePrefix(centre)) {
    issues.push({
      path,
      message: `"${value}" does not belong to centre ${centrePrefix(centre)}; its first eight digits must be the county code and centre number`,
    });
    return null;
  }
  return parsed.candidateNumber;
}

/**
 * The examination a registration is built for, or a refusal when this plug-in cannot write it.
 *
 * An examination is decided before anything else: a retired or unknown one makes every later check
 * pointless, so it is the one issue raised on its own.
 */
function resolveExam(id: KnecExamId): KnecExam {
  const exam = (KNEC_EXAMS as Readonly<Record<string, KnecExam | undefined>>)[id];
  if (!exam) {
    throw new KnecRegistrationError([
      { path: 'exam', message: `"${String(id)}" is not an examination this plug-in knows` },
    ]);
  }
  if (exam.status === 'retired') {
    throw new KnecRegistrationError([{ path: 'exam', message: exam.note }]);
  }
  return exam;
}

/**
 * Builds the KNEC registration for one examination at one centre.
 *
 * Index numbers are allocated from the band the subject count falls into, in the order the
 * candidates are supplied, skipping any number a candidate already carries. Every candidate is
 * checked before a file is written, so a registration that would enter an illegal candidate is
 * refused whole.
 */
export function buildRegistration(input: KnecRegistrationInput): KnecRegistration {
  const exam = resolveExam(input.exam);

  const issues: ExportIssue[] = [];
  for (const centreIssue of validateCentre(input.centre)) {
    issues.push({ path: `centre.${centreIssue.field}`, message: centreIssue.message });
  }

  const generatedAt = new Date(input.generatedAt);
  if (Number.isNaN(generatedAt.getTime())) {
    issues.push({
      path: 'generatedAt',
      message: 'the generation time must be an instant such as 2026-10-28T09:15:00.000Z',
    });
  }

  const centre = { countyCode: text(input.centre.countyCode), centreNumber: text(input.centre.centreNumber) };
  const usedIndexNumbers = new Set<string>();
  const pending: { readonly row: KnecCandidateRow; readonly suppliedNumber: number | null }[] = [];

  // The numbers a candidate already carries are claimed first, so allocation cannot collide with
  // one that appears later in the list.
  const supplied = input.candidates.map((candidate, index) => {
    const path = `candidates[${index}].indexNumber`;
    const value = text(candidate.indexNumber);
    if (!value) return null;
    const candidateNumber = suppliedCandidateNumber(value, centre, path, issues);
    if (candidateNumber === null) return null;
    if (usedIndexNumbers.has(value)) {
      issues.push({ path, message: `the index number "${value}" is already held by another candidate` });
      return null;
    }
    usedIndexNumbers.add(value);
    return candidateNumber;
  });

  const nextInBand: Record<IndexBand['id'], number> = {
    standard: INDEX_BANDS.standard.candidateNumbers.from,
    partial_repeater: INDEX_BANDS.partial_repeater.candidateNumbers.from,
  };

  input.candidates.forEach((candidate, index) => {
    const path = `candidates[${index}]`;
    const codes = candidate.subjects.map(text).filter(Boolean);
    const unknown = codes.filter((code) => subjectByCode(code) === undefined);
    if (unknown.length > 0) {
      issues.push({
        path: `${path}.subjects`,
        message: `the subject code ${unknown.join(', ')} is not in the KNEC KCSE subject catalogue`,
      });
      return;
    }
    const duplicated = codes.filter((code, position) => codes.indexOf(code) !== position);
    if (duplicated.length > 0) {
      issues.push({
        path: `${path}.subjects`,
        message: `the subject ${[...new Set(duplicated)].join(', ')} is entered more than once`,
      });
      return;
    }
    if (codes.length < 1) {
      issues.push({ path: `${path}.subjects`, message: 'the candidate is entered for no subjects' });
      return;
    }
    if (codes.length > 9) {
      issues.push({
        path: `${path}.subjects`,
        message: `a candidate may sit at most nine subjects; this entry names ${codes.length}`,
      });
      return;
    }
    if (codes.length < 7) {
      const repeaters: readonly KnecEntryType[] = ['full_repeater', 'partial_repeater'];
      if (!repeaters.includes(candidate.entryType)) {
        issues.push({
          path: `${path}.subjects`,
          message: `a first attempt candidate must sit at least seven subjects; this entry names ${codes.length}, so the candidate has to be entered as a repeater`,
        });
        return;
      }
    } else {
      const problems = entryProblems(candidate, codes);
      if (problems.length > 0) {
        issues.push({ path: `${path}.subjects`, message: problems.join('; ') });
        return;
      }
    }

    if (!isSex(candidate.sex)) {
      issues.push({
        path: `${path}.sex`,
        message: 'the sex must be female, male, other or not_stated',
      });
    }
    if (!isEntryType(candidate.entryType)) {
      issues.push({ path: `${path}.entryType`, message: 'the entry type must be first_attempt, full_repeater or partial_repeater' });
    }
    const dateOfBirth = text(candidate.dateOfBirth);
    if (!dateOfBirth) {
      issues.push({ path: `${path}.dateOfBirth`, message: 'the date of birth is mandatory' });
    } else if (!isRealDate(dateOfBirth)) {
      issues.push({ path: `${path}.dateOfBirth`, message: 'the date of birth must be a real date written YYYY-MM-DD' });
    }
    const surname = text(candidate.surname);
    if (!surname) issues.push({ path: `${path}.surname`, message: 'the surname is mandatory' });
    const givenNames = text(candidate.givenNames);
    if (!givenNames) issues.push({ path: `${path}.givenNames`, message: 'the given names are mandatory' });
    const admissionNumber = text(candidate.admissionNumber);
    if (!admissionNumber) {
      issues.push({ path: `${path}.admissionNumber`, message: 'the admission number is mandatory' });
    }

    const band = bandForSubjectCount(codes.length);
    const sorted = [...codes].sort();
    const suppliedNumber = supplied[index] ?? null;
    if (suppliedNumber !== null) {
      const { from, to } = band.candidateNumbers;
      if (suppliedNumber < from || suppliedNumber > to) {
        issues.push({
          path: `${path}.indexNumber`,
          message: `the candidate number ${suppliedNumber} is outside the ${from} to ${to} band that ${codes.length} subjects are numbered in`,
        });
        return;
      }
    }

    pending.push({
      row: {
        indexNumber: '',
        candidateNumber: 0,
        band: band.id,
        surname,
        givenNames,
        sex: isSex(candidate.sex) ? SEX_TEXT[candidate.sex] : '',
        dateOfBirth,
        entryCode: isEntryType(candidate.entryType) ? ENTRY_CODES[candidate.entryType] : '',
        subjectCodes: sorted,
        subjects: sorted.map((code) => {
          const subject = subjectByCode(code) as Subject;
          return { code: subject.code, name: subject.name, group: subject.group };
        }),
        subjectCount: codes.length,
        kcpeIndexNumber: text(candidate.kcpeIndexNumber),
        kcpeYear: text(candidate.kcpeYear),
        admissionNumber,
      },
      suppliedNumber,
    });
  });

  if (issues.length > 0) throw new KnecRegistrationError(issues);

  // Allocation runs once every candidate has been accepted, so a refusal never leaves half a roll
  // with numbers the school would have to undo.
  const numbered = pending.map(({ row, suppliedNumber }) => {
    if (suppliedNumber !== null) {
      return {
        ...row,
        candidateNumber: suppliedNumber,
        indexNumber: formatIndexNumber(centre, suppliedNumber),
      };
    }
    const next = nextInBand[row.band];
    const limit = INDEX_BANDS[row.band].candidateNumbers.to;
    let candidateNumber = next;
    while (usedIndexNumbers.has(formatIndexNumber(centre, candidateNumber)) && candidateNumber <= limit) {
      candidateNumber += 1;
    }
    if (candidateNumber > limit) {
      throw new KnecRegistrationError([
        {
          path: 'centre',
          message: `the centre has run past the last candidate number ${limit} of the ${row.band} band`,
        },
      ]);
    }
    nextInBand[row.band] = candidateNumber + 1;
    const indexNumber = formatIndexNumber(centre, candidateNumber);
    usedIndexNumbers.add(indexNumber);
    return { ...row, candidateNumber, indexNumber };
  });

  const subjectEntries: KnecSubjectEntry[] = numbered.flatMap((row) =>
    row.subjects.map((subject) => ({
      indexNumber: row.indexNumber,
      subjectCode: subject.code,
      subjectName: subject.name,
      subjectGroup: subject.group,
    }))
  );

  const candidatesCsv = csvDocument(
    CANDIDATE_COLUMNS,
    numbered.map((row) => [
      row.indexNumber,
      row.surname,
      row.givenNames,
      row.sex,
      row.dateOfBirth,
      row.entryCode,
      row.subjectCodes.join(';'),
      String(row.subjectCount),
      row.kcpeIndexNumber,
      row.kcpeYear,
      row.admissionNumber,
    ])
  );
  const subjectEntriesCsv = csvDocument(
    SUBJECT_ENTRY_COLUMNS,
    subjectEntries.map((entry) => [
      entry.indexNumber,
      entry.subjectCode,
      entry.subjectName,
      String(entry.subjectGroup),
    ])
  );

  const day = generatedAt.toISOString().slice(0, 10);
  const prefix = `knec-${exam.id}-`;
  const writeJsonBundle = input.writeJsonBundle !== false;
  const json = writeJsonBundle
    ? `${JSON.stringify(
        {
          formatStatus: 'draft',
          exam,
          centre,
          generatedAt: generatedAt.toISOString(),
          indexBands: INDEX_BANDS,
          candidates: numbered,
          sources: SOURCES,
        },
        null,
        2
      )}\n`
    : null;

  return {
    exam,
    centre,
    candidates: numbered,
    subjectEntries,
    candidatesCsv,
    subjectEntriesCsv,
    json,
    fileNames: {
      candidates: `${prefix}candidates_${centrePrefix(centre)}_${day}.csv`,
      subjectEntries: `${prefix}subject-entries_${centrePrefix(centre)}_${day}.csv`,
      json: writeJsonBundle ? `${prefix}registration_${centrePrefix(centre)}_${day}.json` : null,
    },
    encoding: 'utf-8',
    formatStatus: 'draft',
  };
}

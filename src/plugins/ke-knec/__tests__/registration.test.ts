// ABOUTME: Fixture tests for the KNEC candidate registration: the candidate and subject-entry files,
// ABOUTME: the index numbers allocated from the published bands, and every entry it must refuse.

import { describe, expect, it } from 'vitest';

import {
  KNEC_EXAMS,
  KnecRegistrationError,
  buildRegistration,
  type KnecRegistrationInput,
} from '../registration';
import { CANDIDATES, CENTRE, registrationInput, withCandidate } from './fixtures';

const CANDIDATE_HEADER =
  'INDEX_NUMBER,SURNAME,GIVEN_NAMES,SEX,DATE_OF_BIRTH,ENTRY_CODE,SUBJECT_CODES,SUBJECT_COUNT,KCPE_INDEX_NUMBER,KCPE_YEAR,ADMISSION_NUMBER';
const SUBJECT_HEADER = 'INDEX_NUMBER,SUBJECT_CODE,SUBJECT_NAME,SUBJECT_GROUP';

function input(overrides: Partial<KnecRegistrationInput> = {}): KnecRegistrationInput {
  return registrationInput(overrides);
}

/** Every issue path a refusal reported, so a test names the candidate and field that failed. */
function issuePaths(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof KnecRegistrationError) return error.issues.map((issue) => issue.path);
    throw error;
  }
  throw new Error('the registration was built where it should have been refused');
}

/** The text of every issue a refusal raised, for asserting the explanation and not only the field. */
function issueMessages(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof KnecRegistrationError) return error.issues.map((issue) => issue.message);
    throw error;
  }
  throw new Error('the registration was built where it should have been refused');
}

describe('the KNEC candidate registration', () => {
  it('writes one candidate row per candidate under the documented header', () => {
    const registration = buildRegistration(input());
    const lines = registration.candidatesCsv.replace(/^\uFEFF/, '').split('\r\n');

    expect(lines[0]).toBe(CANDIDATE_HEADER);
    expect(registration.candidates).toHaveLength(4);
    expect(registration.formatStatus).toBe('draft');
    expect(registration.exam.id).toBe('kcse');
  });

  it('allocates the eleven-digit index numbers from the published bands', () => {
    const registration = buildRegistration(input());

    expect(registration.candidates.map((candidate) => candidate.indexNumber)).toEqual([
      '24950500001',
      '24950500002',
      '24950500003',
      '24950500801',
    ]);
  });

  it('gives a partial repeater the 801 band and the others the 001 band', () => {
    const registration = buildRegistration(input());

    expect(registration.candidates[3]?.band).toBe('partial_repeater');
    expect(registration.candidates[0]?.band).toBe('standard');
    expect(registration.candidates[3]?.entryCode).toBe('3');
  });

  it('writes the candidate fields and the subject count', () => {
    const registration = buildRegistration(input());

    expect(registration.candidates[0]).toMatchObject({
      indexNumber: '24950500001',
      surname: 'Otieno',
      givenNames: 'Amina Wanjiku',
      sex: 'Female',
      dateOfBirth: '2009-05-25',
      entryCode: '1',
      subjectCount: 7,
      kcpeIndexNumber: '24950500017',
      kcpeYear: '2022',
      admissionNumber: 'ADM/2026/001',
    });
  });

  it('writes the subject codes ascending and codes them to their KNEC names', () => {
    const third = buildRegistration(input()).candidates[2];

    expect(third?.subjectCodes).toEqual(['101', '102', '122', '237', '313', '451', '501']);
    expect(third?.subjects).toContainEqual({ code: '237', name: 'General Science', group: 2 });
  });

  it('writes one subject-entry row per candidate and subject', () => {
    const registration = buildRegistration(input());
    const lines = registration.subjectEntriesCsv.replace(/^\uFEFF/, '').split('\r\n');

    expect(lines[0]).toBe(SUBJECT_HEADER);
    expect(registration.subjectEntries).toHaveLength(7 + 8 + 7 + 4);
    expect(registration.subjectEntries[0]).toMatchObject({
      indexNumber: '24950500001',
      subjectCode: '101',
      subjectName: 'English',
      subjectGroup: 1,
    });
  });

  it('quotes a surname with a comma and keeps a non-ASCII name as written', () => {
    const registration = buildRegistration(input());

    expect(registration.candidatesCsv).toContain('"Ng\'ang\'a, Jr"');
    expect(registration.candidatesCsv).toContain('Wambũi');
    expect(registration.candidatesCsv).not.toContain('Ã');
    expect(registration.candidatesCsv.charCodeAt(0)).toBe(0xfeff);
  });

  it('writes a JSON bundle that states the format is a draft and cites its sources', () => {
    const registration = buildRegistration(input());
    const bundle = JSON.parse(registration.json ?? '{}');

    expect(bundle.formatStatus).toBe('draft');
    expect(bundle.exam.id).toBe('kcse');
    expect(bundle.centre).toEqual(CENTRE);
    expect(bundle.candidates[0].indexNumber).toBe('24950500001');
    expect(bundle.candidates[0].subjects).toHaveLength(7);
    expect(bundle.sources.map((source: { url: string }) => source.url)).toContain(
      'https://www.knec.ac.ke/wp-content/uploads/2024/10/USER-GUIDE-FOR-KCSE-EXAMINATION-2024-EDITION-23rd-Oct_2.pdf'
    );
  });

  it('names the three files after the centre and the day', () => {
    expect(buildRegistration(input()).fileNames).toEqual({
      candidates: 'knec-kcse-candidates_24950500_2026-10-28.csv',
      subjectEntries: 'knec-kcse-subject-entries_24950500_2026-10-28.csv',
      json: 'knec-kcse-registration_24950500_2026-10-28.json',
    });
  });

  it('writes header-only files and an empty candidate list when the register is empty', () => {
    const registration = buildRegistration(input({ candidates: [] }));

    expect(registration.candidatesCsv.replace(/^\uFEFF/, '')).toBe(`${CANDIDATE_HEADER}\r\n`);
    expect(registration.subjectEntriesCsv.replace(/^\uFEFF/, '')).toBe(`${SUBJECT_HEADER}\r\n`);
    expect(JSON.parse(registration.json ?? '{}').candidates).toEqual([]);
  });

  it('omits the JSON bundle when the school only wants the CSV files', () => {
    const registration = buildRegistration(input({ writeJsonBundle: false }));

    expect(registration.json).toBeNull();
    expect(registration.fileNames.json).toBeNull();
    expect(registration.candidatesCsv).not.toBe('');
  });

  it('refuses a subject code the KNEC catalogue does not hold', () => {
    const candidates = [withCandidate('learner-otieno', { subjects: ['101', '102', '121', '999'] })];

    expect(issuePaths(() => buildRegistration(input({ candidates })))).toEqual([
      'candidates[0].subjects',
    ]);
    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('999');
  });

  it('refuses the same subject entered twice', () => {
    const candidates = [
      withCandidate('learner-otieno', {
        subjects: ['101', '102', '121', '231', '232', '311', '565', '565'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('565');
  });

  it('refuses two candidates who were given the same index number', () => {
    const candidates = [
      withCandidate('learner-otieno', { indexNumber: '24950500001' }),
      withCandidate('learner-kamau', { indexNumber: '24950500001' }),
    ];

    expect(issuePaths(() => buildRegistration(input({ candidates })))).toEqual([
      'candidates[1].indexNumber',
    ]);
  });

  it('refuses an index number from another centre', () => {
    const candidates = [withCandidate('learner-otieno', { indexNumber: '35610101001' })];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('centre');
  });

  it('refuses an index number from the wrong band for the subject count', () => {
    const candidates = [withCandidate('learner-otieno', { indexNumber: '24950500801' })];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('801');
  });

  it('refuses a first attempt candidate entered for six subjects', () => {
    const candidates = [
      withCandidate('learner-otieno', { subjects: ['101', '102', '121', '231', '232', '311'] }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('seven');
  });

  it('refuses more than nine subjects', () => {
    const candidates = [
      withCandidate('learner-kamau', {
        subjects: ['101', '102', '121', '231', '233', '312', '443', '511', '501', '502'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('nine');
  });

  it('refuses both Mathematics options', () => {
    const candidates = [
      withCandidate('learner-otieno', {
        subjects: ['101', '102', '121', '122', '231', '232', '311'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('Mathematics');
  });

  it('refuses two religious education subjects', () => {
    const candidates = [
      withCandidate('learner-otieno', {
        subjects: ['101', '102', '121', '231', '232', '313', '314'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain(
      'religious education'
    );
  });

  it('refuses General Science entered without Mathematics Option B', () => {
    const candidates = [
      withCandidate('learner-wambui', {
        subjects: ['101', '102', '121', '237', '313', '451', '501'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('237');
  });

  it('refuses one science where the entry needs two', () => {
    const candidates = [
      withCandidate('learner-otieno', {
        subjects: ['101', '102', '121', '231', '311', '565', '511'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('two Group II');
  });

  it('refuses an entry with no Kiswahili on the Kiswahili route', () => {
    const candidates = [
      withCandidate('learner-otieno', {
        subjects: ['101', '121', '231', '232', '311', '565', '511'],
      }),
    ];

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('102');
  });

  it('accepts Kenyan Sign Language in place of Kiswahili for a hearing impaired candidate', () => {
    const candidates = [
      withCandidate('learner-otieno', {
        languageRoute: 'kenyan_sign_language',
        subjects: ['101', '504', '121', '231', '232', '311', '565'],
      }),
    ];

    const registration = buildRegistration(input({ candidates }));

    expect(registration.candidates[0]?.subjectCodes).toContain('504');
  });

  it('refuses a candidate with no date of birth, and one that is not a real date', () => {
    const missing = [withCandidate('learner-otieno', { dateOfBirth: '  ' })];
    const impossible = [withCandidate('learner-otieno', { dateOfBirth: '2009-02-30' })];

    expect(issuePaths(() => buildRegistration(input({ candidates: missing })))).toEqual([
      'candidates[0].dateOfBirth',
    ]);
    expect(issuePaths(() => buildRegistration(input({ candidates: impossible })))).toEqual([
      'candidates[0].dateOfBirth',
    ]);
  });

  it('refuses a centre number that is not six digits', () => {
    expect(
      issuePaths(() => buildRegistration(input({ centre: { ...CENTRE, centreNumber: '95O500' } })))
    ).toEqual(['centre.centreNumber']);
  });

  it('refuses a candidate number band that runs past the last number KNEC allows', () => {
    const candidates = Array.from({ length: 500 }, (_, index) =>
      withCandidate('learner-otieno', {
        learnerId: `learner-${index}`,
        admissionNumber: `ADM/2026/${index}`,
      })
    );

    expect(issueMessages(() => buildRegistration(input({ candidates })))[0]).toContain('499');
  });

  it('refuses a KCPE registration and says the exam is no longer registered there', () => {
    const messages = issueMessages(() => buildRegistration(input({ exam: 'kcpe' })));

    expect(messages[0]).toContain('KCPE');
    expect(messages[0]).toContain('CBA');
  });

  it('lists KCPE as a retired exam rather than a layout it can write', () => {
    expect(KNEC_EXAMS.kcse.status).toBe('modelled');
    expect(KNEC_EXAMS.kcpe.status).toBe('retired');
  });

  it('reports every refused candidate at once rather than stopping at the first', () => {
    const candidates = [
      withCandidate('learner-otieno', { subjects: ['101', '102', '121', '999'] }),
      withCandidate('learner-kamau', { subjects: ['101', '102', '121', '231', '232', '311', '000'] }),
    ];

    expect(issuePaths(() => buildRegistration(input({ candidates })))).toEqual([
      'candidates[0].subjects',
      'candidates[1].subjects',
    ]);
  });

  it('builds every fixture candidate without a refusal, so the fixture is a legal registration', () => {
    expect(() => buildRegistration(input({ candidates: CANDIDATES }))).not.toThrow();
  });
});

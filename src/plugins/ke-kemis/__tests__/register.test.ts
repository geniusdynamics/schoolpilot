// ABOUTME: Fixture tests for the KEMIS learner register: the documented header and row order, CSV
// ABOUTME: quoting and encoding, and a refusal for every row the register cannot legally hold.

import { describe, expect, it } from 'vitest';

import {
  KEMIS_COLUMNS,
  KemisExportError,
  buildRegister,
  type KemisRegisterInput,
} from '../register';
import { LEARNERS, withLearner } from './fixtures';

const HEADER = KEMIS_COLUMNS.map((column) => column.header).join(',');

function input(overrides: Partial<KemisRegisterInput> = {}): KemisRegisterInput {
  return {
    institutionCode: 'KE-021-0042',
    learners: LEARNERS,
    generatedAt: '2026-10-28T09:15:00.000Z',
    ...overrides,
  };
}

/** Every issue path a refusal reported, so a test names the row and the field that failed. */
function issuePaths(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof KemisExportError) return error.issues.map((issue) => issue.path);
    throw error;
  }
  throw new Error('the register was built where it should have been refused');
}

describe('the KEMIS learner register', () => {
  it('writes one row per active learner under the documented header', () => {
    const register = buildRegister(input());
    const lines = register.csv.replace(/^\uFEFF/, '').split('\r\n');

    expect(lines[0]).toBe(HEADER);
    expect(register.rows).toHaveLength(3);
    expect(register.skipped.map((entry) => entry.learnerId)).toEqual(['learner-left']);
    expect(register.formatStatus).toBe('draft');
  });

  it('orders rows by class, then surname, then first name', () => {
    const register = buildRegister(input());

    expect(register.rows.map((row) => row.upi)).toEqual(['UPI-8002', 'UPI-8001', 'UPI-8003']);
    expect(register.rows.map((row) => row.class_name)).toEqual([
      'Form 1 East',
      'Form 1 East',
      'Form 2 West',
    ]);
  });

  it('carries the institution code on every row and writes the learner fields', () => {
    const [first] = buildRegister(input()).rows;

    expect(first).toMatchObject({
      upi: 'UPI-8002',
      surname: "Ng'ang'a, Jr",
      first_name: 'Brian',
      middle_names: '',
      sex: 'Male',
      date_of_birth: '2011-11-02',
      class_name: 'Form 1 East',
      admission_number: 'ADM/2024/002',
      guardian_name: 'Peter Kamau',
      guardian_relationship: 'father',
      guardian_phone: '+254798765432',
      institution_code: 'KE-021-0042',
    });
  });

  it('writes the header alone, and no newline before it, when the register is empty', () => {
    const register = buildRegister(input({ learners: [] }));

    expect(register.csv.replace(/^\uFEFF/, '')).toBe(`${HEADER}\r\n`);
    expect(register.rows).toEqual([]);
    expect(register.skipped).toEqual([]);
  });

  it('quotes a field that holds a comma and doubles an embedded quote', () => {
    const register = buildRegister(
      input({ learners: [withLearner('learner-kamau', { familyName: 'Ng\'ang\'a, "Junior"' })] })
    );

    expect(register.csv).toContain('"Ng\'ang\'a, ""Junior"""');
  });

  it('leaves a plain field unquoted and never pads it', () => {
    const register = buildRegister(input());

    expect(register.csv).toContain('UPI-8001,Otieno,Amina,Wanjiku,Female,2012-05-25,Form 1 East');
  });

  it('starts the file with a byte-order mark and keeps non-ASCII names as written', () => {
    const register = buildRegister(input());
    const bytes = Buffer.from(register.csv, 'utf8');

    expect(register.csv.charCodeAt(0)).toBe(0xfeff);
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(register.csv).toContain('Wambũi');
    expect(register.csv).not.toContain('Ã');
    expect(register.encoding).toBe('utf-8');
  });

  it('omits the byte-order mark when the output option turns it off', () => {
    const register = buildRegister(input({ byteOrderMark: false }));

    expect(register.csv.charCodeAt(0)).not.toBe(0xfeff);
    expect(register.csv.startsWith(HEADER)).toBe(true);
  });

  it('terminates every record with CRLF, including the last one', () => {
    const register = buildRegister(input());

    expect(register.csv.endsWith('\r\n')).toBe(true);
    expect(register.csv.replace(/^\uFEFF/, '').split('\r\n')).toHaveLength(5);
  });

  it('leaves the guardian columns empty when the school turns contacts off', () => {
    const register = buildRegister(input({ includeGuardianContacts: false }));
    const row = register.rows[0];

    expect(register.csv.replace(/^\uFEFF/, '').split('\r\n')[0]).toBe(HEADER);
    expect(row?.guardian_name).toBe('');
    expect(row?.guardian_relationship).toBe('');
    expect(row?.guardian_phone).toBe('');
  });

  it('names the file after the institution and the day it was generated', () => {
    const register = buildRegister(input({ institutionCode: 'KE/021 0042' }));

    expect(register.fileName).toBe('kemis-learner-register_KE-021-0042_2026-10-28.csv');
  });

  it('refuses a learner with no UPI and says which row it was', () => {
    const learners = [withLearner('learner-otieno', { upi: '  ' })];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual(['learners[0].upi']);
  });

  it('refuses two learners who share one UPI', () => {
    const learners = [LEARNERS[0], withLearner('learner-kamau', { upi: 'UPI-8001' })];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual(['learners[1].upi']);
  });

  it('refuses a learner with no date of birth', () => {
    const learners = [withLearner('learner-otieno', { dateOfBirth: undefined })];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual([
      'learners[0].dateOfBirth',
    ]);
  });

  it('refuses a learner with no class or admission number', () => {
    const learners = [
      withLearner('learner-otieno', { className: '', admissionNumber: '' }),
    ];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual([
      'learners[0].className',
      'learners[0].admissionNumber',
    ]);
  });

  it('refuses a guardian phone that is not in international form', () => {
    const learners = [
      withLearner('learner-otieno', {
        guardian: { name: 'Grace Otieno', relationship: 'mother', phone: '0712345678' },
      }),
    ];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual([
      'learners[0].guardian.phone',
    ]);
  });

  it('refuses a guardian with no name', () => {
    const learners = [
      withLearner('learner-otieno', { guardian: { name: ' ', relationship: 'mother' } }),
    ];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual([
      'learners[0].guardian.name',
    ]);
  });

  it('refuses a blank institution code', () => {
    expect(issuePaths(() => buildRegister(input({ institutionCode: ' ' })))).toEqual([
      'institutionCode',
    ]);
  });

  it('refuses a generation time that is not a real instant', () => {
    expect(issuePaths(() => buildRegister(input({ generatedAt: 'yesterday' })))).toEqual([
      'generatedAt',
    ]);
  });

  it('reports every refused row at once rather than stopping at the first', () => {
    const learners = [
      withLearner('learner-otieno', { upi: '' }),
      withLearner('learner-kamau', { dateOfBirth: undefined }),
    ];

    expect(issuePaths(() => buildRegister(input({ learners })))).toEqual([
      'learners[0].upi',
      'learners[1].dateOfBirth',
    ]);
  });
});

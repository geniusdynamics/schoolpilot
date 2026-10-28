// ABOUTME: Tests the KNEC subject catalogue: the codes and groups the fetched KNEC user guide lists,
// ABOUTME: the source it was read from, and that the Kenya 8-4-4 pack's codes all appear in it.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { KNEC_KCSE_USER_GUIDE } from '../sources';
import {
  COMPULSORY_CODES,
  KCSE_SUBJECTS,
  MATHEMATICS_OPTIONS,
  RELIGIOUS_EDUCATION_OPTIONS,
  isKnownSubjectCode,
  subjectByCode,
} from '../subjects';

interface PackLearningArea {
  readonly code: string;
  readonly name: string;
  readonly national_code?: string;
}

function ke844LearningAreas(): readonly PackLearningArea[] {
  const file = path.join(process.cwd(), 'packs', 'ke-844', 'learning-areas.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).learning_areas as PackLearningArea[];
}

describe('the KCSE subject catalogue', () => {
  it('lists the thirty-one subjects of the KNEC groups', () => {
    expect(KCSE_SUBJECTS).toHaveLength(31);
  });

  it('gives every subject a unique three-digit code', () => {
    const codes = KCSE_SUBJECTS.map((subject) => subject.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^\d{3}$/.test(code))).toBe(true);
  });

  it('places every subject in its published group', () => {
    const groups = (group: number) =>
      KCSE_SUBJECTS.filter((subject) => subject.group === group).map((subject) => subject.code);

    expect(groups(1)).toEqual(['101', '102', '121', '122']);
    expect(groups(2)).toEqual(['231', '232', '233', '236', '237']);
    expect(groups(3)).toEqual(['311', '312', '313', '314', '315']);
    expect(groups(4)).toEqual([
      '441',
      '442',
      '443',
      '444',
      '445',
      '446',
      '447',
      '448',
      '449',
      '450',
      '451',
    ]);
    expect(groups(5)).toEqual(['501', '502', '503', '504', '511', '565']);
  });

  it('reads back a subject by its code', () => {
    expect(subjectByCode('565')).toEqual({
      code: '565',
      name: 'Business Studies',
      group: 5,
    });
    expect(subjectByCode('236')?.name).toBe('Biology for the Blind');
    expect(subjectByCode('237')?.note).toContain('122');
  });

  it('knows nothing about a code outside the catalogue', () => {
    expect(isKnownSubjectCode('999')).toBe(false);
    expect(isKnownSubjectCode('10')).toBe(false);
    expect(subjectByCode('999')).toBeUndefined();
  });

  it('names the course combinations the entry rules rest on', () => {
    expect(COMPULSORY_CODES).toEqual(['101', '102']);
    expect(MATHEMATICS_OPTIONS).toEqual(['121', '122']);
    expect(RELIGIOUS_EDUCATION_OPTIONS).toEqual(['313', '314', '315']);
  });

  it('cites the KCSE user guide it was read from, section and edition', () => {
    expect(KNEC_KCSE_USER_GUIDE.url).toContain('knec.ac.ke');
    expect(KNEC_KCSE_USER_GUIDE.edition).toBe('2nd Edition 2024');
    expect(KNEC_KCSE_USER_GUIDE.sections).toContain('2.8.1');
    expect(KNEC_KCSE_USER_GUIDE.retrieved).toBe('2026-10-28');
  });

  it('holds every national code the Kenya 8-4-4 pack models', () => {
    const missing = ke844LearningAreas()
      .map((area) => area.national_code)
      .filter((code): code is string => typeof code === 'string')
      .filter((code) => !isKnownSubjectCode(code));

    expect(missing).toEqual([]);
  });
});

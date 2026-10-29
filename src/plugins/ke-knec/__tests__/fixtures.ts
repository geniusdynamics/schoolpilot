// ABOUTME: A small candidate set for the KNEC registration tests: three full entries, one of them a
// ABOUTME: Mathematics Option B candidate, and one partial repeater taking four subjects.

import type { KnecCandidate, KnecRegistrationInput } from '../registration';

/** The centre the fixtures are registered at. */
export const CENTRE = { countyCode: '24', centreNumber: '950500' };

export const CANDIDATES: readonly KnecCandidate[] = [
  {
    learnerId: 'learner-otieno',
    admissionNumber: 'ADM/2026/001',
    surname: 'Otieno',
    givenNames: 'Amina Wanjiku',
    sex: 'female',
    dateOfBirth: '2009-05-25',
    entryType: 'first_attempt',
    subjects: ['101', '102', '121', '231', '232', '311', '565'],
    kcpeIndexNumber: '24950500017',
    kcpeYear: '2022',
  },
  {
    learnerId: 'learner-kamau',
    admissionNumber: 'ADM/2026/002',
    surname: "Ng'ang'a, Jr",
    givenNames: 'Brian',
    sex: 'male',
    dateOfBirth: '2009-11-02',
    entryType: 'first_attempt',
    subjects: ['101', '102', '121', '231', '233', '312', '443', '511'],
  },
  {
    learnerId: 'learner-wambui',
    admissionNumber: 'ADM/2026/003',
    surname: 'Wambũi',
    givenNames: 'Njeri',
    sex: 'female',
    dateOfBirth: '2009-01-19',
    entryType: 'first_attempt',
    // Deliberately out of order: the file writes the codes ascending.
    subjects: ['501', '101', '122', '237', '313', '451', '102'],
  },
  {
    learnerId: 'learner-mwangi',
    admissionNumber: 'ADM/2021/014',
    surname: 'Mwangi',
    givenNames: 'Kevin',
    sex: 'male',
    dateOfBirth: '2007-08-08',
    entryType: 'partial_repeater',
    subjects: ['101', '102', '121', '231'],
  },
];

/** One candidate, cloned with the given fields replaced. */
export function withCandidate(
  learnerId: string,
  patch: Partial<KnecCandidate>
): KnecCandidate {
  const base = CANDIDATES.find((candidate) => candidate.learnerId === learnerId);
  if (!base) throw new Error(`the fixture has no candidate ${learnerId}`);
  return { ...base, ...patch };
}

/** The registration of the fixture candidates, with whatever the test overrides. */
export function registrationInput(
  overrides: Partial<KnecRegistrationInput> = {}
): KnecRegistrationInput {
  return {
    exam: 'kcse',
    centre: CENTRE,
    candidates: CANDIDATES,
    generatedAt: '2026-10-28T09:15:00.000Z',
    ...overrides,
  };
}

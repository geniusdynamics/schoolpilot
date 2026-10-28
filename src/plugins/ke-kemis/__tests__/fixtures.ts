// ABOUTME: A small canonical learner set for the KEMIS register tests: two learners in one class, a
// ABOUTME: surname carrying a comma and an apostrophe, a non-ASCII name, and one learner who left.

import type { KemisLearner } from '../register';

/** The learners a KEMIS register is built from: three active, one transferred out. */
export const LEARNERS: readonly KemisLearner[] = [
  {
    learnerId: 'learner-otieno',
    upi: 'UPI-8001',
    givenName: 'Amina',
    middleNames: ['Wanjiku'],
    familyName: 'Otieno',
    gender: 'female',
    dateOfBirth: '2012-05-25',
    admissionNumber: 'ADM/2024/001',
    className: 'Form 1 East',
    status: 'enrolled',
    guardian: { name: 'Grace Otieno', relationship: 'mother', phone: '+254712345678' },
  },
  {
    learnerId: 'learner-kamau',
    upi: 'UPI-8002',
    givenName: 'Brian',
    familyName: "Ng'ang'a, Jr",
    gender: 'male',
    dateOfBirth: '2011-11-02',
    admissionNumber: 'ADM/2024/002',
    className: 'Form 1 East',
    status: 'enrolled',
    guardian: { name: 'Peter Kamau', relationship: 'father', phone: '+254798765432' },
  },
  {
    learnerId: 'learner-wambui',
    upi: 'UPI-8003',
    givenName: 'Njeri',
    familyName: 'Wambũi',
    gender: 'female',
    dateOfBirth: '2012-01-19',
    admissionNumber: 'ADM/2024/003',
    className: 'Form 2 West',
    status: 'enrolled',
  },
  {
    learnerId: 'learner-left',
    upi: 'UPI-8004',
    givenName: 'Kevin',
    familyName: 'Mwangi',
    gender: 'male',
    dateOfBirth: '2010-08-08',
    admissionNumber: 'ADM/2022/014',
    className: 'Form 4 North',
    status: 'transferred_out',
  },
];

/** One learner, cloned with the given fields replaced. */
export function withLearner(
  learnerId: string,
  patch: Partial<KemisLearner>
): KemisLearner {
  const base = LEARNERS.find((learner) => learner.learnerId === learnerId);
  if (!base) throw new Error(`the fixture has no learner ${learnerId}`);
  return { ...base, ...patch };
}

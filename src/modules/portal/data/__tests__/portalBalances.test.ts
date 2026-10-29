// ABOUTME: The balances the portal shows: the finance service's own learner summary, cut down to the
// ABOUTME: learner the signed-in account may read.

import { describe, expect, it } from 'vitest';

import type { StudentFinancialSummary } from '@/modules/finance/hooks/useStudentFinancialSummary';

import { PortalAccessError, resolvePortalIdentity } from '../portalAccess';
import { readLearnerBalance } from '../portalBalances';

import {
  ENROLMENT_A,
  ENROLMENT_B,
  GUARDIAN,
  IDS,
  LEARNER_A,
  LEARNER_B,
  LINK_A,
  LINK_B,
} from './fixtures';

const guardianIdentity = () =>
  resolvePortalIdentity({
    status: 'ready',
    loginUserId: IDS.login,
    canonicalUser: { id: IDS.canonicalUser, username: 'grace', person_ref: { type: 'guardian', id: GUARDIAN.id } },
    learners: [LEARNER_A, LEARNER_B],
    enrolments: [ENROLMENT_A, ENROLMENT_B],
    classGroups: [],
    guardians: [GUARDIAN],
    learnerGuardians: [LINK_A, LINK_B],
  });

const learnerIdentity = () =>
  resolvePortalIdentity({
    status: 'ready',
    loginUserId: IDS.login,
    canonicalUser: { id: IDS.canonicalUser, username: 'amina', person_ref: { type: 'learner', id: IDS.learnerA } },
    learners: [LEARNER_A, LEARNER_B],
    enrolments: [ENROLMENT_A, ENROLMENT_B],
    classGroups: [],
    guardians: [GUARDIAN],
    learnerGuardians: [LINK_A, LINK_B],
  });

const summary = (studentId: string, balance: number): StudentFinancialSummary => ({
  studentId,
  admissionNo: 'ADM',
  name: 'A learner',
  className: 'Form 1',
  streamName: 'North',
  feeAmount: 650_000,
  feeExemption: 0,
  feePenalty: 0,
  amountPaid: 650_000 - balance,
  balance,
  overpay: balance < 0 ? -balance : 0,
  refund: 0,
  earliestDueDate: '2026-03-01',
});

describe('the portal balance', () => {
  it('returns the learner summary the finance service computed', () => {
    const balance = readLearnerBalance(guardianIdentity(), IDS.learnerA, [
      summary(IDS.learnerA, 125_000),
      summary(IDS.learnerB, 0),
    ]);

    expect(balance).not.toBeNull();
    expect(balance?.balance).toBe(125_000);
    expect(balance?.feeAmount).toBe(650_000);
    expect(balance?.learner.name).toBe('Amina Wanjiku');
  });

  it('reports no statement when the learner has never been billed', () => {
    const balance = readLearnerBalance(learnerIdentity(), IDS.learnerA, []);

    expect(balance?.summary).toBeNull();
    expect(balance?.balance).toBe(0);
  });

  it('refuses another learner in the same school', () => {
    expect(() =>
      readLearnerBalance(learnerIdentity(), IDS.learnerB, [summary(IDS.learnerB, 0)])
    ).toThrow(PortalAccessError);
  });

  it('refuses a child the guardian is not linked to', () => {
    expect(() =>
      readLearnerBalance(guardianIdentity(), IDS.learnerOther, [summary(IDS.learnerOther, 0)])
    ).toThrow(PortalAccessError);
  });
});

// ABOUTME: Proves a learner's row reads the same as their statement: a fine is not counted twice, an
// ABOUTME: unallocated payment is credit, and the balance is the statement's closing figure. Also pins
// ABOUTME: the placement to ids and to the year the report asks for.

import { describe, expect, it } from 'vitest';

import { resolveSummaryEnrolments, toSummaryRow } from '../useStudentFinancialSummary';

const learner = {
  id: 'learner-1',
  admission_number: 'ADM/2026/001',
  preferred_name: null,
  given_name: 'Amani',
  family_name: 'Wekesa',
};

const placement = (input: {
  readonly id: string;
  readonly yearId: string;
  readonly classGroupId: string;
  readonly status?: string;
  readonly start: string;
}) => ({
  id: input.id,
  learner_id: learner.id,
  academic_year_id: input.yearId,
  class_group_id: input.classGroupId,
  status: input.status ?? 'active',
  start_date: input.start,
});

describe('one learner row of the financial summary', () => {
  it('counts a fine once, because a fine is written as its own invoice', () => {
    // Billed 13,000 includes the 500 fine invoice; the fine is reported beside it, not added again.
    const row = toSummaryRow({
      learner,
      classLabel: 'Grade 7',
      streamName: 'East',
      position: { billed: 1_300_000, collected: 0, creditNotes: 0, credit: 0, balance: 1_300_000 },
      penalties: 50_000,
      earliestDueDate: '2026-02-01',
    });
    expect(row.feeAmount).toBe(1_300_000);
    expect(row.feePenalty).toBe(50_000);
    expect(row.balance).toBe(1_300_000);
  });

  it('labels the class as the grade and the stream separately', () => {
    const row = toSummaryRow({
      learner,
      classLabel: 'Grade 7',
      streamName: 'East',
      position: { billed: 0, collected: 0, creditNotes: 0, credit: 0, balance: 0 },
      penalties: 0,
      earliestDueDate: null,
    });
    expect(row.classLabel).toBe('Grade 7');
    expect(row.streamName).toBe('East');
    expect(row.className).toBe('Grade 7 · East');
  });

  it('shows an unallocated payment as money held, with the balance below zero', () => {
    const row = toSummaryRow({
      learner,
      classLabel: null,
      streamName: null,
      position: { billed: 1_000_000, collected: 1_250_000, creditNotes: 0, credit: 250_000, balance: -250_000 },
      penalties: 0,
      earliestDueDate: null,
    });
    expect(row.amountPaid).toBe(1_250_000);
    expect(row.balance).toBe(-250_000);
    expect(row.overpay).toBe(250_000);
  });

  it('takes posted credit notes off the balance, not off the payments', () => {
    const row = toSummaryRow({
      learner,
      classLabel: null,
      streamName: null,
      position: { billed: 800_000, collected: 300_000, creditNotes: 100_000, credit: 0, balance: 400_000 },
      penalties: 0,
      earliestDueDate: '2026-03-01',
    });
    expect(row.feeExemption).toBe(100_000);
    expect(row.balance).toBe(400_000);
  });

  it('names the learner the way a register does, preferring the name they use', () => {
    const row = toSummaryRow({
      learner: { ...learner, preferred_name: 'Ama' },
      classLabel: null,
      streamName: null,
      position: { billed: 0, collected: 0, creditNotes: 0, credit: 0, balance: 0 },
      penalties: 0,
      earliestDueDate: null,
    });
    expect(row.name).toBe('Ama Wekesa');
  });
});

describe('resolveSummaryEnrolments', () => {
  it('takes the placement of the chosen year, not the latest across every year', () => {
    const placements = resolveSummaryEnrolments(
      [
        placement({ id: 'enrolment-2026', yearId: 'year-2026', classGroupId: 'class-7-east', start: '2026-01-05' }),
        placement({ id: 'enrolment-2027', yearId: 'year-2027', classGroupId: 'class-7-west', start: '2027-01-05' }),
      ],
      'year-2026'
    );

    expect(placements.get(learner.id)?.class_group_id).toBe('class-7-east');
  });

  it('keeps the latest placement when no year is asked for, which is the caller’s default', () => {
    const placements = resolveSummaryEnrolments(
      [
        placement({ id: 'enrolment-2026', yearId: 'year-2026', classGroupId: 'class-7-east', start: '2026-01-05' }),
        placement({ id: 'enrolment-2027', yearId: 'year-2027', classGroupId: 'class-7-west', start: '2027-01-05' }),
      ],
      ''
    );

    expect(placements.get(learner.id)?.class_group_id).toBe('class-7-west');
  });

  it('ignores a placement that is not active or repeating', () => {
    const placements = resolveSummaryEnrolments(
      [
        placement({
          id: 'enrolment-2026',
          yearId: 'year-2026',
          classGroupId: 'class-7-east',
          start: '2026-01-05',
          status: 'transferred',
        }),
      ],
      'year-2026'
    );

    expect(placements.size).toBe(0);
  });
});

// ABOUTME: Tests the fee-reminder list: balance arithmetic, guardian selection, phone presence and the
// ABOUTME: exact placeholder rendering.

import { describe, expect, it } from 'vitest';

import type { RepositoryRow } from '@/data/repository';
import type { FinanceInvoiceRow, FinanceLearnerRow } from '../../data/canonicalFinance';
import {
  DEFAULT_REMINDER_TEMPLATE,
  EMPTY_FEE_REMINDER_FILTERS,
  buildFeeReminders,
  renderReminderMessage,
} from '../feeReminders';

const learner = (id: string, name: string, className: string, status = 'enrolled'): FinanceLearnerRow =>
  ({
    id,
    name,
    admissionNumber: `ADM-${id}`,
    status,
    className,
    levelId: 'level-1',
    levelName: 'Form 1',
    row: { id },
  }) as unknown as FinanceLearnerRow;

const invoice = (learnerId: string, totalMinor: number, paidMinor: number): FinanceInvoiceRow =>
  ({
    id: `inv-${learnerId}`,
    number: `INV-${learnerId}`,
    learnerId,
    learnerName: learnerId,
    periodId: 'period-1',
    periodName: 'Term 1',
    issueDate: '2027-01-05',
    dueDate: '2027-02-05',
    status: 'posted',
    total: { amount_minor: totalMinor, currency: 'KES' },
    paid: { amount_minor: paidMinor, currency: 'KES' },
    balance: { amount_minor: totalMinor - paidMinor, currency: 'KES' },
    lineCount: 1,
    row: { id: `inv-${learnerId}` },
  }) as unknown as FinanceInvoiceRow;

const link = (
  learnerId: string,
  guardianId: string,
  overrides: Partial<RepositoryRow<'learner_guardian'>> = {}
): RepositoryRow<'learner_guardian'> =>
  ({
    id: `link-${learnerId}-${guardianId}`,
    learner_id: learnerId,
    guardian_id: guardianId,
    receives_sms: true,
    is_fee_payer: true,
    is_primary: true,
    priority: 1,
    relationship: 'mother',
    ...overrides,
  }) as unknown as RepositoryRow<'learner_guardian'>;

const guardian = (
  id: string,
  given: string,
  family: string,
  phones: { number: string }[]
): RepositoryRow<'guardian'> =>
  ({
    id,
    given_name: given,
    family_name: family,
    phones,
  }) as unknown as RepositoryRow<'guardian'>;

const base = {
  learners: [
    learner('learner-1', 'Amina Wanjiku', 'Form 1 Blue'),
    learner('learner-2', 'Brian Otieno', 'Form 1 Blue'),
    learner('learner-3', 'Cate Mwangi', 'Form 2 Red', 'graduated'),
  ],
  invoices: [invoice('learner-1', 100_000, 40_000), invoice('learner-2', 50_000, 50_000)],
  creditNotes: [
    {
      id: 'note-1',
      learner_id: 'learner-1',
      amount: { amount_minor: 10_000, currency: 'KES' },
      status: 'posted',
    } as unknown as RepositoryRow<'credit_note'>,
  ],
  links: [link('learner-1', 'guardian-1')],
  guardians: [guardian('guardian-1', 'Grace', 'Wanjiku', [{ number: '+254700000001' }])],
  filters: EMPTY_FEE_REMINDER_FILTERS,
};

describe('buildFeeReminders', () => {
  it('lists enrolled learners with a positive balance and their paying guardian', () => {
    const rows = buildFeeReminders(base);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      learnerName: 'Amina Wanjiku',
      admissionNumber: 'ADM-learner-1',
      balanceMinor: 50_000,
      guardianName: 'Grace Wanjiku',
      phone: '+254700000001',
    });
  });

  it('filters by class and search, and skips a guardian who opted out of SMS', () => {
    expect(buildFeeReminders({ ...base, filters: { className: 'Form 2 Red', search: '' } })).toHaveLength(0);
    expect(buildFeeReminders({ ...base, filters: { className: '', search: 'Amina' } })).toHaveLength(1);
    const optedOut = buildFeeReminders({
      ...base,
      links: [link('learner-1', 'guardian-1', { receives_sms: false })],
    });
    expect(optedOut[0]?.phone).toBe('');
  });

  it('renders the message with exact minor-unit balance', () => {
    const row = buildFeeReminders(base)[0];
    expect(row).toBeDefined();
    const message = renderReminderMessage(DEFAULT_REMINDER_TEMPLATE, row!, 'SchoolPilot');
    expect(message).toContain('Amina Wanjiku');
    expect(message).toContain('ADM-learner-1');
    expect(message).toContain('500.00');
    expect(message).toContain('Grace Wanjiku');
    expect(message).toContain('SchoolPilot');
    expect(message).not.toContain('{{');
  });
});

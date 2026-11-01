// ABOUTME: Tests the prepayment service against the finance repository double: an unallocated
// ABOUTME: payment settles a posted invoice and the invoice status moves with it.

import { describe, expect, it } from 'vitest';

import { createFinanceRepositoryDouble } from '../../data/__tests__/canonicalRepositoryDouble';
import { money } from '../../data/canonicalFinance';
import { applyLearnerCredit } from '../canonicalFinanceService';

const LEARNER = '77777777-7777-7777-8777-777777777777';
const INVOICE = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';
const FEE_ITEM = '99999999-9999-7999-8999-999999999999';

const repository = () =>
  createFinanceRepositoryDouble({
    fee_item: [
      {
        id: FEE_ITEM,
        institution_id: '00000000-0000-7000-8000-000000000001',
        code: 'TUITION',
        name: 'Tuition',
        priority: 1,
      },
    ],
    invoice: [
      {
        id: INVOICE,
        institution_id: '00000000-0000-7000-8000-000000000001',
        number: 'INV-1',
        learner_id: LEARNER,
        issue_date: '2027-01-01',
        total: money(100_000),
        status: 'posted',
      },
    ],
    invoice_line: [
      {
        id: 'line-1',
        institution_id: '00000000-0000-7000-8000-000000000001',
        invoice_id: INVOICE,
        fee_item_id: FEE_ITEM,
        description: 'Tuition',
        amount: money(100_000),
        kind: 'fee',
      },
    ],
    payment: [
      {
        id: 'payment-1',
        institution_id: '00000000-0000-7000-8000-000000000001',
        learner_id: LEARNER,
        amount: money(60_000),
        channel: 'cash',
        received_at: '2026-12-01T09:00:00.000Z',
        status: 'posted',
      },
    ],
    payment_allocation: [],
    credit_note: [],
  });

describe('applyLearnerCredit', () => {
  it('allocates the unallocated payment and marks the invoice partially paid', async () => {
    const store = repository();
    const result = await applyLearnerCredit(store, {
      learnerId: LEARNER,
      strategy: 'vote_head_priority',
    });

    expect(result).toEqual({ appliedMinor: 60_000, unappliedMinor: 0, allocations: 1 });
    const allocations = store.rows.payment_allocation ?? [];
    expect(allocations).toHaveLength(1);
    expect(allocations[0]).toMatchObject({
      invoice_id: INVOICE,
      amount: { amount_minor: 60_000, currency: 'KES' },
    });
    const invoice = (store.rows.invoice ?? []).find((row) => row.id === INVOICE);
    expect(invoice?.status).toBe('partially_paid');
  });

  it('does nothing when the learner owes nothing', async () => {
    const store = repository();
    await applyLearnerCredit(store, { learnerId: LEARNER });
    const again = await applyLearnerCredit(store, { learnerId: LEARNER });
    expect(again).toEqual({ appliedMinor: 0, unappliedMinor: 0, allocations: 0 });
  });
});

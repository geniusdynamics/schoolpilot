// ABOUTME: Proves the statements page opens the ledger on its own: with the canonical database
// ABOUTME: open and no ledger prop, the page shows the running account the posted journal produces
// ABOUTME: rather than the "not connected" message the owner used to see.

import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { CanonicalRepositoryProvider, canonicalAdapter, openCanonicalRepository } from '@/data/canonicalRepository';
import {
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  ensureLedgerSchema,
  invoiceEntry,
  LedgerService,
  paymentEntry,
  type JournalEntry,
} from '@/domain/finance/ledger';
import { formatMoney, fromMinor } from '@/domain/money';

import { createFinanceRepositoryDouble } from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';
import { StatementsPageContent } from '../StatementsPage';

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const LEARNER = '77777777-7777-7777-8777-777777777777';
const INVOICE = '13131313-1313-7131-8131-131313131313';
const PAYMENT = '14141414-1414-7141-8141-141414141414';
const ALLOCATION = '15151515-1515-7151-8151-151515151515';

const kes = (minor: number) => fromMinor(minor, 'KES');

const CHART = createLedgerAccountMapping({
  accounts: [{ code: '4100', name: 'Tuition revenue', kind: 'revenue' }],
  feeItemRevenueAccounts: { '99999999-9999-7999-8999-999999999999': '4100' },
});

/** The ledger's own derivations, so the entries are the ledger's and the tie is real. */
const ENTRIES: readonly JournalEntry[] = [
  invoiceEntry(
    {
      invoice: {
        id: INVOICE,
        number: 'INV/2027/1/000001',
        institutionId: INSTITUTION,
        issueDate: '2027-01-10',
        lines: [{ feeItemId: '99999999-9999-7999-8999-999999999999', amount: kes(600_000) }],
      },
    },
    CHART,
    { id: 'entry-invoice' }
  ),
  paymentEntry(
    {
      payment: {
        id: PAYMENT,
        institutionId: INSTITUTION,
        amount: kes(400_000),
        channel: 'cash',
        receivedAt: '2027-02-05T09:00:00.000Z',
      },
      allocations: [{ invoiceId: INVOICE, invoiceNumber: 'INV/2027/1/000001', amount: kes(300_000) }],
    },
    CHART,
    { id: 'entry-payment' }
  ),
];

/** The canonical documents the statement is scoped to; the ledger carries the money. */
function seed() {
  return createFinanceRepositoryDouble({
    institution: [{ id: INSTITUTION, name: 'Test School', base_currency: 'KES' }],
    learner: [
      {
        id: LEARNER,
        institution_id: INSTITUTION,
        admission_number: 'ADM-1',
        given_name: 'Jane',
        family_name: 'Wanjiru',
        name_order: 'given_first',
        gender: 'female',
        status: 'enrolled',
        residence_status: 'day',
      },
    ],
    invoice: [
      {
        id: INVOICE,
        institution_id: INSTITUTION,
        number: 'INV/2027/1/000001',
        learner_id: LEARNER,
        issue_date: '2027-01-10',
        due_date: '2027-01-31',
        total: { amount_minor: 600_000, currency: 'KES' },
        status: 'posted',
      },
    ],
    payment: [
      {
        id: PAYMENT,
        institution_id: INSTITUTION,
        learner_id: LEARNER,
        amount: { amount_minor: 400_000, currency: 'KES' },
        channel: 'cash',
        received_at: '2027-02-05T09:00:00.000Z',
        status: 'posted',
      },
    ],
    payment_allocation: [
      {
        id: ALLOCATION,
        institution_id: INSTITUTION,
        payment_id: PAYMENT,
        invoice_id: INVOICE,
        amount: { amount_minor: 300_000, currency: 'KES' },
        allocated_at: '2027-02-05T09:00:00.000Z',
      },
    ],
  });
}

describe('the statements page on the canonical ledger', () => {
  beforeAll(async () => {
    // Open the one canonical database the app opens, then post the journal through it: this is the
    // ledger the page must reach on its own, with no ledger prop.
    await openCanonicalRepository();
    const adapter: SqliteAdapter | null = canonicalAdapter();
    if (!adapter) throw new Error('the canonical adapter did not open');
    await ensureLedgerSchema(adapter);
    const ledger = new LedgerService({ store: createSqliteLedgerStore(adapter) });
    for (const entry of ENTRIES) await ledger.post(entry);
  });

  it('reads the canonical ledger when it is handed no ledger', async () => {
    const repository = seed();
    render(
      <MemoryRouter>
        <CanonicalRepositoryProvider repository={repository}>
          <StatementsPageContent />
        </CanonicalRepositoryProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText(/The ledger is not connected/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Learner'), { target: { value: LEARNER } });

    await waitFor(() => expect(screen.getByTestId('statement-closing')).toBeInTheDocument());
    // The closing balance is the ledger's: 600,000 invoiced less 400,000 received.
    expect(screen.getByTestId('statement-closing').textContent).toContain(formatMoney(kes(200_000)));
    expect(screen.getByTestId('statement-tie').textContent).toContain('Agrees with the ledger');
  });
});

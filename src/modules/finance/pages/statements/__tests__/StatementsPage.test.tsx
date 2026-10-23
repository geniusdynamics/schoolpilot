// ABOUTME: The statements page, driven through the canonical repository and a ledger: choose a
// ABOUTME: learner, read the running account and its aging, and see the tie against the ledger.

import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import {
  createLedgerAccountMapping,
  deriveTrialBalance,
  invoiceEntry,
  paymentEntry,
  type JournalEntry,
} from '@/domain/finance/ledger';
import type { LedgerReader } from '@/domain/finance/statements';
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

/** A ledger reader over the fixture's entries, using the ledger's own trial balance. */
function reader(): LedgerReader {
  return {
    async listEntries() {
      return ENTRIES;
    },
    async accountBalance(accountCode) {
      const trial = deriveTrialBalance(ENTRIES, 'KES');
      return trial.rows.find((row) => row.accountCode === accountCode)?.balance ?? kes(0);
    },
  };
}

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

function renderPage() {
  const repository = seed();
  render(
    <MemoryRouter>
      <CanonicalRepositoryProvider repository={repository}>
        <StatementsPageContent ledger={reader()} />
      </CanonicalRepositoryProvider>
    </MemoryRouter>
  );
  return repository;
}

/** Chooses a learner in the subject select. */
function chooseLearner() {
  fireEvent.change(screen.getByLabelText('Learner'), { target: { value: LEARNER } });
}

describe('the statements page', () => {
  it('runs a learner statement and shows the tie against the ledger', async () => {
    renderPage();

    chooseLearner();

    await waitFor(() => expect(screen.getByTestId('statement-closing')).toBeInTheDocument());
    // The closing balance is the ledger's: 600,000 invoiced less 300,000 allocated less 100,000 credit.
    expect(screen.getByTestId('statement-closing').textContent).toContain(formatMoney(kes(200_000)));
    expect(screen.getByTestId('statement-tie').textContent).toContain('Agrees with the ledger');
    expect(screen.getByTestId('statement-opening')).toBeInTheDocument();
    // A learner's statement carries their clearance.
    expect(screen.getByTestId('statement-clearance').textContent).toContain('In arrears');
    // The aging summary is rendered with its buckets.
    expect(screen.getByTestId('aging-total')).toBeInTheDocument();
    expect(screen.getByTestId('aging-days_90_plus')).toBeInTheDocument();
  });

  it('shows the invoice and the discount detail in the running balance', async () => {
    renderPage();
    chooseLearner();

    await waitFor(() => expect(screen.getByTestId('statement-movements')).toBeInTheDocument());
    const movements = screen.getByTestId('statement-movements');
    expect(movements.textContent).toContain('INV/2027/1/000001');
    expect(movements.textContent).toContain('invoice');
    expect(movements.textContent).toContain('allocation');
    expect(movements.textContent).toContain('credit');
  });

  it('says so when the ledger is not connected', () => {
    const repository = seed();
    render(
      <MemoryRouter>
        <CanonicalRepositoryProvider repository={repository}>
          <StatementsPageContent />
        </CanonicalRepositoryProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/The ledger is not connected/)).toBeInTheDocument();
  });

  it('states the sponsor gap when no sponsor documents are supplied', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Statement for'), { target: { value: 'sponsor' } });
    expect(screen.getByTestId('statements-sponsor-gap')).toBeInTheDocument();
    expect(screen.getByTestId('statements-sponsor-gap').textContent).toContain('sponsor invoice');
  });
});

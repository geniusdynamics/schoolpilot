// ABOUTME: Page tests for the canonical student votehead statement: the shared scope bar chooses the
// ABOUTME: year and period, the learner picker chooses the learner, and the header and lines are the data.

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '@/modules/finance/data/canonicalRepository';
import {
  createFinanceRepositoryDouble,
  type FinanceRepositoryDouble,
} from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';
import { formatMoneyMinor, money } from '@/modules/finance/data/canonicalFinance';
import { buildCanonicalStudentStatement } from '@/modules/reports/utils/canonicalStudentStatement';

import { StudentVoteheadStatementPageContent } from '../StudentVoteheadStatementPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const YEAR = 'year-2027';
const PREVIOUS_YEAR = 'year-2026';
const PERIOD = 'term-1-2027';
const PREVIOUS_PERIOD = 'term-1-2026';
const NEXT_PERIOD = 'term-2-2027';
const GRADE_7 = 'level-grade-7';
const GRADE_6 = 'level-grade-6';
const EAST = 'class-east-2027';
const WEST = 'class-west-2026';
const LEARNER = 'learner-amani';

function seed(): FinanceRepositoryDouble {
  return createFinanceRepositoryDouble({
    academic_year: [
      { id: YEAR, name: '2027', start_date: '2027-01-01', end_date: '2027-12-31', status: 'current' },
      { id: PREVIOUS_YEAR, name: '2026', start_date: '2026-01-01', end_date: '2026-10-31', status: 'closed' },
    ],
    academic_period: [
      {
        id: PERIOD,
        name: 'Term 1',
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 1,
        start_date: '2027-01-05',
        end_date: '2027-04-03',
        status: 'current',
      },
      {
        id: NEXT_PERIOD,
        name: 'Term 2',
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 2,
        start_date: '2027-05-05',
        end_date: '2027-08-03',
        status: 'closed',
      },
      {
        id: PREVIOUS_PERIOD,
        name: 'Term 1',
        academic_year_id: PREVIOUS_YEAR,
        kind: 'term',
        sequence: 1,
        start_date: '2026-05-05',
        end_date: '2026-08-03',
        status: 'closed',
      },
    ],
    level: [
      { id: GRADE_7, name: 'Grade 7', ordinal: 7 },
      { id: GRADE_6, name: 'Grade 6', ordinal: 6 },
    ],
    class_group: [
      { id: EAST, name: 'East', academic_year_id: YEAR, level_id: GRADE_7 },
      { id: WEST, name: 'West', academic_year_id: PREVIOUS_YEAR, level_id: GRADE_6 },
    ],
    learner: [
      {
        id: LEARNER,
        given_name: 'Amani',
        family_name: 'Otieno',
        preferred_name: 'Amani',
        admission_number: 'ADM-001',
        status: 'enrolled',
      },
    ],
    enrolment: [
      {
        id: 'enrolment-2027',
        learner_id: LEARNER,
        academic_year_id: YEAR,
        level_id: GRADE_7,
        class_group_id: EAST,
        status: 'active',
        start_date: '2027-01-05',
      },
      {
        id: 'enrolment-2026',
        learner_id: LEARNER,
        academic_year_id: PREVIOUS_YEAR,
        level_id: GRADE_6,
        class_group_id: WEST,
        status: 'active',
        start_date: '2026-01-05',
      },
    ],
    invoice: [
      {
        id: 'invoice-old',
        number: 'INV-OLD',
        learner_id: LEARNER,
        academic_period_id: PREVIOUS_PERIOD,
        issue_date: '2026-06-10',
        status: 'posted',
        total: money(120_000),
      },
      {
        id: 'invoice-current',
        number: 'INV-100',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-01-10',
        status: 'posted',
        total: money(150_000),
      },
      {
        id: 'invoice-void',
        number: 'INV-VOID',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-01-12',
        status: 'void',
        total: money(999_999),
      },
      {
        id: 'invoice-draft',
        number: 'INV-DRAFT',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-01-13',
        status: 'draft',
        total: money(888_888),
      },
      {
        id: 'invoice-next',
        number: 'INV-200',
        learner_id: LEARNER,
        academic_period_id: NEXT_PERIOD,
        issue_date: '2027-06-01',
        status: 'posted',
        total: money(400_000),
      },
    ],
    invoice_line: [
      {
        id: 'line-old',
        invoice_id: 'invoice-old',
        description: 'Tuition 2026',
        amount: money(120_000),
        kind: 'fee',
      },
      {
        id: 'line-current-tuition',
        invoice_id: 'invoice-current',
        description: 'Tuition 2027',
        amount: money(100_000),
        kind: 'fee',
      },
      {
        id: 'line-current-meals',
        invoice_id: 'invoice-current',
        description: 'Meals 2027',
        amount: money(50_000),
        kind: 'fee',
      },
      {
        id: 'line-void',
        invoice_id: 'invoice-void',
        description: 'Void line',
        amount: money(999_999),
        kind: 'fee',
      },
      {
        id: 'line-draft',
        invoice_id: 'invoice-draft',
        description: 'Draft line',
        amount: money(888_888),
        kind: 'fee',
      },
      {
        id: 'line-next',
        invoice_id: 'invoice-next',
        description: 'Transport 2027',
        amount: money(400_000),
        kind: 'transport',
      },
    ],
    payment: [
      {
        id: 'payment-old',
        learner_id: LEARNER,
        amount: money(30_000),
        channel: 'mobile_money',
        received_at: '2026-06-15T09:00:00Z',
        reference: 'MPESA-OLD',
        status: 'posted',
      },
      {
        id: 'payment-current',
        learner_id: LEARNER,
        amount: money(50_000),
        channel: 'mobile_money',
        received_at: '2027-02-01T09:00:00Z',
        reference: 'MPESA-100',
        status: 'posted',
      },
      {
        id: 'payment-late',
        learner_id: LEARNER,
        amount: money(25_000),
        channel: 'bank_deposit',
        received_at: '2027-02-15T09:00:00Z',
        reference: 'BANK-LATE',
        status: 'posted',
      },
      {
        id: 'payment-unallocated',
        learner_id: LEARNER,
        amount: money(77_777),
        channel: 'cash',
        received_at: '2027-02-20T09:00:00Z',
        reference: 'CASH-UNALLOCATED',
        status: 'posted',
      },
    ],
    payment_allocation: [
      {
        id: 'allocation-old',
        payment_id: 'payment-old',
        invoice_id: 'invoice-old',
        amount: money(30_000),
        allocated_at: '2026-06-15T09:01:00Z',
      },
      {
        id: 'allocation-current',
        payment_id: 'payment-current',
        invoice_id: 'invoice-current',
        amount: money(50_000),
        allocated_at: '2027-02-01T09:01:00Z',
      },
      {
        id: 'allocation-late',
        payment_id: 'payment-late',
        invoice_id: 'invoice-old',
        amount: money(25_000),
        allocated_at: '2027-02-15T09:01:00Z',
      },
      {
        id: 'allocation-void',
        payment_id: 'payment-unallocated',
        invoice_id: 'invoice-void',
        amount: money(10_000),
        allocated_at: '2027-02-20T09:01:00Z',
      },
      {
        id: 'allocation-next',
        payment_id: 'payment-unallocated',
        invoice_id: 'invoice-next',
        amount: money(20_000),
        allocated_at: '2027-02-21T09:01:00Z',
      },
    ],
    credit_note: [
      {
        id: 'credit-old',
        number: 'CN-OLD',
        learner_id: LEARNER,
        invoice_id: 'invoice-old',
        amount: money(20_000),
        reason: 'Prior bursary',
        issue_date: '2026-06-20',
        status: 'posted',
      },
      {
        id: 'credit-current',
        number: 'CN-100',
        learner_id: LEARNER,
        invoice_id: 'invoice-current',
        amount: money(10_000),
        reason: 'Bursary adjustment',
        issue_date: '2027-02-05',
        status: 'posted',
      },
      {
        id: 'credit-void',
        number: 'CN-VOID',
        learner_id: LEARNER,
        amount: money(5_000),
        reason: 'Void credit',
        issue_date: '2027-02-06',
        status: 'void',
      },
    ],
  });
}

let repository: FinanceRepositoryDouble;

beforeEach(() => {
  repository = seed();
});

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <StudentVoteheadStatementPageContent />
    </CanonicalRepositoryProvider>
  );
}

async function chooseLearner() {
  const picker = await screen.findByRole('combobox', { name: 'Learner' });
  fireEvent.click(picker);
  fireEvent.click(await screen.findByRole('option', { name: 'Amani Otieno (ADM-001)' }));
}

async function generate() {
  const button = screen.getByTestId('generate-statement');
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
}

describe('StudentVoteheadStatementPageContent', () => {
  it('builds the selected learner and period from canonical rows and labels the enrolment of that year', async () => {
    renderPage();
    await chooseLearner();
    await generate();

    const header = await screen.findByTestId('statement-header');
    expect(header).toHaveTextContent('Amani Otieno');
    expect(header).toHaveTextContent('ADM-001');
    expect(header).toHaveTextContent('Year: 2027');
    expect(header).toHaveTextContent('Class: Grade 7');
    expect(header).toHaveTextContent('Stream: East');
    expect(header).toHaveTextContent('Period: Term 1');
    expect(header).not.toHaveTextContent('Grade 6');
    expect(header).not.toHaveTextContent('West');

    expect(screen.getByTestId('statement-opening')).toHaveTextContent(formatMoneyMinor(70_000));

    // Only Term 1's posted lines are on this statement: not last term's arrears line, not the
    // void or draft invoice, and not Term 2.
    expect(screen.getByText('Tuition 2027')).toBeInTheDocument();
    expect(screen.getByText('Meals 2027')).toBeInTheDocument();
    expect(screen.queryByText('Tuition 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Transport 2027')).not.toBeInTheDocument();
    expect(screen.queryByText('Void line')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft line')).not.toBeInTheDocument();
    expect(screen.queryByText('MPESA-UNALLOCATED')).not.toBeInTheDocument();

    // The two period allocations and the posted credit note are credited, and the closing balance
    // agrees with the pure builder over the same rows.
    expect(screen.getByText('MPESA-100')).toBeInTheDocument();
    expect(screen.getByText('BANK-LATE')).toBeInTheDocument();
    expect(screen.getByText('CN-100')).toBeInTheDocument();

    const expected = buildCanonicalStudentStatement({
      learnerId: LEARNER,
      periodId: PERIOD,
      periodStartDate: '2027-01-05',
      periodEndDate: '2027-04-03',
      invoices: repository.rows.invoice as never,
      invoiceLines: repository.rows.invoice_line as never,
      payments: repository.rows.payment as never,
      allocations: repository.rows.payment_allocation as never,
      creditNotes: repository.rows.credit_note as never,
    });
    expect(expected.openingBalanceMinor).toBe(70_000);
    expect(expected.closingBalanceMinor).toBe(135_000);

    const closing = screen.getByTestId('statement-closing');
    expect(closing).toHaveTextContent(formatMoneyMinor(expected.closingBalanceMinor));
    expect(closing).toHaveTextContent('KES 1,350.00');
  });

  it('says so when the selected period has no transactions instead of showing a stale statement', async () => {
    repository = createFinanceRepositoryDouble({
      academic_year: [
        { id: YEAR, name: '2027', start_date: '2027-01-01', end_date: '2027-12-31', status: 'current' },
      ],
      academic_period: [
        {
          id: PERIOD,
          name: 'Term 1',
          academic_year_id: YEAR,
          kind: 'term',
          sequence: 1,
          start_date: '2027-01-05',
          end_date: '2027-04-03',
          status: 'current',
        },
      ],
      level: [{ id: GRADE_7, name: 'Grade 7', ordinal: 7 }],
      class_group: [{ id: EAST, name: 'East', academic_year_id: YEAR, level_id: GRADE_7 }],
      learner: [
        {
          id: LEARNER,
          given_name: 'Amani',
          family_name: 'Otieno',
          admission_number: 'ADM-001',
          status: 'enrolled',
        },
      ],
      enrolment: [
        {
          id: 'enrolment-2027',
          learner_id: LEARNER,
          academic_year_id: YEAR,
          level_id: GRADE_7,
          class_group_id: EAST,
          status: 'active',
          start_date: '2027-01-05',
        },
      ],
    });

    renderPage();
    await chooseLearner();
    await generate();

    const empty = await screen.findByTestId('statement-empty');
    expect(empty).toHaveTextContent('No transactions in this period');
    expect(screen.getByTestId('statement-opening')).toHaveTextContent(formatMoneyMinor(0));
    expect(screen.getByTestId('statement-closing')).toHaveTextContent(formatMoneyMinor(0));
    const table = screen.queryByRole('table');
    if (table) {
      expect(within(table).queryByText('Tuition 2027')).not.toBeInTheDocument();
    }
  });
});

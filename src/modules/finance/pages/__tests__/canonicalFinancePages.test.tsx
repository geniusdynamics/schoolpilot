// ABOUTME: Page tests for the finance UI on the canonical repository: every migrated page renders from
// ABOUTME: the repository, a write reaches it, money round-trips exactly, a posted document refuses an
// ABOUTME: edit, and a reference is chosen through EntityPicker.
//
// The five legacy finance suites this wave replaced pinned behaviours that no longer exist on the
// canonical model. They are recorded here rather than left as silence:
// - A fee template's `items` array: the canonical model has no embedded items. A fee schedule holds
//   `fee_schedule_line` rows, one per fee item, so the line add/edit/delete tests below are the
//   replacement for `FeeTemplatesPage.saveLine`/`deleteLine`.
// - Legacy items without ids, given a stable id on read: `fee_schedule_line` rows are repository rows
//   with UUIDv7 ids from the moment they are written, so there is nothing to stabilise.
// - `applicable_level_ids` compared against the loaded `classes` list, with unknown ids kept:
//   `fee_schedule.level_ids` is a reference array, and the level picker offers the canonical levels.
// - A pre-filled, gap-free receipt number (`RCT/<year>/000003`) computed on the page: the receipt
//   number is now issued by `recordPayment` through the document sequence, so the page no longer
//   offers the field at all.
// - A duplicate receipt number refused by the page: the sequence issues the number, so a user cannot
//   type a duplicate.
// - Editing a payment's amount in place: a payment is posted when recorded and frozen, so the page
//   offers the repository's refusal instead (asserted below).
// - `financeSchemas` amount bounds below 999,999.99: the canonical money shape has no upper bound;
//   the amount round-trip tests below cover the same intent.

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import {
  createFinanceRepositoryDouble,
  type FinanceRepositoryDouble,
} from '../../data/__tests__/canonicalRepositoryDouble';
import { money } from '../../data/canonicalFinance';

import { FeeTemplatesContent } from '../FeeTemplatesPage';
import { StudentPaymentsPageContent } from '../StudentPaymentsPage';
import { PaymentAllocationPageContent } from '../PaymentAllocationPage';
import { FeeAdjustmentsPageContent } from '../FeeAdjustmentsPage';
import { FeesFinesPageContent } from '../FeesFinesPage';
import { FeesInstallmentsPageContent } from '../FeesInstallmentsPage';
import { StudentOpeningBalancesPageContent } from '../StudentOpeningBalancesPage';
import { FeeCollectionSummaryPageContent } from '../FeeCollectionSummaryPage';
import { StudentFinancialSummaryPageContent } from '../StudentFinancialSummaryPage';
import { StudentsPaidBookPageContent } from '../StudentsPaidBookPage';
import { FeesDueReportPageContent } from '../FeesDueReportPage';
import { VoteheadStatementPageContent } from '../VoteheadStatementPage';
import { PreviousSessionFeesPageContent } from '../PreviousSessionFeesPage';
import { FinanceDashboardPageContent } from '../FinanceDashboardPage';
import { InvoiceGenerationPageContent } from '../InvoiceGenerationPage';
import { EffectFeeStructuresPageContent } from '../EffectFeeStructuresPage';

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

vi.mock('@/components/ui/BarChart', () => ({ default: () => <div>chart</div> }));
vi.mock('@/components/ui/DonutChart', () => ({ default: () => <div>chart</div> }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const YEAR = '21111111-1111-7111-8111-111111111111';
const LAST_YEAR = '21111111-1111-7111-8111-222222222222';
const PERIOD = '22222222-2222-7222-8222-222222222222';
const LAST_PERIOD = '22222222-2222-7222-8222-333333333333';
const LEVEL = '33333333-3333-7333-8333-333333333333';
const CAMPUS = '44444444-4444-7444-8444-444444444444';
const PROGRAMME = '55555555-5555-7555-8555-555555555555';
const CLASS_GROUP = '66666666-6666-7666-8666-666666666666';
const LEARNER = '77777777-7777-7777-8777-777777777777';
const FEE_ITEM = '99999999-9999-7999-8999-999999999999';
const SCHEDULE = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';
const EMPTY_SCHEDULE = 'aaaaaaaa-aaaa-7aaa-8aaa-bbbbbbbbbbbb';
const INVOICE = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';
const FINE_INVOICE = 'bbbbbbbb-bbbb-7bbb-8bbb-cccccccccccc';
const OPENING_INVOICE = 'bbbbbbbb-bbbb-7bbb-8bbb-dddddddddddd';
const LAST_INVOICE = 'bbbbbbbb-bbbb-7bbb-8bbb-eeeeeeeeeeee';
const PAYMENT = 'cccccccc-cccc-7ccc-8ccc-cccccccccccc';
const CREDIT_NOTE = 'dddddddd-dddd-7ddd-8ddd-dddddddddddd';
const PLAN = 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeeee';

function seed(): FinanceRepositoryDouble {
  return createFinanceRepositoryDouble({
    academic_year: [
      {
        id: YEAR,
        institution_id: INSTITUTION,
        calendar_id: '0a0a0a0a-0a0a-7a0a-8a0a-0a0a0a0a0a0a',
        name: '2027',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        status: 'current',
      },
      {
        id: LAST_YEAR,
        institution_id: INSTITUTION,
        calendar_id: '0a0a0a0a-0a0a-7a0a-8a0a-0a0a0a0a0a0a',
        name: '2026',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'closed',
      },
    ],
    academic_period: [
      {
        id: PERIOD,
        institution_id: INSTITUTION,
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 1,
        name: 'Term 1 2027',
        start_date: '2027-01-01',
        end_date: '2027-04-30',
        is_reporting: true,
        is_billing: true,
        status: 'current',
      },
      {
        id: LAST_PERIOD,
        institution_id: INSTITUTION,
        academic_year_id: LAST_YEAR,
        kind: 'term',
        sequence: 1,
        name: 'Term 1 2026',
        start_date: '2026-01-01',
        end_date: '2026-04-30',
        is_reporting: true,
        is_billing: true,
        status: 'closed',
      },
    ],
    level: [
      {
        id: LEVEL,
        institution_id: INSTITUTION,
        stage_id: '0b0b0b0b-0b0b-7b0b-8b0b-0b0b0b0b0b0b',
        code: 'F1',
        name: 'Form 1',
        ordinal: 1,
        is_terminal: false,
      },
    ],
    class_group: [
      {
        id: CLASS_GROUP,
        institution_id: INSTITUTION,
        campus_id: CAMPUS,
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        name: 'Form 1 Blue',
        homeroom_teacher_ids: [],
      },
    ],
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
    enrolment: [
      {
        id: '0c0c0c0c-0c0c-7c0c-8c0c-0c0c0c0c0c0c',
        institution_id: INSTITUTION,
        learner_id: LEARNER,
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        class_group_id: CLASS_GROUP,
        status: 'active',
        start_date: '2027-01-05',
        entry_reason: 'new_admission',
      },
    ],
    fee_item: [
      {
        id: FEE_ITEM,
        institution_id: INSTITUTION,
        code: 'TUITION',
        name: 'Tuition',
        category: 'tuition',
        refundable: false,
        taxable: false,
        priority: 1,
        funding_source: 'parent',
      },
    ],
    fee_schedule: [
      {
        id: SCHEDULE,
        institution_id: INSTITUTION,
        name: 'Form 1 2027',
        academic_year_id: YEAR,
        academic_period_ids: [PERIOD],
        programme_ids: [],
        level_ids: [LEVEL],
        residence_statuses: [],
        fee_category_ids: [],
        new_learners_only: false,
        version: 1,
        status: 'published',
      },
      {
        id: EMPTY_SCHEDULE,
        institution_id: INSTITUTION,
        name: 'Form 3 2027',
        academic_year_id: YEAR,
        academic_period_ids: [],
        programme_ids: [],
        level_ids: [],
        residence_statuses: [],
        fee_category_ids: [],
        new_learners_only: false,
        version: 1,
        status: 'draft',
      },
    ],
    fee_schedule_line: [
      {
        id: '0d0d0d0d-0d0d-7d0d-8d0d-0d0d0d0d0d0d',
        institution_id: INSTITUTION,
        fee_schedule_id: SCHEDULE,
        fee_item_id: FEE_ITEM,
        amount: money(150_005),
        mandatory: true,
        frequency: 'per_term',
        proration_rule: 'full',
      },
    ],
    invoice: [
      {
        id: INVOICE,
        institution_id: INSTITUTION,
        number: 'INV-000001',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-02-01',
        due_date: '2027-02-28',
        total: money(150_005),
        status: 'posted',
      },
      {
        id: FINE_INVOICE,
        institution_id: INSTITUTION,
        number: 'INV-000002',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-02-03',
        total: money(50_000),
        status: 'posted',
      },
      {
        id: OPENING_INVOICE,
        institution_id: INSTITUTION,
        number: 'INV-000003',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-01-02',
        total: money(25_000),
        status: 'posted',
      },
      {
        id: LAST_INVOICE,
        institution_id: INSTITUTION,
        number: 'INV-000004',
        learner_id: LEARNER,
        academic_period_id: LAST_PERIOD,
        issue_date: '2026-02-01',
        total: money(90_000),
        status: 'posted',
      },
    ],
    invoice_line: [
      {
        id: '0e0e0e0e-0e0e-7e0e-8e0e-0e0e0e0e0e0e',
        institution_id: INSTITUTION,
        invoice_id: INVOICE,
        fee_item_id: FEE_ITEM,
        description: 'Tuition',
        amount: money(150_005),
        kind: 'fee',
      },
      {
        id: '0e0e0e0e-0e0e-7e0e-8e0e-111111111111',
        institution_id: INSTITUTION,
        invoice_id: FINE_INVOICE,
        description: 'Damaged textbook',
        amount: money(50_000),
        kind: 'fine',
      },
      {
        id: '0e0e0e0e-0e0e-7e0e-8e0e-222222222222',
        institution_id: INSTITUTION,
        invoice_id: OPENING_INVOICE,
        description: 'Opening balance',
        amount: money(25_000),
        kind: 'opening_balance',
      },
      {
        id: '0e0e0e0e-0e0e-7e0e-8e0e-333333333333',
        institution_id: INSTITUTION,
        invoice_id: LAST_INVOICE,
        description: 'Tuition',
        amount: money(90_000),
        kind: 'fee',
      },
    ],
    payment: [
      {
        id: PAYMENT,
        institution_id: INSTITUTION,
        learner_id: LEARNER,
        amount: money(100_000),
        channel: 'cash',
        received_at: '2026-10-01T09:00:00.000Z',
        reference: 'RCPT-1',
        status: 'posted',
      },
    ],
    receipt: [
      {
        id: '0f0f0f0f-0f0f-7f0f-8f0f-0f0f0f0f0f0f',
        institution_id: INSTITUTION,
        number: 'RCT-000001',
        payment_id: PAYMENT,
        issued_at: '2026-10-01T09:00:00.000Z',
        status: 'issued',
      },
    ],
    payment_allocation: [],
    credit_note: [
      {
        id: CREDIT_NOTE,
        institution_id: INSTITUTION,
        number: 'CNT-000001',
        learner_id: LEARNER,
        invoice_id: INVOICE,
        amount: money(10_000),
        reason: 'Scholarship',
        issue_date: '2027-02-06',
        status: 'posted',
      },
    ],
    installment_plan: [
      {
        id: PLAN,
        institution_id: INSTITUTION,
        name: 'Three term plan',
        academic_period_id: PERIOD,
        installments: [
          { sequence: 1, due_date: '2027-01-15', percent: 40 },
          { sequence: 2, due_date: '2027-05-15', percent: 60 },
        ],
      },
    ],
  });
}

let repository: FinanceRepositoryDouble;

beforeEach(() => {
  toast.showSuccess.mockClear();
  toast.showError.mockClear();
  repository = seed();
});

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>{ui}</CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );

const dialog = async () => screen.findByRole('dialog');

describe('every migrated finance page renders from the repository', () => {
  const cases: readonly [string, React.ReactElement, string | RegExp][] = [
    ['fee schedules', <FeeTemplatesContent />, 'Form 1 2027'],
    ['student payments', <StudentPaymentsPageContent />, 'RCT-000001'],
    ['payment allocation', <PaymentAllocationPageContent />, 'Payment allocation'],
    ['fee adjustments', <FeeAdjustmentsPageContent />, 'CNT-000001'],
    ['fines', <FeesFinesPageContent />, 'Damaged textbook'],
    ['installments', <FeesInstallmentsPageContent />, 'Three term plan'],
    ['opening balances', <StudentOpeningBalancesPageContent />, 'INV-000003'],
    ['collection summary', <FeeCollectionSummaryPageContent />, 'Tuition'],
    ['financial summary', <StudentFinancialSummaryPageContent />, 'Jane Wanjiru'],
    ['students paid book', <StudentsPaidBookPageContent />, 'RCT-000001'],
    ['fees due', <FeesDueReportPageContent />, 'Jane Wanjiru'],
    ['votehead statement', <VoteheadStatementPageContent />, 'Votehead statement'],
    ['previous session fees', <PreviousSessionFeesPageContent />, 'INV-000004'],
    ['dashboard', <FinanceDashboardPageContent />, 'Finance dashboard'],
    ['invoice generation', <InvoiceGenerationPageContent />, 'Invoice generation'],
    ['fee structures', <EffectFeeStructuresPageContent />, 'Fee structures and billing run'],
  ];

  it.each(cases)('renders %s', async (_name, element, expected) => {
    renderPage(element);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});

describe('writes reach the repository', () => {
  it('records a payment with the exact minor units and issues a receipt', async () => {
    renderPage(<StudentPaymentsPageContent />);
    await screen.findByText('RCT-000001');
    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '1500.05' } });
    fireEvent.change(within(modal).getByLabelText(/Channel/), { target: { value: 'cash' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(repository.writes.some((write) => write.entity === 'payment')).toBe(true));
    const payment = (repository.rows.payment ?? []).find((row) => row.amount && (row.amount as { amount_minor: number }).amount_minor === 150_005);
    expect(payment).toBeDefined();
    expect(payment?.learner_id).toBe(LEARNER);
    expect((repository.rows.receipt ?? []).length).toBe(2);
  });

  it('allocates a posted payment and marks the invoice paid', async () => {
    renderPage(<PaymentAllocationPageContent />);
    await screen.findByText('Payment allocation');
    fireEvent.click(screen.getByTestId('allocation-payment-picker'));
    fireEvent.click(await screen.findByRole('option', { name: /RCPT-1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Allocate payment/i }));
    const modal = await dialog();
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(repository.writes.some((write) => write.entity === 'payment_allocation')).toBe(true)
    );
    const allocation = (repository.rows.payment_allocation ?? [])[0];
    expect((allocation?.amount as { amount_minor: number }).amount_minor).toBe(100_000);
    const target = (repository.rows.invoice ?? []).find((row) => row.id === allocation?.invoice_id);
    expect(target?.status).toBe('paid');
  });

  it('creates a fee schedule with the year chosen through EntityPicker', async () => {
    renderPage(<FeeTemplatesContent />);
    await screen.findByText('Form 1 2027');
    fireEvent.click(screen.getByRole('button', { name: /Add Fee Schedule/i }));
    const modal = await dialog();

    fireEvent.change(within(modal).getByLabelText(/Schedule name/), {
      target: { value: 'Form 2 2027' },
    });
    fireEvent.click(within(modal).getByRole('combobox', { name: /Academic year/ }));
    fireEvent.click(await screen.findByRole('option', { name: /2027/ }));
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(repository.writes.some((write) => write.entity === 'fee_schedule')).toBe(true)
    );
    const schedule = (repository.rows.fee_schedule ?? []).find((row) => row.name === 'Form 2 2027');
    expect(schedule?.academic_year_id).toBe(YEAR);
  });

  it('creates an installment plan with a dated installment', async () => {
    renderPage(<FeesInstallmentsPageContent />);
    await screen.findByText('Three term plan');
    fireEvent.click(screen.getByRole('button', { name: /Add installment plan/i }));
    const modal = await dialog();

    fireEvent.change(within(modal).getByLabelText(/Plan name/), {
      target: { value: 'Two-part plan' },
    });
    fireEvent.change(within(modal).getByLabelText(/Due date/), { target: { value: '2027-03-01' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(repository.writes.some((write) => write.entity === 'installment_plan')).toBe(true)
    );
    const plan = (repository.rows.installment_plan ?? []).find((row) => row.name === 'Two-part plan');
    expect((plan?.installments as { due_date: string }[])[0]?.due_date).toBe('2027-03-01');
  });
});

describe('the posting freeze is the repository’s rule', () => {
  it('surfaces the refusal when a posted payment is edited', async () => {
    renderPage(<StudentPaymentsPageContent />);
    await screen.findByText('RCT-000001');
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const modal = await dialog();
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '2000.00' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);
    expect(await within(modal).findByText(/posted_immutable/)).toBeInTheDocument();
  });

  it('surfaces the refusal when a posted fine is edited', async () => {
    renderPage(<FeesFinesPageContent />);
    await screen.findByText('Damaged textbook');
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const modal = await dialog();
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '600.00' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);
    expect(await within(modal).findByText(/posted_immutable/)).toBeInTheDocument();
  });

  it('surfaces the refusal when a posted credit note is edited', async () => {
    renderPage(<FeeAdjustmentsPageContent />);
    await screen.findByText('CNT-000001');
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const modal = await dialog();
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '200.00' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);
    expect(await within(modal).findByText(/posted_immutable/)).toBeInTheDocument();
  });
});

describe('money never drifts through a float', () => {
  it('adds a payment of 15 000.05 as the integer 1 500 005', async () => {
    renderPage(<StudentPaymentsPageContent />);
    await screen.findByText('RCT-000001');
    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    const modal = await dialog();
    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '15000.05' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const created = (repository.rows.payment ?? []).find(
        (row) => (row.amount as { amount_minor: number } | undefined)?.amount_minor === 1_500_005
      );
      expect(created).toBeDefined();
    });
  });
});

/** The row of a grid that shows the given text. */
const gridRow = async (text: string | RegExp): Promise<HTMLElement> => {
  const cell = await screen.findByText(text);
  const row = cell.closest('tr');
  expect(row).not.toBeNull();
  return row as HTMLElement;
};

describe('a fee schedule keeps its lines while the schedule is edited', () => {
  it('adds, edits and deletes a fee schedule line', async () => {
    renderPage(<FeeTemplatesContent />);
    const row = await gridRow('Form 1 2027');
    fireEvent.click(within(row).getByRole('button', { name: /Lines/ }));

    const linesDialog = await screen.findByRole('dialog');
    fireEvent.click(within(linesDialog).getByRole('button', { name: /Add fee line/i }));

    const form = (await screen.findAllByRole('dialog')).at(-1) as HTMLElement;
    fireEvent.click(within(form).getByRole('combobox', { name: /Fee item/i }));
    fireEvent.click(await screen.findByRole('option', { name: /TUITION Tuition/ }));
    fireEvent.change(within(form).getByLabelText(/Amount/), { target: { value: '250.00' } });
    fireEvent.submit(form.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const added = (repository.rows.fee_schedule_line ?? []).filter(
        (line) => (line.amount as { amount_minor: number }).amount_minor === 25_000
      );
      expect(added).toHaveLength(1);
      expect(added[0]?.fee_schedule_id).toBe(SCHEDULE);
    });

    const added = (repository.rows.fee_schedule_line ?? []).find(
      (line) => (line.amount as { amount_minor: number }).amount_minor === 25_000
    );
    const addedId = String(added?.id);

    // The line is edited in place: its id stays, its amount moves.
    const addedRow = await gridRow(/250\.00/);
    fireEvent.click(within(addedRow).getByRole('button', { name: /^Edit$/i }));
    const editForm = (await screen.findAllByRole('dialog')).at(-1) as HTMLElement;
    fireEvent.change(within(editForm).getByLabelText(/Amount/), { target: { value: '300.00' } });
    fireEvent.submit(editForm.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const edited = (repository.rows.fee_schedule_line ?? []).find((line) => line.id === addedId);
      expect((edited?.amount as { amount_minor: number }).amount_minor).toBe(30_000);
      expect(repository.writes.some((write) => write.entity === 'fee_schedule_line' && write.action === 'update')).toBe(true);
    });

    // The removal is persisted, and the seeded line is untouched.
    const editedRow = await gridRow(/300\.00/);
    fireEvent.click(within(editedRow).getByRole('button', { name: /^Delete$/i }));
    const confirmText = await screen.findByText('Delete this fee line?');
    const confirmDialog = confirmText.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /^Delete$/i }));

    await waitFor(() => {
      const live = (repository.rows.fee_schedule_line ?? []).filter((line) => !line.deleted_at);
      expect(live).toHaveLength(1);
      expect(String(live[0]?.id)).toBe('0d0d0d0d-0d0d-7d0d-8d0d-0d0d0d0d0d0d');
    });
  });

  it('saves a changed schedule name and period and keeps the lines', async () => {
    renderPage(<FeeTemplatesContent />);
    const row = await gridRow('Form 1 2027');
    fireEvent.click(within(row).getByRole('button', { name: /^Edit$/i }));
    const modal = await dialog();

    fireEvent.change(within(modal).getByLabelText(/Schedule name/), {
      target: { value: 'Form 1 2027 (revised)' },
    });

    // The period is a reference chosen through the picker, and the stored one is removed.
    fireEvent.click(within(modal).getByRole('button', { name: 'Remove Term 1 2027' }));

    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const schedule = (repository.rows.fee_schedule ?? []).find((entry) => entry.id === SCHEDULE);
      expect(schedule?.name).toBe('Form 1 2027 (revised)');
      expect(schedule?.academic_period_ids).toEqual([]);
    });

    const lines = (repository.rows.fee_schedule_line ?? []).filter(
      (line) => line.fee_schedule_id === SCHEDULE && !line.deleted_at
    );
    expect(lines).toHaveLength(1);
  });

  it('saves the level selection of a schedule', async () => {
    renderPage(<FeeTemplatesContent />);
    const row = await gridRow('Form 3 2027');
    fireEvent.click(within(row).getByRole('button', { name: /^Edit$/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Add level/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Form 1' }));
    const levels = within(modal).getByRole('group', { name: 'Levels' });
    await waitFor(() => expect(within(levels).getByRole('button', { name: 'Add' })).toBeEnabled());
    fireEvent.click(within(levels).getByRole('button', { name: 'Add' }));
    expect(await within(modal).findByRole('button', { name: 'Remove Form 1' })).toBeInTheDocument();
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const schedule = (repository.rows.fee_schedule ?? []).find(
        (entry) => entry.id === EMPTY_SCHEDULE
      );
      expect(schedule?.level_ids).toEqual([LEVEL]);
    });
  });
});

describe('a charge is posted as a one-line invoice', () => {
  it('posts a fine against a learner', async () => {
    renderPage(<FeesFinesPageContent />);
    await screen.findByText('Damaged textbook');
    fireEvent.click(screen.getByRole('button', { name: /Add fine/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '250.00' } });
    fireEvent.change(within(modal).getByLabelText(/^Reason$/), {
      target: { value: 'Late library book' },
    });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const line = (repository.rows.invoice_line ?? []).find(
        (entry) => entry.description === 'Late library book'
      );
      expect(line).toBeDefined();
      expect(line?.kind).toBe('fine');
      expect((line?.amount as { amount_minor: number }).amount_minor).toBe(25_000);

      const invoice = (repository.rows.invoice ?? []).find((entry) => entry.id === line?.invoice_id);
      expect(invoice?.status).toBe('posted');
      expect(invoice?.learner_id).toBe(LEARNER);
    });
  });

  it('posts an opening balance and surfaces the freeze when it is edited', async () => {
    renderPage(<StudentOpeningBalancesPageContent />);
    await screen.findByText('INV-000003');
    fireEvent.click(screen.getByRole('button', { name: /Add opening balance/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '1200.00' } });
    fireEvent.change(within(modal).getByLabelText(/Description/), {
      target: { value: 'Brought forward from 2026' },
    });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      const line = (repository.rows.invoice_line ?? []).find(
        (entry) => entry.description === 'Brought forward from 2026'
      );
      expect(line?.kind).toBe('opening_balance');
      expect((line?.amount as { amount_minor: number }).amount_minor).toBe(120_000);
    });

    // The balance is posted, so the edit path is the repository's refusal.
    const balanceRow = await gridRow(/1[,.]?200\.00/);
    fireEvent.click(within(balanceRow).getByRole('button', { name: /^Edit$/i }));
    const edit = await dialog();
    fireEvent.change(within(edit).getByLabelText(/Amount/), { target: { value: '1300.00' } });
    fireEvent.submit(edit.querySelector('form') as HTMLFormElement);
    expect(await within(edit).findByText(/posted_immutable/)).toBeInTheDocument();
  });
});

describe('a form refuses what it cannot save', () => {
  it('keeps the payment dialog open when the learner is missing', async () => {
    renderPage(<StudentPaymentsPageContent />);
    await screen.findByText('RCT-000001');
    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    const modal = await dialog();

    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    expect(
      await within(modal).findByText(/Please fix the highlighted fields before saving/)
    ).toBeInTheDocument();
    expect(repository.writes.some((write) => write.entity === 'payment')).toBe(false);
  });

  it('shows the save error inside the payment dialog and keeps it open', async () => {
    const create = vi
      .spyOn(repository, 'create')
      .mockRejectedValueOnce(new Error('Database is read-only'));
    renderPage(<StudentPaymentsPageContent />);
    await screen.findByText('RCT-000001');
    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '500.00' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    expect(await within(modal).findByText(/Database is read-only/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    create.mockRestore();
  });

  it('refuses a fine with no reason before it writes anything', async () => {
    renderPage(<FeesFinesPageContent />);
    await screen.findByText('Damaged textbook');
    fireEvent.click(screen.getByRole('button', { name: /Add fine/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '250.00' } });
    fireEvent.change(within(modal).getByLabelText(/^Reason$/), { target: { value: '  ' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    expect(await within(modal).findByText(/Describe the fine/)).toBeInTheDocument();
    expect(repository.writes.some((write) => write.entity === 'invoice')).toBe(false);
  });

  it('shows the save error inside the fine dialog and keeps it open', async () => {
    const create = vi
      .spyOn(repository, 'create')
      .mockRejectedValueOnce(new Error('Database is read-only'));
    renderPage(<FeesFinesPageContent />);
    await screen.findByText('Damaged textbook');
    fireEvent.click(screen.getByRole('button', { name: /Add fine/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '250.00' } });
    fireEvent.change(within(modal).getByLabelText(/^Reason$/), {
      target: { value: 'Broken window' },
    });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    expect(await within(modal).findByText(/Database is read-only/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    create.mockRestore();
  });

  it('refuses a payment of zero before it writes anything', async () => {
    renderPage(<StudentPaymentsPageContent />);
    await screen.findByText('RCT-000001');
    fireEvent.click(screen.getByRole('button', { name: /Record payment/i }));
    const modal = await dialog();

    fireEvent.click(within(modal).getByRole('combobox', { name: /Learner/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '0' } });
    fireEvent.submit(modal.querySelector('form') as HTMLFormElement);

    expect(await within(modal).findByText(/greater than zero/)).toBeInTheDocument();
    expect(repository.writes.some((write) => write.entity === 'payment')).toBe(false);
  });
});

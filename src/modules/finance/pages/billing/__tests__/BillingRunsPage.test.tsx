// ABOUTME: The billing-run page, driven through the repository: choose a period, preview the run and
// ABOUTME: read the reason each learner is billed and the exceptions panel, without writing anything.

import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

import { createFinanceRepositoryDouble } from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';
import { BillingRunsPageContent } from '../BillingRunsPage';

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const YEAR = '21111111-1111-7111-8111-111111111111';
const PERIOD = '22222222-2222-7222-8222-222222222222';
const LEVEL = '33333333-3333-7333-8333-333333333333';
const PROGRAMME = '55555555-5555-7555-8555-555555555555';
const CLASS_GROUP = '66666666-6666-7666-8666-666666666666';
const LEARNER = '77777777-7777-7777-8777-777777777777';
const FEE_ITEM = '99999999-9999-7999-8999-999999999999';
const FEE_CATEGORY = 'cccccccc-cccc-7ccc-8ccc-cccccccccccc';
const SCHEDULE = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';

function seed() {
  return createFinanceRepositoryDouble({
    institution: [{ id: INSTITUTION, name: 'Test School', base_currency: 'KES' }],
    academic_year: [
      {
        id: YEAR,
        institution_id: INSTITUTION,
        calendar_id: 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb',
        name: '2027',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        status: 'current',
      },
    ],
    academic_period: [
      {
        id: PERIOD,
        institution_id: INSTITUTION,
        academic_year_id: YEAR,
        kind: 'term',
        sequence: 1,
        name: 'Term 1',
        start_date: '2027-01-05',
        end_date: '2027-04-10',
        is_reporting: true,
        is_billing: true,
        status: 'current',
      },
    ],
    level: [
      {
        id: LEVEL,
        institution_id: INSTITUTION,
        stage_id: 'dddddddd-dddd-7ddd-8ddd-dddddddddddd',
        code: 'F1',
        name: 'Form 1',
        ordinal: 1,
        is_terminal: false,
      },
    ],
    programme: [{ id: PROGRAMME, institution_id: INSTITUTION, code: 'CBC', name: 'CBC' }],
    fee_category: [{ id: FEE_CATEGORY, institution_id: INSTITUTION, code: 'CITIZEN', name: 'Citizen' }],
    class_group: [
      {
        id: CLASS_GROUP,
        institution_id: INSTITUTION,
        campus_id: 'eeeeeeee-eeee-7eee-8eee-eeeeeeeeeeee',
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
        id: 'ffffffff-ffff-7fff-8fff-ffffffffffff',
        institution_id: INSTITUTION,
        learner_id: LEARNER,
        academic_year_id: YEAR,
        programme_id: PROGRAMME,
        level_id: LEVEL,
        class_group_id: CLASS_GROUP,
        status: 'active',
        start_date: '2027-01-05',
        entry_reason: 'new_admission',
        fee_category_ids: [FEE_CATEGORY],
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
        name: 'Term 1 2027 Fees',
        academic_year_id: YEAR,
        academic_period_ids: [PERIOD],
        programme_ids: [PROGRAMME],
        level_ids: [LEVEL],
        residence_statuses: ['day'],
        fee_category_ids: [FEE_CATEGORY],
        new_learners_only: false,
        version: 1,
        status: 'published',
      },
    ],
    fee_schedule_line: [
      {
        id: '12121212-1212-7121-8121-121212121212',
        institution_id: INSTITUTION,
        fee_schedule_id: SCHEDULE,
        fee_item_id: FEE_ITEM,
        level_id: LEVEL,
        residence_status: 'day',
        amount: { amount_minor: 600_000, currency: 'KES' },
        mandatory: true,
        frequency: 'per_term',
        proration_rule: 'full',
      },
    ],
  });
}

function renderPage() {
  const repository = seed();
  render(
    <MemoryRouter>
      <CanonicalRepositoryProvider repository={repository}>
        <BillingRunsPageContent />
      </CanonicalRepositoryProvider>
    </MemoryRouter>
  );
  return repository;
}

describe('the billing-run page', () => {
  it('previews the run and shows the reason each learner is billed, writing nothing', async () => {
    const repository = renderPage();

    fireEvent.click(await screen.findByRole('combobox', { name: /Academic period/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Term 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Preview$/i }));

    expect(await screen.findByText(/priced from Term 1 2027 Fees v1 \(published\)/)).toBeInTheDocument();
    expect(screen.getByText(/Jane Wanjiru/)).toBeInTheDocument();
    expect(screen.getByText(/Would create 1 invoice for KES 6,000\.00/)).toBeInTheDocument();
    expect(screen.getByTestId('billing-run-key').textContent).toContain('billing-run:');
    // A preview writes nothing.
    expect(repository.writes).toHaveLength(0);
  });

  it('reports a learner who is already billed in the exceptions panel', async () => {
    const repository = seed();
    repository.publish('invoice', [
      {
        id: '13131313-1313-7131-8131-131313131313',
        institution_id: INSTITUTION,
        number: 'INV/2027/1/000001',
        learner_id: LEARNER,
        academic_period_id: PERIOD,
        issue_date: '2027-01-05',
        total: { amount_minor: 600_000, currency: 'KES' },
        status: 'posted',
      },
    ]);
    repository.publish('invoice_line', [
      {
        id: '14141414-1414-7141-8141-141414141414',
        institution_id: INSTITUTION,
        invoice_id: '13131313-1313-7131-8131-131313131313',
        fee_item_id: FEE_ITEM,
        description: 'TUITION Tuition (Term 1 2027 Fees v1)',
        amount: { amount_minor: 600_000, currency: 'KES' },
        kind: 'fee',
      },
    ]);

    render(
      <MemoryRouter>
        <CanonicalRepositoryProvider repository={repository}>
          <BillingRunsPageContent />
        </CanonicalRepositoryProvider>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('combobox', { name: /Academic period/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Term 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Preview$/i }));

    expect(await screen.findByTestId('billing-exceptions')).toBeInTheDocument();
    expect(screen.getByText(/Already billed \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/already holds invoice INV\/2027\/1\/000001/)).toBeInTheDocument();
  });
});

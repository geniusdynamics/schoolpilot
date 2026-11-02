// ABOUTME: The student financial summary states a learner's credit and closes at the statement's
// ABOUTME: balance when their payments exceed what was billed.

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';

import { createFinanceRepositoryDouble } from '../../data/__tests__/canonicalRepositoryDouble';
import { money } from '../../data/canonicalFinance';
import { StudentFinancialSummaryPageContent } from '../StudentFinancialSummaryPage';

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const LEARNER = '77777777-7777-7777-8777-777777777777';
const INVOICE = '13131313-1313-7131-8131-131313131313';
const PAYMENT = '14141414-1414-7141-8141-141414141414';
const ALLOCATION = '15151515-1515-7151-8151-151515151515';

function seed() {
  return createFinanceRepositoryDouble({
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
        number: 'INV-000001',
        learner_id: LEARNER,
        issue_date: '2027-01-10',
        total: money(100_000),
        status: 'posted',
      },
    ],
    payment: [
      {
        id: PAYMENT,
        institution_id: INSTITUTION,
        learner_id: LEARNER,
        amount: money(150_000),
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
        amount: money(100_000),
        allocated_at: '2027-02-05T09:00:00.000Z',
      },
    ],
  });
}

describe('the student financial summary', () => {
  it('shows the credit and a negative balance for a learner who overpaid', async () => {
    render(
      <MemoryRouter>
        <CanonicalRepositoryProvider repository={seed()}>
          <StudentFinancialSummaryPageContent />
        </CanonicalRepositoryProvider>
      </MemoryRouter>
    );

    const cell = await screen.findByText('Jane Wanjiru');
    const row = cell.closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('KES 1,000.00');
    expect(row).toHaveTextContent('KES 1,500.00');
    expect(row).toHaveTextContent('KES 500.00');
    expect(row).toHaveTextContent('KES -500.00');
  });
});

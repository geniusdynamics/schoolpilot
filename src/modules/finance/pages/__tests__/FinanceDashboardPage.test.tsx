// ABOUTME: The finance dashboard waits for its documents before showing totals, so the collection
// ABOUTME: rate never reads 0% while the allocations are still loading.

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/BarChart', () => ({ default: () => <div>chart</div> }));
vi.mock('@/components/ui/DonutChart', () => ({ default: () => <div>chart</div> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const state = vi.hoisted(() => ({ finance: {} as Record<string, unknown> }));

vi.mock('../../data/canonicalFinance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/canonicalFinance')>();
  return {
    ...actual,
    useCanonicalFinance: () => state.finance,
  };
});

import { FinanceDashboardPageContent } from '../FinanceDashboardPage';

const money = (amountMinor: number) => ({ amount_minor: amountMinor, currency: 'KES' });

function finance(overrides: Record<string, unknown>) {
  return {
    status: 'success',
    ready: true,
    error: null,
    learners: [],
    learnerRows: [],
    classGroups: [],
    levels: [],
    periods: [],
    years: [],
    feeItems: [],
    feeSchedules: [],
    feeScheduleLines: [],
    invoices: [],
    invoiceLines: [],
    payments: [],
    allocations: [],
    receipts: [],
    creditNotes: [],
    refunds: [],
    discountRules: [],
    sponsorships: [],
    installmentPlans: [],
    scheduleRows: [],
    invoiceRows: [],
    paymentRows: [],
    allocationRows: [],
    invoiceLineRows: [],
    ...overrides,
  };
}

function renderPage() {
  render(
    <MemoryRouter>
      <FinanceDashboardPageContent />
    </MemoryRouter>
  );
}

describe('the finance dashboard', () => {
  beforeEach(() => {
    state.finance = finance({ status: 'loading', ready: false });
  });

  it('waits for the documents instead of showing a collection rate of 0%', () => {
    renderPage();

    expect(screen.getByTestId('finance-dashboard-loading')).toHaveTextContent(/Reading/);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('states a failed first read instead of spinning forever', () => {
    state.finance = finance({ status: 'error', ready: false });
    renderPage();

    expect(screen.getByTestId('finance-dashboard-error')).toHaveTextContent(/could not be read/);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('shows the real rate once every read has produced its data', () => {    state.finance = finance({
      invoiceRows: [
        {
          id: 'invoice-1',
          number: 'INV-000001',
          learnerId: 'learner-1',
          learnerName: 'Jane Wanjiru',
          periodId: null,
          periodName: '',
          issueDate: '2027-01-10',
          dueDate: '2027-01-31',
          total: money(100_000),
          paid: money(40_000),
          balance: money(60_000),
          status: 'posted',
          lineCount: 1,
          row: {},
        },
      ],
    });
    renderPage();

    expect(screen.queryByTestId('finance-dashboard-loading')).not.toBeInTheDocument();
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
  });
});

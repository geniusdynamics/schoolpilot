// ABOUTME: Smoke tests for the finance pages whose entity the registry does not model: the legacy rows
// ABOUTME: still render, while the learner and period they reference are chosen through EntityPicker.

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFinanceRepositoryDouble } from '../../data/__tests__/canonicalRepositoryDouble';

import { GeneralReceiptsPageContent } from '../GeneralReceiptsPage';
import { StudentTransportAssignmentsPageContent } from '../StudentTransportAssignmentsPage';
import { TransportRoutesPageContent } from '../TransportRoutesPage';

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const finance = vi.hoisted(() => ({
  generalPayments: [
    {
      id: 'gp-1',
      payer_type: 'Other',
      payer_id: null,
      payer_name_external: 'Wellwisher',
      payment_date: '2027-02-01',
      payment_method: 'Cash',
      reference_no: 'GR-1',
      notes: '',
      total_amount_paid: 500,
      items: [],
    },
  ],
  customers: [] as unknown[],
  chartOfAccounts: [] as unknown[],
  transportRoutes: [
    { id: 'route-1', name: 'Westlands', cost_per_period: 1500, gl_revenue_account_id: null },
  ],
  studentTransportAssignments: [
    {
      id: 'assign-1',
      student_id: '77777777-7777-7777-8777-777777777777',
      route_id: 'route-1',
      school_period_id: '22222222-2222-7222-8222-222222222222',
      status: 'Active',
    },
  ],
  addGeneralPayment: vi.fn(),
  updateGeneralPayment: vi.fn(),
  deleteGeneralPayment: vi.fn(),
  addTransportRoute: vi.fn(),
  updateTransportRoute: vi.fn(),
  deleteTransportRoute: vi.fn(),
  addStudentTransportAssignment: vi.fn(),
  updateStudentTransportAssignment: vi.fn(),
  deleteStudentTransportAssignment: vi.fn(),
}));

vi.mock('@/modules/finance/hooks/useFinance', () => ({
  useFinance: () => finance,
  default: () => finance,
}));

const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const LEARNER = '77777777-7777-7777-8777-777777777777';
const PERIOD = '22222222-2222-7222-8222-222222222222';

const repository = () =>
  createFinanceRepositoryDouble({
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
    academic_period: [
      {
        id: PERIOD,
        institution_id: INSTITUTION,
        academic_year_id: '21111111-1111-7111-8111-111111111111',
        kind: 'term',
        sequence: 1,
        name: 'Term 1 2027',
        start_date: '2027-01-01',
        end_date: '2027-04-30',
        is_reporting: true,
        is_billing: true,
        status: 'current',
      },
    ],
  });

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository()}>{ui}</CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('gap pages keep their legacy rows and pick canonical references', () => {
  it('renders a general receipt and offers the learner picker', async () => {
    renderPage(<GeneralReceiptsPageContent />);
    expect(await screen.findByText('Wellwisher')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Record Receipt/i }));
    const dialog = await screen.findByRole('dialog');
    const payerType = dialog.querySelector('[name="payer_type"]') as HTMLSelectElement;
    fireEvent.change(payerType, { target: { value: 'Student' } });
    expect(await screen.findByTestId('general-receipt-learner-picker')).toBeInTheDocument();
  });

  it('renders a transport assignment with the learner and period resolved', async () => {
    renderPage(<StudentTransportAssignmentsPageContent />);
    expect(await screen.findByText('Westlands')).toBeInTheDocument();
    expect(await screen.findByText(/Jane Wanjiru/)).toBeInTheDocument();
    expect(await screen.findByText('Term 1 2027')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Assign Student to Route/i }));
    await screen.findByRole('dialog');
    expect(await screen.findByTestId('transport-student-picker')).toBeInTheDocument();
    expect(await screen.findByTestId('transport-period-picker')).toBeInTheDocument();
  });

  it('renders a transport route', async () => {
    renderPage(<TransportRoutesPageContent />);
    expect(await screen.findByText('Westlands')).toBeInTheDocument();
  });
});

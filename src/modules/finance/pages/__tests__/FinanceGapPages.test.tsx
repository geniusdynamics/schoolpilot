// ABOUTME: CRUD tests for the finance pages whose entity the registry does not model: the legacy
// ABOUTME: receipt rows still render and still write through useFinance(), while the learner they
// ABOUTME: reference is chosen through EntityPicker.

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFinanceRepositoryDouble } from '../../data/__tests__/canonicalRepositoryDouble';

import { GeneralReceiptsPageContent } from '../GeneralReceiptsPage';

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

const REVENUE_ACCOUNT = {
  id: 'b7e2d3c4-0000-4000-8000-000000000010',
  account_code: '4100',
  name: 'Transport Income',
  type: 'Revenue',
  is_active: true,
};

const RECEIPTS = [
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
];

const finance = vi.hoisted(() => ({
  generalPayments: [] as Record<string, unknown>[],
  customers: [] as unknown[],
  chartOfAccounts: [] as unknown[],
  addGeneralPayment: vi.fn(),
  updateGeneralPayment: vi.fn(),
  deleteGeneralPayment: vi.fn(),
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

const field = (dialog: HTMLElement, name: string) => {
  const element = dialog.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
  if (!element) throw new Error(`field ${name} not found`);
  return element;
};

const change = (dialog: HTMLElement, name: string, value: string) =>
  fireEvent.change(field(dialog, name), { target: { name, value } });

beforeEach(() => {
  vi.clearAllMocks();
  finance.chartOfAccounts = [REVENUE_ACCOUNT];
  finance.generalPayments = RECEIPTS.map((row) => ({ ...row }));
  for (const mock of [
    finance.addGeneralPayment,
    finance.updateGeneralPayment,
    finance.deleteGeneralPayment,
  ]) {
    mock.mockResolvedValue(undefined);
  }
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

});

describe('general receipts still write through the legacy layer', () => {
  it('records a receipt with its total and revenue-coded item', async () => {
    renderPage(<GeneralReceiptsPageContent />);
    await screen.findByText('Wellwisher');
    fireEvent.click(screen.getByRole('button', { name: /Record Receipt/i }));
    const dialog = await screen.findByRole('dialog');

    change(dialog, 'payer_name_external', 'Harambee guest');
    change(dialog, 'item_description_0', 'Hall hire');
    change(dialog, 'item_amount_0', '1500');
    change(dialog, 'item_revenue_account_id_0', REVENUE_ACCOUNT.id);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record Receipt' }));

    await waitFor(() => expect(finance.addGeneralPayment).toHaveBeenCalledTimes(1));
    expect(finance.addGeneralPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        payer_name_external: 'Harambee guest',
        total_amount_paid: 1500,
        items: [
          expect.objectContaining({
            description: 'Hall hire',
            amount: 1500,
            revenue_account_id: REVENUE_ACCOUNT.id,
          }),
        ],
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits a receipt and deletes it', async () => {
    renderPage(<GeneralReceiptsPageContent />);
    await screen.findByText('Wellwisher');
    fireEvent.click(screen.getByRole('button', { name: /View\/Edit/i }));
    const dialog = await screen.findByRole('dialog');

    change(dialog, 'item_description_0', 'Donation');
    change(dialog, 'item_amount_0', '750');
    change(dialog, 'item_revenue_account_id_0', REVENUE_ACCOUNT.id);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(finance.updateGeneralPayment).toHaveBeenCalledTimes(1));
    expect(finance.updateGeneralPayment).toHaveBeenCalledWith(
      'gp-1',
      expect.objectContaining({ total_amount_paid: 750 })
    );

    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await confirmDelete();
    await waitFor(() => expect(finance.deleteGeneralPayment).toHaveBeenCalledWith('gp-1'));
  });

  it('refuses a receipt with a blank item before it writes anything', async () => {
    renderPage(<GeneralReceiptsPageContent />);
    await screen.findByText('Wellwisher');
    fireEvent.click(screen.getByRole('button', { name: /Record Receipt/i }));
    const dialog = await screen.findByRole('dialog');

    change(dialog, 'payer_name_external', 'Harambee guest');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record Receipt' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /Each item must have a description, valid amount, and revenue account/i
    );
    expect(finance.addGeneralPayment).not.toHaveBeenCalled();
  });

  it('shows the save error in the receipt dialog and keeps it open', async () => {
    finance.addGeneralPayment.mockRejectedValueOnce(new Error('Database is read-only'));
    renderPage(<GeneralReceiptsPageContent />);
    await screen.findByText('Wellwisher');
    fireEvent.click(screen.getByRole('button', { name: /Record Receipt/i }));
    const dialog = await screen.findByRole('dialog');

    change(dialog, 'payer_name_external', 'Harambee guest');
    change(dialog, 'item_description_0', 'Hall hire');
    change(dialog, 'item_amount_0', '500');
    change(dialog, 'item_revenue_account_id_0', REVENUE_ACCOUNT.id);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record Receipt' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Database is read-only/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});


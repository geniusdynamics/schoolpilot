// ABOUTME: Tests the bulk opening-balance grid: a positive amount posts an opening_balance invoice,
// ABOUTME: a negative amount posts a prepayment credit note, one document per learner.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));
const confirm = vi.hoisted(() => vi.fn(async () => true));
const createChargeInvoice = vi.hoisted(() =>
  vi.fn(async () => ({ invoice: { number: 'INV-000010' } }))
);
const createCreditNote = vi.hoisted(() => vi.fn(async () => ({ number: 'CNT-000010' })));

const learners = [
  {
    id: 'learner-1',
    name: 'Amina Wanjiku',
    admissionNumber: 'ADM-001',
    status: 'enrolled',
    className: 'Form 1 Blue',
    levelId: 'level-1',
    levelName: 'Form 1',
    row: { id: 'learner-1' },
  },
  {
    id: 'learner-2',
    name: 'Brian Otieno',
    admissionNumber: 'ADM-002',
    status: 'enrolled',
    className: 'Form 1 Blue',
    levelId: 'level-1',
    levelName: 'Form 1',
    row: { id: 'learner-2' },
  },
];

vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('@/components/ui/ConfirmDialog', () => ({ useConfirm: () => confirm }));
vi.mock('../../services/canonicalFinanceService', () => ({ createChargeInvoice, createCreditNote }));
vi.mock('../../data/canonicalFinance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/canonicalFinance')>();
  return {
    ...actual,
    useCanonicalFinance: () => ({ learnerRows: learners }),
    useFinanceRepository: () => ({}),
  };
});

import { BulkOpeningBalancesPageContent } from '../BulkOpeningBalancesPage';

describe('bulk opening balances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a charge for a positive amount and a credit note for a negative one', async () => {
    render(<BulkOpeningBalancesPageContent />);

    fireEvent.change(screen.getByLabelText('Opening balance for Amina Wanjiku'), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText('Opening balance for Brian Otieno'), {
      target: { value: '-500' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post balances \(2\)/ }));

    await waitFor(() => expect(createChargeInvoice).toHaveBeenCalledTimes(1));
    expect(createChargeInvoice).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        learnerId: 'learner-1',
        amount: { amount_minor: 100_000, currency: 'KES' },
        kind: 'opening_balance',
      })
    );
    expect(createCreditNote).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        learnerId: 'learner-2',
        amount: { amount_minor: 50_000, currency: 'KES' },
        reason: 'Opening balance prepayment',
        status: 'posted',
      })
    );
    expect(await screen.findByText('INV-000010')).toBeInTheDocument();
    expect(await screen.findByText('CNT-000010')).toBeInTheDocument();
  });
});

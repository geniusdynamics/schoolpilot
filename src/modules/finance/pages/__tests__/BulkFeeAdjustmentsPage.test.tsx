// ABOUTME: Tests the bulk fee adjustment page: the class grid posts one canonical fine invoice or
// ABOUTME: credit note per learner, with a common or per-learner amount.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));
const confirm = vi.hoisted(() => vi.fn(async () => true));
const createChargeInvoice = vi.hoisted(() => vi.fn(async () => ({})));
const createCreditNote = vi.hoisted(() => vi.fn(async () => ({ id: 'note-1' })));

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

import { BulkFeeAdjustmentsPageContent } from '../BulkFeeAdjustmentsPage';

describe('bulk fee adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a fine invoice for every learner shown with the common amount', async () => {
    render(<BulkFeeAdjustmentsPageContent />);

    fireEvent.change(screen.getByLabelText('Common amount'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Library fine' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post fines \(2\)/ }));

    await waitFor(() => expect(createChargeInvoice).toHaveBeenCalledTimes(2));
    expect(createChargeInvoice).toHaveBeenNthCalledWith(
      1,
      {},
      expect.objectContaining({
        learnerId: 'learner-1',
        description: 'Library fine',
        amount: { amount_minor: 50_000, currency: 'KES' },
        kind: 'fine',
      })
    );
    expect(createChargeInvoice).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({ learnerId: 'learner-2' })
    );
  });

  it('posts posted credit notes in exemption mode', async () => {
    render(<BulkFeeAdjustmentsPageContent />);

    fireEvent.change(screen.getByLabelText('Kind'), {
      target: { value: 'exemption' },
    });
    fireEvent.change(screen.getByLabelText('Common amount'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Board scholarship' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post exemptions \(2\)/ }));

    await waitFor(() => expect(createCreditNote).toHaveBeenCalledTimes(2));
    expect(createCreditNote).toHaveBeenNthCalledWith(
      1,
      {},
      expect.objectContaining({
        learnerId: 'learner-1',
        reason: 'Board scholarship',
        amount: { amount_minor: 25_000, currency: 'KES' },
        status: 'posted',
      })
    );
  });
});

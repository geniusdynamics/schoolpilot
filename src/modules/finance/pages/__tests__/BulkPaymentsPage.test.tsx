// ABOUTME: Tests the class payment grid: each priced learner gets one payment through the cashier
// ABOUTME: port, with the batch channel, date and distribution, and the row shows its receipt.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));
const confirm = vi.hoisted(() => vi.fn(async () => true));
const recordPayment = vi.hoisted(() =>
  vi.fn(async (input: { learnerId: string }) => ({ receipt: { number: `RCT-${input.learnerId}` } }))
);

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
vi.mock('../cashier/runtime', () => ({
  useCashierRuntimePort: () => ({ recordPayment }),
}));
vi.mock('../../data/canonicalFinance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/canonicalFinance')>();
  return {
    ...actual,
    useCanonicalFinance: () => ({ learnerRows: learners }),
  };
});

import { BulkPaymentsPageContent } from '../BulkPaymentsPage';

describe('class payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records one payment per priced learner with the batch policy', async () => {
    render(<BulkPaymentsPageContent cashierName="Grace" />);

    fireEvent.change(screen.getByLabelText('Amount for Amina Wanjiku'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByLabelText('Amount for Brian Otieno'), {
      target: { value: '2500' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post payments \(2\)/ }));

    await waitFor(() => expect(recordPayment).toHaveBeenCalledTimes(2));
    expect(recordPayment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        learnerId: 'learner-1',
        amount: { amount_minor: 150_000, currency: 'KES' },
        channel: 'cash',
        strategy: 'vote_head_priority',
        cashierName: 'Grace',
      })
    );
    expect(recordPayment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ learnerId: 'learner-2', amount: { amount_minor: 250_000, currency: 'KES' } })
    );
    expect(await screen.findByText('RCT-learner-1')).toBeInTheDocument();
  });
});

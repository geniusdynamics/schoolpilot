// ABOUTME: Tests the fee reminder screen: it lists a learner with a balance, previews the message and
// ABOUTME: sends through the active SMS gateway's API.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
}));
const confirm = vi.hoisted(() => vi.fn(async () => true));
const send = vi.hoisted(() =>
  vi.fn(async () => ({ success: true, messageId: 'MSG-1', status: 'sent' }))
);

const learner = {
  id: 'learner-1',
  name: 'Amina Wanjiku',
  admissionNumber: 'ADM-001',
  status: 'enrolled',
  className: 'Form 1 Blue',
  levelId: 'level-1',
  levelName: 'Form 1',
  row: { id: 'learner-1' },
};
const invoice = {
  id: 'invoice-1',
  number: 'INV-1',
  learnerId: 'learner-1',
  learnerName: 'Amina Wanjiku',
  periodId: 'period-1',
  periodName: 'Term 1',
  issueDate: '2027-01-05',
  dueDate: '2027-02-05',
  status: 'posted',
  total: { amount_minor: 100_000, currency: 'KES' },
  paid: { amount_minor: 40_000, currency: 'KES' },
  balance: { amount_minor: 60_000, currency: 'KES' },
  lineCount: 1,
  row: { id: 'invoice-1' },
};
const link = {
  id: 'link-1',
  learner_id: 'learner-1',
  guardian_id: 'guardian-1',
  receives_sms: true,
  is_fee_payer: true,
  is_primary: true,
  priority: 1,
  relationship: 'mother',
};
const guardian = {
  id: 'guardian-1',
  given_name: 'Grace',
  family_name: 'Wanjiku',
  phones: [{ number: '+254700000001' }],
};

vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('@/components/ui/ConfirmDialog', () => ({ useConfirm: () => confirm }));
vi.mock('@/hooks/useSchoolProfile', () => ({
  useSchoolProfile: () => ({ profile: { name: 'SchoolPilot' } }),
}));
vi.mock('@/plugins/usePlugins', () => ({
  usePlugins: () => ({
    getPlugin: () => ({
      manifest: { id: 'com.schoolpilot.sms-gateway' },
      status: 'active',
      api: { send },
    }),
  }),
}));
vi.mock('@/data/query', () => ({
  useEntityQuery: (_repository: unknown, entity: string) => ({
    data: {
      items:
        entity === 'learner_guardian'
          ? [link]
          : entity === 'guardian'
            ? [guardian]
            : [],
    },
  }),
}));
vi.mock('../../data/canonicalFinance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/canonicalFinance')>();
  return {
    ...actual,
    useCanonicalFinance: () => ({
      learnerRows: [learner],
      invoiceRows: [invoice],
      creditNotes: [],
    }),
    useFinanceRepository: () => ({}),
  };
});

import { FeeRemindersPageContent } from '../FeeRemindersPage';

describe('fee reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('previews and sends one message to the learner guardian', async () => {
    render(<FeeRemindersPageContent />);

    expect(await screen.findByText('Amina Wanjiku')).toBeInTheDocument();
    expect(screen.getAllByText(/600\.00/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Send reminders \(1\)/ }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(
      '+254700000001',
      expect.stringContaining('Amina Wanjiku')
    );
    expect(send).toHaveBeenCalledWith(
      '+254700000001',
      expect.stringContaining('600.00')
    );
    expect(await screen.findByText('MSG-1')).toBeInTheDocument();
  });
});

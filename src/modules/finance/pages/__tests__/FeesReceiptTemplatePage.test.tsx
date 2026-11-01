// ABOUTME: Tests the receipt layout editor: the preview reads the saved school profile and the layout
// ABOUTME: saves the paper profile and header the cashier's receipt uses.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

import { FeesReceiptTemplatePageContent } from '../FeesReceiptTemplatePage';
import { RECEIPT_LAYOUT_STORAGE_KEY } from '../../data/receiptLayout';

const seedProfile = () =>
  fake.current.collections.school_details.seed([
    {
      id: 's1',
      name: 'Probe Academy',
      postal_address: 'P.O. Box 1',
      town: 'Nairobi',
      telephone: '0700',
      email: 'info@probe.ke',
    },
  ]);

describe('FeesReceiptTemplatePage layout', () => {
  beforeEach(() => {
    localStorage.removeItem(RECEIPT_LAYOUT_STORAGE_KEY);
    vi.clearAllMocks();
  });

  it('shows the saved school identity in the real receipt preview', async () => {
    seedProfile();
    render(<FeesReceiptTemplatePageContent />);

    expect(await screen.findByText('Probe Academy')).toBeInTheDocument();
    expect(screen.getByText('P.O. Box 1, Nairobi')).toBeInTheDocument();
    expect(screen.getByText('0700 | info@probe.ke')).toBeInTheDocument();
    expect(screen.getByText('OFFICIAL RECEIPT')).toBeInTheDocument();
  });

  it('saves the paper profile and header title', async () => {
    seedProfile();
    render(<FeesReceiptTemplatePageContent />);

    fireEvent.change(screen.getByLabelText('Header title'), {
      target: { value: 'FEE RECEIPT' },
    });
    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: 'a4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));

    const stored = JSON.parse(localStorage.getItem(RECEIPT_LAYOUT_STORAGE_KEY) ?? '{}');
    expect(stored).toMatchObject({ template: 'a4', title: 'FEE RECEIPT' });
    expect(toast.showSuccess).toHaveBeenCalled();
  });
});

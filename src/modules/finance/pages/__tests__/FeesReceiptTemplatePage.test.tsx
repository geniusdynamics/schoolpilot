// ABOUTME: Tests that fee receipts carry the school name and contacts saved in school_details.
// ABOUTME: Covers the receipt preview for a template without its own school name and the new-template prefill.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const templates = vi.hoisted(() => [{
  id: 't1', name: 'Standard', school_name: '', school_address: '', school_phone: '', school_email: '',
  header_text: 'OFFICIAL RECEIPT', footer_text: 'Thanks', logo_url: '', is_default: true,
}]);
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({ receiptTemplates: templates, loading: { all: false } }),
}));

import FeesReceiptTemplatePage from '../FeesReceiptTemplatePage';

const seedProfile = () => fake.current.collections.school_details.seed([{
  id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi', telephone: '0700', email: 'info@probe.ke',
}]);

describe('FeesReceiptTemplatePage receipts', () => {
  it('prints the saved school name and contacts on the receipt', async () => {
    seedProfile();
    render(<FeesReceiptTemplatePage />);
    await screen.findByText('Standard');
    fireEvent.click(screen.getByTitle('Preview'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Probe Academy')).toBeTruthy();
    expect(within(dialog).getByText('P.O. Box 1, Nairobi')).toBeTruthy();
    expect(within(dialog).getByText('0700 | info@probe.ke')).toBeTruthy();
  });

  it('prefills a new template with the saved school profile', async () => {
    seedProfile();
    render(<FeesReceiptTemplatePage />);
    await screen.findByText('Standard');
    // the profile has loaded once the grid shows the school name for the blank template
    await screen.findByText('Probe Academy');
    fireEvent.click(screen.getByRole('button', { name: /New Template/ }));
    const input = await screen.findByPlaceholderText('Your school name') as HTMLInputElement;
    expect(input.value).toBe('Probe Academy');
  });
});

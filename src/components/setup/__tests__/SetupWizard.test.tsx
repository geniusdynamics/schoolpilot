// ABOUTME: Tests that the setup wizard's School Profile step saves to school_details (not a 'settings' collection).
// ABOUTME: Advancing past the step writes or updates the single school profile record (probe C02).

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return {
    current: createFakeDatabaseService([
      'school_details', 'education_system_configurations', 'academic_years', 'period_definitions',
      'school_periods', 'classes', 'class_streams', 'subjects', 'fee_templates',
    ]),
  };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

import { SetupWizard, clearWizardDraft } from '../SetupWizard';

const fillSchoolStep = (name: string) => {
  fireEvent.change(screen.getByPlaceholderText('e.g. Greenfields Academy'), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText('P.O. Box 1234, Nairobi'), { target: { value: 'P.O. Box 9, Nakuru' } });
  fireEvent.change(screen.getByPlaceholderText('+254 700 000 000'), { target: { value: '0711' } });
};

describe('SetupWizard school profile step', () => {
  beforeEach(() => {
    clearWizardDraft();
    fake.current.collections.school_details.seed([]);
    toast.showError.mockClear();
  });

  it('creates the school_details record when advancing past the step', async () => {
    render(<SetupWizard onComplete={() => {}} />);
    fillSchoolStep('Probe Academy');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => expect(fake.current.collections.school_details.rows.size).toBe(1));
    const [saved] = Array.from(fake.current.collections.school_details.rows.values()) as any[];
    expect(saved).toMatchObject({ name: 'Probe Academy', postal_address: 'P.O. Box 9, Nakuru', telephone: '0711' });
    expect(saved.created_at).toBeTruthy();
    expect(toast.showError).not.toHaveBeenCalled();
    expect((await screen.findAllByText(/Step 2 of/)).length).toBeGreaterThan(0);
  });

  it('updates an existing school_details record instead of adding another', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Old Name', school_code: 'S001', created_at: 'x', updated_at: 'x' }]);
    render(<SetupWizard onComplete={() => {}} />);
    await waitFor(() => expect(fake.current.collections.school_details.listenerCount()).toBeGreaterThan(0));
    fillSchoolStep('New Name');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    await waitFor(() => expect(fake.current.collections.school_details.rows.get('s1').name).toBe('New Name'));
    expect(fake.current.collections.school_details.rows.size).toBe(1);
    expect(fake.current.collections.school_details.rows.get('s1').school_code).toBe('S001');
  });
});

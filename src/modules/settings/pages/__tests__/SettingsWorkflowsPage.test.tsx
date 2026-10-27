// ABOUTME: The Workflows tab lists the school's workflows and, for one of them, its states. Both tables must render without
// ABOUTME: React reporting two columns with one key: the actions column used to take the key of the id column.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({
  workflows: [
    {
      id: 1,
      name: 'Leave approval',
      states: [{ id: 11, workflow_id: 1, name: 'Requested', sequence_order: 1 }],
    },
  ] as unknown[],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    workflows: state.workflows,
    loading: { workflows: false },
    refreshCollection: vi.fn(),
  }),
}));

vi.mock('../../hooks/useSettingsAccess', () => ({ useSettingsAccess: () => ({ can: () => true }) }));
vi.mock('@/hooks/useToast', () => ({ useToastHelpers: () => ({ showError: vi.fn(), showSuccess: vi.fn() }) }));
vi.mock('@/services/database/UnifiedDatabaseManager', () => ({ UnifiedDatabaseManager: { getInstance: () => ({}) } }));

import { SettingsWorkflowsContent } from '../SettingsWorkflowsPage';

describe('the Workflows tab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the workflows and then their states without two columns sharing a key', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<SettingsWorkflowsContent />);
    expect(screen.getByText('Leave approval')).toBeTruthy();

    // React reports a repeated key once, so both tables are drawn before the log is read.
    fireEvent.click(screen.getByRole('button', { name: 'workflows.manageStates' }));
    expect(screen.getByText('Requested')).toBeTruthy();

    const keyWarnings = consoleError.mock.calls.filter((call) => String(call[0]).includes('same key'));
    expect(keyWarnings).toEqual([]);
  });
});

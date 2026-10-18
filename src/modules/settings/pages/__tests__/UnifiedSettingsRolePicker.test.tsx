// ABOUTME: Page tests for the Settings › Users role picker (P0-H04, SO-22): role ids are UUID strings,
// ABOUTME: so selecting a role must keep the string id and the users grid must resolve the role name.

import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { FullWidthProvider } from '@/contexts/FullWidthContext';

const ROLE_ADMIN = '874b9758-1f2e-4c1a-9d3e-0a1b2c3d4e5f';
const ROLE_TEACHER = '9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() }),
}));

vi.mock('@/hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({ config: {}, isLoading: false }),
}));

vi.mock('../FeatureSettingsPage', () => ({ default: () => null }));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    schoolDetails: null,
    users: [
      { id: 'user-1', username: 'jwanjiru', email: 'jane@example.com', userType: 'teacher', isActive: true, role_id: ROLE_TEACHER },
      // Legacy record written while role ids were coerced to numbers.
      { id: 'user-2', username: 'okamau', email: 'otieno@example.com', userType: 'admin', isActive: true, role_id: 2 },
    ],
    roles: [
      { id: ROLE_ADMIN, name: 'Administrator' },
      { id: ROLE_TEACHER, name: 'Class Teacher' },
      { id: '2', name: 'Bursar' },
    ],
    workflows: [],
    loading: {},
    isOnline: true,
    appVersion: 'test',
    isDatabaseModeActive: true,
    isUsingRxDBDummyData: false,
    triggerSeedRxDB: vi.fn(),
    triggerClearRxDB: vi.fn(),
    initializationError: null,
  }),
}));

import { UnifiedSettingsContent } from '../UnifiedSettingsPage';

const openUsersTab = () => {
  render(
    <MemoryRouter>
      <FullWidthProvider>
        <ConfirmProvider>
          <UnifiedSettingsContent />
        </ConfirmProvider>
      </FullWidthProvider>
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: /tabs\.users/ }));
};

describe('UnifiedSettings role picker (P0-H04)', () => {
  it('shows the role name for a user whose role_id is a UUID string', () => {
    openUsersTab();
    const row = screen.getByText('jwanjiru').closest('tr')!;
    expect(within(row).getByText('Class Teacher')).toBeInTheDocument();
  });

  it('resolves a legacy numeric role_id against the string role id', () => {
    openUsersTab();
    const row = screen.getByText('okamau').closest('tr')!;
    expect(within(row).getByText('Bursar')).toBeInTheDocument();
  });

  it('keeps the string role id when editing a user and choosing another role', async () => {
    openUsersTab();
    const row = screen.getByText('jwanjiru').closest('tr')!;
    fireEvent.click(within(row).getAllByRole('button')[0]);
    const dialog = await screen.findByRole('dialog');
    const roleSelect = dialog.querySelector('select[name="role_id"]') as HTMLSelectElement;

    expect(roleSelect).toHaveValue(ROLE_TEACHER);
    fireEvent.change(roleSelect, { target: { value: ROLE_ADMIN } });
    expect(roleSelect).toHaveValue(ROLE_ADMIN);
  });
});

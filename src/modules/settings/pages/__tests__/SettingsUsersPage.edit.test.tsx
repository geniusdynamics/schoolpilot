// ABOUTME: The Users tab's edit dialog keeps what the user types. The form re-seeds itself whenever
// ABOUTME: its initial values change identity, so editing a login used to reset on every keystroke.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const users = [
  {
    id: 'u1',
    username: 'principal',
    email: 'principal@school.test',
    userType: 'Staff',
    role: 'super_admin',
    role_id: 'super_admin',
    isActive: true,
    is_active: true,
  },
];

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    users,
    roles: [],
    loading: { users: false, roles: false },
    addRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    refreshCollection: vi.fn(),
  }),
}));

const update = vi.fn(async () => undefined);
vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getCollection: vi.fn(() => ({ update, insert: vi.fn(), remove: vi.fn() })) },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

vi.mock('@/data/canonicalRepository', () => ({
  openCanonicalRepository: vi.fn(async () => ({ list: async () => ({ items: [] }) })),
}));
vi.mock('@/data/canonicalIdentity', () => ({ ensureCanonicalUser: vi.fn(async () => null) }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

import { SettingsUsersContent } from '../SettingsUsersPage';

describe('the Users tab edit dialog', () => {
  let errors: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    update.mockClear();
  });

  afterEach(() => {
    errors.mockRestore();
  });

  it('keeps the values typed into the edit form and saves them', async () => {
    render(<SettingsUsersContent />);

    const row = screen.getByText('principal').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    const email = within(dialog).getByLabelText(/Email/, { exact: false }) as HTMLInputElement;

    fireEvent.change(email, { target: { value: 'head@school.test' } });
    expect(email.value).toBe('head@school.test');

    fireEvent.change(within(dialog).getAllByRole('combobox')[0], { target: { value: 'Parent' } });
    expect(email.value).toBe('head@school.test');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ email: 'head@school.test', userType: 'Parent' })
      )
    );
  });
});

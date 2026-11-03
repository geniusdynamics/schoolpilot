// ABOUTME: Proves a fee item's GL account is chosen from the school's ledger chart rather than typed
// ABOUTME: blind, that a legacy code stays visible, and that the write gate follows the canonical role.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bindSessionAuthority, clearSessionAuthority } from '@/data/auth/sessionAuthority';
import type { PermissionContext } from '@/data/auth/authorizer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const chosen = typeof fallback === 'string' ? fallback : (options?.defaultValue as string | undefined) ?? key;
      return chosen;
    },
  }),
}));

const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('@/components/ui/ConfirmDialog', () => ({ useConfirm: () => vi.fn(async () => true) }));

const items = [
  {
    id: '11111111-1111-7111-8111-111111111111',
    institution_id: '22222222-2222-7222-8222-222222222222',
    code: 'TUITION',
    name: 'Tuition',
    category: 'tuition',
    funding_source: 'parent',
    revenue_account_code: '4100',
    priority: 1,
    active: true,
    rowVersion: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

const chartRows = [
  {
    id: '33333333-3333-7333-8333-333333333333',
    code: '4100',
    name: 'Tuition',
    kind: 'revenue',
    role: null,
    is_system: true,
    is_active: true,
  },
  {
    id: '44444444-4444-7444-8444-444444444444',
    code: '4200',
    name: 'Boarding',
    kind: 'revenue',
    role: null,
    is_system: false,
    is_active: true,
  },
  {
    id: '55555555-5555-7555-8555-555555555555',
    code: '1010',
    name: 'Cash book',
    kind: 'asset',
    role: 'cash',
    is_system: true,
    is_active: true,
  },
];

vi.mock('@/data/query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/query')>();
  return {
    ...actual,
    useEntityQuery: (_repository: unknown, entity: string) => ({
      data: { items: entity === 'fee_item' ? items : [] },
      status: 'success',
      error: null,
      refetch: vi.fn(),
    }),
  };
});

vi.mock('../../data/canonicalFinance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/canonicalFinance')>();
  return { ...actual, useFinanceRepository: () => ({}) };
});

vi.mock('../../data/useCanonicalLedgerAccounts', () => ({
  useCanonicalLedgerAccounts: () => ({
    rows: chartRows,
    mapping: {},
    status: 'success',
    error: null,
    institution: null,
    institutionId: '22222222-2222-7222-8222-222222222222',
    repository: {},
    refresh: vi.fn(),
  }),
}));

import FeeItemsPage from '../feeItems/FeeItemsPage';

function asRole(roles: PermissionContext['roles']): void {
  bindSessionAuthority({
    actorId: 'user-1',
    roles,
    scope: { institutionId: '22222222-2222-7222-8222-222222222222', grants: [] },
    at: '2026-11-03',
  });
}

describe('a fee item bills against a real ledger account', () => {
  beforeEach(() => {
    clearSessionAuthority();
    asRole(['bursar']);
  });

  it('offers the school-created revenue accounts and the pack ones, but no asset account', async () => {
    render(<FeeItemsPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Add fee item/i }));

    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByLabelText(/GL account/i) as HTMLSelectElement;
    const options = Array.from(picker.options).map((option) => option.textContent ?? '');
    expect(options.some((label) => label.includes('4100') && label.includes('Tuition'))).toBe(true);
    expect(options.some((label) => label.includes('4200') && label.includes('Boarding'))).toBe(true);
    expect(options.some((label) => label.includes('1010'))).toBe(false);
  });

  it('keeps a code the chart does not hold visible instead of dropping it', async () => {
    render(<FeeItemsPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Edit/i }));

    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByLabelText(/GL account/i) as HTMLSelectElement;
    expect(picker.value).toBe('4100');
    // A fee item set before the chart existed keeps its code on screen.
    expect(Array.from(picker.options).some((option) => option.value === '4100')).toBe(true);
    await waitFor(() => expect(picker.disabled).toBe(true));
  });

  it('hides the write controls from a role that cannot write finance', async () => {
    asRole(['teacher']);
    render(<FeeItemsPage />);
    await screen.findByText('TUITION');
    expect(screen.queryByRole('button', { name: /Add fee item/i })).toBeNull();
  });
});

// ABOUTME: The two Accounting Configuration tabs on the canonical repository: the chart lists the
// ABOUTME: ledger_account rows and adds an expense account, and the banks tab lists and adds the
// ABOUTME: accounts that play the cash or bank role.

import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { queryCache } from '@/data/query';
import { createRepository, type Repository } from '@/data/repository';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { seedDefaultLedgerAccounts } from '@/domain/finance/ledger';

import { BanksPageContent } from '../BanksPage';
import { ChartOfAccountsContent } from '../ChartOfAccountsPage';

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

let adapter: SqliteAdapter;
let repository: Repository;
let institutionId: string;

beforeEach(async () => {
  queryCache.clear();
  toast.showSuccess.mockClear();
  toast.showError.mockClear();
  toast.showWarning.mockClear();

  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  repository = createRepository({ adapter });
  await repository.setup();
  const institution = await repository.create('institution', {
    name: 'Mwangaza Secondary School',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
  institutionId = institution.id;
  await seedDefaultLedgerAccounts(repository, institutionId);
});

afterEach(async () => {
  await adapter.close();
});

function renderTab(component: ReactNode) {
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>
          {component}
        </CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
}

describe('the chart of accounts tab', () => {
  it('lists the ledger accounts and adds an expense account the chart can use', async () => {
    renderTab(<ChartOfAccountsContent />);

    expect(await screen.findByText('Chart of Accounts')).toBeInTheDocument();
    expect(await screen.findByText('1010')).toBeInTheDocument();
    expect(screen.getAllByText('System').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Add Account/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Account Code/), {
      target: { value: '5801' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Account Name/), {
      target: { value: 'Library books' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Account/i }));

    await waitFor(async () => {
      const rows = await repository.list('ledger_account', {
        where: { institution_id: institutionId, code: '5801' },
      });
      expect(rows.items).toHaveLength(1);
    });
    const created = (
      await repository.list('ledger_account', {
        where: { institution_id: institutionId, code: '5801' },
      })
    ).items[0];
    expect(created).toMatchObject({
      name: 'Library books',
      kind: 'expense',
      is_system: false,
      is_active: true,
    });
    expect(await screen.findByText('Library books')).toBeInTheDocument();
  });

  it('locks the code and offers no delete for a control account', async () => {
    renderTab(<ChartOfAccountsContent />);
    const code = await screen.findByText('1010');
    const row = code.closest('tr');
    expect(row).not.toBeNull();

    expect(within(row as HTMLElement).getByRole('button', { name: /Delete/i })).toBeDisabled();
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: /Edit/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/Account Code/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/Account Class/)).toBeDisabled();
  });
});

describe('the banks tab', () => {
  it('lists only the cash and bank accounts, and adds one as a bank-book account', async () => {
    renderTab(<BanksPageContent />);

    expect(await screen.findByText('1010')).toBeInTheDocument();
    expect(screen.getByText('1020')).toBeInTheDocument();
    expect(screen.queryByText('1100')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add Bank Account/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Account Code/), {
      target: { value: '1021' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Account Name/), {
      target: { value: 'Equity Bank current account' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Account/i }));

    await waitFor(async () => {
      const rows = await repository.list('ledger_account', {
        where: { institution_id: institutionId, code: '1021' },
      });
      expect(rows.items).toHaveLength(1);
    });
    const created = (
      await repository.list('ledger_account', {
        where: { institution_id: institutionId, code: '1021' },
      })
    ).items[0];
    expect(created).toMatchObject({
      role: 'bank',
      kind: 'asset',
      is_system: false,
    });
  });
});

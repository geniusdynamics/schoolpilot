// ABOUTME: The two Accounting Configuration tabs on the canonical repository: the chart lists the
// ABOUTME: ledger_account rows and adds an expense account; the banks tab adds a bank account linked
// ABOUTME: to a cash or bank ledger account, nominates the account each channel posts to, and lists
// ABOUTME: the accounts themselves below.

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
import { seedDefaultLedgerChart } from '@/domain/finance/ledger';

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
  await seedDefaultLedgerChart(repository, institutionId);
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

  it('locks the code and offers no delete for a system account', async () => {
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
  it('lists the bank accounts with their ledger account and adds one', async () => {
    const bank = (
      await repository.list('ledger_account', {
        where: { institution_id: institutionId, code: '1020' },
      })
    ).items[0];

    renderTab(<BanksPageContent />);

    expect(await screen.findByText('Bank Accounts')).toBeInTheDocument();
    expect(await screen.findByText('No bank accounts yet')).toBeInTheDocument();
    // The ledger accounts themselves stay visible below the bank accounts.
    expect((await screen.findAllByText('1010')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /Add Bank Account/i })[0]!);
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Account name/), {
      target: { value: 'Main account' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Bank/), {
      target: { value: 'Equity Bank' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Account number/), {
      target: { value: '0170123456789' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Ledger account/), {
      target: { value: bank.id },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Bank Account/i }));

    await waitFor(async () => {
      const rows = await repository.list('bank_account', {
        where: { institution_id: institutionId, name: 'Main account' },
      });
      expect(rows.items).toHaveLength(1);
    });
    const created = (
      await repository.list('bank_account', {
        where: { institution_id: institutionId, name: 'Main account' },
      })
    ).items[0];
    expect(created).toMatchObject({
      bank_name: 'Equity Bank',
      account_number: '0170123456789',
      ledger_account_id: bank.id,
      is_default: false,
      is_active: true,
    });
    expect(await screen.findByText('Main account')).toBeInTheDocument();
  });

  it('shows each channel’s effective account and saves a nomination', async () => {
    const second = await repository.create('ledger_account', {
      institution_id: institutionId,
      code: '1021',
      name: 'Equity Bank current account',
      kind: 'asset',
      role: 'bank',
      is_system: false,
      is_active: true,
    });

    renderTab(<BanksPageContent />);

    expect(await screen.findByText('Payment channels')).toBeInTheDocument();
    const bankDeposit = (await screen.findByLabelText('Bank deposit account')) as HTMLSelectElement;
    // The seeded nomination is the bank book; the section prints the account it posts to.
    expect(bankDeposit.closest('tr')?.textContent).toContain('1020');
    expect(bankDeposit.closest('tr')?.textContent).toContain('(nominated)');

    fireEvent.change(bankDeposit, { target: { value: second.id } });

    await waitFor(async () => {
      const rows = await repository.list('channel_account', {
        where: { institution_id: institutionId, channel: 'bank_deposit' },
      });
      expect(rows.items).toHaveLength(1);
      expect(rows.items[0]?.ledger_account_id).toBe(second.id);
    });
    await waitFor(() => {
      expect(bankDeposit.closest('tr')?.textContent).toContain('1021');
      expect(bankDeposit.closest('tr')?.textContent).toContain('Equity Bank current account');
    });
  });

  it('falls back to the chart’s account when a channel has no nomination', async () => {
    const cash = (
      await repository.list('channel_account', {
        where: { institution_id: institutionId, channel: 'cash' },
      })
    ).items[0];
    await repository.remove('channel_account', cash.id);

    renderTab(<BanksPageContent />);

    const cashSelect = (await screen.findByLabelText('Cash account')) as HTMLSelectElement;
    expect(cashSelect.closest('tr')?.textContent).toContain('1010');
    expect(cashSelect.closest('tr')?.textContent).toContain('(default)');
  });
});

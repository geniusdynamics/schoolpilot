// ABOUTME: Tests for the Expenses hub's read-only ledger accounts tab: the chart rows, the cash and
// ABOUTME: bank books, the "defined in code" note, and that nothing offers to add or rename an account.

import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CONTROL_ACCOUNTS,
  DEFAULT_LEDGER_ACCOUNT_MAPPING,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';

import { LedgerAccountsContent } from '../LedgerAccountsContent';
import { ledgerAccountRows } from '../ledgerAccounts';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

describe('ledgerAccountRows', () => {
  it('lists the ledger chart in code order and names the cash and bank books', () => {
    const rows = ledgerAccountRows(DEFAULT_LEDGER_ACCOUNT_MAPPING);

    expect(rows[0]).toMatchObject({ code: CONTROL_ACCOUNTS.cash.code, name: 'Cash', cashOrBank: 'Cash' });
    expect(rows.find((row) => row.code === CONTROL_ACCOUNTS.bank.code)).toMatchObject({
      name: 'Bank',
      kind: 'asset',
      cashOrBank: 'Bank',
    });
    expect(rows.find((row) => row.code === '5000')).toMatchObject({
      name: 'Salaries and wages',
      kind: 'expense',
      cashOrBank: '—',
    });
    const codes = rows.map((row) => row.code);
    expect(codes).toEqual([...codes].sort());
  });
});

describe('LedgerAccountsContent', () => {
  it('shows the chart with code, account, class and the cash or bank marker, read-only', () => {
    render(<LedgerAccountsContent />);

    expect(screen.getByText('Ledger accounts')).toBeInTheDocument();
    expect(screen.getByText(/Adding or renaming an account is not available yet/)).toBeInTheDocument();
    expect(screen.getAllByText('Cash').length).toBeGreaterThanOrEqual(2);
    const expenseRow = screen.getByText('Salaries and wages').closest('tr') as HTMLElement;
    expect(within(expenseRow).getByText('Expense')).toBeInTheDocument();
    expect(within(expenseRow).getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows the empty state when the chart holds no account', () => {
    const empty: LedgerAccountMapping = {
      accounts: () => [],
      account: () => null,
      revenueAccountForFeeItem: () => null,
    };

    render(<LedgerAccountsContent mapping={empty} />);

    expect(screen.getByText('The ledger’s chart holds no accounts')).toBeInTheDocument();
  });
});

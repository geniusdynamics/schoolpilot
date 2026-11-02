// ABOUTME: The Expenses screen on the real canonical repository and ledger: the empty state, and a
// ABOUTME: recorded expense that appears with the voucher number it was given.

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { applySchemaMigrations } from '@/data/migrations';
import { queryCache } from '@/data/query';
import { createRepository, type Repository } from '@/data/repository';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { LedgerService, createSqliteLedgerStore } from '@/domain/finance/ledger';

import { ExpensesContent } from '../ExpensesContent';

const toast = vi.hoisted(() => ({
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast, useToastHelpers: () => toast }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, unknown>) => {
      let text = typeof fallback === 'string' ? fallback : key;
      for (const [name, value] of Object.entries(options ?? {})) {
        text = text.replaceAll(`{{${name}}}`, String(value));
      }
      return text;
    },
  }),
}));

let adapter: SqliteAdapter;
let repository: Repository;
let ledger: LedgerService;

beforeEach(async () => {
  queryCache.clear();
  toast.showSuccess.mockClear();
  toast.showError.mockClear();

  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  repository = createRepository({ adapter });
  await repository.setup();
  await applySchemaMigrations(adapter);
  ledger = new LedgerService({ store: createSqliteLedgerStore(adapter) });

  await repository.create('institution', {
    name: 'Mwangaza Secondary School',
    short_name: 'Mwangaza',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
});

afterEach(async () => {
  await adapter.close();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>
          <ExpensesContent adapter={adapter} />
        </CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
}

describe('the expenses page', () => {
  it('shows the empty state when the school has recorded nothing', async () => {
    renderPage();

    expect(await screen.findByText('No expenses recorded yet')).toBeInTheDocument();
    expect(screen.getByText(/Total of the posted expenses shown/)).toBeInTheDocument();
  });

  it('records an expense and shows it with the voucher number it was given', async () => {
    renderPage();
    await screen.findByText('No expenses recorded yet');

    const [recordButton] = await screen.findAllByRole('button', { name: /Record expense/i });
    fireEvent.click(recordButton);
    const modal = await screen.findByRole('dialog');

    fireEvent.change(within(modal).getByLabelText('Payee'), {
      target: { value: 'Nairobi Electricity' },
    });
    fireEvent.change(within(modal).getByLabelText(/Amount/), { target: { value: '1,250.00' } });
    fireEvent.click(within(modal).getByRole('button', { name: /Record expense/i }));

    await waitFor(async () => {
      const rows = await repository.list('expense', {});
      expect(rows.items).toHaveLength(1);
    });

    const stored = (await repository.list('expense', {})).items[0];
    expect(stored).toMatchObject({
      payee: 'Nairobi Electricity',
      amount: { amount_minor: 125_000, currency: 'KES' },
      status: 'posted',
      expense_account_code: '5000',
      payment_account_code: '1010',
    });
    expect(stored.reference).toMatch(/^EXP-\d{8}-[0-9A-Z]{6}$/);

    expect(await screen.findByText('Nairobi Electricity')).toBeInTheDocument();
    expect((await screen.findAllByText(stored.reference)).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(new RegExp(`Expense recorded\\. Voucher ${stored.reference}`))
    ).toBeInTheDocument();

    expect(await ledger.listEntries({ sourceKind: 'expense' })).toHaveLength(1);
  });
});

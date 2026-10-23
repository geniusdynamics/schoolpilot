// ABOUTME: Proves the accounting reports page opens the ledger on its own: with the canonical
// ABOUTME: database open and no ledger prop, the page shows the figures a posted journal produces
// ABOUTME: rather than the "not connected" message the owner used to see.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { canonicalAdapter, openCanonicalRepository } from '@/data/canonicalRepository';
import { formatMoney, fromMinor } from '@/domain/money';

import AccountingReportsPage from '../AccountingReportsPage';
import { openLedgerOver } from '../useAccountingReports';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallback?: string | Record<string, unknown>,
      maybeOptions?: Record<string, unknown>
    ) => {
      const options = typeof fallback === 'object' ? fallback : maybeOptions;
      return typeof fallback === 'string'
        ? fallback
        : ((options?.defaultValue as string | undefined) ?? _key);
    },
  }),
}));

const INSTITUTION = 'institution-canonical-reports';

/** The cells of a rendered report table, row by row, as the screen shows them. */
function screenTable(testId: string): string[][] {
  const table = screen.getByTestId(testId);
  return Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? '')
  );
}

describe('the accounting reports page on the canonical ledger', () => {
  beforeAll(async () => {
    // Open the one canonical database the app opens, then post a journal through it: this is the
    // ledger the page must reach on its own, with no prop.
    await openCanonicalRepository();
    const adapter: SqliteAdapter | null = canonicalAdapter();
    if (!adapter) throw new Error('the canonical adapter did not open');
    const ledger = await openLedgerOver(adapter);
    // A cash receipt of 200 000 minor units against fee revenue of 200 000, so the cash book closes
    // at 200 000 and the trial balance totals 200 000 on each side.
    await ledger.postInvoice({
      invoice: {
        id: 'canon-inv-1',
        number: 'INV/2027/0001',
        institutionId: INSTITUTION,
        issueDate: '2027-01-10',
        lines: [{ amount: fromMinor(200000, 'KES') }],
      },
    });
    await ledger.postPayment({
      payment: {
        id: 'canon-pay-1',
        institutionId: INSTITUTION,
        amount: fromMinor(200000, 'KES'),
        channel: 'cash',
        receivedAt: '2027-01-12',
      },
      allocations: [{ invoiceId: 'canon-inv-1', amount: fromMinor(200000, 'KES') }],
    });
  });

  it('reads the canonical ledger when it is handed no ledger', async () => {
    render(<AccountingReportsPage institutionId={INSTITUTION} />);

    // The page is wired, so it never shows the not-connected explanation.
    expect(screen.queryByText('The ledger is not connected')).toBeNull();
    expect(await screen.findByTestId('tie-trial-balance')).toHaveTextContent('Ties to the journal');
  });

  it('draws the cash book closing at the balance the posted journal produced', async () => {
    const user = userEvent.setup();
    render(<AccountingReportsPage institutionId={INSTITUTION} />);
    await screen.findByTestId('table-trial-balance');

    await user.click(screen.getByRole('tab', { name: 'Cash Book' }));

    expect(await screen.findByTestId('tie-book')).toHaveTextContent('Ties to the journal');
    const cells = screenTable('table-book');
    // The closing row is the last; its balance cell is the 200 000 minor units that were posted.
    expect(cells[cells.length - 1]?.[5]).toBe(formatMoney(fromMinor(200000, 'KES')));
  });
});

// ABOUTME: Component tests for the accounting reports hub: it reads the ledger, draws each report,
// ABOUTME: shows the tie badge, presents a closed period as read-only, and exports the same figures
// ABOUTME: the screen shows.

import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import {
  createJournalEntry,
  type LedgerService,
} from '@/domain/finance/ledger';
import { formatMoney, fromMinor } from '@/domain/money';

import AccountingReportsPage, {
  AccountingReportsPageContent,
} from '../AccountingReportsPage';
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

const INSTITUTION = 'institution-1';
const CLOCK = () => new Date('2027-02-01T09:00:00.000Z');

let adapter: SqliteAdapter;
let ledger: LedgerService;

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  ledger = await openLedgerOver(adapter);
  // A cash receipt of 200 000 minor units against fee revenue of 200 000, so the cash book closes
  // at 200 000 and the trial balance totals 200 000 on each side.
  await ledger.postInvoice({
    invoice: {
      id: 'inv-1',
      number: 'INV/2027/0001',
      institutionId: INSTITUTION,
      issueDate: '2027-01-10',
      lines: [{ amount: fromMinor(200000, 'KES') }],
    },
  });
  await ledger.postPayment({
    payment: {
      id: 'pay-1',
      institutionId: INSTITUTION,
      amount: fromMinor(200000, 'KES'),
      channel: 'cash',
      receivedAt: '2027-01-12',
    },
    allocations: [{ invoiceId: 'inv-1', amount: fromMinor(200000, 'KES') }],
  });
});

afterEach(async () => {
  await adapter.close();
});

const renderPage = () => render(<AccountingReportsPage ledger={ledger} institutionId={INSTITUTION} />);

/** The cells of a rendered report table, row by row, as the screen shows them. */
function screenTable(testId: string): string[][] {
  const table = screen.getByTestId(testId);
  return Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent ?? '')
  );
}

/** Parses RFC 4180 CSV into rows of cells, so the export is compared rather than trusted. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r') {
      // the \n ends the row
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.length > 0);
}

describe('the accounting reports hub', () => {
  it('says the ledger is not connected when it is handed none', () => {
    // The content component is what "handed none" means. The routed page mounts the canonical
    // repository itself, which is what the test below covers.
    render(<AccountingReportsPageContent />);
    expect(screen.getByText('The ledger is not connected')).toBeInTheDocument();
  });

  it('opens the canonical repository itself, so a direct load of the route has a ledger', async () => {
    // Nothing has opened the canonical database in this file, and neither a ledger nor an adapter is
    // handed in. A bookmark or a reload of /finance/accounting-reports lands exactly here: if the page
    // does not open the repository, the ledger is never opened over it and the page says "The ledger is
    // not connected" instead of showing the reports it exists to show.
    render(<AccountingReportsPage />);
    expect(await screen.findByTestId('tie-trial-balance')).toHaveTextContent('Ties to the journal');
  });

  it('draws the trial balance and states that it ties to the journal', async () => {
    renderPage();
    expect(await screen.findByTestId('tie-trial-balance')).toHaveTextContent('Ties to the journal');
    expect(await screen.findByTestId('table-trial-balance')).toBeInTheDocument();
  });

  it('draws the cash book closing at the balance the ledger reports', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('table-trial-balance');

    await user.click(screen.getByRole('tab', { name: 'Cash Book' }));

    expect(await screen.findByTestId('tie-book')).toHaveTextContent('Ties to the journal');
    const cells = screenTable('table-book');
    // The closing row is the last; its balance cell is 200 000 minor units, shown exactly.
    expect(cells[cells.length - 1]?.[5]).toBe(formatMoney(fromMinor(200000, 'KES')));
  });

  it('presents a closed period with its state and offers no way to edit it', async () => {
    await ledger.closePeriod({
      institutionId: INSTITUTION,
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      name: 'January 2027',
      actor: 'head-1',
      reason: 'January books closed',
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('table-trial-balance');

    await user.click(screen.getByRole('tab', { name: 'Period Close' }));

    const state = await screen.findByTestId(/^period-state-/);
    expect(state).toHaveTextContent('Closed');
    expect(state).toHaveTextContent('head-1');
    expect(state).toHaveTextContent('January books closed');
    // The page refuses to present the closed period as editable: no edit control exists.
    expect(screen.queryByRole('button', { name: /edit|reopen|close period/i })).toBeNull();
    expect(screen.getByTestId('tie-period-close')).toHaveTextContent('Ties to the journal');
  });

  it('exports the very figures the screen shows', async () => {
    const user = userEvent.setup();
    let captured: Blob | null = null;
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
      captured = blob as Blob;
      return 'blob:test';
    });
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    renderPage();
    await screen.findByTestId('table-trial-balance');
    const onScreen = screenTable('table-trial-balance');

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(captured).not.toBeNull();
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(captured as unknown as Blob);
    });

    // Parse the CSV and compare its body to the rendered rows, cell for cell.
    const rows = parseCsv(text);
    expect(rows[0]).toEqual(['Code', 'Account', 'Debit', 'Credit', 'Balance']);
    const body = rows.slice(1);
    expect(body.length).toBe(onScreen.length);
    for (let index = 0; index < onScreen.length; index += 1) {
      expect(body[index]).toEqual(onScreen[index]);
    }

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it('filters the statement to the range it is given', async () => {
    // A second entry dated later, so a range excludes it.
    await ledger.post(
      createJournalEntry(
        {
          institutionId: INSTITUTION,
          entryDate: '2027-03-05',
          source: { kind: 'payment', id: 'jv-1', number: 'JV/2027/0001' },
          narration: 'March bank charge',
          lines: [
            { accountCode: '5100', accountName: 'Bank charges', debit: fromMinor(1000, 'KES') },
            { accountCode: '1020', accountName: 'Bank', credit: fromMinor(1000, 'KES') },
          ],
        },
        { now: CLOCK }
      )
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('table-trial-balance');

    await user.click(screen.getByRole('tab', { name: 'Income & Expenditure' }));
    await screen.findByTestId('table-income-expenditure');

    await user.clear(screen.getByLabelText('To date'));
    await user.type(screen.getByLabelText('To date'), '2027-01-31');

    await waitFor(() => {
      const cells = screenTable('table-income-expenditure');
      // The March bank charge is out of range, so no expense line shows.
      expect(cells.some((row) => row.includes('Bank charges'))).toBe(false);
    });
    expect(within(screen.getByTestId('table-income-expenditure')).getAllByText(/Fee revenue/).length).toBeGreaterThan(0);
  });
});

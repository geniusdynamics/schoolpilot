// ABOUTME: Fixture tests for the accounting reports: a seeded journal posted through the real
// ABOUTME: ledger, with every report's expected figure computed by hand once, and an assertion that
// ABOUTME: each report ties to the journal (its totals, its account movement, its account balance).
// ABOUTME: Every expected number below states how it was derived.

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import {
  createJournalEntry,
  createSqliteLedgerStore,
  ensureLedgerSchema,
  LedgerService,
  type JournalEntry,
} from '@/domain/finance/ledger';
import { formatMoney, fromMinor, type Money } from '@/domain/money';

import {
  balanceSheetReport,
  bankBookReport,
  budgetVsActualReport,
  cashBookReport,
  createAccountClasses,
  entriesInRange,
  incomeExpenditureReport,
  periodCloseReport,
  reportTableToCsv,
  trialBalanceReport,
  type BudgetLine,
  type ReportTable,
} from '../accountingReports';

const INSTITUTION = 'institution-1';
const ACTOR = 'bursar-1';
const HEAD = 'head-1';
const CLOCK = () => new Date('2027-02-01T09:00:00.000Z');

/** Whole minor units of KES. */
const kes = (amountMinor: number): Money => fromMinor(amountMinor, 'KES');

/**
 * The seeded journal. Every figure the reports assert is computed by hand from these six entries:
 *
 * | # | date       | debit                    | credit                   | minor units |
 * |---|------------|--------------------------|--------------------------|-------------|
 * | 1 | 2027-01-05 | 1100 Fee receivables     | 3000 Opening balances    | 500 000     |
 * | 2 | 2027-01-10 | 1100 Fee receivables     | 4000 Fee revenue         | 600 000     |
 * | 3 | 2027-01-12 | 1010 Cash                | 1100 Fee receivables     | 200 000     |
 * | 4 | 2027-01-15 | 1020 Bank                | 1100 Fee receivables     | 150 000     |
 * | 5 | 2027-01-20 | 5000 Salaries            | 1020 Bank                | 120 000     |
 * | 6 | 2027-01-21 | 5100 Bank charges        | 1020 Bank                |   5 000     |
 *
 * Trial balance by hand (minor units):
 *   1010 Cash        debit 200 000                     → +200 000
 *   1020 Bank        debit 150 000, credit 125 000     →  +25 000
 *   1100 Receivables debit 1 100 000, credit 350 000   → +750 000
 *   3000 Opening bal credit 500 000                    → -500 000
 *   4000 Fee revenue credit 600 000                    → -600 000
 *   5000 Salaries    debit 120 000                     → +120 000
 *   5100 Bank charges debit 5 000                      →   +5 000
 *   Total debits 1 575 000 = total credits 1 575 000; the row balances sum to zero.
 */
async function postFixture(ledger: LedgerService): Promise<void> {
  await ledger.postOpeningBalance({
    openingBalance: {
      id: 'ob-1',
      institutionId: INSTITUTION,
      asOfDate: '2027-01-05',
      amount: kes(500000),
      side: 'debit',
    },
  });
  await ledger.postInvoice({
    invoice: {
      id: 'inv-1',
      number: 'INV/2027/0001',
      institutionId: INSTITUTION,
      issueDate: '2027-01-10',
      lines: [{ amount: kes(600000) }],
    },
  });
  await ledger.postPayment({
    payment: {
      id: 'pay-1',
      institutionId: INSTITUTION,
      amount: kes(200000),
      channel: 'cash',
      receivedAt: '2027-01-12',
    },
    allocations: [{ invoiceId: 'inv-1', invoiceNumber: 'INV/2027/0001', amount: kes(200000) }],
  });
  await ledger.postPayment({
    payment: {
      id: 'pay-2',
      institutionId: INSTITUTION,
      amount: kes(150000),
      channel: 'bank_deposit',
      receivedAt: '2027-01-15',
    },
    allocations: [{ invoiceId: 'inv-1', invoiceNumber: 'INV/2027/0001', amount: kes(150000) }],
  });
  // The ledger derives no expense posting (spec 05 §8 lists no expense document), so the two
  // expense entries are posted as validated manual journals, exactly as a bursar's journal voucher.
  await ledger.post(
    createJournalEntry(
      {
        institutionId: INSTITUTION,
        entryDate: '2027-01-20',
        source: { kind: 'payment', id: 'jv-1', number: 'JV/2027/0001' },
        narration: 'January salaries',
        lines: [
          { accountCode: '5000', accountName: 'Salaries', debit: kes(120000) },
          { accountCode: '1020', accountName: 'Bank', credit: kes(120000) },
        ],
      },
      { now: CLOCK }
    )
  );
  await ledger.post(
    createJournalEntry(
      {
        institutionId: INSTITUTION,
        source: { kind: 'payment', id: 'jv-2', number: 'JV/2027/0002' },
        entryDate: '2027-01-21',
        narration: 'January bank charges',
        lines: [
          { accountCode: '5100', accountName: 'Bank charges', debit: kes(5000) },
          { accountCode: '1020', accountName: 'Bank', credit: kes(5000) },
        ],
      },
      { now: CLOCK }
    )
  );
}

let adapter: SqliteAdapter;
let ledger: LedgerService;
let entries: readonly JournalEntry[];

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  await ensureLedgerSchema(adapter);
  ledger = new LedgerService({
    store: createSqliteLedgerStore(adapter),
    actor: ACTOR,
    now: CLOCK,
  });
  await postFixture(ledger);
  entries = await ledger.listEntries({ institutionId: INSTITUTION });
});

afterEach(async () => {
  await adapter.close();
});

/** Parses RFC 4180 CSV back into cells, so an export is compared, not trusted. */
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
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r') {
      // skip; the \n ends the row
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
  return rows;
}

/** The CSV of a table, with its header row, as the screen's cells. */
function csvCells(table: ReportTable): string[][] {
  return parseCsv(reportTableToCsv(table)).filter((row) => row.length > 0);
}

describe('the trial balance report', () => {
  it('ties its totals to the journal and nets to zero', () => {
    const report = trialBalanceReport(entries, 'KES');

    // Hand-derived: the six entries debit 1 575 000 and credit 1 575 000 minor units.
    expect(report.balance.totalDebit.amount_minor).toBe(1575000);
    expect(report.balance.totalCredit.amount_minor).toBe(1575000);
    expect(report.journalDebit.amount_minor).toBe(1575000);
    expect(report.journalCredit.amount_minor).toBe(1575000);
    expect(report.net.amount_minor).toBe(0);

    // The tie, stated as flags so the assertion is the acceptance, not just the numbers.
    expect(report.ties).toEqual({
      balanced: true,
      debitsEqualJournal: true,
      creditsEqualJournal: true,
      netsToZero: true,
    });
  });

  it('agrees with the ledger service the app reads through', async () => {
    const report = trialBalanceReport(entries, 'KES');
    const service = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });

    expect(report.balance.totalDebit.amount_minor).toBe(service.totalDebit.amount_minor);
    expect(report.balance.totalCredit.amount_minor).toBe(service.totalCredit.amount_minor);
    expect(report.balance.rows.map((row) => [row.accountCode, row.balance.amount_minor])).toEqual(
      service.rows.map((row) => [row.accountCode, row.balance.amount_minor])
    );
  });

  it('carries the account balances of the hand-derived table', () => {
    const report = trialBalanceReport(entries, 'KES');
    const balances = new Map(report.balance.rows.map((row) => [row.accountCode, row.balance.amount_minor]));

    // From the hand-derived table above.
    expect(balances.get('1010')).toBe(200000);
    expect(balances.get('1020')).toBe(25000);
    expect(balances.get('1100')).toBe(750000);
    expect(balances.get('3000')).toBe(-500000);
    expect(balances.get('4000')).toBe(-600000);
    expect(balances.get('5000')).toBe(120000);
    expect(balances.get('5100')).toBe(5000);
  });

  it('exports the very figures it shows', () => {
    const report = trialBalanceReport(entries, 'KES');
    const csv = csvCells(report.table);

    expect(csv[0]).toEqual(report.table.columns.map((column) => column.label));
    expect(csv[1]).toEqual(
      report.table.columns.map((column) => report.table.rows[0]?.[column.key] ?? '')
    );
    const totalRow = csv[csv.length - 1];
    // The last row is the Total row; its debit cell is the total the report shows.
    expect(totalRow[2]).toBe(formatMoney(report.balance.totalDebit));
  });
});

describe('the income-and-expenditure report', () => {
  it('nets to the movement in the revenue and expense accounts', () => {
    const report = incomeExpenditureReport(entries, 'KES');

    // Hand-derived: revenue 600 000; expenses 120 000 + 5 000 = 125 000; net 475 000.
    expect(report.totalRevenue.amount_minor).toBe(600000);
    expect(report.totalExpenses.amount_minor).toBe(125000);
    expect(report.net.amount_minor).toBe(475000);

    // The movement in the revenue and expense accounts is (expenses - revenue) = -475 000, so the
    // net is its negation. This is the tie the acceptance asks for.
    expect(report.revenueAndExpenseMovement.amount_minor).toBe(-475000);
    expect(report.ties.netEqualsAccountMovement).toBe(true);
    expect(report.ties.coversEveryAccount).toBe(true);
  });

  it('filters to the period it is asked for', () => {
    const january = entriesInRange(entries, { from: '2027-01-20', to: null });
    const report = incomeExpenditureReport(january, 'KES');

    // Hand-derived: only the two expense entries fall on or after 2027-01-20.
    expect(report.totalRevenue.amount_minor).toBe(0);
    expect(report.totalExpenses.amount_minor).toBe(125000);
    expect(report.net.amount_minor).toBe(-125000);
    expect(report.ties.netEqualsAccountMovement).toBe(true);
  });
});

describe('the balance sheet report', () => {
  it('balances, and agrees with the trial balance it was derived from', () => {
    const report = balanceSheetReport(entries, 'KES');

    // Hand-derived: assets 200 000 + 25 000 + 750 000 = 975 000; equity 500 000; result 475 000.
    expect(report.totalAssets.amount_minor).toBe(975000);
    expect(report.totalLiabilities.amount_minor).toBe(0);
    expect(report.totalEquity.amount_minor).toBe(500000);
    expect(report.retainedEarnings.amount_minor).toBe(475000);
    expect(report.totalLiabilitiesAndEquity.amount_minor).toBe(975000);
    expect(report.unclassified).toEqual([]);

    // The accounting identity the journal guarantees.
    expect(report.ties.balances).toBe(true);
    expect(report.totalAssets.amount_minor).toBe(report.totalLiabilitiesAndEquity.amount_minor);

    // And the result is the income-and-expenditure net over the same entries.
    expect(report.retainedEarnings.amount_minor).toBe(
      incomeExpenditureReport(entries, 'KES').net.amount_minor
    );
  });

  it('classifies every account, so nothing is dropped from the balance', () => {
    const classes = createAccountClasses();
    for (const code of ['1010', '1020', '1100', '3000', '4000', '5000', '5100']) {
      expect(classes.kindOf(code), `${code} must classify`).not.toBeNull();
    }
  });
});

describe('the cash book and the bank book', () => {
  it('closes the cash book at the balance the ledger reports', async () => {
    const report = cashBookReport(entries, 'KES');
    const ledgerBalance = await ledger.accountBalance('1010', {
      institutionId: INSTITUTION,
      currency: 'KES',
    });

    // Hand-derived: the only cash movement is the 200 000 cash receipt (entry 3).
    expect(report.accountCode).toBe('1010');
    expect(report.opening.amount_minor).toBe(0);
    expect(report.totalReceipts.amount_minor).toBe(200000);
    expect(report.totalPayments.amount_minor).toBe(0);
    expect(report.closing.amount_minor).toBe(200000);
    expect(report.ties.closingEqualsLedgerBalance).toBe(true);
    expect(report.ties.openingPlusMovementEqualsClosing).toBe(true);
    expect(report.closing.amount_minor).toBe(ledgerBalance.amount_minor);
  });

  it('closes the bank book at the balance the ledger reports', async () => {
    const report = bankBookReport(entries, 'KES');
    const ledgerBalance = await ledger.accountBalance('1020', {
      institutionId: INSTITUTION,
      currency: 'KES',
    });

    // Hand-derived: receipts 150 000; payments 120 000 + 5 000 = 125 000; closing 25 000.
    expect(report.accountCode).toBe('1020');
    expect(report.totalReceipts.amount_minor).toBe(150000);
    expect(report.totalPayments.amount_minor).toBe(125000);
    expect(report.closing.amount_minor).toBe(25000);
    expect(report.ties.closingEqualsLedgerBalance).toBe(true);
    expect(report.closing.amount_minor).toBe(ledgerBalance.amount_minor);
  });

  it('opens a ranged book at the balance before the range, so it still ties', () => {
    const ranged = bankBookReport(entries, 'KES', { from: '2027-01-20', to: null });

    // Hand-derived: the bank held 150 000 before 2027-01-20; the range pays out 125 000.
    expect(ranged.opening.amount_minor).toBe(150000);
    expect(ranged.totalPayments.amount_minor).toBe(125000);
    expect(ranged.closing.amount_minor).toBe(25000);
    expect(ranged.ties.closingEqualsLedgerBalance).toBe(true);
  });

  it('exports the figures the book shows', () => {
    const report = cashBookReport(entries, 'KES');
    const csv = csvCells(report.table);

    expect(csv[0]).toEqual(report.table.columns.map((column) => column.label));
    // The closing row is the last; its balance cell is the closing balance the book shows.
    expect(csv[csv.length - 1]?.[5]).toBe(formatMoney(report.closing));
    expect(csv[csv.length - 1]?.[3]).toBe(formatMoney(report.totalReceipts));
  });
});

describe('budget versus actual', () => {
  const budget: readonly BudgetLine[] = [
    { accountCode: '4000', accountName: 'Fee revenue', amount: kes(500000) },
    { accountCode: '5000', accountName: 'Salaries', amount: kes(100000) },
    { accountCode: '5100', accountName: 'Bank charges', amount: kes(10000) },
  ];

  it('takes its actuals from the ledger and its budget from the stored figures', () => {
    const report = budgetVsActualReport(entries, 'KES', budget);

    // Hand-derived from the income-and-expenditure statement: 4000 → 600 000, 5000 → 120 000,
    // 5100 → 5 000. Budgets are the stored figures above.
    const byCode = new Map(report.rows.map((row) => [row.accountCode, row]));
    expect(byCode.get('4000')?.actual.amount_minor).toBe(600000);
    expect(byCode.get('4000')?.variance.amount_minor).toBe(-100000);
    expect(byCode.get('5000')?.actual.amount_minor).toBe(120000);
    expect(byCode.get('5000')?.variance.amount_minor).toBe(-20000);
    expect(byCode.get('5100')?.actual.amount_minor).toBe(5000);
    expect(byCode.get('5100')?.variance.amount_minor).toBe(5000);

    expect(report.totalBudget.amount_minor).toBe(610000);
    expect(report.totalActual.amount_minor).toBe(725000);
    expect(report.totalVariance.amount_minor).toBe(-115000);

    expect(report.ties.actualsEqualLedger).toBe(true);
    expect(report.ties.totalActualEqualsLedger).toBe(true);
    expect(report.budgetSource).toContain('Stored');
  });

  it('reports an unbudgeted actual as zero actual, never a missing row', () => {
    const report = budgetVsActualReport(entries, 'KES', [
      { accountCode: '5999', accountName: 'Unused budget', amount: kes(50000) },
    ]);
    expect(report.rows[0]?.actual.amount_minor).toBe(0);
    expect(report.rows[0]?.variance.amount_minor).toBe(50000);
  });
});

describe('the period-close view', () => {
  it('surfaces the ledger state and never presents a closed period as editable', async () => {
    const period = await ledger.closePeriod({
      institutionId: INSTITUTION,
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      name: 'January 2027',
      actor: HEAD,
      reason: 'January books closed',
    });
    const report = periodCloseReport(await ledger.periods(INSTITUTION));

    const row = report.periods.find((candidate) => candidate.id === period.id);
    expect(row).toBeDefined();
    expect(row?.status).toBe('closed');
    expect(row?.editable).toBe(false);
    expect(row?.closedBy).toBe(HEAD);
    expect(row?.closeReason).toBe('January books closed');
    expect(report.ties.noClosedPeriodEditable).toBe(true);
  });

  it('shows an open period as editable, and the ledger still refuses nothing there', async () => {
    const period = await ledger.closePeriod({
      institutionId: INSTITUTION,
      startDate: '2027-02-01',
      endDate: '2027-02-28',
      actor: HEAD,
      reason: 'temporary',
    });
    const reopened = await ledger.reopenPeriod({
      periodId: period.id,
      reason: 'a late January invoice arrived',
      actor: HEAD,
    });
    const report = periodCloseReport(await ledger.periods(INSTITUTION));
    const row = report.periods.find((candidate) => candidate.id === reopened.id);

    expect(row?.status).toBe('open');
    expect(row?.editable).toBe(true);
    expect(row?.reopenedBy).toBe(HEAD);
    expect(row?.reopenReason).toBe('a late January invoice arrived');
  });

  it('proves the ledger owns the close: a posting into a closed period is refused', async () => {
    await ledger.closePeriod({
      institutionId: INSTITUTION,
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      actor: HEAD,
      reason: 'January books closed',
    });

    await expect(
      ledger.post(
        createJournalEntry(
          {
            institutionId: INSTITUTION,
            entryDate: '2027-01-25',
            source: { kind: 'payment', id: 'jv-3', number: 'JV/2027/0003' },
            narration: 'A late entry',
            lines: [
              { accountCode: '5000', accountName: 'Salaries', debit: kes(1000) },
              { accountCode: '1020', accountName: 'Bank', credit: kes(1000) },
            ],
          },
          { now: CLOCK }
        )
      )
    ).rejects.toMatchObject({ code: 'period_closed' });
  });
});

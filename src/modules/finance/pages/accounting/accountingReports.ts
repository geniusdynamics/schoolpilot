// ABOUTME: The accounting reports of spec 05 section 8, derived from the ledger's posted journal
// ABOUTME: entries: the trial balance, the income-and-expenditure statement, the balance sheet, the
// ABOUTME: cash and bank books, budget versus actual and the period-close view. Every figure is a
// ABOUTME: Money from the ledger's own derivations, and each report states the tie that proves it
// ABOUTME: agrees with the journal; nothing here recomputes a balance from raw rows.

import {
  CONTROL_ACCOUNTS,
  deriveTrialBalance,
  netOfTrialBalance,
  type AccountKind,
  type JournalEntry,
  type LedgerAccount,
  type LedgerPeriod,
  type TrialBalance,
} from '@/domain/finance/ledger';
import {
  formatMoney,
  fromMinor,
  negate,
  subtract,
  zero,
  type CurrencyCode,
  type Money,
} from '@/domain/money';

// ---------------------------------------------------------------------------
// Small money helpers. Reports are where float drift becomes visible, so every
// sum is a whole number of minor units in bigint until it is displayed.
// ---------------------------------------------------------------------------

/** A money value from whole minor units, in the report's currency. */
function money(minor: bigint, currency: CurrencyCode): Money {
  return fromMinor(Number(minor), currency);
}

/** The sum of money values, seeded with the currency's zero. */
export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return money(
    values.reduce((total, value) => total + BigInt(value.amount_minor), 0n),
    currency
  );
}

// ---------------------------------------------------------------------------
// The chart: which class an account belongs to.
// ---------------------------------------------------------------------------

/**
 * The class an account code implies, by the first digit of the account code.
 *
 * The ledger's chart of accounts is the source of truth for the accounts it names, and
 * this is the fallback for the rest: the control accounts follow the 1-asset, 2-liability,
 * 3-equity, 4-revenue, 5-expense convention (1010 cash, 2100 refunds payable, 3000 opening
 * balances, 4000 fee revenue), and a fee item's revenue account (P3-B01) is expected to keep
 * it. A code that fits no class is reported as unclassified rather than dropped.
 */
export function kindFromCode(code: string): AccountKind | null {
  switch (code.trim()[0]) {
    case '1':
      return 'asset';
    case '2':
      return 'liability';
    case '3':
      return 'equity';
    case '4':
      return 'revenue';
    case '5':
      return 'expense';
    default:
      return null;
  }
}

/** Resolves the class and the display name of an account code. */
export interface AccountClasses {
  kindOf(code: string): AccountKind | null;
  nameOf(code: string): string | null;
}

/**
 * Builds the account lookup the statements classify by.
 *
 * The control accounts are always present; a caller adds the rest of its chart (the fee
 * items' revenue accounts, the expense accounts). An account the chart does not name falls
 * back to its code's first digit.
 */
export function createAccountClasses(extra: readonly LedgerAccount[] = []): AccountClasses {
  const byCode = new Map<string, LedgerAccount>();
  for (const account of Object.values(CONTROL_ACCOUNTS)) byCode.set(account.code, account);
  for (const account of extra) byCode.set(account.code, account);
  return {
    kindOf(code) {
      return byCode.get(code)?.kind ?? kindFromCode(code);
    },
    nameOf(code) {
      return byCode.get(code)?.name ?? null;
    },
  };
}

// ---------------------------------------------------------------------------
// A date range over the entries, and the range filter the books share.
// ---------------------------------------------------------------------------

/** An inclusive date range; a null bound is open. */
export interface DateRange {
  readonly from: string | null;
  readonly to: string | null;
}

/** The entries whose date falls inside the range, oldest first. */
export function entriesInRange(
  entries: readonly JournalEntry[],
  range: DateRange
): readonly JournalEntry[] {
  return entries
    .filter((entry) => (range.from === null || entry.entryDate >= range.from))
    .filter((entry) => (range.to === null || entry.entryDate <= range.to))
    .slice()
    .sort((left, right) => {
      if (left.entryDate !== right.entryDate) return left.entryDate < right.entryDate ? -1 : 1;
      return left.postedAt < right.postedAt ? -1 : left.postedAt > right.postedAt ? 1 : 0;
    });
}

// ---------------------------------------------------------------------------
// The report table: one shape the screen and the export both render, so an
// export can never carry different figures from the screen.
// ---------------------------------------------------------------------------

export interface ReportColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: 'left' | 'right';
}

/** A rendered report: the columns and the display text of every cell. */
export interface ReportTable {
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly Readonly<Record<string, string>>[];
}

/** One CSV field, quoted only when it has to be (RFC 4180). */
function csvField(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Renders a report table as CSV.
 *
 * The text of every cell is the text the screen shows, so the export and the screen carry
 * the same figures by construction. The line ending is CRLF and the separator a comma, as
 * RFC 4180 asks.
 */
export function reportTableToCsv(table: ReportTable): string {
  const header = table.columns.map((column) => csvField(column.label)).join(',');
  const body = table.rows.map((row) =>
    table.columns.map((column) => csvField(row[column.key] ?? '')).join(',')
  );
  return [header, ...body].join('\r\n') + '\r\n';
}

/** A cell that shows a money value, or the module's placeholder for none. */
function moneyCell(value: Money | null): string {
  return value === null ? '' : formatMoney(value);
}

// ---------------------------------------------------------------------------
// The trial balance.
// ---------------------------------------------------------------------------

export interface TrialBalanceReport {
  readonly currency: CurrencyCode;
  readonly balance: TrialBalance;
  /** The sum of the row balances; a trial balance nets to zero. */
  readonly net: Money;
  /** What the journal's own totals add up to, in this currency. */
  readonly journalDebit: Money;
  readonly journalCredit: Money;
  readonly ties: {
    readonly balanced: boolean;
    readonly debitsEqualJournal: boolean;
    readonly creditsEqualJournal: boolean;
    readonly netsToZero: boolean;
  };
  readonly table: ReportTable;
}

/**
 * The trial balance of a set of entries, and the tie that proves it is the journal's.
 *
 * The per-account figures come from `deriveTrialBalance`, the ledger's own derivation. The tie
 * compares the trial balance's totals with the totals the same entries carry, so a report that
 * agreed with itself but not with the journal would still fail.
 */
export function trialBalanceReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode
): TrialBalanceReport {
  const balance = deriveTrialBalance(entries, currency);
  const inCurrency = entries.filter((entry) => entry.currency === currency);
  const journalDebit = sumMoney(
    inCurrency.map((entry) => entry.totalDebit),
    currency
  );
  const journalCredit = sumMoney(
    inCurrency.map((entry) => entry.totalCredit),
    currency
  );
  const net = netOfTrialBalance(balance);

  return {
    currency,
    balance,
    net,
    journalDebit,
    journalCredit,
    ties: {
      balanced: balance.balanced,
      debitsEqualJournal: balance.totalDebit.amount_minor === journalDebit.amount_minor,
      creditsEqualJournal: balance.totalCredit.amount_minor === journalCredit.amount_minor,
      netsToZero: net.amount_minor === 0,
    },
    table: {
      columns: [
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'debit', label: 'Debit', align: 'right' },
        { key: 'credit', label: 'Credit', align: 'right' },
        { key: 'balance', label: 'Balance', align: 'right' },
      ],
      rows: [
        ...balance.rows.map((row) => ({
          accountCode: row.accountCode,
          accountName: row.accountName ?? '',
          debit: moneyCell(row.totalDebit),
          credit: moneyCell(row.totalCredit),
          balance: moneyCell(row.balance),
        })),
        {
          accountCode: '',
          accountName: 'Total',
          debit: moneyCell(balance.totalDebit),
          credit: moneyCell(balance.totalCredit),
          balance: moneyCell(net),
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// The income-and-expenditure statement.
// ---------------------------------------------------------------------------

export interface StatementLine {
  readonly accountCode: string;
  readonly accountName: string;
  readonly amount: Money;
}

export interface IncomeExpenditureReport {
  readonly currency: CurrencyCode;
  readonly revenue: readonly StatementLine[];
  readonly expenses: readonly StatementLine[];
  readonly totalRevenue: Money;
  readonly totalExpenses: Money;
  /** Revenue less expenses. */
  readonly net: Money;
  /**
   * The movement in the revenue and expense accounts of the trial balance, debit-positive:
   * expenses less revenue. The net of the statement is its negation.
   */
  readonly revenueAndExpenseMovement: Money;
  readonly ties: {
    /** The net equals the negation of the revenue-and-expense accounts' movement. */
    readonly netEqualsAccountMovement: boolean;
    /** Every revenue and expense account of the trial balance appears in the statement. */
    readonly coversEveryAccount: boolean;
  };
  readonly table: ReportTable;
}

/**
 * The income-and-expenditure statement over a set of entries.
 *
 * A revenue account's amount is its credits less its debits; an expense account's is its debits
 * less its credits, so both read positive. The tie is stated against the trial balance: the
 * movement in the revenue and expense accounts is the sum of their balances, and the statement's
 * net is its negation, because a trial balance nets to zero.
 */
export function incomeExpenditureReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  classes: AccountClasses = createAccountClasses()
): IncomeExpenditureReport {
  const balance = deriveTrialBalance(entries, currency);
  const revenue: StatementLine[] = [];
  const expenses: StatementLine[] = [];
  let revenueAndExpenseMovement = 0n;
  let statementAccounts = 0;

  for (const row of balance.rows) {
    const kind = classes.kindOf(row.accountCode);
    if (kind === 'revenue') {
      revenue.push({
        accountCode: row.accountCode,
        accountName: row.accountName ?? classes.nameOf(row.accountCode) ?? row.accountCode,
        amount: negate(row.balance),
      });
      revenueAndExpenseMovement += BigInt(row.balance.amount_minor);
      statementAccounts += 1;
    } else if (kind === 'expense') {
      expenses.push({
        accountCode: row.accountCode,
        accountName: row.accountName ?? classes.nameOf(row.accountCode) ?? row.accountCode,
        amount: row.balance,
      });
      revenueAndExpenseMovement += BigInt(row.balance.amount_minor);
      statementAccounts += 1;
    }
  }

  const totalRevenue = sumMoney(
    revenue.map((line) => line.amount),
    currency
  );
  const totalExpenses = sumMoney(
    expenses.map((line) => line.amount),
    currency
  );
  const net = subtract(totalRevenue, totalExpenses);
  const movement = money(revenueAndExpenseMovement, currency);

  const statementAccountCodes = new Set(
    [...revenue, ...expenses].map((line) => line.accountCode)
  );
  const trialBalanceStatementAccounts = balance.rows.filter((row) => {
    const kind = classes.kindOf(row.accountCode);
    return kind === 'revenue' || kind === 'expense';
  }).length;

  return {
    currency,
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    net,
    revenueAndExpenseMovement: movement,
    ties: {
      netEqualsAccountMovement: net.amount_minor === -movement.amount_minor,
      coversEveryAccount:
        statementAccountCodes.size === trialBalanceStatementAccounts &&
        statementAccounts === trialBalanceStatementAccounts,
    },
    table: {
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: [
        ...revenue.map((line) => ({
          section: 'Revenue',
          accountCode: line.accountCode,
          accountName: line.accountName,
          amount: moneyCell(line.amount),
        })),
        {
          section: 'Revenue',
          accountCode: '',
          accountName: 'Total revenue',
          amount: moneyCell(totalRevenue),
        },
        ...expenses.map((line) => ({
          section: 'Expense',
          accountCode: line.accountCode,
          accountName: line.accountName,
          amount: moneyCell(line.amount),
        })),
        {
          section: 'Expense',
          accountCode: '',
          accountName: 'Total expenses',
          amount: moneyCell(totalExpenses),
        },
        {
          section: 'Net',
          accountCode: '',
          accountName: 'Net income / (expenditure)',
          amount: moneyCell(net),
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// The balance sheet.
// ---------------------------------------------------------------------------

export interface BalanceSheetReport {
  readonly currency: CurrencyCode;
  readonly assets: readonly StatementLine[];
  readonly liabilities: readonly StatementLine[];
  readonly equity: readonly StatementLine[];
  /** A code whose first digit fits no class; reported rather than dropped. */
  readonly unclassified: readonly StatementLine[];
  readonly totalAssets: Money;
  readonly totalLiabilities: Money;
  readonly totalEquity: Money;
  readonly totalUnclassified: Money;
  /** The income-and-expenditure result over the same entries: the year's retained movement. */
  readonly retainedEarnings: Money;
  readonly totalLiabilitiesAndEquity: Money;
  readonly ties: {
    /** Assets and unclassified accounts equal liabilities, equity and the year's result. */
    readonly balances: boolean;
  };
  readonly table: ReportTable;
}

/**
 * The balance sheet at a date.
 *
 * Asset lines read their debit balance; liability and equity lines their credit balance, so
 * every line is positive. The year's result is the income-and-expenditure net over the same
 * entries. The tie is the accounting identity the journal guarantees: the debits equal the
 * credits, so assets plus any unclassified account equal liabilities plus equity plus the
 * result. A well-formed chart leaves `unclassified` empty and the identity reads
 * assets = liabilities + equity + result.
 */
export function balanceSheetReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  classes: AccountClasses = createAccountClasses()
): BalanceSheetReport {
  const balance = deriveTrialBalance(entries, currency);
  const assets: StatementLine[] = [];
  const liabilities: StatementLine[] = [];
  const equity: StatementLine[] = [];
  const unclassified: StatementLine[] = [];

  for (const row of balance.rows) {
    const line: StatementLine = {
      accountCode: row.accountCode,
      accountName: row.accountName ?? classes.nameOf(row.accountCode) ?? row.accountCode,
      amount: row.balance,
    };
    switch (classes.kindOf(row.accountCode)) {
      case 'asset':
        assets.push(line);
        break;
      case 'liability':
        liabilities.push({ ...line, amount: negate(row.balance) });
        break;
      case 'equity':
        equity.push({ ...line, amount: negate(row.balance) });
        break;
      case 'revenue':
      case 'expense':
        break;
      default:
        unclassified.push(line);
    }
  }

  const totalAssets = sumMoney(
    assets.map((line) => line.amount),
    currency
  );
  const totalLiabilities = sumMoney(
    liabilities.map((line) => line.amount),
    currency
  );
  const totalEquity = sumMoney(
    equity.map((line) => line.amount),
    currency
  );
  const totalUnclassified = sumMoney(
    unclassified.map((line) => line.amount),
    currency
  );
  const retainedEarnings = incomeExpenditureReport(entries, currency, classes).net;
  const totalLiabilitiesAndEquity = sumMoney(
    [totalLiabilities, totalEquity, retainedEarnings],
    currency
  );

  return {
    currency,
    assets,
    liabilities,
    equity,
    unclassified,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalUnclassified,
    retainedEarnings,
    totalLiabilitiesAndEquity,
    ties: {
      balances:
        totalAssets.amount_minor + totalUnclassified.amount_minor ===
        totalLiabilitiesAndEquity.amount_minor,
    },
    table: {
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: [
        ...assets.map((line) => ({
          section: 'Asset',
          accountCode: line.accountCode,
          accountName: line.accountName,
          amount: moneyCell(line.amount),
        })),
        {
          section: 'Asset',
          accountCode: '',
          accountName: 'Total assets',
          amount: moneyCell(totalAssets),
        },
        ...liabilities.map((line) => ({
          section: 'Liability',
          accountCode: line.accountCode,
          accountName: line.accountName,
          amount: moneyCell(line.amount),
        })),
        {
          section: 'Liability',
          accountCode: '',
          accountName: 'Total liabilities',
          amount: moneyCell(totalLiabilities),
        },
        ...equity.map((line) => ({
          section: 'Equity',
          accountCode: line.accountCode,
          accountName: line.accountName,
          amount: moneyCell(line.amount),
        })),
        {
          section: 'Equity',
          accountCode: '',
          accountName: 'Result for the period',
          amount: moneyCell(retainedEarnings),
        },
        {
          section: 'Equity',
          accountCode: '',
          accountName: 'Total equity',
          amount: moneyCell(sumMoney([totalEquity, retainedEarnings], currency)),
        },
        {
          section: 'Total',
          accountCode: '',
          accountName: 'Total liabilities and equity',
          amount: moneyCell(totalLiabilitiesAndEquity),
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// The cash book and the bank book.
// ---------------------------------------------------------------------------

export interface BookLine {
  readonly entryId: string;
  readonly date: string;
  readonly reference: string;
  readonly narration: string;
  readonly receipt: Money | null;
  readonly payment: Money | null;
  readonly balance: Money;
}

export interface BookReport {
  readonly currency: CurrencyCode;
  readonly accountCode: string;
  readonly accountName: string;
  /** The account's balance before the range's first day. */
  readonly opening: Money;
  readonly lines: readonly BookLine[];
  readonly totalReceipts: Money;
  readonly totalPayments: Money;
  /** Opening plus the range's movement. */
  readonly closing: Money;
  /** The balance the ledger reports for the account over every entry handed in. */
  readonly ledgerBalance: Money;
  readonly ties: {
    readonly closingEqualsLedgerBalance: boolean;
    readonly openingPlusMovementEqualsClosing: boolean;
  };
  readonly table: ReportTable;
}

/**
 * The cash book or the bank book of one ledger account.
 *
 * Every entry that touches the account is a line: its debit is a receipt, its credit a payment,
 * and the balance runs from the account's opening balance. The tie is against the ledger itself:
 * the closing balance must equal the account's balance in the trial balance of the same entries,
 * which is what the ledger reports through `accountBalance`.
 *
 * The range only decides which lines the book shows. The opening is the account's balance before
 * the range, and the closing its balance at the range's end, so the two always agree.
 */
export function bookReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  accountCode: string,
  accountName: string,
  range: DateRange = { from: null, to: null }
): BookReport {
  const inCurrency = entries.filter((entry) => entry.currency === currency);
  const beforeRange = inCurrency.filter(
    (entry) => range.from !== null && entry.entryDate < range.from
  );
  const withinRange = entriesInRange(inCurrency, range);

  const balanceOf = (subset: readonly JournalEntry[]): bigint =>
    subset.reduce((total, entry) => {
      for (const line of entry.lines) {
        if (line.accountCode !== accountCode) continue;
        if (line.debit) total += BigInt(line.debit.amount_minor);
        if (line.credit) total -= BigInt(line.credit.amount_minor);
      }
      return total;
    }, 0n);

  const opening = money(balanceOf(beforeRange), currency);
  let running = BigInt(opening.amount_minor);
  const lines: BookLine[] = [];
  let receipts = 0n;
  let payments = 0n;

  for (const entry of withinRange) {
    let receipt: Money | null = null;
    let payment: Money | null = null;
    for (const line of entry.lines) {
      if (line.accountCode !== accountCode) continue;
      if (line.debit) {
        receipt = money(BigInt(receipt?.amount_minor ?? 0) + BigInt(line.debit.amount_minor), currency);
      }
      if (line.credit) {
        payment = money(BigInt(payment?.amount_minor ?? 0) + BigInt(line.credit.amount_minor), currency);
      }
    }
    if (receipt === null && payment === null) continue;
    running += BigInt(receipt?.amount_minor ?? 0) - BigInt(payment?.amount_minor ?? 0);
    if (receipt) receipts += BigInt(receipt.amount_minor);
    if (payment) payments += BigInt(payment.amount_minor);
    lines.push({
      entryId: entry.id,
      date: entry.entryDate,
      reference: entry.source.number ?? entry.source.id,
      narration: entry.narration,
      receipt,
      payment,
      balance: money(running, currency),
    });
  }

  const closing = money(running, currency);
  const ledgerBalance = money(balanceOf(inCurrency), currency);

  return {
    currency,
    accountCode,
    accountName,
    opening,
    lines,
    totalReceipts: money(receipts, currency),
    totalPayments: money(payments, currency),
    closing,
    ledgerBalance,
    ties: {
      closingEqualsLedgerBalance: closing.amount_minor === ledgerBalance.amount_minor,
      openingPlusMovementEqualsClosing:
        BigInt(opening.amount_minor) + receipts - payments === BigInt(closing.amount_minor),
    },
    table: {
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'reference', label: 'Reference' },
        { key: 'narration', label: 'Particulars' },
        { key: 'receipt', label: 'Receipt', align: 'right' },
        { key: 'payment', label: 'Payment', align: 'right' },
        { key: 'balance', label: 'Balance', align: 'right' },
      ],
      rows: [
        {
          date: '',
          reference: '',
          narration: 'Opening balance',
          receipt: '',
          payment: '',
          balance: moneyCell(opening),
        },
        ...lines.map((line) => ({
          date: line.date,
          reference: line.reference,
          narration: line.narration,
          receipt: moneyCell(line.receipt),
          payment: moneyCell(line.payment),
          balance: moneyCell(line.balance),
        })),
        {
          date: '',
          reference: '',
          narration: 'Closing balance',
          receipt: moneyCell(money(receipts, currency)),
          payment: moneyCell(money(payments, currency)),
          balance: moneyCell(closing),
        },
      ],
    },
  };
}

/** The cash book: the ledger's cash account (1010). */
export function cashBookReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  range?: DateRange
): BookReport {
  return bookReport(entries, currency, CONTROL_ACCOUNTS.cash.code, CONTROL_ACCOUNTS.cash.name, range);
}

/** The bank book: the ledger's bank account (1020). */
export function bankBookReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  range?: DateRange
): BookReport {
  return bookReport(entries, currency, CONTROL_ACCOUNTS.bank.code, CONTROL_ACCOUNTS.bank.name, range);
}

// ---------------------------------------------------------------------------
// Budget versus actual.
// ---------------------------------------------------------------------------

/**
 * One budgeted figure.
 *
 * The budget side of the report is a **stored figure**: the platform models no budget entity
 * (spec 05 section 8 names the report but not the entity), so the report takes the budget as an
 * input and says so through `budgetSource`. The actual side always comes from the ledger.
 */
export interface BudgetLine {
  readonly accountCode: string;
  readonly accountName: string;
  readonly amount: Money;
}

export interface BudgetVarianceRow {
  readonly accountCode: string;
  readonly accountName: string;
  readonly budget: Money;
  readonly actual: Money;
  /** Budget less actual: positive means under budget. */
  readonly variance: Money;
  /** Variance as a share of the budget, or null when the budget is zero. */
  readonly variancePercent: number | null;
}

export interface BudgetVsActualReport {
  readonly currency: CurrencyCode;
  readonly rows: readonly BudgetVarianceRow[];
  readonly totalBudget: Money;
  readonly totalActual: Money;
  readonly totalVariance: Money;
  /** Where the budget side came from, so the screen can say it. */
  readonly budgetSource: string;
  readonly ties: {
    /** Every actual equals the income-and-expenditure line for the same account. */
    readonly actualsEqualLedger: boolean;
    /** The total actual equals the sum of the ledger's lines for the budgeted accounts. */
    readonly totalActualEqualsLedger: boolean;
  };
  readonly table: ReportTable;
}

/**
 * Budget versus actual for the accounts a budget names.
 *
 * The actual of an account is the income-and-expenditure statement's line for it, so the report
 * cannot disagree with the ledger: the tie checks every row against the statement and the total
 * against the sum of the statement's lines for the budgeted accounts. The budget is the stored
 * figure the caller supplies.
 */
export function budgetVsActualReport(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  budget: readonly BudgetLine[],
  classes: AccountClasses = createAccountClasses(),
  budgetSource = 'Stored budget figures supplied to the report'
): BudgetVsActualReport {
  const statement = incomeExpenditureReport(entries, currency, classes);
  const actualByAccount = new Map<string, Money>();
  for (const line of [...statement.revenue, ...statement.expenses]) {
    actualByAccount.set(line.accountCode, line.amount);
  }

  const rows: BudgetVarianceRow[] = budget.map((line) => {
    const actual = actualByAccount.get(line.accountCode) ?? zero(currency);
    const variance = subtract(line.amount, actual);
    return {
      accountCode: line.accountCode,
      accountName: line.accountName,
      budget: line.amount,
      actual,
      variance,
      variancePercent:
        line.amount.amount_minor === 0
          ? null
          : (variance.amount_minor / line.amount.amount_minor) * 100,
    };
  });

  const totalBudget = sumMoney(
    rows.map((row) => row.budget),
    currency
  );
  const totalActual = sumMoney(
    rows.map((row) => row.actual),
    currency
  );
  const ledgerTotal = sumMoney(
    rows.map((row) => actualByAccount.get(row.accountCode) ?? zero(currency)),
    currency
  );

  return {
    currency,
    rows,
    totalBudget,
    totalActual,
    totalVariance: subtract(totalBudget, totalActual),
    budgetSource,
    ties: {
      actualsEqualLedger: rows.every((row) => {
        const fromLedger = actualByAccount.get(row.accountCode);
        return fromLedger !== undefined && fromLedger.amount_minor === row.actual.amount_minor;
      }),
      totalActualEqualsLedger: totalActual.amount_minor === ledgerTotal.amount_minor,
    },
    table: {
      columns: [
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'budget', label: 'Budget', align: 'right' },
        { key: 'actual', label: 'Actual', align: 'right' },
        { key: 'variance', label: 'Variance', align: 'right' },
        { key: 'variancePercent', label: 'Variance %', align: 'right' },
      ],
      rows: [
        ...rows.map((row) => ({
          accountCode: row.accountCode,
          accountName: row.accountName,
          budget: moneyCell(row.budget),
          actual: moneyCell(row.actual),
          variance: moneyCell(row.variance),
          variancePercent: row.variancePercent === null ? '' : `${row.variancePercent.toFixed(1)}%`,
        })),
        {
          accountCode: '',
          accountName: 'Total',
          budget: moneyCell(totalBudget),
          actual: moneyCell(totalActual),
          variance: moneyCell(subtract(totalBudget, totalActual)),
          variancePercent: '',
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// The period-close view. The ledger owns the close; this only surfaces its state.
// ---------------------------------------------------------------------------

export interface PeriodCloseRow {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: LedgerPeriod['status'];
  readonly closedAt: string | null;
  readonly closedBy: string | null;
  readonly closeReason: string | null;
  readonly reopenedAt: string | null;
  readonly reopenedBy: string | null;
  readonly reopenReason: string | null;
  /**
   * False for every period the ledger keeps closed: a closed period is never presented as
   * editable. The ledger refuses a posting into one with `period_closed`.
   */
  readonly editable: boolean;
}

export interface PeriodCloseReport {
  readonly periods: readonly PeriodCloseRow[];
  readonly ties: {
    /** No closed period is presented as editable. */
    readonly noClosedPeriodEditable: boolean;
  };
  readonly table: ReportTable;
}

/** The period-close view of the ledger's periods, oldest first. */
export function periodCloseReport(periods: readonly LedgerPeriod[]): PeriodCloseReport {
  const rows: PeriodCloseRow[] = periods.map((period) => ({
    id: period.id,
    name: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    status: period.status,
    closedAt: period.closedAt,
    closedBy: period.closedBy,
    closeReason: period.closeReason,
    reopenedAt: period.reopenedAt,
    reopenedBy: period.reopenedBy,
    reopenReason: period.reopenReason,
    editable: period.status === 'open',
  }));

  return {
    periods: rows,
    ties: {
      noClosedPeriodEditable: rows.every((row) => row.status !== 'closed' || !row.editable),
    },
    table: {
      columns: [
        { key: 'name', label: 'Period' },
        { key: 'startDate', label: 'From' },
        { key: 'endDate', label: 'To' },
        { key: 'status', label: 'Status' },
        { key: 'closedAt', label: 'Closed at' },
        { key: 'closedBy', label: 'Closed by' },
        { key: 'closeReason', label: 'Reason' },
        { key: 'reopenedAt', label: 'Reopened at' },
        { key: 'reopenedBy', label: 'Reopened by' },
        { key: 'reopenReason', label: 'Reopen reason' },
        { key: 'editable', label: 'Editable' },
      ],
      rows: rows.map((row) => ({
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        closedAt: row.closedAt ?? '',
        closedBy: row.closedBy ?? '',
        closeReason: row.closeReason ?? '',
        reopenedAt: row.reopenedAt ?? '',
        reopenedBy: row.reopenedBy ?? '',
        reopenReason: row.reopenReason ?? '',
        editable: row.editable ? 'Yes' : 'No',
      })),
    },
  };
}

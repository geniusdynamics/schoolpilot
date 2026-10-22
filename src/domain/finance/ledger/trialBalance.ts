// ABOUTME: The trial balance: per account the debits, the credits and the balance, derived from a
// ABOUTME: set of posted entries. The acceptance of the posting engine is that this always
// ABOUTME: balances, so the derivation is pure and the engine only feeds it entries.

import { fromMinor, toMinorUnits, zero, type CurrencyCode, type Money } from '@/domain/money';

import type { JournalEntry, TrialBalance, TrialBalanceRow } from './types';

interface Accumulator {
  accountName: string | null;
  debit: bigint;
  credit: bigint;
}

/**
 * Derives the trial balance of a set of entries in one currency.
 *
 * Every entry counted in another currency is left out: a trial balance is kept per currency, and
 * mixing two would make the totals meaningless. The per-account sums are accumulated in `bigint`,
 * so a year of postings cannot overflow the arithmetic on its way to the total.
 *
 * The result always balances: every entry that reached the ledger was validated to have equal
 * debits and credits, and the sum of equal sums is equal.
 */
export function deriveTrialBalance(
  entries: readonly JournalEntry[],
  currency: CurrencyCode
): TrialBalance {
  const accounts = new Map<string, Accumulator>();

  for (const entry of entries) {
    if (entry.currency !== currency) continue;
    for (const line of entry.lines) {
      const accumulator = accounts.get(line.accountCode) ?? {
        accountName: null,
        debit: 0n,
        credit: 0n,
      };
      if (accumulator.accountName === null && line.accountName !== null) {
        accumulator.accountName = line.accountName;
      }
      if (line.debit !== null) accumulator.debit += BigInt(line.debit.amount_minor);
      if (line.credit !== null) accumulator.credit += BigInt(line.credit.amount_minor);
      accounts.set(line.accountCode, accumulator);
    }
  }

  let totalDebit = 0n;
  let totalCredit = 0n;
  const rows: TrialBalanceRow[] = [];

  for (const [accountCode, accumulator] of [...accounts].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  )) {
    totalDebit += accumulator.debit;
    totalCredit += accumulator.credit;
    rows.push({
      accountCode,
      accountName: accumulator.accountName,
      totalDebit: fromMinor(toMinorUnits(accumulator.debit), currency),
      totalCredit: fromMinor(toMinorUnits(accumulator.credit), currency),
      balance: fromMinor(toMinorUnits(accumulator.debit - accumulator.credit), currency),
    });
  }

  return {
    currency,
    rows,
    totalDebit: fromMinor(toMinorUnits(totalDebit), currency),
    totalCredit: fromMinor(toMinorUnits(totalCredit), currency),
    balanced: totalDebit === totalCredit,
  };
}

/**
 * The sum of the row balances.
 *
 * A trial balance nets to zero: the debits equal the credits, so what the accounts hold on the
 * debit side cancels what they hold on the credit side. A caller checks it with `isZero`.
 */
export function netOfTrialBalance(balance: TrialBalance): Money {
  return balance.rows.reduce<Money>(
    (running, row) => fromMinor(running.amount_minor + row.balance.amount_minor, balance.currency),
    zero(balance.currency)
  );
}

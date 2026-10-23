// ABOUTME: Derives a statement's movements from the ledger's own entries: one movement per line on
// ABOUTME: a statement account, with the entry's other lines carried as detail so a discount or an
// ABOUTME: allocation is visible, and the weighted account balance the movements are tied against.

import {
  CONTROL_ACCOUNTS,
  deriveTrialBalance,
  type JournalEntry,
  type JournalLine,
} from '@/domain/finance/ledger';
import { add, fromMinor, isZero, negate, zero, type CurrencyCode, type Money } from '@/domain/money';

import type {
  MovementDraft,
  StatementAccount,
  StatementDetailKind,
  StatementMovementDetail,
  StatementMovementKind,
} from './types';

/**
 * The accounts a statement's balance is summed over, by default.
 *
 * Receivables and the learner credit: the learner's balance is the receivable *net of the credit
 * held*, so a credit to 2150 is already a negative `(debit − credit)`. Refunds payable (2100) is
 * deliberately **not** here - the ledger's `refundEntry` debits it without releasing learner credit,
 * so weighting it in would double-count a refund of credit. A caller states its own set through
 * `accounts` when its refunds post differently.
 */
export const DEFAULT_STATEMENT_ACCOUNTS: readonly StatementAccount[] = [
  {
    code: CONTROL_ACCOUNTS.receivables.code,
    name: CONTROL_ACCOUNTS.receivables.name,
    weight: 1,
  },
  {
    code: CONTROL_ACCOUNTS.learner_credit.code,
    name: CONTROL_ACCOUNTS.learner_credit.name,
    weight: 1,
  },
];

/** The account set a statement is built with: the caller's, or the module's default. */
export function statementAccounts(
  accounts?: readonly StatementAccount[]
): readonly StatementAccount[] {
  return accounts && accounts.length > 0 ? accounts : DEFAULT_STATEMENT_ACCOUNTS;
}

/** The signed amount of a journal line, in the entry's currency: a debit is positive. */
export function lineAmount(line: JournalLine, currency: CurrencyCode): Money {
  const debit = line.debit?.amount_minor ?? 0;
  const credit = line.credit?.amount_minor ?? 0;
  return fromMinor(debit - credit, currency);
}

/** The contribution one line makes to a statement's balance: `weight * (debit - credit)`. */
function contribution(line: JournalLine, account: StatementAccount, currency: CurrencyCode): Money {
  const signed = lineAmount(line, currency);
  const weighted = account.weight === 1 ? signed : negate(signed);
  return fromMinor(weighted.amount_minor, currency);
}

/** The kind of movement a line on a statement account is. */
export function movementKindFor(
  entry: JournalEntry,
  account: StatementAccount
): StatementMovementKind {
  if (account.code === CONTROL_ACCOUNTS.learner_credit.code) return 'credit';
  // A reversal is an adjustment: the original keeps its kind, the mirror is not a second invoice.
  if (entry.reversesEntryId !== null) return 'adjustment';
  switch (entry.source.kind) {
    case 'invoice':
      return 'invoice';
    case 'payment':
      return 'allocation';
    case 'credit_note':
      return 'credit_note';
    case 'refund':
      return 'refund';
    case 'opening_balance':
      return 'opening_balance';
  }
}

/** The kind of a detail line: a fee line is a credit to revenue, a discount line a debit. */
function detailKindFor(line: JournalLine): StatementDetailKind {
  return line.debit !== null ? 'discount' : 'fee';
}

/** The amount a detail line charges, as the statement reads it: a fee positive, a discount negative. */
function detailAmount(line: JournalLine, currency: CurrencyCode): Money {
  const debit = line.debit?.amount_minor ?? 0;
  const credit = line.credit?.amount_minor ?? 0;
  return fromMinor(credit - debit, currency);
}

/**
 * The detail lines of a movement.
 *
 * Only an invoice's and a credit note's lines are detail: they are the fee lines and the discount
 * lines that make up the charge, and they sum to the movement's amount. A payment's channel line
 * and an opening balance's equity line are not part of what the subject is charged, so they are not
 * shown - the movement's own amount already carries the money.
 */
function detailLinesOf(entry: JournalEntry, byCode: ReadonlyMap<string, StatementAccount>): JournalLine[] {
  if (entry.source.kind !== 'invoice' && entry.source.kind !== 'credit_note') return [];
  return entry.lines.filter((line) => !byCode.has(line.accountCode));
}

/** How a line reads on the statement: its memo, then its account name, then the narration. */
function describeLine(entry: JournalEntry, line: JournalLine): string {
  if (line.memo !== null && line.memo.trim() !== '') return line.memo;
  if (line.accountName !== null && line.accountName.trim() !== '') return line.accountName;
  return entry.narration;
}

/**
 * Derives the movements of a set of entries.
 *
 * One movement per line on a statement account, in the ledger's own line order: an invoice yields
 * one movement (its receivable line) carrying its fee and discount lines as detail; a payment
 * yields one movement per allocation plus one for the learner credit it left. Every amount is the
 * ledger's `weight * (debit - credit)` for that line, so the movements sum to exactly what the
 * ledger reports for the same accounts.
 */
export function movementsFromEntries(
  entries: readonly JournalEntry[],
  accounts: readonly StatementAccount[]
): readonly MovementDraft[] {
  const byCode = new Map(accounts.map((account) => [account.code, account]));
  const movements: MovementDraft[] = [];

  for (const entry of entries) {
    const detail = detailLinesOf(entry, byCode).map<StatementMovementDetail>((line) => ({
      kind: detailKindFor(line),
      description: describeLine(entry, line),
      accountCode: line.accountCode,
      amount: detailAmount(line, entry.currency),
    }));

    let detailPlaced = false;
    for (const line of entry.lines) {
      const account = byCode.get(line.accountCode);
      if (!account) continue;
      const amount = contribution(line, account, entry.currency);
      if (isZero(amount)) continue;
      const carriesDetail = !detailPlaced;
      detailPlaced = true;
      movements.push({
        id: `${entry.id}:${line.lineNumber}`,
        kind: movementKindFor(entry, account),
        date: entry.entryDate,
        source: entry.source,
        description: describeLine(entry, line),
        amount,
        detail: carriesDetail ? detail : [],
        reversesEntryId: entry.reversesEntryId,
        correctsEntryId: entry.correctsEntryId,
      });
    }
  }

  return movements;
}

/**
 * The balance the ledger reports for a set of entries over the statement's accounts.
 *
 * This is the ledger's own `deriveTrialBalance`, weighted: a statement equals the ledger when its
 * closing balance equals this. It is deliberately a second derivation over the same entries - the
 * per-account sums rather than the running movements - so the two agreeing is a check and not a
 * tautology.
 */
export function ledgerBalanceOf(
  entries: readonly JournalEntry[],
  currency: CurrencyCode,
  accounts: readonly StatementAccount[]
): Money {
  const trial = deriveTrialBalance(entries, currency);
  let total = zero(currency);
  for (const account of accounts) {
    const row = trial.rows.find((candidate) => candidate.accountCode === account.code);
    if (!row) continue;
    const weighted =
      account.weight === 1 ? row.balance : fromMinor(-row.balance.amount_minor, currency);
    total = add(total, weighted);
  }
  return total;
}

/** The sum of a set of movement amounts, seeded with the currency's zero. */
export function sumMovementAmounts(
  movements: readonly { readonly amount: Money }[],
  currency: CurrencyCode
): Money {
  let total = zero(currency);
  for (const movement of movements) total = add(total, movement.amount);
  return total;
}

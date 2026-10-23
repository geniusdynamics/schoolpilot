// ABOUTME: The balance explanation — the acceptance of the module. A learner's balance is the sum of
// ABOUTME: a list of documents, each with its signed effect, and the same balance is read back from
// ABOUTME: the ledger; the two must agree. That is what makes a parent's complaint answerable.

import { add, equals, negate, subtract, zero, type CurrencyCode, type Money } from '@/domain/money';
import { CONTROL_ACCOUNTS, type JournalEntry } from '@/domain/finance/ledger';

import { AdjustmentError } from './errors';
import type { BalanceDocument, BalanceExplanation } from './types';

/** The accounts a learner's balance is held in: the receivable and the learner credit. */
export const BALANCE_ACCOUNT_CODES: readonly string[] = [
  CONTROL_ACCOUNTS.receivables.code,
  CONTROL_ACCOUNTS.learner_credit.code,
];

/** What a balance explanation is built from. */
export interface BalanceExplanationInput {
  readonly learnerId: string;
  readonly institutionId: string;
  readonly currency: CurrencyCode;
  readonly asOf: string | null;
  readonly documents: readonly BalanceDocument[];
  /** The same balance read from the ledger, by {@link ledgerBalanceFor}. */
  readonly ledgerBalance: Money;
}

/**
 * Sums the documents into a balance and checks it against the ledger's.
 *
 * A document's amount is its signed effect on what the learner owes: an invoice adds, a credit note,
 * a write-off and a payment reduce. The sum is the balance, and the acceptance is that it equals the
 * ledger's balance for the learner — the property that makes the balance explainable.
 */
export function buildBalanceExplanation(input: BalanceExplanationInput): BalanceExplanation {
  let balance = zero(input.currency);
  for (const document of input.documents) {
    if (document.amount.currency !== input.currency) {
      throw new AdjustmentError(
        'currency_mismatch',
        `document ${document.id} is counted in ${document.amount.currency}, but the balance is in ${input.currency}`,
        { documentId: document.id, expected: input.currency, actual: document.amount.currency }
      );
    }
    balance = add(balance, document.amount);
  }

  return {
    learnerId: input.learnerId,
    institutionId: input.institutionId,
    currency: input.currency,
    asOf: input.asOf,
    balance,
    documents: input.documents,
    ledgerBalance: input.ledgerBalance,
    agrees: equals(balance, input.ledgerBalance),
  };
}

/**
 * The balance the ledger holds for one learner.
 *
 * The receivable and the learner-credit lines of the learner's own journal entries: an invoice debits
 * the receivable, a credit note, a write-off and an allocated payment credit it, and an unallocated
 * payment credits the learner-credit liability, which reduces what the learner owes just the same.
 * A debit less a credit, summed over the two accounts, is the balance.
 *
 * An entry belongs to the learner when its source document is one of the learner's documents, because
 * a journal entry does not carry the learner id itself.
 */
export function ledgerBalanceFor(
  entries: readonly JournalEntry[],
  learnerDocumentIds: ReadonlySet<string>,
  currency: CurrencyCode
): Money {
  let balance = zero(currency);
  for (const entry of entries) {
    if (!learnerDocumentIds.has(entry.source.id)) continue;
    for (const line of entry.lines) {
      if (!BALANCE_ACCOUNT_CODES.includes(line.accountCode)) continue;
      const debit = line.debit ?? zero(currency);
      const credit = line.credit ?? zero(currency);
      if (debit.currency !== currency || credit.currency !== currency) continue;
      balance = add(balance, subtract(debit, credit));
    }
  }
  return balance;
}

/**
 * The document effect of an invoice: it adds to what the learner owes.
 *
 * A draft or void invoice is not in the ledger, so it does not count; the caller filters before it
 * gets here. The `opening_balance` kind is an invoice whose single line is a migrated balance, so it
 * is listed as its own kind for a reader.
 */
export function invoiceEffect(total: Money): Money {
  return total;
}

/** The effect of a credit, a write-off or a payment: each reduces what the learner owes. */
export function creditEffect(amount: Money): Money {
  return negate(amount);
}

/** The effect of a recovery: it adds the debt back, because the debt is owed again. */
export function recoveryEffect(amount: Money): Money {
  return amount;
}

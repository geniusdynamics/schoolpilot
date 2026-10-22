// ABOUTME: Where an unexplained reconciliation difference goes: a balanced double entry against a
// ABOUTME: suspense account, derived from the unmatched statement lines and payments and posted
// ABOUTME: through the ledger, never written into a field on a statement line.

import {
  add,
  isZero,
  negate,
  subtract,
  zero,
  type CurrencyCode,
  type Money,
} from '@/domain/money';
import {
  createJournalEntry,
  isIsoDay,
  resolveChannelAccount,
  type JournalLineInput,
  type LedgerAccount,
  type LedgerAccountMapping,
  type LedgerService,
  type SourceDocumentKind,
} from '@/domain/finance/ledger';

import { ReconciliationError } from './errors';
import type { MatchCandidate, StatementAccount, StatementLine } from './types';

/**
 * The chart of accounts this module posts against.
 *
 * The suspense account is the one spec 05 section 8 does not name and the posting engine does not
 * hold, so this module defines it and a caller registers it into the chart with
 * `createLedgerAccountMapping({ accounts: RECONCILIATION_CHART_ACCOUNTS })`. Money held for a payer
 * the books cannot identify is money the school owes back, which is why it is a liability.
 */
export const RECONCILIATION_ACCOUNTS = {
  suspense: { code: '1990', name: 'Reconciliation suspense', kind: 'liability' },
} as const satisfies Record<string, LedgerAccount>;

/** The accounts a caller must add to the ledger's chart for a suspense posting to resolve. */
export const RECONCILIATION_CHART_ACCOUNTS: readonly LedgerAccount[] = [
  RECONCILIATION_ACCOUNTS.suspense,
];

/**
 * The source document kind a suspense entry is posted under.
 *
 * The posting engine's `SourceDocumentKind` is a closed list - invoice, payment, refund, credit
 * note, opening balance - and holds no reconciliation or adjustment kind. This module does not
 * edit the ledger, so the derived entry borrows `opening_balance`, the ledger's existing "the books
 * are brought to a stated position" document, and a caller may name another through
 * `SuspensePostingInput.sourceKind` once the ledger holds one.
 */
export const DEFAULT_SUSPENSE_SOURCE_KIND: SourceDocumentKind = 'opening_balance';

/** What a suspense posting is derived from. */
export interface SuspensePostingInput {
  readonly institutionId: string;
  readonly account: StatementAccount;
  /** The day the adjustment takes effect, an ISO day. */
  readonly asOfDate: string;
  readonly currency: CurrencyCode;
  /** The statement lines no candidate matched. */
  readonly unmatchedLines: readonly StatementLine[];
  /** The payments and ledger entries no statement line matched. */
  readonly unmatchedCandidates: readonly MatchCandidate[];
  /** Overrides the borrowed source document kind. */
  readonly sourceKind?: SourceDocumentKind;
}

/** A balanced adjustment entry, ready to be posted. */
export interface SuspensePosting {
  readonly institutionId: string;
  readonly entryDate: string;
  readonly narration: string;
  readonly sourceKind: SourceDocumentKind;
  readonly sourceId: string;
  readonly lines: readonly JournalLineInput[];
  /**
   * The unexplained difference: positive when the bank holds money the books do not, negative when
   * the books hold money the bank has not shown.
   */
  readonly difference: Money;
  /** The account of the statement the adjustment clears against. */
  readonly accountCode: string;
}

/** Posts a derived suspense entry. */
export interface SuspensePoster {
  post(posting: SuspensePosting): Promise<{ readonly id: string }>;
}

/**
 * Derives the adjustment that brings the books to the statement.
 *
 * Each unmatched statement line is a movement the bank made and the books lack, so it is posted to
 * the account in its own direction. Each unmatched payment is a movement the books made and the
 * bank has not shown, so it is posted the other way, which removes it from the account until the
 * bank catches up. The contra is always the suspense account, so the entry balances exactly and the
 * unexplained difference is visible in the trial balance rather than hidden in a statement field.
 *
 * A difference of zero is refused with `nothing_to_post`: there is nothing to explain.
 */
export function deriveSuspensePosting(
  input: SuspensePostingInput,
  mapping: LedgerAccountMapping
): SuspensePosting {
  if (!isIsoDay(input.asOfDate)) {
    throw new ReconciliationError(
      'invalid_date',
      `a suspense adjustment is dated by an ISO day, not "${input.asOfDate}"`,
      { detail: { asOfDate: input.asOfDate } }
    );
  }

  let difference = zero(input.currency);
  for (const line of input.unmatchedLines) {
    difference = add(
      difference,
      signedAmount(line.amount, line.direction, input.currency, line.id)
    );
  }
  for (const candidate of input.unmatchedCandidates) {
    difference = subtract(
      difference,
      signedAmount(candidate.amount, candidate.direction, input.currency, candidate.id)
    );
  }

  if (isZero(difference)) {
    throw new ReconciliationError(
      'nothing_to_post',
      `the unmatched lines and payments of account ${input.account.id} net to zero; there is no difference to post`,
      { detail: { accountId: input.account.id, asOfDate: input.asOfDate } }
    );
  }

  const channel = resolveChannelAccount(
    mapping,
    input.account.kind === 'bank' ? 'bank_deposit' : 'mobile_money'
  );
  const suspense =
    mapping.account(RECONCILIATION_ACCOUNTS.suspense.code) ?? RECONCILIATION_ACCOUNTS.suspense;

  const magnitude = difference.amount_minor < 0 ? negate(difference) : difference;
  const lines: JournalLineInput[] =
    difference.amount_minor > 0
      ? [
          {
            accountCode: channel.code,
            accountName: channel.name,
            debit: magnitude,
            memo: `reconciliation adjustment at ${input.asOfDate}`,
          },
          {
            accountCode: suspense.code,
            accountName: suspense.name,
            credit: magnitude,
            memo: `${input.unmatchedLines.length} unmatched statement line(s)`,
          },
        ]
      : [
          {
            accountCode: suspense.code,
            accountName: suspense.name,
            debit: magnitude,
            memo: `${input.unmatchedCandidates.length} unmatched payment(s)`,
          },
          {
            accountCode: channel.code,
            accountName: channel.name,
            credit: magnitude,
            memo: `reconciliation adjustment at ${input.asOfDate}`,
          },
        ];

  return {
    institutionId: input.institutionId,
    entryDate: input.asOfDate,
    narration: `Reconciliation adjustment for ${input.account.name} at ${input.asOfDate}`,
    sourceKind: input.sourceKind ?? DEFAULT_SUSPENSE_SOURCE_KIND,
    sourceId: suspenseSourceId(input.account.id, input.asOfDate),
    lines,
    difference,
    accountCode: channel.code,
  };
}

/** The id a suspense entry is posted under, so a second posting of the same day is refused. */
export function suspenseSourceId(accountId: string, asOfDate: string): string {
  return `recon-suspense:${accountId}:${asOfDate}`;
}

/** Posts a derived suspense posting through the ledger. */
export function createLedgerSuspensePoster(ledger: LedgerService): SuspensePoster {
  return {
    async post(posting: SuspensePosting): Promise<{ readonly id: string }> {
      const entry = createJournalEntry({
        institutionId: posting.institutionId,
        entryDate: posting.entryDate,
        source: { kind: posting.sourceKind, id: posting.sourceId },
        narration: posting.narration,
        lines: posting.lines,
      });
      const stored = await ledger.post(entry);
      return { id: stored.id };
    },
  };
}

/** An amount as the direction names it: an inflow positive, an outflow negative. */
function signedAmount(
  amount: Money,
  direction: StatementLine['direction'],
  currency: CurrencyCode,
  subject: string
): Money {
  if (amount.currency !== currency) {
    throw new ReconciliationError(
      'currency_mismatch',
      `${subject} is counted in ${amount.currency} but the adjustment is counted in ${currency}`,
      { detail: { expected: currency, actual: amount.currency, subject } }
    );
  }
  return direction === 'inflow' ? amount : negate(amount);
}

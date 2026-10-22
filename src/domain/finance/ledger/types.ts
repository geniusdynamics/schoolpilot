// ABOUTME: The vocabulary of the posting engine: account classes and the chart of accounts, the
// ABOUTME: lines and sources of a journal entry, the entry itself, the trial balance and the
// ABOUTME: period and audit shapes around it.

import type { CurrencyCode, Money } from '@/domain/money';

/** The five account classes of the chart of accounts (spec 05 section 8). */
export type AccountKind = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

/** Every account class, in the order a balance sheet and an income statement read them. */
export const ACCOUNT_KINDS: readonly AccountKind[] = [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
];

/** One account of the chart of accounts. */
export interface LedgerAccount {
  readonly code: string;
  readonly name: string;
  readonly kind: AccountKind;
}

/** Which side of a journal line carries its amount. */
export type JournalSide = 'debit' | 'credit';

/** The documents a journal entry is derived from (spec 05 section 8). */
export type SourceDocumentKind =
  | 'invoice'
  | 'payment'
  | 'refund'
  | 'credit_note'
  | 'opening_balance';

/** The document an entry posts: what it is, which row, and the number it carries. */
export interface SourceDocument {
  readonly kind: SourceDocumentKind;
  readonly id: string;
  readonly number?: string;
}

/** One line as a caller states it: exactly one of debit or credit, a positive amount. */
export interface JournalLineInput {
  /** The account code of the chart of accounts. */
  readonly accountCode: string;
  /** The account name, when the caller already resolved it. */
  readonly accountName?: string;
  readonly debit?: Money;
  readonly credit?: Money;
  readonly memo?: string;
}

/** One validated line of an entry. */
export interface JournalLine {
  readonly lineNumber: number;
  readonly accountCode: string;
  readonly accountName: string | null;
  /** The debit, or null when the line carries a credit. */
  readonly debit: Money | null;
  /** The credit, or null when the line carries a debit. */
  readonly credit: Money | null;
  readonly memo: string | null;
}

/** What a caller states to create an entry. */
export interface JournalEntryInput {
  readonly institutionId: string;
  /** The date the entry takes effect, an ISO day (`2027-02-10`). */
  readonly entryDate: string;
  readonly source: SourceDocument;
  readonly narration: string;
  readonly lines: readonly JournalLineInput[];
  /** The user the posting is recorded for. */
  readonly postedBy?: string;
  /** The accounting period, when the caller already resolved it. */
  readonly periodId?: string;
  /** The entry this one reverses. Set by a reversal, never by a caller's own posting. */
  readonly reversesEntryId?: string;
  /** The entry this one replaces. Set by a correction, never by a caller's own posting. */
  readonly correctsEntryId?: string;
  /** Why a reversal was posted. */
  readonly reversalReason?: string;
}

/**
 * A posted journal entry.
 *
 * It is immutable: the store refuses an update and a delete of the row and of its lines, and a
 * correction is a reversal plus the corrected entry, never an edit.
 */
export interface JournalEntry {
  readonly id: string;
  readonly institutionId: string;
  readonly entryDate: string;
  readonly source: SourceDocument;
  readonly narration: string;
  /** Every line of the entry is counted in this currency. */
  readonly currency: CurrencyCode;
  readonly lines: readonly JournalLine[];
  readonly totalDebit: Money;
  readonly totalCredit: Money;
  readonly postedAt: string;
  readonly postedBy: string | null;
  readonly periodId: string | null;
  readonly reversesEntryId: string | null;
  readonly correctsEntryId: string | null;
  readonly reversalReason: string | null;
}

/** Whether a period takes entries. */
export type LedgerPeriodStatus = 'open' | 'closed';

/** An accounting period an institution can close (spec 05 section 8, period locking). */
export interface LedgerPeriod {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: LedgerPeriodStatus;
  readonly closedAt: string | null;
  readonly closedBy: string | null;
  readonly closeReason: string | null;
  readonly reopenedAt: string | null;
  readonly reopenedBy: string | null;
  readonly reopenReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** One account of a trial balance. */
export interface TrialBalanceRow {
  readonly accountCode: string;
  readonly accountName: string | null;
  readonly totalDebit: Money;
  readonly totalCredit: Money;
  /** Debit minus credit: what the account holds on the debit side. */
  readonly balance: Money;
}

/** The trial balance of a set of entries, in one currency. */
export interface TrialBalance {
  readonly currency: CurrencyCode;
  readonly rows: readonly TrialBalanceRow[];
  readonly totalDebit: Money;
  readonly totalCredit: Money;
  /** True when the debits equal the credits: the acceptance of the posting engine. */
  readonly balanced: boolean;
}

/** One row of the ledger's audit trail: who posted what, when. */
export interface LedgerAuditEvent {
  readonly id: string;
  /** The id of the journal entry or the period the action touched. */
  readonly subjectId: string;
  readonly action: 'create' | 'update';
  readonly actorId: string | null;
  readonly reason: string | null;
  readonly detail: unknown;
  readonly createdAt: string;
  readonly commitSequence: number;
}

/** What a caller may ask of a ledger read. */
export interface EntryQuery {
  readonly institutionId?: string;
  /** Only entries dated on or before this day. */
  readonly asOf?: string;
  readonly periodId?: string;
  readonly sourceKind?: SourceDocumentKind;
  readonly sourceId?: string;
  readonly limit?: number;
}

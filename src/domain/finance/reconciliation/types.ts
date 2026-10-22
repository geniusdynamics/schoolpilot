// ABOUTME: The vocabulary of bank and mobile-money reconciliation: the account a statement belongs
// ABOUTME: to, the statement and its lines, the payment or ledger entry a line is matched against,
// ABOUTME: the suggestion a rule produces, the match record, and the exception report.

import type { CurrencyCode, Money } from '@/domain/money';

/** The two shapes a statement arrives in. */
export type StatementFormat = 'csv' | 'ofx';

/** Which way the money moved on a statement line: into the account, or out of it. */
export type StatementDirection = 'inflow' | 'outflow';

/** The account a statement belongs to: a bank account or a mobile-money wallet. */
export interface StatementAccount {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  /** The account's own currency; a statement in another currency is refused. */
  readonly currency: CurrencyCode;
  /** Which ledger account the money lands in: the bank book or the mobile-money clearing account. */
  readonly kind: 'bank' | 'mobile_money';
}

/** A statement file that was read: what it is, whose it is, and the key that identifies it. */
export interface Statement {
  readonly id: string;
  readonly institutionId: string;
  readonly accountId: string;
  readonly format: StatementFormat;
  readonly currency: CurrencyCode;
  /** The fingerprint of the file's content: the idempotency key of the import. */
  readonly fingerprint: string;
  /** The file's name, when the caller knew it, kept for the audit. */
  readonly sourceName: string | null;
  /** The earliest value date of its lines, or null when it has none. */
  readonly firstDate: string | null;
  /** The latest value date of its lines, or null when it has none. */
  readonly lastDate: string | null;
  readonly lineCount: number;
  readonly importedAt: string;
  readonly importedBy: string | null;
}

/** One normalised statement line. */
export interface StatementLine {
  readonly id: string;
  readonly statementId: string;
  readonly institutionId: string;
  readonly accountId: string;
  /** The 1-based line of the file the line was read from, kept for the audit. */
  readonly fileLine: number;
  /** The day the money moved, an ISO day. */
  readonly valueDate: string;
  /** The amount moved, always positive; the direction says which way. */
  readonly amount: Money;
  readonly direction: StatementDirection;
  readonly reference: string | null;
  readonly description: string | null;
  /** The payer as the statement wrote it, when the file carries one. */
  readonly payerName: string | null;
  /** The raw record text, kept so a human can see exactly what the file said. */
  readonly raw: string;
  /** The idempotency key of the line: `<statement fingerprint>#<file line>`. */
  readonly dedupeKey: string;
}

/**
 * What a statement line is matched against.
 *
 * This is the seam: the reconciliation engine knows nothing about how a payment or a journal
 * entry is stored. It needs an id, a date, an amount, a direction, and - when the record has
 * them - a reference and a payer name. The payments module (P3-D01) and the ledger fill it.
 */
export type CandidateKind = 'payment' | 'ledger_entry';

/** A payment or a ledger entry a statement line can be matched to. */
export interface MatchCandidate {
  readonly id: string;
  readonly kind: CandidateKind;
  readonly institutionId: string;
  /** The account the money landed in, when the record knows it. */
  readonly accountId: string | null;
  readonly date: string;
  /** The amount, always positive; the direction says which way. */
  readonly amount: Money;
  readonly direction: StatementDirection;
  readonly reference: string | null;
  readonly payerName: string | null;
  /** How the record reads to a human, for the suggestion list. */
  readonly narration: string | null;
}

/** What a caller asks of the candidates. */
export interface CandidateQuery {
  readonly institutionId: string;
  readonly accountId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly direction?: StatementDirection;
}

/**
 * Where the payments and ledger entries come from.
 *
 * The engine never writes through it: it reads candidates to suggest a match, and reads one back
 * to confirm that the thing a human picked still exists.
 */
export interface CandidateSource {
  listCandidates(query: CandidateQuery): Promise<readonly MatchCandidate[]>;
  getCandidate(kind: CandidateKind, id: string): Promise<MatchCandidate | null>;
}

/** The rule a suggestion's reason names. */
export type MatchRule =
  /** The amounts are equal, minor unit for minor unit, in one currency. */
  | 'amount_exact'
  /** The two dates are within the matching window. */
  | 'date_window'
  /** The normalised references are equal. */
  | 'reference_exact'
  /** One normalised reference contains the other. */
  | 'reference_contains'
  /** The payer names share their significant words. */
  | 'payer_name_similar'
  /** Both sides moved the money the same way. */
  | 'direction_match'
  /** The candidate names the same account as the statement. */
  | 'account_match';

/** One rule that fired, with the weight it contributed and why. */
export interface MatchReason {
  readonly rule: MatchRule;
  readonly weight: number;
  readonly detail: string;
}

/**
 * A suggested match.
 *
 * It is a suggestion and nothing more: the engine never writes one. A human confirms it through
 * {@link confirmMatch}, and only then is a `MatchRecord` written.
 */
export interface MatchSuggestion {
  readonly lineId: string;
  readonly candidateId: string;
  readonly candidateKind: CandidateKind;
  /** The score out of 100: the sum of the weights of the rules that fired. */
  readonly score: number;
  /** 1 for the line's best suggestion, 2 for the next, and so on. */
  readonly rank: number;
  /** Whole days between the line's date and the candidate's date. */
  readonly dayDifference: number;
  readonly reasons: readonly MatchReason[];
}

/** Whether a match record is the live link or the record of a link that was undone. */
export type MatchStatus = 'confirmed' | 'unmatched';

/**
 * The record of a confirmed match, and of its undoing.
 *
 * A match is never deleted. Unmatching moves the record to `unmatched` and records who did it,
 * when and why; the line and the candidate are then free again and a new match is a new record.
 */
export interface MatchRecord {
  readonly id: string;
  readonly institutionId: string;
  readonly statementLineId: string;
  readonly candidateId: string;
  readonly candidateKind: CandidateKind;
  readonly status: MatchStatus;
  /** The score the confirmed suggestion carried, when it came from one. */
  readonly score: number | null;
  readonly reasons: readonly MatchReason[];
  readonly matchedBy: string | null;
  readonly matchedAt: string;
  readonly unmatchedBy: string | null;
  readonly unmatchedAt: string | null;
  readonly unmatchedReason: string | null;
}

/** What an import wrote, or the statement it found when the file had been imported before. */
export interface ImportResult {
  readonly statement: Statement;
  readonly lines: readonly StatementLine[];
  /** True when the exact file was imported before: nothing was written this time. */
  readonly duplicate: boolean;
}

/** How a statement is read. */
export interface ParseStatementOptions {
  readonly account: StatementAccount;
  /** The format, when the caller knows it. Defaults to detecting it from the text. */
  readonly format?: StatementFormat;
  /** The file's name, kept on the statement for the audit. */
  readonly sourceName?: string;
  /**
   * How an ambiguous `03/04/2027` reads: day first (`dmy`, the default) or month first (`mdy`).
   * A component greater than 12 always decides on its own.
   */
  readonly dateOrder?: 'dmy' | 'mdy';
  /**
   * The direction to use when a file carries a single unsigned amount column and no direction
   * column. Without it such a record is refused as `ambiguous_direction` rather than guessed.
   */
  readonly defaultDirection?: StatementDirection;
}

/** A line as the parser read it, before it is given an id and stored. */
export interface ParsedLine {
  readonly fileLine: number;
  readonly valueDate: string;
  readonly amount: Money;
  readonly direction: StatementDirection;
  readonly reference: string | null;
  readonly description: string | null;
  readonly payerName: string | null;
  readonly raw: string;
}

/** A statement as the parser read it, before it is stored. */
export interface ParsedStatement {
  readonly format: StatementFormat;
  readonly currency: CurrencyCode;
  readonly fingerprint: string;
  readonly sourceName: string | null;
  readonly lines: readonly ParsedLine[];
}

/** What the two sides of a reconciliation add up to. */
export interface ReconciliationTotals {
  readonly total: number;
  readonly matched: number;
  readonly unmatched: number;
}

/**
 * The reconciliation of one account over a window: what matched, and what did not.
 *
 * An unexplained difference is not hidden. `unmatchedLines` are movements the bank recorded that
 * the books do not carry; `unmatchedCandidates` are movements the books recorded that the bank
 * did not show. `difference` is where the books disagree with the statement.
 */
export interface ReconciliationReport {
  readonly institutionId: string;
  readonly accountId: string;
  readonly currency: CurrencyCode;
  readonly from: string | null;
  readonly to: string | null;
  readonly lines: ReconciliationTotals;
  readonly candidates: ReconciliationTotals;
  readonly unmatchedLines: readonly StatementLine[];
  readonly unmatchedCandidates: readonly MatchCandidate[];
  /** Every line's amount signed by its direction: inflows positive, outflows negative. */
  readonly signedLineTotal: Money;
  readonly signedCandidateTotal: Money;
  /** The unmatched lines' amounts, signed. */
  readonly unmatchedLineTotal: Money;
  /** The unmatched candidates' amounts, signed. */
  readonly unmatchedCandidateTotal: Money;
  /**
   * `signedLineTotal - signedCandidateTotal`: what the bank says, less what the books say. Because
   * a suggestion is only made when the amounts are exactly equal, this equals
   * `unmatchedLineTotal - unmatchedCandidateTotal`.
   */
  readonly difference: Money;
}

/** What a caller asks of a statement read. */
export interface StatementQuery {
  readonly institutionId?: string;
  readonly accountId?: string;
  readonly limit?: number;
}

/** What a caller asks of a statement-line read. */
export interface LineQuery {
  readonly institutionId?: string;
  readonly accountId?: string;
  readonly statementId?: string;
  /** Only lines value-dated on or after this day. */
  readonly from?: string;
  /** Only lines value-dated on or before this day. */
  readonly to?: string;
  readonly direction?: StatementDirection;
  readonly limit?: number;
}

/** What a caller asks of a match read. */
export interface MatchQuery {
  readonly institutionId?: string;
  readonly statementLineId?: string;
  readonly candidateId?: string;
  readonly candidateKind?: CandidateKind;
  readonly status?: MatchStatus;
  readonly limit?: number;
}

/** One row of the reconciliation audit trail: who matched or unmatched what, and when. */
export interface ReconciliationAuditEvent {
  readonly id: string;
  readonly subjectId: string;
  readonly action: 'create' | 'update';
  readonly actorId: string | null;
  readonly reason: string | null;
  readonly detail: unknown;
  readonly createdAt: string;
  readonly commitSequence: number;
}

/** The account a statement belongs to, by id. */
export interface AccountDirectory {
  get(accountId: string): StatementAccount | null;
}

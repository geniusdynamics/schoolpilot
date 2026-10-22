// ABOUTME: The reconciliation service: importing a statement idempotently, suggesting matches,
// ABOUTME: confirming and undoing one, reporting what did not match, and posting the unexplained
// ABOUTME: difference to the suspense account.

import { generateUuidv7 } from '@/domain/ids';
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
  createLedgerAccountMapping,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';

import { ReconciliationError } from './errors';
import { candidateKey, suggestMatches, type MatchEngineOptions } from './match';
import { parseStatement } from './statement';
import {
  RECONCILIATION_CHART_ACCOUNTS,
  deriveSuspensePosting,
  type SuspensePoster,
  type SuspensePosting,
} from './suspense';
import {
  RECONCILIATION_MATCH_AUDIT_ENTITY,
  RECONCILIATION_STATEMENT_AUDIT_ENTITY,
  type ReconciliationStore,
} from './store';
import type {
  AccountDirectory,
  CandidateKind,
  CandidateQuery,
  CandidateSource,
  ImportResult,
  MatchCandidate,
  MatchQuery,
  MatchReason,
  MatchRecord,
  MatchSuggestion,
  ReconciliationAuditEvent,
  ReconciliationReport,
  Statement,
  StatementAccount,
  StatementDirection,
  StatementFormat,
  StatementLine,
} from './types';

/** The entity name a suspense posting is recorded under in the repository's audit trail. */
export const RECONCILIATION_SUSPENSE_AUDIT_ENTITY = 'reconciliation_suspense';

/** What the service is built with. */
export interface ReconciliationServiceOptions {
  /** The store every statement, line and match is written to. */
  readonly store: ReconciliationStore;
  /** The accounts a statement belongs to. */
  readonly accounts: AccountDirectory;
  /** Where the payments and ledger entries to match against come from. */
  readonly candidates: CandidateSource;
  /**
   * The chart of accounts the suspense posting resolves against. Defaults to a chart holding the
   * control accounts and this module's suspense account.
   */
  readonly chart?: LedgerAccountMapping;
  /** How a suspense difference is posted. Without one, deriving is possible but posting is refused. */
  readonly poster?: SuspensePoster;
  readonly actor?: string;
  readonly now?: () => Date;
}

/** How a statement is imported. */
export interface ImportOptions {
  readonly accountId: string;
  readonly sourceName?: string;
  readonly format?: StatementFormat;
  readonly dateOrder?: 'dmy' | 'mdy';
  readonly defaultDirection?: StatementDirection;
  readonly importedBy?: string;
  /** When true, a file already imported into the account is refused instead of returned. */
  readonly strict?: boolean;
}

/** What a caller asks to be suggested. */
export interface SuggestOptions extends MatchEngineOptions {
  readonly accountId: string;
  readonly from?: string;
  readonly to?: string;
  /** Only suggest for these lines. Defaults to every line of the account in the window. */
  readonly lineIds?: readonly string[];
}

/** What a caller confirms. */
export interface ConfirmMatchInput {
  readonly statementLineId: string;
  readonly candidateKind: CandidateKind;
  readonly candidateId: string;
  /** The score the confirmed suggestion carried, when it came from one. */
  readonly score?: number;
  readonly reasons?: readonly MatchReason[];
  readonly actor?: string;
}

/** What a caller undoes. */
export interface UnmatchInput {
  readonly matchId: string;
  /** Why the match is undone. Required: an unmatch without one is not an audit. */
  readonly reason: string;
  readonly actor?: string;
}

/** The account and window a report or an adjustment covers. */
export interface ReconciliationQuery {
  readonly institutionId: string;
  readonly accountId: string;
  readonly from?: string;
  readonly to?: string;
}

/** What a suspense adjustment is posted with. */
export interface PostSuspenseOptions {
  /** The day the adjustment takes effect. Defaults to the report's last day. */
  readonly asOfDate?: string;
  readonly actor?: string;
}

/** The adjustment that was derived, and the ledger entry it was posted as. */
export interface PostedSuspense {
  readonly posting: SuspensePosting;
  readonly entryId: string;
}

/**
 * Reads statements, matches them against the books, and reports what is left over.
 *
 * The engine suggests and never confirms: `suggest` writes nothing, and a match exists only once a
 * human calls `confirmMatch`. Every write goes through the store in one transaction, so a statement
 * and its lines land together or not at all.
 */
export class ReconciliationService {
  private readonly store: ReconciliationStore;
  private readonly accounts: AccountDirectory;
  private readonly candidates: CandidateSource;
  private readonly chart: LedgerAccountMapping;
  private readonly poster: SuspensePoster | undefined;
  private readonly actor: string | undefined;
  private readonly clock: () => Date;

  constructor(options: ReconciliationServiceOptions) {
    this.store = options.store;
    this.accounts = options.accounts;
    this.candidates = options.candidates;
    this.chart =
      options.chart ?? createLedgerAccountMapping({ accounts: RECONCILIATION_CHART_ACCOUNTS });
    this.poster = options.poster;
    this.actor = options.actor;
    this.clock = options.now ?? (() => new Date());
  }

  /** The chart of accounts the suspense adjustment posts against. */
  get mapping(): LedgerAccountMapping {
    return this.chart;
  }

  /**
   * Imports a statement file.
   *
   * The file is parsed whole before anything is written, so a malformed file writes nothing and a
   * refusal names the line that caused it. The statement's fingerprint is its content, so importing
   * the same file into the same account again writes nothing: the existing statement and its lines
   * are returned with `duplicate: true`. A caller that would rather refuse it passes `strict`.
   */
  async importStatement(text: string, options: ImportOptions): Promise<ImportResult> {
    const account = this.requireAccount(options.accountId);
    const parsed = parseStatement(text, {
      account,
      ...(options.format ? { format: options.format } : {}),
      ...(options.sourceName ? { sourceName: options.sourceName } : {}),
      ...(options.dateOrder ? { dateOrder: options.dateOrder } : {}),
      ...(options.defaultDirection ? { defaultDirection: options.defaultDirection } : {}),
    });
    const now = this.clock().toISOString();
    const actor = options.importedBy ?? this.actor ?? null;

    return this.store.transaction(async (tx) => {
      const existing = await tx.statementByFingerprint(
        account.institutionId,
        account.id,
        parsed.fingerprint
      );
      if (existing) {
        if (options.strict === true) {
          throw new ReconciliationError(
            'duplicate_statement',
            `the file ${options.sourceName ?? parsed.fingerprint} has already been imported into ${account.name}`,
            { detail: { accountId: account.id, statementId: existing.id } }
          );
        }
        const lines = await tx.listLines({ statementId: existing.id });
        return { statement: existing, lines, duplicate: true };
      }

      const dates = parsed.lines.map((line) => line.valueDate).sort();
      const statement = {
        id: generateUuidv7(),
        institutionId: account.institutionId,
        accountId: account.id,
        format: parsed.format,
        currency: parsed.currency,
        fingerprint: parsed.fingerprint,
        sourceName: parsed.sourceName,
        firstDate: dates[0] ?? null,
        lastDate: dates[dates.length - 1] ?? null,
        lineCount: parsed.lines.length,
        importedAt: now,
        importedBy: actor,
      };
      const lines: StatementLine[] = parsed.lines.map((line) => ({
        id: generateUuidv7(),
        statementId: statement.id,
        institutionId: account.institutionId,
        accountId: account.id,
        fileLine: line.fileLine,
        valueDate: line.valueDate,
        amount: line.amount,
        direction: line.direction,
        reference: line.reference,
        description: line.description,
        payerName: line.payerName,
        raw: line.raw,
        dedupeKey: `${statement.fingerprint}#${line.fileLine}`,
      }));

      await tx.insertStatement(statement);
      await tx.insertLines(lines);
      await tx.writeAudit({
        subjectId: statement.id,
        entity: RECONCILIATION_STATEMENT_AUDIT_ENTITY,
        action: 'create',
        actorId: actor,
        reason: `imported ${statement.format} statement ${statement.sourceName ?? statement.fingerprint}`,
        detail: {
          accountId: statement.accountId,
          format: statement.format,
          currency: statement.currency,
          fingerprint: statement.fingerprint,
          lineCount: statement.lineCount,
          firstDate: statement.firstDate,
          lastDate: statement.lastDate,
        },
        changedFields: ['fingerprint', 'lines'],
        createdAt: now,
      });
      return { statement, lines, duplicate: false };
    });
  }

  /** The statements an account holds, oldest import first. */
  listStatements(
    query: { accountId?: string; institutionId?: string; limit?: number } = {}
  ): Promise<readonly Statement[]> {
    return this.store.listStatements(query);
  }

  /** The lines of an account in a window, oldest value date first. */
  listLines(query: {
    institutionId?: string;
    accountId?: string;
    statementId?: string;
    from?: string;
    to?: string;
    direction?: StatementDirection;
    limit?: number;
  }): Promise<readonly StatementLine[]> {
    return this.store.listLines(query);
  }

  /** The match records, live and undone. */
  listMatches(query: MatchQuery): Promise<readonly MatchRecord[]> {
    return this.store.listMatches(query);
  }

  /** The audit trail of one statement or match, oldest first. */
  auditTrail(subjectId: string): Promise<readonly ReconciliationAuditEvent[]> {
    return this.store.auditTrail(subjectId);
  }

  /**
   * Suggests, for every unmatched line of an account, the payments and ledger entries that could
   * correspond to it.
   *
   * Nothing is written. A line that already carries a confirmed match and a payment that already
   * carries one are left out, so every suggestion returned is still there to be confirmed.
   */
  async suggest(options: SuggestOptions): Promise<readonly MatchSuggestion[]> {
    const account = this.requireAccount(options.accountId);
    const lines = await this.store.listLines({
      institutionId: account.institutionId,
      accountId: account.id,
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {}),
    });
    const wanted =
      options.lineIds === undefined
        ? lines
        : lines.filter((line) => options.lineIds?.includes(line.id) === true);

    const matches = await this.store.listMatches({
      institutionId: account.institutionId,
      status: 'confirmed',
    });
    const candidates = await this.candidates.listCandidates({
      institutionId: account.institutionId,
      accountId: account.id,
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {}),
    });

    return suggestMatches(wanted, candidates, {
      ...(options.windowDays === undefined ? {} : { windowDays: options.windowDays }),
      ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
      excludeLines: matches.map((match) => match.statementLineId),
      excludeCandidates: matches.map((match) => candidateKey(match.candidateKind, match.candidateId)),
    });
  }

  /**
   * Confirms a match between a statement line and a payment or ledger entry.
   *
   * A line is matched once and a payment is matched once: both are checked here and again by two
   * partial unique indexes in the database, so a caller that bypasses the service still cannot
   * double-match. The record carries who matched it and when.
   */
  async confirmMatch(input: ConfirmMatchInput): Promise<MatchRecord> {
    const line = await this.store.line(input.statementLineId);
    if (!line) {
      throw new ReconciliationError(
        'line_not_found',
        `statement line ${input.statementLineId} does not exist`,
        { detail: { statementLineId: input.statementLineId } }
      );
    }
    const candidate = await this.candidates.getCandidate(input.candidateKind, input.candidateId);
    if (!candidate) {
      throw new ReconciliationError(
        'candidate_not_found',
        `${input.candidateKind} ${input.candidateId} does not exist`,
        { detail: { candidateKind: input.candidateKind, candidateId: input.candidateId } }
      );
    }
    if (candidate.amount.currency !== line.amount.currency) {
      throw new ReconciliationError(
        'match_currency_mismatch',
        `statement line ${line.id} is counted in ${line.amount.currency} and ${candidate.id} in ${candidate.amount.currency}`,
        {
          detail: {
            expected: line.amount.currency,
            actual: candidate.amount.currency,
            candidateId: candidate.id,
          },
        }
      );
    }

    const existingLine = await this.store.confirmedMatchForLine(line.id);
    if (existingLine) {
      throw new ReconciliationError(
        'line_already_matched',
        `statement line ${line.id} is already matched to ${existingLine.candidateKind} ${existingLine.candidateId}`,
        { detail: { statementLineId: line.id, matchId: existingLine.id } }
      );
    }
    const existingCandidate = await this.store.confirmedMatchForCandidate(
      candidate.kind,
      candidate.id
    );
    if (existingCandidate) {
      throw new ReconciliationError(
        'candidate_already_matched',
        `${candidate.kind} ${candidate.id} is already matched to statement line ${existingCandidate.statementLineId}`,
        { detail: { candidateId: candidate.id, matchId: existingCandidate.id } }
      );
    }

    const now = this.clock().toISOString();
    const actor = input.actor ?? this.actor ?? null;
    const record: MatchRecord = {
      id: generateUuidv7(),
      institutionId: line.institutionId,
      statementLineId: line.id,
      candidateId: candidate.id,
      candidateKind: candidate.kind,
      status: 'confirmed',
      score: input.score ?? null,
      reasons: input.reasons ?? [],
      matchedBy: actor,
      matchedAt: now,
      unmatchedBy: null,
      unmatchedAt: null,
      unmatchedReason: null,
    };

    return this.store.transaction(async (tx) => {
      await tx.insertMatch(record);
      await tx.writeAudit({
        subjectId: record.id,
        entity: RECONCILIATION_MATCH_AUDIT_ENTITY,
        action: 'create',
        actorId: actor,
        reason: `matched statement line ${line.id} to ${candidate.kind} ${candidate.id}`,
        detail: {
          statementLineId: line.id,
          candidateId: candidate.id,
          candidateKind: candidate.kind,
          score: record.score,
          amountMinor: line.amount.amount_minor,
          currency: line.amount.currency,
        },
        changedFields: ['status', 'statement_line_id', 'candidate_id'],
        createdAt: now,
      });
      return record;
    });
  }

  /**
   * Undoes a match.
   *
   * Nothing is deleted: the record moves to `unmatched` and keeps who undid it, when and why, and
   * both sides are free again - the line may be matched to another payment and the payment to
   * another line. A later match is a new record, so the history reads confirmed, unmatched,
   * confirmed.
   */
  async unmatch(input: UnmatchInput): Promise<MatchRecord> {
    const reason = input.reason.trim();
    if (reason === '') {
      throw new ReconciliationError(
        'reason_required',
        `undoing match ${input.matchId} needs a reason; an unmatch without one is not an audit`,
        { detail: { matchId: input.matchId } }
      );
    }
    const record = await this.store.match(input.matchId);
    if (!record) {
      throw new ReconciliationError('match_not_found', `match ${input.matchId} does not exist`, {
        detail: { matchId: input.matchId },
      });
    }
    if (record.status === 'unmatched') {
      throw new ReconciliationError(
        'match_already_unmatched',
        `match ${record.id} was already undone by ${record.unmatchedBy ?? 'someone'} on ${record.unmatchedAt ?? 'an unknown day'}`,
        { detail: { matchId: record.id } }
      );
    }

    const now = this.clock().toISOString();
    const actor = input.actor ?? this.actor ?? null;
    const undone: MatchRecord = {
      ...record,
      status: 'unmatched',
      unmatchedBy: actor,
      unmatchedAt: now,
      unmatchedReason: reason,
    };

    return this.store.transaction(async (tx) => {
      await tx.updateMatch(undone);
      await tx.writeAudit({
        subjectId: record.id,
        entity: RECONCILIATION_MATCH_AUDIT_ENTITY,
        action: 'update',
        actorId: actor,
        reason,
        detail: {
          statementLineId: record.statementLineId,
          candidateId: record.candidateId,
          candidateKind: record.candidateKind,
          status: 'unmatched',
        },
        changedFields: ['status', 'unmatched_by', 'unmatched_at', 'unmatched_reason'],
        createdAt: now,
      });
      return undone;
    });
  }

  /**
   * Reports what matched and what did not.
   *
   * An unmatched statement line is money the bank moved and the books do not carry; an unmatched
   * payment is money the books recorded and the bank has not shown. Both are returned in full, with
   * the totals they add up to, so a reconciliation that does not balance says so instead of hiding
   * it.
   */
  async report(query: ReconciliationQuery): Promise<ReconciliationReport> {
    const account = this.requireAccount(query.accountId);
    const lines = await this.store.listLines({
      institutionId: query.institutionId,
      accountId: account.id,
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    });
    const matches = await this.store.listMatches({
      institutionId: query.institutionId,
      status: 'confirmed',
    });
    const matchedLines = new Set(matches.map((match) => match.statementLineId));
    const matchedCandidates = new Set(
      matches.map((match) => candidateKey(match.candidateKind, match.candidateId))
    );

    const candidates = await this.candidates.listCandidates({
      institutionId: query.institutionId,
      accountId: account.id,
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    });

    const unmatchedLines = lines.filter((line) => !matchedLines.has(line.id));
    const unmatchedCandidates = candidates.filter(
      (candidate) => !matchedCandidates.has(candidateKey(candidate.kind, candidate.id))
    );

    const currency = account.currency;
    const signedLineTotal = sumSigned(
      lines.map((line) => ({ amount: line.amount, direction: line.direction })),
      currency
    );
    const signedCandidateTotal = sumSigned(
      candidates.map((candidate) => ({
        amount: candidate.amount,
        direction: candidate.direction,
      })),
      currency
    );
    const unmatchedLineTotal = sumSigned(
      unmatchedLines.map((line) => ({ amount: line.amount, direction: line.direction })),
      currency
    );
    const unmatchedCandidateTotal = sumSigned(
      unmatchedCandidates.map((candidate) => ({
        amount: candidate.amount,
        direction: candidate.direction,
      })),
      currency
    );

    return {
      institutionId: query.institutionId,
      accountId: account.id,
      currency,
      from: query.from ?? null,
      to: query.to ?? null,
      lines: totalsOf(lines.length, unmatchedLines.length),
      candidates: totalsOf(candidates.length, unmatchedCandidates.length),
      unmatchedLines,
      unmatchedCandidates,
      signedLineTotal,
      signedCandidateTotal,
      unmatchedLineTotal,
      unmatchedCandidateTotal,
      difference: subtract(signedLineTotal, signedCandidateTotal),
    };
  }

  /**
   * Derives the adjustment that brings the books to the statement.
   *
   * The unmatched lines and the unmatched payments net to the difference; the derivation posts each
   * side to the account and the contra to the suspense account, so the entry balances and the
   * unexplained amount is visible in the trial balance. Nothing is posted here: the derivation is
   * pure, and {@link postSuspenseDifference} writes it.
   */
  async deriveSuspenseDifference(
    query: ReconciliationQuery,
    options: PostSuspenseOptions = {}
  ): Promise<SuspensePosting> {
    const account = this.requireAccount(query.accountId);
    const report = await this.report(query);
    const asOfDate = options.asOfDate ?? report.to ?? this.clock().toISOString().slice(0, 10);
    return deriveSuspensePosting(
      {
        institutionId: query.institutionId,
        account,
        asOfDate,
        currency: account.currency,
        unmatchedLines: report.unmatchedLines,
        unmatchedCandidates: report.unmatchedCandidates,
      },
      this.chart
    );
  }

  /**
   * Posts the derived adjustment through the ledger, so an unexplained difference is a journal
   * entry against the suspense account and not a field on a statement line.
   *
   * The entry is posted once per account and day: a second posting of the same day is refused by the
   * ledger's own one-posting-per-document guard, which is what makes a re-run safe.
   */
  async postSuspenseDifference(
    query: ReconciliationQuery,
    options: PostSuspenseOptions = {}
  ): Promise<PostedSuspense> {
    if (!this.poster) {
      throw new ReconciliationError(
        'no_suspense_poster',
        'no suspense poster was supplied, so an unexplained difference cannot be posted; pass one to the service',
        { detail: { accountId: query.accountId } }
      );
    }
    const posting = await this.deriveSuspenseDifference(query, options);
    const posted = await this.poster.post(posting);
    const now = this.clock().toISOString();
    const actor = options.actor ?? this.actor ?? null;
    await this.store.writeAudit({
      subjectId: posting.sourceId,
      entity: RECONCILIATION_SUSPENSE_AUDIT_ENTITY,
      action: 'create',
      actorId: actor,
      reason: posting.narration,
      detail: {
        entryId: posted.id,
        accountId: query.accountId,
        accountCode: posting.accountCode,
        differenceMinor: posting.difference.amount_minor,
        currency: posting.difference.currency,
        unmatchedLines: posting.lines.length,
      },
      changedFields: ['difference'],
      createdAt: now,
    });
    return { posting, entryId: posted.id };
  }

  private requireAccount(accountId: string): StatementAccount {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new ReconciliationError(
        'account_not_found',
        `the statement account ${accountId} is not in the directory`,
        { detail: { accountId } }
      );
    }
    return account;
  }
}

/** The candidates of an in-memory list: the double the tests and a caller without a source use. */
export function createArrayCandidateSource(
  candidates: readonly MatchCandidate[]
): CandidateSource {
  return {
    async listCandidates(query: CandidateQuery): Promise<readonly MatchCandidate[]> {
      return candidates.filter(
        (candidate) =>
          candidate.institutionId === query.institutionId &&
          (query.accountId === undefined ||
            candidate.accountId === null ||
            candidate.accountId === query.accountId) &&
          (query.from === undefined || candidate.date >= query.from) &&
          (query.to === undefined || candidate.date <= query.to) &&
          (query.direction === undefined || candidate.direction === query.direction)
      );
    },
    async getCandidate(kind: CandidateKind, id: string): Promise<MatchCandidate | null> {
      return candidates.find((candidate) => candidate.kind === kind && candidate.id === id) ?? null;
    },
  };
}

/** The accounts of an in-memory list. */
export function createAccountDirectory(accounts: readonly StatementAccount[]): AccountDirectory {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  return { get: (accountId: string) => byId.get(accountId) ?? null };
}

/** A total, with how much of it matched. */
function totalsOf(total: number, unmatched: number): {
  total: number;
  matched: number;
  unmatched: number;
} {
  return { total, matched: total - unmatched, unmatched };
}

/** Sums amounts on the side their direction names, in the currency every one of them is counted in. */
function sumSigned(
  items: readonly { readonly amount: Money; readonly direction: StatementDirection }[],
  currency: CurrencyCode
): Money {
  let total = zero(currency);
  for (const item of items) {
    if (item.amount.currency !== currency) {
      throw new ReconciliationError(
        'currency_mismatch',
        `an amount of ${item.amount.currency} cannot be totalled in ${currency}`,
        { detail: { expected: currency, actual: item.amount.currency } }
      );
    }
    total = add(total, item.direction === 'inflow' ? item.amount : negate(item.amount));
  }
  return isZero(total) ? zero(currency) : total;
}

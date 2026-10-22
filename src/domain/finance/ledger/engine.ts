// ABOUTME: The posting engine: it posts a derived entry, reverses and corrects a posted one,
// ABOUTME: derives the trial balance, and opens and closes the periods an entry may land in.

import { generateUuidv7 } from '@/domain/ids';
import { zero, type CurrencyCode, type Money } from '@/domain/money';

import {
  DEFAULT_LEDGER_ACCOUNT_MAPPING,
  type LedgerAccountMapping,
} from './chart';
import { createJournalEntry, isIsoDay, reverseJournalEntry } from './entry';
import { LedgerError } from './errors';
import {
  creditNoteEntry,
  invoiceEntry,
  openingBalanceEntry,
  paymentEntry,
  refundEntry,
  type CreditNotePostingInput,
  type InvoicePostingInput,
  type OpeningBalancePostingInput,
  type PaymentPostingInput,
  type PostingOptions,
  type RefundPostingInput,
} from './postings';
import {
  LEDGER_ENTRY_AUDIT_ENTITY,
  LEDGER_PERIOD_AUDIT_ENTITY,
  type LedgerStore,
} from './store';
import { deriveTrialBalance } from './trialBalance';
import type {
  EntryQuery,
  JournalEntry,
  JournalLineInput,
  LedgerAuditEvent,
  LedgerPeriod,
  TrialBalance,
} from './types';

/** What the engine is built with. */
export interface LedgerServiceOptions {
  /** The store every entry is written to. */
  readonly store: LedgerStore;
  /** The chart of accounts. Defaults to the control accounts with no fee item mapped. */
  readonly mapping?: LedgerAccountMapping;
  /** The actor recorded on the postings this service makes. */
  readonly actor?: string;
  /** The clock the postings are stamped with. Defaults to the system clock. */
  readonly now?: () => Date;
  /** Internal: set by `withTransaction` on the service bound to that transaction. */
  readonly bound?: boolean;
}

/** What a caller asks of the trial balance. */
export interface TrialBalanceQuery {
  /** A trial balance is kept per currency; the one it is derived in. */
  readonly currency: CurrencyCode;
  readonly institutionId?: string;
  /** Only entries dated on or before this day. */
  readonly asOf?: string;
  readonly periodId?: string;
}

/** The options of a reversal. */
export interface ReverseOptions {
  /** Why the entry is reversed. Required. */
  readonly reason: string;
  /** The date the reversal takes effect. Defaults to the original entry's date. */
  readonly entryDate?: string;
  readonly actor?: string;
}

/** The replacement an entry is corrected to. The institution and the source come from the original. */
export interface CorrectionInput {
  /** The date the corrected entry takes effect. Defaults to the original entry's date. */
  readonly entryDate?: string;
  readonly narration: string;
  readonly lines: readonly JournalLineInput[];
  readonly postedBy?: string;
  readonly periodId?: string;
}

/** The options of a correction. */
export interface CorrectionOptions extends ReverseOptions {
  /** The date the corrected entry takes effect. Defaults to the original entry's date. */
  readonly entryDate?: string;
}

/** The chain a correction posts: the reversal of the original, and the entry that replaces it. */
export interface LedgerCorrection {
  readonly reversal: JournalEntry;
  readonly corrected: JournalEntry;
}

export interface ClosePeriodInput {
  readonly institutionId: string;
  readonly startDate: string;
  readonly endDate: string;
  /** The name of the period. Defaults to its date range. */
  readonly name?: string;
  readonly actor?: string;
  readonly reason?: string;
}

export interface ReopenPeriodInput {
  readonly periodId: string;
  /** Why the period is reopened. Required: reopening the books is an audited decision. */
  readonly reason: string;
  readonly actor?: string;
}

/**
 * Posts, reverses and reports on the double-entry ledger.
 *
 * Every write goes through the store, and the store refuses an edit or a delete of a posted entry,
 * so the only correction the engine can offer is a reversal plus the corrected entry. An entry is
 * validated before it reaches the store, so an unbalanced entry cannot be created at all.
 */
export class LedgerService {
  private readonly store: LedgerStore;
  private readonly chart: LedgerAccountMapping;
  private readonly actor: string | undefined;
  private readonly clock: () => Date;
  private readonly bound: boolean;

  constructor(options: LedgerServiceOptions) {
    this.store = options.store;
    this.chart = options.mapping ?? DEFAULT_LEDGER_ACCOUNT_MAPPING;
    this.actor = options.actor;
    this.clock = options.now ?? (() => new Date());
    this.bound = options.bound ?? false;
  }

  /** The chart of accounts this engine posts against. */
  get mapping(): LedgerAccountMapping {
    return this.chart;
  }

  /**
   * Runs `work` in one store transaction, handing it a service bound to that transaction.
   *
   * This is how several postings commit together, as a correction does: the reversal and the
   * corrected entry land together or not at all, and the audit rows of both roll back with them.
   */
  withTransaction<T>(work: (service: LedgerService) => Promise<T>): Promise<T> {
    return this.store.transaction((store) =>
      work(
        new LedgerService({
          store,
          mapping: this.chart,
          actor: this.actor,
          now: this.clock,
          bound: true,
        })
      )
    );
  }

  /**
   * Posts an entry that was already created and validated.
   *
   * The entry lands with its lines and its audit row in one transaction. It is refused when its
   * date lies inside a closed period, when its source document already has a posting, and when the
   * entry it reverses has already been reversed.
   */
  post(entry: JournalEntry): Promise<JournalEntry> {
    return this.unit((store) => this.postIn(store, entry));
  }

  /**
   * Reverses a posted entry.
   *
   * The reversal mirrors the original line for line and references it, so the history reads as a
   * chain. It is dated by the original's date unless the caller moves it, which is how an entry is
   * corrected after its period was closed: the reversal lands in the current open period.
   */
  reverse(entryId: string, options: ReverseOptions): Promise<JournalEntry> {
    return this.unit((store) => this.reverseIn(store, entryId, options));
  }

  /**
   * Corrects a posted entry: the reversal of it, and the entry that replaces it.
   *
   * The two land in one transaction, so a failure leaves neither. The corrected entry names the
   * entry it replaces, and the reversal names the entry it reverses, so the chain reads
   * original <- reversed by <- corrected.
   */
  correct(
    entryId: string,
    replacement: CorrectionInput,
    options: CorrectionOptions
  ): Promise<LedgerCorrection> {
    return this.unit(async (store) => {
      const original = await this.load(store, entryId);
      const reversal = await this.postIn(store, this.reversalOf(original, options));
      const corrected = createJournalEntry(
        {
          institutionId: original.institutionId,
          entryDate: options.entryDate ?? replacement.entryDate ?? original.entryDate,
          source: original.source,
          narration: replacement.narration,
          lines: replacement.lines,
          correctsEntryId: entryId,
          ...(options.actor ?? replacement.postedBy ?? this.actor
            ? { postedBy: options.actor ?? replacement.postedBy ?? this.actor }
            : {}),
          ...(replacement.periodId ? { periodId: replacement.periodId } : {}),
        },
        { now: this.clock }
      );
      await this.postIn(store, corrected);
      return { reversal, corrected };
    });
  }

  /** Posts the entry of a posted invoice. */
  async postInvoice(input: InvoicePostingInput): Promise<JournalEntry> {
    return this.post(invoiceEntry(input, this.chart, this.postingOptions(input.postedBy)));
  }

  /** Posts the entry of a received payment and its allocations. */
  async postPayment(input: PaymentPostingInput): Promise<JournalEntry> {
    return this.post(paymentEntry(input, this.chart, this.postingOptions(input.postedBy)));
  }

  /** Posts the entry of a paid refund. */
  async postRefund(input: RefundPostingInput): Promise<JournalEntry> {
    return this.post(refundEntry(input, this.chart, this.postingOptions(input.postedBy)));
  }

  /** Posts the entry of a posted credit note. */
  async postCreditNote(input: CreditNotePostingInput): Promise<JournalEntry> {
    return this.post(creditNoteEntry(input, this.chart, this.postingOptions(input.postedBy)));
  }

  /** Posts the entry of an opening balance. */
  async postOpeningBalance(input: OpeningBalancePostingInput): Promise<JournalEntry> {
    return this.post(openingBalanceEntry(input, this.chart, this.postingOptions(input.postedBy)));
  }

  /** One entry, or null. */
  entry(id: string): Promise<JournalEntry | null> {
    return this.store.entry(id);
  }

  /** The entries a query names, oldest first. */
  listEntries(query: EntryQuery = {}): Promise<readonly JournalEntry[]> {
    return this.store.listEntries(query);
  }

  /**
   * The trial balance of the entries a query names.
   *
   * Per account the debits, the credits and the balance, and the totals of each. The result always
   * balances: every entry in the ledger was validated to have equal debits and credits.
   */
  trialBalance(query: TrialBalanceQuery): Promise<TrialBalance> {
    return this.store
      .listEntries({
        institutionId: query.institutionId,
        asOf: query.asOf,
        periodId: query.periodId,
      })
      .then((entries) => deriveTrialBalance(entries, query.currency));
  }

  /** The balance of one account: its debits less its credits. */
  async accountBalance(
    accountCode: string,
    query: TrialBalanceQuery
  ): Promise<Money> {
    const balance = await this.trialBalance(query);
    const row = balance.rows.find((candidate) => candidate.accountCode === accountCode);
    return row ? row.balance : zero(query.currency);
  }

  /** The periods of an institution, oldest first. */
  periods(institutionId: string): Promise<readonly LedgerPeriod[]> {
    return this.store.listPeriods(institutionId);
  }

  /**
   * Closes a period, so nothing may be posted into it afterwards.
   *
   * The period is defined by the range the caller names and starts closed. A range that overlaps a
   * period the institution already keeps is refused: two periods over one day would make "is this
   * day closed" ambiguous. A closed period is opened again with {@link reopenPeriod}.
   */
  async closePeriod(input: ClosePeriodInput): Promise<LedgerPeriod> {
    if (!isIsoDay(input.startDate) || !isIsoDay(input.endDate) || input.endDate < input.startDate) {
      throw new LedgerError(
        'invalid_entry',
        `a period runs from an ISO day to an ISO day (${input.startDate}..${input.endDate})`,
        { detail: { startDate: input.startDate, endDate: input.endDate } }
      );
    }
    const now = this.clock().toISOString();
    const actor = input.actor ?? this.actor ?? null;

    return this.unit(async (store) => {
      const overlapping = (await store.listPeriods(input.institutionId)).find(
        (period) => period.startDate <= input.endDate && period.endDate >= input.startDate
      );
      if (overlapping) {
        throw new LedgerError(
          'period_overlap',
          `the period ${input.startDate}..${input.endDate} overlaps "${overlapping.name}" (${overlapping.startDate}..${overlapping.endDate})`,
          { detail: { startDate: input.startDate, endDate: input.endDate, periodId: overlapping.id } }
        );
      }

      const period: LedgerPeriod = {
        id: generateUuidv7(),
        institutionId: input.institutionId,
        name: input.name ?? `${input.startDate}..${input.endDate}`,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'closed',
        closedAt: now,
        closedBy: actor,
        closeReason: input.reason ?? null,
        reopenedAt: null,
        reopenedBy: null,
        reopenReason: null,
        createdAt: now,
        updatedAt: now,
      };
      await store.insertPeriod(period);
      await this.auditPeriod(store, period, 'create', actor, input.reason ?? null, now, [
        'status',
        'start_date',
        'end_date',
      ]);
      return period;
    });
  }

  /**
   * Reopens a closed period.
   *
   * Spec 05 section 8 asks for period locking and a financial-year close, not for an immovable
   * lock, so reopening is allowed: it needs a reason, it records who reopened the books and when,
   * and the close and the reopen both stay in the audit trail. An entry posted into the period
   * after the reopen is not marked in any way - the trail is where the history lives.
   */
  async reopenPeriod(input: ReopenPeriodInput): Promise<LedgerPeriod> {
    const reason = input.reason.trim();
    if (reason === '') {
      throw new LedgerError(
        'invalid_entry',
        `reopening period ${input.periodId} needs a reason; reopening the books is an audited decision`,
        { detail: { periodId: input.periodId } }
      );
    }
    const now = this.clock().toISOString();
    const actor = input.actor ?? this.actor ?? null;

    return this.unit(async (store) => {
      const period = await store.period(input.periodId);
      if (!period) {
        throw new LedgerError('not_found', `ledger period ${input.periodId} does not exist`, {
          detail: { periodId: input.periodId },
        });
      }
      if (period.status === 'open') {
        throw new LedgerError('invalid_entry', `period "${period.name}" is already open`, {
          detail: { periodId: period.id },
        });
      }
      const reopened: LedgerPeriod = {
        ...period,
        status: 'open',
        reopenedAt: now,
        reopenedBy: actor,
        reopenReason: reason,
        updatedAt: now,
      };
      await store.updatePeriod(reopened);
      await this.auditPeriod(store, reopened, 'update', actor, reason, now, ['status', 'reopened_at']);
      return reopened;
    });
  }

  /** The audit trail of one entry or period, oldest first: who posted what, when. */
  auditTrail(subjectId: string): Promise<readonly LedgerAuditEvent[]> {
    return this.store.auditTrail(subjectId);
  }

  /** The ledger's recent audit trail, newest first. */
  auditLog(query: { limit?: number; offset?: number } = {}): Promise<readonly LedgerAuditEvent[]> {
    return this.store.auditLog(query);
  }

  private async postIn(store: LedgerStore, entry: JournalEntry): Promise<JournalEntry> {
    const period = await this.periodFor(store, entry);
    this.assertPeriodOpen(entry, period);

    if (entry.reversesEntryId === null && entry.correctsEntryId === null) {
      const existing = await store.originalFor(
        entry.institutionId,
        entry.source.kind,
        entry.source.id
      );
      if (existing) {
        throw new LedgerError(
          'conflict',
          `${entry.source.kind} ${entry.source.number ?? entry.source.id} already has journal entry ${existing.id}; a document is posted once`,
          { detail: { source: entry.source, entryId: existing.id } }
        );
      }
    }
    if (entry.reversesEntryId !== null && (await store.reversalOf(entry.reversesEntryId))) {
      throw new LedgerError(
        'already_reversed',
        `journal entry ${entry.reversesEntryId} has already been reversed`,
        { detail: { entryId: entry.reversesEntryId } }
      );
    }

    // The period is resolved from the date, so the row records which period it landed in and a
    // read by period is a plain filter rather than a range query.
    const stored: JournalEntry = period === null ? entry : { ...entry, periodId: period.id };
    await store.insertEntry(stored);
    await store.writeAudit({
      subjectId: stored.id,
      entity: LEDGER_ENTRY_AUDIT_ENTITY,
      action: 'create',
      actorId: stored.postedBy,
      reason: stored.reversalReason ?? stored.narration,
      detail: entrySummary(stored),
      changedFields: ['entry_date', 'source', 'narration', 'lines', 'total'],
      createdAt: stored.postedAt,
    });
    return stored;
  }

  private async reverseIn(
    store: LedgerStore,
    entryId: string,
    options: ReverseOptions
  ): Promise<JournalEntry> {
    const original = await this.load(store, entryId);
    return this.postIn(store, this.reversalOf(original, options));
  }

  /** The mirror entry of a reversal, stamped with this service's clock and actor. */
  private reversalOf(original: JournalEntry, options: ReverseOptions): JournalEntry {
    return reverseJournalEntry(original, {
      reason: options.reason,
      ...(options.entryDate ? { entryDate: options.entryDate } : {}),
      postedBy: options.actor ?? this.actor ?? null,
      now: this.clock,
    });
  }

  private async load(store: LedgerStore, entryId: string): Promise<JournalEntry> {
    const entry = await store.entry(entryId);
    if (!entry) {
      throw new LedgerError('not_found', `journal entry ${entryId} does not exist`, {
        detail: { entryId },
      });
    }
    if (await store.reversalOf(entryId)) {
      throw new LedgerError(
        'already_reversed',
        `journal entry ${entryId} has already been reversed; a second reversal would reverse it twice`,
        { detail: { entryId } }
      );
    }
    return entry;
  }

  private async periodFor(store: LedgerStore, entry: JournalEntry): Promise<LedgerPeriod | null> {
    if (entry.periodId !== null) {
      const period = await store.period(entry.periodId);
      if (!period) {
        throw new LedgerError(
          'not_found',
          `journal entry ${entry.id} names ledger period ${entry.periodId}, which does not exist`,
          { detail: { entryId: entry.id, periodId: entry.periodId } }
        );
      }
      return period;
    }
    return store.periodCovering(entry.institutionId, entry.entryDate);
  }

  private assertPeriodOpen(entry: JournalEntry, period: LedgerPeriod | null): void {
    if (!period || period.status === 'open') return;
    throw new LedgerError(
      'period_closed',
      `entry ${entry.id} is dated ${entry.entryDate}, inside the closed period "${period.name}" (${period.startDate}..${period.endDate}); nothing may be posted into a closed period`,
      {
        detail: {
          entryId: entry.id,
          entryDate: entry.entryDate,
          periodId: period.id,
          periodName: period.name,
          closeReason: period.closeReason,
        },
      }
    );
  }

  private async auditPeriod(
    store: LedgerStore,
    period: LedgerPeriod,
    action: 'create' | 'update',
    actor: string | null,
    reason: string | null,
    createdAt: string,
    changedFields: readonly string[]
  ): Promise<void> {
    await store.writeAudit({
      subjectId: period.id,
      entity: LEDGER_PERIOD_AUDIT_ENTITY,
      action,
      actorId: actor,
      reason,
      detail: {
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
      },
      changedFields,
      createdAt,
    });
  }

  /** Runs `work` in the unit the policy says: a transaction, or the one already open. */
  private unit<T>(work: (store: LedgerStore) => Promise<T>): Promise<T> {
    return this.bound ? work(this.store) : this.store.transaction(work);
  }

  private postingOptions(postedBy?: string): PostingOptions {
    return { now: this.clock, postedBy: postedBy ?? this.actor ?? null };
  }
}

/** The compact shape of an entry an audit row carries. */
function entrySummary(entry: JournalEntry): Record<string, unknown> {
  return {
    institutionId: entry.institutionId,
    entryDate: entry.entryDate,
    source: entry.source,
    narration: entry.narration,
    currency: entry.currency,
    totalDebitMinor: entry.totalDebit.amount_minor,
    totalCreditMinor: entry.totalCredit.amount_minor,
    lines: entry.lines.length,
    reversesEntryId: entry.reversesEntryId,
    correctsEntryId: entry.correctsEntryId,
  };
}

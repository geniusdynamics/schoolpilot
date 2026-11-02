// ABOUTME: Recording and reversing an expense: the document row in the canonical repository and the
// ABOUTME: balanced journal entry it posts, in one transaction, idempotent against a double submit.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type { QueryRepository } from '@/data/query';
import type {
  CreateInput,
  RepositoryRow,
  UpdateInput,
  UpdateOptions,
  WriteOptions,
} from '@/data/repository';
import { asId, generateUuidv7, type Id } from '@/domain/ids';
import { fromMinor, isCurrencyCode } from '@/domain/money';
import type { EntityName } from '@/domain/schema';
import type { Money } from '@/domain/schema/common';

import {
  LedgerService,
  createTransactionLedgerStore,
  expenseAccounts,
  isLedgerError,
  resolveChannelAccount,
  type LedgerAccount,
} from '../ledger';
import { ExpenseError } from './errors';

/** The writable canonical surface an expense needs, plus the transaction it commits in. */
export interface ExpenseRepository extends QueryRepository {
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  transaction?<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T>;
}

/** What a caller states to record an expense. */
export interface RecordExpenseInput {
  readonly institutionId: string;
  /** The day the expense takes effect, an ISO day (`2027-02-10`). */
  readonly expenseDate: string;
  readonly payee: string;
  readonly category?: string;
  readonly description?: string;
  readonly amount: Money;
  readonly channel: 'cash' | 'bank_deposit' | 'mobile_money' | 'cheque';
  /** The expense-class account of the ledger's chart the entry debits. */
  readonly expenseAccountCode: string;
  /** The receipt or voucher number; a fresh one is generated when it is absent. */
  readonly reference?: string;
  /** Makes a double submit return the row it already wrote instead of posting again. */
  readonly idempotencyKey?: string;
  /** The user recording the expense. */
  readonly recordedBy?: string;
}

/** What a caller states to reverse a posted expense. */
export interface ReverseExpenseOptions {
  /** Why the expense is reversed. Required: an unexplained reversal is not an audit. */
  readonly reason: string;
  /** The day the reversal takes effect. Defaults to today, so a closed original period still corrects. */
  readonly entryDate?: string;
  readonly actor?: string;
}

export interface ExpenseServiceOptions {
  readonly repository: ExpenseRepository;
  /** The ledger read for its chart and joined for the posting. */
  readonly ledger: LedgerService;
  /** The actor recorded on the postings. */
  readonly actor?: string;
  /** The clock the postings are stamped with. */
  readonly now?: () => Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The written date and actor columns accept an optional uuid and nothing else. */
function uuidOrUndefined(value: string | undefined): string | undefined {
  return value !== undefined && UUID.test(value) ? value : undefined;
}

function trimmed(value: string | undefined): string {
  return (value ?? '').trim();
}

/** A voucher number that is unique by construction: the date and the row's own id. */
export function voucherNumberFor(expenseId: string, expenseDate: string): string {
  return `EXP-${expenseDate.replaceAll('-', '')}-${expenseId.slice(-6).toUpperCase()}`;
}

/**
 * Records expenses and reverses them.
 *
 * The document and its journal entry commit in one transaction: a closed period refuses the post
 * before a row is written, and a failure to write the row rolls the entry back with it. Recording
 * is idempotent on `idempotencyKey`, and a posted expense is corrected by a reversal entry, never
 * by an edit or a delete.
 */
export class ExpenseService {
  private readonly repository: ExpenseRepository;
  private readonly ledger: LedgerService;
  private readonly actor: string | undefined;
  private readonly clock: () => Date;

  constructor(options: ExpenseServiceOptions) {
    this.repository = options.repository;
    this.ledger = options.ledger;
    this.actor = options.actor;
    this.clock = options.now ?? (() => new Date());
  }

  /** The expense accounts of the ledger's chart: what an expense may debit. */
  expenseAccounts(): readonly LedgerAccount[] {
    return expenseAccounts(this.ledger.mapping);
  }

  /** Records an expense and posts its entry. */
  async record(input: RecordExpenseInput): Promise<RepositoryRow<'expense'>> {
    const institutionId = trimmed(input.institutionId);
    const expenseDate = trimmed(input.expenseDate);
    const payee = trimmed(input.payee);
    const expenseAccountCode = trimmed(input.expenseAccountCode);
    const reference = trimmed(input.reference);
    const idempotencyKey = trimmed(input.idempotencyKey);

    if (institutionId === '') {
      throw new ExpenseError('institution_required', 'An expense belongs to an institution.', {
        field: 'institutionId',
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || Number.isNaN(new Date(expenseDate).getTime())) {
      throw new ExpenseError('date_invalid', 'Choose the date the expense was incurred.', {
        field: 'expenseDate',
      });
    }
    if (payee === '') {
      throw new ExpenseError('payee_required', 'Enter who was paid.', { field: 'payee' });
    }
    if (
      !Number.isSafeInteger(input.amount.amount_minor) ||
      input.amount.amount_minor <= 0 ||
      !isCurrencyCode(input.amount.currency)
    ) {
      throw new ExpenseError('amount_invalid', 'Enter an amount greater than zero.', {
        field: 'amount',
      });
    }
    const amount = fromMinor(input.amount.amount_minor, input.amount.currency);
    if (expenseAccountCode === '') {
      throw new ExpenseError('account_required', 'Choose the expense account to debit.', {
        field: 'expenseAccountCode',
      });
    }

    const paymentAccount = resolveChannelAccount(this.ledger.mapping, input.channel);
    const actor = input.recordedBy ?? this.actor;

    return this.unit(async (tx) => {
      const ledger = this.ledgerOver(tx);

      if (idempotencyKey !== '') {
        const existing = await this.repository.list('expense', {
          where: { institution_id: institutionId, idempotency_key: idempotencyKey },
        });
        if (existing.items.length > 0) return existing.items[0];
      }

      if (reference !== '') {
        const taken = await this.repository.list('expense', {
          where: { institution_id: institutionId, reference },
        });
        if (taken.items.length > 0) {
          throw new ExpenseError(
            'reference_taken',
            `Voucher ${reference} is already used by another expense of this institution.`,
            { field: 'reference' }
          );
        }
      }

      // The repository owns the row id, and the ledger's source is that id: the row is written
      // first as a draft, the entry is posted against it, and the same transaction marks it
      // posted. A refusal from the ledger rolls the draft back, so no orphan document remains.
      const created = await this.repository.create(
        'expense',
        {
          institution_id: institutionId,
          reference: reference !== '' ? reference : `PENDING-${generateUuidv7()}`,
          expense_date: expenseDate,
          payee,
          ...(trimmed(input.category) === '' ? {} : { category: trimmed(input.category) }),
          ...(trimmed(input.description) === ''
            ? {}
            : { description: trimmed(input.description) }),
          amount: input.amount,
          channel: input.channel,
          expense_account_code: expenseAccountCode,
          payment_account_code: paymentAccount.code,
          ...(idempotencyKey === '' ? {} : { idempotency_key: idempotencyKey }),
          status: 'draft',
          ...(uuidOrUndefined(actor) === undefined ? {} : { created_by: uuidOrUndefined(actor) }),
        },
        actor === undefined ? {} : { actor }
      );

      const voucher =
        reference !== '' ? reference : voucherNumberFor(created.id, expenseDate);

      const entry = await ledger.postExpense({
        expense: {
          id: created.id,
          number: voucher,
          institutionId,
          expenseDate,
          payee,
          amount,
          expenseAccountCode,
          paymentAccountCode: paymentAccount.code,
          ...(trimmed(input.description) === ''
            ? {}
            : { description: trimmed(input.description) }),
        },
        ...(actor === undefined ? {} : { postedBy: actor }),
      });

      return this.repository.update(
        'expense',
        created.id,
        { reference: voucher, journal_entry_id: entry.id, status: 'posted' },
        { expectedVersion: created.rowVersion, ...(actor === undefined ? {} : { actor }) }
      );
    });
  }

  /** Reverses a posted expense with a counter-entry and marks the document reversed. */
  async reverse(
    expenseId: string,
    options: ReverseExpenseOptions
  ): Promise<RepositoryRow<'expense'>> {
    const reason = trimmed(options.reason);
    if (reason === '') {
      throw new ExpenseError(
        'reason_required',
        'Say why the expense is being reversed; the reversal is part of the audit trail.',
        { id: expenseId, field: 'reason' }
      );
    }
    const actor = options.actor ?? this.actor;

    return this.unit(async (tx) => {
      const ledger = this.ledgerOver(tx);
      const expense = await this.repository.get('expense', asId<'expense'>(expenseId));
      if (!expense) {
        throw new ExpenseError('not_found', `Expense ${expenseId} does not exist.`, {
          id: expenseId,
        });
      }
      if (expense.status === 'reversed') {
        throw new ExpenseError(
          'already_reversed',
          `Expense ${expense.reference} has already been reversed.`,
          { id: expenseId }
        );
      }

      const today = this.clock().toISOString().slice(0, 10);
      const reversal = await ledger.reverse(expense.journal_entry_id, {
        reason,
        entryDate: options.entryDate ?? today,
        ...(actor === undefined ? {} : { actor }),
      });

      return this.repository.update(
        'expense',
        asId<'expense'>(expenseId),
        {
          status: 'reversed',
          reversal_entry_id: reversal.id,
          reversal_reason: reason,
          reversed_at: this.clock().toISOString(),
          ...(uuidOrUndefined(actor) === undefined
            ? {}
            : { reversed_by: uuidOrUndefined(actor) }),
        },
        { expectedVersion: expense.rowVersion, ...(actor === undefined ? {} : { actor }) }
      );
    });
  }

  /**
   * Runs the work in the repository's transaction, or straight through when it has none.
   *
   * The repository reports a failure of a write that joined its transaction as a storage error;
   * the ledger's own refusal (a closed period, a source already posted) is unwrapped so the
   * caller reads the reason the ledger gave, not "the storage failed".
   */
  private async unit<T>(work: (tx: SqliteTransaction | null) => Promise<T>): Promise<T> {
    try {
      if (this.repository.transaction) return await this.repository.transaction(work);
      return await work(null);
    } catch (error) {
      if (isLedgerError(error)) throw error;
      const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
      if (isLedgerError(cause)) throw cause;
      throw error;
    }
  }

  /**
   * The ledger bound to the caller's transaction, so the entry and the document commit together.
   * Without a transaction the service's own ledger posts in the unit it opens.
   */
  private ledgerOver(tx: SqliteTransaction | null): LedgerService {
    if (tx === null) return this.ledger;
    return new LedgerService({
      store: createTransactionLedgerStore(tx),
      mapping: this.ledger.mapping,
      ...(this.actor === undefined ? {} : { actor: this.actor }),
      now: this.clock,
      bound: true,
    });
  }
}

/** True when the failure is either the expense rules' own refusal or the ledger's. */
export function isExpenseFailure(error: unknown): boolean {
  return error instanceof ExpenseError || isLedgerError(error);
}

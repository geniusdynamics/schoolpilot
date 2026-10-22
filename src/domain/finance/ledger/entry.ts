// ABOUTME: Creating a journal entry, and reversing one. The constructor refuses an entry that
// ABOUTME: cannot balance, so an unbalanced entry is impossible to create rather than refused at
// ABOUTME: save time; a reversal mirrors an entry exactly and references it.

import { add, compare, isZero, zero, type CurrencyCode, type Money } from '@/domain/money';
import { generateUuidv7 } from '@/domain/ids';

import { LedgerError } from './errors';
import type {
  JournalEntry,
  JournalEntryInput,
  JournalLine,
  JournalLineInput,
  JournalSide,
} from './types';

/** The clock and identity a created entry takes. */
export interface CreateEntryOptions {
  /** The id of the entry. Defaults to a fresh UUIDv7. */
  readonly id?: string;
  /** The clock the posting is stamped with. Defaults to the system clock. */
  readonly now?: () => Date;
  /** Overrides the entry's own `postedBy`. */
  readonly postedBy?: string | null;
}

/** The options of a reversal. */
export interface ReverseEntryOptions {
  /** Why the entry is reversed. Required: a reversal without a reason is not an audit. */
  readonly reason: string;
  /** The date the reversal takes effect. Defaults to the original entry's date. */
  readonly entryDate?: string;
  /** The id of the reversal. Defaults to a fresh UUIDv7. */
  readonly id?: string;
  readonly now?: () => Date;
  readonly postedBy?: string | null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates an ISO day.
 *
 * The shape is checked and the date is parsed, so `2027-02-31` is refused: a day that does not
 * exist is not a day an entry can be posted on.
 */
export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Creates a journal entry, refusing anything that is not a double entry.
 *
 * The rules, all of them checked here rather than at save time:
 * - at least two lines;
 * - every line carries exactly one of a debit and a credit, and a positive amount;
 * - every line is counted in one currency;
 * - the debits equal the credits.
 *
 * The entry that comes back is a posted entry in every respect but its persistence: the store
 * never changes it afterwards.
 */
export function createJournalEntry(
  input: JournalEntryInput,
  options: CreateEntryOptions = {}
): JournalEntry {
  if (input.lines.length === 0) {
    throw new LedgerError('empty_entry', 'a journal entry needs at least two lines; it has none', {
      detail: { source: input.source },
    });
  }
  if (input.lines.length === 1) {
    throw new LedgerError(
      'single_line',
      'a journal entry needs at least two lines; one line cannot balance',
      { detail: { source: input.source, lines: 1 } }
    );
  }

  const narration = input.narration.trim();
  if (narration === '') {
    throw new LedgerError('invalid_entry', 'a journal entry needs a narration', {
      detail: { source: input.source },
    });
  }
  if (input.source.id.trim() === '') {
    throw new LedgerError('invalid_entry', 'a journal entry needs the id of its source document', {
      detail: { source: input.source },
    });
  }
  if (!isIsoDay(input.entryDate)) {
    throw new LedgerError(
      'invalid_entry',
      `a journal entry is dated by an ISO day (2027-02-10), not "${input.entryDate}"`,
      { detail: { entryDate: input.entryDate } }
    );
  }

  const currency = lineCurrency(input.lines[0], 0);
  const lines: JournalLine[] = input.lines.map((line, index) =>
    normaliseLine(line, index, currency)
  );

  const totalDebit = sumSide(lines, 'debit');
  const totalCredit = sumSide(lines, 'credit');
  if (compare(totalDebit, totalCredit) !== 0) {
    throw new LedgerError(
      'unbalanced',
      `the journal entry does not balance: debits ${totalDebit.amount_minor} and credits ${totalCredit.amount_minor} ${currency}`,
      {
        detail: {
          debitMinor: totalDebit.amount_minor,
          creditMinor: totalCredit.amount_minor,
          currency,
          source: input.source,
        },
      }
    );
  }

  return {
    id: options.id ?? generateUuidv7(),
    institutionId: input.institutionId,
    entryDate: input.entryDate,
    source: { ...input.source },
    narration,
    currency,
    lines,
    totalDebit,
    totalCredit,
    postedAt: (options.now ?? (() => new Date()))().toISOString(),
    postedBy: options.postedBy ?? input.postedBy ?? null,
    periodId: input.periodId ?? null,
    reversesEntryId: input.reversesEntryId ?? null,
    correctsEntryId: input.correctsEntryId ?? null,
    reversalReason: input.reversalReason ?? null,
  };
}

/**
 * Reverses an entry: the mirror image of it, referencing it.
 *
 * Every line keeps its account and swaps its side, so the reversal's debits are the original's
 * credits and the reversal's credits are the original's debits. Posting both leaves every account
 * where it was, which is what makes a reversal the only way to correct a posted entry.
 */
export function reverseJournalEntry(
  entry: JournalEntry,
  options: ReverseEntryOptions
): JournalEntry {
  const reason = options.reason.trim();
  if (reason === '') {
    throw new LedgerError(
      'invalid_entry',
      `reversing entry ${entry.id} needs a reason; a reversal without one is not an audit`,
      { detail: { entryId: entry.id } }
    );
  }

  const lines: JournalLineInput[] = entry.lines.map((line) => ({
    accountCode: line.accountCode,
    ...(line.accountName === null ? {} : { accountName: line.accountName }),
    ...(line.debit === null ? {} : { credit: line.debit }),
    ...(line.credit === null ? {} : { debit: line.credit }),
    memo: `reversal of line ${line.lineNumber}`,
  }));

  return createJournalEntry(
    {
      institutionId: entry.institutionId,
      entryDate: options.entryDate ?? entry.entryDate,
      source: entry.source,
      narration: `Reversal of ${describeSource(entry)}: ${reason}`,
      lines,
      ...(options.postedBy === null ? {} : { postedBy: options.postedBy }),
      reversesEntryId: entry.id,
      reversalReason: reason,
    },
    { id: options.id, now: options.now, postedBy: options.postedBy ?? entry.postedBy }
  );
}

/** How a source document reads in a narration. */
export function describeSource(entry: Pick<JournalEntry, 'source'>): string {
  const { source } = entry;
  const label = source.kind.replace(/_/g, ' ');
  return source.number ? `${label} ${source.number}` : `${label} ${source.id}`;
}

function lineCurrency(line: JournalLineInput, index: number): CurrencyCode {
  const amount = line.debit ?? line.credit;
  if (amount === undefined) {
    throw new LedgerError(
      'no_side',
      `journal line ${index + 1} carries neither a debit nor a credit`,
      { detail: { line: index + 1, accountCode: line.accountCode } }
    );
  }
  return amount.currency;
}

function normaliseLine(
  line: JournalLineInput,
  index: number,
  currency: CurrencyCode
): JournalLine {
  const position = index + 1;
  if (line.debit !== undefined && line.credit !== undefined) {
    throw new LedgerError(
      'both_sides',
      `journal line ${position} carries both a debit and a credit; a line has exactly one side`,
      { detail: { line: position, accountCode: line.accountCode } }
    );
  }
  if (line.debit === undefined && line.credit === undefined) {
    throw new LedgerError(
      'no_side',
      `journal line ${position} carries neither a debit nor a credit`,
      { detail: { line: position, accountCode: line.accountCode } }
    );
  }
  if (line.accountCode.trim() === '') {
    throw new LedgerError('invalid_entry', `journal line ${position} carries no account code`, {
      detail: { line: position },
    });
  }

  const amount = (line.debit ?? line.credit) as Money;
  if (amount.currency !== currency) {
    throw new LedgerError(
      'currency_mismatch',
      `journal line ${position} is counted in ${amount.currency}, but the entry is counted in ${currency}; one entry holds one currency`,
      {
        detail: {
          line: position,
          accountCode: line.accountCode,
          expected: currency,
          actual: amount.currency,
        },
      }
    );
  }
  if (isZero(amount) || amount.amount_minor < 0) {
    throw new LedgerError(
      'zero_line',
      `journal line ${position} holds ${amount.amount_minor} ${currency}; a journal line is a positive amount on one side`,
      { detail: { line: position, accountCode: line.accountCode, amountMinor: amount.amount_minor } }
    );
  }

  return {
    lineNumber: position,
    accountCode: line.accountCode,
    accountName: line.accountName ?? null,
    debit: line.debit ?? null,
    credit: line.credit ?? null,
    memo: line.memo ?? null,
  };
}

function sumSide(lines: readonly JournalLine[], side: JournalSide): Money {
  const amounts = lines
    .map((line) => line[side])
    .filter((amount): amount is Money => amount !== null);
  const currency = lines[0]?.debit?.currency ?? lines[0]?.credit?.currency;
  if (currency === undefined) {
    throw new LedgerError('empty_entry', 'a journal entry needs at least two lines; it has none');
  }
  return amounts.reduce<Money>((running, amount) => add(running, amount), zero(currency));
}

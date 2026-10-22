// ABOUTME: The constructor of a journal entry and its reversal: every refusal the double entry
// ABOUTME: rule makes, and the mirror a reversal is. No database is involved: an unbalanced entry
// ABOUTME: cannot be created, so there is nothing to refuse at save time.

import { fromMinor } from '@/domain/money';
import { describe, expect, it } from 'vitest';

import {
  LedgerError,
  createJournalEntry,
  isIsoDay,
  reverseJournalEntry,
  type JournalEntryInput,
  type JournalLineInput,
} from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');
const usd = (minor: number) => fromMinor(minor, 'USD');

const INSTITUTION = 'inst-1';

function input(lines: readonly JournalLineInput[], overrides: Partial<JournalEntryInput> = {}): JournalEntryInput {
  return {
    institutionId: INSTITUTION,
    entryDate: '2027-02-10',
    source: { kind: 'invoice', id: 'invoice-1', number: 'INV/2027/T1/000001' },
    narration: 'Invoice posted',
    lines,
    ...overrides,
  };
}

const BALANCED: readonly JournalLineInput[] = [
  { accountCode: '1100', accountName: 'Fee receivables', debit: kes(150_000) },
  { accountCode: '4000', accountName: 'Fee revenue', credit: kes(150_000) },
];

function refusalOf(work: () => unknown): LedgerError {
  try {
    work();
  } catch (error) {
    if (error instanceof LedgerError) return error;
    throw error;
  }
  throw new Error('the entry was accepted, but it should have been refused');
}

describe('createJournalEntry', () => {
  it('creates a balanced entry, numbering its lines and totalling both sides', () => {
    const entry = createJournalEntry(input(BALANCED), { id: 'entry-1', now: () => new Date('2027-02-10T09:00:00.000Z') });

    expect(entry.id).toBe('entry-1');
    expect(entry.currency).toBe('KES');
    expect(entry.totalDebit).toEqual(kes(150_000));
    expect(entry.totalCredit).toEqual(kes(150_000));
    expect(entry.postedAt).toBe('2027-02-10T09:00:00.000Z');
    expect(entry.lines.map((line) => line.lineNumber)).toEqual([1, 2]);
    expect(entry.lines[0]).toMatchObject({ accountCode: '1100', debit: kes(150_000), credit: null });
    expect(entry.lines[1]).toMatchObject({ accountCode: '4000', debit: null, credit: kes(150_000) });
    expect(entry.reversesEntryId).toBeNull();
    expect(entry.correctsEntryId).toBeNull();
  });

  it('accepts an entry with more than two lines when the sides still agree', () => {
    const entry = createJournalEntry(
      input([
        { accountCode: '1100', debit: kes(100_000) },
        { accountCode: '4100', credit: kes(60_000) },
        { accountCode: '4200', credit: kes(40_000) },
      ])
    );
    expect(entry.lines).toHaveLength(3);
    expect(entry.totalDebit).toEqual(entry.totalCredit);
  });

  it('refuses an entry with no lines', () => {
    expect(refusalOf(() => createJournalEntry(input([]))).code).toBe('empty_entry');
  });

  it('refuses an entry with a single line', () => {
    expect(
      refusalOf(() => createJournalEntry(input([{ accountCode: '1100', debit: kes(1) }]))).code
    ).toBe('single_line');
  });

  it('refuses a line that carries both a debit and a credit', () => {
    const error = refusalOf(() =>
      createJournalEntry(
        input([
          { accountCode: '1100', debit: kes(100), credit: kes(100) },
          { accountCode: '4000', credit: kes(100) },
        ])
      )
    );
    expect(error.code).toBe('both_sides');
    expect(error.detail.line).toBe(1);
  });

  it('refuses a line that carries neither a debit nor a credit', () => {
    expect(
      refusalOf(() =>
        createJournalEntry(
          input([{ accountCode: '1100' }, { accountCode: '4000', credit: kes(100) }])
        )
      ).code
    ).toBe('no_side');
  });

  it('refuses a zero line and a negative line', () => {
    expect(
      refusalOf(() =>
        createJournalEntry(
          input([
            { accountCode: '1100', debit: kes(0) },
            { accountCode: '4000', credit: kes(0) },
          ])
        )
      ).code
    ).toBe('zero_line');
    expect(
      refusalOf(() =>
        createJournalEntry(
          input([
            { accountCode: '1100', debit: kes(-100) },
            { accountCode: '4000', credit: kes(-100) },
          ])
        )
      ).code
    ).toBe('zero_line');
  });

  it('refuses an entry that mixes two currencies', () => {
    const error = refusalOf(() =>
      createJournalEntry(
        input([
          { accountCode: '1100', debit: kes(100) },
          { accountCode: '4000', credit: usd(100) },
        ])
      )
    );
    expect(error.code).toBe('currency_mismatch');
    expect(error.detail).toMatchObject({ expected: 'KES', actual: 'USD', line: 2 });
  });

  it('refuses an entry whose debits do not equal its credits', () => {
    const error = refusalOf(() =>
      createJournalEntry(
        input([
          { accountCode: '1100', debit: kes(150_000) },
          { accountCode: '4000', credit: kes(149_999) },
        ])
      )
    );
    expect(error.code).toBe('unbalanced');
    expect(error.detail).toMatchObject({ debitMinor: 150_000, creditMinor: 149_999, currency: 'KES' });
  });

  it('refuses a date that is not an ISO day', () => {
    expect(refusalOf(() => createJournalEntry(input(BALANCED, { entryDate: '10/02/2027' }))).code).toBe(
      'invalid_entry'
    );
    expect(refusalOf(() => createJournalEntry(input(BALANCED, { entryDate: '2027-02-31' }))).code).toBe(
      'invalid_entry'
    );
  });

  it('refuses an entry without a narration or without a source id', () => {
    expect(refusalOf(() => createJournalEntry(input(BALANCED, { narration: '  ' }))).code).toBe(
      'invalid_entry'
    );
    expect(
      refusalOf(() => createJournalEntry(input(BALANCED, { source: { kind: 'invoice', id: ' ' } }))).code
    ).toBe('invalid_entry');
  });

  it('knows a real ISO day from a date-shaped string', () => {
    expect(isIsoDay('2027-02-10')).toBe(true);
    expect(isIsoDay('2028-02-29')).toBe(true);
    expect(isIsoDay('2027-02-29')).toBe(false);
    expect(isIsoDay('2027-2-10')).toBe(false);
    expect(isIsoDay('')).toBe(false);
  });
});

describe('reverseJournalEntry', () => {
  const original = createJournalEntry(
    input([
      { accountCode: '1100', accountName: 'Fee receivables', debit: kes(150_000), memo: 'invoice total' },
      { accountCode: '4100', accountName: 'Tuition revenue', credit: kes(100_000) },
      { accountCode: '4200', accountName: 'Boarding revenue', credit: kes(50_000) },
    ]),
    { id: 'entry-1', now: () => new Date('2027-02-10T09:00:00.000Z') }
  );

  it('mirrors the original line for line and references it', () => {
    const reversal = reverseJournalEntry(original, {
      reason: 'wrong learner',
      id: 'entry-2',
      now: () => new Date('2027-02-11T09:00:00.000Z'),
    });

    expect(reversal.reversesEntryId).toBe('entry-1');
    expect(reversal.reversalReason).toBe('wrong learner');
    expect(reversal.source).toEqual(original.source);
    expect(reversal.narration).toContain('wrong learner');
    expect(reversal.lines.map((line) => line.accountCode)).toEqual(
      original.lines.map((line) => line.accountCode)
    );
    for (const [index, line] of reversal.lines.entries()) {
      expect(line.debit).toEqual(original.lines[index].credit);
      expect(line.credit).toEqual(original.lines[index].debit);
    }
    expect(reversal.totalDebit).toEqual(original.totalCredit);
    expect(reversal.totalCredit).toEqual(original.totalDebit);
  });

  it('keeps the original currency and the original date unless the caller moves it', () => {
    const sameDay = reverseJournalEntry(original, { reason: 'mistake' });
    expect(sameDay.entryDate).toBe('2027-02-10');
    const later = reverseJournalEntry(original, { reason: 'mistake', entryDate: '2027-03-01' });
    expect(later.entryDate).toBe('2027-03-01');
  });

  it('refuses a reversal without a reason', () => {
    expect(refusalOf(() => reverseJournalEntry(original, { reason: '   ' })).code).toBe(
      'invalid_entry'
    );
  });

  it('is itself a balanced entry, so reversing a reversal balances too', () => {
    const reversal = reverseJournalEntry(original, { reason: 'mistake', id: 'entry-2' });
    expect(reversal.totalDebit).toEqual(reversal.totalCredit);
    const back = reverseJournalEntry(reversal, { reason: 'double mistake', id: 'entry-3' });
    expect(back.totalDebit).toEqual(original.totalDebit);
    expect(back.lines[0].debit).toEqual(original.lines[0].debit);
  });
});

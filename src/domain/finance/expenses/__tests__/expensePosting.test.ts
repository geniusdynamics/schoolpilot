// ABOUTME: The posting rules of a recorded expense: one balanced entry, a closed period refused,
// ABOUTME: a double submit that posts once, and a reversal that nets the accounts to zero.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { applySchemaMigrations } from '@/data/migrations';
import { createRepository } from '@/data/repository';
import {
  LedgerError,
  LedgerService,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import { fromMinor } from '@/domain/money';

import { ExpenseService } from '../service';

const CLOCK = new Date('2027-02-10T09:00:00.000Z');
const EXPENSE_DATE = '2027-02-10';
const AMOUNT = fromMinor(125_000, 'KES');

let adapter: SqliteAdapter;
let ledger: LedgerService;
let repository: ReturnType<typeof createRepository>;
let service: ExpenseService;
let institutionId: string;

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  await ensureLedgerSchema(adapter);
  repository = createRepository({ adapter });
  await repository.setup();
  await applySchemaMigrations(adapter);

  const institution = await repository.create('institution', {
    name: 'Mwangaza Secondary School',
    short_name: 'Mwangaza',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
  institutionId = institution.id;

  ledger = new LedgerService({
    store: createSqliteLedgerStore(adapter),
    now: () => CLOCK,
  });
  service = new ExpenseService({
    repository,
    ledger,
    now: () => CLOCK,
  });
});

afterEach(async () => {
  await adapter.close();
});

function recordInput(overrides: Record<string, unknown> = {}) {
  return {
    institutionId,
    expenseDate: EXPENSE_DATE,
    payee: 'Nairobi Electricity',
    category: 'utilities',
    description: 'February electricity bill',
    amount: AMOUNT,
    channel: 'bank_deposit' as const,
    expenseAccountCode: '5100',
    ...overrides,
  };
}

describe('recording an expense', () => {
  it('posts one balanced entry that debits the expense account and credits the bank', async () => {
    const expense = await service.record(recordInput());

    expect(expense.journal_entry_id).toBeTruthy();
    const entry = await ledger.entry(expense.journal_entry_id as string);
    expect(entry).not.toBeNull();
    expect(entry?.source).toMatchObject({ kind: 'expense', id: expense.id, number: expense.reference });
    expect(entry?.totalDebit.amount_minor).toBe(AMOUNT.amount_minor);
    expect(entry?.totalCredit.amount_minor).toBe(AMOUNT.amount_minor);

    const debit = entry?.lines.find((line) => line.debit !== null);
    const credit = entry?.lines.find((line) => line.credit !== null);
    expect(debit).toMatchObject({ accountCode: '5100' });
    expect(debit?.debit?.amount_minor).toBe(AMOUNT.amount_minor);
    expect(credit).toMatchObject({ accountCode: '1020' });
    expect(credit?.credit?.amount_minor).toBe(AMOUNT.amount_minor);
  });

  it('refuses a date inside a closed period and writes no expense row', async () => {
    await ledger.closePeriod({
      institutionId,
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      name: 'January 2027',
    });

    await expect(service.record(recordInput({ expenseDate: '2027-01-15' }))).rejects.toThrow(
      /January 2027/
    );
    await expect(service.record(recordInput({ expenseDate: '2027-01-15' }))).rejects.toBeInstanceOf(
      LedgerError
    );

    const rows = await repository.list('expense', {});
    expect(rows.items).toHaveLength(0);
    expect(await ledger.listEntries({ sourceKind: 'expense' })).toHaveLength(0);
  });

  it('posts once when the same idempotency key is submitted twice', async () => {
    const first = await service.record(recordInput({ idempotencyKey: 'expense-form-1' }));
    const second = await service.record(
      recordInput({ idempotencyKey: 'expense-form-1', payee: 'A different payee' })
    );

    expect(second.id).toBe(first.id);
    expect(second.reference).toBe(first.reference);

    const rows = await repository.list('expense', {});
    expect(rows.items).toHaveLength(1);
    expect(await ledger.listEntries({ sourceKind: 'expense' })).toHaveLength(1);
  });

  it('reverses with a counter-entry that nets every account to zero', async () => {
    const expense = await service.record(recordInput());

    const reversed = await service.reverse(expense.id, { reason: 'The bill was cancelled' });

    expect(reversed.status).toBe('reversed');
    expect(reversed.reversal_entry_id).toBeTruthy();

    const reversal = await ledger.entry(reversed.reversal_entry_id as string);
    expect(reversal?.reversesEntryId).toBe(expense.journal_entry_id);
    expect(reversal?.lines.map((line) => line.accountCode).sort()).toEqual(['1020', '5100']);

    expect(
      (await ledger.accountBalance('5100', { institutionId, currency: 'KES' })).amount_minor
    ).toBe(0);
    expect(
      (await ledger.accountBalance('1020', { institutionId, currency: 'KES' })).amount_minor
    ).toBe(0);
  });
});

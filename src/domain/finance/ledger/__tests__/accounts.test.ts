// ABOUTME: The canonical chart of accounts: seeding the defaults, building the posting mapping
// ABOUTME: from the rows, posting through them, and refusing to delete or repurpose a control
// ABOUTME: account a posting depends on.

import { createTestContext, type TestContext } from '@/data/__tests__/harness';
import { fromMinor } from '@/domain/money';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  LedgerError,
  LedgerService,
  accountsWithRole,
  assertLedgerAccountDeleteAllowed,
  assertLedgerAccountUpdateAllowed,
  createSqliteLedgerStore,
  ensureLedgerSchema,
  expenseAccounts,
  ledgerChartFromRows,
  seedDefaultLedgerAccounts,
} from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');

let context: TestContext;
let institutionId: string;

beforeEach(async () => {
  context = await createTestContext({ seed: false });
  await ensureLedgerSchema(context.adapter);
  const institution = await context.repository.create('institution', {
    name: 'Mwangaza Secondary School',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
  institutionId = institution.id;
});

afterEach(async () => {
  await context.close();
});

async function chart() {
  return (await seedDefaultLedgerAccounts(context.repository, institutionId)).rows;
}

function ledgerFor(rows: readonly Awaited<ReturnType<typeof chart>>[number][]) {
  return new LedgerService({
    store: createSqliteLedgerStore(context.adapter),
    mapping: ledgerChartFromRows(rows),
  });
}

describe('seeding the default chart', () => {
  it('writes the control accounts as system accounts and the standard expense accounts beside them', async () => {
    const first = await seedDefaultLedgerAccounts(context.repository, institutionId);

    expect(first.created).toBeGreaterThan(0);
    const cash = first.rows.find((row) => row.code === '1010');
    const bank = first.rows.find((row) => row.code === '1020');
    const utilities = first.rows.find((row) => row.code === '5100');
    expect(cash).toMatchObject({ name: 'Cash', kind: 'asset', role: 'cash', is_system: true });
    expect(bank).toMatchObject({ name: 'Bank', kind: 'asset', role: 'bank', is_system: true });
    expect(utilities).toMatchObject({ name: 'Utilities', kind: 'expense', is_system: false });

    const second = await seedDefaultLedgerAccounts(context.repository, institutionId);
    expect(second.created).toBe(0);
    expect(second.rows.map((row) => row.code).sort()).toEqual(
      first.rows.map((row) => row.code).sort()
    );
    expect(accountsWithRole(second.rows, ['cash', 'bank']).map((row) => row.code)).toEqual([
      '1010',
      '1020',
    ]);
  });

  it('falls back to the default chart when a school has no rows', () => {
    const mapping = ledgerChartFromRows([]);
    expect(mapping.account('1010')?.name).toBe('Cash');
    expect(expenseAccounts(mapping).map((account) => account.code)).toContain('5000');
  });
});

describe('posting through the school chart', () => {
  it('posts a seeded-chart expense against the accounts the rows name', async () => {
    const rows = await chart();
    const ledger = ledgerFor(rows);

    const entry = await ledger.postExpense({
      expense: {
        id: 'expense-1',
        institutionId,
        expenseDate: '2027-02-10',
        payee: 'Nairobi Electricity',
        amount: kes(125_000),
        expenseAccountCode: '5100',
        paymentAccountCode: '1010',
      },
    });

    expect(entry.lines.map((line) => line.accountCode)).toEqual(['5100', '1010']);
    expect(entry.lines[0]?.debit?.amount_minor).toBe(125_000);
    expect(entry.lines[1]?.credit?.amount_minor).toBe(125_000);
  });

  it('makes a school-created expense account selectable and posts to it', async () => {
    const rows = await chart();
    const created = await context.repository.create('ledger_account', {
      institution_id: institutionId,
      code: '5801',
      name: 'Library books',
      kind: 'expense',
      is_system: false,
      is_active: true,
    });

    const withCreated = [...rows, created];
    const mapping = ledgerChartFromRows(withCreated);
    expect(expenseAccounts(mapping).map((account) => account.code)).toContain('5801');

    const entry = await ledgerFor(withCreated).postExpense({
      expense: {
        id: 'expense-2',
        institutionId,
        expenseDate: '2027-02-11',
        payee: 'Text Book Centre',
        amount: kes(48_000),
        expenseAccountCode: '5801',
        paymentAccountCode: '1020',
      },
    });

    expect(entry.lines.map((line) => line.accountCode)).toEqual(['5801', '1020']);
    expect(mapping.account('5801')?.name).toBe('Library books');
  });
});

describe('protecting a control account', () => {
  it('refuses deleting it', async () => {
    const rows = await chart();
    const cash = rows.find((row) => row.code === '1010');
    expect(cash).toBeDefined();

    expect(() => assertLedgerAccountDeleteAllowed(cash!)).toThrow(LedgerError);
    try {
      assertLedgerAccountDeleteAllowed(cash!);
    } catch (error) {
      expect((error as LedgerError).code).toBe('account_protected');
    }
  });

  it('refuses renaming its code or changing the class, role or active state, but allows its name', async () => {
    const rows = await chart();
    const cash = rows.find((row) => row.code === '1010')!;

    expect(() => assertLedgerAccountUpdateAllowed(cash, { code: '1099' })).toThrow(/control account/);
    expect(() => assertLedgerAccountUpdateAllowed(cash, { kind: 'expense' })).toThrow(
      /control account/
    );
    expect(() => assertLedgerAccountUpdateAllowed(cash, { role: 'bank' })).toThrow(/control account/);
    expect(() => assertLedgerAccountUpdateAllowed(cash, { is_active: false })).toThrow(
      /control account/
    );
    expect(() => assertLedgerAccountUpdateAllowed(cash, { name: 'Cash at hand' })).not.toThrow();
  });
});

// ABOUTME: Bank accounts and the account each payment channel posts to: the chart rules a bank
// ABOUTME: account must satisfy, one default per school, and a channel nomination moving where a
// ABOUTME: payment or an expense actually posts.

import { createTestContext, type TestContext } from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';
import { fromMinor } from '@/domain/money';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  LedgerError,
  LedgerService,
  assertBankAccountLedgerAccount,
  assertChannelAccountLedgerAccount,
  bankAccountLedgerCandidates,
  createSqliteLedgerStore,
  ensureLedgerSchema,
  ledgerChartFromRows,
  seedDefaultLedgerChart,
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
  return seedDefaultLedgerChart(context.repository, institutionId);
}

async function bankAccount(
  ledgerAccountId: string,
  overrides: { name?: string; isDefault?: boolean } = {}
) {
  return context.repository.create('bank_account', {
    institution_id: institutionId,
    name: overrides.name ?? 'Main account',
    bank_name: 'Equity Bank',
    account_number: '0170123456789',
    ledger_account_id: ledgerAccountId,
    is_default: overrides.isDefault ?? false,
    is_active: true,
  });
}

describe('linking a bank account to the chart', () => {
  it('accepts an asset the chart keeps as a cash or bank book', async () => {
    const seed = await chart();
    const bank = seed.rows.find((row) => row.code === '1020')!;

    expect(assertBankAccountLedgerAccount(seed.rows, bank.id, 'bank account "Main"')).toBe(bank);
    expect(bankAccountLedgerCandidates(seed.rows).map((row) => row.code)).toEqual(['1010', '1020']);
  });

  it('refuses a revenue, expense, liability or unroled asset account', async () => {
    const seed = await chart();
    const expense = seed.rows.find((row) => row.code === '5000')!;
    const revenue = seed.rows.find((row) => row.code === '4000')!;
    const payable = seed.rows.find((row) => row.code === '2100')!;
    const receivables = seed.rows.find((row) => row.code === '1100')!;

    for (const account of [expense, revenue, payable, receivables]) {
      try {
        assertBankAccountLedgerAccount(seed.rows, account.id, 'bank account "Main"');
        throw new Error(`expected ${account.code} to be refused`);
      } catch (error) {
        expect(error).toBeInstanceOf(LedgerError);
        expect((error as LedgerError).code).toBe('invalid_account');
      }
    }
    expect(bankAccountLedgerCandidates(seed.rows).map((row) => row.code)).not.toContain('1100');
  });

  it('refuses an account the chart does not hold', async () => {
    const seed = await chart();
    expect(() =>
      assertBankAccountLedgerAccount(seed.rows, '01930000-0000-7000-8000-00000000ffff', 'bank')
    ).toThrow(/does not hold/);
  });
});

describe('clearing a channel nomination', () => {
  it('lets a channel be nominated again after the row was removed', async () => {
    const seed = await chart();
    const cash = seed.rows.find((row) => row.code === '1010')!;
    const nomination = seed.channels.rows.find((row) => row.channel === 'cash')!;

    await context.repository.remove('channel_account', nomination.id);
    const cleared = await context.repository.list('channel_account', {
      where: { institution_id: institutionId, channel: 'cash' },
    });
    expect(cleared.items).toHaveLength(0);

    const again = await context.repository.create('channel_account', {
      institution_id: institutionId,
      channel: 'cash',
      ledger_account_id: cash.id,
    });
    expect(again.ledger_account_id).toBe(cash.id);
  });
});

describe('the default bank account', () => {
  it('allows one default per school, refused by the database', async () => {
    const seed = await chart();
    const bank = seed.rows.find((row) => row.code === '1020')!;
    const first = await bankAccount(bank.id, { name: 'Main account', isDefault: true });

    expect(first.is_default).toBe(true);

    await expect(bankAccount(bank.id, { name: 'Second account', isDefault: true })).rejects.toThrow();

    const defaults = await context.repository.list('bank_account', {
      where: { institution_id: institutionId, is_default: true },
    });
    expect(defaults.items).toHaveLength(1);
    expect(defaults.items[0]?.name).toBe('Main account');
  });
});

describe('the account a channel posts to', () => {
  it('accepts an active asset and refuses anything else', async () => {
    const seed = await chart();
    const cash = seed.rows.find((row) => row.code === '1010')!;
    const expense = seed.rows.find((row) => row.code === '5000')!;

    expect(assertChannelAccountLedgerAccount(seed.rows, cash.id, 'cash')).toBe(cash);
    expect(() => assertChannelAccountLedgerAccount(seed.rows, expense.id, 'cash')).toThrow(
      /active asset account/
    );
  });

  it('posts a bank deposit to the account the school nominated', async () => {
    const seed = await chart();
    const second = await context.repository.create('ledger_account', {
      institution_id: institutionId,
      code: '1021',
      name: 'Equity Bank current account',
      kind: 'asset',
      role: 'bank',
      is_system: false,
      is_active: true,
    });
    await context.repository.update(
      'channel_account',
      seed.channels.rows.find((row) => row.channel === 'bank_deposit')!.id,
      { ledger_account_id: second.id },
      { expectedVersion: seed.channels.rows.find((row) => row.channel === 'bank_deposit')!.rowVersion }
    );

    const chartNow = await context.repository.list('ledger_account', {
      where: { institution_id: institutionId },
      limit: 500,
    });
    const channels = await context.repository.list('channel_account', {
      where: { institution_id: institutionId },
      limit: 500,
    });
    const ledger = new LedgerService({
      store: createSqliteLedgerStore(context.adapter),
      mapping: ledgerChartFromRows(chartNow.items, { channelRows: channels.items }),
    });

    const entry = await ledger.postPayment({
      payment: {
        id: '01930000-0000-7000-8000-0000000000a1',
        institutionId,
        amount: kes(500_000),
        channel: 'bank_deposit',
      },
      allocations: [
        {
          invoiceId: '01930000-0000-7000-8000-0000000000a2',
          amount: kes(500_000),
        },
      ],
    });

    expect(entry.lines[0]?.accountCode).toBe('1021');
    expect(entry.lines[0]?.debit?.amount_minor).toBe(500_000);
    expect(entry.lines.map((line) => line.accountCode)).toEqual(['1021', '1100']);
  });

  it('credits the nominated account when an expense is paid by bank deposit', async () => {
    const seed = await chart();
    const second = await context.repository.create('ledger_account', {
      institution_id: institutionId,
      code: '1021',
      name: 'Equity Bank current account',
      kind: 'asset',
      role: 'bank',
      is_system: false,
      is_active: true,
    });
    const rows = [...seed.rows, second];
    const channels = [
      ...seed.channels.rows.filter((row) => row.channel !== 'bank_deposit'),
      {
        ...seed.channels.rows.find((row) => row.channel === 'bank_deposit')!,
        ledger_account_id: second.id,
      },
    ];

    const ledger = new LedgerService({
      store: createSqliteLedgerStore(context.adapter),
      mapping: ledgerChartFromRows(rows, { channelRows: channels }),
    });

    const entry = await ledger.postExpense({
      expense: {
        id: '01930000-0000-7000-8000-0000000000a3',
        institutionId,
        expenseDate: '2027-02-10',
        payee: 'Nairobi Electricity',
        amount: kes(125_000),
        expenseAccountCode: '5100',
        paymentAccountCode: '1021',
      },
    });

    expect(entry.lines.map((line) => line.accountCode)).toEqual(['5100', '1021']);
    expect(entry.lines[1]?.credit?.amount_minor).toBe(125_000);
  });

  it('falls back to the control account when the channel has no nomination', async () => {
    const seed = await chart();
    // A school that configured nothing: the mapping knows the chart but no channel rows.
    const ledger = new LedgerService({
      store: createSqliteLedgerStore(context.adapter),
      mapping: ledgerChartFromRows(seed.rows),
    });

    const entry = await ledger.postPayment({
      payment: {
        id: '01930000-0000-7000-8000-0000000000a4',
        institutionId,
        amount: kes(250_000),
        channel: 'bank_deposit',
      },
      allocations: [
        { invoiceId: '01930000-0000-7000-8000-0000000000a5', amount: kes(250_000) },
      ],
    });

    expect(entry.lines[0]?.accountCode).toBe('1020');
  });

  it('ignores a nomination that points at an account the chart does not hold', async () => {
    const seed = await chart();
    const ghost = {
      ...seed.channels.rows.find((row) => row.channel === 'bank_deposit')!,
      ledger_account_id: asId<'ledger_account'>('01930000-0000-7000-8000-00000000ffff'),
    };

    const ledger = new LedgerService({
      store: createSqliteLedgerStore(context.adapter),
      mapping: ledgerChartFromRows(seed.rows, { channelRows: [ghost] }),
    });

    const entry = await ledger.postPayment({
      payment: {
        id: '01930000-0000-7000-8000-0000000000a6',
        institutionId,
        amount: kes(100_000),
        channel: 'bank_deposit',
      },
      allocations: [
        { invoiceId: '01930000-0000-7000-8000-0000000000a7', amount: kes(100_000) },
      ],
    });

    expect(entry.lines[0]?.accountCode).toBe('1020');
  });
});

// ABOUTME: Integration tests for the posting engine against real SQLite: posting every kind of
// ABOUTME: source, the trial balance balancing after each of them, immutability, reversal-only
// ABOUTME: correction, period close and reopen, and the audit trail of who posted what when.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { fromMinor, isZero } from '@/domain/money';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CONTROL_ACCOUNTS,
  LEDGER_ENTRY_TABLE,
  LEDGER_LINE_TABLE,
  LedgerError,
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  ensureLedgerSchema,
  netOfTrialBalance,
  type LedgerAccountMapping,
  type LedgerStore,
} from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');

const INSTITUTION = 'inst-1';
const ACTOR = 'bursar-1';
const CLOCK = () => new Date('2027-02-10T09:00:00.000Z');

const CHART: LedgerAccountMapping = createLedgerAccountMapping({
  accounts: [
    { code: '4100', name: 'Tuition revenue', kind: 'revenue' },
    { code: '4200', name: 'Boarding revenue', kind: 'revenue' },
  ],
  feeItemRevenueAccounts: { 'fee-tuition': '4100', 'fee-boarding': '4200' },
});

const RECEIVABLES = CONTROL_ACCOUNTS.receivables.code;
const REVENUE = CONTROL_ACCOUNTS.fee_revenue.code;
const TUITION = '4100';

interface Harness {
  readonly adapter: SqliteAdapter;
  readonly store: LedgerStore;
  service(options?: Partial<ConstructorParameters<typeof LedgerService>[0]>): LedgerService;
}

const open: Harness[] = [];
const temporary: string[] = [];

async function harness(filename = ':memory:'): Promise<Harness> {
  const adapter = createNodeSqliteAdapter({ filename, foreignKeys: true });
  await adapter.open();
  await ensureLedgerSchema(adapter);
  const store = createSqliteLedgerStore(adapter);
  const instance: Harness = {
    adapter,
    store,
    service: (options = {}) =>
      new LedgerService({ store, mapping: CHART, actor: ACTOR, now: CLOCK, ...options }),
  };
  open.push(instance);
  return instance;
}

afterEach(async () => {
  while (open.length > 0) await open.pop()?.adapter.close();
  while (temporary.length > 0) rmSync(temporary.pop() as string, { recursive: true, force: true });
});

/** An invoice of two fee lines. */
function invoiceInput(id = 'invoice-1', lines = [600_000, 1_850_000]) {
  return {
    invoice: {
      id,
      number: `INV/2027/T1/${id}`,
      institutionId: INSTITUTION,
      issueDate: '2027-01-10',
      lines: [
        { feeItemId: 'fee-tuition', amount: kes(lines[0]) },
        { feeItemId: 'fee-boarding', amount: kes(lines[1]) },
      ],
    },
  };
}

describe('posting a document', () => {
  it('stores the entry with its lines and reads it back unchanged', async () => {
    const { service } = await harness();
    const entry = await service().postInvoice(invoiceInput());

    const stored = await service().entry(entry.id);
    expect(stored).toEqual(entry);
    expect(stored?.lines).toHaveLength(3);
    expect(stored?.source).toEqual({
      kind: 'invoice',
      id: 'invoice-1',
      number: 'INV/2027/T1/invoice-1',
    });
  });

  it('refuses a second posting of the same document', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.postInvoice(invoiceInput());

    const error = await ledger.postInvoice(invoiceInput()).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(LedgerError);
    expect((error as LedgerError).code).toBe('conflict');
  });

  it('refuses the same document twice at the database level, whatever the engine does', async () => {
    const { service, store } = await harness();
    const entry = await service().postInvoice(invoiceInput());

    // A caller that bypasses the engine's own check still cannot double-post: the partial unique
    // index refuses the second original posting of a document.
    const duplicate = { ...entry, id: 'entry-copy' };
    const error = await store.insertEntry(duplicate).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(LedgerError);
    expect((error as LedgerError).code).toBe('conflict');
  });
});

describe('the trial balance always balances', () => {
  it('balances after an invoice, a payment, a refund, a credit note and an opening balance', async () => {
    const { service } = await harness();
    const ledger = service();

    await ledger.postInvoice(invoiceInput());
    let balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(balance.totalDebit).toEqual(kes(2_450_000));
    expect(isZero(netOfTrialBalance(balance))).toBe(true);

    await ledger.postPayment({
      payment: {
        id: 'payment-1',
        institutionId: INSTITUTION,
        amount: kes(1_000_000),
        channel: 'bank_deposit',
        receivedAt: '2027-02-03T10:00:00.000Z',
      },
      allocations: [{ invoiceId: 'invoice-1', amount: kes(900_000) }],
    });
    balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(isZero(netOfTrialBalance(balance))).toBe(true);

    await ledger.postRefund({
      refund: {
        id: 'refund-1',
        institutionId: INSTITUTION,
        amount: kes(100_000),
        status: 'paid',
        paidAt: '2027-03-01T12:00:00.000Z',
      },
    });

    await ledger.postCreditNote({
      creditNote: {
        id: 'credit-1',
        institutionId: INSTITUTION,
        amount: kes(50_000),
        issueDate: '2027-02-20',
        lines: [{ feeItemId: 'fee-tuition', amount: kes(50_000) }],
      },
    });

    await ledger.postOpeningBalance({
      openingBalance: {
        id: 'opening-1',
        institutionId: INSTITUTION,
        asOfDate: '2027-01-01',
        amount: kes(400_000),
        side: 'debit',
        learnerId: 'learner-1',
      },
    });

    balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(balance.totalDebit).toEqual(balance.totalCredit);
    expect(isZero(netOfTrialBalance(balance))).toBe(true);
    expect(balance.rows.map((row) => row.accountCode)).toEqual(
      [...balance.rows.map((row) => row.accountCode)].sort()
    );
  });

  it('reports what each account holds', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.postInvoice(invoiceInput());

    expect(await ledger.accountBalance(RECEIVABLES, { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(2_450_000)
    );
    expect(await ledger.accountBalance(TUITION, { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(-600_000)
    );
    expect(await ledger.accountBalance('9999', { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(0)
    );
  });

  it('balances over a partial period, counting only the entries on or before the day', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.postInvoice(invoiceInput('invoice-january'));
    await ledger.postInvoice({
      invoice: {
        id: 'invoice-march',
        institutionId: INSTITUTION,
        issueDate: '2027-03-10',
        lines: [{ feeItemId: 'fee-tuition', amount: kes(300_000) }],
      },
    });

    const partial = await ledger.trialBalance({
      institutionId: INSTITUTION,
      currency: 'KES',
      asOf: '2027-01-31',
    });
    expect(partial.balanced).toBe(true);
    expect(partial.totalDebit).toEqual(kes(2_450_000));

    const all = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(all.totalDebit).toEqual(kes(2_750_000));
    expect(all.balanced).toBe(true);
  });

  it('balances over a large batch posted in one transaction', async () => {
    const { service } = await harness();
    const ledger = service();

    const count = 400;
    await ledger.withTransaction(async (tx) => {
      for (let index = 0; index < count; index += 1) {
        await tx.postInvoice({
          invoice: {
            id: `invoice-batch-${index}`,
            institutionId: INSTITUTION,
            issueDate: '2027-01-10',
            lines: [{ feeItemId: 'fee-tuition', amount: kes(1_000 + index) }],
          },
        });
      }
    });

    const balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(isZero(netOfTrialBalance(balance))).toBe(true);
    const expected = 400 * 1_000 + (399 * 400) / 2;
    expect(balance.totalDebit).toEqual(kes(expected));
    expect(await ledger.listEntries({ institutionId: INSTITUTION })).toHaveLength(count);
  });
});

describe('immutability', () => {
  it('refuses an edit and a delete of a posted entry and of its lines, at the database level', async () => {
    const { adapter, service } = await harness();
    const entry = await service().postInvoice(invoiceInput());

    const updateEntry = await adapter
      .run(`UPDATE "${LEDGER_ENTRY_TABLE}" SET "narration" = 'edited' WHERE "id" = ?`, [entry.id])
      .catch((thrown: unknown) => thrown);
    expect(String(updateEntry)).toMatch(/immutable/);

    const deleteEntry = await adapter
      .run(`DELETE FROM "${LEDGER_ENTRY_TABLE}" WHERE "id" = ?`, [entry.id])
      .catch((thrown: unknown) => thrown);
    expect(String(deleteEntry)).toMatch(/immutable/);

    const updateLine = await adapter
      .run(`UPDATE "${LEDGER_LINE_TABLE}" SET "debit_minor" = 1 WHERE "entry_id" = ?`, [entry.id])
      .catch((thrown: unknown) => thrown);
    expect(String(updateLine)).toMatch(/immutable/);

    const deleteLine = await adapter
      .run(`DELETE FROM "${LEDGER_LINE_TABLE}" WHERE "entry_id" = ?`, [entry.id])
      .catch((thrown: unknown) => thrown);
    expect(String(deleteLine)).toMatch(/immutable/);

    // And the row is untouched: the refusals left the entry exactly as it was posted.
    expect(await service().entry(entry.id)).toEqual(entry);
  });

  it('offers no method that edits or deletes an entry', async () => {
    const { store } = await harness();
    expect(store).not.toHaveProperty('updateEntry');
    expect(store).not.toHaveProperty('deleteEntry');
    expect(store).not.toHaveProperty('removeEntry');
  });
});

describe('reversal', () => {
  it('mirrors the entry and nets every account back to where it was', async () => {
    const { service } = await harness();
    const ledger = service();
    const entry = await ledger.postInvoice(invoiceInput());

    const reversal = await ledger.reverse(entry.id, { reason: 'wrong learner' });
    expect(reversal.reversesEntryId).toBe(entry.id);
    expect(reversal.source).toEqual(entry.source);
    expect(reversal.totalDebit).toEqual(entry.totalCredit);

    const balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(isZero(netOfTrialBalance(balance))).toBe(true);
    for (const row of balance.rows) expect(isZero(row.balance)).toBe(true);
    expect(await ledger.accountBalance(RECEIVABLES, { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(0)
    );
  });

  it('refuses a second reversal of the same entry', async () => {
    const { service } = await harness();
    const ledger = service();
    const entry = await ledger.postInvoice(invoiceInput());
    await ledger.reverse(entry.id, { reason: 'wrong learner' });

    const error = await ledger.reverse(entry.id, { reason: 'again' }).catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('already_reversed');
  });

  it('refuses to reverse an entry that does not exist', async () => {
    const { service } = await harness();
    const error = await service()
      .reverse('missing', { reason: 'nothing there' })
      .catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('not_found');
  });
});

describe('correction', () => {
  it('posts a reversal and the corrected entry, and the chain reads as history', async () => {
    const { service } = await harness();
    const ledger = service();
    const original = await ledger.postInvoice(invoiceInput('invoice-1', [600_000, 1_850_000]));

    const { reversal, corrected } = await ledger.correct(
      original.id,
      {
        entryDate: '2027-01-11',
        narration: 'Corrected invoice',
        lines: [
          { accountCode: RECEIVABLES, accountName: 'Fee receivables', debit: kes(650_000) },
          { accountCode: TUITION, accountName: 'Tuition revenue', credit: kes(650_000) },
        ],
      },
      { reason: 'the boarding charge belonged to another learner' }
    );

    expect(reversal.reversesEntryId).toBe(original.id);
    expect(corrected.correctsEntryId).toBe(original.id);
    expect(corrected.reversesEntryId).toBeNull();

    const balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(await ledger.accountBalance(RECEIVABLES, { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(650_000)
    );
    expect(await ledger.accountBalance(TUITION, { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(-650_000)
    );
    expect(await ledger.listEntries({ institutionId: INSTITUTION })).toHaveLength(3);
  });

  it('refuses a second correction of the same entry', async () => {
    const { service } = await harness();
    const ledger = service();
    const original = await ledger.postInvoice(invoiceInput());
    await ledger.correct(
      original.id,
      {
        narration: 'Corrected',
        lines: [
          { accountCode: RECEIVABLES, debit: kes(100) },
          { accountCode: TUITION, credit: kes(100) },
        ],
      },
      { reason: 'wrong amount' }
    );

    const error = await ledger
      .correct(
        original.id,
        {
          narration: 'Corrected again',
          lines: [
            { accountCode: RECEIVABLES, debit: kes(200) },
            { accountCode: TUITION, credit: kes(200) },
          ],
        },
        { reason: 'again' }
      )
      .catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('already_reversed');
  });
});

describe('period close', () => {
  const closed = {
    institutionId: INSTITUTION,
    name: '2027 Term 1',
    startDate: '2027-01-01',
    endDate: '2027-03-31',
    reason: 'term closed',
  };

  it('refuses an entry dated inside a closed period, with the reason', async () => {
    const { service } = await harness();
    const ledger = service();
    const period = await ledger.closePeriod(closed);
    expect(period.status).toBe('closed');

    const error = await ledger.postInvoice(invoiceInput()).catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('period_closed');
    expect((error as LedgerError).detail).toMatchObject({
      periodName: '2027 Term 1',
      closeReason: 'term closed',
    });
    expect((error as LedgerError).message).toContain('2027-01-01..2027-03-31');
  });

  it('still accepts an entry dated after the closed period', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.closePeriod(closed);
    const entry = await ledger.postInvoice({
      invoice: {
        id: 'invoice-april',
        institutionId: INSTITUTION,
        issueDate: '2027-04-05',
        lines: [{ feeItemId: 'fee-tuition', amount: kes(10_000) }],
      },
    });
    expect(entry.entryDate).toBe('2027-04-05');
  });

  it('refuses a reversal into a closed period, and allows one dated in an open period', async () => {
    const { service } = await harness();
    const ledger = service();
    const entry = await ledger.postInvoice(invoiceInput());
    await ledger.closePeriod(closed);

    const refused = await ledger
      .reverse(entry.id, { reason: 'wrong learner' })
      .catch((thrown: unknown) => thrown);
    expect((refused as LedgerError).code).toBe('period_closed');

    const reversal = await ledger.reverse(entry.id, {
      reason: 'wrong learner',
      entryDate: '2027-04-01',
    });
    expect(reversal.entryDate).toBe('2027-04-01');

    const balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(isZero(netOfTrialBalance(balance))).toBe(true);
  });

  it('reopens a period so entries may be posted again, and records who reopened it', async () => {
    const { service } = await harness();
    const ledger = service();
    const period = await ledger.closePeriod(closed);

    const reopened = await ledger.reopenPeriod({
      periodId: period.id,
      reason: 'the bank statement arrived late',
      actor: 'head-1',
    });
    expect(reopened.status).toBe('open');
    expect(reopened.reopenedBy).toBe('head-1');
    expect(reopened.closeReason).toBe('term closed');

    const entry = await ledger.postInvoice(invoiceInput());
    expect(entry.periodId).toBe(period.id);

    const trail = await ledger.auditTrail(period.id);
    expect(trail.map((row) => row.action)).toEqual(['create', 'update']);
    expect(trail[1].actorId).toBe('head-1');
    expect(trail[1].reason).toBe('the bank statement arrived late');
  });

  it('refuses reopening without a reason, and reopening a period that is open', async () => {
    const { service } = await harness();
    const ledger = service();
    const period = await ledger.closePeriod(closed);

    const noReason = await ledger
      .reopenPeriod({ periodId: period.id, reason: '  ' })
      .catch((thrown: unknown) => thrown);
    expect((noReason as LedgerError).code).toBe('invalid_entry');

    await ledger.reopenPeriod({ periodId: period.id, reason: 'late statement' });
    const again = await ledger
      .reopenPeriod({ periodId: period.id, reason: 'again' })
      .catch((thrown: unknown) => thrown);
    expect((again as LedgerError).code).toBe('invalid_entry');
  });

  it('refuses a second period over the same days', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.closePeriod(closed);

    const error = await ledger
      .closePeriod({ ...closed, name: '2027 Term 1b', startDate: '2027-03-01', endDate: '2027-04-30' })
      .catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('period_overlap');
  });

  it('reads the entries of one period', async () => {
    const { service } = await harness();
    const ledger = service();
    const period = await ledger.closePeriod(closed);
    await ledger.reopenPeriod({ periodId: period.id, reason: 'late statement' });

    const inside = await ledger.postInvoice(invoiceInput('invoice-inside'));
    await ledger.postInvoice({
      invoice: {
        id: 'invoice-outside',
        institutionId: INSTITUTION,
        issueDate: '2027-05-01',
        lines: [{ feeItemId: 'fee-tuition', amount: kes(1_000) }],
      },
    });

    const ofPeriod = await ledger.listEntries({ institutionId: INSTITUTION, periodId: period.id });
    expect(ofPeriod.map((entry) => entry.id)).toEqual([inside.id]);
    const balance = await ledger.trialBalance({
      institutionId: INSTITUTION,
      currency: 'KES',
      periodId: period.id,
    });
    expect(balance.balanced).toBe(true);
  });
});

describe('the audit trail', () => {
  it('records who posted what, when, against the entry', async () => {
    const { service } = await harness();
    const ledger = service();
    const entry = await ledger.postInvoice(invoiceInput());

    const trail = await ledger.auditTrail(entry.id);
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      subjectId: entry.id,
      action: 'create',
      actorId: ACTOR,
      reason: 'Invoice INV/2027/T1/invoice-1 posted',
      createdAt: '2027-02-10T09:00:00.000Z',
    });
    expect(trail[0].detail).toMatchObject({
      institutionId: INSTITUTION,
      source: { kind: 'invoice', id: 'invoice-1' },
      totalDebitMinor: 2_450_000,
      lines: 3,
    });
  });

  it('records a reversal against the reversal, with the reason it was posted for', async () => {
    const { service } = await harness();
    const ledger = service();
    const entry = await ledger.postInvoice(invoiceInput());
    const reversal = await ledger.reverse(entry.id, { reason: 'wrong learner', actor: 'head-1' });

    const trail = await ledger.auditTrail(reversal.id);
    expect(trail[0]).toMatchObject({ actorId: 'head-1', reason: 'wrong learner' });
    expect(trail[0].detail).toMatchObject({ reversesEntryId: entry.id });
  });

  it('keeps the ledger audit log in commit order', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.postInvoice(invoiceInput('invoice-1'));
    await ledger.postInvoice(invoiceInput('invoice-2', [1_000, 2_000]));

    const log = await ledger.auditLog();
    expect(log).toHaveLength(2);
    expect(log[0].commitSequence).toBeGreaterThan(log[1].commitSequence);
  });
});

describe('the store', () => {
  it('applies its schema twice without complaint', async () => {
    const { adapter } = await harness();
    await expect(ensureLedgerSchema(adapter)).resolves.toBeUndefined();
  });

  it('keeps the ledger across a reopen of the database file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'ledger-'));
    temporary.push(directory);
    const filename = join(directory, 'ledger.sqlite');

    const first = createNodeSqliteAdapter({ filename, foreignKeys: true });
    await first.open();
    await ensureLedgerSchema(first);
    const posted = await new LedgerService({
      store: createSqliteLedgerStore(first),
      mapping: CHART,
      actor: ACTOR,
      now: CLOCK,
    }).postInvoice(invoiceInput());
    await first.close();

    const second = createNodeSqliteAdapter({ filename, foreignKeys: true });
    await second.open();
    await ensureLedgerSchema(second);
    const ledger = new LedgerService({
      store: createSqliteLedgerStore(second),
      mapping: CHART,
      actor: ACTOR,
      now: CLOCK,
    });
    expect(await ledger.entry(posted.id)).toEqual(posted);
    const balance = await ledger.trialBalance({ institutionId: INSTITUTION, currency: 'KES' });
    expect(balance.balanced).toBe(true);
    expect(balance.totalDebit).toEqual(kes(2_450_000));
    await second.close();
  });
});

describe('the refusals a chart makes', () => {
  it('refuses to post an invoice of a fee item the chart cannot place', async () => {
    const { store } = await harness();
    const strict = new LedgerService({
      store,
      mapping: createLedgerAccountMapping({ requireFeeItemMapping: true }),
      actor: ACTOR,
      now: CLOCK,
    });
    const error = await strict
      .postInvoice({
        invoice: {
          id: 'invoice-1',
          institutionId: INSTITUTION,
          issueDate: '2027-01-10',
          lines: [{ feeItemId: 'fee-tuition', amount: kes(1_000) }],
        },
      })
      .catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('no_mapping');
  });

  it('refuses an entry that names a period that does not exist', async () => {
    const { service } = await harness();
    const ledger = service();
    const error = await ledger
      .postInvoice({ ...invoiceInput(), periodId: 'missing-period' })
      .catch((thrown: unknown) => thrown);
    expect((error as LedgerError).code).toBe('not_found');
  });
});

describe('the revenue control account', () => {
  it('holds the whole revenue of a line with no fee item', async () => {
    const { service } = await harness();
    const ledger = service();
    await ledger.postInvoice({
      invoice: {
        id: 'invoice-fine',
        institutionId: INSTITUTION,
        issueDate: '2027-01-10',
        lines: [{ amount: kes(5_000), description: 'Lost library book' }],
      },
    });
    expect(await ledger.accountBalance(REVENUE, { institutionId: INSTITUTION, currency: 'KES' })).toEqual(
      kes(-5_000)
    );
  });
});

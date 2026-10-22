// ABOUTME: Integration tests for the sequence service against real SQLite: unique per-scope runs,
// ABOUTME: reset policies, the burn/reuse failure policies, and offline device blocks.

import { afterEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import { SEQUENCE_DEFINITIONS } from '../catalog';
import { SequenceConflictError, SequenceDefinitionError, SequencePolicyError } from '../errors';
import { SequenceService, type SequenceServiceOptions } from '../service';
import { createSqliteSequenceStore, ensureSequenceSchema, type SequenceStore } from '../store';
import type { Allocation, ScopeValues } from '../types';

interface Harness {
  readonly adapter: SqliteAdapter;
  readonly store: SequenceStore;
  service(options?: Partial<SequenceServiceOptions>): SequenceService;
}

const open: Harness[] = [];

async function harness(): Promise<Harness> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await ensureSequenceSchema(adapter);
  const store = createSqliteSequenceStore(adapter);
  const instance: Harness = {
    adapter,
    store,
    service: (options = {}) => new SequenceService({ store, ...options }),
  };
  open.push(instance);
  return instance;
}

afterEach(async () => {
  while (open.length > 0) await open.pop()?.adapter.close();
});

const INST_1 = { institution: 'INST-1' } as const;
const INST_2 = { institution: 'INST-2' } as const;

describe('SequenceService.issue', () => {
  it('starts a scope at 1 and hands out the next number each time', async () => {
    const { service } = await harness();
    const admission = service();

    const first = await admission.issue('admission', { ...INST_1, year: 2027 });
    const second = await admission.issue('admission', { ...INST_1, year: 2027 });
    const third = await admission.issue('admission', { ...INST_1, year: 2027 });

    expect([first.number, second.number, third.number]).toEqual([
      'ADM/2027/001',
      'ADM/2027/002',
      'ADM/2027/003',
    ]);
    expect([first.seq, second.seq, third.seq]).toEqual([1, 2, 3]);
    expect(first.scopeKey).toBe('institution=INST-1|year=2027');
  });

  it('gives two institutions their own counter', async () => {
    const { service } = await harness();
    const admission = service();

    const one = await admission.issue('admission', { ...INST_1, year: 2027 });
    const two = await admission.issue('admission', { ...INST_2, year: 2027 });
    const oneAgain = await admission.issue('admission', { ...INST_1, year: 2027 });

    expect([one.number, two.number, oneAgain.number]).toEqual([
      'ADM/2027/001',
      'ADM/2027/001',
      'ADM/2027/002',
    ]);
    expect(one.scopeKey).not.toBe(two.scopeKey);
  });

  it('restarts at 1 on a year reset without repeating the previous year', async () => {
    const { service } = await harness();
    const receipt = service();

    const before = [
      await receipt.issue('receipt', { ...INST_1, year: 2027 }),
      await receipt.issue('receipt', { ...INST_1, year: 2027 }),
    ];
    const after = await receipt.issue('receipt', { ...INST_1, year: 2028 });

    expect(before.map((row) => row.number)).toEqual(['RCT/2027/000001', 'RCT/2027/000002']);
    expect(after.number).toBe('RCT/2028/000001');
    expect(after.seq).toBe(1);
    expect(after.scopeKey).not.toBe(before[0].scopeKey);
    expect(new Set([...before.map((row) => row.number), after.number]).size).toBe(3);
  });

  it('takes the year from the clock when the caller does not give one', async () => {
    const { service } = await harness();
    const admission = service({ now: () => new Date('2029-04-01T00:00:00.000Z') });
    const allocation = await admission.issue('admission', INST_1);
    expect(allocation.number).toBe('ADM/2029/001');
  });

  it('records every number in the ledger', async () => {
    const { service, store } = await harness();
    const invoice = service();

    const allocation = await invoice.issue('invoice', { ...INST_1, year: 2027, term: 'T1' });
    const recorded = await store.issued('invoice', allocation.scopeKey, allocation.seq);

    expect(recorded?.number).toBe('INV/2027/T1/000001');
    expect(await store.countIssued('invoice', allocation.scopeKey)).toBe(1);
    expect(await store.listIssued('invoice', allocation.scopeKey)).toHaveLength(1);
  });

  it('refuses an unknown sequence', async () => {
    const { service } = await harness();
    await expect(service().issue('nope', INST_1)).rejects.toBeInstanceOf(SequenceDefinitionError);
  });

  it('refuses a custom definition whose reset period is not printed', async () => {
    const { service } = await harness();
    const broken = service({
      definitions: {
        // A yearly reset with no year in the pattern would repeat the previous year's numbers.
        broken: { name: 'broken', pattern: 'BR/{SEQ:3}', scope: ['institution', 'year'], reset: 'yearly' },
      },
    });
    await expect(broken.issue('broken', { ...INST_1, year: 2027 })).rejects.toBeInstanceOf(
      SequenceDefinitionError
    );
  });
});

describe('the failure policy', () => {
  it('burn: a failure after the number was taken does not release it', async () => {
    const { service, store } = await harness();
    const receipt = service({ failurePolicy: 'burn' });

    const first = await receipt.issue('receipt', { ...INST_1, year: 2027 });

    // The work the number was taken for fails, and the number is already committed.
    await expect(
      receipt.withTransaction(async (tx) => {
        const rolled = await tx.issue('receipt', { ...INST_1, year: 2027 }, { policy: 'reuse' });
        throw new Error(`the document for ${rolled.number} was not written`);
      })
    ).rejects.toThrow(/not written/);

    const next = await receipt.issue('receipt', { ...INST_1, year: 2027 });

    // The first number was burnt, not handed back: the next caller gets the one after it, and
    // the burnt number is still in the ledger so it can never be issued again.
    expect(first.seq).toBe(1);
    expect(next.seq).toBe(2);
    expect(next.number).toBe('RCT/2027/000002');
    expect(await store.issued('receipt', first.scopeKey, first.seq)).not.toBeNull();
    expect(await store.countIssued('receipt', first.scopeKey)).toBe(2);
  });

  it('reuse: a rollback returns the number, and nothing was issued', async () => {
    const { service, store } = await harness();
    const receipt = service({ failurePolicy: 'reuse' });

    let attempted: Allocation | undefined;
    await expect(
      receipt.withTransaction(async (tx) => {
        attempted = await tx.issue('receipt', { ...INST_1, year: 2027 });
        throw new Error('the document was not written');
      })
    ).rejects.toThrow(/not written/);

    const next = await receipt.issue('receipt', { ...INST_1, year: 2027 });

    expect(attempted?.seq).toBe(1);
    expect(next.seq).toBe(1);
    expect(next.number).toBe('RCT/2027/000001');
    // The rolled-back allocation left no trace, so exactly one number was ever issued.
    expect(await store.countIssued('receipt', next.scopeKey)).toBe(1);
  });

  it('refuses to burn inside a transaction that is already open', async () => {
    const { service } = await harness();
    const receipt = service({ failurePolicy: 'burn' });

    await expect(
      receipt.withTransaction(async (tx) => tx.issue('receipt', { ...INST_1, year: 2027 }))
    ).rejects.toBeInstanceOf(SequencePolicyError);
  });
});

describe('the store refuses a duplicate number', () => {
  it('refuses the same counter slot twice, and the same number twice', async () => {
    const { store } = await harness();
    const entry = {
      sequence: 'receipt',
      scopeKey: 'institution=INST-1|year=2027',
      seq: 1,
      number: 'RCT/2027/000001',
      issuedAt: '2027-01-01T00:00:00.000Z',
    };

    await store.record(entry);

    // The counter slot is the primary key.
    await expect(store.record({ ...entry, number: 'RCT/2027/999999' })).rejects.toBeInstanceOf(
      SequenceConflictError
    );
    // The number is a unique key of its own, so a reset cannot repeat it.
    await expect(store.record({ ...entry, seq: 99 })).rejects.toBeInstanceOf(SequenceConflictError);
  });
});

describe('parsing', () => {
  it('round-trips a number issued by the service', async () => {
    const { service } = await harness();
    const invoice = service();

    const allocation = await invoice.issue('invoice', { ...INST_1, year: 2027, term: 'T2' });
    expect(invoice.parse('invoice', allocation.number)).toEqual({ seq: 1, scope: { year: 2027, term: 'T2' } });
    expect(invoice.matches('invoice', allocation.number)).toBe(true);
  });

  it('refuses a number of another sequence and a manual number', async () => {
    const { service } = await harness();
    const admission = service();
    expect(admission.matches('admission', 'RCT/2027/000001')).toBe(false);
    expect(admission.matches('admission', 'ADM-2027-001')).toBe(false);
    expect(admission.parse('admission', 'ADM/2027/000001')).toEqual({ seq: 1, scope: { year: 2027 } });
  });
});

describe('offline device blocks', () => {
  const RECEIPT_SCOPE: ScopeValues = { institution: 'INST-1', year: 2027 };

  it('reserves a block from the shared counter and issues from it while disconnected', async () => {
    const { service, store } = await harness();
    const device = service({ deviceId: 'dev-a', blockSize: 3 });

    const block = await device.reserveBlock('receipt', RECEIPT_SCOPE);
    expect(block).toMatchObject({ startSeq: 1, endSeq: 3, size: 3, status: 'open', deviceId: 'dev-a' });

    const issued = [
      await device.issueFromBlock('receipt', RECEIPT_SCOPE),
      await device.issueFromBlock('receipt', RECEIPT_SCOPE),
      await device.issueFromBlock('receipt', RECEIPT_SCOPE),
    ];
    expect(issued.map((row) => row?.number)).toEqual([
      'RCT/2027/000001',
      'RCT/2027/000002',
      'RCT/2027/000003',
    ]);
    expect(issued[0]?.blockStart).toBe(1);
    expect(issued[0]?.deviceId).toBe('dev-a');

    // The block is used up, so the device must ask for another one.
    expect(await device.issueFromBlock('receipt', RECEIPT_SCOPE)).toBeNull();
    expect(await store.countIssued('receipt', issued[0]!.scopeKey)).toBe(3);
  });

  it('keeps the hub out of a reserved block, and the device out of the hub', async () => {
    const { service } = await harness();
    const device = service({ deviceId: 'dev-a' });
    const hub = service();

    await device.reserveBlock('receipt', RECEIPT_SCOPE, { size: 5 });
    const hubNumber = await hub.issue('receipt', RECEIPT_SCOPE);

    // The hub's number is after the whole block, never inside it.
    expect(hubNumber.number).toBe('RCT/2027/000006');
  });

  it('never reissues the unused numbers of a partly used block', async () => {
    const { service, store } = await harness();
    const deviceA = service({ deviceId: 'dev-a' });
    const deviceB = service({ deviceId: 'dev-b' });

    await deviceA.reserveBlock('receipt', RECEIPT_SCOPE, { size: 5 });
    const used = await deviceA.issueFromBlock('receipt', RECEIPT_SCOPE);
    expect(used?.number).toBe('RCT/2027/000001');

    // The device is retired without using numbers 2..5.
    await deviceA.releaseBlock('receipt', RECEIPT_SCOPE, { startSeq: 1 });

    const blockB = await deviceB.reserveBlock('receipt', RECEIPT_SCOPE, { size: 2 });
    expect(blockB).toMatchObject({ startSeq: 6, endSeq: 7 });

    const issued = await store.listIssued('receipt', used!.scopeKey);
    expect(issued.map((row) => row.seq)).toEqual([1]);
    expect(issued.some((row) => row.seq >= 2 && row.seq <= 5)).toBe(false);
  });

  it('hands two devices disjoint blocks', async () => {
    const { service } = await harness();
    const deviceA = service({ deviceId: 'dev-a' });
    const deviceB = service({ deviceId: 'dev-b' });
    const deviceC = service({ deviceId: 'dev-c' });

    const blocks = [
      await deviceA.reserveBlock('receipt', RECEIPT_SCOPE, { size: 4 }),
      await deviceB.reserveBlock('receipt', RECEIPT_SCOPE, { size: 4 }),
      await deviceC.reserveBlock('receipt', RECEIPT_SCOPE, { size: 4 }),
    ];

    expect(blocks.map((block) => [block.startSeq, block.endSeq])).toEqual([
      [1, 4],
      [5, 8],
      [9, 12],
    ]);
    const ranges = blocks.map((block) => `${block.startSeq}-${block.endSeq}`);
    expect(new Set(ranges).size).toBe(ranges.length);
  });

  it('reports the blocks still holding numbers, and stops once released', async () => {
    const { service } = await harness();
    const deviceA = service({ deviceId: 'dev-a' });
    const deviceB = service({ deviceId: 'dev-b' });

    await deviceA.reserveBlock('receipt', RECEIPT_SCOPE, { size: 5 });
    await deviceA.issueFromBlock('receipt', RECEIPT_SCOPE);
    await deviceA.issueFromBlock('receipt', RECEIPT_SCOPE);
    await deviceB.reserveBlock('receipt', RECEIPT_SCOPE, { size: 3 });

    const outstanding = await deviceA.outstandingBlocks({ sequence: 'receipt' });
    expect(outstanding).toHaveLength(2);

    const blockA = outstanding.find((block) => block.deviceId === 'dev-a');
    expect(blockA).toMatchObject({ startSeq: 1, endSeq: 5, used: 2, remaining: 3, status: 'open' });

    const blockB = outstanding.find((block) => block.deviceId === 'dev-b');
    expect(blockB).toMatchObject({ startSeq: 6, endSeq: 8, used: 0, remaining: 3 });

    await deviceA.releaseBlock('receipt', RECEIPT_SCOPE, { startSeq: 1 });

    const afterRelease = await deviceA.outstandingBlocks({ sequence: 'receipt' });
    expect(afterRelease.map((block) => block.deviceId)).toEqual(['dev-b']);
    // The released block is still on record, so its unused numbers are not silently free.
    const all = await deviceA.blocks({ sequence: 'receipt' });
    expect(all.find((block) => block.deviceId === 'dev-a')?.status).toBe('released');
  });

  it('drops an exhausted block from the outstanding report', async () => {
    const { service } = await harness();
    const device = service({ deviceId: 'dev-a' });

    await device.reserveBlock('receipt', RECEIPT_SCOPE, { size: 1 });
    await device.issueFromBlock('receipt', RECEIPT_SCOPE);

    expect(await device.outstandingBlocks({ sequence: 'receipt' })).toHaveLength(0);
    expect((await device.blocks({ sequence: 'receipt' }))[0]?.status).toBe('exhausted');
  });

  it('scopes a block to its institution', async () => {
    const { service } = await harness();
    const device = service({ deviceId: 'dev-a' });

    const blockOne = await device.reserveBlock('receipt', { ...INST_1, year: 2027 }, { size: 3 });
    const blockTwo = await device.reserveBlock('receipt', { ...INST_2, year: 2027 }, { size: 3 });

    expect(blockOne.startSeq).toBe(1);
    expect(blockTwo.startSeq).toBe(1);
    expect(blockOne.scopeKey).not.toBe(blockTwo.scopeKey);

    const fromOne = await device.issueFromBlock('receipt', { ...INST_1, year: 2027 });
    expect(fromOne?.number).toBe('RCT/2027/000001');
    expect(await device.openBlock('receipt', { ...INST_1, year: 2027 })).toMatchObject({ remaining: 2 });
  });

  it('needs a device, and returns null when there is no open block', async () => {
    const { service } = await harness();
    const hub = service();
    await expect(hub.reserveBlock('receipt', RECEIPT_SCOPE)).rejects.toBeInstanceOf(SequenceDefinitionError);
    await expect(hub.issueFromBlock('receipt', RECEIPT_SCOPE)).rejects.toBeInstanceOf(
      SequenceDefinitionError
    );

    const device = service({ deviceId: 'dev-a' });
    expect(await device.issueFromBlock('receipt', RECEIPT_SCOPE)).toBeNull();
  });
});

describe('the built-in catalog', () => {
  it('names admission, invoice and receipt, and the finance documents next to them', () => {
    expect(Object.keys(SEQUENCE_DEFINITIONS)).toEqual([
      'admission',
      'invoice',
      'receipt',
      'credit_note',
      'payment_voucher',
      'student_number',
    ]);
  });

  it('issues from each of them', async () => {
    const { service } = await harness();
    const sequences = service();

    expect((await sequences.issue('admission', { ...INST_1, year: 2027 })).number).toBe('ADM/2027/001');
    expect((await sequences.issue('invoice', { ...INST_1, year: 2027, term: 'T1' })).number).toBe(
      'INV/2027/T1/000001'
    );
    expect((await sequences.issue('receipt', { ...INST_1, year: 2027 })).number).toBe('RCT/2027/000001');
    expect((await sequences.issue('credit_note', { ...INST_1, year: 2027 })).number).toBe(
      'CRN/2027/000001'
    );
    expect((await sequences.issue('payment_voucher', { ...INST_1, year: 2027 })).number).toBe(
      'PV/2027/000001'
    );
    expect((await sequences.issue('student_number', { institution: 'GA' })).number).toBe('GA/00001');
  });
});

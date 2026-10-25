// ABOUTME: The device-side block allocator against real SQLite: a device numbers a receipt from
// ABOUTME: the block the hub gave it, tops up when one runs out, and fails loudly when it is
// ABOUTME: offline with none - so two offline devices can never issue the same number.

import { afterEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import { BlockAllocator, type BlockSource } from '../blocks';
import { SequenceBlockError, SequenceBlockExhaustedError } from '../errors';
import { SequenceService } from '../service';
import { createSqliteSequenceStore, ensureSequenceSchema } from '../store';
import type { BlockReservation, ScopeValues } from '../types';

const SCOPE: ScopeValues = { institution: 'INST-1', year: 2027 };

/** One replica: its own database, the sequences on it, and a close. */
interface Replica {
  readonly adapter: SqliteAdapter;
  readonly service: SequenceService;
}

const opened: Replica[] = [];

async function replica(deviceId?: string): Promise<Replica> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await ensureSequenceSchema(adapter);
  const service = new SequenceService({
    store: createSqliteSequenceStore(adapter),
    ...(deviceId === undefined ? {} : { deviceId }),
    now: () => new Date('2027-02-10T09:00:00.000Z'),
  });
  const instance = { adapter, service };
  opened.push(instance);
  return instance;
}

afterEach(async () => {
  while (opened.length > 0) await opened.pop()?.adapter.close();
});

/**
 * The hub, as a device sees it: a source that hands out blocks from a shared counter and can be
 * switched off, which is what "the device is offline" means to the allocator.
 */
function hubOf(hub: SequenceService): BlockSource & { online: boolean } {
  const source = {
    online: true,
    async allocateBlock(request: {
      readonly sequence: string;
      readonly scope: ScopeValues;
      readonly deviceId: string;
      readonly size: number;
    }): Promise<BlockReservation> {
      if (!source.online) throw new Error('the hub is unreachable');
      return hub.reserveBlock(request.sequence, request.scope, {
        deviceId: request.deviceId,
        size: request.size,
      });
    },
  };
  return source;
}

function allocator(
  replica: Replica,
  options: { readonly deviceId: string; readonly hub?: BlockSource; readonly blockSize?: number }
): BlockAllocator {
  return new BlockAllocator({
    service: replica.service,
    deviceId: options.deviceId,
    blockSize: options.blockSize ?? 5,
    ...(options.hub === undefined ? {} : { hub: options.hub }),
  });
}

describe('a device numbering from a block', () => {
  it('asks the hub once, then numbers from the block it holds', async () => {
    const device = await replica();
    const hub = await replica();
    const numbers = allocator(device, { deviceId: 'device-a', hub: hubOf(hub.service) });

    const issued = [
      await numbers.issue('receipt', SCOPE),
      await numbers.issue('receipt', SCOPE),
      await numbers.issue('receipt', SCOPE),
    ];

    expect(issued.map((allocation) => allocation.number)).toEqual([
      'RCT/2027/000001',
      'RCT/2027/000002',
      'RCT/2027/000003',
    ]);
    // The whole block was taken from the hub's counter up front, so the hub's next number is
    // after the block: nothing the hub issues can land inside it.
    const after = await hub.service.issue('receipt', SCOPE);
    expect(after.number).toBe('RCT/2027/000006');
    expect(issued[0]?.blockStart).toBe(1);
  });

  it('keeps numbering from the block once the hub is gone', async () => {
    const device = await replica();
    const hub = await replica();
    const source = hubOf(hub.service);
    const numbers = allocator(device, { deviceId: 'device-a', hub: source, blockSize: 3 });

    await numbers.issue('receipt', SCOPE);
    source.online = false;

    const issued = [
      await numbers.issue('receipt', SCOPE),
      await numbers.issue('receipt', SCOPE),
    ];
    expect(issued.map((allocation) => allocation.number)).toEqual([
      'RCT/2027/000002',
      'RCT/2027/000003',
    ]);
  });

  it('tops up from the hub when a block runs out and the hub is reachable', async () => {
    const device = await replica();
    const hub = await replica();
    const numbers = allocator(device, { deviceId: 'device-a', hub: hubOf(hub.service), blockSize: 2 });

    const issued = [
      await numbers.issue('receipt', SCOPE),
      await numbers.issue('receipt', SCOPE),
      await numbers.issue('receipt', SCOPE),
    ];

    expect(issued.map((allocation) => allocation.number)).toEqual([
      'RCT/2027/000001',
      'RCT/2027/000002',
      'RCT/2027/000003',
    ]);
    expect(issued[2]?.blockStart).toBe(3);
  });

  it('fails loudly when the block is used up and the hub is unreachable', async () => {
    const device = await replica();
    const hub = await replica();
    const source = hubOf(hub.service);
    const numbers = allocator(device, { deviceId: 'device-a', hub: source, blockSize: 2 });

    await numbers.issue('receipt', SCOPE);
    await numbers.issue('receipt', SCOPE);
    source.online = false;

    // The number is not invented, and not reused: the caller is told there is none.
    await expect(numbers.issue('receipt', SCOPE)).rejects.toBeInstanceOf(SequenceBlockExhaustedError);
  });

  it('issues from its own counter when no hub is configured', async () => {
    const device = await replica();
    const numbers = allocator(device, { deviceId: 'device-a' });

    const issued = [
      await numbers.issue('receipt', SCOPE),
      await numbers.issue('receipt', SCOPE),
    ];

    expect(issued.map((allocation) => allocation.number)).toEqual([
      'RCT/2027/000001',
      'RCT/2027/000002',
    ]);
  });
});

describe('no duplicate receipt numbers across devices', () => {
  /**
   * The acceptance criterion, as the field would meet it.
   *
   * Two devices each ask the hub for a block - the moment a cashier's screen is online - and then
   * both go offline. Everything each device hands out comes from the range the hub gave it, and
   * the ranges are disjoint, so no printed receipt number can repeat.
   */
  it('hands two offline devices disjoint runs', async () => {
    const hub = await replica();
    const deviceA = await replica();
    const deviceB = await replica();
    const sourceA = hubOf(hub.service);
    const sourceB = hubOf(hub.service);
    const numbersA = allocator(deviceA, { deviceId: 'device-a', hub: sourceA, blockSize: 5 });
    const numbersB = allocator(deviceB, { deviceId: 'device-b', hub: sourceB, blockSize: 5 });

    // Each device takes its block while it is online, then loses the hub. The ranges the hub
    // handed out do not overlap.
    const firstA = await numbersA.issue('receipt', SCOPE);
    const firstB = await numbersB.issue('receipt', SCOPE);
    expect(await numbersA.openBlock('receipt', SCOPE)).toMatchObject({
      startSeq: 1,
      endSeq: 5,
      remaining: 4,
    });
    expect(await numbersB.openBlock('receipt', SCOPE)).toMatchObject({
      startSeq: 6,
      endSeq: 10,
      remaining: 4,
    });
    sourceA.online = false;
    sourceB.online = false;

    const issued = [
      firstA,
      firstB,
      ...(await Promise.all(Array.from({ length: 4 }, () => numbersA.issue('receipt', SCOPE)))),
      ...(await Promise.all(Array.from({ length: 4 }, () => numbersB.issue('receipt', SCOPE)))),
    ];
    const numbers = issued.map((allocation) => allocation.number).sort();

    expect(numbers).toEqual([
      'RCT/2027/000001',
      'RCT/2027/000002',
      'RCT/2027/000003',
      'RCT/2027/000004',
      'RCT/2027/000005',
      'RCT/2027/000006',
      'RCT/2027/000007',
      'RCT/2027/000008',
      'RCT/2027/000009',
      'RCT/2027/000010',
    ]);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe('adopting a block the hub allocated', () => {
  it('refuses a range the hub did not allocate for this scope', async () => {
    const device = await replica();
    const hub = await replica();
    const source = hubOf(hub.service);
    const numbers = allocator(device, { deviceId: 'device-a', hub: source });

    // A hub answering with another sequence's block must not be recorded as this one's.
    const foreign: BlockSource = {
      allocateBlock: async () => ({
        sequence: 'invoice',
        scopeKey: 'institution=INST-1|year=2027|term=T1',
        deviceId: 'device-a',
        startSeq: 1,
        endSeq: 5,
        size: 5,
        status: 'open',
        createdAt: '2027-02-10T09:00:00.000Z',
        updatedAt: '2027-02-10T09:00:00.000Z',
      }),
    };
    const other = allocator(device, { deviceId: 'device-a', hub: foreign });

    await expect(other.issue('receipt', SCOPE)).rejects.toBeInstanceOf(SequenceBlockError);
    await expect(numbers.issue('receipt', SCOPE)).resolves.toBeTruthy();
  });
});

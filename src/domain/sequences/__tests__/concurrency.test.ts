// ABOUTME: Concurrency tests for the sequence store against real SQLite: many concurrent callers
// ABOUTME: must produce one contiguous, duplicate-free run, and concurrent block reservations disjoint.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import { SequenceService } from '../service';
import { createSqliteSequenceStore, ensureSequenceSchema, type SequenceStore } from '../store';
import type { Allocation, ScopeValues } from '../types';

/**
 * What these tests exercise, precisely.
 *
 * better-sqlite3 is synchronous and the adapter runs every statement through one queue, so within
 * a single process the statements of two callers cannot execute at the same instant: they
 * interleave at `await` boundaries and, inside a store transaction, the whole unit is serialised.
 * This is therefore *not* two threads writing at once. What it does prove is the property that
 * matters: the number is taken by the store's own atomic upsert and refused by the store's own
 * unique key, so no interleaving of callers — and no shared counter on two connections — can hand
 * the same number out twice or leave a gap in a run of successes. SQLite serialises writers with
 * its own write lock, so the real database has the same shape.
 */

const SCOPE: ScopeValues = { institution: 'INST-1', year: 2027 };

const closers: (() => Promise<void>)[] = [];
const temporaryFiles: string[] = [];

afterEach(async () => {
  while (closers.length > 0) await closers.pop()?.();
  while (temporaryFiles.length > 0) {
    const file = temporaryFiles.pop();
    if (file) await fs.promises.rm(file, { force: true });
  }
});

async function memoryHarness(): Promise<{ store: SequenceStore; service: SequenceService }> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await ensureSequenceSchema(adapter);
  closers.push(() => adapter.close());
  const store = createSqliteSequenceStore(adapter);
  return { store, service: new SequenceService({ store }) };
}

async function fileAdapter(filename: string): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename });
  await adapter.open();
  closers.push(() => adapter.close());
  return adapter;
}

/** A throwaway database file on disk, removed after the test. */
function temporaryDatabase(): string {
  const filename = path.join(os.tmpdir(), `schoolpilot-sequences-${randomUUID()}.sqlite`);
  temporaryFiles.push(filename);
  return filename;
}

/** The counter values of a run, sorted, so a gap or a repeat is visible. */
function sequenceOf(allocations: readonly Allocation[]): number[] {
  return allocations.map((allocation) => allocation.seq).sort((left, right) => left - right);
}

describe('concurrent issuance on one connection', () => {
  it('gives 60 concurrent callers one contiguous, duplicate-free run', async () => {
    const { service, store } = await memoryHarness();
    const receipt = service;

    const allocations = await Promise.all(
      Array.from({ length: 60 }, () => receipt.issue('receipt', SCOPE))
    );

    expect(sequenceOf(allocations)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));
    expect(new Set(allocations.map((allocation) => allocation.number)).size).toBe(60);
    expect(await store.countIssued('receipt', allocations[0].scopeKey)).toBe(60);
    expect(await store.counterValue('receipt', allocations[0].scopeKey)).toBe(60);
  });

  it('holds when the counter and the ledger steps interleave', async () => {
    // The reuse policy runs the two steps as separate statements, so a second caller's allocation
    // lands between another caller's allocation and its ledger write. If the counter were a
    // read-then-write, that interleaving is exactly where a duplicate would appear.
    const { service, store } = await memoryHarness();

    const allocations = await Promise.all(
      Array.from({ length: 60 }, () => service.issue('receipt', SCOPE, { policy: 'reuse' }))
    );

    expect(sequenceOf(allocations)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));
    expect(new Set(allocations.map((allocation) => allocation.number)).size).toBe(60);
    expect(await store.countIssued('receipt', allocations[0].scopeKey)).toBe(60);
  });

  it('keeps two scopes independent under load', async () => {
    const { service, store } = await memoryHarness();

    const [one, two] = await Promise.all([
      Promise.all(Array.from({ length: 30 }, () => service.issue('receipt', { ...SCOPE, institution: 'INST-1' }))),
      Promise.all(Array.from({ length: 30 }, () => service.issue('receipt', { ...SCOPE, institution: 'INST-2' }))),
    ]);

    expect(sequenceOf(one)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(sequenceOf(two)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    // The pattern does not print the institution, so the two runs legitimately carry the same
    // number strings; uniqueness is per scope, and each scope is still one clean run.
    expect(new Set(one.map((allocation) => allocation.number)).size).toBe(30);
    expect(new Set(two.map((allocation) => allocation.number)).size).toBe(30);
    expect(one[0].scopeKey).not.toBe(two[0].scopeKey);
    expect(await store.countIssued('receipt', one[0].scopeKey)).toBe(30);
    expect(await store.countIssued('receipt', two[0].scopeKey)).toBe(30);
  });
});

describe('concurrent issuance across two connections', () => {
  it('shares one counter on the file, so the combined run is contiguous', async () => {
    const filename = temporaryDatabase();
    const first = await fileAdapter(filename);
    await ensureSequenceSchema(first);
    const second = await fileAdapter(filename);
    await ensureSequenceSchema(second);

    const storeOne = createSqliteSequenceStore(first);
    const storeTwo = createSqliteSequenceStore(second);
    const serviceOne = new SequenceService({ store: storeOne });
    const serviceTwo = new SequenceService({ store: storeTwo });

    // Single-statement steps on both connections: neither holds the write lock across an await,
    // so the two connections interleave instead of one waiting for the other to commit.
    const allocations = await Promise.all([
      ...Array.from({ length: 30 }, () => serviceOne.issue('receipt', SCOPE, { policy: 'reuse' })),
      ...Array.from({ length: 30 }, () => serviceTwo.issue('receipt', SCOPE, { policy: 'reuse' })),
    ]);

    expect(sequenceOf(allocations)).toEqual(Array.from({ length: 60 }, (_, index) => index + 1));
    expect(new Set(allocations.map((allocation) => allocation.number)).size).toBe(60);
    // Both connections see the same counter, because it lives in the database and not in memory.
    expect(await storeOne.counterValue('receipt', allocations[0].scopeKey)).toBe(60);
    expect(await storeTwo.counterValue('receipt', allocations[0].scopeKey)).toBe(60);
  });
});

describe('concurrent block reservations', () => {
  it('hands every device a disjoint range', async () => {
    const { service } = await memoryHarness();

    const reservations = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        service.reserveBlock('receipt', SCOPE, { deviceId: `dev-${index}`, size: 10 })
      )
    );

    const starts = reservations.map((block) => block.startSeq).sort((left, right) => left - right);
    expect(starts).toEqual(Array.from({ length: 12 }, (_, index) => index * 10 + 1));

    const claimed = new Set<number>();
    for (const block of reservations) {
      expect(block.endSeq - block.startSeq + 1).toBe(10);
      for (let seq = block.startSeq; seq <= block.endSeq; seq++) {
        expect(claimed.has(seq), `seq ${seq} reserved twice`).toBe(false);
        claimed.add(seq);
      }
    }
    expect(claimed.size).toBe(120);
  });

  it('gives a device concurrent claims on its block distinct numbers', async () => {
    const { service, store } = await memoryHarness();
    const device = service;

    await device.reserveBlock('receipt', SCOPE, { deviceId: 'dev-a', size: 25 });

    const claimed = await Promise.all(
      Array.from({ length: 25 }, () => device.issueFromBlock('receipt', SCOPE, { deviceId: 'dev-a' }))
    );

    const allocations = claimed.filter((allocation): allocation is Allocation => allocation !== null);
    expect(sequenceOf(allocations)).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
    expect(new Set(allocations.map((allocation) => allocation.number)).size).toBe(25);
    expect(await store.countIssued('receipt', allocations[0].scopeKey)).toBe(25);
    expect(await device.issueFromBlock('receipt', SCOPE, { deviceId: 'dev-a' })).toBeNull();
  });
});

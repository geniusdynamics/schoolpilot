// ABOUTME: The spike's measurements: what a change costs in bytes, how long a push and a pull
// ABOUTME: take on SQLite, Postgres and PouchDB, and what a merge costs when it runs in-process.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import type { EntityName } from '@/domain/schema';

import type { Envelope, Snapshot } from '../src/envelope';
import { envelopeBytes, snapshotBytes } from '../src/envelope';
import { formatHlc } from '../src/hlc';
import { mergeChange, policyFor, type StoredState } from '../src/policies';
import { PouchReplica, docBytes } from '../src/pouchSync';
import { measureRoundTrip, postgresAvailable } from '../src/postgres';
import { Results, ms } from '../src/results';
import { openRig, openServer, type Rig } from './helpers';

const available = await postgresAvailable();
let rig: Rig | undefined;
const replicas: PouchReplica[] = [];
let root: string | undefined;

afterEach(async () => {
  await rig?.close();
  rig = undefined;
  while (replicas.length > 0) await replicas.pop()?.close();
  if (root) fs.rmSync(root, { recursive: true, force: true });
  root = undefined;
});

/** A row as a change carries it: the repository's row without its concurrency counter. */
function payloadOf(row: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...row };
  delete copy.rowVersion;
  return copy;
}

/** One clock per column, all at the same reading. */
function clockOf(payload: Readonly<Record<string, unknown>>, hlc: string): Record<string, string> {
  const clock: Record<string, string> = {};
  for (const field of Object.keys(payload)) if (field !== 'id') clock[field] = hlc;
  return clock;
}

const SEEDED_AT = formatHlc({ wall: 1_800_000_000_000, counter: 0, device: 'bench-seed' });
const EDITED_AT = formatHlc({ wall: 1_800_000_000_500, counter: 0, device: 'bench-a' });

describe('what a change costs on the wire', () => {
  it('records the bytes of a changed-field envelope, a snapshot and a whole document', async () => {
    const server = await openServer('sqlite');
    const results = new Results('bench-bytes');

    try {
      const byClass: Array<{ entity: EntityName; label: string }> = [
        { entity: 'payment', label: 'append-only (payment)' },
        { entity: 'mark', label: 'cell (mark)' },
        { entity: 'learner', label: 'profile (learner)' },
      ];

      let epoch = Date.parse('2026-10-23T00:00:00.000Z');
      for (const { entity, label } of byClass) {
        const id = server.context.seed.idOf(entity);
        const row = await server.context.repository.get(entity, id);
        if (!row) throw new Error(`the ${entity} fixture is missing`);
        const payload = payloadOf(row as unknown as Record<string, unknown>);

        const create: Envelope = {
          entity,
          id: String(id),
          op: 'create',
          hlc: SEEDED_AT,
          deviceId: 'bench-a',
          fields: Object.keys(payload),
          base: {},
          payload,
        };
        const patch: Envelope = {
          entity,
          id: String(id),
          op: 'update',
          hlc: EDITED_AT,
          deviceId: 'bench-a',
          fields: ['updated_at'],
          base: { updated_at: SEEDED_AT },
          payload: { updated_at: new Date((epoch += 1000)).toISOString() },
        };
        const snapshot: Snapshot = {
          entity,
          id: String(id),
          op: 'update',
          hlc: EDITED_AT,
          deviceId: 'bench-seed',
          payload,
          clock: clockOf(payload, EDITED_AT),
        };

        results
          .add(`${entity}.createEnvelope`, envelopeBytes(create), 'bytes', `${label}, whole row`)
          .add(`${entity}.patchEnvelope`, envelopeBytes(patch), 'bytes', `${label}, one field`)
          .add(`${entity}.snapshot`, snapshotBytes(snapshot), 'bytes', `${label}, whole row plus clocks`)
          .add(`${entity}.row`, Buffer.byteLength(JSON.stringify(payload), 'utf8'), 'bytes', `${label}, the row alone`);
      }

      await server.node.bootstrap();
      const total = await collectBootstrapBytes(server);
      results
        .add('bootstrap.snapshots', total.count, 'count', 'every fixture row, as a pull carries it')
        .add('bootstrap.bytes', total.bytes, 'bytes', 'the whole first pull, uncompressed JSON')
        .add('bootstrap.meanBytes', Math.round(total.bytes / total.count), 'bytes', 'bytes per snapshot');

      results.write();
    } finally {
      await server.close();
    }
  }, 60_000);
});

/**
 * Counts the statements executed through an adapter, transactions included.
 *
 * The adapter core hands every statement to its driver, so counting the driver counts the
 * engine round trips; the Postgres harness runs the same core over a Postgres driver, which
 * is why one counter serves both backends. It reaches the private driver field on purpose:
 * this is a measurement, not product code.
 */
function countStatements(adapter: SqliteAdapter): () => number {
  const holder = adapter as unknown as { driver: Record<string, (...args: unknown[]) => unknown> };
  let total = 0;
  for (const name of ['exec', 'all', 'get', 'run']) {
    const original = holder.driver[name];
    if (typeof original !== 'function') continue;
    holder.driver[name] = function counted(this: unknown, ...args: unknown[]): unknown {
      total += 1;
      return original.apply(this, args);
    };
  }
  return () => total;
}

/** Runs one operation and reports its result, its milliseconds and the driver calls it cost. */
async function counting<T>(
  statements: () => number,
  work: () => Promise<T>
): Promise<{ value: T; millis: number; statements: number }> {
  const before = statements();
  const start = performance.now();
  const value = await work();
  return { value, millis: performance.now() - start, statements: statements() - before };
}

/** Sums the bytes of the snapshots a first pull of a bootstrapped server carries. */
async function collectBootstrapBytes(server: Awaited<ReturnType<typeof openServer>>): Promise<{
  count: number;
  bytes: number;
}> {
  const { snapshots } = await server.node.changesSince(0);
  let bytes = 0;
  for (const snapshot of snapshots) bytes += snapshotBytes(snapshot);
  return { count: snapshots.length, bytes };
}

describe('the canonical candidate on a SQLite server', () => {
  it('measures a local write, a push, a pull and a merge', async () => {
    rig = await openRig('sqlite');
    const server = rig.server;
    // Every statement the server runs is one round trip on a network backend; count them here.
    const serverStatements = countStatements(rig.serverContext.adapter);

    const bootstrap = await counting(serverStatements, () => server.bootstrap());
    const seed = rig.serverContext.seed;

    const a = await rig.device('device-a');
    const b = await rig.device('device-b');
    const bootstrapPull = await counting(serverStatements, () => a.pull(server));
    await b.pull(server);

    const results = new Results('bench-sqlite');

    // A local write: the repository's own transaction plus the outbox entry inside it.
    const writeSamples: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const start = performance.now();
      await a.create('payment', seed.inputFor('payment', { reference: `W-${index}`, external_reference: `X-${index}` }));
      writeSamples.push(performance.now() - start);
    }

    // A push of one change: read the outbox, apply the change on the server, mark it sent.
    // The first push also drains the twenty changes the local-write loop left in the outbox, so
    // the single-change cost is read from the second one.
    const pushSamples: number[] = [];
    let pushStatements = 0;
    for (let index = 0; index < 20; index += 1) {
      await a.create('payment', seed.inputFor('payment', { reference: `P-${index}`, external_reference: `Y-${index}` }));
      const before = serverStatements();
      const start = performance.now();
      await a.push(rig.server);
      pushSamples.push(performance.now() - start);
      if (index === 1) pushStatements = serverStatements() - before;
    }

    // A pull of one change written elsewhere. The first pull also carries the changes this device
    // pushed itself, so again the second one is the clean sample.
    const pullSamples: number[] = [];
    let pullStatements = 0;
    for (let index = 0; index < 20; index += 1) {
      await b.create('payment', seed.inputFor('payment', { reference: `Q-${index}`, external_reference: `Z-${index}` }));
      await b.push(rig.server);
      const before = serverStatements();
      const start = performance.now();
      await a.pull(rig.server);
      pullSamples.push(performance.now() - start);
      if (index === 1) pullStatements = serverStatements() - before;
    }

    // Twenty changes in one push call, and the pull that carries them back: the batch costs.
    for (let index = 0; index < 20; index += 1) {
      await b.create('payment', seed.inputFor('payment', { reference: `B-${index}`, external_reference: `B2-${index}` }));
    }
    const push20 = await counting(serverStatements, () => b.push(server));
    const pull20 = await counting(serverStatements, () => a.pull(server));

    // A merge, with no database in the way: the pure policy over one stored row.
    const stored: StoredState = {
      id: 'bench-learner',
      row: { id: 'bench-learner', given_name: 'Amani', nationality: 'Kenyan' },
      clock: { given_name: SEEDED_AT, nationality: SEEDED_AT },
    };
    const intent: Envelope = {
      entity: 'learner',
      id: 'bench-learner',
      op: 'update',
      hlc: EDITED_AT,
      deviceId: 'bench-b',
      fields: ['given_name'],
      base: { given_name: SEEDED_AT },
      payload: { given_name: 'Amani-B' },
    };
    const policy = policyFor('learner');
    const mergeSamples: number[] = [];
    for (let index = 0; index < 2000; index += 1) {
      const start = performance.now();
      mergeChange(policy, intent, stored);
      mergeSamples.push(performance.now() - start);
    }

    // The same row edited on both devices, pushed in turn: one conflict, measured once.
    const learnerId = seed.idOf('learner');
    const onA = await a.repo.get('learner', learnerId);
    const onB = await b.repo.get('learner', learnerId);
    if (!onA || !onB) throw new Error('the learner fixture did not pull');
    await a.update('learner', learnerId, { given_name: 'Bench-A' }, { expectedVersion: onA.rowVersion });
    await b.update('learner', learnerId, { given_name: 'Bench-B' }, { expectedVersion: onB.rowVersion });
    await a.push(server);
    await b.push(server);
    const conflicts = await server.conflicts();

    results
      .addLatency('localWrite', writeSamples, 'a create through the repository, with its outbox entry')
      .addLatency('pushOneChange', pushSamples, 'one change accepted by the server')
      .addLatency('pullOneChange', pullSamples, 'one changed row pulled and folded in')
      .add('statements.bootstrap', bootstrap.statements, 'count', 'the seeded fixtures written once')
      .add('statements.pullBootstrap', bootstrapPull.statements, 'count', `${bootstrapPull.value.received} rows served to a new device`)
      .add('statements.pushOneChange', pushStatements, 'count', 'statements one accepted change costs')
      .add('statements.pullOneChange', pullStatements, 'count', 'statements one pulled change costs')
      .add('statements.push20', push20.statements, 'count', 'twenty changes in one push call')
      .add('statements.pullBatch20', pull20.statements, 'count', 'twenty changed rows in one pull')
      .add('mergeMeanMicros', round(mean(mergeSamples) * 1000, 2), 'us', 'the pure policy, no database')
      .add('sameFieldConflicts', conflicts.length, 'count', 'two devices editing one field')
      .add('paymentsHeld', (await server.repo.list('payment')).total, 'count', 'seeded plus written');

    results.write();
    expect(conflicts).toHaveLength(1);
    expect(mean(writeSamples)).toBeGreaterThan(0);
  }, 120_000);
});

const postgresSuite = available ? describe : describe.skip;

postgresSuite('the canonical candidate on a Postgres server', () => {
  it('measures a push and a pull against the server, and the round trip it rests on', async () => {
    rig = await openRig('postgres');
    const results = new Results('bench-postgres');
    const serverStatements = countStatements(rig.serverContext.adapter);

    const bootstrap = await counting(serverStatements, () => rig!.server.bootstrap());
    const seed = rig.serverContext.seed;

    const a = await rig.device('device-a');
    const bootstrapPull = await counting(serverStatements, () => a.pull(rig!.server));

    const pushSamples: number[] = [];
    let pushStatements = 0;
    for (let index = 0; index < 20; index += 1) {
      await a.create('payment', seed.inputFor('payment', { reference: `PG-W-${index}`, external_reference: `PG-X-${index}` }));
      const counted = await counting(serverStatements, () => a.push(rig!.server));
      if (index === 0) pushStatements = counted.statements;
      pushSamples.push(counted.millis);
    }

    // A pull of the changes another device made, in one batch.
    const b = await rig.device('device-b');
    await b.pull(rig.server);
    for (let index = 0; index < 20; index += 1) {
      await b.create('payment', seed.inputFor('payment', { reference: `PG-R-${index}`, external_reference: `PG-Y-${index}` }));
    }
    const pushAll = performance.now();
    const pushed = await counting(serverStatements, () => b.push(rig!.server));
    const bulkPush = performance.now() - pushAll;

    const pullAll = performance.now();
    const pulled = await counting(serverStatements, () => a.pull(rig!.server));
    const bulkPull = performance.now() - pullAll;

    const roundTrips = await measureRoundTrip(20);

    results
      .addLatency('pushOneChange', pushSamples, 'one change accepted in its own transaction')
      .addLatency('selectOne', roundTrips, 'the bare round trip the numbers rest on')
      .add('statements.bootstrap', bootstrap.statements, 'count', `${bootstrapPull.value.received + 0} fixture rows served`)
      .add('statements.pullBootstrap', bootstrapPull.statements, 'count', `${bootstrapPull.value.received} rows pulled`)
      .add('statements.pushOneChange', pushStatements, 'count', 'statements one accepted change costs')
      .add('statements.push20', pushed.statements, 'count', 'twenty changes in one push call')
      .add('statements.pullBatch', pulled.statements, 'count', `${pulled.value.received} rows pulled`)
      .add('bulkPush20.p50', ms(bulkPush), 'ms', 'twenty changes through one push call')
      .add('bulkPull20.p50', ms(bulkPull), 'ms', 'twenty changed rows in one pull')
      .add('bulkPull20.snapshots', pulled.value.received, 'count', 'rows actually transferred');

    results.write();
    expect(pulled.value.received).toBeGreaterThanOrEqual(20);
  }, 300_000);
});

describe('the PouchDB candidate', () => {
  it('measures a write, a batch and a replication', async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dr02-bench-'));
    const a = PouchReplica.open(path.join(root, 'a'));
    const b = PouchReplica.open(path.join(root, 'b'));
    replicas.push(a, b);

    const row = (index: number): Record<string, unknown> => ({
      id: `PAY-${index}`,
      reference: `P-${index}`,
      amount: '1500.00',
      currency: 'KES',
      method: 'cash',
      received_at: '2026-10-23T08:00:00.000Z',
      status: 'posted',
    });

    const putSamples: number[] = [];
    let bytes = 0;
    for (let index = 0; index < 50; index += 1) {
      const start = performance.now();
      const doc = await a.create('payment', row(index), SEEDED_AT, 'bench-a');
      putSamples.push(performance.now() - start);
      bytes += docBytes(doc);
    }

    // The first replication carries everything written so far.
    const initialStart = performance.now();
    const replicated = await a.replicateTo(b);
    const initialMillis = performance.now() - initialStart;

    // One batch of twenty against the same twenty documents written singly.
    const batchSamples: number[] = [];
    for (let round = 0; round < 5; round += 1) {
      const docs = [];
      for (let index = 0; index < 20; index += 1) {
        const doc = await a.create('payment', row(1000 + round * 20 + index), SEEDED_AT, 'bench-a');
        docs.push(doc);
      }
      const start = performance.now();
      const written = await a.putMany(docs);
      batchSamples.push(performance.now() - start);
      expect(written).toBe(20);
    }

    const singleSamples: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const start = performance.now();
      await a.create('payment', row(2000 + index), SEEDED_AT, 'bench-a');
      singleSamples.push(performance.now() - start);
    }

    const incremental = await (async () => {
      for (let index = 0; index < 10; index += 1) {
        await a.create('payment', row(3000 + index), SEEDED_AT, 'bench-a');
      }
      const start = performance.now();
      const written = await a.replicateTo(b);
      return { written, millis: performance.now() - start };
    })();

    const rows = await a.allDocs();
    let allBytes = 0;
    for (const doc of rows) allBytes += docBytes(doc);

    const results = new Results('bench-pouch');
    results
      .addLatency('putOneDocument', putSamples, 'one document written on its own')
      .addLatency('put20Singly', singleSamples, 'twenty documents, one call each')
      .addLatency('bulkDocs20', batchSamples, 'twenty documents in one batch')
      .add('replicateInitial.docs', replicated, 'count', 'documents the first replication wrote')
      .add('replicateInitial.p50', ms(initialMillis), 'ms', `${replicated} documents in one replication`)
      .add('replicateIncremental.docs', incremental.written, 'count', 'documents the second replication wrote')
      .add('replicateIncremental.p50', ms(incremental.millis), 'ms', 'everything written since the first replication')
      .add('documentBytes.mean', Math.round(bytes / 50), 'bytes', 'a payment document as the create wrote it')
      .add('documentsHeld', rows.length, 'count', 'documents in the replica')
      .add('documentsBytes', allBytes, 'bytes', 'every document as JSON');

    results.write();
    expect(rows.length).toBe(180);
    expect(replicated).toBe(50);
  }, 120_000);
});

function mean(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((total, value) => total + value, 0) / samples.length;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

// ABOUTME: The sync protocol end to end over real SQLite databases: bootstrap, concurrent edits
// ABOUTME: under each policy, replays, refusals, and what a pull does to the repository's bus.

import { afterEach, describe, expect, it } from 'vitest';

import { ENTITY_NAMES } from '@/domain/schema';
import type { ChangeEvent } from '@/data/repository';

import { formatHlc } from '../hlc';
import type { SyncTransport } from '../node';
import { openRig, pinnedClock, type Rig } from './rig';

let rig: Rig | undefined;

afterEach(async () => {
  await rig?.close();
  rig = undefined;
});

/** A rig whose server has materialised its change log from the seeded fixtures. */
async function bootstrapRig(): Promise<Rig> {
  rig = await openRig();
  await rig.server.bootstrap();
  return rig;
}

describe('a device bootstraps from the server', () => {
  it('pulls every seeded row, under the ids the server holds', async () => {
    const opened = await bootstrapRig();
    const served = await opened.server.bootstrap();
    // A second bootstrap finds a change for every row and seeds nothing again.
    expect(served).toBe(0);

    const device = await opened.device('device-a');
    const summary = await device.pull(opened.server);

    expect(summary.received).toBe(ENTITY_NAMES.length);
    expect(summary.applied).toBe(ENTITY_NAMES.length);
    expect(summary.failed).toBe(0);

    const learnerId = opened.serverContext.seed.idOf('learner');
    const onServer = await opened.server.repo.get('learner', learnerId);
    const onDevice = await device.repo.get('learner', learnerId);

    expect(onDevice).not.toBeNull();
    expect(onDevice?.given_name).toBe(onServer?.given_name);
    expect((await device.repo.list('mark')).total).toBe(1);
  });

  it('pulls nothing the second time, because the cursor moved', async () => {
    const opened = await bootstrapRig();
    const device = await opened.device('device-a');

    const first = await device.pull(opened.server);
    const second = await device.pull(opened.server);

    expect(first.received).toBeGreaterThan(0);
    expect(second.received).toBe(0);
    expect(second.applied).toBe(0);
    expect(second.cursor).toBe(first.cursor);
  });
});

describe('two devices editing while offline', () => {
  it('keeps both payments, because an append-only event has no row to collide on', async () => {
    const opened = await bootstrapRig();
    const a = await opened.device('device-a');
    const b = await opened.device('device-b');
    await a.pull(opened.server);
    await b.pull(opened.server);

    const seed = opened.serverContext.seed;
    await a.create('payment', seed.inputFor('payment', { reference: 'A-1' }));
    await b.create('payment', seed.inputFor('payment', { reference: 'B-1' }));

    const pushedByA = await a.push(opened.server);
    const pushedByB = await b.push(opened.server);

    expect(pushedByA.outcomes).toEqual({ insert: 1 });
    expect(pushedByB.outcomes).toEqual({ insert: 1 });
    expect((await opened.server.repo.list('payment')).total).toBe(3);
    expect(await opened.server.conflicts()).toHaveLength(0);

    await a.pull(opened.server);
    await b.pull(opened.server);
    expect((await a.repo.list('payment')).total).toBe(3);
    expect((await b.repo.list('payment')).total).toBe(3);
  });

  it('merges edits to different profile fields without a conflict', async () => {
    const opened = await bootstrapRig();
    const a = await opened.device('device-a');
    const b = await opened.device('device-b');
    await a.pull(opened.server);
    await b.pull(opened.server);

    const learnerId = opened.serverContext.seed.idOf('learner');
    const onA = await a.repo.get('learner', learnerId);
    const onB = await b.repo.get('learner', learnerId);
    if (!onA || !onB) throw new Error('the learner fixture did not pull');

    await a.update('learner', learnerId, { given_name: 'Amani-A' }, { expectedVersion: onA.rowVersion });
    await b.update('learner', learnerId, { nationality: 'Ugandan' }, { expectedVersion: onB.rowVersion });

    await a.push(opened.server);
    await b.push(opened.server);

    expect(await opened.server.conflicts()).toHaveLength(0);
    const merged = await opened.server.repo.get('learner', learnerId);
    expect(merged?.given_name).toBe('Amani-A');
    expect(merged?.nationality).toBe('Ugandan');

    await a.pull(opened.server);
    await b.pull(opened.server);
    expect((await a.repo.get('learner', learnerId))?.nationality).toBe('Ugandan');
    expect((await b.repo.get('learner', learnerId))?.given_name).toBe('Amani-A');
  });

  it('resolves one field edited on both devices by the later clock and records the conflict', async () => {
    rig = await openRig();
    await rig.server.bootstrap();

    // The clocks are pinned apart, so the later write is device-b by construction.
    const a = await rig.device('device-a', { clock: pinnedClock('device-a') });
    const b = await rig.device('device-b', { clock: pinnedClock('device-b', 1_800_000_001_000) });
    await a.pull(rig.server);
    await b.pull(rig.server);

    const learnerId = rig.serverContext.seed.idOf('learner');
    const onA = await a.repo.get('learner', learnerId);
    const onB = await b.repo.get('learner', learnerId);
    if (!onA || !onB) throw new Error('the learner fixture did not pull');

    await a.update('learner', learnerId, { given_name: 'From-A' }, { expectedVersion: onA.rowVersion });
    await b.update('learner', learnerId, { given_name: 'From-B' }, { expectedVersion: onB.rowVersion });

    await a.push(rig.server);
    await b.push(rig.server);

    const conflicts = await rig.server.conflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      entity: 'learner',
      entityId: learnerId,
      policy: 'field_lww',
      kind: 'field',
      field: 'given_name',
      winner: 'device-b',
      loser: 'device-a',
    });
    expect((await rig.server.repo.get('learner', learnerId))?.given_name).toBe('From-B');

    await a.pull(rig.server);
    await b.pull(rig.server);
    expect((await a.repo.get('learner', learnerId))?.given_name).toBe('From-B');
    expect((await b.repo.get('learner', learnerId))?.given_name).toBe('From-B');
  });

  it('folds one mark cell written on two devices into the id that landed first', async () => {
    rig = await openRig();
    const seed = rig.serverContext.seed;

    // A second component gives the new mark a cell of its own, apart from the seeded fixture.
    const component = await rig.server.repo.create(
      'component',
      seed.inputFor('component', { code: 'P2', name: 'Paper 2' })
    );
    await rig.server.bootstrap();

    const a = await rig.device('device-a', { clock: pinnedClock('device-a') });
    const b = await rig.device('device-b', { clock: pinnedClock('device-b', 1_800_000_001_000) });
    await a.pull(rig.server);
    await b.pull(rig.server);

    const input = seed.inputFor('mark', { component_id: component.id });
    const writtenByA = await a.create('mark', { ...input, score: '51' });
    const writtenByB = await b.create('mark', { ...input, score: '61' });
    expect(writtenByA.row.id).not.toBe(writtenByB.row.id);

    await a.push(rig.server);
    await b.push(rig.server);

    const onServer = await rig.server.repo.list('mark', { where: { component_id: component.id } });
    expect(onServer.total).toBe(1);
    expect(onServer.items[0]?.id).toBe(writtenByA.row.id);
    expect(onServer.items[0]?.score).toBe('61');

    const conflicts = await rig.server.conflicts();
    expect(conflicts.some((note) => note.kind === 'cell_identity')).toBe(true);

    await b.pull(rig.server);
    await a.pull(rig.server);

    const onB = await b.repo.list('mark', { where: { component_id: component.id } });
    const onA = await a.repo.list('mark', { where: { component_id: component.id } });
    expect(onB.total).toBe(1);
    expect(onA.total).toBe(1);
    expect(onB.items[0]?.id).toBe(writtenByA.row.id);
    expect(onA.items[0]?.id).toBe(writtenByA.row.id);
  });
});

describe('what the server refuses', () => {
  it('rejects an edit of a posted payment, keeps the row, and logs the refusal', async () => {
    const opened = await bootstrapRig();
    const paymentId = opened.serverContext.seed.idOf('payment');
    const payment = await opened.server.repo.get('payment', paymentId);
    if (!payment) throw new Error('the payment fixture is missing');

    const clock = await opened.server.store.rowClock(opened.server.database, 'payment', paymentId);
    const tampered = { ...payment } as Record<string, unknown>;
    delete tampered.rowVersion;
    tampered.reference = 'TAMPERED';

    // A forged clock far ahead of the server's, so the merge accepts the field and the guard,
    // not the clock comparison, is what refuses it.
    const forged = formatHlc({ wall: 9_000_000_000_000_000, counter: 0, device: 'rogue' });

    const result = await opened.server.accept({
      entity: 'payment',
      id: paymentId,
      op: 'update',
      hlc: forged,
      deviceId: 'rogue',
      fields: ['reference'],
      base: { reference: clock.reference ?? '' },
      payload: tampered,
    });

    expect(result.status).toBe('rejected');
    expect(result.error).toContain('finance.posted_immutable');
    expect((await opened.server.repo.get('payment', paymentId))?.reference).toBe(payment.reference);

    const rejected = await opened.server.database.all<{ error: string }>(
      'SELECT "error" FROM "sync_reject"'
    );
    expect(rejected).toHaveLength(1);

    const conflicts = await opened.server.conflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      entity: 'payment',
      entityId: paymentId,
      kind: 'unresolved',
      loser: 'rogue',
    });
    expect(conflicts[0]?.detail).toContain('finance.posted_immutable');
  });

  it('treats a re-delivered change as a replay, not a second write', async () => {
    const opened = await bootstrapRig();
    const a = await opened.device('device-a');
    await a.pull(opened.server);

    await a.create(
      'payment',
      opened.serverContext.seed.inputFor('payment', { reference: 'REPLAY-1' })
    );
    const pending = await a.store.unsent();
    expect(pending).toHaveLength(1);
    const envelope = pending[0]?.envelope;
    if (!envelope) throw new Error('the create queued no change');

    const first = await opened.server.accept(envelope);
    const second = await opened.server.accept(envelope);

    expect(first.status).toBe('insert');
    expect(second.status).toBe('replay');
    expect((await opened.server.repo.list('payment')).total).toBe(2);
  });

  it('logs a refusal on the device that pushed it, and does not keep retrying', async () => {
    const opened = await bootstrapRig();
    const device = await opened.device('device-a');
    await device.pull(opened.server);

    await device.create(
      'payment',
      opened.serverContext.seed.inputFor('payment', { reference: 'REFUSED-1' })
    );

    const refusing: SyncTransport = {
      push: async (changes) =>
        changes.map((change) => ({
          status: 'rejected' as const,
          id: change.id,
          fields: [],
          conflicts: [],
          error: 'the server refused it',
        })),
      pull: async () => ({ snapshots: [], cursor: 0 }),
    };

    const summary = await device.push(refusing);

    expect(summary.outcomes).toEqual({ rejected: 1 });
    expect(summary.rejected).toHaveLength(1);

    const conflicts = await device.conflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      entity: 'payment',
      policy: 'server',
      kind: 'unresolved',
      detail: 'the server refused it',
    });

    // A permanent refusal is not retried forever: it would block every later change behind it.
    expect(await device.store.outboxDepth()).toBe(0);
  });
});

describe('a pull and the repository', () => {
  it('announces every applied row, so a live query refreshes for a pulled write', async () => {
    rig = await openRig();
    await rig.server.bootstrap();
    const device = await rig.device('device-a');

    const events: ChangeEvent[] = [];
    const unsubscribe = device.repo.subscribe((event) => events.push(event));

    let payloads = 0;
    const unwatch = device.repo.watch('learner', () => {
      payloads += 1;
    });
    await device.repo.whenIdle();
    expect(payloads).toBe(1);

    const summary = await device.pull(rig.server);
    await device.repo.whenIdle();

    expect(events).toHaveLength(summary.applied);
    expect(events.every((event) => event.origin === 'sync')).toBe(true);
    expect(events.some((event) => event.entity === 'learner' && event.type === 'create')).toBe(true);
    expect(payloads).toBe(2);

    unwatch();
    unsubscribe();
  });
});

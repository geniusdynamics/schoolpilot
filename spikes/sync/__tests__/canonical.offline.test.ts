// ABOUTME: The canonical candidate under offline edits: bootstrap, concurrent creates, field and
// ABOUTME: cell merges, replays, guard rejections, and what a pull does to the repository's bus.

import { afterEach, describe, expect, it } from 'vitest';

import { ENTITY_NAMES } from '@/domain/schema';
import { RepositoryConflictError } from '@/data/repository';

import { formatHlc } from '../src/hlc';
import { openRig, pinnedClock, type Rig } from './helpers';

let rig: Rig | undefined;

afterEach(async () => {
  await rig?.close();
  rig = undefined;
});

async function bootstrapRig(): Promise<Rig> {
  rig = await openRig('sqlite');
  await rig.server.bootstrap();
  return rig;
}

describe('a device bootstraps from the server', () => {
  it('pulls every seeded row, with the same ids the server holds', async () => {
    const opened = await bootstrapRig();
    const device = await opened.device('device-a');

    const summary = await device.pull(opened.server);
    expect(summary.received).toBe(ENTITY_NAMES.length);
    expect(summary.applied).toBe(ENTITY_NAMES.length);

    const learnerId = opened.serverContext.seed.idOf('learner');
    const serverLearner = await opened.server.repo.get('learner', learnerId);
    const deviceLearner = await device.repo.get('learner', learnerId);

    expect(deviceLearner).not.toBeNull();
    expect(deviceLearner?.given_name).toBe(serverLearner?.given_name);
    expect((await device.repo.list('mark')).total).toBe(1);
  });

  it('pulls nothing the second time, because the cursor moved', async () => {
    const opened = await bootstrapRig();
    const device = await opened.device('device-a');

    await device.pull(opened.server);
    const second = await device.pull(opened.server);

    expect(second.received).toBe(0);
    expect(second.applied).toBe(0);
  });
});

describe('offline writes', () => {
  it('keeps two devices payments, because an append-only entity has no row to collide on', async () => {
    const opened = await bootstrapRig();
    const a = await opened.device('device-a');
    const b = await opened.device('device-b');
    await a.pull(opened.server);
    await b.pull(opened.server);

    const seed = opened.serverContext.seed;
    await a.create('payment', seed.inputFor('payment', { reference: 'A-1', external_reference: 'EXT-A' }));
    await b.create('payment', seed.inputFor('payment', { reference: 'B-1', external_reference: 'EXT-B' }));

    await a.push(opened.server);
    await b.push(opened.server);

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
    rig = await openRig('sqlite');
    await rig.server.bootstrap();

    // The two clocks are pinned apart, so the later write is device-b by construction.
    const a = await rig.device('device-a', pinnedClock('device-a'));
    const b = await rig.device('device-b', pinnedClock('device-b', 4_000_000_001_000));
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
    expect(conflicts[0]).toMatchObject({ entity: 'learner', field: 'given_name', kind: 'field' });
    expect((await rig.server.repo.get('learner', learnerId))?.given_name).toBe('From-B');

    await a.pull(rig.server);
    await b.pull(rig.server);
    expect((await a.repo.get('learner', learnerId))?.given_name).toBe('From-B');
    expect((await b.repo.get('learner', learnerId))?.given_name).toBe('From-B');
  });
});

describe('a mark cell written on two devices', () => {
  it('lands as one row on the server and on both devices', async () => {
    rig = await openRig('sqlite');
    const seed = rig.serverContext.seed;

    // A second component gives the new mark a cell of its own, apart from the seeded fixture.
    const component = await rig.server.repo.create(
      'component',
      seed.inputFor('component', { code: 'P2', name: 'Paper 2' })
    );
    await rig.server.bootstrap();

    const a = await rig.device('device-a', pinnedClock('device-a'));
    const b = await rig.device('device-b', pinnedClock('device-b', 4_000_000_001_000));
    await a.pull(rig.server);
    await b.pull(rig.server);

    const input = seed.inputFor('mark', { component_id: component.id });
    const writtenByA = await a.create('mark', { ...input, score: '51' });
    const writtenByB = await b.create('mark', { ...input, score: '61' });
    expect(writtenByA.row.id).not.toBe(writtenByB.row.id);

    await a.push(rig.server);
    await b.push(rig.server);

    const onServer = await rig.server.repo.list('mark', {
      where: { component_id: component.id },
    });
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
  it('rejects an edit of a posted payment and leaves the row alone', async () => {
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
      base: { reference: clock['reference'] ?? '' },
      payload: tampered,
    });

    expect(result.status).toBe('rejected');
    expect(result.error).toContain('finance.posted_immutable');
    expect((await opened.server.repo.get('payment', paymentId))?.reference).toBe(payment.reference);

    const rejected = await opened.server.database.all<{ error: string }>(
      'SELECT "error" FROM "sync_reject"'
    );
    expect(rejected).toHaveLength(1);
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
});

describe('local concurrency after a pull', () => {
  it('fails a write whose expected version the pull moved on', async () => {
    const opened = await bootstrapRig();
    const a = await opened.device('device-a');
    const b = await opened.device('device-b');
    await a.pull(opened.server);
    await b.pull(opened.server);

    const learnerId = opened.serverContext.seed.idOf('learner');
    const stale = await a.repo.get('learner', learnerId);
    const onB = await b.repo.get('learner', learnerId);
    if (!stale || !onB) throw new Error('the learner fixture did not pull');

    await b.update('learner', learnerId, { given_name: 'From-B' }, { expectedVersion: onB.rowVersion });
    await b.push(opened.server);
    await a.pull(opened.server);

    const movedOn = await a.repo.get('learner', learnerId);
    expect(movedOn?.rowVersion).not.toBe(stale.rowVersion);

    await expect(
      a.repo.update('learner', learnerId, { given_name: 'Stale' }, { expectedVersion: stale.rowVersion })
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });
});

describe('a pull and the repository bus', () => {
  it('does not fire a watch, and leaves the commit counter behind the audit trail', async () => {
    rig = await openRig('sqlite');
    const seed = rig.serverContext.seed;

    // A component of its own, so the mark written below needs no cell the fixtures hold.
    const component = await rig.server.repo.create(
      'component',
      seed.inputFor('component', { code: 'P3', name: 'Paper 3' })
    );
    const served = await rig.server.bootstrap();
    expect(served).toBe(ENTITY_NAMES.length + 1);

    const a = await rig.device('device-a');

    let payloads = 0;
    const unwatch = a.repo.watch('mark', () => {
      payloads += 1;
    });
    await a.repo.whenIdle();
    expect(payloads).toBe(1);

    await a.pull(rig.server);
    await a.repo.whenIdle();
    expect(payloads).toBe(1);

    const audit = await a.database.get<{ max: number | null }>(
      'SELECT MAX("commit_sequence") AS max FROM "audit_event"'
    );
    expect(Number(audit?.max)).toBe(served);
    // The pull wrote one audit row per served row; the repository still believes nothing was numbered.
    expect(a.repo.currentCommitSequence).toBe(0);

    await a.create('mark', seed.inputFor('mark', { component_id: component.id }));
    await a.repo.whenIdle();

    expect(payloads).toBe(2);
    expect(a.repo.currentCommitSequence).toBe(1);

    const reused = await a.database.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM "audit_event" WHERE "commit_sequence" = 1'
    );
    expect(Number(reused?.count)).toBe(2);

    unwatch();
  });
});

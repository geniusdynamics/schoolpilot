// ABOUTME: The canonical candidate on Postgres: the same bootstrap, offline writes and merges the
// ABOUTME: SQLite suite proves, run against a real server so the portability claim is measured.

import { afterEach, describe, expect, it } from 'vitest';

import { ENTITY_NAMES } from '@/domain/schema';

import { postgresAvailable } from '../src/postgres';
import { openRig, type Rig } from './helpers';

const available = await postgresAvailable();

let rig: Rig | undefined;

// A Postgres context builds 68 tables and closes a pool, so the suite gets a budget well
// past the repo default of 20s; it is the engine being measured, not the code under test.
const SUITE_TIMEOUT_MS = 180_000;

afterEach(async () => {
  await rig?.close();
  rig = undefined;
}, SUITE_TIMEOUT_MS);

const suite = available ? describe : describe.skip;

suite('the canonical server on Postgres', { timeout: SUITE_TIMEOUT_MS }, () => {
  it('bootstraps every fixture into the change log and serves it to a SQLite device', async () => {
    rig = await openRig('postgres');
    const served = await rig.server.bootstrap();
    expect(served).toBe(ENTITY_NAMES.length);

    const device = await rig.device('device-a');
    const summary = await device.pull(rig.server);
    expect(summary.received).toBe(served);
    expect(summary.applied).toBe(served);

    let serverRows = 0;
    let deviceRows = 0;
    for (const entity of ENTITY_NAMES) {
      serverRows += (await rig.server.repo.list(entity)).total;
      deviceRows += (await device.repo.list(entity)).total;
    }
    expect(serverRows).toBe(served);
    expect(deviceRows).toBe(served);

    const learnerId = rig.serverContext.seed.idOf('learner');
    const onServer = await rig.server.repo.get('learner', learnerId);
    const onDevice = await device.repo.get('learner', learnerId);
    expect(onDevice?.given_name).toBe(onServer?.given_name);
    expect((await device.repo.list('mark')).total).toBe(1);
  });

  it('holds two devices’ offline payments, because an append-only entity has no row to collide on', async () => {
    rig = await openRig('postgres');
    await rig.server.bootstrap();

    const a = await rig.device('device-a');
    const b = await rig.device('device-b');
    await a.pull(rig.server);
    await b.pull(rig.server);

    const seed = rig.serverContext.seed;
    await a.create('payment', seed.inputFor('payment', { reference: 'PG-A', external_reference: 'EXT-A' }));
    await b.create('payment', seed.inputFor('payment', { reference: 'PG-B', external_reference: 'EXT-B' }));

    const pushed = await a.push(rig.server);
    await b.push(rig.server);
    expect(pushed.rejected).toHaveLength(0);
    expect((await rig.server.repo.list('payment')).total).toBe(3);
    expect(await rig.server.conflicts()).toHaveLength(0);

    await a.pull(rig.server);
    await b.pull(rig.server);
    expect((await a.repo.list('payment')).total).toBe(3);
    expect((await b.repo.list('payment')).total).toBe(3);
  });

  it('merges two devices’ edits of different profile fields without a conflict', async () => {
    rig = await openRig('postgres');
    await rig.server.bootstrap();

    const a = await rig.device('device-a');
    const b = await rig.device('device-b');
    await a.pull(rig.server);
    await b.pull(rig.server);

    const learnerId = rig.serverContext.seed.idOf('learner');
    const onA = await a.repo.get('learner', learnerId);
    const onB = await b.repo.get('learner', learnerId);
    if (!onA || !onB) throw new Error('the learner fixture did not pull');

    await a.update('learner', learnerId, { given_name: 'Amani-PG' }, { expectedVersion: onA.rowVersion });
    await b.update('learner', learnerId, { nationality: 'Ugandan' }, { expectedVersion: onB.rowVersion });
    await a.push(rig.server);
    await b.push(rig.server);

    expect(await rig.server.conflicts()).toHaveLength(0);
    const merged = await rig.server.repo.get('learner', learnerId);
    expect(merged?.given_name).toBe('Amani-PG');
    expect(merged?.nationality).toBe('Ugandan');

    await a.pull(rig.server);
    await b.pull(rig.server);
    expect((await b.repo.get('learner', learnerId))?.given_name).toBe('Amani-PG');
    expect((await a.repo.get('learner', learnerId))?.nationality).toBe('Ugandan');
  });

  it('treats a re-delivered change as a replay, not a second row', async () => {
    rig = await openRig('postgres');
    await rig.server.bootstrap();

    const a = await rig.device('device-a');
    await a.pull(rig.server);
    await a.create('payment', rig.serverContext.seed.inputFor('payment', { reference: 'PG-REPLAY' }));

    const pending = await a.store.unsent();
    const envelope = pending[0]?.envelope;
    if (!envelope) throw new Error('the create queued no change');

    expect((await rig.server.accept(envelope)).status).toBe('insert');
    expect((await rig.server.accept(envelope)).status).toBe('replay');
    expect((await rig.server.repo.list('payment')).total).toBe(2);
  });

  it('rejects an edit of a posted payment with the repository’s own guard', async () => {
    rig = await openRig('postgres');
    await rig.server.bootstrap();

    const paymentId = rig.serverContext.seed.idOf('payment');
    const payment = await rig.server.repo.get('payment', paymentId);
    if (!payment) throw new Error('the payment fixture is missing');
    const clock = await rig.server.store.rowClock(rig.server.database, 'payment', paymentId);

    const tampered = { ...payment } as Record<string, unknown>;
    delete tampered.rowVersion;
    tampered.reference = 'TAMPERED-PG';

    const result = await rig.server.accept({
      entity: 'payment',
      id: paymentId,
      op: 'update',
      hlc: '9000000000000000:000000:rogue',
      deviceId: 'rogue',
      fields: ['reference'],
      base: { reference: clock['reference'] ?? '' },
      payload: tampered,
    });

    expect(result.status).toBe('rejected');
    expect(result.error).toContain('finance.posted_immutable');
    expect((await rig.server.repo.get('payment', paymentId))?.reference).toBe(payment.reference);
  });
});

// ABOUTME: The conflict log as the settings page reads it: an empty database reads as an empty
// ABOUTME: log, a recorded refusal comes back with its detail, and the summary counts it.

import { afterEach, describe, expect, it } from 'vitest';

import { createTestContext, type TestContext } from '@/data/__tests__/harness';

import { readSyncConflicts, summariseConflicts } from '../conflicts';
import type { SyncTransport } from '../node';
import type { SyncConflict } from '../conflicts';
import { openRig, type Rig } from './rig';

let context: TestContext | undefined;
let rig: Rig | undefined;

afterEach(async () => {
  await rig?.close();
  rig = undefined;
  await context?.close();
  context = undefined;
});

describe('reading the conflict log', () => {
  it('answers an empty log on a database that has never synced', async () => {
    context = await createTestContext({ seed: false });
    await expect(readSyncConflicts(context.adapter)).resolves.toEqual([]);
  });

  it('reads back the refusal a device recorded, with the detail', async () => {
    rig = await openRig();
    await rig.server.bootstrap();
    const device = await rig.device('device-a');
    await device.pull(rig.server.transport());

    await device.create(
      'payment',
      rig.serverContext.seed.inputFor('payment', { reference: 'LOGGED-1' })
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
    await device.push(refusing);

    const conflicts = await readSyncConflicts(device.database);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      entity: 'payment',
      policy: 'server',
      kind: 'unresolved',
      field: '*',
      detail: 'the server refused it',
    });
    expect(typeof conflicts[0]?.detectedAt).toBe('string');
    expect(typeof conflicts[0]?.id).toBe('string');
  });
});

describe('summarising the conflict log', () => {
  const conflict = (
    entity: SyncConflict['entity'],
    kind: SyncConflict['kind'],
    id: string
  ): SyncConflict => ({
    id,
    entity,
    entityId: `row-${id}`,
    policy: 'field_lww',
    kind,
    field: 'given_name',
    winner: 'device-b',
    loser: 'device-a',
    winnerHlc: '',
    loserHlc: '',
    resolved: 'last writer wins',
    detectedAt: '2027-01-01T00:00:00.000Z',
  });

  it('counts the total, the unresolved and where they cluster', () => {
    const summary = summariseConflicts([
      conflict('learner', 'field', '1'),
      conflict('learner', 'field', '2'),
      conflict('mark', 'cell_identity', '3'),
      conflict('payment', 'unresolved', '4'),
    ]);

    expect(summary.total).toBe(4);
    expect(summary.unresolved).toBe(1);
    expect(summary.byEntity).toEqual([
      { entity: 'learner', count: 2 },
      { entity: 'mark', count: 1 },
      { entity: 'payment', count: 1 },
    ]);
  });

  it('summarises an empty log without inventing anything', () => {
    expect(summariseConflicts([])).toEqual({ total: 0, unresolved: 0, byEntity: [] });
  });
});

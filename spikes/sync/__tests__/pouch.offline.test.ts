// ABOUTME: The PouchDB candidate under offline edits: whole-document conflicts, the resolution
// ABOUTME: that has to be written by hand, cell identity, atomicity and the bytes a change costs.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { Envelope } from '../src/envelope';
import { envelopeBytes } from '../src/envelope';
import { deviceOf, formatHlc } from '../src/hlc';
import { PouchReplica, docBytes, docId } from '../src/pouchSync';
import { Results } from '../src/results';

/** The clock the row was created at; both devices have seen it before they edit. */
const CREATED = formatHlc({ wall: 1_800_000_000_000, counter: 0, device: 'device-seed' });
/** The clock of device-a's edit. */
const EARLY = formatHlc({ wall: 1_800_000_000_500, counter: 0, device: 'device-a' });
/** The clock of device-b's edit, the later of the two. */
const LATE = formatHlc({ wall: 1_800_000_001_000, counter: 0, device: 'device-b' });

const opened: PouchReplica[] = [];
let root: string | undefined;

// LevelDB in a temp directory on a loaded machine: replication and compaction run well past
// the repo's 20s default, so the suite sets its own budget.
const SUITE_TIMEOUT_MS = 120_000;
const REPLICATION_TIMEOUT_MS = 300_000;

/** A pair of replicas in fresh directories, destroyed when the test ends. */
async function pair(): Promise<{ a: PouchReplica; b: PouchReplica }> {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'dr02-pouch-'));
  const a = PouchReplica.open(path.join(root, 'device-a'));
  const b = PouchReplica.open(path.join(root, 'device-b'));
  opened.push(a, b);
  return { a, b };
}

afterEach(async () => {
  while (opened.length > 0) await opened.pop()?.close();
  if (root) fs.rmSync(root, { recursive: true, force: true });
  root = undefined;
}, REPLICATION_TIMEOUT_MS);

/** A learner row in the shape the canonical schema stores. */
function learner(id: string): Record<string, unknown> {
  return {
    id,
    given_name: 'Amani',
    family_name: 'Okello',
    sex: 'female',
    date_of_birth: '2011-04-02',
    nationality: 'Kenyan',
  };
}

describe('the unit of conflict is the document', { timeout: SUITE_TIMEOUT_MS }, () => {
  it('keeps a conflict even when the two edits touched different fields', async () => {
    const { a, b } = await pair();
    await a.create('learner', learner('L-1'), CREATED, 'device-a');
    await a.replicateTo(b);

    await a.update('learner', 'L-1', { given_name: 'From-A' }, EARLY, 'device-a');
    await b.update('learner', 'L-1', { nationality: 'Ugandan' }, LATE, 'device-b');
    await a.replicateTo(b);
    await b.replicateFrom(a).catch(() => 0);
    await b.replicateTo(a);

    const onA = await a.conflicted('learner', 'L-1');
    const onB = await b.conflicted('learner', 'L-1');
    expect(onA).toHaveLength(2);
    expect(onB).toHaveLength(2);

    // Neither revision is the answer: the winner holds one edit and the loser the other, and
    // the database has no way to say they are not a contradiction.
    const states = onA
      .map((doc) => `${String(doc.payload.given_name)}/${String(doc.payload.nationality)}`)
      .sort();
    expect(states).toEqual(['Amani/Ugandan', 'From-A/Kenyan']);
    expect(new Set(onA.map((doc) => doc._rev)).size).toBe(2);
  });

  it('only converges once the policy has been applied on top of the library', async () => {
    const { a, b } = await pair();
    await a.create('learner', learner('L-1'), CREATED, 'device-a');
    await a.replicateTo(b);

    await a.update('learner', 'L-1', { given_name: 'From-A' }, EARLY, 'device-a');
    await b.update('learner', 'L-1', { nationality: 'Ugandan' }, LATE, 'device-b');
    await a.replicateTo(b);
    await b.replicateTo(a);

    const resolution = await a.resolveWithPolicy('learner', 'L-1');
    expect(resolution).not.toBeNull();
    expect(resolution?.conflicts).toHaveLength(0);
    expect(resolution?.merged.payload.given_name).toBe('From-A');
    expect(resolution?.merged.payload.nationality).toBe('Ugandan');
    expect(resolution?.discarded).toHaveLength(1);

    await a.replicateTo(b);
    await a.replicateFrom(b).catch(() => 0);

    const onA = await a.get('learner', 'L-1');
    const onB = await b.get('learner', 'L-1');
    expect(onA?.payload).toEqual(onB?.payload);
    expect(onA?.payload.given_name).toBe('From-A');
    expect(onA?.payload.nationality).toBe('Ugandan');
    expect(await a.conflicted('learner', 'L-1')).toHaveLength(1);
    expect(await b.conflicted('learner', 'L-1')).toHaveLength(1);
  });

  it('records the same-field conflict with the shared policy, not with the library', async () => {
    const { a, b } = await pair();
    await a.create('learner', learner('L-1'), CREATED, 'device-a');
    await a.replicateTo(b);

    await a.update('learner', 'L-1', { given_name: 'From-A' }, EARLY, 'device-a');
    await b.update('learner', 'L-1', { given_name: 'From-B' }, LATE, 'device-b');
    await a.replicateTo(b);
    await b.replicateTo(a);

    const resolution = await a.resolveWithPolicy('learner', 'L-1');
    expect(resolution?.conflicts).toHaveLength(1);
    expect(resolution?.conflicts[0]).toMatchObject({ field: 'given_name', kind: 'field' });
    expect(resolution?.merged.payload.given_name).toBe('From-B');
    expect(resolution?.merged.clock.given_name).toBe(LATE);
  });
});

describe('the library chooses a winner by revision, not by clock', { timeout: REPLICATION_TIMEOUT_MS }, () => {
  it('disagrees with the later clock in a measurable share of concurrent edits', async () => {
    const { a, b } = await pair();
    const trials = 100;

    for (let index = 0; index < trials; index += 1) {
      const id = `L-${index}`;
      await a.create('learner', learner(id), EARLY, 'device-a');
      await b.create('learner', learner(id), LATE, 'device-b');
    }

    await a.replicateTo(b);
    await b.replicateTo(a);

    let conflicts = 0;
    let agrees = 0;

    for (let index = 0; index < trials; index += 1) {
      const id = `L-${index}`;
      const revisions = await a.conflicted('learner', id);
      if (revisions.length < 2) continue;
      conflicts += 1;

      const winner = revisions[0];
      if (!winner) continue;
      if (deviceOf(winner.hlc) === 'device-b') agrees += 1;
    }

    expect(conflicts).toBe(trials);
    // Documented rather than assumed: PouchDB's winner is the revision tree's, so a resolution
    // written on top of it has to re-litigate every field of every conflicted document.
    expect(agrees).toBeLessThan(trials);

    const results = new Results('pouch-conflicts');
    results
      .add('trials', trials, 'count', 'the same row created offline on two replicas')
      .add('conflicts', conflicts, 'count', 'documents PouchDB kept two revisions of')
      .add('winnerAgreesWithHlc', agrees, 'count', 'the winning revision is the later clock')
      .add('winnerDisagreesWithHlc', conflicts - agrees, 'count', 'the winning revision is the earlier clock')
      .add('winnerAgreementRate', Math.round((agrees / trials) * 1000) / 1000, 'ratio');
    results.write();
  });
});

describe('cell identity', { timeout: SUITE_TIMEOUT_MS }, () => {
  it('leaves a mark entered twice as two documents, which no merge removes', async () => {
    const { a, b } = await pair();
    const cell = {
      assessment_id: 'AS-1',
      enrolment_id: 'EN-1',
      learning_area_id: 'LA-1',
      component_id: 'CO-1',
    };

    await a.create('mark', { id: 'MK-A', ...cell, score: '51' }, EARLY, 'device-a');
    await b.create('mark', { id: 'MK-B', ...cell, score: '61' }, LATE, 'device-b');
    await a.replicateTo(b);
    await b.replicateTo(a);

    expect(await a.count()).toBe(2);
    expect(await b.count()).toBe(2);
    expect(await a.withCell('mark', cell)).toHaveLength(2);
    expect(await a.conflicted('mark', 'MK-A')).toHaveLength(1);

    // The ids are distinct documents, so there is nothing for the library to flag and nothing
    // for a resolution pass to fold: the divergence survives replication untouched.
    const onB = await b.withCell('mark', cell);
    expect(onB.map((doc) => doc.rowId).sort()).toEqual(['MK-A', 'MK-B']);
  });
});

describe('a batch is not a transaction', { timeout: SUITE_TIMEOUT_MS }, () => {
  it('writes the valid documents of a batch that contains one stale revision', async () => {
    const { a } = await pair();
    const good = await a.create('learner', learner('L-1'), CREATED, 'device-a');
    const stale = await a.create('learner', learner('L-2'), CREATED, 'device-a');
    await a.update('learner', 'L-2', { nationality: 'Ugandan' }, LATE, 'device-b');

    // A revision the row has moved past: the batch's second document cannot be applied.
    const bad = {
      ...stale,
      payload: { ...learner('L-2'), given_name: 'Rewritten' },
    };

    const responses = await a.bulkPut([good, bad]);
    expect(responses).toHaveLength(2);
    expect(responses[0]?.ok).toBe(true);
    expect(responses[1]?.error).toBe('conflict');

    // The first document of the batch landed, the second did not: a partial apply, which the
    // canonical server's single `acceptBatch` transaction cannot produce.
    const survivor = await a.get('learner', 'L-1');
    expect(survivor).not.toBeNull();
    expect((await a.get('learner', 'L-2'))?.payload.given_name).toBe('Amani');
  });
});

describe('what a change costs on the wire', { timeout: SUITE_TIMEOUT_MS }, () => {
  it('carries the whole document where the canonical envelope carries the changed fields', async () => {
    const { a } = await pair();
    const row = learner('L-1');
    const doc = await a.create('learner', row, CREATED, 'device-a');

    const whole = docBytes(doc);
    const patch: Envelope = {
      entity: 'learner',
      id: 'L-1',
      op: 'update',
      hlc: LATE,
      deviceId: 'device-b',
      fields: ['nationality'],
      base: { nationality: CREATED },
      payload: { ...row, nationality: 'Ugandan' },
    };
    const partial: Envelope = { ...patch, payload: { nationality: 'Ugandan' } };

    const documentBytes = whole;
    const envelopeWithRow = envelopeBytes(patch);
    const envelopeWithFields = envelopeBytes(partial);

    expect(documentBytes).toBeGreaterThan(envelopeWithRow);
    expect(envelopeWithRow).toBeGreaterThan(envelopeWithFields);

    const results = new Results('pouch-bytes');
    results
      .add('pouchDocument', documentBytes, 'bytes', 'one learner document, whole row plus clocks')
      .add('envelopeWholeRow', envelopeWithRow, 'bytes', 'the canonical envelope carrying the row')
      .add('envelopeChangedFields', envelopeWithFields, 'bytes', 'the canonical envelope carrying the patch')
      .add('ratioDocumentToEnvelope', Math.round((documentBytes / envelopeWithFields) * 100) / 100, 'ratio');
    results.write();
  });

  it('pays for the whole row even when one field changed', async () => {
    const { a } = await pair();
    const doc = await a.create('learner', learner('L-1'), CREATED, 'device-a');
    const one = await a.update('learner', 'L-1', { nationality: 'Ugandan' }, EARLY, 'device-a');
    const six = await a.update(
      'learner',
      'L-1',
      {
        given_name: 'Amani-A',
        family_name: 'Okello-B',
        sex: 'male',
        date_of_birth: '2011-04-03',
        nationality: 'Ugandan',
      },
      LATE,
      'device-b'
    );

    expect(docId('learner', 'L-1')).toBe(one._id);
    // A one-column edit rewrites the payload and every clock, so it is within a few bytes of
    // the whole row rather than a fraction of it.
    expect(docBytes(one)).toBeGreaterThan(docBytes(doc) * 0.9);
    expect(docBytes(six)).toBeGreaterThanOrEqual(docBytes(one));

    const results = new Results('pouch-update-bytes');
    results
      .add('createdWholeRow', docBytes(doc), 'bytes', 'the document a create writes')
      .add('oneFieldUpdate', docBytes(one), 'bytes', 'the same row with one column changed')
      .add('fiveFieldUpdate', docBytes(six), 'bytes', 'the same row with five columns changed')
      .add(
        'oneFieldShareOfWholeRow',
        Math.round((docBytes(one) / docBytes(doc)) * 1000) / 1000,
        'ratio'
      );
    results.write();
  });
});

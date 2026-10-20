// ABOUTME: The self-test of the repository integration harness: it opens a real database,
// ABOUTME: applies the canonical schema, seeds the fixtures and keeps two tests apart.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ENTITY_NAMES, storageFor, type EntityName } from '@/domain/schema';

import {
  closeTestContext,
  createTestContext,
  referenceOrder,
  SEED_ORDER,
  type TestContext,
} from './index';

describe('repository integration harness', () => {
  it('seeds every registered entity, in an order the references allow', () => {
    expect([...SEED_ORDER].sort()).toEqual([...ENTITY_NAMES].sort());

    const position = new Map<EntityName, number>();
    SEED_ORDER.forEach((entity, index) => position.set(entity, index));
    const byTable = new Map(ENTITY_NAMES.map((entity) => [storageFor(entity).table, entity]));

    for (const entity of ENTITY_NAMES) {
      for (const target of Object.values(storageFor(entity).refs)) {
        const parent = byTable.get(target);
        if (!parent || parent === entity) continue;
        expect(position.get(parent) as number).toBeLessThan(position.get(entity) as number);
      }
    }
  });

  it('places an entity the preference does not name after the rows it references', () => {
    // An entity the registry gains later is not in the hand-written order; it still has
    // to land after the rows it points at.
    const preference = SEED_ORDER.filter((entity) => entity !== 'learner');
    const order = referenceOrder(ENTITY_NAMES, preference);

    expect([...order].sort()).toEqual([...ENTITY_NAMES].sort());

    const position = new Map<EntityName, number>();
    order.forEach((entity, index) => position.set(entity, index));
    const byTable = new Map(ENTITY_NAMES.map((entity) => [storageFor(entity).table, entity]));

    for (const target of Object.values(storageFor('learner').refs)) {
      const parent = byTable.get(target);
      if (!parent) continue;
      expect(position.get(parent) as number).toBeLessThan(position.get('learner') as number);
    }
  });

  it('opens a real database with the canonical schema applied', async () => {
    const context = await createTestContext();

    try {
      // Every entity of the registry has its table, and every table can be read.
      for (const entity of ENTITY_NAMES) {
        const rows = await context.queries.rows(entity);
        expect(Array.isArray(rows)).toBe(true);
      }

      // The optimistic-concurrency counter is in place.
      expect(await context.queries.columnsOf('learner')).toContain('version');
      // The repository's own audit table is in place.
      expect(await context.queries.columnsOf('comment_bank_entry')).toContain('deleted_at');
    } finally {
      await closeTestContext(context);
    }
  });

  it('seeds every canonical fixture', async () => {
    const context = await createTestContext();

    try {
      expect([...SEED_ORDER].sort()).toEqual([...ENTITY_NAMES].sort());

      for (const entity of ENTITY_NAMES) {
        const row = await context.repository.get(entity, context.seed.idOf(entity));
        expect(row, `the ${entity} fixture was not seeded`).not.toBeNull();
      }
    } finally {
      await closeTestContext(context);
    }
  });

  it('seeds the canonical values of a fixture', async () => {
    const context = await createTestContext();

    try {
      const learner = await context.repository.get('learner', context.seed.idOf('learner'));

      expect(learner?.given_name).toBe('Amani');
      expect(learner?.family_name).toBe('Wekesa');
      // A JSON column survives the round trip.
      expect(learner?.phones).toEqual([{ number: '+254711000000', label: 'parent' }]);
      // A reference points at the row the database actually holds.
      expect(learner?.household_id).toBe(context.seed.idOf('household'));
    } finally {
      await closeTestContext(context);
    }
  });

  it('writes through to the database', async () => {
    const context = await createTestContext();

    try {
      const created = await context.repository.create(
        'comment_bank_entry',
        context.seed.inputFor('comment_bank_entry', { text: 'Written for real.' })
      );

      const rows = await context.queries.rows('comment_bank_entry');
      expect(rows.some((row) => String(row.id) === created.id)).toBe(true);

      // The write is audited in the same transaction.
      const trail = await context.repository.auditTrail('comment_bank_entry', created.id);
      expect(trail).toHaveLength(1);
      expect(trail[0]?.action).toBe('create');
    } finally {
      await closeTestContext(context);
    }
  });

  it('keeps two contexts apart', async () => {
    const first = await createTestContext();
    const second = await createTestContext();

    try {
      await first.repository.create(
        'comment_bank_entry',
        first.seed.inputFor('comment_bank_entry', { text: 'Only in the first context.' })
      );

      // The second context holds the fixture and nothing else.
      expect(await first.queries.count('comment_bank_entry')).toBe(2);
      expect(await second.queries.count('comment_bank_entry')).toBe(1);

      const rows = await second.queries.rows('comment_bank_entry');
      expect(rows.every((row) => row.text !== 'Only in the first context.')).toBe(true);
    } finally {
      await closeTestContext(first);
      await closeTestContext(second);
    }
  });

  it('keeps a file database apart from another file database', async () => {
    const first = await createTestContext({ database: { kind: 'file' } });
    const second = await createTestContext({ database: { kind: 'file' } });

    try {
      await first.repository.create(
        'comment_bank_entry',
        first.seed.inputFor('comment_bank_entry', { text: 'Only in the first file.' })
      );

      expect(await first.queries.count('comment_bank_entry')).toBe(2);
      expect(await second.queries.count('comment_bank_entry')).toBe(1);
    } finally {
      await closeTestContext(first);
      await closeTestContext(second);
    }
  });

  it('removes the database file it created when the context closes', async () => {
    const context = await createTestContext({ database: { kind: 'file' } });
    const filename = context.database.filename;

    expect(filename).toBeTruthy();
    expect(fs.existsSync(filename as string)).toBe(true);

    await context.close();

    expect(fs.existsSync(filename as string)).toBe(false);
  });

  it('seeds the entities it was asked for and the ancestors they reference', async () => {
    const context = await createTestContext({ entities: ['learner', 'household'] });

    try {
      // The wanted entities are seeded...
      expect(context.seed.idOf('learner')).toBeTruthy();
      expect(context.seed.idOf('household')).toBeTruthy();
      // ...and the entities they point at, so every reference resolves.
      expect(context.seed.idOf('institution')).toBeTruthy();
      expect(context.seed.idOf('house')).toBeTruthy();
      expect(context.seed.idOf('guardian')).toBeTruthy();
      expect(context.seed.idOf('staff')).toBeTruthy();

      // The whole registry is served, so a write finds the tables the guards read.
      const created = await context.repository.create(
        'learner',
        context.seed.inputFor('learner', { admission_number: 'GA/2027/950' })
      );

      const stored = await context.repository.get('learner', created.id);
      expect(stored?.admission_number).toBe('GA/2027/950');
      expect(stored?.household_id).toBe(context.seed.idOf('household'));
    } finally {
      await closeTestContext(context);
    }
  });

  it('closes a context twice without complaining', async () => {
    const context = await createTestContext();

    await context.close();
    await expect(context.close()).resolves.toBeUndefined();
  });

  it('serves a context without a seed when the caller asks for one', async () => {
    const context: TestContext = await createTestContext({ seed: false });

    try {
      expect(await context.queries.count('comment_bank_entry')).toBe(0);

      // The schema is in place, so a write is still checked against it: the reference of
      // the fixture points at an institution that was never seeded.
      await expect(
        context.repository.create(
          'comment_bank_entry',
          context.seed.inputFor('comment_bank_entry', { text: 'Seeded by the test.' })
        )
      ).rejects.toThrow(/does not exist/);
    } finally {
      await closeTestContext(context);
    }
  });
});

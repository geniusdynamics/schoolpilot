// ABOUTME: Integration tests for the optimistic concurrency contract: the version column is
// ABOUTME: ensured at setup, a stale write is rejected and only one of two writers wins.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applyCanonicalSchema, createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { ENTITY_NAMES, storageFor } from '@/domain/schema';

import {
  concurrencyColumnFor,
  ensureConcurrencyColumns,
  hasBusinessVersion,
  type RepositoryConflictError,
  type RepositoryRow,
} from '..';
import {
  closeTestContext,
  createTestContext,
  fixtureInput,
  seededId,
  type TestContext,
} from './helpers';

describe('optimistic concurrency', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await closeTestContext(context);
  });

  it('adds the version column to every table that lacks it', async () => {
    for (const entity of ENTITY_NAMES) {
      const table = storageFor(entity).table;
      const columns = await context.adapter.all<{ name: string }>(
        `PRAGMA table_info("${table}")`
      );
      const names = columns.map((column) => column.name);
      const expected = concurrencyColumnFor(entity);

      expect(names, entity).toContain(expected);
      // A business version column stays untouched next to the counter.
      if (hasBusinessVersion(entity)) expect(names, entity).toContain('version');
    }
  });

  it('adds the column with an idempotent alter to a table the canonical DDL made', async () => {
    const adapter: SqliteAdapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    try {
      await applyCanonicalSchema(adapter, ['learner', 'mark']);

      const before = await adapter.all<{ name: string }>('PRAGMA table_info("learner")');
      expect(before.map((column) => column.name)).not.toContain('version');

      const added = await ensureConcurrencyColumns(adapter, ['learner', 'mark']);
      expect(added).toEqual(['learner.version', 'mark.row_version']);

      const after = await adapter.all<{ name: string }>('PRAGMA table_info("learner")');
      expect(after.map((column) => column.name)).toContain('version');

      // A second run changes nothing.
      expect(await ensureConcurrencyColumns(adapter, ['learner', 'mark'])).toEqual([]);
    } finally {
      await adapter.close();
    }
  });

  it('rejects a write whose expected version is stale', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Versioned.' })
    );

    const updated = await context.repository.update(
      'comment_bank_entry',
      created.id,
      { text: 'Versioned once.' },
      { expectedVersion: created.rowVersion }
    );

    const error = await context.repository
      .update('comment_bank_entry', created.id, { text: 'Versioned twice.' }, {
        expectedVersion: created.rowVersion,
      })
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryConflictError);

    expect(error?.code).toBe('conflict');
    expect(error?.reason).toBe('stale_version');
    expect(error?.expectedVersion).toBe(created.rowVersion);
    expect(error?.actualVersion).toBe(updated.rowVersion);

    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored?.text).toBe('Versioned once.');
  });

  it('lets only one of two writers with the same expected version through', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Contended.' })
    );

    const results = await Promise.allSettled([
      context.repository.update(
        'comment_bank_entry',
        created.id,
        { text: 'First writer.' },
        { expectedVersion: created.rowVersion }
      ),
      context.repository.update(
        'comment_bank_entry',
        created.id,
        { text: 'Second writer.' },
        { expectedVersion: created.rowVersion }
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'conflict',
      reason: 'stale_version',
    });
  });

  it('keeps a business version field apart from the write counter', async () => {
    const mark = await context.repository.get('mark', seededId(context, 'mark'));
    expect(mark?.version).toBe(1);
    expect(mark?.rowVersion).toBe(1);

    const updated = await context.repository.update(
      'mark',
      mark!.id,
      { score: '55.5' },
      { expectedVersion: mark!.rowVersion }
    );

    // The business version is the mark's own revision and does not move on its own.
    expect(updated.version).toBe(1);
    expect(updated.rowVersion).toBe(2);
  });

  it('rejects a removal whose expected version is stale', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Removed with a guard.' })
    );

    await context.repository.update(
      'comment_bank_entry',
      created.id,
      { text: 'Changed first.' },
      { expectedVersion: created.rowVersion }
    );

    const error = await context.repository
      .remove('comment_bank_entry', created.id, { expectedVersion: created.rowVersion })
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryConflictError);

    expect(error?.reason).toBe('stale_version');
    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored).not.toBeNull();
  });

  it('treats a missing expected version as a conflict, not a validation error', async () => {
    const created = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'No version.' })
    );

    const error = await context.repository
      .update(
        'comment_bank_entry',
        created.id,
        { text: 'Changed anyway.' },
        { expectedVersion: undefined as unknown as number }
      )
      .then(() => null)
      .catch((caught: unknown) => caught as RepositoryConflictError);

    expect(error?.code).toBe('conflict');
    expect(error?.reason).toBe('stale_version');

    const stored = await context.repository.get('comment_bank_entry', created.id);
    expect(stored?.text).toBe('No version.');
  });

  it('bumps the counter on every write', async () => {
    const created: RepositoryRow<'comment_bank_entry'> = await context.repository.create(
      'comment_bank_entry',
      fixtureInput(context, 'comment_bank_entry', { text: 'Counter.' })
    );

    expect(created.rowVersion).toBe(1);

    const updated = await context.repository.update(
      'comment_bank_entry',
      created.id,
      { text: 'Counter two.' },
      { expectedVersion: created.rowVersion }
    );
    expect(updated.rowVersion).toBe(2);

    const removed = await context.repository.remove('comment_bank_entry', created.id, {
      expectedVersion: updated.rowVersion,
    });
    expect(removed.rowVersion).toBe(3);
  });
});

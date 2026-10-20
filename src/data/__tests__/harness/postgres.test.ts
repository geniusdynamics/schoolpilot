// ABOUTME: The self-test of the harness on Postgres: the dialect shim of the driver, and the
// ABOUTME: same guarantees the SQLite path gives, run against the server the environment provides.

import { describe, expect, it } from 'vitest';

import { ENTITY_NAMES, storageFor, type EntityName } from '@/domain/schema';

import {
  canonicalSchemaOrder,
  closeTestContext,
  createTestContext,
  normaliseError,
  translateSql,
} from './index';

/** The server the environment provides; the suite is skipped when there is none. */
const connectionString = process.env.DATABASE_URL;

/**
 * The budget of one test on Postgres.
 *
 * The context applies the canonical DDL of 63 entities and seeds 63 rows over the
 * network, which is slower than the in-memory database of the SQLite path.
 */
const POSTGRES_TIMEOUT_MS = 180_000;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The number of schemas the server holds under a name. */
const countSchemas = async (name: string): Promise<number> => {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: connectionString as string });
  await client.connect();
  try {
    const result = await client.query(
      'SELECT count(*)::int AS count FROM information_schema.schemata WHERE schema_name = $1',
      [name]
    );
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
};

describe('the Postgres dialect shim of the harness', () => {
  it('numbers the placeholders and leaves a question mark in a string alone', () => {
    expect(
      translateSql('SELECT * FROM "learner" WHERE "id" = ? AND "status" = ?')
    ).toBe('SELECT * FROM "learner" WHERE "id" = $1 AND "status" = $2');

    expect(
      translateSql(`SELECT 'why?' AS question, "id" FROM "learner" WHERE "id" = ?`)
    ).toBe(`SELECT 'why?' AS question, "id" FROM "learner" WHERE "id" = $1`);
  });

  it('answers the pragmas the repository reads', () => {
    expect(translateSql('PRAGMA foreign_keys')).toBe('SELECT 1 AS foreign_keys');
    expect(translateSql('PRAGMA foreign_keys = ON')).toBe('SELECT 1');
    expect(translateSql('PRAGMA busy_timeout = 5000')).toBe('SELECT 1');

    const tableInfo = translateSql('PRAGMA table_info("learner")');
    expect(tableInfo).toContain('information_schema.columns');
    expect(tableInfo).toContain("table_name = 'learner'");
  });

  it('spells the transaction and the row locator the way Postgres does', () => {
    expect(translateSql('BEGIN IMMEDIATE')).toBe('BEGIN');
    expect(
      translateSql('SELECT * FROM "audit_event" ORDER BY "created_at" DESC, "rowid" DESC')
    ).toBe('SELECT * FROM "audit_event" ORDER BY "created_at" DESC, ctid DESC');
  });

  it('reports a Postgres violation the way the repository reads it', () => {
    expect(
      messageOf(
        normaliseError({
          code: '23505',
          table: 'learner',
          detail: 'Key (institution_id, admission_number)=(x, y) already exists.',
          message: 'duplicate key value violates unique constraint "uq_learner"',
        })
      )
    ).toBe('UNIQUE constraint failed: learner.institution_id, learner.admission_number');

    expect(
      messageOf(
        normaliseError({
          code: '23502',
          table: 'learner',
          message: 'null value in column "given_name" violates not-null constraint',
        })
      )
    ).toBe('NOT NULL constraint failed: learner.given_name');

    expect(
      messageOf(normaliseError({ code: '23503', message: 'violates foreign key constraint' }))
    ).toBe('FOREIGN KEY constraint failed');
  });

  it('orders the entities so that a table never references a table that is not there yet', () => {
    const order = canonicalSchemaOrder();
    expect([...order].sort()).toEqual([...ENTITY_NAMES].sort());

    const position = new Map<EntityName, number>();
    order.forEach((entity, index) => position.set(entity, index));

    const byTable = new Map(ENTITY_NAMES.map((entity) => [storageFor(entity).table, entity]));

    for (const entity of ENTITY_NAMES) {
      for (const target of Object.values(storageFor(entity).refs)) {
        const parent = byTable.get(target);
        if (!parent || parent === entity) continue;
        expect(position.get(parent) as number).toBeLessThan(position.get(entity) as number);
      }
    }
  });
});

describe.skipIf(!connectionString)('repository integration harness on Postgres', () => {
  it(
    'applies the canonical schema and seeds the fixtures',
    async () => {
      const context = await createTestContext({ database: { kind: 'postgres' } });

      try {
        // Every entity of the registry has its table, and every table can be read.
        for (const entity of ENTITY_NAMES) {
          const rows = await context.queries.rows(entity);
          expect(Array.isArray(rows)).toBe(true);
        }

        // The optimistic-concurrency counter is in place.
        expect(await context.queries.columnsOf('learner')).toContain('version');
      } finally {
        await closeTestContext(context);
      }
    },
    POSTGRES_TIMEOUT_MS
  );

  it(
    'seeds the canonical values of a fixture',
    async () => {
      const context = await createTestContext({ database: { kind: 'postgres' } });

      try {
        const learner = await context.repository.get('learner', context.seed.idOf('learner'));

        expect(learner?.given_name).toBe('Amani');
        expect(learner?.family_name).toBe('Wekesa');
        expect(learner?.household_id).toBe(context.seed.idOf('household'));
      } finally {
        await closeTestContext(context);
      }
    },
    POSTGRES_TIMEOUT_MS
  );

  it(
    'writes through to the database',
    async () => {
      const context = await createTestContext({ database: { kind: 'postgres' } });

      try {
        const created = await context.repository.create(
          'comment_bank_entry',
          context.seed.inputFor('comment_bank_entry', { text: 'Written for real.' })
        );

        const rows = await context.queries.rows('comment_bank_entry');
        expect(rows.some((row) => String(row.id) === created.id)).toBe(true);

        const trail = await context.repository.auditTrail('comment_bank_entry', created.id);
        expect(trail).toHaveLength(1);
      } finally {
        await closeTestContext(context);
      }
    },
    POSTGRES_TIMEOUT_MS
  );

  it(
    'drops the schema it created when the context closes',
    async () => {
      const context = await createTestContext({ database: { kind: 'postgres' } });
      const schema = context.database.schema;

      expect(schema).toBeTruthy();
      expect(await countSchemas(schema as string)).toBe(1);

      await closeTestContext(context);

      // The schema is gone: the drop runs before the connection is closed.
      expect(await countSchemas(schema as string)).toBe(0);
    },
    POSTGRES_TIMEOUT_MS
  );

  it(
    'keeps two contexts apart',
    async () => {
      const first = await createTestContext({ database: { kind: 'postgres' } });
      const second = await createTestContext({ database: { kind: 'postgres' } });

      try {
        await first.repository.create(
          'comment_bank_entry',
          first.seed.inputFor('comment_bank_entry', { text: 'Only in the first context.' })
        );

        expect(await first.queries.count('comment_bank_entry')).toBe(2);
        expect(await second.queries.count('comment_bank_entry')).toBe(1);
      } finally {
        await closeTestContext(first);
        await closeTestContext(second);
      }
    },
    POSTGRES_TIMEOUT_MS
  );
});

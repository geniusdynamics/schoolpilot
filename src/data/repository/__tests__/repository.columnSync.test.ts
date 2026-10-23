// ABOUTME: Regression test for the additive column sync: a database created before the fee-schedule
// ABOUTME: matrix existed is repaired in place by repository.setup(), without losing its rows.

import { afterEach, describe, expect, it } from 'vitest';

import {
  createNodeSqliteAdapter,
  statementsForSchema,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import { createRepository, ensureDeclaredColumns } from '@/data/repository';
import { asId, generateUuidv7 } from '@/domain/ids';
import {
  databaseSchemaFor,
  ENTITY_NAMES,
  storageFor,
  type EntityName,
} from '@/domain/schema';
import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

/** The three dimension columns P3-B02 added to fee_schedule_line after its first release. */
const MATRIX_COLUMNS = ['level_id', 'residence_status', 'fee_category_id'] as const;
/** The two of those the storage sidecar also indexes (the ones that break the open when missing). */
const MATRIX_INDEXES = ['level_id', 'fee_category_id'] as const;

const LEGACY_ROW_ID = '01980000-0000-7000-8000-000000000001';
const LEGACY_AMOUNT = '{"amount_minor":150000,"currency":"KES"}';

const openAdapters: SqliteAdapter[] = [];

afterEach(async () => {
  while (openAdapters.length > 0) {
    await openAdapters.pop()?.close();
  }
});

/**
 * A schema with the named columns and the indexes over them removed, exactly as an earlier
 * release declared the table. Everything else - the strict NOT NULLs, the foreign keys, the
 * remaining indexes - is the canonical definition.
 */
function withoutColumns(entity: EntityName, removed: readonly string[]): DatabaseSchema {
  const schema = databaseSchemaFor(entity);
  const properties = Object.fromEntries(
    Object.entries(schema.properties).filter(([name]) => !removed.includes(name))
  );
  const indexes = (schema.indexes ?? []).filter((index) => {
    const fields = Array.isArray(index) ? index : [index];
    return !fields.some((field) => removed.includes(field));
  });
  return { ...schema, properties, indexes, strict: true };
}

/** Opens an in-memory database whose fee_schedule_line has the shape an earlier release made. */
async function openLegacyDatabase(removed: readonly string[]): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  openAdapters.push(adapter);

  for (const statement of statementsForSchema(withoutColumns('fee_schedule_line', removed))) {
    await adapter.exec(statement);
  }
  return adapter;
}

/** Inserts one fee_schedule_line row carrying every NOT NULL column of the legacy shape. */
async function insertLegacyRow(
  adapter: SqliteAdapter,
  values: Readonly<Record<string, string | number>>
): Promise<void> {
  const names = Object.keys(values);
  await adapter.run(
    `INSERT INTO "fee_schedule_line" (${names.map((name) => `"${name}"`).join(', ')})
     VALUES (${names.map(() => '?').join(', ')})`,
    names.map((name) => values[name])
  );
}

async function columnNames(adapter: SqliteAdapter, table: string): Promise<string[]> {
  const columns = await adapter.all<{ name: string }>(`PRAGMA table_info("${table}")`);
  return columns.map((column) => column.name);
}

async function notNullColumns(adapter: SqliteAdapter, table: string): Promise<string[]> {
  const columns = await adapter.all<{ name: string; notnull: number }>(
    `PRAGMA table_info("${table}")`
  );
  return columns.filter((column) => column.notnull === 1).map((column) => column.name);
}

async function indexNames(adapter: SqliteAdapter, table: string): Promise<string[]> {
  const indexes = await adapter.all<{ name: string }>(`PRAGMA index_list("${table}")`);
  return indexes.map((index) => index.name);
}

describe('additive column sync', () => {
  it('repairs a pre-B02 fee_schedule_line in place and keeps the rows it held', async () => {
    const adapter = await openLegacyDatabase(MATRIX_COLUMNS);

    // The precondition: the legacy table really lacks the columns and the indexes over them.
    expect(await columnNames(adapter, 'fee_schedule_line')).not.toContain('level_id');
    await insertLegacyRow(adapter, {
      id: LEGACY_ROW_ID,
      institution_id: generateUuidv7(),
      fee_schedule_id: generateUuidv7(),
      fee_item_id: generateUuidv7(),
      amount: LEGACY_AMOUNT,
      mandatory: 1,
      frequency: 'per_term',
      proration_rule: 'full',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    // On the unfixed code this call throws `no such column: "level_id"` from the CREATE INDEX
    // statement and every canonical page fails to open.
    const repository = createRepository({ adapter });
    await repository.setup();

    const columns = await columnNames(adapter, 'fee_schedule_line');
    for (const column of MATRIX_COLUMNS) expect(columns, column).toContain(column);

    const indexes = await indexNames(adapter, 'fee_schedule_line');
    for (const column of MATRIX_INDEXES) {
      expect(indexes, column).toContain(`idx_fee_schedule_line_${column}`);
    }

    // The row the database already held survives with its original values.
    const row = await repository.get('fee_schedule_line', asId<'fee_schedule_line'>(LEGACY_ROW_ID));
    expect(row?.amount).toEqual({ amount_minor: 150000, currency: 'KES' });
    expect(row?.frequency).toBe('per_term');
    expect(row?.proration_rule).toBe('full');
    expect(row?.mandatory).toBe(true);
  });

  it('creates a table that does not exist yet whole, with every declared column and index', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    openAdapters.push(adapter);

    await createRepository({ adapter }).setup();

    const declared = Object.keys(databaseSchemaFor('fee_schedule_line').properties);
    const columns = await columnNames(adapter, 'fee_schedule_line');
    for (const column of declared) expect(columns, column).toContain(column);

    const indexes = await indexNames(adapter, 'fee_schedule_line');
    for (const column of MATRIX_INDEXES) {
      expect(indexes, column).toContain(`idx_fee_schedule_line_${column}`);
    }
  });

  it('still adds the concurrency counter to a table the DDL made', async () => {
    const adapter = await openLegacyDatabase(MATRIX_COLUMNS);

    await createRepository({ adapter }).setup();

    // `fee_schedule_line` declares no business version, so its write counter is `version`.
    expect(await columnNames(adapter, 'fee_schedule_line')).toContain('version');
  });

  it('is idempotent: a second run adds nothing', async () => {
    const adapter = await openLegacyDatabase(MATRIX_COLUMNS);

    const added = await ensureDeclaredColumns(adapter, ['fee_schedule_line']);
    expect(added).toEqual(MATRIX_COLUMNS.map((column) => `fee_schedule_line.${column}`));
    expect(await ensureDeclaredColumns(adapter, ['fee_schedule_line'])).toEqual([]);
  });

  it('lands a non-optional column without a default as nullable so the existing rows survive', async () => {
    // `amount` is required by the schema and carries no default. A bare NOT NULL could not be
    // added to a table that already holds a row, so the sync adds it nullable instead.
    const adapter = await openLegacyDatabase(['amount']);
    await insertLegacyRow(adapter, {
      id: LEGACY_ROW_ID,
      institution_id: generateUuidv7(),
      fee_schedule_id: generateUuidv7(),
      fee_item_id: generateUuidv7(),
      mandatory: 1,
      frequency: 'per_term',
      proration_rule: 'full',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    expect(await ensureDeclaredColumns(adapter, ['fee_schedule_line'])).toEqual([
      'fee_schedule_line.amount',
    ]);

    expect(await notNullColumns(adapter, 'fee_schedule_line')).not.toContain('amount');
    const stored = await adapter.get<{ id: string; frequency: string }>(
      `SELECT "id", "frequency" FROM "fee_schedule_line" WHERE "id" = ?`,
      [LEGACY_ROW_ID]
    );
    expect(stored?.id).toBe(LEGACY_ROW_ID);
    expect(stored?.frequency).toBe('per_term');
  });

  it('skips a table that does not exist yet rather than creating it half-formed', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    openAdapters.push(adapter);

    // The canonical DDL owns a table that is not there yet; the sync must not pre-create it.
    expect(await ensureDeclaredColumns(adapter, ['fee_schedule_line'])).toEqual([]);
    expect(await columnNames(adapter, 'fee_schedule_line')).toEqual([]);
  });

  it('covers every entity the canonical registry declares', async () => {
    // The sync is general, not a fee_schedule_line special case: every declared column of every
    // entity is present once setup has run.
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    openAdapters.push(adapter);

    await createRepository({ adapter }).setup();

    for (const entity of ENTITY_NAMES) {
      const table = storageFor(entity).table;
      const columns = await columnNames(adapter, table);
      for (const column of Object.keys(databaseSchemaFor(entity).properties)) {
        expect(columns, `${entity}.${column}`).toContain(column);
      }
    }
  });
});

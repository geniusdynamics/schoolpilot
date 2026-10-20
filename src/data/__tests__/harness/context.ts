// ABOUTME: The repository integration harness: a real database with the canonical schema and
// ABOUTME: the canonical fixtures seeded, one context per test, and a clean close.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, type Repository } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { createQueries, type TestQueries } from './queries';
import { applyCanonicalSchemaForPostgres, createPostgresHarness } from './postgres';
import { createSeed, seedRegistry, SEED_ORDER, TEST_ACTOR, withAncestors, type Seed } from './seed';

/** The database a harness context runs on. */
export type TestDatabaseKind = 'memory' | 'file' | 'postgres';

/** The database a harness context runs on, and where it lives. */
export interface TestDatabase {
  readonly kind: TestDatabaseKind;
  /** The file of the SQLite database; absent for the in-memory database. */
  readonly filename?: string;
  /** The schema of the Postgres context; every context gets its own. */
  readonly schema?: string;
}

/** The options of a harness context. */
export interface TestContextOptions {
  /** The database to run on. Defaults to an in-memory SQLite database. */
  readonly database?: {
    /** `memory`, `file` or `postgres`. Defaults to `memory`. */
    readonly kind?: TestDatabaseKind;
    /** The file of a `file` database. The harness creates and removes one when it is not given. */
    readonly filename?: string;
    /** The connection string of a `postgres` database. Defaults to `DATABASE_URL`. */
    readonly connectionString?: string;
  };
  /** The acting user id the writes are stamped with. */
  readonly actor?: string;
  /** The entities the repository serves. Defaults to every registered entity. */
  readonly entities?: readonly EntityName[];
  /** Seed the canonical fixtures. On by default. */
  readonly seed?: boolean;
}

/**
 * A repository on a real database, with the canonical schema applied and the canonical
 * fixtures seeded.
 *
 * Every context owns its database, so two contexts never see each other's rows.
 */
export interface TestContext {
  /** The repository under test. */
  readonly repository: Repository;
  /** The adapter the repository runs on. */
  readonly adapter: SqliteAdapter;
  /** The database this context runs on. */
  readonly database: TestDatabase;
  /** The id every seeded row got, keyed by the id of the fixture it came from. */
  readonly ids: ReadonlyMap<string, string>;
  /** The seeded state: which id every fixture row got. */
  readonly seed: Seed;
  /** Typed helpers for the reads a test needs. */
  readonly queries: TestQueries;
  /** Closes the database and removes what the context created. */
  close(): Promise<void>;
}

/**
 * Opens a database, applies the canonical schema and seeds the canonical fixtures.
 *
 * The default is an in-memory SQLite database: it is real, it is fast, and it belongs to
 * one test. Pass `database: { kind: 'file' }` for a database on disk, or
 * `database: { kind: 'postgres' }` for a Postgres server.
 */
export async function createTestContext(options: TestContextOptions = {}): Promise<TestContext> {
  const kind = options.database?.kind ?? 'memory';
  if (kind === 'postgres') return createPostgresContext(options);
  return createSqliteContext(options);
}

/** Closes a context. Tolerates a context that was never created. */
export async function closeTestContext(context: TestContext | undefined): Promise<void> {
  await context?.close();
}

async function createSqliteContext(options: TestContextOptions): Promise<TestContext> {
  const kind = options.database?.kind ?? 'memory';
  const given = options.database?.filename;
  const filename =
    kind === 'file'
      ? given ?? path.join(os.tmpdir(), `schoolpilot-harness-${randomUUID()}.sqlite`)
      : ':memory:';

  const adapter = createNodeSqliteAdapter({ filename, foreignKeys: true });
  await adapter.open();

  const { repository, order } = buildRepository(adapter, options);
  await repository.setup();
  const ids = await seedFixtures(repository, order, options);
  await repository.whenIdle();

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await adapter.close();
    if (kind === 'file' && given === undefined) {
      await fs.promises.rm(filename, { force: true });
    }
  };

  return {
    repository,
    adapter,
    database: kind === 'file' ? { kind, filename } : { kind: 'memory' },
    ids,
    seed: createSeed(ids),
    queries: createQueries(repository, adapter),
    close,
  };
}

async function createPostgresContext(options: TestContextOptions): Promise<TestContext> {
  const connectionString = options.database?.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'the Postgres harness needs a connection string: pass database.connectionString or set DATABASE_URL'
    );
  }

  const harness = await createPostgresHarness({ connectionString });
  const { repository, order } = buildRepository(harness.adapter, options);

  // Postgres refuses a table that references a table that does not exist yet, so the
  // canonical DDL is applied parents first. The statements themselves are the canonical
  // ones; `setup()` then finds every table in place.
  await applyCanonicalSchemaForPostgres(harness.adapter);
  await repository.setup();
  const ids = await seedFixtures(repository, order, options);
  await repository.whenIdle();

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await harness.dispose();
  };

  return {
    repository,
    adapter: harness.adapter,
    database: { kind: 'postgres', schema: harness.schema },
    ids,
    seed: createSeed(ids),
    queries: createQueries(repository, harness.adapter),
    close,
  };
}

function buildRepository(
  adapter: SqliteAdapter,
  options: TestContextOptions
): { repository: Repository; order: readonly EntityName[] } {
  // The repository always serves the whole registry. Every table has to exist, because
  // the invariant guards read the tables they check against - a context that held only
  // some of them would fail on the first write.
  const repository = createRepository({
    adapter,
    actor: options.actor ?? TEST_ACTOR,
  });

  // The seed covers the entities the caller asked for and the ancestors they reference,
  // so every reference of a seeded row resolves.
  const order = options.entities ? withAncestors(options.entities) : SEED_ORDER;
  return { repository, order };
}

async function seedFixtures(
  repository: Repository,
  order: readonly EntityName[],
  options: TestContextOptions
): Promise<Map<string, string>> {
  if (options.seed === false) return new Map<string, string>();
  return seedRegistry(repository, order);
}

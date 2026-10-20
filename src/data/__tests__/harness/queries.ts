// ABOUTME: Typed query helpers for the repository integration harness: the reads a test
// ABOUTME: needs most often, so a test does not spell out the repository's own call shapes.

import { storageFor, type EntityName } from '@/domain/schema';
import type { Id } from '@/domain/ids';
import type { SqliteAdapter, SqliteRow } from '@/data/adapters/sqlite';
import type { ListQuery, Page, Repository, RepositoryRow } from '@/data/repository';

/** The reads a test needs from a repository and its database. */
export interface TestQueries {
  /** Reads one row through the repository. */
  get<E extends EntityName>(entity: E, id: Id<E>): Promise<RepositoryRow<E> | null>;
  /** Reads a page of rows through the repository. */
  list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>>;
  /** The number of rows that match an equality filter. */
  count<E extends EntityName>(
    entity: E,
    where?: Readonly<Record<string, unknown>>
  ): Promise<number>;
  /** The physical rows of a table, straight from the database. */
  rows<E extends EntityName>(entity: E): Promise<readonly SqliteRow[]>;
  /** The columns a table has, in the order the database reports them. */
  columnsOf<E extends EntityName>(entity: E): Promise<readonly string[]>;
  /** The physical table an entity is stored in. */
  tableOf<E extends EntityName>(entity: E): string;
}

/** Builds the query helpers of a harness context. */
export function createQueries(
  repository: Repository,
  adapter: SqliteAdapter
): TestQueries {
  return {
    get: <E extends EntityName>(entity: E, id: Id<E>) => repository.get(entity, id),
    list: <E extends EntityName>(entity: E, query: ListQuery = {}) =>
      repository.list(entity, query),
    count: async <E extends EntityName>(
      entity: E,
      where?: Readonly<Record<string, unknown>>
    ): Promise<number> => {
      const page = await repository.list(entity, { where, limit: 1 });
      return page.total;
    },
    rows: async <E extends EntityName>(entity: E): Promise<readonly SqliteRow[]> => {
      const table = storageFor(entity).table;
      return adapter.all<SqliteRow>(`SELECT * FROM "${table}"`);
    },
    // The adapter core speaks the SQLite dialect; the Postgres driver of the harness
    // bridges this read onto `information_schema.columns`.
    columnsOf: async <E extends EntityName>(entity: E): Promise<readonly string[]> => {
      const table = storageFor(entity).table;
      const columns = await adapter.all<{ name: string }>(`PRAGMA table_info("${table}")`);
      return columns.map((column) => column.name);
    },
    tableOf: <E extends EntityName>(entity: E): string => storageFor(entity).table,
  };
}

// ABOUTME: The list query of the repository: filters, sort order, pagination and the opaque
// ABOUTME: cursor, turned into the SQL the adapter runs.

import { type EntityName } from '@/domain/schema';
import type { SqliteBindValue } from '@/data/adapters/sqlite';

import { columnsFor, encodeValue, type ColumnMeta } from './columns';
import { RepositoryValidationError } from './errors';
import { fieldIssue } from './schemas';
import type { FilterCondition, ListQuery } from './types';

/** The default number of rows in a page. */
export const DEFAULT_LIMIT = 50;

/** The largest number of rows a page may hold. */
export const MAX_LIMIT = 500;

/** A where clause and the parameters it binds. */
export interface WhereClause {
  readonly clause: string;
  readonly params: SqliteBindValue[];
}

/** The column a filter names, with the metadata the codec needs. */
export function requireColumn(entity: EntityName, name: string): ColumnMeta {
  const meta = columnsFor(entity).columns[name];
  if (!meta) {
    throw new RepositoryValidationError(entity, [
      fieldIssue(name, `${name} is not a column of ${entity}`),
    ]);
  }
  return meta;
}

/** Escapes the LIKE wildcards so a search term is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Builds the where clause of a list query. */
export function buildWhere(entity: EntityName, query: ListQuery): WhereClause {
  const columns = columnsFor(entity);
  const clauses: string[] = [];
  const params: SqliteBindValue[] = [];

  if (!query.includeDeleted && columns.columns.deleted_at !== undefined) {
    clauses.push('"deleted_at" IS NULL');
  }

  for (const [name, value] of Object.entries(query.where ?? {})) {
    const meta = requireColumn(entity, name);
    if (value === null) {
      clauses.push(`"${name}" IS NULL`);
      continue;
    }
    clauses.push(`"${name}" = ?`);
    params.push(encodeValue(value, meta));
  }

  for (const [name, condition] of Object.entries(query.conditions ?? {})) {
    const meta = requireColumn(entity, name);
    const operators = buildCondition(entity, name, condition, meta);
    clauses.push(operators.clause);
    params.push(...operators.params);
  }

  const searchTerm = query.search?.term.trim().toLowerCase() ?? '';
  if (searchTerm && query.search && query.search.fields.length > 0) {
    const pattern = `%${escapeLike(searchTerm)}%`;
    const searchClauses: string[] = [];
    for (const name of query.search.fields) {
      requireColumn(entity, name);
      searchClauses.push(`LOWER(CAST("${name}" AS TEXT)) LIKE ? ESCAPE '\\'`);
      params.push(pattern);
    }
    clauses.push(`(${searchClauses.join(' OR ')})`);
  }

  return {
    clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

/**
 * Builds the order of a list query.
 *
 * The primary key is always the last term, so two rows with the same sort key keep a
 * stable order and a page never repeats or drops a row.
 */
export function buildOrder(entity: EntityName, query: ListQuery): string {
  const columns = columnsFor(entity);
  const parts: string[] = [];

  for (const spec of query.orderBy ?? []) {
    requireColumn(entity, spec.field);
    parts.push(`"${spec.field}" ${spec.direction === 'desc' ? 'DESC' : 'ASC'}`);
  }

  parts.push(`"${columns.primaryKey}" ASC`);
  return `ORDER BY ${parts.join(', ')}`;
}

/** The number of rows a page holds, within the limits. */
export function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.trunc(limit), MAX_LIMIT));
}

/** The offset a page starts at. */
export function pageOffset(entity: EntityName, query: ListQuery): number {
  if (query.cursor !== undefined) return decodeCursor(entity, query.cursor);
  return Math.max(0, query.offset ?? 0);
}

/** The opaque cursor that points at the next page. */
export function encodeCursor(offset: number): string {
  return btoa(`offset:${offset}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Reads the offset out of a cursor this repository issued. */
export function decodeCursor(entity: EntityName, cursor: string): number {
  let decoded: string;
  try {
    decoded = atob(cursor.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    throw new RepositoryValidationError(entity, [
      fieldIssue('cursor', 'the cursor is not a cursor this repository issued'),
    ]);
  }

  const match = /^offset:(\d+)$/.exec(decoded);
  if (!match) {
    throw new RepositoryValidationError(entity, [
      fieldIssue('cursor', 'the cursor is not a cursor this repository issued'),
    ]);
  }

  return Number(match[1]);
}

function buildCondition(
  entity: EntityName,
  name: string,
  condition: FilterCondition,
  meta: ColumnMeta
): { clause: string; params: SqliteBindValue[] } {
  const clauses: string[] = [];
  const params: SqliteBindValue[] = [];

  const push = (clause: string, value?: unknown): void => {
    clauses.push(clause);
    if (value !== undefined) params.push(encodeValue(value, meta));
  };

  if (condition.isNull === true) push(`"${name}" IS NULL`);
  if (condition.isNull === false) push(`"${name}" IS NOT NULL`);
  if ('equals' in condition) push(`"${name}" = ?`, condition.equals);
  if ('notEquals' in condition) push(`"${name}" <> ?`, condition.notEquals);
  if (Array.isArray(condition.in)) {
    const values = condition.in;
    if (values.length === 0) {
      clauses.push('0 = 1');
    } else {
      clauses.push(`"${name}" IN (${values.map(() => '?').join(', ')})`);
      for (const value of values) params.push(encodeValue(value, meta));
    }
  }
  if (typeof condition.contains === 'string') {
    clauses.push(`"${name}" LIKE ?`);
    params.push(`%${condition.contains}%`);
  }
  if (typeof condition.startsWith === 'string') {
    clauses.push(`"${name}" LIKE ?`);
    params.push(`${condition.startsWith}%`);
  }
  if (condition.greaterThan !== undefined) push(`"${name}" > ?`, condition.greaterThan);
  if (condition.greaterThanOrEqual !== undefined) {
    push(`"${name}" >= ?`, condition.greaterThanOrEqual);
  }
  if (condition.lessThan !== undefined) push(`"${name}" < ?`, condition.lessThan);
  if (condition.lessThanOrEqual !== undefined) {
    push(`"${name}" <= ?`, condition.lessThanOrEqual);
  }

  if (clauses.length === 0) {
    throw new RepositoryValidationError(entity, [
      fieldIssue(name, `the filter on ${name} has no condition`),
    ]);
  }

  return { clause: clauses.join(' AND '), params };
}

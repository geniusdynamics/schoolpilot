// ABOUTME: The mapping of a failed statement onto a typed repository error: a unique
// ABOUTME: constraint, a dangling reference, a missing value and the rest.

import { storageFor, type EntityName } from '@/domain/schema';
import { SqliteAdapterError, type SqliteBindValue } from '@/data/adapters/sqlite';

import type { AuditRunner } from './audit';
import {
  RepositoryConflictError,
  RepositoryReferenceError,
  RepositoryStorageError,
  RepositoryValidationError,
} from './errors';
import { fieldIssue } from './schemas';

/**
 * Turns a failed write into a typed error.
 *
 * The unique constraint and the dangling reference are the two the caller can act on, so
 * they name the columns and the relation involved.
 */
export async function mapWriteError(
  entity: EntityName,
  error: unknown,
  written: Readonly<Record<string, SqliteBindValue>>,
  runner: AuditRunner
): Promise<Error> {
  if (error instanceof SqliteAdapterError) {
    if (error.constraint === 'unique') {
      const columns = uniqueColumns(error.message);
      return new RepositoryConflictError(
        entity,
        'unique',
        `${entity} breaks the unique constraint on ${columns.join(', ')}`,
        { columns }
      );
    }

    if (error.constraint === 'foreign_key') {
      const dangling = await findDanglingReference(entity, written, runner);
      if (dangling) {
        return new RepositoryReferenceError(
          entity,
          dangling.relation,
          dangling.column,
          dangling.referencedId
        );
      }
      return new RepositoryStorageError(entity, error.message, {
        cause: error,
        constraint: error.constraint,
      });
    }

    if (error.constraint === 'not_null') {
      const column = notNullColumn(error.message);
      return new RepositoryValidationError(entity, [
        fieldIssue(column, `${column} is required`),
      ]);
    }
  }

  return mapStorageError(entity, error);
}

/** Turns a raw storage failure into a typed error. */
export function mapStorageError(
  entity: EntityName | undefined,
  error: unknown
): RepositoryStorageError {
  if (error instanceof RepositoryStorageError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const constraint = error instanceof SqliteAdapterError ? error.constraint : undefined;
  return new RepositoryStorageError(entity, message, { cause: error, constraint });
}

/**
 * Finds the reference that does not resolve.
 *
 * The database refuses the write, but only says that a foreign key failed. The
 * references of the entity are read one by one, so the error can name the relation.
 */
async function findDanglingReference(
  entity: EntityName,
  written: Readonly<Record<string, SqliteBindValue>>,
  runner: AuditRunner
): Promise<{ relation: string; column: string; referencedId: string } | null> {
  const refs = storageFor(entity).refs;

  for (const [column, relation] of Object.entries(refs)) {
    const value = written[column];
    if (typeof value !== 'string' || value.length === 0) continue;

    const target = await runner.get<{ id: string }>(
      `SELECT "id" FROM "${relation}" WHERE "id" = ?`,
      [value]
    );
    if (!target) return { relation, column, referencedId: value };
  }

  return null;
}

/** The columns a unique constraint covers, from the message of the driver. */
function uniqueColumns(message: string): string[] {
  const match = /UNIQUE constraint failed:\s*(.+)$/i.exec(message);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim().split('.').pop() ?? part.trim())
    .filter((part) => part.length > 0);
}

/** The column a not-null constraint covers, from the message of the driver. */
function notNullColumn(message: string): string {
  const match = /NOT NULL constraint failed:\s*(.+)$/i.exec(message);
  if (!match) return '';
  return match[1].trim().split('.').pop() ?? match[1].trim();
}

// ABOUTME: Typed repository errors: not-found, validation with schema-aligned field paths,
// ABOUTME: unique and version conflicts, reference violations, permission denials and invariant breaks.

import type { EntityName } from '@/domain/schema';
import type { SqliteConstraintKind } from '@/data/adapters/sqlite';

export type RepositoryErrorCode =
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'reference'
  | 'permission'
  | 'invariant'
  | 'storage';

/** One validation problem, addressed by the path of the field it belongs to. */
export interface RepositoryFieldIssue {
  /**
   * Dotted path into the entity, aligned with the zod schema: `total.amount_minor`,
   * `phones.0.number`. Empty for a whole-record problem.
   */
  readonly path: string;
  readonly message: string;
  /** The zod issue code, when the problem came from the schema. */
  readonly code?: string;
}

export interface RepositoryErrorOptions {
  readonly entity?: EntityName;
  readonly id?: string;
  readonly cause?: unknown;
}

/** Base class of every error the repository raises. */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly entity?: EntityName;
  readonly id?: string;

  constructor(code: RepositoryErrorCode, message: string, options: RepositoryErrorOptions = {}) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    if (options.entity !== undefined) this.entity = options.entity;
    if (options.id !== undefined) this.id = options.id;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** The row does not exist, or is soft-deleted and the caller did not ask for it. */
export class RepositoryNotFoundError extends RepositoryError {
  constructor(entity: EntityName, id: string) {
    super('not_found', `No ${entity} row with id ${id}`, { entity, id });
    this.name = 'RepositoryNotFoundError';
  }
}

/** The payload or patch did not satisfy the entity schema. */
export class RepositoryValidationError extends RepositoryError {
  readonly issues: readonly RepositoryFieldIssue[];

  constructor(
    entity: EntityName,
    issues: readonly RepositoryFieldIssue[],
    options: RepositoryErrorOptions = {}
  ) {
    super('validation', describeIssues(entity, issues), { entity, ...options });
    this.name = 'RepositoryValidationError';
    this.issues = issues;
  }
}

/** Why a write conflicted with what is already stored. */
export type RepositoryConflictReason = 'unique' | 'stale_version';

/** A unique constraint was violated, or the caller's expected version is stale. */
export class RepositoryConflictError extends RepositoryError {
  readonly reason: RepositoryConflictReason;
  /** The columns the unique constraint covers. */
  readonly columns: readonly string[];
  readonly expectedVersion?: number;
  readonly actualVersion?: number;

  constructor(
    entity: EntityName,
    reason: RepositoryConflictReason,
    message: string,
    details: {
      readonly id?: string;
      readonly columns?: readonly string[];
      readonly expectedVersion?: number;
      readonly actualVersion?: number;
      readonly cause?: unknown;
    } = {}
  ) {
    super('conflict', message, { entity, ...details });
    this.name = 'RepositoryConflictError';
    this.reason = reason;
    this.columns = details.columns ?? [];
    if (details.expectedVersion !== undefined) this.expectedVersion = details.expectedVersion;
    if (details.actualVersion !== undefined) this.actualVersion = details.actualVersion;
  }
}

/** A foreign key did not resolve. */
export class RepositoryReferenceError extends RepositoryError {
  /** The table the dangling reference points at. */
  readonly relation: string;
  /** The column that holds the dangling reference. */
  readonly column: string;
  /** The id that could not be resolved. */
  readonly referencedId: string;

  constructor(
    entity: EntityName,
    relation: string,
    column: string,
    referencedId: string,
    options: RepositoryErrorOptions = {}
  ) {
    super(
      'reference',
      `${entity}.${column} points at ${relation} ${referencedId}, which does not exist`,
      { entity, ...options }
    );
    this.name = 'RepositoryReferenceError';
    this.relation = relation;
    this.column = column;
    this.referencedId = referencedId;
  }
}

/** The authorisation hook denied the action. */
export class RepositoryPermissionError extends RepositoryError {
  readonly action: string;

  constructor(entity: EntityName, action: string, options: RepositoryErrorOptions = {}) {
    super('permission', `Not allowed to ${action} ${entity}`, { entity, ...options });
    this.name = 'RepositoryPermissionError';
    this.action = action;
  }
}

/** A domain invariant from spec 02 §12 was broken. */
export class RepositoryInvariantError extends RepositoryError {
  /** The invariant identifier, for example `enrolment.single_active_per_calendar`. */
  readonly invariant: string;
  readonly issues: readonly RepositoryFieldIssue[];

  constructor(
    entity: EntityName,
    invariant: string,
    issues: readonly RepositoryFieldIssue[],
    options: RepositoryErrorOptions = {}
  ) {
    super('invariant', `Invariant ${invariant} was violated`, { entity, ...options });
    this.name = 'RepositoryInvariantError';
    this.invariant = invariant;
    this.issues = issues;
  }
}

/** The storage layer refused the statement. */
export class RepositoryStorageError extends RepositoryError {
  readonly constraint?: SqliteConstraintKind;

  constructor(
    entity: EntityName | undefined,
    message: string,
    options: RepositoryErrorOptions & { readonly constraint?: SqliteConstraintKind } = {}
  ) {
    super('storage', message, { ...options, entity: options.entity ?? entity });
    this.name = 'RepositoryStorageError';
    if (options.constraint !== undefined) this.constraint = options.constraint;
  }
}

function describeIssues(entity: EntityName, issues: readonly RepositoryFieldIssue[]): string {
  if (issues.length === 0) return `The ${entity} payload is not valid`;
  const first = issues[0];
  const where = first.path ? ` at ${first.path}` : '';
  return `The ${entity} payload is not valid${where}: ${first.message}`;
}

/** True when the error is (or wraps) a repository error of the given code. */
export function isRepositoryError(
  error: unknown,
  code?: RepositoryErrorCode
): error is RepositoryError {
  if (!(error instanceof RepositoryError)) return false;
  return code === undefined || error.code === code;
}

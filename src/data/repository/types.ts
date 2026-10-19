// ABOUTME: Public types of the repository layer: pages, list queries, stored rows, change
// ABOUTME: events, audit records and the authorisation hook, so services and the cache share one contract.

import type { EntityName, EntityRow } from '@/domain/schema';
import type { Id } from '@/domain/ids';

/** A page of rows plus the metadata the query cache and the pickers need. */
export interface Page<T> {
  readonly items: readonly T[];
  /** Total number of rows matching the filter, ignoring pagination. */
  readonly total: number;
  /** True when more rows exist after this page. */
  readonly hasMore: boolean;
  /** Opaque cursor for the next page; absent on the last page. */
  readonly nextCursor?: string;
}

/**
 * A stored row plus the optimistic-concurrency counter the repository maintains.
 *
 * `rowVersion` is the value the caller passes back as `expectedVersion` on the next
 * write. It is deliberately named apart from the schema so an entity that declares a
 * business `version` field (mark, report_card, fee_schedule, ...) keeps that field
 * untouched.
 */
export type RepositoryRow<E extends EntityName> = EntityRow<E> & {
  readonly id: Id<E>;
  readonly rowVersion: number;
};

/**
 * The fields a caller may write: everything the repository does not own.
 *
 * The repository generates the id, stamps the timestamps and records the actor, so a
 * payload that carries one of them is refused.
 */
export type WritableFields<E extends EntityName> = Omit<
  EntityRow<E>,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'deleted_at'
>;

/** The payload `create` accepts. */
export type CreateInput<E extends EntityName> = WritableFields<E>;

/** The payload `update` accepts: a partial patch of the writable fields. */
export type UpdateInput<E extends EntityName> = Partial<WritableFields<E>>;

/** Operators a list filter may use on one column. */
export interface FilterCondition {
  readonly equals?: unknown;
  readonly notEquals?: unknown;
  readonly in?: readonly unknown[];
  readonly contains?: string;
  readonly startsWith?: string;
  readonly greaterThan?: number | string;
  readonly greaterThanOrEqual?: number | string;
  readonly lessThan?: number | string;
  readonly lessThanOrEqual?: number | string;
  readonly isNull?: boolean;
}

/** Sort instruction for one column. */
export interface OrderSpec {
  readonly field: string;
  readonly direction?: 'asc' | 'desc';
}

/**
 * Filter, sort and paginate options for `list`.
 *
 * `where` holds equality filters, `conditions` holds operator filters. They are kept
 * apart so a JSON column value (an object) is never mistaken for a condition object.
 */
export interface ListQuery {
  /** Equality filters, one per column. */
  readonly where?: Readonly<Record<string, unknown>>;
  /** Operator filters, one per column. */
  readonly conditions?: Readonly<Record<string, FilterCondition>>;
  /** Sort order; the primary key is always appended as a stable tiebreaker. */
  readonly orderBy?: readonly OrderSpec[];
  /** Maximum rows in the page. Defaults to 50, capped at 500. */
  readonly limit?: number;
  /** Rows to skip. Ignored when `cursor` is given. */
  readonly offset?: number;
  /** Opaque cursor from a previous page's `nextCursor`. */
  readonly cursor?: string;
  /** Include soft-deleted rows. Off by default. */
  readonly includeDeleted?: boolean;
}

/** The kind of change a write produced. */
export type ChangeType = 'create' | 'update' | 'remove';

/** Options every write accepts. */
export interface WriteOptions {
  /** The acting user id, recorded on the audit event and in `created_by`/`updated_by`. */
  readonly actor?: string;
  /** Why the write happened, recorded on the audit event. */
  readonly reason?: string;
  /** Identifies the origin of the change for the query cache. Defaults to `repository`. */
  readonly origin?: string;
}

/** Options `update` accepts. The expected version is mandatory. */
export interface UpdateOptions extends WriteOptions {
  /** The row version the caller read; the write is rejected when the row moved on. */
  readonly expectedVersion: number;
}

/** Options `remove` accepts. */
export interface RemoveOptions extends WriteOptions {
  /** Optional version guard; when given, a stale row is not deleted. */
  readonly expectedVersion?: number;
}

/**
 * Emitted after every committed write and before the write promise resolves.
 *
 * The query cache subscribes to the bus to invalidate dependent views; `commitSequence`
 * orders the events and matches the tag carried by watch payloads.
 */
export interface ChangeEvent {
  readonly entity: EntityName;
  readonly type: ChangeType;
  readonly ids: readonly string[];
  readonly origin: string;
  readonly commitSequence: number;
}

/** Receives the current page of a watched query plus the commit sequence it reflects. */
export type WatchListener<T> = (rows: readonly T[], commitSequence: number) => void;

/** Cancels a subscription. */
export type Unsubscribe = () => void;

/** One audited mutation. */
export interface AuditEvent {
  readonly id: string;
  readonly entity: EntityName;
  readonly entityId: string;
  readonly action: ChangeType;
  readonly actorId: string | null;
  /** Names of the fields the mutation touched. */
  readonly changedFields: readonly string[];
  /** The row before the mutation, or null for a create. */
  readonly before: unknown;
  /** The row after the mutation, or null for a remove. */
  readonly after: unknown;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly commitSequence: number;
}

/** Filter for reading the audit trail. */
export interface AuditQuery {
  readonly entity?: EntityName;
  readonly entityId?: string;
  readonly action?: ChangeType;
  readonly limit?: number;
  readonly offset?: number;
}

/** What a caller is trying to do; the authorisation hook receives it. */
export type RepositoryAction =
  | 'read'
  | 'list'
  | 'watch'
  | 'create'
  | 'update'
  | 'remove'
  | 'audit';

/** The request an {@link Authorizer} judges. */
export interface AuthorizationRequest {
  readonly action: RepositoryAction;
  readonly entity: EntityName;
  readonly id?: string;
  /** The row the action applies to, when one is known. */
  readonly row?: Readonly<Record<string, unknown>>;
}

/**
 * Decides whether an action is allowed. Throwing a `RepositoryPermissionError` denies it.
 *
 * The role and permission model itself is spec 02 §11 and is not modelled yet; the hook
 * is the seam a later task fills in.
 */
export type Authorizer = (request: AuthorizationRequest) => void;

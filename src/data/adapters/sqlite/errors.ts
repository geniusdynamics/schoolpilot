// ABOUTME: Typed errors raised by the SQLite adapter, including the constraint kind callers
// ABOUTME: need to turn a failed write into a field-level validation message.

export type SqliteAdapterErrorCode =
  | 'not_open'
  | 'driver'
  | 'constraint'
  | 'nested_transaction'
  | 'transaction';

export type SqliteConstraintKind =
  | 'unique'
  | 'not_null'
  | 'foreign_key'
  | 'check';

export interface SqliteAdapterErrorOptions {
  code: SqliteAdapterErrorCode;
  sql?: string;
  constraint?: SqliteConstraintKind;
  cause?: unknown;
}

/** All adapter and driver failures surface as this shape. */
export class SqliteAdapterError extends Error {
  readonly code: SqliteAdapterErrorCode;
  readonly sql?: string;
  readonly constraint?: SqliteConstraintKind;

  constructor(message: string, options: SqliteAdapterErrorOptions) {
    super(message);
    this.name = 'SqliteAdapterError';
    this.code = options.code;
    this.sql = options.sql;
    this.constraint = options.constraint;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/** Map SQLite's constraint messages onto a stable kind for callers. */
export function constraintKind(message: string): SqliteConstraintKind | undefined {
  if (/UNIQUE constraint failed/i.test(message)) return 'unique';
  if (/NOT NULL constraint failed/i.test(message)) return 'not_null';
  if (/FOREIGN KEY constraint failed/i.test(message)) return 'foreign_key';
  if (/CHECK constraint failed/i.test(message)) return 'check';
  return undefined;
}

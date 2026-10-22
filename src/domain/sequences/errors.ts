// ABOUTME: Typed errors of the sequence module: a malformed definition or format, a store
// ABOUTME: refusal, and the policy conflict a burn allocation hits inside an open transaction.

/** What went wrong, so a caller can branch without matching on the message. */
export type SequenceErrorCode =
  | 'definition'
  | 'format'
  | 'storage'
  | 'conflict'
  | 'nested_transaction'
  | 'policy';

/** The base of every error this module raises. */
export class SequenceError extends Error {
  readonly code: SequenceErrorCode;

  constructor(code: SequenceErrorCode, message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = 'SequenceError';
    this.code = code;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** A sequence definition is inconsistent: a missing scope, a token nothing renders, a bad reset. */
export class SequenceDefinitionError extends SequenceError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super('definition', message, options);
    this.name = 'SequenceDefinitionError';
  }
}

/** A number pattern is malformed, or a value cannot be rendered into it. */
export class SequenceFormatError extends SequenceError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super('format', message, options);
    this.name = 'SequenceFormatError';
  }
}

/** The store refused or could not complete the operation. */
export class SequenceStoreError extends SequenceError {
  constructor(code: 'storage' | 'nested_transaction', message: string, options: { cause?: unknown } = {}) {
    super(code, message, options);
    this.name = 'SequenceStoreError';
  }
}

/**
 * The store's uniqueness refused the number: it is already in the ledger.
 *
 * This is the guard that makes "never reused" a property of the database rather than of the
 * code: even a reset or a replayed block cannot record the same number twice.
 */
export class SequenceConflictError extends SequenceError {
  readonly sequence: string;
  readonly scopeKey: string;
  readonly seq: number;
  readonly number: string;

  constructor(
    input: { sequence: string; scopeKey: string; seq: number; number: string },
    message: string,
    options: { cause?: unknown } = {}
  ) {
    super('conflict', message, options);
    this.name = 'SequenceConflictError';
    this.sequence = input.sequence;
    this.scopeKey = input.scopeKey;
    this.seq = input.seq;
    this.number = input.number;
  }
}

/** A failure policy could not be honoured where it was called. */
export class SequencePolicyError extends SequenceError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super('policy', message, options);
    this.name = 'SequencePolicyError';
  }
}

/** True for every error this module raises. */
export function isSequenceError(error: unknown): error is SequenceError {
  return error instanceof SequenceError;
}

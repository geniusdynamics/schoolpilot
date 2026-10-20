// ABOUTME: The errors the domain services raise themselves: a reference that does not resolve, a
// ABOUTME: rule the service owns, a duplicate the caller has to resolve, and a failure the
// ABOUTME: service does not know.

import type { EntityName } from '@/domain/schema';

/**
 * Why a service refused the call.
 *
 * The repository's own errors (not found, validation, conflict, reference, permission,
 * invariant, storage) are never wrapped: a service that hits one lets it through, so the
 * caller sees the typed error of the layer that refused the write.
 */
export type ServiceErrorCode =
  /** A row the service had to resolve does not exist: the caller's input names it. */
  | 'missing_reference'
  /** The caller's input breaks a rule the service owns. */
  | 'invalid_request'
  /** The write would duplicate a row that already exists. */
  | 'duplicate'
  /** The register's date lies outside the academic period it names. */
  | 'out_of_period'
  /** The work failed for a reason the service does not know. */
  | 'failed';

export interface ServiceErrorOptions {
  /** The entity the refusal is about. */
  readonly entity?: EntityName;
  /** The id of the row the refusal is about. */
  readonly id?: string;
  /** The failure that led to this one. */
  readonly cause?: unknown;
}

/** A refusal that belongs to the service, not to the repository. */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly entity?: EntityName;
  readonly id?: string;

  constructor(code: ServiceErrorCode, message: string, options: ServiceErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ServiceError';
    this.code = code;
    if (options.entity !== undefined) this.entity = options.entity;
    if (options.id !== undefined) this.id = options.id;
  }
}

/** True when the error is a service error, optionally of the given code. */
export function isServiceError(error: unknown, code?: ServiceErrorCode): error is ServiceError {
  if (!(error instanceof ServiceError)) return false;
  return code === undefined || error.code === code;
}

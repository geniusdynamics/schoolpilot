// ABOUTME: Turns a typed refusal of the repository, a domain service or the billing run into the
// ABOUTME: status and JSON body a client reads, so no route repeats the mapping.

import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryInvariantError,
  RepositoryNotFoundError,
  RepositoryPermissionError,
  RepositoryReferenceError,
  RepositoryValidationError,
} from '@/data/repository';
import { BillingError } from '@/domain/finance/billing';
import { ServiceError } from '@/domain/services';

import { AuthError } from '../auth/errors';
import { HttpError } from './http';

/** The JSON body of every refusal. */
export interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly entity?: string;
    readonly issues?: readonly unknown[];
    readonly reason?: string;
    /** Present on a locked account: the whole seconds until the lock lifts. */
    readonly retryAfterSeconds?: number;
  };
}

export interface ErrorResponse {
  readonly status: number;
  readonly body: ErrorBody;
}

export function errorResponse(error: unknown): ErrorResponse {
  if (error instanceof HttpError) {
    return refuse(error.status, error.code, error.message);
  }

  if (error instanceof AuthError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.retryAfterSeconds !== undefined
            ? { retryAfterSeconds: error.retryAfterSeconds }
            : {}),
        },
      },
    };
  }

  if (error instanceof RepositoryValidationError) {
    return {
      ...refuse(400, 'validation', error.message, error.entity),
      body: {
        error: {
          code: 'validation',
          message: error.message,
          ...(error.entity !== undefined ? { entity: error.entity } : {}),
          issues: error.issues,
        },
      },
    };
  }

  if (error instanceof RepositoryConflictError) {
    return {
      ...refuse(409, error.reason, error.message, error.entity),
      body: {
        error: {
          code: error.reason,
          message: error.message,
          ...(error.entity !== undefined ? { entity: error.entity } : {}),
        },
      },
    };
  }

  if (error instanceof RepositoryNotFoundError) {
    return refuse(404, 'not_found', error.message, error.entity);
  }

  if (error instanceof RepositoryReferenceError) {
    return refuse(409, 'reference', error.message, error.entity);
  }

  if (error instanceof RepositoryPermissionError) {
    return refuse(403, 'permission', error.message, error.entity);
  }

  if (error instanceof RepositoryInvariantError) {
    return {
      ...refuse(422, 'invariant', error.message, error.entity),
      body: {
        error: {
          code: 'invariant',
          message: error.message,
          ...(error.entity !== undefined ? { entity: error.entity } : {}),
          issues: error.issues,
        },
      },
    };
  }

  if (error instanceof RepositoryError) {
    const status = error.code === 'storage' ? 500 : 422;
    return refuse(status, error.code, error.message, error.entity);
  }

  if (error instanceof ServiceError) {
    return refuse(serviceStatus(error.code), error.code, error.message, error.entity);
  }

  if (error instanceof BillingError) {
    return refuse(billingStatus(error.code), error.code, error.message);
  }

  return refuse(
    500,
    'internal',
    error instanceof Error ? error.message : 'the hub failed to handle the request'
  );
}

function refuse(
  status: number,
  code: string,
  message: string,
  entity?: string
): ErrorResponse {
  return {
    status,
    body: {
      error: {
        code,
        message,
        ...(entity !== undefined ? { entity } : {}),
      },
    },
  };
}

/** The status a service refusal maps to. */
function serviceStatus(code: ServiceError['code']): number {
  switch (code) {
    case 'duplicate':
      return 409;
    case 'missing_reference':
    case 'out_of_period':
      return 422;
    case 'invalid_request':
      return 400;
    case 'failed':
      return 500;
  }
}

/** The status a billing refusal maps to. */
function billingStatus(code: BillingError['code']): number {
  switch (code) {
    case 'no_transaction':
    case 'storage':
      return 500;
    case 'request_invalid':
    case 'charge_invalid':
    case 'currency_mismatch':
    case 'period_invalid':
      return 400;
    case 'period_missing':
    case 'institution_missing':
    case 'learner_missing':
      return 422;
  }
}

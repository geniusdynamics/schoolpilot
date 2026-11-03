// ABOUTME: The sentences the finance screens show when the canonical repository refuses a write, so
// ABOUTME: a duplicate, an invariant, a stale write and a permission refusal reach the reader as what they are.

import {
  RepositoryConflictError,
  RepositoryInvariantError,
  RepositoryPermissionError,
  RepositoryReferenceError,
  RepositoryValidationError,
} from '@/data/repository';
import { permissionMessageFor } from '@/data/auth/permissionMessages';

const CONFLICT_UNIQUE = 'A record with the same key already exists.';
const CONFLICT_STALE = 'This record changed after you opened it. Reload the page and try again.';

/** The message a finance page shows for any failed repository write. */
export function messageOf(error: unknown): string {
  if (error instanceof RepositoryConflictError) {
    return error.reason === 'stale_version' ? CONFLICT_STALE : CONFLICT_UNIQUE;
  }
  if (error instanceof RepositoryInvariantError) {
    return error.issues[0]?.message
      ? `The change was refused: ${error.issues[0].message}.`
      : `The change was refused by ${error.invariant}.`;
  }
  if (error instanceof RepositoryValidationError) {
    return error.issues.length
      ? `Check the form: ${error.issues.map((issue) => issue.message).join('; ')}`
      : 'The form did not pass validation.';
  }
  if (error instanceof RepositoryReferenceError) {
    return `A referenced record no longer exists (${error.column}).`;
  }
  if (error instanceof RepositoryPermissionError) {
    return permissionMessageFor(error) ?? 'You are not allowed to make this change.';
  }
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'The change could not be saved.';
}

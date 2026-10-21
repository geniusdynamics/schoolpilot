// ABOUTME: The sentences the academics pages show when the repository refuses a write, so a
// ABOUTME: duplicate, an invariant and a stale write each reach the user as what they are.

import {
  RepositoryConflictError,
  RepositoryInvariantError,
  RepositoryPermissionError,
  RepositoryReferenceError,
  RepositoryValidationError,
} from '@/data/repository';

const CONFLICT_UNIQUE = 'A record with the same key already exists.';
const CONFLICT_STALE = 'This record changed after you opened it. Reload the page and try again.';

/** The message a page shows for any failed repository write. */
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
    return 'You are not allowed to make this change.';
  }
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'The change could not be saved.';
}

/**
 * The message a failed mark write shows.
 *
 * The repository owns the three rules a mark obeys - one mark per learner, assessment and
 * learning area; the learner is a member of a teaching group for the learning area on the
 * assessment date; the write carries the version the caller read - so the page names each
 * refusal in the register's own words instead of showing a generic failure.
 */
export function markWriteMessage(error: unknown): string {
  if (error instanceof RepositoryConflictError) {
    return error.reason === 'stale_version'
      ? 'This mark was changed by someone else after it was loaded. Reload the register and enter the score again.'
      : 'A mark already exists for this learner in this assessment and learning area.';
  }
  if (error instanceof RepositoryInvariantError) {
    if (error.invariant === 'mark.teaching_group_membership') {
      return 'This learner is not a member of the selected teaching group for this learning area on the assessment date, so the mark was not saved.';
    }
    return error.issues[0]?.message
      ? `The mark was refused: ${error.issues[0].message}.`
      : `The mark was refused by ${error.invariant}.`;
  }
  if (error instanceof RepositoryValidationError) {
    return error.issues.length
      ? `The mark was refused: ${error.issues.map((issue) => issue.message).join('; ')}`
      : 'The mark was refused because it did not pass validation.';
  }
  return messageOf(error);
}

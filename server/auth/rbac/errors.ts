// ABOUTME: The typed refusals of the server's authorisation layer: the status and stable code a
// ABOUTME: client reads when a permission is missing, a duty is separated or a decision is wrong.

/** The refusals the authorisation layer and the approval engine raise. */
export type RbacErrorCode =
  | 'permission'
  | 'self_approval'
  | 'already_decided'
  | 'unknown_action'
  | 'not_found'
  | 'reason_required';

const STATUS: Record<RbacErrorCode, number> = {
  // The code is `permission`, the same code the repository's authorisation hook answers with, so a
  // client that handles one refusal handles both.
  permission: 403,
  self_approval: 403,
  already_decided: 409,
  unknown_action: 404,
  not_found: 404,
  reason_required: 422,
};

/**
 * A refusal of the authorisation layer.
 *
 * The message names what was missing - the permission, the action, the approval - so the refusal is
 * actionable rather than a bare 403.
 */
export class RbacError extends Error {
  readonly status: number;
  readonly code: RbacErrorCode;

  constructor(code: RbacErrorCode, message: string) {
    super(message);
    this.name = 'RbacError';
    this.status = STATUS[code];
    this.code = code;
  }
}

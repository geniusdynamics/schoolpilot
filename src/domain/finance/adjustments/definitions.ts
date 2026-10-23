// ABOUTME: The workflow definitions the adjustments module binds to its own documents, and the one
// ABOUTME: rule the engine's guard cannot carry: a maker may not decide their own request. The
// ABOUTME: refund's approval is the two-step maker-checker of spec 05 section 11; the write-off's is
// ABOUTME: the same shape over a document with no canonical entity; the clearance is a document that
// ABOUTME: is cleared only when its stated conditions hold.

import { defineWorkflow, type WorkflowDefinition } from '@/domain/workflows';
import type { Role } from '@/data/auth';

import { AdjustmentError } from './errors';
import { DEFAULT_APPROVER_ROLES } from './types';

/** The key of the workflow that governs a refund's approval. */
export const REFUND_APPROVAL_WORKFLOW_KEY = 'finance.refund_approval';
/** The key of the workflow that governs a write-off's approval. */
export const WRITE_OFF_APPROVAL_WORKFLOW_KEY = 'finance.write_off_approval';
/** The key of the workflow that governs a learner's exit clearance. */
export const CLEARANCE_WORKFLOW_KEY = 'finance.clearance';

/**
 * The maker-checker approval of a refund (spec 05 section 11: request, prepare, approve).
 *
 * The states are exactly the canonical `refund.status` vocabulary, so the state a module already
 * reads is the state the workflow moved and no second status column is invented. A refund is
 * `requested` by a maker; a checker `approve`s it or `reject`s it with a reason; the payout moves it
 * to `paid`. The engine's guard owns the roles, the reasoned rejection and the audit trail; the
 * maker-may-not-decide rule is added by this module, because the engine has no such concept.
 */
export function refundApprovalDefinition(
  approverRoles: readonly Role[] = DEFAULT_APPROVER_ROLES
): WorkflowDefinition {
  return defineWorkflow({
    key: REFUND_APPROVAL_WORKFLOW_KEY,
    name: 'Refund approval',
    description: 'requested → approved → paid, or a reasoned rejection. A maker may not decide their own request.',
    system: false,
    scope_entity: 'refund',
    policy: 'explicit',
    states: [
      { key: 'requested', name: 'Requested', sequence_order: 0, is_initial: true },
      { key: 'approved', name: 'Approved', sequence_order: 1 },
      { key: 'rejected', name: 'Rejected', sequence_order: 2, is_terminal: true },
      { key: 'paid', name: 'Paid', sequence_order: 3, is_terminal: true },
    ],
    transitions: [
      {
        key: 'approve',
        label: 'Approve',
        from: ['requested'],
        to: 'approved',
        allowed_roles: [...approverRoles],
      },
      {
        key: 'reject',
        label: 'Reject',
        from: ['requested'],
        to: 'rejected',
        allowed_roles: [...approverRoles],
        requires_reason: true,
      },
      {
        key: 'pay',
        label: 'Pay',
        from: ['approved'],
        to: 'paid',
        // The bursar pays out; the approver's call also drives the payout, so both may make it.
        allowed_roles: [...approverRoles, 'accountant'],
      },
    ],
  });
}

/**
 * The maker-checker approval of a write-off.
 *
 * A write-off has no canonical entity, so its state lives in the module's own audit-trail document
 * rather than in a column of a host row; the engine's guard, its roles and its reasoned rejection
 * are the same, and the transition is recorded in the repository's own audit trail.
 */
export function writeOffApprovalDefinition(
  approverRoles: readonly Role[] = DEFAULT_APPROVER_ROLES
): WorkflowDefinition {
  return defineWorkflow({
    key: WRITE_OFF_APPROVAL_WORKFLOW_KEY,
    name: 'Write-off approval',
    description: 'requested → approved, or a reasoned rejection. A maker may not decide their own request.',
    system: false,
    policy: 'explicit',
    states: [
      { key: 'requested', name: 'Requested', sequence_order: 0, is_initial: true },
      { key: 'approved', name: 'Approved', sequence_order: 1, is_terminal: true },
      { key: 'rejected', name: 'Rejected', sequence_order: 2, is_terminal: true },
    ],
    transitions: [
      {
        key: 'approve',
        label: 'Approve',
        from: ['requested'],
        to: 'approved',
        allowed_roles: [...approverRoles],
      },
      {
        key: 'reject',
        label: 'Reject',
        from: ['requested'],
        to: 'rejected',
        allowed_roles: [...approverRoles],
        requires_reason: true,
      },
    ],
  });
}

/**
 * The exit-clearance document's life.
 *
 * A learner is cleared when the stated conditions hold: the balance is settled or written off, and
 * nothing is still out (a library book, school property). The `clear` transition carries the rule as
 * a condition over the assessment, so the engine's guard refuses a clear of a learner who still owes
 * — the rule is not a check written beside the transition, it is the transition. `refuse` needs a
 * reason, because sending a learner back is a decision someone made.
 */
export function clearanceDefinition(): WorkflowDefinition {
  return defineWorkflow({
    key: CLEARANCE_WORKFLOW_KEY,
    name: 'Exit clearance',
    description: 'pending → cleared, or a reasoned refusal. Cleared only when the conditions hold.',
    system: false,
    policy: 'explicit',
    states: [
      { key: 'pending', name: 'Pending', sequence_order: 0, is_initial: true },
      { key: 'cleared', name: 'Cleared', sequence_order: 1, is_terminal: true },
      { key: 'refused', name: 'Refused', sequence_order: 2, is_terminal: true },
    ],
    transitions: [
      {
        key: 'clear',
        label: 'Clear',
        from: ['pending'],
        to: 'cleared',
        allowed_permissions: ['finance.write'],
        condition: { kind: 'field_equals', field: 'clearable', value: true },
      },
      {
        key: 'refuse',
        label: 'Refuse',
        from: ['pending'],
        to: 'refused',
        allowed_permissions: ['finance.write'],
        requires_reason: true,
      },
    ],
  });
}

/**
 * Refuses a decision by the person who made the request.
 *
 * The engine's guard has no notion of self-approval: it knows the actor's roles and permissions, not
 * who raised the request. Segregation of duties is a fact of the document, so the rule lives here,
 * where the maker is known, and every approval path calls it before the engine is asked to move.
 */
export function assertMakerIsNotDecider(
  makerId: string | null,
  deciderId: string,
  subject: string
): void {
  if (makerId !== null && makerId === deciderId) {
    throw new AdjustmentError(
      'maker_cannot_approve',
      `${subject} is decided by someone other than the person who requested it.`,
      { makerId, deciderId }
    );
  }
}

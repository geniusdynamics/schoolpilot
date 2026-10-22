// ABOUTME: The catalogue of common workflows: the seeded system workflows a module reuses instead of
// ABOUTME: inventing another status enum, plus the lookup that resolves one by its key.

import { defineWorkflow } from './definition';
import type { WorkflowDefinition } from './types';

/** The mark entry lifecycle of one assessment x teaching group (spec 03 §9). */
export const MARKS_LIFECYCLE_KEY = 'academics.marks_lifecycle';

/**
 * A group's marks move forward through the life of the assessment, and a move back is an exception.
 *
 * `open` is the editable floor. `submitted` is the teacher's own decision, `moderated` an
 * examiner's, `locked` the school's, and `published` part of a released result. From `moderated`
 * onwards a mark is a decision someone made, so editing it is an override and needs a reason:
 * that is the `requires_reason_on_leave` flag on those three states, not a property of a move.
 */
export const marksLifecycle: WorkflowDefinition = defineWorkflow({
  key: MARKS_LIFECYCLE_KEY,
  name: 'Marks lifecycle',
  description:
    'open → submitted → moderated → locked → published. Moving back is a reopen and needs a reason.',
  system: true,
  scope_entity: 'mark',
  policy: 'sequence',
  states: [
    { key: 'open', name: 'Open', sequence_order: 0, is_initial: true },
    { key: 'submitted', name: 'Submitted', sequence_order: 1 },
    { key: 'moderated', name: 'Moderated', sequence_order: 2, requires_reason_on_leave: true },
    { key: 'locked', name: 'Locked', sequence_order: 3, requires_reason_on_leave: true },
    { key: 'published', name: 'Published', sequence_order: 4, requires_reason_on_leave: true },
  ],
  transitions: [],
});

/** The promotion run of one academic year (spec 04 §6). */
export const PROMOTION_RUN_KEY = 'enrolment.promotion_run';

/**
 * A run is computed, approved by the head teacher, committed in one transaction, and undone while
 * the next year has not been billed. The approval is the role-guarded move; the commit and the undo
 * are permission-guarded.
 */
export const promotionRun: WorkflowDefinition = defineWorkflow({
  key: PROMOTION_RUN_KEY,
  name: 'Promotion run',
  description: 'computed → approved → committed → undone. Only the head may approve.',
  system: true,
  scope_entity: 'promotion_decision',
  policy: 'explicit',
  states: [
    { key: 'computed', name: 'Computed', sequence_order: 0, is_initial: true },
    { key: 'approved', name: 'Approved', sequence_order: 1 },
    { key: 'committed', name: 'Committed', sequence_order: 2 },
    { key: 'undone', name: 'Undone', sequence_order: 3, is_terminal: true },
  ],
  transitions: [
    {
      key: 'approve',
      label: 'Approve',
      from: ['computed'],
      to: 'approved',
      allowed_roles: ['head_teacher', 'administrator'],
      allowed_permissions: ['enrolment.write'],
      effects: ['notify:promotion_approved'],
    },
    {
      key: 'commit',
      label: 'Commit',
      from: ['approved'],
      to: 'committed',
      allowed_permissions: ['enrolment.write'],
      effects: ['notify:promotion_committed'],
    },
    {
      key: 'undo',
      label: 'Undo',
      from: ['committed'],
      to: 'undone',
      allowed_permissions: ['enrolment.write'],
      effects: ['notify:promotion_undone'],
    },
  ],
});

/** The approval of a fee schedule before it is published to payers (spec 05). */
export const FEE_SCHEDULE_APPROVAL_KEY = 'finance.fee_schedule_approval';

export const feeScheduleApproval: WorkflowDefinition = defineWorkflow({
  key: FEE_SCHEDULE_APPROVAL_KEY,
  name: 'Fee schedule approval',
  description: 'draft → submitted → approved → published → archived, with a reasoned rejection.',
  system: true,
  scope_entity: 'fee_schedule',
  policy: 'explicit',
  states: [
    { key: 'draft', name: 'Draft', sequence_order: 0, is_initial: true },
    { key: 'submitted', name: 'Submitted', sequence_order: 1 },
    { key: 'approved', name: 'Approved', sequence_order: 2 },
    { key: 'published', name: 'Published', sequence_order: 3 },
    { key: 'archived', name: 'Archived', sequence_order: 4, is_terminal: true },
  ],
  transitions: [
    {
      key: 'submit',
      label: 'Submit for approval',
      from: ['draft'],
      to: 'submitted',
      allowed_permissions: ['finance.write'],
    },
    {
      key: 'approve',
      label: 'Approve',
      from: ['submitted'],
      to: 'approved',
      allowed_roles: ['head_teacher', 'administrator', 'accountant'],
      allowed_permissions: ['fee_schedule.approve'],
      effects: ['notify:fee_schedule_approved'],
    },
    {
      key: 'reject',
      label: 'Send back',
      from: ['submitted'],
      to: 'draft',
      allowed_permissions: ['fee_schedule.approve'],
      requires_reason: true,
    },
    {
      key: 'publish',
      label: 'Publish',
      from: ['approved'],
      to: 'published',
      allowed_permissions: ['finance.write'],
      effects: ['notify:fee_schedule_published'],
    },
    {
      key: 'archive',
      label: 'Archive',
      from: ['published'],
      to: 'archived',
      allowed_permissions: ['finance.write'],
    },
  ],
});

/** The posting life of a finance document: it is a draft, then posted, then voided. */
export const DOCUMENT_POSTED_KEY = 'finance.document_posted';

export const documentPosted: WorkflowDefinition = defineWorkflow({
  key: DOCUMENT_POSTED_KEY,
  name: 'Finance document posted',
  description: 'draft → posted → void. A void needs a reason.',
  system: true,
  scope_entity: 'invoice',
  policy: 'explicit',
  states: [
    { key: 'draft', name: 'Draft', sequence_order: 0, is_initial: true },
    { key: 'posted', name: 'Posted', sequence_order: 1 },
    { key: 'void', name: 'Void', sequence_order: 2, is_terminal: true },
  ],
  transitions: [
    {
      key: 'post',
      label: 'Post',
      from: ['draft'],
      to: 'posted',
      allowed_permissions: ['invoice.post'],
    },
    {
      key: 'void',
      label: 'Void',
      from: ['posted'],
      to: 'void',
      allowed_permissions: ['payment.void'],
      requires_reason: true,
    },
  ],
});

/**
 * The two-step approval a module binds to its own entity: a draft is submitted, then approved or
 * sent back. It carries no scope entity and no permission of its own; a module binds it by naming
 * the permission its own approvers hold.
 */
export const TWO_STEP_APPROVAL_KEY = 'approval.two_step';

export const twoStepApproval: WorkflowDefinition = defineWorkflow({
  key: TWO_STEP_APPROVAL_KEY,
  name: 'Two-step approval',
  description: 'draft → pending approval → approved | rejected. A rejection needs a reason.',
  system: true,
  policy: 'explicit',
  states: [
    { key: 'draft', name: 'Draft', sequence_order: 0, is_initial: true },
    { key: 'pending_approval', name: 'Pending approval', sequence_order: 1 },
    { key: 'approved', name: 'Approved', sequence_order: 2, is_terminal: true },
    { key: 'rejected', name: 'Rejected', sequence_order: 3, is_terminal: true },
  ],
  transitions: [
    { key: 'submit', label: 'Submit', from: ['draft'], to: 'pending_approval' },
    { key: 'approve', label: 'Approve', from: ['pending_approval'], to: 'approved' },
    {
      key: 'reject',
      label: 'Reject',
      from: ['pending_approval'],
      to: 'rejected',
      requires_reason: true,
    },
  ],
});

/** The verify-and-resolve loop a cross-check runs: pending, verified, discrepancy, resolved. */
export const REVIEW_VERIFY_KEY = 'review.verify';

export const reviewVerify: WorkflowDefinition = defineWorkflow({
  key: REVIEW_VERIFY_KEY,
  name: 'Review and verify',
  description: 'pending → verified | discrepancy → resolved. A discrepancy and a resolve are reasoned.',
  system: true,
  policy: 'explicit',
  states: [
    { key: 'pending', name: 'Pending', sequence_order: 0, is_initial: true },
    { key: 'verified', name: 'Verified', sequence_order: 1, is_terminal: true },
    { key: 'discrepancy', name: 'Discrepancy', sequence_order: 2 },
    { key: 'resolved', name: 'Resolved', sequence_order: 3, is_terminal: true },
  ],
  transitions: [
    { key: 'verify', label: 'Verify', from: ['pending'], to: 'verified' },
    {
      key: 'flag',
      label: 'Flag a discrepancy',
      from: ['pending'],
      to: 'discrepancy',
      requires_reason: true,
    },
    {
      key: 'resolve',
      label: 'Resolve',
      from: ['discrepancy'],
      to: 'resolved',
      requires_reason: true,
    },
  ],
});

/** The plain record life a module reuses when a thing is a draft, then active, then closed. */
export const LIFECYCLE_DRAFT_ACTIVE_CLOSED_KEY = 'lifecycle.draft_active_closed';

export const lifecycleDraftActiveClosed: WorkflowDefinition = defineWorkflow({
  key: LIFECYCLE_DRAFT_ACTIVE_CLOSED_KEY,
  name: 'Draft, active, closed',
  description: 'draft → active → closed → archived. Moving back needs a reason.',
  system: true,
  policy: 'sequence',
  states: [
    { key: 'draft', name: 'Draft', sequence_order: 0, is_initial: true },
    { key: 'active', name: 'Active', sequence_order: 1 },
    { key: 'closed', name: 'Closed', sequence_order: 2 },
    { key: 'archived', name: 'Archived', sequence_order: 3, is_terminal: true },
  ],
  transitions: [],
});

/** Every workflow the platform seeds. They cannot be deleted or disabled; they may be added to. */
export const SYSTEM_WORKFLOWS: readonly WorkflowDefinition[] = [
  marksLifecycle,
  promotionRun,
  feeScheduleApproval,
  documentPosted,
  twoStepApproval,
  reviewVerify,
  lifecycleDraftActiveClosed,
];

/** The seeded workflow a key names, or null. */
export function findSystemWorkflow(key: string): WorkflowDefinition | null {
  return SYSTEM_WORKFLOWS.find((workflow) => workflow.key === key) ?? null;
}

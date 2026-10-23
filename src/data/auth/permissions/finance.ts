// ABOUTME: The finance segregation-of-duties matrix of spec 05 §11 as data: each privileged action,
// ABOUTME: the permission it needs, the roles bound to it, the duty it separates from, and the
// ABOUTME: mechanism that enforces it. The gate here refuses a role that may not make or check a
// ABOUTME: move, and a decider who is the maker of the request they are deciding.

import { hasPermission, ROLE_PERMISSIONS, type Permission, type Role } from '../roles';

/**
 * The four columns of the matrix of spec 05 §11, and the catalogue role each maps to.
 *
 * The accounts clerk and the bursar are two catalogue roles rather than one: the matrix separates
 * them, and a separation the catalogue cannot name is a separation the permissions cannot enforce.
 * The head/director column is the catalogue's `head_teacher` (the registry maps a director onto it)
 * and the auditor is the read-only `auditor`.
 */
export const FINANCE_ROLES = [
  { key: 'accounts_clerk', label: 'Accounts clerk' },
  { key: 'bursar', label: 'Bursar' },
  { key: 'head_teacher', label: 'Head / Director' },
  { key: 'auditor', label: 'Auditor' },
] as const satisfies readonly { readonly key: Role; readonly label: string }[];

/**
 * How a rule of the matrix is enforced in the running system.
 *
 * - `permission` - the repository's authorisation hook consults the permission, so a role that does
 *   not hold it is refused before the write lands.
 * - `workflow` - a workflow definition's `allowed_roles` / `allowed_permissions` guard the move, and
 *   the engine's `resolveMove` refuses every other role.
 * - `identity` - the module itself refuses a decider who is the maker of the request, because the
 *   engine's guard knows the actor's roles but not who raised the request.
 * - `none` - no code gate exists today; the catalogue binds the permission but nothing consults it.
 */
export type DutyMechanism = 'permission' | 'workflow' | 'identity' | 'none';

/** One privileged finance action of the matrix: what it needs, who holds it, how it is enforced. */
export interface DutyRule {
  /** The rule's key, unique across the matrix. */
  readonly id: string;
  /** The action as the matrix names it. */
  readonly action: string;
  /** The row of spec 05 §11 the rule comes from. */
  readonly spec: string;
  /** The permission a role must hold to perform the action. */
  readonly permission: Permission;
  /** The roles the matrix binds to the permission. */
  readonly roles: readonly Role[];
  /**
   * The other side of a maker/checker pair, when the matrix splits one. No role may hold both
   * {@link permission} and this one, which is what makes the separation impossible rather than
   * merely documented.
   */
  readonly separatedFrom?: Permission;
  /** Which mechanism enforces the rule. */
  readonly mechanism: DutyMechanism;
  /** What enforces it, and why that mechanism and not another. */
  readonly enforcedBy: string;
  /** A rule the code cannot express today, or a role the catalogue binds against the matrix. */
  readonly gap?: string;
}

/**
 * The segregation-of-duties matrix of spec 05 §11, one rule per permission.
 *
 * The matrix separates a maker from a checker: the accounts clerk requests, the bursar prepares and
 * posts, the head approves. Every pair below is split across roles, so a role that holds the maker's
 * permission never holds the checker's. Where the code cannot yet express a row, `mechanism` is
 * `none` and `gap` says what is missing rather than pretending the row is enforced.
 */
export const SEGREGATION_OF_DUTIES: readonly DutyRule[] = [
  {
    id: 'receipt',
    action: 'Receipt a payment',
    spec: '05 §11 · receipt payment',
    permission: 'payment.receipt',
    roles: ['accounts_clerk', 'bursar'],
    mechanism: 'permission',
    enforcedBy:
      'permissionFor maps a payment, a payment_allocation and a receipt create to payment.receipt, so the authorisation hook refuses a role that does not hold it; the head and the auditor do not.',
  },
  {
    id: 'void.request',
    action: 'Request a same-day void',
    spec: '05 §11 · void receipt (same day)',
    permission: 'payment.void.request',
    roles: ['accounts_clerk'],
    separatedFrom: 'payment.void',
    mechanism: 'permission',
    enforcedBy:
      'The clerk holds the request permission and not payment.void, which permissionFor requires to update a receipt; the clerk cannot void what they may only ask to void.',
    gap: 'No service records a void request: the clerk\'s "request" has no code path, and the only enforced half of the row is that the clerk may not perform the void.',
  },
  {
    id: 'void',
    action: 'Void a receipt (same day)',
    spec: '05 §11 · void receipt (same day)',
    permission: 'payment.void',
    roles: ['bursar', 'head_teacher'],
    separatedFrom: 'payment.void.request',
    mechanism: 'permission',
    enforcedBy:
      'permissionFor maps a receipt update to payment.void, which PaymentsService.voidReceipt writes through; the bursar and the head hold it and the clerk does not.',
  },
  {
    id: 'refund.request',
    action: 'Request a refund',
    spec: '05 §11 · refund / write-off',
    permission: 'refund.request',
    roles: ['accounts_clerk', 'bursar'],
    separatedFrom: 'refund.approve',
    mechanism: 'workflow',
    enforcedBy:
      'The finance.refund_approval approve and reject transitions allow only DEFAULT_APPROVER_ROLES, and AdjustmentsService refuses the requester by identity; the clerk and the bursar hold no approval permission.',
    gap: 'The workflow definition names roles, not refund.approve, so the engine does not consult the permission; the catalogue binding is tested against DEFAULT_APPROVER_ROLES so the two cannot drift.',
  },
  {
    id: 'refund.approve',
    action: 'Approve a refund',
    spec: '05 §11 · refund / write-off',
    permission: 'refund.approve',
    roles: ['head_teacher'],
    separatedFrom: 'refund.request',
    mechanism: 'workflow',
    enforcedBy:
      'The finance.refund_approval approve transition allows the head and the administrator only, and the identity rule refuses the requester; the head holds refund.approve and not refund.request.',
  },
  {
    id: 'write_off.request',
    action: 'Request a write-off',
    spec: '05 §11 · refund / write-off',
    permission: 'write_off.request',
    roles: ['accounts_clerk', 'bursar'],
    separatedFrom: 'write_off.approve',
    mechanism: 'workflow',
    enforcedBy:
      'The finance.write_off_approval approve and reject transitions allow only DEFAULT_APPROVER_ROLES, and AdjustmentsService refuses the requester by identity.',
    gap: 'The definition names roles, not write_off.approve, so the engine does not consult the permission.',
  },
  {
    id: 'write_off.approve',
    action: 'Approve a write-off',
    spec: '05 §11 · refund / write-off',
    permission: 'write_off.approve',
    roles: ['head_teacher'],
    separatedFrom: 'write_off.request',
    mechanism: 'workflow',
    enforcedBy:
      'The finance.write_off_approval approve transition allows the head and the administrator only, and the identity rule refuses the requester.',
    gap: 'Below the configured threshold AdjustmentsService posts the write-off directly, so a small write-off is the bursar\'s alone; the threshold is the module\'s, not the matrix\'s.',
  },
  {
    id: 'fee_schedule.prepare',
    action: 'Edit a fee schedule',
    spec: '05 §11 · edit fee schedule',
    permission: 'finance.write',
    roles: ['bursar'],
    separatedFrom: 'fee_schedule.approve',
    mechanism: 'workflow',
    enforcedBy:
      'The submission is the finance.fee_schedule_approval submit transition, which requires finance.write; the approval is the head\'s, on the approve transition. The bursar holds finance.write and the head does not.',
    gap: 'The legacy merged accountant role also holds finance.write and fee_schedule.approve, so a different accountant may approve a schedule an accountant submitted; the identity rule is what stops one person doing both.',
  },
  {
    id: 'fee_schedule.approve',
    action: 'Approve a fee schedule',
    spec: '05 §11 · edit fee schedule',
    permission: 'fee_schedule.approve',
    roles: ['head_teacher'],
    separatedFrom: 'finance.write',
    mechanism: 'identity',
    enforcedBy:
      'The fee-schedule gateway\'s lastMakerOf refuses the actor who submitted the version, which is the one rule the engine\'s guard cannot carry; the head holds fee_schedule.approve and not finance.write.',
    gap: 'The definition also allows the accountant to approve, and the accountant holds finance.write; only the identity rule separates one person from doing both.',
  },
  {
    id: 'billing.post',
    action: 'Post a billing run',
    spec: '05 §11 · post billing run',
    permission: 'billing.post',
    roles: ['bursar'],
    separatedFrom: 'billing.post.approve',
    mechanism: 'none',
    enforcedBy:
      'The catalogue binds billing.post to the bursar and billing.post.approve to the head, so no role holds both; nothing else consults either permission yet.',
    gap: 'BillingService.post checks no permission and has no threshold, so the head\'s "approve if above the threshold" is not implemented and a caller that ignores the catalogue may post.',
  },
  {
    id: 'billing.post.approve',
    action: 'Approve a billing run above the threshold',
    spec: '05 §11 · post billing run',
    permission: 'billing.post.approve',
    roles: ['head_teacher'],
    separatedFrom: 'billing.post',
    mechanism: 'none',
    enforcedBy:
      'The catalogue reserves the approval to the head; there is no code gate and no threshold for it to gate.',
    gap: 'No threshold and no approval step exist in the billing run, so the row cannot be enforced today.',
  },
  {
    id: 'period.close.prepare',
    action: 'Prepare an accounting period close',
    spec: '05 §11 · close period',
    permission: 'period.close.prepare',
    roles: ['bursar'],
    separatedFrom: 'period.close.approve',
    mechanism: 'none',
    enforcedBy:
      'The catalogue binds the preparation to the bursar and the approval to the head, so no role holds both; nothing else consults either permission yet.',
    gap: 'LedgerService.closePeriod closes the period directly: it takes an actor and an optional reason and writes an audit entry, but there is no prepare step and no permission gate.',
  },
  {
    id: 'period.close.approve',
    action: 'Approve an accounting period close',
    spec: '05 §11 · close period',
    permission: 'period.close.approve',
    roles: ['head_teacher'],
    separatedFrom: 'period.close.prepare',
    mechanism: 'none',
    enforcedBy: 'The catalogue reserves the approval to the head; there is no code gate for it to gate.',
    gap: 'The two-step close of the matrix is not implemented; closePeriod is a single action with no approver.',
  },
  {
    id: 'discount.grant',
    action: 'Grant a discount, waiver or sponsorship',
    spec: '05 §11 · edit fee schedule (a discount changes what is billed)',
    permission: 'discount.grant',
    roles: ['bursar'],
    separatedFrom: 'discount.approve',
    mechanism: 'none',
    enforcedBy:
      'The catalogue binds the grant to the bursar and the approval to the head, so no role holds both; DiscountService writes through the repository with no permission gate.',
    gap: 'DiscountService.createRule and createSponsorship check no permission and have no approval step; the matrix names no discount row, so this pair is the task\'s addition.',
  },
  {
    id: 'discount.approve',
    action: 'Approve a discount above the threshold',
    spec: '05 §11 · edit fee schedule (a discount changes what is billed)',
    permission: 'discount.approve',
    roles: ['head_teacher'],
    separatedFrom: 'discount.grant',
    mechanism: 'none',
    enforcedBy: 'The catalogue reserves the approval to the head; there is no code gate for it to gate.',
    gap: 'No approval step and no threshold exist for a discount today.',
  },
  {
    id: 'workflow.manage',
    action: 'Manage the workflow catalogue',
    spec: '06 §5.2 · the workflow catalogue',
    permission: 'workflow.manage',
    roles: ['administrator', 'head_teacher'],
    mechanism: 'permission',
    enforcedBy:
      'assertMayManageDefinitions refuses a caller whose roles do not hold workflow.manage, and the engine calls it on every define, update and remove.',
    gap: 'Spec 05 §11 names no workflow-catalogue row; the workflow engine binds workflow.manage to the administrator and the head teacher, and the matrix keeps that binding rather than narrowing it to the administrator alone.',
  },
];

/** The finance permissions the matrix names, in the order the matrix introduces them. */
export const FINANCE_PERMISSIONS: readonly Permission[] = [
  ...new Set(SEGREGATION_OF_DUTIES.map((rule) => rule.permission)),
];

/** The rule of the matrix a key names. */
export function dutyRule(id: string): DutyRule {
  const rule = SEGREGATION_OF_DUTIES.find((candidate) => candidate.id === id);
  if (!rule) throw new Error(`no finance duty rule answers to "${id}"`);
  return rule;
}

/** The rule a permission is the maker or the checker of, or undefined when none is. */
export function dutyRuleFor(permission: Permission): DutyRule | undefined {
  return SEGREGATION_OF_DUTIES.find((rule) => rule.permission === permission);
}

/** True when one of the roles holds the permission. */
export function mayPerform(roles: readonly Role[], permission: Permission): boolean {
  return hasPermission(roles, permission);
}

/** The roles of a set that hold the permission. */
export function rolesHolding(roles: readonly Role[], permission: Permission): readonly Role[] {
  return roles.filter((role) => ROLE_PERMISSIONS[role].includes(permission));
}

/**
 * The roles of a set that hold both sides of a maker/checker pair.
 *
 * This is the test of the separation: an empty answer means the roles an actor holds cannot make
 * *and* check the same move, which is what spec 05 §11 requires. It is not empty only for a rule
 * whose pair the code cannot yet express, or for a role the catalogue has merged.
 */
export function separationViolations(roles: readonly Role[], rule: DutyRule): readonly Role[] {
  if (rule.separatedFrom === undefined) return [];
  const separated = rule.separatedFrom;
  if (!hasPermission(roles, rule.permission) || !hasPermission(roles, separated)) return [];
  // Name every role that carries one of the two sides, so the refusal points at the bundle.
  return roles.filter(
    (role) =>
      ROLE_PERMISSIONS[role].includes(rule.permission) ||
      ROLE_PERMISSIONS[role].includes(separated)
  );
}

/** The refusal of the finance gate. */
export class FinanceDutyError extends Error {
  /** `permission` when a role may not make or check a move; `self_approval` when a maker decides. */
  readonly code: 'permission' | 'self_approval';
  /** The rule the gate judged, when a rule was named. */
  readonly ruleId: string | null;

  constructor(code: FinanceDutyError['code'], message: string, ruleId: string | null = null) {
    super(message);
    this.name = 'FinanceDutyError';
    this.code = code;
    this.ruleId = ruleId;
  }
}

/**
 * Refuses a role set that does not hold the permission a finance duty needs.
 *
 * This is the gate a screen or a service calls before a privileged finance action whose module does
 * not consult the permission itself - a billing run, a period close, a discount. It is the same
 * question the repository's authorisation hook asks, asked where the action is not a repository
 * write.
 */
export function assertMayPerform(roles: readonly Role[], rule: DutyRule): void {
  if (mayPerform(roles, rule.permission)) return;
  throw new FinanceDutyError(
    'permission',
    `The roles [${roles.join(', ')}] do not hold ${rule.permission}, so they may not ${rule.action.toLowerCase()}.`,
    rule.id
  );
}

/**
 * Refuses a role set in which one role holds both sides of a maker/checker pair.
 *
 * The permission sets make the separation impossible rather than merely discouraged: a role that
 * holds the maker's permission must not hold the checker's. A caller passes the roles an actor
 * holds, and a violation is a configuration the catalogue should never have produced.
 */
export function assertSegregatedDuties(roles: readonly Role[], rule: DutyRule): void {
  const violations = separationViolations(roles, rule);
  if (violations.length === 0) return;
  throw new FinanceDutyError(
    'permission',
    `The roles [${violations.join(', ')}] hold both ${rule.permission} and ${String(rule.separatedFrom)}, so one person could both make and check ${rule.action.toLowerCase()}.`,
    rule.id
  );
}

/**
 * Refuses a decision by the person who made the request.
 *
 * The workflow engine's guard knows the actor's roles and permissions but not who raised the
 * request, so a module that separates a maker from a checker enforces it itself: the adjustments
 * module and the fee-schedule gateway both do, and this is the same rule as a shared gate for a
 * caller that does not go through either.
 */
export function assertDeciderIsNotMaker(
  makerId: string | null,
  deciderId: string,
  subject: string
): void {
  if (makerId !== null && makerId === deciderId) {
    throw new FinanceDutyError(
      'self_approval',
      `${subject} is decided by someone other than the person who requested it.`
    );
  }
}

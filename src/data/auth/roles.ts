// ABOUTME: The role and permission catalogue of spec 02 §11 and spec 06 §5.2: the roles the domain
// ABOUTME: needs, the permissions each role holds, and the canonical entity every permission covers.

import type { EntityName } from '@/domain/schema';
import type { RepositoryAction } from '@/data/repository';

/**
 * The scope kinds a role assignment can carry (spec 06 §5.2).
 *
 * - `institution` - every row of the institution that is not a finance document.
 * - `class_group` - the class groups the actor is the homeroom teacher of.
 * - `teaching_group` - the teaching groups the actor is assigned to.
 * - `finance` - the finance documents of the institution.
 */
export type ScopeKind = 'institution' | 'class_group' | 'teaching_group' | 'finance';

/** The roles the domain needs, named after the catalogue of spec 06 §5.2. */
export const ROLES = [
  'administrator',
  'head_teacher',
  'registrar',
  'class_teacher',
  'teacher',
  'accountant',
  'nurse',
  'auditor',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * The permissions of the catalogue.
 *
 * They are fine-grained (`learner.read`, `mark.write`, `invoice.post`) in the spirit of spec 06
 * §5.2. The permission of an entity is what a repository action needs; the scope then says which
 * rows of that entity the actor may touch.
 *
 * Two of them are not entity permissions:
 *
 * - `learner.medical.read` is a **field policy**: the medical record of a learner is special and
 *   restricted data (spec 06 §8.1), so the repository strips the `medical` field from the learner
 *   row of every role that does not hold this permission.
 * - `invoice.post`, `payment.void` and `fee_schedule.approve` name transitions no repository
 *   action carries; the finance services judge them.
 * - `workflow.manage` owns the workflow catalogue of `src/domain/workflows`: it gates who may add,
 *   edit or remove a workflow definition. A transition of a workflow names its own permission,
 *   which is one of the entity permissions above; this one is about the definitions themselves.
 *   The administrator holds every permission, so it is the administrator alone who curates the
 *   catalogue.
 */
export const PERMISSIONS = [
  'learner.read',
  'learner.write',
  'learner.medical.read',
  'guardian.read',
  'guardian.write',
  'class.read',
  'class.write',
  'enrolment.read',
  'enrolment.write',
  'teaching.read',
  'teaching.write',
  'assessment.read',
  'assessment.write',
  'mark.read',
  'mark.write',
  'result.read',
  'result.write',
  'report_card.read',
  'report_card.write',
  'finance.read',
  'finance.write',
  'invoice.post',
  'payment.void',
  'fee_schedule.approve',
  'staff.read',
  'staff.write',
  'institution.read',
  'institution.write',
  'reference.read',
  'reference.write',
  'audit.read',
  'attendance.read',
  'attendance.write',
  'pastoral.read',
  'pastoral.write',
  'workflow.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** The permission that reads an entity and the one that writes it. */
export interface PermissionPair {
  readonly read: Permission;
  readonly write: Permission;
}

function pair(read: Permission, write: Permission): PermissionPair {
  return { read, write };
}

/**
 * Every canonical entity and the permissions that read and write it.
 *
 * The map is exhaustive over the entity registry, so a new entity (or a renamed one) is a compile
 * error until it is mapped. It is the canonical-entity half of the permission model: the role
 * half is {@link ROLE_PERMISSIONS}, the scope half is the teaching, class and institution data the
 * actor actually holds.
 */
export const ENTITY_PERMISSIONS: Record<EntityName, PermissionPair> = {
  institution: pair('institution.read', 'institution.write'),
  attendance_session: pair('attendance.read', 'attendance.write'),
  attendance_mark: pair('attendance.read', 'attendance.write'),
  leave_out: pair('pastoral.read', 'pastoral.write'),
  conduct_incident: pair('pastoral.read', 'pastoral.write'),
  health_visit: pair('pastoral.read', 'pastoral.write'),
  institution_identifier: pair('institution.read', 'institution.write'),
  campus: pair('institution.read', 'institution.write'),
  house: pair('institution.read', 'institution.write'),
  residence: pair('institution.read', 'institution.write'),
  residence_bed: pair('institution.read', 'institution.write'),
  department: pair('staff.read', 'staff.write'),
  job_title: pair('staff.read', 'staff.write'),
  staff: pair('staff.read', 'staff.write'),
  user: pair('staff.read', 'staff.write'),
  calendar: pair('reference.read', 'reference.write'),
  calendar_event: pair('reference.read', 'reference.write'),
  academic_year: pair('reference.read', 'reference.write'),
  academic_period: pair('reference.read', 'reference.write'),
  financial_year: pair('reference.read', 'reference.write'),
  curriculum_pack: pair('reference.read', 'reference.write'),
  programme: pair('reference.read', 'reference.write'),
  stage: pair('reference.read', 'reference.write'),
  level: pair('reference.read', 'reference.write'),
  pathway: pair('reference.read', 'reference.write'),
  learning_area: pair('reference.read', 'reference.write'),
  component: pair('reference.read', 'reference.write'),
  outcome: pair('reference.read', 'reference.write'),
  competency: pair('reference.read', 'reference.write'),
  combination_rule: pair('reference.read', 'reference.write'),
  class_group: pair('class.read', 'class.write'),
  teaching_group: pair('teaching.read', 'teaching.write'),
  teaching_group_member: pair('teaching.read', 'teaching.write'),
  teaching_assignment: pair('teaching.read', 'teaching.write'),
  timetable_slot: pair('reference.read', 'reference.write'),
  timetable_entry: pair('teaching.read', 'teaching.write'),
  learning_area_enrolment: pair('teaching.read', 'teaching.write'),
  learner: pair('learner.read', 'learner.write'),
  identifier: pair('learner.read', 'learner.write'),
  guardian: pair('guardian.read', 'guardian.write'),
  learner_guardian: pair('guardian.read', 'guardian.write'),
  household: pair('guardian.read', 'guardian.write'),
  enrolment: pair('enrolment.read', 'enrolment.write'),
  enrolment_change: pair('enrolment.read', 'enrolment.write'),
  promotion_decision: pair('enrolment.read', 'enrolment.write'),
  assessment_scheme: pair('assessment.read', 'assessment.write'),
  grading_scale: pair('assessment.read', 'assessment.write'),
  assessment: pair('assessment.read', 'assessment.write'),
  comment_bank_entry: pair('assessment.read', 'assessment.write'),
  mark: pair('mark.read', 'mark.write'),
  competency_observation: pair('result.read', 'result.write'),
  result: pair('result.read', 'result.write'),
  period_result: pair('result.read', 'result.write'),
  report_card: pair('report_card.read', 'report_card.write'),
  fee_category: pair('finance.read', 'finance.write'),
  fee_item: pair('finance.read', 'finance.write'),
  fee_schedule: pair('finance.read', 'finance.write'),
  fee_schedule_line: pair('finance.read', 'finance.write'),
  discount_rule: pair('finance.read', 'finance.write'),
  installment_plan: pair('finance.read', 'finance.write'),
  sponsorship: pair('finance.read', 'finance.write'),
  invoice: pair('finance.read', 'finance.write'),
  invoice_line: pair('finance.read', 'finance.write'),
  credit_note: pair('finance.read', 'finance.write'),
  payment: pair('finance.read', 'finance.write'),
  payment_allocation: pair('finance.read', 'finance.write'),
  receipt: pair('finance.read', 'finance.write'),
  refund: pair('finance.read', 'finance.write'),
};

/**
 * The permissions each role holds.
 *
 * A role is a bundle of permissions, never a scope: the scope says which rows the role reaches,
 * the permission says what it may do with them. The administrator holds every permission; the
 * auditor holds every read permission and nothing else.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  administrator: PERMISSIONS,
  head_teacher: [
    'learner.read',
    'attendance.read',
    'attendance.write',
    'pastoral.read',
    'pastoral.write',
    'guardian.read',
    'class.read',
    'class.write',
    'enrolment.read',
    'enrolment.write',
    'teaching.read',
    'teaching.write',
    'assessment.read',
    'assessment.write',
    'mark.read',
    'mark.write',
    'result.read',
    'result.write',
    'report_card.read',
    'report_card.write',
    'finance.read',
    'staff.read',
    'institution.read',
    'reference.read',
    'audit.read',
    'workflow.manage',
  ],
  registrar: [
    'learner.read',
    'pastoral.read',
    'learner.write',
    'guardian.read',
    'guardian.write',
    'class.read',
    'class.write',
    'enrolment.read',
    'enrolment.write',
    'teaching.read',
    'assessment.read',
    'mark.read',
    'result.read',
    'report_card.read',
    'staff.read',
    'institution.read',
    'reference.read',
    'audit.read',
  ],
  class_teacher: [
    'learner.read',
    'attendance.read',
    'attendance.write',
    'pastoral.read',
    'pastoral.write',
    'guardian.read',
    'class.read',
    'enrolment.read',
    'mark.read',
    'result.read',
    'report_card.read',
    'institution.read',
    'reference.read',
  ],
  teacher: [
    'learner.read',
    'attendance.read',
    'attendance.write',
    'class.read',
    'enrolment.read',
    'teaching.read',
    'assessment.read',
    'assessment.write',
    'mark.read',
    'mark.write',
    'result.read',
    'report_card.read',
    'institution.read',
    'reference.read',
    'audit.read',
  ],
  accountant: [
    'finance.read',
    'finance.write',
    'invoice.post',
    'payment.void',
    'fee_schedule.approve',
    'learner.read',
    'institution.read',
    'reference.read',
  ],
  nurse: [
    'learner.read',
    'learner.medical.read',
    'attendance.read',
    'attendance.write',
    'pastoral.read',
    'pastoral.write',
    'class.read',
    'enrolment.read',
    'institution.read',
    'reference.read',
  ],
  auditor: PERMISSIONS.filter((permission) => permission.endsWith('.read')),
};

/**
 * The scope kinds each role is limited to.
 *
 * The scope is resolved from the data the actor holds (spec 06 §5.2): a teacher is scoped by the
 * teaching groups they are assigned to, a class teacher by the class they are the homeroom teacher
 * of, an accountant by the finance documents of the institution.
 */
export const ROLE_SCOPE_KINDS: Record<Role, readonly ScopeKind[]> = {
  administrator: ['institution', 'finance'],
  head_teacher: ['institution', 'finance'],
  registrar: ['institution'],
  nurse: ['institution'],
  auditor: ['institution', 'finance'],
  class_teacher: ['class_group'],
  teacher: ['teaching_group'],
  accountant: ['finance'],
};

/** True when one of the roles holds the permission. */
export function hasPermission(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

/** The permission a repository action needs, or undefined when no permission covers the entity. */
export function permissionFor(
  entity: EntityName,
  action: RepositoryAction
): Permission | undefined {
  const pair = ENTITY_PERMISSIONS[entity];
  if (!pair) return undefined;
  if (action === 'audit') return 'audit.read';
  if (action === 'read' || action === 'list' || action === 'watch') return pair.read;
  return pair.write;
}

/** The scope kinds the roles ask for, without duplicates. */
export function scopeKindsFor(roles: readonly Role[]): readonly ScopeKind[] {
  const kinds: ScopeKind[] = [];
  for (const role of roles) {
    for (const kind of ROLE_SCOPE_KINDS[role]) {
      if (!kinds.includes(kind)) kinds.push(kind);
    }
  }
  return kinds;
}

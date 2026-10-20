// ABOUTME: The canonical entity registry: one closed EntityName union, schema and storage lookup,
// ABOUTME: display labels and the DDL bridge entry point for every spec 02 entity.

import type { z } from 'zod/v4';

import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

import {
  attendanceMarkEntity,
  attendanceSessionEntity,
  conductIncidentEntity,
  healthVisitEntity,
  leaveOutEntity,
} from './attendance';
import { academicPeriodEntity, academicYearEntity, calendarEntity, calendarEventEntity, financialYearEntity } from './calendar';
import {
  classGroupEntity,
  teachingAssignmentEntity,
  teachingGroupEntity,
  teachingGroupMemberEntity,
  timetableEntryEntity,
  timetableSlotEntity,
} from './classGroups';
import {
  assessmentEntity,
  assessmentSchemeEntity,
  commentBankEntryEntity,
  competencyObservationEntity,
  gradingScaleEntity,
  markEntity,
  periodResultEntity,
  reportCardEntity,
  resultEntity,
} from './assessment';
import {
  combinationRuleEntity,
  competencyEntity,
  componentEntity,
  curriculumPackEntity,
  learningAreaEntity,
  levelEntity,
  outcomeEntity,
  pathwayEntity,
  programmeEntity,
  stageEntity,
} from './curriculum';
import { type EntityDefinition, type EntityStorage } from './defineEntity';
import {
  enrolmentChangeEntity,
  enrolmentEntity,
  learningAreaEnrolmentEntity,
  promotionDecisionEntity,
} from './enrolment';
import {
  creditNoteEntity,
  discountRuleEntity,
  feeCategoryEntity,
  feeItemEntity,
  feeScheduleEntity,
  feeScheduleLineEntity,
  installmentPlanEntity,
  invoiceEntity,
  invoiceLineEntity,
  paymentAllocationEntity,
  paymentEntity,
  receiptEntity,
  refundEntity,
  sponsorshipEntity,
} from './finance';
import {
  campusEntity,
  departmentEntity,
  houseEntity,
  institutionEntity,
  institutionIdentifierEntity,
  jobTitleEntity,
  residenceBedEntity,
  residenceEntity,
} from './institution';
import {
  guardianEntity,
  householdEntity,
  identifierEntity,
  learnerEntity,
  learnerGuardianEntity,
  staffEntity,
  userEntity,
} from './people';
import { toDatabaseSchema } from './storage';

export * from './assessment';
export * from './attendance';
export * from './calendar';
export * from './classGroups';
export * from './common';
export * from './curriculum';
export * from './defineEntity';
export * from './enrolment';
export * from './finance';
export * from './institution';
export * from './people';
export * from './storage';

/**
 * Every canonical entity from spec 02 that P1 persists. Keys are the `EntityName` union; the
 * registry is intentionally closed so a missing entity is a compile error.
 *
 * Scope: platform entities (spec 02 §11: role, permission, audit_event, setting, attachment,
 * and their peers) are not modelled here. They are P1-B02/P5 dependencies. P1-B02 also
 * requires `audit_event` plus a per-row `version` column for optimistic concurrency; neither
 * is part of this registry yet.
 *
 * Spec 02 deviations (P1-A03a, attendance and pastoral, spec 02 §9):
 * - `attendance_session.period_number` is not named by §9, but §9 names the session kind
 *   `period_n` and 04 §5.1 wants registers "by teaching group (per lesson)", so the register
 *   needs a lesson discriminator. It is an optional integer mirroring
 *   `timetable_slot.period_number` (a `slot_id` reference would exclude the boarding
 *   roll-calls that have no timetable slot). A `period_n` register must name its lesson.
 * - `attendance_session.academic_period_id` is not named by §9. The column is kept (one join
 *   for term reporting) but is OPTIONAL: a register for a date no academic period covers must
 *   still be writable. The date-inside-period rule is a repository invariant (P1-B04).
 * - `attendance_mark.reason` and `conduct_incident.category` are modelled as explicit enums.
 *   §9 names both fields without listing values, so these value lists are ours, not the spec's.
 * - Legacy migration (spec 02 §13): `student_attendance` and `session_attendance` become
 *   `attendance_session` plus `attendance_mark`. The legacy `period_id` becomes the session's
 *   `period_number` (the period's number), `date` the session's date, `status` the mark's
 *   status (Present/Absent/Late/Excused map onto the canonical statuses) and `student_id`
 *   the mark's `learner_id`. The legacy free-text `reason_for_absence` maps onto the `reason`
 *   enum and to `other` when it does not name one of the codes; the text itself is dropped
 *   because §9 gives the mark no free-text field. The legacy `check_in_time`/`check_out_time`
 *   gate times are dropped as well: the session's `taken_at` records when the register was
 *   taken and §9 has no gate column. The denormalised `student_name`, `period_name` and
 *   `class_name` columns are dropped because names are resolved, not stored (spec 02 §1.3).
 */
export const entityDefinitions = {
  institution: institutionEntity,
  institution_identifier: institutionIdentifierEntity,
  campus: campusEntity,
  department: departmentEntity,
  job_title: jobTitleEntity,
  house: houseEntity,
  residence: residenceEntity,
  residence_bed: residenceBedEntity,
  calendar: calendarEntity,
  academic_year: academicYearEntity,
  academic_period: academicPeriodEntity,
  calendar_event: calendarEventEntity,
  financial_year: financialYearEntity,
  curriculum_pack: curriculumPackEntity,
  programme: programmeEntity,
  stage: stageEntity,
  level: levelEntity,
  pathway: pathwayEntity,
  learning_area: learningAreaEntity,
  component: componentEntity,
  outcome: outcomeEntity,
  competency: competencyEntity,
  combination_rule: combinationRuleEntity,
  class_group: classGroupEntity,
  teaching_group: teachingGroupEntity,
  teaching_group_member: teachingGroupMemberEntity,
  teaching_assignment: teachingAssignmentEntity,
  timetable_slot: timetableSlotEntity,
  timetable_entry: timetableEntryEntity,
  learner: learnerEntity,
  identifier: identifierEntity,
  guardian: guardianEntity,
  learner_guardian: learnerGuardianEntity,
  household: householdEntity,
  staff: staffEntity,
  user: userEntity,
  enrolment: enrolmentEntity,
  enrolment_change: enrolmentChangeEntity,
  learning_area_enrolment: learningAreaEnrolmentEntity,
  promotion_decision: promotionDecisionEntity,
  assessment_scheme: assessmentSchemeEntity,
  grading_scale: gradingScaleEntity,
  assessment: assessmentEntity,
  mark: markEntity,
  competency_observation: competencyObservationEntity,
  result: resultEntity,
  period_result: periodResultEntity,
  report_card: reportCardEntity,
  comment_bank_entry: commentBankEntryEntity,
  attendance_session: attendanceSessionEntity,
  attendance_mark: attendanceMarkEntity,
  leave_out: leaveOutEntity,
  conduct_incident: conductIncidentEntity,
  health_visit: healthVisitEntity,
  fee_category: feeCategoryEntity,
  fee_item: feeItemEntity,
  fee_schedule: feeScheduleEntity,
  fee_schedule_line: feeScheduleLineEntity,
  discount_rule: discountRuleEntity,
  sponsorship: sponsorshipEntity,
  installment_plan: installmentPlanEntity,
  invoice: invoiceEntity,
  invoice_line: invoiceLineEntity,
  credit_note: creditNoteEntity,
  payment: paymentEntity,
  payment_allocation: paymentAllocationEntity,
  receipt: receiptEntity,
  refund: refundEntity,
} as const satisfies Record<string, EntityDefinition>;

export type EntityName = keyof typeof entityDefinitions;
export type EntitySchema<E extends EntityName> = (typeof entityDefinitions)[E]['schema'];
export type EntityRow<E extends EntityName> = z.output<EntitySchema<E>>;

/** Runtime list of every entity name; mirrors the compile-time `EntityName` union. */
export const ENTITY_NAMES = Object.keys(entityDefinitions) as readonly EntityName[];

export const schemasByEntity = Object.fromEntries(
  ENTITY_NAMES.map((name) => [name, entityDefinitions[name].schema])
) as unknown as Record<EntityName, z.ZodType>;

export const storageByEntity = Object.fromEntries(
  ENTITY_NAMES.map((name) => [name, entityDefinitions[name].storage])
) as unknown as Record<EntityName, EntityStorage>;

export function schemaFor<E extends EntityName>(entity: E): EntitySchema<E> {
  return entityDefinitions[entity].schema;
}

export function storageFor<E extends EntityName>(entity: E): EntityStorage {
  return entityDefinitions[entity].storage;
}

export function databaseSchemaFor<E extends EntityName>(entity: E): DatabaseSchema {
  return toDatabaseSchema(storageFor(entity), schemaFor(entity));
}

/** Resolves the display label for a row through that entity's label function. */
export function labelOf<E extends EntityName>(entity: E, row: EntityRow<E>): string {
  const definition = entityDefinitions[entity] as unknown as EntityDefinition<EntitySchema<E>>;
  return definition.label(row);
}

/** True when `name` is one of the registered canonical entities. */
export function isEntityName(name: string): name is EntityName {
  return Object.prototype.hasOwnProperty.call(entityDefinitions, name);
}

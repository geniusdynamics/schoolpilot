// ABOUTME: The canonical entity registry: one closed EntityName union, schema and storage lookup,
// ABOUTME: display labels and the DDL bridge entry point for every spec 02 entity.

import type { z } from 'zod/v4';

import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

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
 * Scope: attendance and pastoral entities (spec 02 §9) and platform entities (spec 02 §11:
 * role, permission, audit_event, setting, attachment, and their peers) are not modelled here.
 * They are P1-B02/B04/P5 dependencies. P1-B02 also requires `audit_event` plus a per-row
 * `version` column for optimistic concurrency; neither is part of this registry yet.
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

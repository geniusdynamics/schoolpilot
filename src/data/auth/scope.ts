// ABOUTME: The scope of spec 06 §5.2: the grants a role carries, how they are resolved from the real
// ABOUTME: assignment data, and how a row or a list is checked against them.

import { storageFor, type EntityName } from '@/domain/schema';
import type { ListQuery, Page, RepositoryRow } from '@/data/repository';

import { scopeKindsFor, type Role, type ScopeKind } from './roles';

/** The class groups a class-teacher scope covers. */
export interface ClassGroupScope {
  readonly classGroupId: string;
  readonly enrolmentIds: readonly string[];
  readonly learnerIds: readonly string[];
  readonly guardianIds: readonly string[];
  readonly householdIds: readonly string[];
}

/** The teaching groups a teacher scope covers. */
export interface TeachingGroupScope {
  readonly teachingGroupId: string;
  readonly learningAreaId: string;
  readonly enrolmentIds: readonly string[];
  readonly learnerIds: readonly string[];
}

/** One grant of the scope: a kind and the data it covers. */
export type ScopeGrant =
  | { readonly kind: 'institution'; readonly institutionIds: readonly string[] }
  | { readonly kind: 'finance'; readonly institutionIds: readonly string[] }
  | { readonly kind: 'class_group'; readonly classGroups: readonly ClassGroupScope[] }
  | { readonly kind: 'teaching_group'; readonly teachingGroups: readonly TeachingGroupScope[] };

/** The resolved scope of an actor. */
export interface PermissionScope {
  /** The institution the actor acts in; the tenancy anchor of every default filter. */
  readonly institutionId: string | null;
  readonly grants: readonly ScopeGrant[];
}

/** The read side the scope is resolved from. */
export interface ScopeReader {
  list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>>;
}

/** The finance documents a finance scope covers. */
export const FINANCE_SCOPE_ENTITIES: readonly EntityName[] = [
  'fee_category',
  'fee_item',
  'fee_schedule',
  'fee_schedule_line',
  'discount_rule',
  'installment_plan',
  'sponsorship',
  'invoice',
  'invoice_line',
  'credit_note',
  'payment',
  'payment_allocation',
  'receipt',
  'refund',
];

/**
 * The class-level rows a class-group scope covers.
 *
 * Beside the class and its people, the scope reaches the assessment rows of the class: a class
 * teacher reads the marks and the reports of their own class, and writes none of them.
 */
export const CLASS_SCOPE_ENTITIES: readonly EntityName[] = [
  'class_group',
  'enrolment',
  'enrolment_change',
  'promotion_decision',
  'learner',
  'learner_guardian',
  'guardian',
  'household',
  'mark',
  'result',
  'period_result',
  'report_card',
  'competency_observation',
];

/** The teaching rows a teaching-group scope covers. */
export const TEACHING_SCOPE_ENTITIES: readonly EntityName[] = [
  'teaching_group',
  'teaching_group_member',
  'teaching_assignment',
  'timetable_entry',
  'learning_area_enrolment',
  'enrolment',
  'assessment',
  'mark',
  'result',
  'period_result',
  'competency_observation',
  'report_card',
  'learner',
];

/**
 * The column a scope filter runs on, per entity.
 *
 * Every grant of an entity speaks the same column, so the values of the grants can be merged into
 * one filter. `assessment` has no such column: its learning areas live in a JSON list, so its
 * rows are judged one by one.
 */
const SCOPE_KEY_COLUMN: Partial<Record<EntityName, string>> = {
  class_group: 'id',
  enrolment: 'id',
  enrolment_change: 'enrolment_id',
  promotion_decision: 'enrolment_id',
  learner: 'id',
  learner_guardian: 'learner_id',
  guardian: 'id',
  household: 'id',
  teaching_group: 'id',
  teaching_group_member: 'teaching_group_id',
  teaching_assignment: 'teaching_group_id',
  timetable_entry: 'teaching_group_id',
  learning_area_enrolment: 'enrolment_id',
  mark: 'enrolment_id',
  result: 'enrolment_id',
  period_result: 'enrolment_id',
  competency_observation: 'enrolment_id',
  report_card: 'enrolment_id',
};

/** True when the entity is a finance document. */
export function isFinanceEntity(entity: EntityName): boolean {
  return FINANCE_SCOPE_ENTITIES.includes(entity);
}

// --------------------------------------------------------------------------- resolution

/** What the resolution needs to know about the actor. */
export interface ResolveScopeInput {
  readonly actorId: string;
  readonly roles: readonly Role[];
  readonly reader: ScopeReader;
  /** The date the scope is effective at. Defaults to today. */
  readonly at?: string;
}

/** The largest page the resolution reads; the repository caps a page at this size. */
const MAX_ROWS = 500;

/**
 * Resolves the scope of an actor from the data the actor holds.
 *
 * The teaching groups come from the effective `teaching_assignment` rows of the actor's staff
 * record, the class groups from the `class_group` rows that name the actor as homeroom teacher,
 * and the institution from the actor's user row. Nothing is hard-coded: an actor whose assignment
 * ended holds nothing.
 */
export async function resolveScope(input: ResolveScopeInput): Promise<PermissionScope> {
  const kinds = scopeKindsFor(input.roles);
  if (kinds.length === 0) return { institutionId: null, grants: [] };

  const at = normaliseDate(input.at ?? today());

  const users = await rows(input.reader, 'user', { where: { id: input.actorId } });
  const user = users[0];
  // An actor without an active user row has no institution, so no scope at all.
  if (!user || user.status !== 'active') return { institutionId: null, grants: [] };

  const institutionId = String(user.institution_id);
  const grants: ScopeGrant[] = [];

  if (kinds.includes('institution')) {
    grants.push({ kind: 'institution', institutionIds: [institutionId] });
  }
  if (kinds.includes('finance')) {
    grants.push({ kind: 'finance', institutionIds: [institutionId] });
  }

  const staff = (await rows(input.reader, 'staff', { where: { user_id: input.actorId } }))[0];
  const staffId = staff ? String(staff.id) : null;

  if (kinds.includes('class_group')) {
    const classGroups = staffId
      ? await resolveClassGroups(input.reader, institutionId, staffId)
      : [];
    grants.push({ kind: 'class_group', classGroups });
  }
  if (kinds.includes('teaching_group')) {
    const teachingGroups = staffId
      ? await resolveTeachingGroups(input.reader, institutionId, staffId, at)
      : [];
    grants.push({ kind: 'teaching_group', teachingGroups });
  }

  return { institutionId, grants };
}

async function resolveClassGroups(
  reader: ScopeReader,
  institutionId: string,
  staffId: string
): Promise<ClassGroupScope[]> {
  // The homeroom teachers live in a JSON list, so the column is matched by its text.
  const classes = await rows(reader, 'class_group', {
    where: { institution_id: institutionId },
    conditions: { homeroom_teacher_ids: { contains: staffId } },
  });
  if (classes.length === 0) return [];

  const classGroupIds = classes.map((row) => String(row.id));
  const enrolments = await rows(reader, 'enrolment', {
    where: { institution_id: institutionId },
    conditions: { class_group_id: { in: classGroupIds } },
  });

  const learnerIds = unique(enrolments.map((row) => String(row.learner_id)));
  const learners = await rows(reader, 'learner', { conditions: { id: { in: learnerIds } } });
  const householdByLearner = new Map(
    learners
      .filter((row) => row.household_id !== undefined && row.household_id !== null)
      .map((row) => [String(row.id), String(row.household_id)])
  );
  const links = await rows(reader, 'learner_guardian', {
    conditions: { learner_id: { in: learnerIds } },
  });
  const guardiansByLearner = new Map<string, string[]>();
  for (const link of links) {
    const learnerId = String(link.learner_id);
    const guardianId = String(link.guardian_id);
    guardiansByLearner.set(learnerId, [...(guardiansByLearner.get(learnerId) ?? []), guardianId]);
  }

  return classes.map((classGroup) => {
    const inClass = enrolments.filter((row) => String(row.class_group_id) === String(classGroup.id));
    const classLearnerIds = unique(inClass.map((row) => String(row.learner_id)));
    return {
      classGroupId: String(classGroup.id),
      enrolmentIds: inClass.map((row) => String(row.id)),
      learnerIds: classLearnerIds,
      guardianIds: unique(
        classLearnerIds.flatMap((learnerId) => guardiansByLearner.get(learnerId) ?? [])
      ),
      householdIds: unique(
        classLearnerIds
          .map((learnerId) => householdByLearner.get(learnerId))
          .filter((id): id is string => id !== undefined)
      ),
    };
  });
}

async function resolveTeachingGroups(
  reader: ScopeReader,
  institutionId: string,
  staffId: string,
  at: string
): Promise<TeachingGroupScope[]> {
  const assignments = await rows(reader, 'teaching_assignment', {
    where: { institution_id: institutionId, staff_id: staffId },
  });
  const effective = assignments.filter((row) => isEffective(row.valid_from, row.valid_to, at));
  const teachingGroupIds = unique(effective.map((row) => String(row.teaching_group_id)));
  if (teachingGroupIds.length === 0) return [];

  const groups = await rows(reader, 'teaching_group', {
    conditions: { id: { in: teachingGroupIds } },
  });
  const members = await rows(reader, 'teaching_group_member', {
    where: { institution_id: institutionId },
    conditions: { teaching_group_id: { in: teachingGroupIds } },
  });
  const effectiveMembers = members.filter((row) => isEffective(row.valid_from, row.valid_to, at));

  const enrolmentIds = unique(effectiveMembers.map((row) => String(row.enrolment_id)));
  const enrolments = await rows(reader, 'enrolment', { conditions: { id: { in: enrolmentIds } } });
  const learnerByEnrolment = new Map(
    enrolments.map((row) => [String(row.id), String(row.learner_id)])
  );

  return groups.map((group) => {
    const groupId = String(group.id);
    const inGroup = effectiveMembers.filter((row) => String(row.teaching_group_id) === groupId);
    const groupEnrolmentIds = inGroup.map((row) => String(row.enrolment_id));
    return {
      teachingGroupId: groupId,
      learningAreaId: String(group.learning_area_id),
      enrolmentIds: groupEnrolmentIds,
      learnerIds: unique(
        groupEnrolmentIds
          .map((id) => learnerByEnrolment.get(id))
          .filter((id): id is string => id !== undefined)
      ),
    };
  });
}

// --------------------------------------------------------------------------- coverage

/** True when the row is inside the scope. */
export function coversRow(
  scope: PermissionScope,
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): boolean {
  for (const grant of scope.grants) {
    if (coversByGrant(grant, entity, row)) return true;
  }
  // A grant that owns an entity owns every row of it: a teacher without an assignment reaches no
  // mark at all. Only the rows no grant owns fall back to the tenancy of the actor.
  if (scope.grants.some((grant) => claims(grant, entity))) return false;
  return coversByTenancy(scope, entity, row);
}

/**
 * True when the actor reaches the institution at large.
 *
 * The rows of the institution are the ones no scope narrows, so an actor that holds the
 * institution grant sees the whole institution - and only that one.
 */
export function coversInstitution(scope: PermissionScope): boolean {
  return scope.grants.some((grant) => grant.kind === 'institution');
}

/** True when the grant owns the entity, whether or not it covers the row. */
function claims(grant: ScopeGrant, entity: EntityName): boolean {
  switch (grant.kind) {
    case 'institution':
      return !isFinanceEntity(entity);
    case 'finance':
      return isFinanceEntity(entity);
    case 'class_group':
      return CLASS_SCOPE_ENTITIES.includes(entity);
    case 'teaching_group':
      return TEACHING_SCOPE_ENTITIES.includes(entity);
  }
}

function coversByGrant(
  grant: ScopeGrant,
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): boolean {
  switch (grant.kind) {
    case 'institution':
      // The ledger has its own scope: the institution grant does not reach the finance rows.
      if (isFinanceEntity(entity)) return false;
      return grant.institutionIds.includes(institutionValue(entity, row));
    case 'finance':
      if (!isFinanceEntity(entity)) return false;
      return grant.institutionIds.includes(institutionValue(entity, row));
    case 'class_group':
      return coversByClassGroup(grant.classGroups, entity, row);
    case 'teaching_group':
      return coversByTeachingGroup(grant.teachingGroups, entity, row);
  }
}

function coversByTenancy(
  scope: PermissionScope,
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): boolean {
  if (!scope.institutionId) return false;
  return institutionValue(entity, row) === scope.institutionId;
}

/** The institution a row belongs to; the institution row is its own institution. */
function institutionValue(entity: EntityName, row: Readonly<Record<string, unknown>>): string {
  return text(row[institutionColumn(entity)]);
}

function coversByClassGroup(
  classGroups: readonly ClassGroupScope[],
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): boolean {
  switch (entity) {
    case 'class_group':
      return classGroups.some((group) => group.classGroupId === text(row.id));
    case 'enrolment':
      return classGroups.some((group) => group.enrolmentIds.includes(text(row.id)));
    case 'enrolment_change':
    case 'promotion_decision':
    case 'mark':
    case 'result':
    case 'period_result':
    case 'report_card':
    case 'competency_observation':
      return classGroups.some((group) => group.enrolmentIds.includes(text(row.enrolment_id)));
    case 'learner':
      return classGroups.some((group) => group.learnerIds.includes(text(row.id)));
    case 'learner_guardian':
      return classGroups.some((group) => group.learnerIds.includes(text(row.learner_id)));
    case 'guardian':
      return classGroups.some((group) => group.guardianIds.includes(text(row.id)));
    case 'household':
      return classGroups.some((group) => group.householdIds.includes(text(row.id)));
    default:
      return false;
  }
}

function coversByTeachingGroup(
  teachingGroups: readonly TeachingGroupScope[],
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): boolean {
  switch (entity) {
    case 'teaching_group':
      return teachingGroups.some((group) => group.teachingGroupId === text(row.id));
    case 'teaching_group_member':
    case 'teaching_assignment':
    case 'timetable_entry':
      return teachingGroups.some((group) => group.teachingGroupId === text(row.teaching_group_id));
    case 'enrolment':
      return teachingGroups.some((group) => group.enrolmentIds.includes(text(row.id)));
    case 'mark':
      // The mark belongs to the learner and to the learning area of the group that teaches it.
      return teachingGroups.some(
        (group) =>
          group.enrolmentIds.includes(text(row.enrolment_id)) &&
          group.learningAreaId === text(row.learning_area_id)
      );
    case 'learning_area_enrolment':
      // The learning area enrolment of a member of the group. The rule names the enrolment, the
      // same column the list filter runs on, so a list and a get of the same row agree.
      return teachingGroups.some((group) => group.enrolmentIds.includes(text(row.enrolment_id)));
    case 'assessment':
      return teachingGroups.some((group) =>
        idList(row.learning_area_ids).includes(group.learningAreaId)
      );
    case 'result':
    case 'period_result':
    case 'competency_observation':
    case 'report_card':
      return teachingGroups.some((group) => group.enrolmentIds.includes(text(row.enrolment_id)));
    case 'learner':
      return teachingGroups.some((group) => group.learnerIds.includes(text(row.id)));
    default:
      return false;
  }
}

// --------------------------------------------------------------------------- list filters

/**
 * The filter that narrows a list of an entity to the actor's scope.
 *
 * The filter is a column and the values that column may take. An empty list of values matches no
 * row at all, so an actor without a scope sees nothing rather than everything.
 */
export interface ScopeFilter {
  /** The column the filter runs on. */
  readonly column: string;
  /** The values the column may take. */
  readonly values: readonly string[];
}

/**
 * The filter that narrows a list of an entity to the actor's scope.
 *
 * The filter is a superset of the rows the scope admits: the rules that need more than one column
 * (the learning area of a mark) are judged row by row on top of it, so a list never shows a row
 * that a `get` of the same row would refuse.
 */
export function scopeFilterFor(scope: PermissionScope, entity: EntityName): ScopeFilter {
  const institution = grantOf(scope, 'institution');
  const finance = grantOf(scope, 'finance');

  if (isFinanceEntity(entity)) {
    // The ledger has its own scope: only the finance grant reaches it.
    return {
      column: institutionColumn(entity),
      values: finance?.kind === 'finance' ? finance.institutionIds : [],
    };
  }

  if (institution?.kind === 'institution') {
    return { column: institutionColumn(entity), values: institution.institutionIds };
  }

  const column = SCOPE_KEY_COLUMN[entity];
  if (column && claimsScope(scope, entity)) {
    return { column, values: scopeValuesFor(scope, entity, column) };
  }

  // Nothing narrows the entity: it stays reachable inside the actor's own institution. An actor
  // without an institution reaches nothing at all.
  if (!scope.institutionId) return { column: 'id', values: [] };
  return { column: institutionColumn(entity), values: [scope.institutionId] };
}

/**
 * True when the rule of an entity needs more than the column its filter runs on.
 *
 * The mark needs the learning area of the group that teaches it, and the assessment carries its
 * learning areas in a JSON list. The rows of those entities are judged one by one, so a list and a
 * `get` of the same row always agree.
 */
export function refinesRows(scope: PermissionScope, entity: EntityName): boolean {
  const institution = grantOf(scope, 'institution');
  const finance = grantOf(scope, 'finance');
  if (institution?.kind === 'institution' && !isFinanceEntity(entity)) return false;
  if (finance?.kind === 'finance' && isFinanceEntity(entity)) return false;

  if (entity === 'assessment') return claimsScope(scope, entity);
  if (entity === 'mark') return grantOf(scope, 'teaching_group')?.kind === 'teaching_group';
  return false;
}

function grantOf(scope: PermissionScope, kind: ScopeKind): ScopeGrant | undefined {
  return scope.grants.find((grant) => grant.kind === kind);
}

/** True when a class or teaching grant owns the entity. */
function claimsScope(scope: PermissionScope, entity: EntityName): boolean {
  const classGroup = grantOf(scope, 'class_group');
  const teachingGroup = grantOf(scope, 'teaching_group');
  return (
    (classGroup?.kind === 'class_group' && CLASS_SCOPE_ENTITIES.includes(entity)) ||
    (teachingGroup?.kind === 'teaching_group' && TEACHING_SCOPE_ENTITIES.includes(entity))
  );
}

/**
 * The values the scope admits on the column of an entity.
 *
 * Every grant speaks the same column for an entity, so the values of the grants are merged into
 * one list. The rules that need a second column are judged row by row on top of this list.
 */
function scopeValuesFor(scope: PermissionScope, entity: EntityName, column: string): string[] {
  const values: string[] = [];
  for (const grant of scope.grants) {
    if (grant.kind === 'class_group') {
      for (const group of grant.classGroups) {
        if (column === 'id' && entity === 'class_group') values.push(group.classGroupId);
        if (column === 'id' && entity === 'enrolment') values.push(...group.enrolmentIds);
        if (column === 'id' && entity === 'learner') values.push(...group.learnerIds);
        if (column === 'id' && entity === 'guardian') values.push(...group.guardianIds);
        if (column === 'id' && entity === 'household') values.push(...group.householdIds);
        if (column === 'learner_id' && entity === 'learner_guardian') {
          values.push(...group.learnerIds);
        }
        // The rows that name an enrolment: the class changes, the promotions and the marks.
        if (column === 'enrolment_id') values.push(...group.enrolmentIds);
      }
    }
    if (grant.kind === 'teaching_group') {
      for (const group of grant.teachingGroups) {
        if (column === 'id' && entity === 'teaching_group') values.push(group.teachingGroupId);
        if (column === 'id' && entity === 'enrolment') values.push(...group.enrolmentIds);
        if (column === 'id' && entity === 'learner') values.push(...group.learnerIds);
        if (column === 'teaching_group_id') values.push(group.teachingGroupId);
        if (column === 'enrolment_id') values.push(...group.enrolmentIds);
      }
    }
  }
  return unique(values);
}

/** The column that carries the institution of an entity; the institution row carries its own id. */
function institutionColumn(entity: EntityName): string {
  const refs = storageFor(entity).refs;
  return Object.prototype.hasOwnProperty.call(refs, 'institution_id') ? 'institution_id' : 'id';
}

// --------------------------------------------------------------------------- helpers

async function rows<E extends EntityName>(
  reader: ScopeReader,
  entity: E,
  query: ListQuery
): Promise<RepositoryRow<E>[]> {
  const page = await reader.list(entity, { ...query, limit: MAX_ROWS });
  return [...page.items];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function idList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** True when the period covers the date. */
function isEffective(validFrom: unknown, validTo: unknown, at: string): boolean {
  const from = typeof validFrom === 'string' ? validFrom.slice(0, 10) : '';
  if (!from || from > at) return false;
  if (validTo === null || validTo === undefined) return true;
  const to = typeof validTo === 'string' ? validTo.slice(0, 10) : '';
  return to !== '' && to >= at;
}

function normaliseDate(value: string): string {
  return value.slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

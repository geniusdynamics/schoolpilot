// ABOUTME: Enforcement of the spec 02 §12 invariants in the repository write path, plus the
// ABOUTME: referential-integrity and tenancy checks every entity shares.

import {
  databaseSchemaFor,
  isEntityName,
  storageFor,
  type EntityName,
} from '@/domain/schema';

import type { AuditRunner } from './audit';
import { RepositoryInvariantError, RepositoryReferenceError } from './errors';
import { fieldIssue } from './schemas';
import type { ChangeType } from './types';

/** What a guard sees when a write is about to happen. */
export interface InvariantContext {
  readonly entity: EntityName;
  readonly action: ChangeType;
  /** The stored row before the write; null for a create. */
  readonly before: Readonly<Record<string, unknown>> | null;
  /** The row the write would store. */
  readonly after: Readonly<Record<string, unknown>>;
  readonly runner: AuditRunner;
  readonly now: Date;
}

/** One invariant check. Throwing rejects the write. */
export type InvariantGuard = (context: InvariantContext) => Promise<void>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function money(value: unknown): { amount_minor: number; currency: string } | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as { amount_minor?: unknown; currency?: unknown };
  if (typeof record.amount_minor !== 'number' || typeof record.currency !== 'string') return null;
  return { amount_minor: record.amount_minor, currency: record.currency };
}

/**
 * Money read straight from the database is the JSON text of the column, so it is parsed
 * before it can be compared.
 */
function moneyFromColumn(value: unknown): { amount_minor: number; currency: string } | null {
  if (typeof value !== 'string') return money(value);
  try {
    return money(JSON.parse(value));
  } catch {
    return null;
  }
}

/** The far end of a date range, used when a range is open. */
const OPEN_END = '9999-12-31';

/**
 * Spec 02 §12.10 - every foreign key resolves, and the row it points at belongs to the
 * same institution (spec 02 §1.1).
 *
 * The database enforces the first half with its foreign keys on; the tenancy half has no
 * SQL equivalent, so it is checked here.
 */
async function enforceReferencesAndTenancy(context: InvariantContext): Promise<void> {
  const storage = storageFor(context.entity);
  const institutionId = text(context.after.institution_id);

  for (const [column, relation] of Object.entries(storage.refs)) {
    const referencedId = text(context.after[column]);
    if (!referencedId) continue;

    const target = await context.runner.get<Record<string, unknown>>(
      `SELECT * FROM "${relation}" WHERE "id" = ?`,
      [referencedId]
    );

    if (!target) {
      throw new RepositoryReferenceError(context.entity, relation, column, referencedId);
    }

    if (!institutionId) continue;
    if (!isEntityName(relation)) continue;
    if (!('institution_id' in databaseSchemaFor(relation).properties)) continue;

    const targetInstitution = text(target.institution_id);
    if (!targetInstitution || targetInstitution === institutionId) continue;

    throw new RepositoryInvariantError(context.entity, 'tenancy.institution_scope', [
      fieldIssue(column, `${column} points at a row that belongs to another institution`),
    ]);
  }
}

/**
 * Spec 02 §12.1 - a learner has at most one active enrolment per calendar year on any
 * date.
 */
async function enforceSingleActiveEnrolment(context: InvariantContext): Promise<void> {
  const status = text(context.after.status);
  if (status !== 'active' && status !== 'repeating') return;

  const learnerId = text(context.after.learner_id);
  const yearId = text(context.after.academic_year_id);
  const start = text(context.after.start_date);
  const id = text(context.after.id);
  if (!learnerId || !yearId || !start || !id) return;

  const end = text(context.after.end_date) ?? OPEN_END;

  const overlap = await context.runner.get<{ overlap: number }>(
    `SELECT COUNT(*) AS overlap FROM "enrolment"
       WHERE "learner_id" = ? AND "academic_year_id" = ?
         AND "id" <> ? AND "status" IN ('active', 'repeating') AND "deleted_at" IS NULL
         AND ? <= COALESCE("end_date", '${OPEN_END}')
         AND "start_date" <= ?`,
    [learnerId, yearId, id, start, end]
  );

  if (!overlap || overlap.overlap === 0) return;

  throw new RepositoryInvariantError(context.entity, 'enrolment.single_active_per_calendar', [
    fieldIssue(
      'learner_id',
      'the learner already has an active enrolment in this academic year on these dates'
    ),
  ]);
}

/**
 * Spec 02 §12.2 - an enrolment's class group carries the same level and academic year.
 */
async function enforceEnrolmentClassGroup(context: InvariantContext): Promise<void> {
  const classGroupId = text(context.after.class_group_id);
  if (!classGroupId) return;

  const group = await context.runner.get<Record<string, unknown>>(
    `SELECT * FROM "class_group" WHERE "id" = ?`,
    [classGroupId]
  );

  if (!group) {
    throw new RepositoryReferenceError(context.entity, 'class_group', 'class_group_id', classGroupId);
  }

  const issues = [];
  if (text(group.level_id) !== text(context.after.level_id)) {
    issues.push(fieldIssue('level_id', 'the class group belongs to a different level'));
  }
  if (text(group.academic_year_id) !== text(context.after.academic_year_id)) {
    issues.push(
      fieldIssue('academic_year_id', 'the class group belongs to a different academic year')
    );
  }

  if (issues.length > 0) {
    throw new RepositoryInvariantError(context.entity, 'enrolment.class_group_alignment', issues);
  }
}

/**
 * Spec 02 §12.2, seen from the other side: moving a class group to another level or year
 * must not orphan the enrolments that point at it.
 */
async function enforceClassGroupEnrolments(context: InvariantContext): Promise<void> {
  if (context.action !== 'update' || !context.before) return;

  const levelChanged = context.before.level_id !== context.after.level_id;
  const yearChanged = context.before.academic_year_id !== context.after.academic_year_id;
  if (!levelChanged && !yearChanged) return;

  const groupId = text(context.after.id);
  if (!groupId) return;

  const enrolments = await context.runner.all<Record<string, unknown>>(
    `SELECT "id", "level_id", "academic_year_id" FROM "enrolment"
       WHERE "class_group_id" = ? AND "deleted_at" IS NULL`,
    [groupId]
  );

  const issues = [];
  for (const enrolment of enrolments) {
    if (levelChanged && text(enrolment.level_id) !== text(context.after.level_id)) {
      issues.push(
        fieldIssue('level_id', `enrolment ${text(enrolment.id)} belongs to a different level`)
      );
    }
    if (yearChanged && text(enrolment.academic_year_id) !== text(context.after.academic_year_id)) {
      issues.push(
        fieldIssue(
          'academic_year_id',
          `enrolment ${text(enrolment.id)} belongs to a different academic year`
        )
      );
    }
  }

  if (issues.length > 0) {
    throw new RepositoryInvariantError(context.entity, 'class_group.enrolment_alignment', issues);
  }
}

/**
 * Spec 02 §12.3 - periods of a year do not overlap at the same kind and lie inside the
 * year.
 */
async function enforceAcademicPeriod(context: InvariantContext): Promise<void> {
  const yearId = text(context.after.academic_year_id);
  const start = text(context.after.start_date);
  const end = text(context.after.end_date);
  const kind = text(context.after.kind);
  const id = text(context.after.id);
  if (!yearId || !start || !end || !kind || !id) return;

  const year = await context.runner.get<Record<string, unknown>>(
    `SELECT * FROM "academic_year" WHERE "id" = ?`,
    [yearId]
  );

  if (!year) {
    throw new RepositoryReferenceError(context.entity, 'academic_year', 'academic_year_id', yearId);
  }

  const issues = [];
  const yearStart = text(year.start_date);
  const yearEnd = text(year.end_date);
  if (yearStart && start < yearStart) {
    issues.push(fieldIssue('start_date', 'the period starts before the academic year'));
  }
  if (yearEnd && end > yearEnd) {
    issues.push(fieldIssue('end_date', 'the period ends after the academic year'));
  }

  const overlap = await context.runner.get<{ overlap: number }>(
    `SELECT COUNT(*) AS overlap FROM "academic_period"
       WHERE "academic_year_id" = ? AND "kind" = ? AND "id" <> ? AND "deleted_at" IS NULL
         AND ? <= "end_date" AND "start_date" <= ?`,
    [yearId, kind, id, start, end]
  );

  if (overlap && overlap.overlap > 0) {
    issues.push(
      fieldIssue('start_date', `the period overlaps another ${kind} of the same academic year`)
    );
  }

  if (issues.length > 0) {
    throw new RepositoryInvariantError(context.entity, 'academic_period.no_overlap', issues);
  }
}

/**
 * Spec 02 §12.4 - at most one current term per year.
 */
async function enforceSingleCurrentPeriod(context: InvariantContext): Promise<void> {
  if (text(context.after.status) !== 'current') return;

  const yearId = text(context.after.academic_year_id);
  const kind = text(context.after.kind);
  const id = text(context.after.id);
  if (!yearId || !kind || !id) return;

  const current = await context.runner.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM "academic_period"
       WHERE "academic_year_id" = ? AND "kind" = ? AND "status" = 'current'
         AND "id" <> ? AND "deleted_at" IS NULL`,
    [yearId, kind, id]
  );

  if (!current || current.count === 0) return;

  throw new RepositoryInvariantError(context.entity, 'academic_period.single_current', [
    fieldIssue('status', `the academic year already has a current ${kind}`),
  ]);
}

/**
 * Spec 02 §12.4 - at most one current academic year per calendar.
 */
async function enforceSingleCurrentYear(context: InvariantContext): Promise<void> {
  if (text(context.after.status) !== 'current') return;

  const calendarId = text(context.after.calendar_id);
  const id = text(context.after.id);
  if (!calendarId || !id) return;

  const current = await context.runner.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM "academic_year"
       WHERE "calendar_id" = ? AND "status" = 'current' AND "id" <> ? AND "deleted_at" IS NULL`,
    [calendarId, id]
  );

  if (!current || current.count === 0) return;

  throw new RepositoryInvariantError(context.entity, 'academic_year.single_current', [
    fieldIssue('status', 'the calendar already has a current academic year'),
  ]);
}

/**
 * Spec 02 §12.5 - a mark's enrolment must be a member of a teaching group for that
 * learning area on the assessment date.
 */
async function enforceMarkTeachingGroup(context: InvariantContext): Promise<void> {
  const enrolmentId = text(context.after.enrolment_id);
  const learningAreaId = text(context.after.learning_area_id);
  const assessmentId = text(context.after.assessment_id);
  if (!enrolmentId || !learningAreaId || !assessmentId) return;

  const assessment = await context.runner.get<Record<string, unknown>>(
    `SELECT * FROM "assessment" WHERE "id" = ?`,
    [assessmentId]
  );

  if (!assessment) {
    throw new RepositoryReferenceError(context.entity, 'assessment', 'assessment_id', assessmentId);
  }

  const date = await resolveAssessmentDate(context, assessment);
  const groups = await context.runner.all<{ id: string }>(
    `SELECT "id" FROM "teaching_group" WHERE "learning_area_id" = ? AND "deleted_at" IS NULL`,
    [learningAreaId]
  );

  for (const group of groups) {
    const member = await context.runner.get<{ id: string }>(
      `SELECT "id" FROM "teaching_group_member"
         WHERE "teaching_group_id" = ? AND "enrolment_id" = ? AND "deleted_at" IS NULL
           AND "valid_from" <= ? AND ("valid_to" IS NULL OR "valid_to" >= ?)`,
      [group.id, enrolmentId, date, date]
    );
    if (member) return;
  }

  throw new RepositoryInvariantError(context.entity, 'mark.teaching_group_membership', [
    fieldIssue(
      'enrolment_id',
      'the enrolment is not a member of a teaching group for this learning area on the assessment date'
    ),
  ]);
}

/** The date the assessment happens on: its window, else its period, else today. */
async function resolveAssessmentDate(
  context: InvariantContext,
  assessment: Readonly<Record<string, unknown>>
): Promise<string> {
  const window = assessment.date_window;
  if (typeof window === 'string') {
    try {
      const parsed = JSON.parse(window) as { start_date?: unknown };
      if (typeof parsed.start_date === 'string') return parsed.start_date;
    } catch {
      // A window that cannot be read falls through to the academic period.
    }
  }

  const periodId = text(assessment.academic_period_id);
  if (periodId) {
    const period = await context.runner.get<Record<string, unknown>>(
      `SELECT * FROM "academic_period" WHERE "id" = ?`,
      [periodId]
    );
    const start = period ? text(period.start_date) : null;
    if (start) return start;
  }

  return context.now.toISOString().slice(0, 10);
}

/**
 * Spec 02 §12.6 - a published report card's snapshot never changes.
 */
async function enforcePublishedSnapshot(context: InvariantContext): Promise<void> {
  if (context.action !== 'update' || !context.before) return;
  if (!text(context.before.published_at)) return;

  const before = JSON.stringify(context.before.snapshot ?? null);
  const after = JSON.stringify(context.after.snapshot ?? null);
  if (before === after) return;

  throw new RepositoryInvariantError(context.entity, 'report_card.published_snapshot_immutable', [
    fieldIssue('snapshot', 'a published report card snapshot never changes'),
  ]);
}

/**
 * The fields a posted document may no longer change, and the states that freeze them.
 *
 * The frozen states run from the posting onwards: the state before it - `draft` for an
 * invoice and a credit note, `pending` for a payment, `requested` for a refund - stays
 * editable, and every state from the posting on freezes the material fields. The
 * workflow annotations a transition sets - `paid_at`, `approved_by` - stay writable, or
 * the state could never be reached.
 */
const FROZEN_AFTER_POSTING: Partial<
  Record<EntityName, { readonly statuses: readonly string[]; readonly fields: readonly string[] }>
> = {
  invoice: {
    statuses: ['posted', 'partially_paid', 'paid', 'void'],
    fields: [
      'number',
      'issue_date',
      'total',
      'learner_id',
      'payer_guardian_id',
      'household_id',
      'academic_period_id',
    ],
  },
  payment: {
    statuses: ['posted', 'cleared', 'bounced', 'reversed'],
    fields: [
      'amount',
      'received_at',
      'channel',
      'payer_guardian_id',
      'learner_id',
      'household_id',
      'reference',
      'external_reference',
      'exchange_rate',
      'base_amount',
    ],
  },
  credit_note: {
    statuses: ['posted', 'void'],
    fields: ['number', 'issue_date', 'amount', 'learner_id', 'invoice_id', 'reason'],
  },
  refund: {
    // A refund is frozen once it is approved: the approval settles the amount, and the
    // money only moves when it is paid.
    statuses: ['approved', 'paid', 'rejected'],
    fields: ['number', 'amount', 'requested_at', 'payment_id', 'learner_id', 'reason'],
  },
};

/**
 * Spec 02 §12.7 - invoices, payments, credit notes and refunds are immutable after
 * posting; corrections are reversals. Journal entries are not modelled yet and belong
 * to the finance ledger task.
 *
 * A removal is a write like any other, so a posted document cannot be removed either: a
 * soft delete would take the posted amount out of every read while leaving its receipt,
 * its allocation and its audit trail behind. The row has to be reversed, not erased.
 */
async function enforcePostedImmutability(context: InvariantContext): Promise<void> {
  if (context.action === 'create' || !context.before) return;

  const rule = FROZEN_AFTER_POSTING[context.entity];
  if (!rule) return;

  const previousStatus = text(context.before.status);
  if (!previousStatus || !rule.statuses.includes(previousStatus)) return;

  if (context.action === 'remove') {
    throw new RepositoryInvariantError(context.entity, 'finance.posted_immutable', [
      fieldIssue(
        'status',
        `a ${previousStatus} ${context.entity} cannot be removed; post a reversal instead`
      ),
    ]);
  }

  const issues = [];

  // A posted document is never un-posted. It moves to another posted state - partly
  // paid, paid, void, reversed - or it stays where it is. Moving back to a draft state
  // would make every other field editable again on the next write, so the transition
  // out of a posted state is refused together with the fields it would unlock.
  const nextStatus = text(context.after.status);
  if (nextStatus && nextStatus !== previousStatus && !rule.statuses.includes(nextStatus)) {
    issues.push(
      fieldIssue(
        'status',
        `a ${previousStatus} ${context.entity} cannot move back to ${nextStatus}; post a reversal instead`
      )
    );
  }

  for (const field of rule.fields) {
    const before = context.before[field];
    const after = context.after[field];
    if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) continue;
    issues.push(
      fieldIssue(field, `${field} cannot change once the ${context.entity} is ${previousStatus}`)
    );
  }

  if (issues.length > 0) {
    throw new RepositoryInvariantError(context.entity, 'finance.posted_immutable', issues);
  }
}

/**
 * Spec 02 §12.8 - the allocations of a payment may not exceed the payment; the remainder
 * is learner credit.
 */
async function enforceAllocationWithinPayment(context: InvariantContext): Promise<void> {
  const paymentId = text(context.after.payment_id);
  const id = text(context.after.id);
  if (!paymentId || !id) return;

  const payment = await context.runner.get<Record<string, unknown>>(
    `SELECT * FROM "payment" WHERE "id" = ?`,
    [paymentId]
  );

  if (!payment) {
    throw new RepositoryReferenceError(context.entity, 'payment', 'payment_id', paymentId);
  }

  const paid = moneyFromColumn(payment.amount);
  const allocation = money(context.after.amount);
  if (!paid || !allocation) return;

  const issues = [];
  if (allocation.currency !== paid.currency) {
    issues.push(
      fieldIssue('amount.currency', 'the allocation currency differs from the payment currency')
    );
  }

  const others = await context.runner.all<{ id: string; amount: string }>(
    `SELECT "id", "amount" FROM "payment_allocation"
       WHERE "payment_id" = ? AND "id" <> ? AND "deleted_at" IS NULL`,
    [paymentId, id]
  );

  let allocated = 0;
  for (const other of others) {
    const parsed = moneyFromColumn(other.amount);
    if (parsed) allocated += parsed.amount_minor;
  }

  if (allocated + allocation.amount_minor > paid.amount_minor) {
    issues.push(
      fieldIssue(
        'amount.amount_minor',
        'the allocations of this payment exceed the amount that was paid'
      )
    );
  }

  if (issues.length > 0) {
    throw new RepositoryInvariantError(context.entity, 'payment_allocation.within_payment', issues);
  }
}

/**
 * The date of an attendance register has to lie inside the academic period it names.
 *
 * The canonical registry recorded the rule and left it to the repository. A register
 * that names no period is still writable: a day no period covers has to be registrable
 * too, and the service that opens a register derives the outermost covering period when
 * the caller names none.
 */
async function enforceAttendancePeriod(context: InvariantContext): Promise<void> {
  const periodId = text(context.after.academic_period_id);
  if (!periodId) return;

  const date = text(context.after.date);
  if (!date) return;

  const period = await context.runner.get<Record<string, unknown>>(
    `SELECT * FROM "academic_period" WHERE "id" = ?`,
    [periodId]
  );

  // A period that does not exist is the reference guard's business.
  if (!period) return;

  const start = text(period.start_date);
  const end = text(period.end_date);
  if (!start || !end) return;

  if (date >= start && date <= end) return;

  const name = text(period.name) ?? periodId;
  throw new RepositoryInvariantError(context.entity, 'attendance.date_in_period', [
    fieldIssue(
      'date',
      `the register date ${date} lies outside the academic period ${name} (${start} to ${end})`
    ),
  ]);
}

/** The entity-specific guards, on top of the shared reference and tenancy check. */
const ENTITY_GUARDS: Partial<Record<EntityName, readonly InvariantGuard[]>> = {
  enrolment: [enforceSingleActiveEnrolment, enforceEnrolmentClassGroup],
  class_group: [enforceClassGroupEnrolments],
  academic_period: [enforceAcademicPeriod, enforceSingleCurrentPeriod],
  academic_year: [enforceSingleCurrentYear],
  mark: [enforceMarkTeachingGroup],
  report_card: [enforcePublishedSnapshot],
  invoice: [enforcePostedImmutability],
  payment: [enforcePostedImmutability],
  credit_note: [enforcePostedImmutability],
  refund: [enforcePostedImmutability],
  payment_allocation: [enforceAllocationWithinPayment],
  attendance_session: [enforceAttendancePeriod],
};

/** Every guard that runs for an entity, the shared one first. */
export function guardsFor(entity: EntityName): readonly InvariantGuard[] {
  return [enforceReferencesAndTenancy, ...(ENTITY_GUARDS[entity] ?? [])];
}

/**
 * The guards a removal runs.
 *
 * A removal keeps the row (a soft delete) or deletes it outright, so the guards that judge
 * the shape of a new row, the overlap of a period or the membership of a mark have nothing
 * to add. The posting freeze is the one rule that withholds a removal, because erasing a
 * posted document is how its immutability would be bypassed.
 */
export function guardsForRemoval(entity: EntityName): readonly InvariantGuard[] {
  return FROZEN_AFTER_POSTING[entity] ? [enforcePostedImmutability] : [];
}

/** The invariant identifiers the repository enforces, for documentation and tests. */
export const ENFORCED_INVARIANTS: readonly string[] = [
  'tenancy.institution_scope',
  'enrolment.single_active_per_calendar',
  'enrolment.class_group_alignment',
  'class_group.enrolment_alignment',
  'academic_period.no_overlap',
  'academic_period.single_current',
  'academic_year.single_current',
  'mark.teaching_group_membership',
  'report_card.published_snapshot_immutable',
  'finance.posted_immutable',
  'payment_allocation.within_payment',
  'attendance.date_in_period',
];

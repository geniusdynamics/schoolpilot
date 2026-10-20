// ABOUTME: Applies the fixes the user consented to: a fix runs only for a finding the user
// ABOUTME: named, a dry run reports what would change without writing anything, and every
// ABOUTME: change is written to the repository's audit trail.

import { generateUuidv7, isId } from '@/domain/ids';
import { storageFor, type EntityName } from '@/domain/schema';
import type { SqliteAdapter, SqliteBindValue, SqliteTransaction } from '@/data/adapters/sqlite';
import { applyAuditSchema, writeAuditEvent } from '@/data/repository';

import {
  asText,
  CLASS_GROUP_TABLE,
  IntegrityContext,
  type TargetRow,
} from './checks';
import { columnOf, primaryKeyColumn, quoteIdentifier, type LiveTable } from './table';
import {
  CLEAR_REFERENCE,
  type AppliedRepair,
  type IntegrityFinding,
  type IntegrityFix,
  type IntegrityReport,
  type RepairConsent,
  type RepairResult,
  type SkippedRepair,
} from './types';

/** How a repair run is set up. */
export interface RepairOptions {
  readonly adapter: SqliteAdapter;
  /** The report the consent answers. */
  readonly report: IntegrityReport;
  /** What the user agreed to. */
  readonly consent: RepairConsent;
  /** True to report what would change without writing anything. */
  readonly dryRun?: boolean;
  /** The acting user, recorded on every change. */
  readonly actor?: string;
  /** The clock, so a repair can be pinned in a test. */
  readonly now?: () => Date;
}

/** The columns an enrolment needs, so the tool can create one. */
const ENROLMENT_COLUMNS = [
  'id',
  'institution_id',
  'learner_id',
  'academic_year_id',
  'programme_id',
  'level_id',
  'class_group_id',
  'status',
  'start_date',
  'entry_reason',
  'created_at',
  'updated_at',
] as const;

/**
 * Applies the consented fixes.
 *
 * A finding the user did not name is never touched. A fix that needs a decision the user
 * did not make is refused, and the result says what it needs. A dry run reports the same
 * changes and writes nothing at all.
 */
export async function applyIntegrityFixes(options: RepairOptions): Promise<RepairResult> {
  const { adapter, report, consent } = options;
  const dryRun = options.dryRun === true;
  const clock = options.now ?? (() => new Date());
  const context = new IntegrityContext(adapter);

  const changes: AppliedRepair[] = [];
  const skipped: SkippedRepair[] = [];
  const findings = new Map(report.findings.map((finding) => [finding.id, finding]));

  // The audit table is part of the repository, not of the repair tool, but the tool writes
  // its changes into it. A dry run writes nothing at all, so it creates nothing either.
  if (!dryRun) await applyAuditSchema(adapter);

  for (const id of consent.findingIds) {
    const finding = findings.get(id);
    if (!finding) {
      skipped.push({ findingId: id, reason: 'the finding is not in this report' });
      continue;
    }
    const fix = finding.fix;
    if (!fix) {
      skipped.push({
        findingId: id,
        reason: finding.needs ?? 'the tool has no fix for this finding',
      });
      continue;
    }
    const decision = consent.decisions?.[id];
    if (fix.needs !== null && (decision === undefined || decision === '')) {
      skipped.push({ findingId: id, reason: `the tool needs ${fix.needs}` });
      continue;
    }

    const outcome = await applyFix(context, finding, fix, decision, options, clock());
    if (outcome.ok) {
      changes.push(outcome.change);
      continue;
    }
    skipped.push({ findingId: id, reason: outcome.reason });
  }

  return { dryRun, changes, skipped };
}

type FixOutcome =
  | { readonly ok: true; readonly change: AppliedRepair }
  | { readonly ok: false; readonly reason: string };

/** Applies one fix, or says why it could not be applied. */
async function applyFix(
  context: IntegrityContext,
  finding: IntegrityFinding,
  fix: IntegrityFix,
  decision: string | undefined,
  options: RepairOptions,
  now: Date
): Promise<FixOutcome> {
  const live = await context.liveTable(fix.table);
  if (!live) {
    return { ok: false, reason: `the table ${fix.table} is not in this database` };
  }

  switch (fix.kind) {
    case 'set_reference':
    case 'replace_reference':
      return applyReferenceChange(context, finding, fix, decision ?? null, options, now);
    case 'rekey_duplicate':
      return applyColumnChange(context, finding, fix, fix.after, options, now, null);
    case 'create_enrolment':
      return applyEnrolment(context, finding, fix, decision ?? null, options, now);
    default: {
      const exhaustive: never = fix.kind;
      return { ok: false, reason: `the tool does not know the fix ${String(exhaustive)}` };
    }
  }
}

/** The clause that addresses the one row a finding is about. */
function rowWhere(
  live: LiveTable,
  finding: IntegrityFinding
): { readonly clause: string; readonly params: readonly SqliteBindValue[] } {
  if (live.hasRowId && finding.rowHandle !== null) {
    return { clause: 'rowid = ?', params: [Number(finding.rowHandle)] };
  }
  const primaryKey = primaryKeyColumn(live, storageFor(finding.entity).primaryKey) ?? 'id';
  return { clause: `${quoteIdentifier(primaryKey)} = ?`, params: [finding.rowId ?? ''] };
}

/** The target of a reference, and the reason it cannot be used. */
interface ResolvedTarget {
  readonly refusal: string | null;
  readonly row: TargetRow | null;
}

/**
 * Resolves the row a reference is about to point at.
 *
 * The row has to be live: an archived row is not part of the model, and a reference that
 * points at one is a reference to a row that is not there as far as the model is
 * concerned.
 */
async function resolveTarget(
  context: IntegrityContext,
  finding: IntegrityFinding,
  value: string | null
): Promise<ResolvedTarget> {
  if (value === null || value === '') {
    return { refusal: 'the tool needs the id of the row to point at', row: null };
  }
  if (!isId(value)) {
    return {
      refusal: `the id ${value} is not a canonical id (UUIDv7), so the reference would be broken again`,
      row: null,
    };
  }
  const target = finding.relatedEntity;
  if (!target) return { refusal: null, row: null };

  const row = await context.targetRow(target, value);
  if (!row) {
    return { refusal: `the id ${value} is not a live ${target} row`, row: null };
  }
  if (row.archived) {
    return { refusal: `the id ${value} is an archived ${target} row`, row: null };
  }
  return { refusal: null, row };
}

/**
 * Why a class group cannot be the class group of this row.
 *
 * Spec 02 §12.2: the class group of an enrolment carries the same level and academic year.
 * The repository refuses a row that breaks it, so the tool refuses the write as well.
 */
function alignmentRefusal(row: Readonly<Record<string, unknown>>, target: TargetRow): string | null {
  const rowLevel = asText(row['level_id']);
  const rowYear = asText(row['academic_year_id']);
  if (rowLevel === null || rowYear === null) return null;
  if (target.levelId === null || target.academicYearId === null) {
    return 'the class group does not carry a level and an academic year, so the tool cannot check that it matches the row';
  }
  if (target.levelId === rowLevel && target.academicYearId === rowYear) return null;
  return `the class group ${target.name} is in level ${target.levelId} and academic year ${target.academicYearId}, but the row is in level ${rowLevel} and academic year ${rowYear}: the repository refuses a row whose class group carries another level or year`;
}

/** Points a reference at the row the user chose, or clears it. */
async function applyReferenceChange(
  context: IntegrityContext,
  finding: IntegrityFinding,
  fix: IntegrityFix,
  decision: string | null,
  options: RepairOptions,
  now: Date
): Promise<FixOutcome> {
  const canClear = fix.options.some((option) => option.id === CLEAR_REFERENCE);
  let value: string | null;
  let align: TargetRow | null = null;

  if (decision === CLEAR_REFERENCE) {
    if (!canClear) {
      return {
        ok: false,
        reason: 'the reference cannot be cleared: the model requires the field',
      };
    }
    value = null;
  } else {
    const resolved = await resolveTarget(context, finding, decision);
    if (resolved.refusal) return { ok: false, reason: resolved.refusal };
    value = decision;
    if (resolved.row && finding.relatedEntity) {
      if (storageFor(finding.relatedEntity).table === CLASS_GROUP_TABLE) {
        align = resolved.row;
      }
    }
  }

  return applyColumnChange(context, finding, fix, value, options, now, align);
}

/** Writes one column of one row and records the change. */
async function applyColumnChange(
  context: IntegrityContext,
  finding: IntegrityFinding,
  fix: IntegrityFix,
  value: string | null,
  options: RepairOptions,
  now: Date,
  align: TargetRow | null
): Promise<FixOutcome> {
  const { adapter } = options;
  const live = await context.liveTable(fix.table);
  if (!live) {
    return { ok: false, reason: `the table ${fix.table} is not in this database` };
  }

  const where = rowWhere(live, finding);
  const change: AppliedRepair = {
    findingId: fix.findingId,
    kind: fix.kind,
    entity: fix.entity,
    table: fix.table,
    column: fix.column,
    rowId: fix.rowId,
    before: fix.before,
    after: value,
    description: fix.description,
  };

  if (options.dryRun === true) {
    // A dry run says what would change, so it checks that the row is still there.
    const row = await readRow(adapter, live, where);
    if (!row) return { ok: false, reason: 'the row is gone' };
    const refusal = align ? alignmentRefusal(row, align) : null;
    if (refusal) return { ok: false, reason: refusal };
    return { ok: true, change };
  }

  try {
    await adapter.transaction(async (tx) => {
      const before = await readRow(tx, live, where);
      if (!before) throw new RepairFailure('the row is gone');
      if (align) {
        const refusal = alignmentRefusal(before, align);
        if (refusal) throw new RepairFailure(refusal);
      }
      await tx.run(
        `UPDATE ${quoteIdentifier(fix.table)} SET ${quoteIdentifier(fix.column)} = ? WHERE ${where.clause}`,
        [value, ...where.params]
      );
      const after = await readRow(tx, live, where);
      await recordChange(tx, {
        entity: fix.entity,
        entityId: fix.rowId ?? '',
        action: 'update',
        changedFields: [fix.column],
        before,
        after,
        reason: `integrity repair: ${fix.kind} (${fix.findingId})`,
        actor: options.actor,
        now,
      });
    });
  } catch (error) {
    return { ok: false, reason: failureReason(error) };
  }

  return { ok: true, change };
}

/** Creates the enrolment a learner needs to have a class group. */
async function applyEnrolment(
  context: IntegrityContext,
  finding: IntegrityFinding,
  fix: IntegrityFix,
  classGroupId: string | null,
  options: RepairOptions,
  now: Date
): Promise<FixOutcome> {
  const { adapter } = options;
  if (classGroupId === null) {
    return { ok: false, reason: 'the tool needs the id of the class group to enrol the learner in' };
  }
  if (!isId(classGroupId)) {
    return {
      ok: false,
      reason: `the id ${classGroupId} is not a canonical id (UUIDv7), so the enrolment would be broken`,
    };
  }

  const live = await context.liveTable(fix.table);
  if (!live) {
    return { ok: false, reason: `the table ${fix.table} is not in this database` };
  }
  const missing = ENROLMENT_COLUMNS.filter((column) => !columnOf(live, column));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `the table ${fix.table} does not have the columns an enrolment needs (${missing.join(', ')})`,
    };
  }

  const classGroupTable = storageFor('class_group');
  const classGroup = await context.adapter.get<Record<string, unknown>>(
    `SELECT * FROM ${quoteIdentifier(classGroupTable.table)} WHERE ${quoteIdentifier(classGroupTable.primaryKey)} = ?`,
    [classGroupId]
  );
  if (!classGroup) {
    return { ok: false, reason: `the id ${classGroupId} is not a live class_group row` };
  }
  // An archived class group is not part of the live model: a new enrolment would point at
  // a row that the model does not hold.
  const deletedAt = asText(classGroup['deleted_at']);
  if (deletedAt !== null) {
    return { ok: false, reason: `the id ${classGroupId} is an archived class_group row` };
  }

  const learnerTable = storageFor(finding.entity);
  const learner = await context.adapter.get<Record<string, unknown>>(
    `SELECT * FROM ${quoteIdentifier(learnerTable.table)} WHERE ${quoteIdentifier(learnerTable.primaryKey)} = ?`,
    [finding.rowId ?? '']
  );
  if (!learner) return { ok: false, reason: 'the learner is gone' };

  const learnerId = String(learner[learnerTable.primaryKey] ?? '');
  if (!isId(learnerId)) {
    return {
      ok: false,
      reason:
        'the learner id is not a canonical id (UUIDv7), so an enrolment cannot point at it; the learner has to be re-keyed first',
    };
  }

  const academicYearId = String(classGroup['academic_year_id'] ?? '');
  const startDate = await academicYearStartDate(context, academicYearId);
  if (!startDate) {
    return {
      ok: false,
      reason: 'the academic year of the chosen class group has no start date, so the enrolment has no start date',
    };
  }

  const timestamp = now.toISOString();
  const row: Record<string, string | null> = {
    id: generateUuidv7(),
    institution_id: String(learner['institution_id'] ?? classGroup['institution_id'] ?? ''),
    learner_id: learnerId,
    academic_year_id: academicYearId,
    programme_id: String(classGroup['programme_id'] ?? ''),
    level_id: String(classGroup['level_id'] ?? ''),
    class_group_id: classGroupId,
    status: 'active',
    start_date: startDate,
    entry_reason: 'new_admission',
    created_at: timestamp,
    updated_at: timestamp,
  };
  if (options.actor !== undefined) {
    row['created_by'] = options.actor;
    row['updated_by'] = options.actor;
  }

  const change: AppliedRepair = {
    findingId: fix.findingId,
    kind: fix.kind,
    entity: fix.entity,
    table: fix.table,
    column: fix.column,
    rowId: row['id'],
    before: null,
    after: classGroupId,
    description: fix.description,
  };

  if (options.dryRun === true) return { ok: true, change };

  const columns = Object.keys(row).filter((column) => columnOf(live, column) !== undefined);
  const placeholders = columns.map(() => '?').join(', ');

  try {
    await adapter.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO ${quoteIdentifier(fix.table)} (${columns
          .map((column) => quoteIdentifier(column))
          .join(', ')}) VALUES (${placeholders})`,
        columns.map((column) => row[column])
      );
      await recordChange(tx, {
        entity: fix.entity,
        entityId: row['id'] ?? '',
        action: 'create',
        changedFields: columns,
        before: null,
        after: row,
        reason: `integrity repair: ${fix.kind} (${fix.findingId})`,
        actor: options.actor,
        now,
      });
    });
  } catch (error) {
    return { ok: false, reason: failureReason(error) };
  }

  return { ok: true, change };
}

/** The start date of an academic year, when the database holds it. */
async function academicYearStartDate(
  context: IntegrityContext,
  academicYearId: string
): Promise<string | null> {
  if (!academicYearId) return null;
  const table = storageFor('academic_year');
  const row = await context.adapter.get<Record<string, unknown>>(
    `SELECT ${quoteIdentifier('start_date')} AS ${quoteIdentifier('start_date')} FROM ${quoteIdentifier(table.table)} WHERE ${quoteIdentifier(table.primaryKey)} = ?`,
    [academicYearId]
  );
  const startDate = row?.['start_date'];
  return startDate === null || startDate === undefined ? null : String(startDate);
}

/** Reads one row of a table. */
async function readRow(
  runner: SqliteTransaction,
  live: LiveTable,
  where: { readonly clause: string; readonly params: readonly SqliteBindValue[] }
): Promise<Record<string, unknown> | null> {
  return runner.get<Record<string, unknown>>(
    `SELECT * FROM ${quoteIdentifier(live.table)} WHERE ${where.clause}`,
    where.params
  );
}

/** Writes the audit event of a change, in the change's own transaction. */
async function recordChange(
  tx: SqliteTransaction,
  change: {
    readonly entity: EntityName;
    readonly entityId: string;
    readonly action: 'create' | 'update';
    readonly changedFields: readonly string[];
    readonly before: unknown;
    readonly after: unknown;
    readonly reason: string;
    readonly actor: string | undefined;
    readonly now: Date;
  }
): Promise<void> {
  await writeAuditEvent(tx, {
    entity: change.entity,
    entityId: change.entityId,
    action: change.action,
    actorId: change.actor ?? null,
    changedFields: change.changedFields,
    before: change.before,
    after: change.after,
    reason: change.reason,
    createdAt: change.now.toISOString(),
    commitSequence: await nextCommitSequence(tx),
  });
}

/** The commit sequence the next audit event carries. */
async function nextCommitSequence(tx: SqliteTransaction): Promise<number> {
  const row = await tx.get<{ value: number | null }>(
    'SELECT MAX("commit_sequence") AS "value" FROM "audit_event"'
  );
  return Number(row?.value ?? 0) + 1;
}

/** A failure inside a repair transaction. */
class RepairFailure extends Error {}

/** The reason a repair did not happen. */
function failureReason(error: unknown): string {
  if (error instanceof RepairFailure) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

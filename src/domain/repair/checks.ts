// ABOUTME: The integrity checks - orphans, malformed references, missing class groups and
// ABOUTME: duplicate ids - driven by the storage metadata of the entity registry, so a new
// ABOUTME: entity's references are covered without a new rule.

import { generateUuidv7, isId } from '@/domain/ids';
import {
  ENTITY_NAMES,
  labelOf,
  schemaFor,
  storageFor,
  type EntityName,
  type EntityRow,
} from '@/domain/schema';
import type { SqliteAdapter } from '@/data/adapters/sqlite';

import {
  acceptsNull,
  columnOf,
  primaryKeyColumn,
  quoteIdentifier,
  readLiveTable,
  type LiveTable,
} from './table';
import {
  CLEAR_REFERENCE,
  type IntegrityFinding,
  type IntegrityFix,
  type IntegrityOption,
} from './types';

/** The table that holds the class groups - the streams of the canonical model. */
export const CLASS_GROUP_TABLE = storageFor('class_group').table;

/** The entity whose table is the given one, when the registry holds it. */
const ENTITY_BY_TABLE = new Map<string, EntityName>(
  ENTITY_NAMES.map((name) => [storageFor(name).table, name] as const)
);

/** The learner statuses that mean the learner belongs to a class. */
const LEARNER_NEEDS_CLASS = new Set(['enrolled']);

interface FieldShape {
  safeParse(value: unknown): { success: boolean };
}

interface ShapeCarrier {
  readonly shape?: Record<string, FieldShape>;
}

const requiredCache = new Map<string, boolean>();

/**
 * True when the model requires the field: it does not accept a missing value.
 *
 * The schema is the model's own word on the matter, so the check does not need a rule per
 * entity.
 */
export function fieldIsRequired(entity: EntityName, field: string): boolean {
  const key = `${entity}.${field}`;
  const cached = requiredCache.get(key);
  if (cached !== undefined) return cached;

  const schema = schemaFor(entity) as unknown as ShapeCarrier;
  const fieldSchema = schema.shape?.[field];
  const required = fieldSchema ? !fieldSchema.safeParse(undefined).success : false;
  requiredCache.set(key, required);
  return required;
}

/** True when the value holds nothing: null, an empty string or only spaces. */
export function isBlank(value: string | null): boolean {
  return value === null || value.trim() === '';
}

/** The value as text, or null when there is none. */
export function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

/** The label of a row, falling back to its id when the row predates the model. */
export function labelForRow(entity: EntityName, row: Readonly<Record<string, unknown>>): string {
  try {
    const label = labelOf(entity, row as unknown as EntityRow<EntityName>);
    if (label && !label.includes('undefined')) return label;
  } catch {
    // A legacy row does not have to match the model's shape; the id is enough.
  }
  return String(row.id ?? '');
}

/** One row of a table, with the columns the checks look at. */
interface ScannedRow {
  /** A handle that is unique inside the table, so a finding can name its row. */
  readonly handle: string;
  readonly id: string | null;
  readonly values: Readonly<Record<string, string | null>>;
  readonly deleted: boolean;
}

/** Reads the rows of a table with the columns the checks look at. */
async function scanTable(
  adapter: SqliteAdapter,
  live: LiveTable,
  primaryKey: string,
  columns: readonly string[]
): Promise<ScannedRow[]> {
  const wanted = [...columns];
  if (columnOf(live, 'deleted_at') && !wanted.includes('deleted_at')) wanted.push('deleted_at');
  const selected = [primaryKey, ...wanted.filter((column) => column !== primaryKey)];
  const handleColumn = live.hasRowId ? 'rowid AS "__rowid__", ' : '';
  const sql = `SELECT ${handleColumn}${selected
    .map((column) => `${quoteIdentifier(column)} AS ${quoteIdentifier(column)}`)
    .join(', ')} FROM ${quoteIdentifier(live.table)}`;

  const raw = await adapter.all<Record<string, unknown>>(sql);

  return raw.map((row, index) => {
    const values: Record<string, string | null> = {};
    for (const column of wanted) {
      const value = row[column];
      values[column] = value === null || value === undefined ? null : String(value);
    }
    const deletedAt = values['deleted_at'];
    return {
      handle: live.hasRowId ? String(row['__rowid__']) : `${String(row[primaryKey])}#${index}`,
      id: row[primaryKey] === null || row[primaryKey] === undefined ? null : String(row[primaryKey]),
      values,
      deleted: deletedAt !== null && deletedAt !== undefined,
    };
  });
}

/** One row of a table a reference may point at. */
export interface TargetRow {
  readonly id: string;
  /** The label of the row, as the registry names it. */
  readonly name: string;
  /** The label with the id, which is what a picker shows. */
  readonly label: string;
  /** The level the row belongs to, when the row names one. */
  readonly levelId: string | null;
  /** The academic year the row belongs to, when the row names one. */
  readonly academicYearId: string | null;
  /** True when the row is archived: it is not part of the live model. */
  readonly archived: boolean;
}

/**
 * What the checks read from the database.
 *
 * The live shape of a table, the rows it holds and the choices a fix may offer are read
 * once each: the report walks every entity, and the tables repeat.
 */
export class IntegrityContext {
  private readonly tableCache = new Map<string, Promise<LiveTable | null>>();
  private readonly idCache = new Map<string, Promise<ReadonlySet<string>>>();
  private readonly targetCache = new Map<EntityName, Promise<readonly TargetRow[]>>();

  constructor(readonly adapter: SqliteAdapter) {}

  /** The live shape of a table, or null when the database does not hold it. */
  liveTable(table: string): Promise<LiveTable | null> {
    const cached = this.tableCache.get(table);
    if (cached) return cached;
    const pending = readLiveTable(this.adapter, table);
    this.tableCache.set(table, pending);
    return pending;
  }

  /** The ids a table holds; an empty set when the table is not there. */
  ids(table: string, primaryKey: string): Promise<ReadonlySet<string>> {
    const key = `${table}.${primaryKey}`;
    const cached = this.idCache.get(key);
    if (cached) return cached;

    const pending = (async () => {
      const live = await this.liveTable(table);
      if (!live) return new Set<string>();
      const rows = await this.adapter.all<Record<string, unknown>>(
        `SELECT ${quoteIdentifier(primaryKey)} AS ${quoteIdentifier(primaryKey)} FROM ${quoteIdentifier(table)}`
      );
      return new Set(
        rows
          .map((row) => row[primaryKey])
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      );
    })();
    this.idCache.set(key, pending);
    return pending;
  }

  /**
   * Every row of a table a reference may point at.
   *
   * The list is complete: the tool does not hide a row behind a limit, because a row the
   * user cannot see is a row the user cannot choose. The order is the label, with the id
   * as the tiebreaker, so the list is stable.
   */
  targetRows(entity: EntityName): Promise<readonly TargetRow[]> {
    const cached = this.targetCache.get(entity);
    if (cached) return cached;

    const pending = (async () => {
      const storage = storageFor(entity);
      const live = await this.liveTable(storage.table);
      if (!live) return [];

      const rows = await this.adapter.all<Record<string, unknown>>(
        `SELECT * FROM ${quoteIdentifier(live.table)} ORDER BY ${quoteIdentifier(storage.primaryKey)}`
      );
      const hasDeletedAt = columnOf(live, 'deleted_at') !== undefined;

      const targets: TargetRow[] = rows.map((row) => {
        const id = String(row[storage.primaryKey]);
        const name = labelForRow(entity, row);
        return {
          id,
          name,
          label: `${name} (${id})`,
          levelId: asText(row['level_id']),
          academicYearId: asText(row['academic_year_id']),
          archived: hasDeletedAt && asText(row['deleted_at']) !== null,
        };
      });

      return [...targets].sort(
        (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id)
      );
    })();
    this.targetCache.set(entity, pending);
    return pending;
  }

  /** The row with this id, archived or not. */
  async targetRow(entity: EntityName, id: string): Promise<TargetRow | undefined> {
    const rows = await this.targetRows(entity);
    return rows.find((row) => row.id === id);
  }

  /** The name of the row with this id, when the table holds it. */
  async nameOf(entity: EntityName, id: string): Promise<string | null> {
    const row = await this.targetRow(entity, id);
    return row ? row.name : null;
  }
}

/** The finding id of a defect: the same defect always gets the same id. */
export function findingId(
  kind: IntegrityFinding['kind'],
  table: string,
  column: string,
  handle: string
): string {
  return `${kind}:${table}:${column}:${handle}`;
}

/**
 * The choices a reference fix offers.
 *
 * Every live row of the target table is a choice, and a column the model allows to be
 * absent can be cleared as well. The tool does not narrow the list down on its own: it
 * marks the choices that would break the model and leaves the rest to the user.
 */
async function referenceOptions(
  context: IntegrityContext,
  targetEntity: EntityName | null,
  targetTable: string,
  row: ScannedRow | null,
  canClear: boolean
): Promise<readonly IntegrityOption[]> {
  const options: IntegrityOption[] = [];
  if (canClear) {
    options.push({
      id: CLEAR_REFERENCE,
      label: 'Clear the reference (drop the value)',
      selectable: true,
      reason: null,
    });
  }
  if (!targetEntity) return options;

  for (const target of await context.targetRows(targetEntity)) {
    // An archived row is not part of the live model, so it is not a choice.
    if (target.archived) continue;
    const reason = await alignmentReason(context, targetTable, row, target);
    options.push({ id: target.id, label: target.label, selectable: reason === null, reason });
  }
  return options;
}

/**
 * Why a class group cannot be the class group of this row.
 *
 * Spec 02 §12.2: the class group of an enrolment carries the same level and academic year.
 * The repository refuses a row that breaks it, so the tool refuses the choice too.
 */
async function alignmentReason(
  context: IntegrityContext,
  targetTable: string,
  row: ScannedRow | null,
  target: TargetRow
): Promise<string | null> {
  if (targetTable !== CLASS_GROUP_TABLE || !row) return null;
  const rowLevel = row.values['level_id'] ?? null;
  const rowYear = row.values['academic_year_id'] ?? null;
  // The row does not say which level and year it is in, so there is nothing to check.
  if (rowLevel === null || rowYear === null) return null;
  if (target.levelId === null || target.academicYearId === null) {
    return 'the class group does not carry a level and an academic year, so the tool cannot check that it matches the row';
  }
  if (target.levelId === rowLevel && target.academicYearId === rowYear) return null;

  const level = await context.nameOf('level', rowLevel);
  const year = await context.nameOf('academic_year', rowYear);
  const targetLevel = await context.nameOf('level', target.levelId);
  const targetYear = await context.nameOf('academic_year', target.academicYearId);
  return `the class group is in ${targetLevel ?? 'another level'} of ${targetYear ?? 'another year'}, but the row is in ${level ?? 'another level'} of ${year ?? 'another year'}: a class group carries the level and the academic year of the row that points at it`;
}

/**
 * The fix that points a reference at the row the user chooses.
 *
 * A column the model allows to be absent can also be cleared, and that is one of the
 * choices rather than a fix of its own.
 */
function referenceFix(
  finding: Omit<IntegrityFinding, 'fix' | 'needs'>,
  before: string | null,
  targetEntity: EntityName | null,
  canClear: boolean,
  options: readonly IntegrityOption[]
): IntegrityFix {
  const target = targetEntity ?? finding.relatedEntity;
  return {
    kind: canClear ? 'replace_reference' : 'set_reference',
    findingId: finding.id,
    entity: finding.entity,
    table: finding.table,
    column: finding.column,
    rowId: finding.rowId,
    before,
    after: null,
    rewritesRow: true,
    description: canClear
      ? `Sets ${finding.table}.${finding.column} to the ${target ?? 'referenced'} row you choose, or clears the reference if you choose that instead. The tool does not guess which row the stored value referred to.`
      : `Sets ${finding.table}.${finding.column} to the ${target ?? 'referenced'} row you choose. The tool does not guess which row the stored value referred to.`,
    needs: canClear
      ? `the ${target ?? 'referenced'} row to point at, or the choice to clear the reference`
      : `the id of the ${target ?? 'referenced'} row to point at`,
    options,
  };
}

/**
 * The checks of one entity's reference columns.
 *
 * Every column the storage metadata declares as a reference is looked at, so an entity that
 * joins the registry later is covered without a new rule.
 */
export async function checkReferences(
  context: IntegrityContext,
  entity: EntityName,
  live: LiveTable
): Promise<IntegrityFinding[]> {
  const storage = storageFor(entity);
  const primaryKey = primaryKeyColumn(live, storage.primaryKey);
  if (!primaryKey) return [];

  const refs = Object.entries(storage.refs);
  const columns = refs.map(([column]) => column).filter((column) => columnOf(live, column));
  if (columns.length === 0) return [];

  const rows = (await scanTable(context.adapter, live, primaryKey, columns)).filter(
    (row) => !row.deleted
  );
  const findings: IntegrityFinding[] = [];

  for (const [column, targetTable] of refs) {
    if (!columns.includes(column)) continue;
    const targetEntity = ENTITY_BY_TABLE.get(targetTable) ?? null;
    const targetStorage = targetEntity ? storageFor(targetEntity) : null;
    const targetLive = targetEntity ? await context.liveTable(targetTable) : null;
    const targetPrimaryKey =
      targetLive && targetStorage
        ? primaryKeyColumn(targetLive, targetStorage.primaryKey)
        : undefined;
    const targetIds = targetPrimaryKey
      ? await context.ids(targetTable, targetPrimaryKey)
      : new Set<string>();
    const required = fieldIsRequired(entity, column);
    const isClassGroup = targetTable === CLASS_GROUP_TABLE;
    // A reference can only be dropped where the model allows the field to be absent. A
    // column the model requires needs a real row, even when the table would take a null.
    const canClear = acceptsNull(live, column) && !required;

    for (const row of rows) {
      const value = row.values[column] ?? null;

      if (value === null) {
        // A missing reference is a defect only where the model requires one.
        if (!required) continue;
        if (isClassGroup) {
          findings.push(
            await nullStreamFinding(context, entity, live, row, column, targetEntity, value, canClear)
          );
          continue;
        }
        findings.push(
          await malformedFinding(
            context,
            entity,
            live,
            row,
            column,
            targetEntity,
            targetTable,
            value,
            'the reference is missing',
            canClear
          )
        );
        continue;
      }

      if (isBlank(value)) {
        if (isClassGroup && required) {
          findings.push(
            await nullStreamFinding(context, entity, live, row, column, targetEntity, value, canClear)
          );
          continue;
        }
        findings.push(
          await malformedFinding(
            context,
            entity,
            live,
            row,
            column,
            targetEntity,
            targetTable,
            value,
            'the reference is empty',
            canClear
          )
        );
        continue;
      }

      if (!isId(value)) {
        findings.push(
          await malformedFinding(
            context,
            entity,
            live,
            row,
            column,
            targetEntity,
            targetTable,
            value,
            'the reference is not a canonical id (UUIDv7)',
            canClear
          )
        );
        continue;
      }

      if (!targetIds.has(value)) {
        findings.push(
          await orphanFinding(
            context,
            entity,
            live,
            row,
            column,
            targetEntity,
            targetTable,
            value,
            canClear
          )
        );
      }
    }
  }

  return findings;
}

/** A reference that points at a row that is not there. */
async function orphanFinding(
  context: IntegrityContext,
  entity: EntityName,
  live: LiveTable,
  row: ScannedRow,
  column: string,
  targetEntity: EntityName | null,
  targetTable: string,
  value: string,
  canClear: boolean
): Promise<IntegrityFinding> {
  const id = findingId('orphan_reference', live.table, column, row.handle);
  const base = {
    id,
    kind: 'orphan_reference' as const,
    entity,
    table: live.table,
    column,
    value,
    rowId: row.id,
    rowHandle: row.handle,
    relatedEntity: targetEntity,
    message: `${live.table}.${column} points at ${value}, which is not a row of ${targetEntity ?? 'the referenced table'}.`,
  };

  const options = await referenceOptions(context, targetEntity, targetTable, row, canClear);
  const fix = referenceFix(base, value, targetEntity, canClear, options);
  return { ...base, needs: fix.needs, fix };
}

/** A reference that does not hold an id the model can use. */
async function malformedFinding(
  context: IntegrityContext,
  entity: EntityName,
  live: LiveTable,
  row: ScannedRow,
  column: string,
  targetEntity: EntityName | null,
  targetTable: string,
  value: string | null,
  reason: string,
  canClear: boolean
): Promise<IntegrityFinding> {
  const id = findingId('malformed_reference', live.table, column, row.handle);
  const base = {
    id,
    kind: 'malformed_reference' as const,
    entity,
    table: live.table,
    column,
    value,
    rowId: row.id,
    rowHandle: row.handle,
    relatedEntity: targetEntity,
    message: `${live.table}.${column} holds ${
      value === null ? 'nothing' : `"${value}"`
    } and ${reason}.`,
  };

  const options = await referenceOptions(context, targetEntity, targetTable, row, canClear);
  const fix = referenceFix(base, value, targetEntity, canClear, options);
  return { ...base, needs: fix.needs, fix };
}

/**
 * A row the model puts in a class group, but which has none.
 *
 * The class group of a row is the reference the storage metadata declares against the
 * class-group table, so an entity that joins a class group is covered as well.
 */
export async function nullStreamFinding(
  context: IntegrityContext,
  entity: EntityName,
  live: LiveTable,
  row: ScannedRow,
  column: string,
  targetEntity: EntityName | null,
  value: string | null,
  canClear: boolean
): Promise<IntegrityFinding> {
  const id = findingId('null_stream', live.table, column, row.handle);
  const base = {
    id,
    kind: 'null_stream' as const,
    entity,
    table: live.table,
    column,
    value,
    rowId: row.id,
    rowHandle: row.handle,
    relatedEntity: targetEntity,
    message: `${live.table}.${column} is empty: this row has no class group.`,
  };

  const options = await referenceOptions(
    context,
    targetEntity,
    CLASS_GROUP_TABLE,
    row,
    canClear
  );
  const fix = referenceFix(base, value, targetEntity, canClear, options);
  return { ...base, needs: fix.needs, fix };
}

/** A learner that belongs to no class group. */
export async function learnerWithoutClassGroup(
  context: IntegrityContext,
  learnerEntity: EntityName,
  learnerTable: LiveTable,
  enrolmentTable: LiveTable | null
): Promise<IntegrityFinding[]> {
  if (!enrolmentTable) return [];
  const learnerStorage = storageFor(learnerEntity);
  const primaryKey = primaryKeyColumn(learnerTable, learnerStorage.primaryKey);
  if (!primaryKey) return [];
  if (!columnOf(learnerTable, 'status')) return [];

  const rows = await scanTable(context.adapter, learnerTable, primaryKey, ['status']);
  const enrolled = rows.filter(
    (row) => !row.deleted && LEARNER_NEEDS_CLASS.has(row.values['status'] ?? '')
  );
  if (enrolled.length === 0) return [];

  const enrolmentStorage = storageFor('enrolment');
  const enrolmentPrimaryKey = primaryKeyColumn(enrolmentTable, enrolmentStorage.primaryKey);
  const learnerReference = Object.entries(enrolmentStorage.refs).find(
    ([, target]) => target === learnerStorage.table
  );
  if (!enrolmentPrimaryKey || !learnerReference) return [];
  const learnerColumn = learnerReference[0];

  const liveEnrolments = await scanTable(context.adapter, enrolmentTable, enrolmentPrimaryKey, [
    learnerColumn,
  ]);
  const enrolledLearners = new Set(
    liveEnrolments.filter((row) => !row.deleted).map((row) => row.values[learnerColumn] ?? '')
  );

  const findings: IntegrityFinding[] = [];
  for (const row of enrolled) {
    if (row.id === null) continue;
    if (enrolledLearners.has(row.id)) continue;
    const id = findingId('null_stream', learnerTable.table, 'enrolment.learner_id', row.handle);
    // The enrolment takes the level, the year and the programme of the class group, so
    // every live class group is a choice here.
    const options = (await context.targetRows('class_group'))
      .filter((target) => !target.archived)
      .map((target) => ({
        id: target.id,
        label: target.label,
        selectable: true,
        reason: null,
      }));
    const fix: IntegrityFix = {
      kind: 'create_enrolment',
      findingId: id,
      entity: 'enrolment',
      table: enrolmentTable.table,
      column: 'class_group_id',
      rowId: null,
      before: null,
      after: null,
      rewritesRow: false,
      description:
        'Creates an active enrolment for this learner in the class group you choose, with the year, level and programme of that class group, starting on the first day of its academic year and recorded as a new admission.',
      needs: 'the id of the class group to enrol the learner in',
      options,
    };
    findings.push({
      id,
      kind: 'null_stream',
      entity: learnerEntity,
      table: learnerTable.table,
      column: 'enrolment.learner_id',
      value: null,
      rowId: row.id,
      rowHandle: row.handle,
      relatedEntity: 'enrolment',
      message: 'This learner is enrolled but has no enrolment, so it has no class group.',
      needs: fix.needs,
      fix,
    });
  }
  return findings;
}

/**
 * The rows of a table that carry the same id.
 *
 * The canonical DDL makes the id the primary key, so a table that predates the model is
 * the one that can hold the same id twice.
 */
export async function checkDuplicateIds(
  context: IntegrityContext,
  entity: EntityName,
  live: LiveTable
): Promise<IntegrityFinding[]> {
  const storage = storageFor(entity);
  const primaryKey = primaryKeyColumn(live, storage.primaryKey);
  if (!primaryKey) return [];

  const duplicates = await context.adapter.all<Record<string, unknown>>(
    `SELECT ${quoteIdentifier(primaryKey)} AS "value", COUNT(*) AS "total"
       FROM ${quoteIdentifier(live.table)}
      GROUP BY ${quoteIdentifier(primaryKey)}
     HAVING COUNT(*) > 1`
  );
  if (duplicates.length === 0) return [];

  const findings: IntegrityFinding[] = [];
  for (const duplicate of duplicates) {
    const value = String(duplicate['value']);
    const total = Number(duplicate['total'] ?? 0);
    const rows = await context.adapter.all<Record<string, unknown>>(
      `SELECT ${live.hasRowId ? 'rowid AS "__rowid__", ' : ''}${quoteIdentifier(primaryKey)} AS ${quoteIdentifier(primaryKey)}
         FROM ${quoteIdentifier(live.table)}
        WHERE ${quoteIdentifier(primaryKey)} = ?${live.hasRowId ? ' ORDER BY rowid' : ''}`,
      [value]
    );

    // The first row keeps the id; every other row with it is a duplicate.
    rows.slice(1).forEach((row, index) => {
      const handle = live.hasRowId
        ? String(row['__rowid__'])
        : `${value}#${index + 1}`;
      const id = findingId('duplicate_id', live.table, primaryKey, handle);
      const newId = generateUuidv7();
      const fix: IntegrityFix = {
        kind: 'rekey_duplicate',
        findingId: id,
        entity,
        table: live.table,
        column: primaryKey,
        rowId: value,
        before: value,
        after: newId,
        rewritesRow: true,
        description: `Gives this row the new id ${newId}. The other row that carries ${value} keeps it, so anything that pointed at ${value} now points at that row, and this row is left without those references.`,
        needs: null,
        options: [],
      };
      findings.push({
        id,
        kind: 'duplicate_id',
        entity,
        table: live.table,
        column: primaryKey,
        value,
        rowId: value,
        rowHandle: handle,
        relatedEntity: null,
        message: `The id ${value} is on ${total} rows of ${live.table}.`,
        needs: null,
        fix,
      });
    });
  }
  return findings;
}

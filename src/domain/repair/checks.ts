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
import type { IntegrityFinding, IntegrityFix, IntegrityOption } from './types';

/** The table that holds the class groups - the streams of the canonical model. */
export const CLASS_GROUP_TABLE = storageFor('class_group').table;

/** The entity whose table is the given one, when the registry holds it. */
const ENTITY_BY_TABLE = new Map<string, EntityName>(
  ENTITY_NAMES.map((name) => [storageFor(name).table, name] as const)
);

/** The learner statuses that mean the learner belongs to a class. */
const LEARNER_NEEDS_CLASS = new Set(['enrolled']);

/** How many rows a fix offers as choices. */
const OPTION_LIMIT = 50;

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

/**
 * What the checks read from the database.
 *
 * The live shape of a table, the ids it holds and the choices a fix may offer are read
 * once each: the report walks every entity, and the tables repeat.
 */
export class IntegrityContext {
  private readonly tableCache = new Map<string, Promise<LiveTable | null>>();
  private readonly idCache = new Map<string, Promise<ReadonlySet<string>>>();
  private readonly optionCache = new Map<string, Promise<readonly IntegrityOption[]>>();

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

  /** The rows a fix may point at, as choices for the user. */
  options(entity: EntityName): Promise<readonly IntegrityOption[]> {
    const cached = this.optionCache.get(entity);
    if (cached) return cached;

    const pending = (async () => {
      const storage = storageFor(entity);
      const live = await this.liveTable(storage.table);
      if (!live) return [];
      const rows = await this.adapter.all<Record<string, unknown>>(
        `SELECT * FROM ${quoteIdentifier(live.table)} LIMIT ${OPTION_LIMIT}`
      );
      return rows.map((row) => ({
        id: String(row[storage.primaryKey]),
        label: `${labelForRow(entity, row)} (${String(row[storage.primaryKey])})`,
      }));
    })();
    this.optionCache.set(entity, pending);
    return pending;
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

/** The fix that drops a reference the column can do without. */
function clearReferenceFix(
  finding: Omit<IntegrityFinding, 'fix' | 'needs'>,
  before: string | null
): IntegrityFix {
  return {
    kind: 'clear_reference',
    findingId: finding.id,
    entity: finding.entity,
    table: finding.table,
    column: finding.column,
    rowId: finding.rowId,
    before,
    after: null,
    rewritesRow: true,
    description: `Clears ${finding.table}.${finding.column}: the reference is dropped and the row itself is kept.`,
    needs: null,
    options: [],
  };
}

/** The fix that points a reference at the row the user chooses. */
function setReferenceFix(
  finding: Omit<IntegrityFinding, 'fix' | 'needs'>,
  before: string | null,
  targetEntity: EntityName | null,
  options: readonly IntegrityOption[]
): IntegrityFix {
  const target = targetEntity ?? finding.relatedEntity;
  return {
    kind: 'set_reference',
    findingId: finding.id,
    entity: finding.entity,
    table: finding.table,
    column: finding.column,
    rowId: finding.rowId,
    before,
    after: null,
    rewritesRow: true,
    description: `Sets ${finding.table}.${finding.column} to the ${target ?? 'referenced'} row you choose. The tool does not guess which row the stored value referred to.`,
    needs: `the id of the ${target ?? 'referenced'} row to point at`,
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
    const nullable = acceptsNull(live, column) && !required;

    for (const row of rows) {
      const value = row.values[column] ?? null;

      if (value === null) {
        // A missing reference is a defect only where the model requires one.
        if (!required) continue;
        if (isClassGroup) {
          findings.push(await nullStreamFinding(context, entity, live, row, column, targetEntity, null));
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
            null,
            'the reference is missing',
            nullable
          )
        );
        continue;
      }

      if (isBlank(value)) {
        if (isClassGroup && required) {
          findings.push(await nullStreamFinding(context, entity, live, row, column, targetEntity, value));
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
            value,
            'the reference is empty',
            nullable
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
            value,
            'the reference is not a canonical id (UUIDv7)',
            nullable
          )
        );
        continue;
      }

      if (!targetIds.has(value)) {
        findings.push(
          await orphanFinding(context, entity, live, row, column, targetEntity, value, nullable)
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
  value: string,
  nullable: boolean
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

  if (nullable) {
    const fix = clearReferenceFix(base, value);
    return { ...base, needs: null, fix };
  }

  const options = targetEntity ? await context.options(targetEntity) : [];
  const fix = setReferenceFix(base, value, targetEntity, options);
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
  value: string | null,
  reason: string,
  nullable: boolean
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

  if (nullable) {
    const fix = clearReferenceFix(base, value);
    return { ...base, needs: null, fix };
  }

  const options = targetEntity ? await context.options(targetEntity) : [];
  const fix = setReferenceFix(base, value, targetEntity, options);
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
  value: string | null
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

  const options = targetEntity ? await context.options(targetEntity) : [];
  const fix = setReferenceFix(base, value, targetEntity, options);
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
    const options = await context.options('class_group');
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

// ABOUTME: Column metadata and the row codec: how a schema-shaped row becomes SQLite
// ABOUTME: parameters and back again, with JSON columns stored as TEXT and booleans as 0/1.

import { databaseSchemaFor, schemaFor, storageFor, type EntityName } from '@/domain/schema';
import type { SqliteBindValue, SqliteRow } from '@/data/adapters/sqlite';
import { RestrictedDataError, type FieldCipher } from '@/data/security';

import { concurrencyColumnFor, hasBusinessVersion } from './concurrency';

/** How a column is stored. */
export type ColumnKind = 'text' | 'json' | 'boolean' | 'integer' | 'real';

/** What the repository needs to know about one column. */
export interface ColumnMeta {
  readonly kind: ColumnKind;
  /** True when the schema accepts `null` for this field. */
  readonly nullable: boolean;
}

/** The column map of one entity. */
export interface EntityColumns {
  readonly entity: EntityName;
  readonly table: string;
  readonly primaryKey: string;
  /** Column name to metadata, in declaration order. */
  readonly columns: Readonly<Record<string, ColumnMeta>>;
  /** The column that carries the optimistic-concurrency counter. */
  readonly concurrencyColumn: string;
  /** True when the entity declares a business `version` field. */
  readonly hasBusinessVersion: boolean;
  /** The columns whose contents are encrypted at rest. */
  readonly encrypted: readonly string[];
}

interface ZodDefLike {
  readonly type?: string;
  readonly innerType?: unknown;
  readonly shape?: Record<string, unknown>;
}

function readDef(schema: unknown): ZodDefLike | undefined {
  if (schema === null || typeof schema !== 'object') return undefined;
  const holder = schema as { _zod?: { def?: unknown } };
  const def = holder._zod?.def;
  if (def === null || typeof def !== 'object') return undefined;
  return def as ZodDefLike;
}

const WRAPPER_TYPES = new Set(['optional', 'nullable', 'default', 'prefault', 'nonoptional']);

/** The shape of a zod object, used to read the nullability of each field. */
function shapeOf(schema: unknown): Record<string, unknown> {
  const def = readDef(schema);
  return def && def.type === 'object' && def.shape ? def.shape : {};
}

/** True when the field accepts `null`, looking through the optional/nullable wrappers. */
function fieldIsNullable(field: unknown): boolean {
  let current = field;
  let nullable = false;

  for (let depth = 0; depth < 12; depth += 1) {
    const def = readDef(current);
    if (!def || !def.type) break;
    if (def.type === 'nullable') nullable = true;
    if (!WRAPPER_TYPES.has(def.type)) break;
    current = def.innerType;
  }

  return nullable;
}

function kindOf(type: string): ColumnKind {
  switch (type) {
    case 'boolean':
      return 'boolean';
    case 'integer':
      return 'integer';
    case 'number':
      return 'real';
    case 'array':
    case 'object':
      return 'json';
    default:
      return 'text';
  }
}

function baseTypeOf(type: string | readonly string[]): string {
  if (typeof type === 'string') return type;
  return type.find((candidate) => candidate !== 'null') ?? 'string';
}

const columnCache = new Map<EntityName, EntityColumns>();

/** The column map of an entity, derived from the canonical storage schema. */
export function columnsFor(entity: EntityName): EntityColumns {
  const cached = columnCache.get(entity);
  if (cached) return cached;

  const databaseSchema = databaseSchemaFor(entity);
  const shape = shapeOf(schemaFor(entity));
  const columns: Record<string, ColumnMeta> = {};

  for (const [name, property] of Object.entries(databaseSchema.properties)) {
    columns[name] = {
      kind: kindOf(baseTypeOf(property.type)),
      nullable: fieldIsNullable(shape[name]),
    };
  }

  const resolved: EntityColumns = {
    entity,
    table: storageFor(entity).table,
    primaryKey: storageFor(entity).primaryKey,
    columns,
    concurrencyColumn: concurrencyColumnFor(entity),
    hasBusinessVersion: hasBusinessVersion(entity),
    encrypted: [...storageFor(entity).encrypted],
  };

  columnCache.set(entity, resolved);
  return resolved;
}

/** Encodes one value for the column it is stored in. */
export function encodeValue(value: unknown, meta: ColumnMeta): SqliteBindValue {
  if (value === null || value === undefined) return null;

  switch (meta.kind) {
    case 'boolean':
      return value ? 1 : 0;
    case 'integer':
    case 'real':
      return typeof value === 'number' ? value : Number(value);
    case 'json':
      // A JSON column keeps `null` as the JSON text so the value survives the round trip.
      return JSON.stringify(value);
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

/**
 * Turns a schema-shaped row into column parameters.
 *
 * Absent fields are left out entirely, so the column keeps whatever it held. A cipher seals the
 * entity's encrypted columns here, at the one point every write passes through, so a restricted
 * value reaches the database sealed whichever method wrote it.
 */
export function encodeRow(
  columns: EntityColumns,
  row: Readonly<Record<string, unknown>>,
  cipher?: FieldCipher
): Record<string, SqliteBindValue> {
  const encoded: Record<string, SqliteBindValue> = {};

  for (const [name, meta] of Object.entries(columns.columns)) {
    if (!(name in row)) continue;
    const value = row[name];
    if (value === undefined) continue;

    const stored = encodeValue(value, meta);
    encoded[name] =
      cipher && columns.encrypted.includes(name)
        ? sealValue(columns.entity, name, stored, cipher)
        : stored;
  }

  return encoded;
}

/** Seals one encoded value, refusing an encrypted column that is not stored as text. */
function sealValue(
  entity: EntityName,
  column: string,
  value: SqliteBindValue,
  cipher: FieldCipher
): SqliteBindValue {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new RestrictedDataError(
      'encrypted_column_not_text',
      `${entity}.${column} is declared encrypted but is not stored as text, so it cannot be sealed`
    );
  }
  return cipher.seal(value);
}

/** Decodes one stored value back into the shape the schema expects. */
export function decodeValue(value: unknown, meta: ColumnMeta): unknown {
  if (value === null) return meta.nullable ? null : undefined;

  switch (meta.kind) {
    case 'boolean':
      return Number(value) !== 0;
    case 'integer':
    case 'real':
      return Number(value);
    case 'json':
      return JSON.parse(String(value));
    default:
      return String(value);
  }
}

/**
 * Turns a stored row back into the shape the schema expects.
 *
 * The concurrency counter is not part of the entity schema, so it is reported apart
 * from the row instead of being smuggled into it. A cipher opens the entity's encrypted
 * columns; a value that is not sealed is legacy plaintext and is decoded as it stands.
 */
export function decodeRow(
  columns: EntityColumns,
  raw: SqliteRow,
  cipher?: FieldCipher
): { row: Record<string, unknown>; version: number } {
  const row: Record<string, unknown> = {};

  for (const [name, meta] of Object.entries(columns.columns)) {
    if (!(name in raw)) continue;
    const stored = raw[name];
    const opened =
      cipher && columns.encrypted.includes(name) && typeof stored === 'string'
        ? cipher.open(stored)
        : stored;
    const value = decodeValue(opened, meta);
    if (value === undefined) continue;
    row[name] = value;
  }

  // The concurrency counter is not part of the entity schema, so it never appears in the
  // column map and is read straight from the stored row.
  const stored = raw[columns.concurrencyColumn];
  const version = stored === undefined || stored === null ? 0 : Number(stored);

  return { row, version };
}

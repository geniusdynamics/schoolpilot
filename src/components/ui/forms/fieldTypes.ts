// ABOUTME: Field metadata and schema-inspection helpers for the schema-bound entity form.
// ABOUTME: Defines widget hints, lookup contracts, path updates and zod issue-to-field mapping.

import type { Money } from '@/domain/schema/common';
import type { EntityPickerStatus } from '../EntityPicker';

/** The widgets the schema-bound form registry can render. */
export type FieldWidget =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'date'
  | 'money'
  | 'phone'
  | 'identifier'
  | 'entity'
  | 'select'
  | 'checkbox';

/** The minimum row shape an injected entity lookup offers. */
export interface EntityLookupRow {
  readonly id: string;
}

/**
 * The subset of P1-D01's lookup contract the form consumes. Method signatures keep
 * concrete lookup row types assignable without casting the lookup at the call site.
 */
export interface EntityFormLookup {
  readonly options: readonly EntityLookupRow[];
  readonly byId: ReadonlyMap<string, EntityLookupRow>;
  label(id: string, fallback?: string): string;
  resolve(id: string): EntityLookupRow | undefined;
  readonly status: EntityPickerStatus;
  readonly error?: unknown;
  readonly isFetching?: boolean;
  isArchived?(row: EntityLookupRow): boolean;
  getId?(row: EntityLookupRow): string;
}

export interface FieldOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Declarative metadata for one rendered field. `path` is the dotted path into the entity
 * object; the schema remains the authority for validation. `widget` is a hint and falls
 * back to schema introspection when omitted.
 */
export interface EntityFormFieldMeta {
  readonly path: string;
  readonly label: string;
  readonly order?: number;
  readonly section?: string;
  readonly help?: string;
  readonly widget?: FieldWidget;
  readonly required?: boolean;
  readonly readOnly?: boolean;
  readonly placeholder?: string;
  readonly colSpan?: 1 | 2;
  /** Select/radio options; enum options are inferred from the schema when omitted. */
  readonly options?: readonly FieldOption[];
  readonly min?: number | string;
  readonly max?: number | string;
  readonly step?: number;
  readonly rows?: number;
  readonly currency?: string;
  readonly minorUnitDigits?: number;
  readonly decimalSeparator?: string;
  readonly groupSeparator?: string;
  readonly formatMoney?: (money: Money) => string;
  /** ISO 3166-1 alpha-2 country used to resolve the dialling prefix. */
  readonly country?: string;
  readonly dialCode?: string;
  readonly schemes?: readonly FieldOption[];
  readonly schemeLabel?: string;
  readonly valueLabel?: string;
  /** Key into the injected lookup map for entity fields; defaults to `path`. */
  readonly lookupKey?: string;
  readonly autoComplete?: string;
}

export interface EntityFormSection {
  readonly id: string;
  readonly label: string;
}

export interface FieldGroup {
  readonly section?: string;
  readonly fields: readonly EntityFormFieldMeta[];
}

interface ZodDefLike {
  readonly type?: string;
  readonly format?: string | null;
  readonly shape?: Record<string, unknown>;
  readonly innerType?: unknown;
  readonly element?: unknown;
  readonly entries?: Record<string, string>;
}

function readDef(schema: unknown): ZodDefLike | undefined {
  if (schema === null || typeof schema !== 'object') return undefined;
  const holder = schema as { _zod?: { def?: unknown } };
  const def = holder._zod?.def;
  if (def === null || typeof def !== 'object') return undefined;
  return def as ZodDefLike;
}

const WRAPPER_TYPES = new Set(['optional', 'nullable', 'default', 'prefault', 'nonoptional']);

/** Unwraps optional/nullable/default wrappers to reach the underlying value schema. */
function unwrapSchema(schema: unknown): unknown {
  let current = schema;
  for (let depth = 0; depth < 12; depth += 1) {
    const def = readDef(current);
    if (!def || !def.type || !WRAPPER_TYPES.has(def.type)) return current;
    current = def.innerType;
  }
  return current;
}

/** Resolves a dotted field path against a zod object schema. */
export function schemaAtPath(schema: unknown, path: string): unknown {
  const segments = path.split('.').filter(Boolean);
  let current: unknown = schema;

  for (const segment of segments) {
    current = unwrapSchema(current);
    const def = readDef(current);
    if (!def) return undefined;

    if (def.type === 'object' && def.shape && segment in def.shape) {
      current = def.shape[segment];
      continue;
    }
    if (def.type === 'array' && /^\d+$/.test(segment) && def.element !== undefined) {
      current = def.element;
      continue;
    }
    return undefined;
  }

  return current;
}

/** Infers a widget from the schema at `path`; metadata can always override it. */
export function inferFieldWidget(schema: unknown, path: string): FieldWidget {
  const node = unwrapSchema(schemaAtPath(schema, path));
  const def = readDef(node);
  if (!def) return 'text';

  if (def.type === 'enum') return 'select';
  if (def.type === 'boolean') return 'checkbox';
  if (def.type === 'number') return 'number';
  if (def.type === 'string' && def.format === 'date') return 'date';

  if (def.type === 'object' && def.shape) {
    if ('amount_minor' in def.shape && 'currency' in def.shape) return 'money';
    if ('number' in def.shape) return 'phone';
    if ('scheme' in def.shape && 'value' in def.shape) return 'identifier';
  }

  return 'text';
}

/** Infers requiredness from the outer wrapper of the schema at `path`. */
export function inferFieldRequired(schema: unknown, path: string): boolean {
  const def = readDef(schemaAtPath(schema, path));
  if (!def || !def.type) return false;
  return !WRAPPER_TYPES.has(def.type);
}

/** Reads enum options from the schema at `path` for select widgets. */
export function inferFieldOptions(schema: unknown, path: string): readonly FieldOption[] | undefined {
  const node = unwrapSchema(schemaAtPath(schema, path));
  const def = readDef(node);
  if (!def || def.type !== 'enum' || !def.entries) return undefined;
  return Object.keys(def.entries).map((value) => ({ value, label: value.replace(/_/g, ' ') }));
}

export function resolveFieldWidget(meta: EntityFormFieldMeta, schema: unknown): FieldWidget {
  return meta.widget ?? inferFieldWidget(schema, meta.path);
}

export function resolveFieldOptions(
  meta: EntityFormFieldMeta,
  schema: unknown
): readonly FieldOption[] | undefined {
  return meta.options ?? inferFieldOptions(schema, meta.path);
}

export function resolveFieldRequired(meta: EntityFormFieldMeta, schema: unknown): boolean {
  return meta.required ?? inferFieldRequired(schema, meta.path);
}

/** Stable ordering by explicit `order`, then declaration order. */
export function orderFields(fields: readonly EntityFormFieldMeta[]): EntityFormFieldMeta[] {
  return fields
    .map((field, index) => ({ field, index }))
    .sort((a, b) => (a.field.order ?? a.index) - (b.field.order ?? b.index))
    .map((entry) => entry.field);
}

/** Groups ordered fields by section, preserving the first section occurrence. */
export function groupFields(fields: readonly EntityFormFieldMeta[]): FieldGroup[] {
  const groups: { section?: string; fields: EntityFormFieldMeta[] }[] = [];
  for (const field of orderFields(fields)) {
    const group = groups.find((candidate) => candidate.section === field.section);
    if (group) group.fields.push(field);
    else groups.push({ section: field.section, fields: [field] });
  }
  return groups;
}

/** Deterministic id for a field control, used for labels and first-error focus. */
export function fieldControlId(prefix: string, path: string): string {
  const slug = path
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${slug}`;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reads a dotted path from a form value, including numeric array indexes. */
export function getValueAtPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split('.').filter(Boolean)) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (!isPlainRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Returns a copy along `path` with the leaf replaced. `undefined` removes an object key,
 * so optional fields stay absent rather than serialising as explicit nulls. Numeric
 * segments update array elements without mutating the source array.
 */
export function setValueAtPath(
  source: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) return source;
  return setAtPath(source, segments, value) as Record<string, unknown>;
}

function setAtPath(node: unknown, segments: readonly string[], value: unknown): unknown {
  const [head, ...rest] = segments;

  if (Array.isArray(node)) {
    const index = Number(head);
    const copy = [...node];
    copy[index] = rest.length === 0 ? value : setAtPath(copy[index], rest, value);
    return copy;
  }

  const record: Record<string, unknown> = isPlainRecord(node) ? { ...node } : {};

  if (rest.length === 0) {
    if (value === undefined) delete record[head];
    else record[head] = value;
    return record;
  }

  record[head] = setAtPath(record[head], rest, value);
  return record;
}

export interface ZodIssueLike {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

export interface MappedIssues {
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly formErrors: readonly string[];
}

/**
 * Maps zod issues to declared field paths. A nested issue (`total.amount_minor`) belongs to
 * the longest declared path (`total`) so the error renders beside the visible control.
 * Issues with no matching field become form-level errors.
 */
export function mapIssuesToFields(
  issues: readonly ZodIssueLike[],
  fieldPaths: readonly string[]
): MappedIssues {
  const byLongestPath = [...fieldPaths].sort((a, b) => b.length - a.length);
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    const issuePath = issue.path.map(String).join('.');
    const match = byLongestPath.find(
      (fieldPath) => issuePath === fieldPath || issuePath.startsWith(`${fieldPath}.`)
    );

    if (match) {
      const messages = fieldErrors[match] ?? [];
      if (!messages.includes(issue.message)) messages.push(issue.message);
      fieldErrors[match] = messages;
    } else if (!formErrors.includes(issue.message)) {
      formErrors.push(issue.message);
    }
  }

  return { fieldErrors, formErrors };
}

/** Deterministic serialisation for dirty comparison; key order never affects the result. */
export function stableFormValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map(stableFormValue).join(',')}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableFormValue(record[key])}`)
    .join(',')}}`;
}

/** Normalises a form value into a plain record without mutating the caller's object. */
export function formRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? { ...value } : {};
}

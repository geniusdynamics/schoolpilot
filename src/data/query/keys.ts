// ABOUTME: Canonical query keys: the hash every cache entry is filed under.
// ABOUTME: Sorts the keys, drops undefined values, stores dates as ISO and refuses unsafe values.

import type { EntityName } from '@/domain/schema';

/** The lifecycle of one cached read. */
export type Status = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

/** The query part of a key: a plain, canonicalised object. */
export type QuerySnapshotObject = Readonly<Record<string, unknown>>;

/**
 * The identity of one cached read.
 *
 * `hash` is `${entity}:${stableStringify(query)}` and is the map key of the cache. The
 * entity is part of the hash, so `learner:{}` and `class_group:{}` are two entries.
 */
export interface QueryKey<E extends EntityName = EntityName> {
  readonly entity: E;
  /** The canonical, frozen copy of the query the key was built from. */
  readonly query: QuerySnapshotObject;
  readonly hash: string;
}

/**
 * Serialises a value into a stable string.
 *
 * The key order does not matter, `undefined` object values are dropped and a `Date`
 * becomes its ISO string. Everything that cannot survive a round trip through JSON is
 * refused: undefined array elements, functions, symbols, bigints, non-finite numbers
 * and objects that are not plain.
 */
export function stableStringify(value: unknown): string {
  return canonical(value, '$');
}

/**
 * Builds the key of one cached read.
 *
 * The query is deep-cloned and frozen, so a later mutation of the caller's object can
 * never desync the key from its hash. Dates are stored as ISO strings.
 */
export function queryKey<E extends EntityName>(entity: E, query: object = {}): QueryKey<E> {
  const snapshot = cloneQuery(query) as QuerySnapshotObject;
  return Object.freeze({
    entity,
    query: snapshot,
    hash: `${entity}:${stableStringify(snapshot)}`,
  });
}

function canonical(value: unknown, path: string): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError(`query key ${path}: non-finite number`);
      return String(value);
    case 'undefined':
      return 'null';
    case 'object':
      break;
    default:
      throw new TypeError(`query key ${path}: unsupported ${typeof value}`);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError(`query key ${path}: invalid date`);
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item, index) => {
        if (item === undefined) {
          throw new TypeError(`query key ${path}[${index}]: undefined array element`);
        }
        return canonical(item, `${path}[${index}]`);
      })
      .join(',')}]`;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = value.constructor?.name ?? 'object';
    throw new TypeError(`query key ${path}: unsupported object ${name}`);
  }

  const parts: string[] = [];
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const entry = (value as Record<string, unknown>)[key];
    if (entry === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonical(entry, `${path}.${key}`)}`);
  }
  return `{${parts.join(',')}}`;
}

function cloneQuery(value: unknown, path = '$'): unknown {
  if (value === null || typeof value !== 'object') return value;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError(`query key ${path}: invalid date`);
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item, index) => {
        if (item === undefined) {
          throw new TypeError(`query key ${path}[${index}]: undefined array element`);
        }
        return cloneQuery(item, `${path}[${index}]`);
      })
    );
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = value.constructor?.name ?? 'object';
    throw new TypeError(`query key ${path}: unsupported object ${name}`);
  }

  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const entry = (value as Record<string, unknown>)[key];
    if (entry === undefined) continue;
    copy[key] = cloneQuery(entry, `${path}.${key}`);
  }
  return Object.freeze(copy);
}

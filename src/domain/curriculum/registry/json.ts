// ABOUTME: JSON helpers the pack registry shares: record narrowing, a canonical string form for
// ABOUTME: hashing and comparison, deep equality, JSON-value validation and dotted path lookup.

/** A JSON object as the pack documents use it. */
export type JsonObject = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A JSON value, as `programme.overrides` and the pack documents hold it. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export function isJsonValue(value: unknown): value is Json {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
}

/**
 * The JSON text of a value with object keys sorted, so two documents that mean the same thing
 * always hash and compare the same.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`cannot serialise the non-finite number ${value}`);
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new Error(`cannot serialise a ${typeof value} as JSON`);
}

export function deepEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

export function parsePath(path: string): readonly string[] {
  return path.split('.').filter((segment) => segment.length > 0);
}

export interface PathLookup {
  readonly found: boolean;
  readonly value: unknown;
}

/**
 * Resolves a dotted pack path.
 *
 * A pack names its entities by code, never by row id (spec 03 §2.1), so an array step selects
 * the item whose `code` equals the step — `reports.js-term.page` rather than `reports.0.page`.
 * A numeric step also selects by array index, for a path that has to name a position.
 */
export function getAtPath(document: unknown, path: string): PathLookup {
  const segments = parsePath(path);
  let current: unknown = document;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = indexIn(current, segment);
      if (index < 0) return { found: false, value: undefined };
      current = current[index];
      continue;
    }
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return { found: false, value: undefined };
    }
    current = current[segment];
  }

  return { found: true, value: current };
}

/** The position a path step addresses in an array: by index, or by the item's `code`. */
function indexIn(items: readonly unknown[], segment: string): number {
  if (/^(0|[1-9][0-9]*)$/.test(segment)) {
    const index = Number(segment);
    return index < items.length ? index : -1;
  }
  return items.findIndex((item) => isRecord(item) && item.code === segment);
}

/**
 * A copy of a document with one dotted path replaced. The document itself is never mutated, so an
 * override can be validated against the pack without touching the pack.
 *
 * @throws when the path does not resolve.
 */
export function withPackPath(document: unknown, path: string, value: unknown): unknown {
  const copy: unknown = structuredClone(document);
  const segments = parsePath(path);
  let current: unknown = copy;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const last = index === segments.length - 1;

    if (Array.isArray(current)) {
      const position = indexIn(current, segment);
      if (position < 0) throw new Error(`the pack has no path ${path}`);
      if (last) {
        current[position] = value;
      } else {
        current = current[position];
      }
      continue;
    }

    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      throw new Error(`the pack has no path ${path}`);
    }
    if (last) {
      current[segment] = value;
    } else {
      current = current[segment];
    }
  }

  return copy;
}

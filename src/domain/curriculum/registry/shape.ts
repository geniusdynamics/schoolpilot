// ABOUTME: A small shape description for the curriculum pack document, and the checker that walks
// ABOUTME: it. It mirrors the keywords packs/schema/*.json uses, so the loader validates the same rules.

import { canonicalJson, isRecord } from './json';
import type { PackCheckName, PackIssue } from './types';

export type Shape =
  | { readonly of: 'any' }
  | { readonly of: 'null' }
  | { readonly of: 'boolean' }
  | {
      readonly of: 'string';
      readonly values?: readonly string[];
      readonly pattern?: RegExp;
      /** Minimum length in code points, as JSON Schema `minLength` counts. */
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly of: 'number';
      readonly integer?: boolean;
      readonly min?: number;
      readonly max?: number;
      /** Exclusive lower bound, as JSON Schema `exclusiveMinimum` states it. */
      readonly above?: number;
    }
  | { readonly of: 'literal'; readonly value: string }
  /** Any JSON value, at any depth, as a recursive `anyOf` of scalar, array and object states it. */
  | { readonly of: 'json' }
  | { readonly of: 'union'; readonly shapes: readonly Shape[] }
  | {
      readonly of: 'array';
      readonly item: Shape;
      readonly min?: number;
      readonly max?: number;
      readonly unique?: boolean;
    }
  | {
      readonly of: 'record';
      readonly value: Shape;
      /** Shape of each key, for a map whose keys are constrained. */
      readonly name?: Shape;
      readonly min?: number;
    }
  | {
      readonly of: 'object';
      readonly fields: readonly Field[];
      readonly closed?: boolean;
      /** The shape of a key the fields do not declare, as `additionalProperties`. */
      readonly open?: Shape;
      /** Variants of which exactly one must match, as JSON Schema `oneOf`. */
      readonly variants?: readonly Shape[];
      /** Groups of keys of which at least one group must be complete, as `anyOf` of `required`. */
      readonly atLeastOne?: readonly (readonly string[])[];
      /** Required keys that apply when a sibling key has a given value, as `if`/`then`. */
      readonly when?: readonly Conditional[];
    };

export interface Field {
  readonly key: string;
  readonly shape: Shape;
  readonly required: boolean;
}

export interface Conditional {
  readonly key: string;
  /** Value that activates the rule. Omitted when the rule fires on the key's presence alone. */
  readonly equals?: string | boolean;
  readonly required: readonly string[];
}

export function required(key: string, shape: Shape): Field {
  return { key, shape, required: true };
}

export function optional(key: string, shape: Shape): Field {
  return { key, shape, required: false };
}

export function object(
  fields: readonly Field[],
  extra: Omit<Extract<Shape, { of: 'object' }>, 'of' | 'fields'> = {}
): Shape {
  return { of: 'object', fields, closed: true, ...extra };
}

export function array(item: Shape, extra: { min?: number; max?: number; unique?: boolean } = {}): Shape {
  return { of: 'array', item, ...extra };
}

export function record(
  value: Shape,
  extra: { min?: number; name?: Shape } = {}
): Shape {
  return { of: 'record', value, ...extra };
}

export function union(...shapes: readonly Shape[]): Shape {
  return { of: 'union', shapes };
}

export function text(extra: Omit<Extract<Shape, { of: 'string' }>, 'of'> = {}): Shape {
  return { of: 'string', ...extra };
}

export function count(extra: Omit<Extract<Shape, { of: 'number' }>, 'of'> = {}): Shape {
  return { of: 'number', ...extra };
}

export function literal(value: string): Shape {
  return { of: 'literal', value };
}

export const ANY: Shape = { of: 'any' };
export const NULL: Shape = { of: 'null' };
export const BOOLEAN: Shape = { of: 'boolean' };
/** Any JSON value; `tests.schema.json#/$defs/inputValue` accepts the same, recursively. */
export const JSON_VALUE: Shape = { of: 'json' };

// ------------------------------------------------------------------ vocabulary

/**
 * `common.schema.json#/$defs/code`: a pack-local code.
 *
 * The pattern carries the source's printed identifier, so a grade keeps its symbol: `A*`, `A-`,
 * `B+` and `9` all pass. At least one alphanumeric character is required, which the lookahead
 * states; a code is data and is never used as a raw file name or URL segment.
 */
export const CODE = text({
  pattern: /^(?=.*[A-Za-z0-9])[A-Za-z0-9*+-][A-Za-z0-9._*+-]*$/,
  min: 1,
  max: 50,
});
/** `common.schema.json#/$defs/name`: a display name. */
export const NAME = text({ min: 1, max: 200 });
/** `common.schema.json#/$defs/date`: the shape of a calendar date. */
export const DATE = text({ pattern: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ });
/** `common.schema.json#/$defs/semver`. */
export const SEMVER = text({ pattern: /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/ });
/** `common.schema.json#/$defs/weight`: a share of a whole. */
export const WEIGHT = count({ min: 0, max: 1 });
/** `common.schema.json#/$defs/codeList`: a non-empty list of unique codes. */
export const CODE_LIST = array(CODE, { min: 1, unique: true });

// ---------------------------------------------------------------------- check

export function at(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

export function atIndex(path: string, index: number): string {
  return `${path}[${index}]`;
}

function report(
  issues: PackIssue[],
  check: PackCheckName,
  path: string,
  message: string
): void {
  issues.push({ check, path: path || '(root)', message });
}

/** Checks one value against a shape, appending every violation to `issues`. */
export function checkShape(
  value: unknown,
  shape: Shape,
  path: string,
  issues: PackIssue[]
): void {
  switch (shape.of) {
    case 'any':
      return;
    case 'null':
      if (value !== null) report(issues, 'type', path, 'must be null');
      return;
    case 'boolean':
      if (typeof value !== 'boolean') report(issues, 'type', path, 'must be a boolean');
      return;
    case 'literal':
      if (value !== shape.value) report(issues, 'const', path, `must be "${shape.value}"`);
      return;
    case 'json':
      checkJsonValue(value, path, issues);
      return;
    case 'string':
      if (typeof value !== 'string') {
        report(issues, 'type', path, 'must be a string');
        return;
      }
      if (shape.values && !shape.values.includes(value)) {
        report(issues, 'enum', path, `must be one of: ${shape.values.join(', ')}`);
      }
      if (shape.pattern && !shape.pattern.test(value)) {
        report(issues, 'pattern', path, `does not match ${shape.pattern}`);
      }
      if (shape.min !== undefined && [...value].length < shape.min) {
        report(issues, 'minLength', path, `is shorter than ${shape.min} characters`);
      }
      if (shape.max !== undefined && [...value].length > shape.max) {
        report(issues, 'maxLength', path, `is longer than ${shape.max} characters`);
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        report(issues, 'type', path, 'must be a number');
        return;
      }
      if (shape.integer && !Number.isInteger(value)) {
        report(issues, 'type', path, 'must be an integer');
      }
      if (shape.min !== undefined && value < shape.min) {
        report(issues, 'minimum', path, `must be at least ${shape.min}`);
      }
      if (shape.max !== undefined && value > shape.max) {
        report(issues, 'maximum', path, `must be at most ${shape.max}`);
      }
      if (shape.above !== undefined && value <= shape.above) {
        report(issues, 'exclusiveMinimum', path, `must be greater than ${shape.above}`);
      }
      return;
    case 'union': {
      const results = shape.shapes.map((candidate) => {
        const scratch: PackIssue[] = [];
        checkShape(value, candidate, path, scratch);
        return scratch;
      });
      if (results.some((scratch) => scratch.length === 0)) return;
      // Report the branch that came closest: a union of an object and a list is best explained by
      // the rules of the branch the value almost matched, not by "does not match any shape".
      const closest = results.reduce<readonly PackIssue[]>(
        (best, scratch) => (scratch.length < best.length ? scratch : best),
        results[0] ?? []
      );
      if (closest.length === 0) report(issues, 'type', path, 'does not match any accepted shape');
      issues.push(...closest);
      return;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        report(issues, 'type', path, 'must be an array');
        return;
      }
      if (shape.min !== undefined && value.length < shape.min) {
        report(issues, 'minItems', path, `must hold at least ${shape.min} item(s)`);
      }
      if (shape.max !== undefined && value.length > shape.max) {
        report(issues, 'maxItems', path, `must hold at most ${shape.max} item(s)`);
      }
      if (shape.unique) {
        const seen = new Set<string>();
        for (const item of value) {
          const key = canonicalJson(item);
          if (seen.has(key)) report(issues, 'uniqueItems', path, 'holds a repeated item');
          seen.add(key);
        }
      }
      value.forEach((item, index) => checkShape(item, shape.item, atIndex(path, index), issues));
      return;
    }
    case 'record': {
      if (!isRecord(value)) {
        report(issues, 'type', path, 'must be an object');
        return;
      }
      const keys = Object.keys(value);
      if (shape.min !== undefined && keys.length < shape.min) {
        report(issues, 'minProperties', path, `must hold at least ${shape.min} entr(ies)`);
      }
      for (const key of keys) {
        if (shape.name) checkShape(key, shape.name, at(path, key), issues);
        checkShape(value[key], shape.value, at(path, key), issues);
      }
      return;
    }
    case 'object': {
      if (!isRecord(value)) {
        report(issues, 'type', path, 'must be an object');
        return;
      }
      if (shape.variants) {
        checkVariants(value, shape.variants, path, issues);
        return;
      }
      const declared = new Set(shape.fields.map((entry) => entry.key));
      for (const entry of shape.fields) {
        const present = Object.prototype.hasOwnProperty.call(value, entry.key);
        if (!present) {
          if (entry.required) report(issues, 'required', at(path, entry.key), 'is required');
          continue;
        }
        checkShape(value[entry.key], entry.shape, at(path, entry.key), issues);
      }
      for (const key of Object.keys(value)) {
        if (declared.has(key)) continue;
        if (shape.open) checkShape(value[key], shape.open, at(path, key), issues);
        else if (shape.closed !== false) {
          report(issues, 'additionalProperties', at(path, key), 'is not a declared key');
        }
      }
      if (shape.atLeastOne && !shape.atLeastOne.some((group) => group.every((key) =>
        Object.prototype.hasOwnProperty.call(value, key)))) {
        const groups = shape.atLeastOne.map((group) => `{${group.join(', ')}}`).join(' or ');
        report(issues, 'anyOf', path, `must include ${groups}`);
      }
      for (const rule of shape.when ?? []) {
        const present = Object.prototype.hasOwnProperty.call(value, rule.key);
        const active = rule.equals === undefined ? present : present && value[rule.key] === rule.equals;
        if (!active) continue;
        for (const key of rule.required) {
          if (!Object.prototype.hasOwnProperty.call(value, key)) {
            report(
              issues,
              'required',
              at(path, key),
              rule.equals === undefined
                ? `is required when ${rule.key} is present`
                : `is required when ${rule.key} is "${rule.equals}"`
            );
          }
        }
      }
      return;
    }
  }
}

function checkJsonValue(value: unknown, path: string, issues: PackIssue[]): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) report(issues, 'type', path, 'must be a finite number');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkJsonValue(item, atIndex(path, index), issues));
    return;
  }
  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      checkJsonValue(value[key], at(path, key), issues);
    }
    return;
  }
  report(issues, 'type', path, 'must be a JSON value');
}

function checkVariants(
  value: Record<string, unknown>,
  variants: readonly Shape[],
  path: string,
  issues: PackIssue[]
): void {
  const results = variants.map((variant) => {
    const scratch: PackIssue[] = [];
    checkShape(value, variant, path, scratch);
    return scratch;
  });
  const matching = results.filter((scratch) => scratch.length === 0).length;
  if (matching === 1) return;
  if (matching > 1) {
    report(issues, 'oneOf', path, 'matches more than one variant');
    return;
  }
  // Exactly one variant was intended but none fits. Report the variant that came closest, so the
  // refusal names the field at fault ("evidence is not a declared key") rather than just "oneOf".
  const closest = results.reduce<readonly PackIssue[]>(
    (best, scratch) => (scratch.length < best.length ? scratch : best),
    results[0] ?? []
  );
  if (closest.length === 0) report(issues, 'oneOf', path, 'does not match exactly one variant');
  issues.push(...closest);
}

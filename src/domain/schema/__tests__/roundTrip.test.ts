// ABOUTME: Round-trip tests that every canonical entity accepts its fixture, rejects unknown keys,
// ABOUTME: enforces required fields and validates every enum, date, date-time and uuid constraint.

import { describe, expect, it } from 'vitest';

import {
  ENTITY_NAMES,
  entityDefinitions,
  type EntityName,
  zodToJsonSchema,
  type JsonSchemaNode,
} from '../index';
import { validFixtures } from './fixtures';

type ConstraintKind = 'enum' | 'date' | 'date-time' | 'time' | 'email' | 'uuid';

interface Constraint {
  path: (string | number)[];
  kind: ConstraintKind;
}

function collectConstraints(
  node: JsonSchemaNode,
  path: (string | number)[] = [],
  found: Constraint[] = []
): Constraint[] {
  if (node.enum) found.push({ path, kind: 'enum' });
  if (
    node.format === 'date' ||
    node.format === 'date-time' ||
    node.format === 'time' ||
    node.format === 'email' ||
    node.format === 'uuid'
  ) {
    found.push({ path, kind: node.format });
  }
  if (node.properties) {
    for (const [key, property] of Object.entries(node.properties)) {
      collectConstraints(property, [...path, key], found);
    }
  }
  if (node.items) collectConstraints(node.items, [...path, 0], found);
  if (node.anyOf) {
    const branches = node.anyOf.filter((branch) => branch.type !== 'null');
    if (branches.length === 1) collectConstraints(branches[0], path, found);
  }
  return found;
}

function readAtPath(root: unknown, path: (string | number)[]): unknown {
  let cursor: unknown = root;
  for (const key of path) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string | number, unknown>)[key];
  }
  return cursor;
}

function assignAtPath(root: unknown, path: (string | number)[], value: unknown): boolean {
  if (path.length === 0) return false;
  let cursor: unknown = root;
  for (const key of path.slice(0, -1)) {
    if (cursor === null || typeof cursor !== 'object') return false;
    cursor = (cursor as Record<string | number, unknown>)[key];
  }
  if (cursor === null || typeof cursor !== 'object') return false;
  const last = path[path.length - 1];
  if (Array.isArray(cursor)) {
    if (typeof last !== 'number' || last >= cursor.length) return false;
    cursor[last] = value;
    return true;
  }
  (cursor as Record<string | number, unknown>)[last] = value;
  return true;
}

function invalidValue(kind: ConstraintKind): string {
  switch (kind) {
    case 'enum':
      return '__not_a_valid_enum_value__';
    case 'date':
      return '2027-02-30';
    case 'date-time':
      return '2027-02-30T25:61:61Z';
    case 'time':
      return '25:61:61';
    case 'email':
      return 'not-an-email';
    case 'uuid':
      return 'not-a-uuid';
  }
}

describe('canonical schema round-trip', () => {
  for (const name of ENTITY_NAMES) {
    const schema = entityDefinitions[name].schema;

    it(`${name}: accepts a valid document`, () => {
      const result = schema.safeParse(validFixtures[name]);
      expect(result.success, result.error?.message).toBe(true);
    });

    it(`${name}: survives JSON serialisation`, () => {
      const roundTripped: unknown = JSON.parse(JSON.stringify(validFixtures[name]));
      const result = schema.safeParse(roundTripped);
      expect(result.success, result.error?.message).toBe(true);
    });

    it(`${name}: rejects unknown top-level keys`, () => {
      const result = schema.safeParse({ ...validFixtures[name], __unexpected: true });
      expect(result.success).toBe(false);
    });

    it(`${name}: enforces every required field`, () => {
      const json = zodToJsonSchema(schema);
      for (const field of json.required ?? []) {
        const copy: Record<string, unknown> = structuredClone(validFixtures[name]);
        delete copy[field];
        const result = schema.safeParse(copy);
        expect(result.success, `expected missing ${field} to fail`).toBe(false);
      }
    });

    it(`${name}: validates every enum, date, date-time and uuid`, () => {
      const json = zodToJsonSchema(schema);
      for (const constraint of collectConstraints(json)) {
        const copy: unknown = structuredClone(validFixtures[name]);
        if (readAtPath(copy, constraint.path) === undefined) continue;
        const assigned = assignAtPath(copy, constraint.path, invalidValue(constraint.kind));
        if (!assigned) continue;
        const result = schema.safeParse(copy);
        expect(
          result.success,
          `expected ${constraint.kind} at ${constraint.path.join('.')} to fail`
        ).toBe(false);
      }
    });
  }
});

describe('canonical schema type surface', () => {
  it('every entity exposes a schema that emits JSON Schema', () => {
    for (const name of ENTITY_NAMES) {
      expect(() => zodToJsonSchema(entityDefinitions[name].schema)).not.toThrow();
    }
  });

  it('EntityName is closed over the registry keys', () => {
    const names: EntityName[] = [...ENTITY_NAMES];
    expect(names.sort()).toEqual(Object.keys(entityDefinitions).sort());
  });
});

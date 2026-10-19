// ABOUTME: Bridges canonical zod schemas to the repository's DatabaseSchema input, so the existing
// ABOUTME: createDatabaseSchema -> SchemaConverter path can emit SQLite DDL from one definition.

import { z } from 'zod/v4';

import {
  createDatabaseSchema,
  type DatabaseProperty,
  type DatabaseSchema,
} from '@/utils/databaseAgnosticSchema';

import type { EntityStorage } from './defineEntity';

/** The subset of JSON Schema emitted by `z.toJSONSchema` that the DDL bridge consumes. */
export interface JsonSchemaNode {
  type?: string | string[];
  format?: string;
  enum?: readonly string[];
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaNode;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  anyOf?: JsonSchemaNode[];
  $ref?: string;
}

export interface JsonSchemaObject extends JsonSchemaNode {
  type: 'object';
  properties: Record<string, JsonSchemaNode>;
}

/** Emits the JSON Schema that the DDL bridge (and pack export) sees for a zod entity. */
export function zodToJsonSchema(schema: z.ZodType): JsonSchemaObject {
  return z.toJSONSchema(schema, { io: 'output' }) as JsonSchemaObject;
}

function firstNonNull(node: JsonSchemaNode): JsonSchemaNode | null {
  if (!node.anyOf) return null;
  const branches = node.anyOf.filter((branch) => branch.type !== 'null');
  return branches.length === 1 ? branches[0] : null;
}

function toDatabaseProperty(node: JsonSchemaNode, ref?: string): DatabaseProperty {
  const common = ref ? { ref } : {};

  if (node.$ref) {
    // Recursive JSON payloads (z.json) are stored as TEXT, not expanded into columns.
    return { type: 'object', ...common };
  }

  const nullableBranch = firstNonNull(node);
  if (nullableBranch) return toDatabaseProperty(nullableBranch, ref);

  if (node.enum) {
    return { type: 'string', enum: [...node.enum], ...common };
  }

  const declaredTypes = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  const type = declaredTypes.find((candidate) => candidate !== 'null');

  if (type === 'array') {
    return {
      type: 'array',
      items: node.items ? toDatabaseProperty(node.items) : { type: 'string' },
      ...common,
    };
  }

  if (type === 'object') {
    const properties = node.properties
      ? Object.fromEntries(
          Object.entries(node.properties).map(([name, property]) => [
            name,
            toDatabaseProperty(property),
          ])
        )
      : undefined;
    return {
      type: 'object',
      ...(properties ? { properties } : {}),
      ...(node.required ? { required: [...node.required] } : {}),
      ...common,
    };
  }

  if (type === 'integer') {
    return { type: 'integer', minimum: node.minimum, maximum: node.maximum, ...common };
  }

  if (type === 'number') {
    return { type: 'number', minimum: node.minimum, maximum: node.maximum, ...common };
  }

  if (type === 'boolean') {
    return { type: 'boolean', ...common };
  }

  return {
    type: 'string',
    format: node.format,
    minLength: node.minLength,
    maxLength: node.maxLength,
    pattern: node.pattern,
    ...common,
  };
}

/**
 * Converts emitted JSON Schema plus sidecar storage metadata into the repository's DatabaseSchema.
 * The sidecar supplies the primary key, indexes, foreign keys and encrypted columns that JSON
 * Schema cannot carry.
 */
export function toDatabaseSchema(storage: EntityStorage, schema: z.ZodType): DatabaseSchema {
  const json = zodToJsonSchema(schema);
  const properties = Object.fromEntries(
    Object.entries(json.properties).map(([name, property]) => [
      name,
      toDatabaseProperty(property, storage.refs[name]),
    ])
  );

  return createDatabaseSchema({
    title: storage.table,
    primaryKey: storage.primaryKey,
    properties,
    required: json.required,
    indexes: storage.indexes.map((index) => (typeof index === 'string' ? index : [...index])),
    encrypted: [...storage.encrypted],
  });
}

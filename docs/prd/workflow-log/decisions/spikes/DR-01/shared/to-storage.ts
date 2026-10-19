// ABOUTME: Converts standard JSON Schema plus sidecar storage metadata into the repository's
// ABOUTME: DatabaseSchema, so both DR-01 options feed the existing SQLite DDL converter.

import {
  createDatabaseSchema,
  type DatabaseProperty,
  type DatabaseSchema,
} from '@/utils/databaseAgnosticSchema';

export interface StorageMeta {
  table: string;
  primaryKey: string;
  indexes: readonly string[];
  unique: readonly (readonly string[])[];
  refs: Readonly<Record<string, string>>;
  encrypted: readonly string[];
}

interface JsonSchemaProperty {
  type?: string | string[];
  format?: string;
  enum?: readonly string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  additionalProperties?: boolean | JsonSchemaProperty;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  description?: string;
  $ref?: string;
}

export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

function toDatabaseProperty(prop: JsonSchemaProperty, ref?: string): DatabaseProperty {
  const common = {
    description: prop.description,
    ...(ref ? { ref } : {}),
  };
  if (prop.enum) return { type: 'string', enum: [...prop.enum], ...common };
  if (prop.type === 'array') {
    return { type: 'array', items: prop.items ? toDatabaseProperty(prop.items) : { type: 'string' }, ...common };
  }
  if (prop.type === 'object') {
    const properties = prop.properties
      ? Object.fromEntries(Object.entries(prop.properties).map(([k, v]) => [k, toDatabaseProperty(v)]))
      : undefined;
    return { type: 'object', ...(properties ? { properties } : {}), ...common };
  }
  if (prop.type === 'integer') {
    return { type: 'integer', minimum: prop.minimum, maximum: prop.maximum, ...common };
  }
  if (prop.type === 'number') {
    return { type: 'number', minimum: prop.minimum, maximum: prop.maximum, ...common };
  }
  if (prop.type === 'boolean') return { type: 'boolean', ...common };
  return {
    type: 'string',
    format: prop.format,
    minLength: prop.minLength,
    maxLength: prop.maxLength,
    pattern: prop.pattern,
    ...common,
  };
}

export function toDatabaseSchema(table: string, json: JsonSchemaObject, storage: StorageMeta): DatabaseSchema {
  const properties = Object.fromEntries(
    Object.entries(json.properties).map(([name, prop]) => [name, toDatabaseProperty(prop, storage.refs[name])]),
  );
  return createDatabaseSchema({
    title: table,
    primaryKey: storage.primaryKey,
    properties,
    required: json.required,
    indexes: storage.indexes.map((field) => field),
    encrypted: [...storage.encrypted],
  });
}

export function uniqueIndexSql(table: string, unique: readonly (readonly string[])[]): string[] {
  return unique.map((fields) => {
    const name = `uq_${table}_${fields.join('_')}`;
    const columns = fields.map((f) => `"${f}"`).join(', ');
    return `CREATE UNIQUE INDEX IF NOT EXISTS "${name}" ON "${table}" (${columns})`;
  });
}

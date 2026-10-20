// ABOUTME: Shows how zod-emitted JSON Schema maps to SQLite column types through the existing converter.
// ABOUTME: Complements the learner/enrolment spike, which contains no numeric columns.

import { z } from 'zod/v4';
import { SchemaConverter } from '@/services/database/SchemaConverter';
import { toDatabaseSchema, type JsonSchemaObject } from './shared/to-storage';

const probe = z.object({
  id: z.uuid(),
  capacity: z.number().int(),
  weight: z.number(),
  active: z.boolean(),
  opened_on: z.iso.date(),
  kind: z.enum(['alpha', 'beta']),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.json()),
});

const json = z.toJSONSchema(probe, { io: 'output' }) as unknown as JsonSchemaObject;
const databaseSchema = toDatabaseSchema('type_probe', json, {
  table: 'type_probe',
  primaryKey: 'id',
  indexes: [],
  unique: [],
  refs: {},
  encrypted: [],
});
const converted = SchemaConverter.convertRxDBToSQLite('type_probe', databaseSchema);
console.log(SchemaConverter.generateCreateTableSQL(converted.sqlSchema));

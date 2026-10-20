// ABOUTME: Turns a DatabaseSchema into the ordered CREATE TABLE / INDEX statements the adapter
// ABOUTME: applies, including sidecar unique keys and their partial-index predicates.

import { SchemaConverter } from '@/services/database/SchemaConverter';
import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

/** Statements for one entity: table first, then plain and unique indexes. */
export function statementsForSchema(schema: DatabaseSchema): string[] {
  const conversion = SchemaConverter.convertRxDBToSQLite(schema.title, schema);
  const tableName = conversion.sqlSchema.tableName;

  return [
    SchemaConverter.generateCreateTableSQL(conversion.sqlSchema),
    ...SchemaConverter.generateCreateIndexSQL(tableName, conversion.indexes),
    ...SchemaConverter.generateCreateUniqueIndexSQL(tableName, conversion.uniqueIndexes),
  ];
}

/** Flattened statements for a batch of entities, preserving the caller's order. */
export function statementsForSchemas(schemas: readonly DatabaseSchema[]): string[] {
  return schemas.flatMap(statementsForSchema);
}

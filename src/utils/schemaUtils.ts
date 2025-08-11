// ABOUTME: Schema utility functions for database-agnostic schema creation
// ABOUTME: Provides backward compatibility while supporting dual-database architecture

import { 
  createDatabaseSchema, 
  convertToRxDBSchema, 
  DatabaseSchema, 
  PropertyDefinition, 
  PrimaryKeyDefinition 
} from './databaseAgnosticSchema';

/**
 * Legacy createEntitySchema function for backward compatibility
 * Uses the new database-agnostic schema system under the hood
 */
export const createEntitySchema = (
  title: string,
  properties: { [key: string]: PropertyDefinition },
  primaryKey: PrimaryKeyDefinition,
  required?: string[],
  indexes?: string[]
): DatabaseSchema => {
  console.warn('createEntitySchema from schemaUtils is deprecated. Use createDatabaseSchema from databaseAgnosticSchema instead.');
  // Create database-agnostic schema
  const agnosticSchema = createDatabaseSchema({
    title,
    properties,
    primaryKey,
    required,
    indexes,
  });
  
  // Convert to RxDB format for backward compatibility
  return convertToRxDBSchema(agnosticSchema);
};

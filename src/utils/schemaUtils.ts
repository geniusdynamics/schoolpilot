// ABOUTME: Schema utility functions for database-agnostic schema creation
// ABOUTME: Provides backward compatibility while supporting dual-database architecture

import { 
  createDatabaseSchema, 
  convertToRxDBSchema, 
  DatabaseSchema, 
  PropertyDefinition, 
  PrimaryKeyDefinition 
} from './databaseAgnosticSchema';

// Re-export for backward compatibility
export { DatabaseSchema, PropertyDefinition, PrimaryKeyDefinition } from './databaseAgnosticSchema';

/**
 * Legacy createEntitySchema function for backward compatibility
 * Uses the new database-agnostic schema system under the hood
 */
export const createEntitySchema = <T extends { [key: string]: any }>(
  title: string,
  propertiesInput: Record<string, PropertyDefinition>,
  primaryKeyDefinition: PrimaryKeyDefinition | string,
  requiredFields: string[],
  indexes?: string[] | string[][]
): any => {
  // Create database-agnostic schema
  const agnosticSchema = createDatabaseSchema<T>(
    title,
    propertiesInput,
    primaryKeyDefinition,
    requiredFields,
    indexes
  );
  
  // Convert to RxDB format for backward compatibility
  return convertToRxDBSchema(agnosticSchema);
};
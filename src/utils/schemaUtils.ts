// ABOUTME: Schema utility functions for RxDB schema creation
// ABOUTME: Extracted from rxdbService to break circular dependencies

import { RxJsonSchema, toTypedRxJsonSchema, PrimaryKey } from 'rxdb';

export const createEntitySchema = <T extends { [key: string]: any }>(
  title: string,
  propertiesInput: RxJsonSchema<T>['properties'],
  primaryKeyDefinition: { key: keyof T & string; type: 'string' | 'number'; final?: boolean; maxLength?: number } | keyof T & string,
  requiredFields: ReadonlyArray<Extract<keyof T, string>>,
  indexes?: ReadonlyArray<Extract<keyof T, string>> | ReadonlyArray<ReadonlyArray<Extract<keyof T, string>>>
): RxJsonSchema<T> => {
  const properties: RxJsonSchema<T>['properties'] = { ...propertiesInput };
  
  // Handle both old (string) and new (object) calling patterns
  let pkDef: { key: keyof T & string; type: 'string' | 'number'; final?: boolean; maxLength?: number };
  
  if (typeof primaryKeyDefinition === 'string') {
    const pkName = primaryKeyDefinition;
    const pkProperty = (properties as any)?.[pkName];
    
    // Extract type from the property definition if it exists
    let pkType: 'string' | 'number' = 'string'; // Default fallback
    if (pkProperty && pkProperty.type) {
      pkType = pkProperty.type === 'number' ? 'number' : 'string';
    }
    
    pkDef = {
      key: pkName,
      type: pkType,
      final: pkProperty?.final
    };
    
    // Only set maxLength for string types, and only if not already defined in property
    if (pkType === 'string' && !pkProperty?.maxLength) {
      pkDef.maxLength = 100;
    }
  } else {
    pkDef = primaryKeyDefinition;
  }
  
  const pkName = pkDef.key;
  
  // Build the primary key property definition
  const pkPropertyDef: any = {
    ...((properties as any)[pkName] || {}),
    type: pkDef.type,
    ...(pkDef.final !== undefined && { final: pkDef.final }),
  };
  
  // Only add maxLength for string types
  if (pkDef.type === 'string') {
    pkPropertyDef.maxLength = pkDef.maxLength || pkPropertyDef.maxLength || 100;
  }
  
  (properties as any)[pkName] = pkPropertyDef;

  const schemaDefinitionInternal: RxJsonSchema<T> = {
    title: `${title} schema`,
    version: 0,
    primaryKey: pkName as PrimaryKey<T>,
    type: 'object' as const,
    properties,
    required: [...requiredFields] as (Extract<keyof T, string>)[],
    indexes: indexes ? (
        Array.isArray(indexes[0])
            ? (indexes as ReadonlyArray<ReadonlyArray<Extract<keyof T, string>>>).map(idx => [...idx])
            : [...(indexes as ReadonlyArray<Extract<keyof T, string>>)]
      ) : []
  };
  return toTypedRxJsonSchema(schemaDefinitionInternal as any);
};
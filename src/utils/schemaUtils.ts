// ABOUTME: Schema utility functions for RxDB schema creation
// ABOUTME: Extracted from rxdbService to break circular dependencies

import { RxJsonSchema, toTypedRxJsonSchema, PrimaryKey } from 'rxdb';

export const createEntitySchema = <T extends { [key: string]: any }>(
  title: string,
  propertiesInput: RxJsonSchema<T>['properties'],
  primaryKeyDefinition: { key: keyof T & string; type: 'string' | 'number'; final?: boolean; maxLength?: number },
  requiredFields: ReadonlyArray<Extract<keyof T, string>>,
  indexes?: ReadonlyArray<Extract<keyof T, string>> | ReadonlyArray<ReadonlyArray<Extract<keyof T, string>>>
): RxJsonSchema<T> => {
  const properties: RxJsonSchema<T>['properties'] = { ...propertiesInput };
  const pkName = primaryKeyDefinition.key;

  (properties as any)[pkName] = {
    type: primaryKeyDefinition.type,
    ...(primaryKeyDefinition.type === 'string' && primaryKeyDefinition.final !== undefined && { final: primaryKeyDefinition.final }),
    ...(primaryKeyDefinition.maxLength !== undefined && { maxLength: primaryKeyDefinition.maxLength }),
    ...((properties as any)[pkName] || {}),
  };

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
  return toTypedRxJsonSchema(schemaDefinitionInternal);
}; 
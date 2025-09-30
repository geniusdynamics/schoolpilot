// ABOUTME: Base storage adapter with common functionality
// ABOUTME: Provides foundation for all storage type implementations

import { IStorageAdapter, ValidationResult, RelationshipDefinition } from '../types';

export abstract class BaseStorageAdapter implements IStorageAdapter {
  protected relationships: RelationshipDefinition[] = [];
  protected initialized = false;

  abstract initialize(): Promise<void>;
  abstract createSchema(tableName: string, schema: string): Promise<void>;
  abstract insertBatch(tableName: string, data: any[]): Promise<void>;
  abstract query(sql: string, params?: any[]): Promise<any[]>;
  abstract cleanup(): Promise<void>;

  async validateRelationships(tableName: string, data: any[]): Promise<boolean> {
    if (!this.relationships.length) return true;

    const tableRelationships = this.relationships.filter(
      rel => rel.sourceTable === tableName
    );

    for (const relationship of tableRelationships) {
      for (const record of data) {
        const foreignKeyValue = record[relationship.sourceField];
        
        if (relationship.required && !foreignKeyValue) {
          console.warn(`Missing required foreign key ${relationship.sourceField} in ${tableName}`);
          return false;
        }

        if (foreignKeyValue) {
          const exists = await this.checkForeignKeyExists(
            relationship.targetTable,
            relationship.targetField,
            foreignKeyValue
          );
          
          if (!exists) {
            console.warn(
              `Foreign key violation: ${foreignKeyValue} not found in ${relationship.targetTable}.${relationship.targetField}`
            );
            return false;
          }
        }
      }
    }

    return true;
  }

  protected async checkForeignKeyExists(
    tableName: string,
    fieldName: string,
    value: any
  ): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT 1 FROM ${tableName} WHERE ${fieldName} = ? LIMIT 1`,
        [value]
      );
      return result.length > 0;
    } catch (error) {
      console.error(`Error checking foreign key existence:`, error);
      return false;
    }
  }

  setRelationships(relationships: RelationshipDefinition[]): void {
    this.relationships = relationships;
  }

  protected validateInitialization(): void {
    if (!this.initialized) {
      throw new Error('Storage adapter not initialized. Call initialize() first.');
    }
  }

  protected generatePlaceholders(count: number): string {
    return Array(count).fill('?').join(', ');
  }

  protected chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
import { logger } from '@/utils/logging';

/**
 * Schema Converter for SQLite WASM Integration
 * 
 * This service converts RxDB schemas to SQLite-compatible formats
 * and handles collection creation for the database providers.
 * 
 * Features:
 * - RxDB to SQLite schema conversion
 * - Automatic table creation with proper column types
 * - Index generation from schema definitions
 * - Type mapping and validation
 * - Relationship handling
 */

import { CollectionSchema, IndexDefinition } from './interfaces';

// RxDB to SQLite type mapping
const TYPE_MAPPING: Record<string, string> = {
  'string': 'TEXT',
  'number': 'REAL',
  'integer': 'INTEGER',
  'boolean': 'INTEGER', // SQLite uses INTEGER for boolean (0/1)
  'object': 'TEXT',      // Store as JSON string
  'array': 'TEXT',       // Store as JSON string
};

// Schema conversion result
export interface ConversionResult {
  schema: CollectionSchema;
  sqlSchema: SQLiteTableSchema;
  indexes: IndexDefinition[];
  relationships: RelationshipInfo[];
}

export interface SQLiteTableSchema {
  tableName: string;
  columns: SQLiteColumn[];
  primaryKey: string;
  constraints: string[];
}

export interface SQLiteColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  constraints: string[];
}

export interface RelationshipInfo {
  localColumn: string;
  targetTable: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export class SchemaConverter {
  /**
   * Convert RxDB schema to SQLite-compatible format
   */
  static convertRxDBToSQLite(collectionName: string, rxdbSchema: any): ConversionResult {
    // Reduced logging to prevent spam - only log errors
    
    if (!rxdbSchema || typeof rxdbSchema !== 'object') {
      throw new Error(`Invalid schema for collection ${collectionName}: expected object, got ${typeof rxdbSchema}`);
    }

    // Handle both direct schema and wrapped schema formats
    const schema = rxdbSchema.schema || rxdbSchema;
    
    if (!schema.properties) {
      logger.error(`[SchemaConverter] Schema for ${collectionName} missing properties:`, schema);
      throw new Error(`Schema for collection ${collectionName} missing properties`);
    }

    // Convert to our internal schema format
    const collectionSchema: CollectionSchema = {
      version: schema.version || 1,
      type: 'object',
      properties: this.convertProperties(schema.properties),
      required: schema.required || ['id'],
      primaryKey: schema.primaryKey || 'id',
      indexes: this.extractIndexes(collectionName, schema)
    };

    // Generate SQLite table schema
    const sqlSchema = this.generateSQLiteSchema(collectionName, collectionSchema);
    
    // Extract relationships
    const relationships = this.extractRelationships(schema.properties || {});
    
    return {
      schema: collectionSchema,
      sqlSchema,
      indexes: collectionSchema.indexes || [],
      relationships
    };
  }

  /**
   * Convert RxDB properties to our schema format
   */
  private static convertProperties(rxdbProperties: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};
    
    for (const [key, prop] of Object.entries(rxdbProperties)) {
      if (typeof prop === 'object' && prop !== null) {
        converted[key] = {
          type: prop.type || 'string',
          format: prop.format,
          enum: prop.enum,
          items: prop.items,
          properties: prop.properties,
          maxLength: prop.maxLength,
          minimum: prop.minimum,
          maximum: prop.maximum,
          multipleOf: prop.multipleOf,
          ref: prop.ref,
          default: prop.default
        };
      } else {
        // Handle primitive type definitions
        converted[key] = {
          type: typeof prop === 'string' ? prop : 'string'
        };
      }
    }
    
    return converted;
  }

  /**
   * Extract index definitions from RxDB schema
   */
  private static extractIndexes(collectionName: string, schema: any): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];
    
    // Add primary key index
    const primaryKey = schema.primaryKey || 'id';
    indexes.push({
      name: `idx_${collectionName}_${primaryKey}`,
      fields: [primaryKey],
      unique: true
    });

    // Extract indexes from schema.indexes array.
    // Entries may be:
    // - plain strings ('col')            -> single-column index
    // - arrays of strings (['a','b'])    -> composite index
    // - objects ({ name, fields|columns }) -> RxDB-style index definitions
    // Objects must be normalized here; interpolating them directly into SQL
    // produces "[object Object]" and invalid CREATE INDEX statements.
    if (Array.isArray(schema.indexes)) {
      schema.indexes.forEach((entry: any) => {
        let indexName: string | undefined;
        let indexFields: string[] = [];

        if (typeof entry === 'string') {
          indexFields = [entry];
        } else if (Array.isArray(entry)) {
          indexFields = entry.filter((f: any) => typeof f === 'string');
        } else if (entry && typeof entry === 'object') {
          const rawFields = entry.fields ?? entry.columns ?? [];
          const fieldList = Array.isArray(rawFields) ? rawFields : [rawFields];
          indexFields = fieldList.filter((f: any) => typeof f === 'string');
          if (typeof entry.name === 'string' && entry.name) {
            indexName = entry.name;
          }
        }

        // Skip empty/invalid entries and duplicates of the primary key index
        if (indexFields.length === 0) return;
        const isPrimaryKeyIndex =
          indexFields.length === 1 && indexFields[0] === primaryKey;
        if (isPrimaryKeyIndex) return;

        const defaultName = `idx_${collectionName}_${indexFields.join('_')}`;
        const finalName = indexName || defaultName;
        if (!indexes.some(idx => idx.name === finalName || idx.fields.join(',') === indexFields.join(','))) {
          indexes.push({
            name: finalName,
            fields: indexFields,
            unique: false
          });
        }
      });
    }

    // Extract reference field indexes (for foreign keys)
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([fieldName, fieldDef]: [string, any]) => {
        if (fieldDef && fieldDef.ref) {
          // Create index for foreign key fields
          const indexName = `idx_${collectionName}_${fieldName}`;
          if (!indexes.some(idx => idx.name === indexName)) {
            indexes.push({
              name: indexName,
              fields: [fieldName],
              unique: false
            });
          }
        }
      });
    }

    return indexes;
  }

  /**
   * Generate SQLite CREATE TABLE schema
   */
  private static generateSQLiteSchema(collectionName: string, schema: CollectionSchema): SQLiteTableSchema {
    const tableName = this.sanitizeTableName(collectionName);
    const columns: SQLiteColumn[] = [];
    const constraints: string[] = [];

    // Process each property
    Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
      const column = this.convertFieldToSQLiteColumn(fieldName, fieldDef);
      columns.push(column);
    });

    // Add standard audit columns if not present
    const standardColumns = ['created_at', 'updated_at'];
    standardColumns.forEach(colName => {
      if (!columns.some(col => col.name === colName)) {
        columns.push({
          name: colName,
          type: 'TEXT', // Store as ISO string
          nullable: true,
          constraints: []
        });
      }
    });

    return {
      tableName,
      columns,
      primaryKey: schema.primaryKey || 'id',
      constraints
    };
  }

  /**
   * Convert a single field definition to SQLite column
   */
  private static convertFieldToSQLiteColumn(fieldName: string, fieldDef: any): SQLiteColumn {
    const sqliteType = this.mapTypeToSQLite(fieldDef);
    const constraints: string[] = [];
    
    // Handle primary key
    if (fieldName === 'id') {
      constraints.push('PRIMARY KEY');
    }
    
    // Handle unique constraints
    if (fieldDef.unique) {
      constraints.push('UNIQUE');
    }
    
    // Handle default values
    let defaultValue = fieldDef.default;
    if (defaultValue !== undefined) {
      if (typeof defaultValue === 'string') {
        defaultValue = `'${defaultValue}'`;
      } else if (typeof defaultValue === 'boolean') {
        defaultValue = defaultValue ? 1 : 0;
      } else if (typeof defaultValue === 'object') {
        // Arrays/objects cannot be SQL defaults; handle at application layer
        defaultValue = undefined;
      }
    }

    return {
      name: this.sanitizeColumnName(fieldName),
      type: sqliteType,
      nullable: !fieldDef.required && fieldName !== 'id',
      defaultValue,
      constraints
    };
  }

  /**
   * Map schema type to SQLite type
   */
  private static mapTypeToSQLite(fieldDef: any): string {
    if (!fieldDef || !fieldDef.type) {
      return 'TEXT'; // Default fallback
    }

    let baseType = fieldDef.type;
    
    // Handle array types like ['string', 'null']
    if (Array.isArray(baseType)) {
      baseType = baseType.find((t: string) => t !== 'null') || 'string';
    }
    
    // Handle special cases
    if (fieldDef.format === 'date' || fieldDef.format === 'date-time') {
      return 'TEXT'; // Store dates as ISO strings
    }
    
    if (fieldDef.enum) {
      return 'TEXT'; // Store enums as strings
    }
    
    if (baseType === 'object' || baseType === 'array') {
      return 'TEXT'; // Store complex types as JSON
    }
    
    return TYPE_MAPPING[baseType] || 'TEXT';
  }

  /**
   * Extract relationship information
   */
  private static extractRelationships(properties: Record<string, any>): RelationshipInfo[] {
    const relationships: RelationshipInfo[] = [];
    
    Object.entries(properties).forEach(([fieldName, fieldDef]) => {
      if (fieldDef && fieldDef.ref) {
        relationships.push({
          localColumn: fieldName,
          targetTable: fieldDef.ref,
          targetColumn: 'id', // Assume primary key is 'id'
          type: 'one-to-many' // Default relationship type
        });
      }
    });
    
    return relationships;
  }

  /**
   * Safely quote an identifier (table/column/index name) for SQLite.
   * Double-quoting also makes SQL reserved keywords (e.g. "references",
   * "order", "group") usable as identifiers.
   */
  static quoteIdentifier(name: string): string {
    return `"${String(name).replace(/"/g, '""')}"`;
  }

  /**
   * Generate SQL CREATE TABLE statement
   */
  static generateCreateTableSQL(sqlSchema: SQLiteTableSchema): string {
    const { tableName, columns, primaryKey } = sqlSchema;
    
    const columnDefinitions = columns.map(col => {
      let def = `${this.quoteIdentifier(col.name)} ${col.type}`;
      
      if (!col.nullable && col.name !== primaryKey) {
        def += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      
      if (col.constraints.length > 0) {
        def += ' ' + col.constraints.join(' ');
      }
      
      return def;
    });

    return `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(tableName)} (
      ${columnDefinitions.join(',\n      ')}
    )`;
  }

  /**
   * Generate SQL CREATE INDEX statements
   */
  static generateCreateIndexSQL(tableName: string, indexes: IndexDefinition[]): string[] {
    return indexes.map(index => {
      const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
      const fieldsStr = index.fields.map(field => this.quoteIdentifier(field)).join(', ');
      
      return `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${this.quoteIdentifier(index.name)}
              ON ${this.quoteIdentifier(tableName)} (${fieldsStr})`;
    });
  }

  /**
   * Sanitize table name for SQLite
   */
  private static sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  /**
   * Sanitize column name for SQLite
   */
  private static sanitizeColumnName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  /**
   * Convert all collections from RxDB format to SQLite format
   */
  static convertAllCollections(collectionsDefinition: Record<string, any>): Record<string, ConversionResult> {
    // Single log for batch conversion
    logger.info(`[SchemaConverter] Converting ${Object.keys(collectionsDefinition).length} collections...`);
    
    const convertedCollections: Record<string, ConversionResult> = {};
    const errors: string[] = [];
    
    Object.entries(collectionsDefinition).forEach(([collectionName, collectionDef]) => {
      try {
        const result = this.convertRxDBToSQLite(collectionName, collectionDef);
        convertedCollections[collectionName] = result;
        // Removed per-collection success log to reduce spam
      } catch (error) {
        const errorMsg = `Failed to convert collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(`[SchemaConverter] âŒ ${errorMsg}`);
        errors.push(errorMsg);
      }
    });

    if (errors.length > 0) {
      logger.warn(`[SchemaConverter] Conversion completed with ${errors.length} errors:`, errors);
    } else {
      logger.info(`[SchemaConverter] âœ… Successfully converted ${Object.keys(convertedCollections).length} collections`);
    }

    return convertedCollections;
  }
}

export default SchemaConverter;
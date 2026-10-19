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
  uniqueIndexes: UniqueIndexDefinition[];
  relationships: RelationshipInfo[];
}

/** A unique index derived from the entity storage sidecar, optionally partial. */
export interface UniqueIndexDefinition {
  name: string;
  fields: string[];
  where?: string;
}

export interface SQLiteTableSchema {
  tableName: string;
  columns: SQLiteColumn[];
  primaryKey: string;
  constraints: string[];
  /** Canonical DDL mode: required columns and the primary key emit NOT NULL. */
  strict?: boolean;
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

    // Convert to our internal schema format. `primaryKey` is kept as declared so the
    // non-strict path reproduces the historical DDL byte for byte; strict mode resolves the
    // descriptor form to its column name.
    const resolvedPrimaryKey = this.resolvePrimaryKey(schema.primaryKey);
    const collectionSchema: CollectionSchema = {
      version: schema.version || 1,
      type: 'object',
      properties: this.convertProperties(schema.properties, schema.required),
      required: schema.required || ['id'],
      primaryKey: schema.primaryKey || 'id',
      indexes: this.extractIndexes(collectionName, schema)
    };

    // Generate SQLite table schema
    const sqlSchema = this.generateSQLiteSchema(
      collectionName,
      collectionSchema,
      schema.strict === true
    );

    // Unique keys are index-level constraints: SQLite rejects NULL duplicates through a
    // partial index, which the table-level UNIQUE constraint cannot express.
    const uniqueIndexes = this.extractUniqueIndexes(collectionName, schema, resolvedPrimaryKey);

    // Extract relationships
    const relationships = this.extractRelationships(schema.properties || {});

    return {
      schema: collectionSchema,
      sqlSchema,
      indexes: collectionSchema.indexes || [],
      uniqueIndexes,
      relationships
    };
  }

  /** Primary keys are plain column names today; accept the legacy descriptor shape too. */
  private static resolvePrimaryKey(primaryKey: unknown): string {
    if (typeof primaryKey === 'string' && primaryKey.length > 0) return primaryKey;
    if (
      primaryKey &&
      typeof primaryKey === 'object' &&
      typeof (primaryKey as { key?: unknown }).key === 'string'
    ) {
      return (primaryKey as { key: string }).key;
    }
    return 'id';
  }

  /**
   * Convert declared properties to the local schema shape, carrying the root required
   * list onto each field so the column builder can emit NOT NULL.
   */
  private static convertProperties(
    rxdbProperties: Record<string, any>,
    requiredFields: unknown = []
  ): Record<string, any> {
    const converted: Record<string, any> = {};
    const required = new Set(Array.isArray(requiredFields) ? requiredFields.filter((f): f is string => typeof f === 'string') : []);

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
          default: prop.default,
          // A property may allow null even though the key is required; it must stay nullable.
          nullable:
            prop.nullable === true ||
            (Array.isArray(prop.type) && prop.type.includes('null'))
        };
      } else {
        // Handle primitive type definitions
        converted[key] = {
          type: typeof prop === 'string' ? prop : 'string'
        };
      }

      converted[key].required = required.has(key);
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
   * Extract unique keys from the storage sidecar. Both shapes the canonical entity
   * registry declares are accepted: an array of columns, or `{ columns, where }` for a
   * partial index.
   */
  private static extractUniqueIndexes(
    collectionName: string,
    schema: any,
    primaryKey: string
  ): UniqueIndexDefinition[] {
    const entries = Array.isArray(schema.unique) ? schema.unique : [];
    const uniqueIndexes: UniqueIndexDefinition[] = [];

    entries.forEach((entry: any) => {
      let fields: string[] = [];
      let where: string | undefined;

      if (Array.isArray(entry)) {
        fields = entry.filter((field: any) => typeof field === 'string');
      } else if (entry && typeof entry === 'object') {
        const rawFields = entry.columns ?? entry.fields ?? [];
        const fieldList = Array.isArray(rawFields) ? rawFields : [rawFields];
        fields = fieldList.filter((field: any) => typeof field === 'string');
        if (typeof entry.where === 'string' && entry.where.trim()) {
          where = entry.where.trim();
        }
      }

      if (fields.length === 0) return;
      if (fields.length === 1 && fields[0] === primaryKey) return;

      const name = `uq_${collectionName}_${fields.join('_')}${where ? '_partial' : ''}`;
      if (!uniqueIndexes.some((index) => index.name === name)) {
        uniqueIndexes.push({ name, fields, ...(where ? { where } : {}) });
      }
    });

    return uniqueIndexes;
  }

  /**
   * Generate SQLite CREATE TABLE schema
   */
  private static generateSQLiteSchema(
    collectionName: string,
    schema: CollectionSchema,
    strict: boolean
  ): SQLiteTableSchema {
    const tableName = this.sanitizeTableName(collectionName);
    const columns: SQLiteColumn[] = [];
    const constraints: string[] = [];
    // Preserve the declared value on the legacy path (including the object descriptor) so
    // generateCreateTableSQL reproduces the historical comparison exactly. Strict mode uses
    // the resolved column name.
    const primaryKey = strict
      ? this.resolvePrimaryKey(schema.primaryKey)
      : schema.primaryKey || 'id';

    // Process each property
    Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
      const column = this.convertFieldToSQLiteColumn(fieldName, fieldDef, primaryKey, strict);
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
      primaryKey,
      constraints,
      strict
    };
  }

  /**
   * Convert a single field definition to SQLite column
   */
  private static convertFieldToSQLiteColumn(
    fieldName: string,
    fieldDef: any,
    primaryKey: string,
    strict: boolean
  ): SQLiteColumn {
    const sqliteType = this.mapTypeToSQLite(fieldDef);
    const constraints: string[] = [];
    // The historical path only recognised a column literally named `id`; strict canonical
    // schemas use the declared primary key so non-id keys are enforced too.
    const isPrimaryKey = strict ? fieldName === primaryKey : fieldName === 'id';

    // Handle primary key
    if (isPrimaryKey) {
      constraints.push('PRIMARY KEY');
    }
    if (fieldDef.unique) {
      // Handle unique constraints
      constraints.push('UNIQUE');
    }

    // Canonical schemas declare foreign keys; legacy collections keep their historical DDL
    // because they contain dangling refs that SQLite would reject once enforcement is on.
    if (
      strict &&
      !isPrimaryKey &&
      typeof fieldDef.ref === 'string' &&
      fieldDef.ref.length > 0
    ) {
      constraints.push(
        `REFERENCES ${this.quoteIdentifier(fieldDef.ref)}(${this.quoteIdentifier('id')})`
      );
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
      // Strict canonical schemas turn the root required list into NOT NULL (and never leave
      // the primary key nullable). Legacy schemas keep their historical all-nullable columns
      // because existing writers omit fields their own schema declares required.
      nullable: isPrimaryKey
        ? false
        : strict
          ? fieldDef.required !== true || fieldDef.nullable === true
          : true,
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
    const { tableName, columns, primaryKey, strict } = sqlSchema;
    
    const columnDefinitions = columns.map(col => {
      let def = `${this.quoteIdentifier(col.name)} ${col.type}`;
      
      // Legacy mode compares against the declared primary key exactly as the original
      // converter did (an object descriptor therefore never matches). Strict mode always
      // emits NOT NULL for non-nullable columns, including the primary key.
      if (!col.nullable && (strict === true || col.name !== primaryKey)) {
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
   * Generate SQL CREATE UNIQUE INDEX statements for sidecar unique keys, including the
   * partial-index predicate SQLite requires when NULLs must collide.
   */
  static generateCreateUniqueIndexSQL(
    tableName: string,
    uniqueIndexes: UniqueIndexDefinition[]
  ): string[] {
    return uniqueIndexes.map(index => {
      const fieldsStr = index.fields.map(field => this.quoteIdentifier(field)).join(', ');
      const whereClause = index.where ? `\n              WHERE ${index.where}` : '';

      return `CREATE UNIQUE INDEX IF NOT EXISTS ${this.quoteIdentifier(index.name)}
              ON ${this.quoteIdentifier(tableName)} (${fieldsStr})${whereClause}`;
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
        logger.error(`[SchemaConverter] ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    });

    if (errors.length > 0) {
      logger.warn(`[SchemaConverter] Conversion completed with ${errors.length} errors:`, errors);
    } else {
      logger.info(`[SchemaConverter] ✅ Successfully converted ${Object.keys(convertedCollections).length} collections`);
    }

    return convertedCollections;
  }
}

export default SchemaConverter;
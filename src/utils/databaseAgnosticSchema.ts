import { logger } from '@/utils/logging';

// ABOUTME: Database-agnostic schema utility that abstracts RxDB types and provides common interfaces for both RxDB and PouchDB
// ABOUTME: Includes schema conversion, validation, and helper functions for creating database schemas

// Database field types that work across different database systems
export type DatabaseFieldType = 
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'date'
  | 'timestamp'
  | 'uuid'
  | 'ref'
  | 'null';

// Database property definition interface
export interface DatabaseProperty {
  type: DatabaseFieldType | readonly DatabaseFieldType[];
  description?: string;
  default?: any;
  enum?: any[];
  items?: DatabaseProperty;
  properties?: Record<string, DatabaseProperty>;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  pattern?: string;
  format?: string;
  ref?: string; // For references to other collections
  unique?: boolean;
  nullable?: boolean;
  final?: boolean;
}

/**
 * A composite unique key for storage DDL. The object form can carry a partial-index
 * predicate, which SQLite needs because NULLs never collide inside a unique index.
 */
export type UniqueConstraintDefinition =
  | string[]
  | { columns: string[]; where?: string };

// Backward-compatible type alias
export type PropertyDefinition = DatabaseProperty;

// Database schema interface that works with both RxDB and PouchDB
export type PrimaryKey = string | { key: string; fields: string[]; separator?: string };

// Backward-compatible type alias
export type PrimaryKeyDefinition = PrimaryKey;

export interface DatabaseSchema {
  title: string;
  description?: string;
  version: number;
  primaryKey: PrimaryKey;
  type: 'object';
  properties: Record<string, DatabaseProperty>;
  required?: string[];
  indexes?: Array<string | string[]>;
  unique?: UniqueConstraintDefinition[];
  /**
   * Canonical DDL mode: emit NOT NULL from the root required list and REFERENCES from `ref`
   * properties. Legacy collections leave this unset to keep their historical DDL.
   */
  strict?: boolean;
  encrypted?: string[];
}
export interface DatabaseCollectionConfig {
  name: string;
  schema: DatabaseSchema;
  migrationStrategies?: Record<number, any>;
  statics?: Record<string, any>;
  methods?: Record<string, any>;
  attachments?: {
    encrypted?: boolean;
  };
}

// Schema converter class for different database systems
export class DatabaseSchemaConverter {
  /**
   * Convert database-agnostic schema to RxDB format
   */
  static convertToRxDBSchema(schema: DatabaseSchema): any {
    const rxdbSchema = {
      title: schema.title,
      description: schema.description,
      version: schema.version,
      primaryKey: schema.primaryKey,
      type: 'object' as const,
      properties: this.convertPropertiesToRxDB(schema.properties),
      required: schema.required || [],
      indexes: schema.indexes || [],
      encrypted: schema.encrypted || []
    };

    return rxdbSchema;
  }

  /**
   * Convert database-agnostic schema to PouchDB format
   */
  static convertToPouchDBSchema(schema: DatabaseSchema): any {
    return {
      title: schema.title,
      description: schema.description,
      version: schema.version,
      primaryKey: typeof schema.primaryKey === 'string' ? schema.primaryKey : schema.primaryKey.key,
      properties: this.convertPropertiesToPouchDB(schema.properties),
      required: schema.required || [],
      indexes: schema.indexes || []
    };
  }

  /**
   * Convert properties to RxDB format
   */
  private static convertPropertiesToRxDB(properties: Record<string, DatabaseProperty>): Record<string, any> {
    const converted: Record<string, any> = {};
    
    for (const [key, prop] of Object.entries(properties)) {
      const convertedProp: any = {
        type: this.mapTypeToRxDB(prop.type),
        description: prop.description,
        default: prop.default,
        enum: prop.enum,
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        minimum: prop.minimum,
        maximum: prop.maximum,
        multipleOf: prop.multipleOf,
        pattern: prop.pattern,
        format: prop.format,
        ref: prop.ref,
        final: prop.final
      };

      if (prop.type === 'array' && prop.items) {
        convertedProp.items = this.convertPropertyToRxDB(prop.items);
      }

      if (prop.type === 'object' && prop.properties) {
        convertedProp.properties = this.convertPropertiesToRxDB(prop.properties);
        convertedProp.required = prop.required || [];
      }

      converted[key] = convertedProp;

      // Remove undefined values
      Object.keys(converted[key]).forEach(k => {
        if (converted[key][k] === undefined) {
          delete converted[key][k];
        }
      });
    }

    return converted;
  }

  /**
   * Convert properties to PouchDB format
   */
  private static convertPropertiesToPouchDB(properties: Record<string, DatabaseProperty>): Record<string, any> {
    const converted: Record<string, any> = {};
    
    for (const [key, prop] of Object.entries(properties)) {
      const convertedProp: any = {
        type: this.mapTypeToPouchDB(prop.type),
        description: prop.description,
        default: prop.default,
        enum: prop.enum,
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        minimum: prop.minimum,
        maximum: prop.maximum,
        multipleOf: prop.multipleOf,
        pattern: prop.pattern,
        format: prop.format,
        ref: prop.ref
      };

      if (prop.type === 'array' && prop.items) {
        convertedProp.items = this.convertPropertyToPouchDB(prop.items);
      }

      if (prop.type === 'object' && prop.properties) {
        convertedProp.properties = this.convertPropertiesToPouchDB(prop.properties);
      }

      converted[key] = convertedProp;

      // Remove undefined values
      Object.keys(converted[key]).forEach(k => {
        if (converted[key][k] === undefined) {
          delete converted[key][k];
        }
      });
    }

    return converted;
  }

  /**
   * Convert single property to RxDB format
   */
  private static convertPropertyToRxDB(prop: DatabaseProperty): any {
    const converted: any = {
      type: this.mapTypeToRxDB(prop.type),
      description: prop.description,
      default: prop.default,
      enum: prop.enum,
      minLength: prop.minLength,
      maxLength: prop.maxLength,
      minimum: prop.minimum,
      maximum: prop.maximum,
      multipleOf: prop.multipleOf,
      pattern: prop.pattern,
      format: prop.format,
      ref: prop.ref,
      final: prop.final
    };

    if (prop.type === 'array' && prop.items) {
      converted.items = this.convertPropertyToRxDB(prop.items);
    }

    if (prop.type === 'object' && prop.properties) {
      converted.properties = this.convertPropertiesToRxDB(prop.properties);
      converted.required = prop.required || [];
    }

    // Remove undefined values
    Object.keys(converted).forEach(k => {
      if (converted[k] === undefined) {
        delete converted[k];
      }
    });

    return converted;
  }

  /**
   * Convert single property to PouchDB format
   */
  private static convertPropertyToPouchDB(prop: DatabaseProperty): any {
    const converted: any = {
      type: this.mapTypeToPouchDB(prop.type),
      description: prop.description,
      default: prop.default,
      enum: prop.enum,
      minLength: prop.minLength,
      maxLength: prop.maxLength,
      minimum: prop.minimum,
      maximum: prop.maximum,
      multipleOf: prop.multipleOf,
      pattern: prop.pattern,
      format: prop.format,
      ref: prop.ref
    };

    if (prop.type === 'array' && prop.items) {
      converted.items = this.convertPropertyToPouchDB(prop.items);
    }

    if (prop.type === 'object' && prop.properties) {
      converted.properties = this.convertPropertiesToPouchDB(prop.properties);
    }

    // Remove undefined values
    Object.keys(converted).forEach(k => {
      if (converted[k] === undefined) {
        delete converted[k];
      }
    });

    return converted;
  }

  /**
   * Map database-agnostic types to RxDB types
   */
  private static normalizeFieldType(type: DatabaseFieldType | readonly DatabaseFieldType[]): DatabaseFieldType {
    if (!Array.isArray(type)) {
      return type as DatabaseFieldType;
    }
    return (type.find((t) => t !== ('null' as unknown as DatabaseFieldType)) ?? 'string') as DatabaseFieldType;
  }

  private static mapTypeToRxDB(type: DatabaseFieldType | readonly DatabaseFieldType[]): string {
    const normalizedType = this.normalizeFieldType(type);
    switch (normalizedType) {
      case 'timestamp':
      case 'date':
        return 'string';
      case 'uuid':
        return 'string';
      case 'ref':
        return 'string';
      case 'integer':
        return 'number';
      default:
        return normalizedType;
    }
  }

  /**
   * Map database-agnostic types to PouchDB types
   */
  private static mapTypeToPouchDB(type: DatabaseFieldType | readonly DatabaseFieldType[]): string {
    const normalizedType = this.normalizeFieldType(type);
    switch (normalizedType) {
      case 'timestamp':
      case 'date':
        return 'string';
      case 'uuid':
        return 'string';
      case 'ref':
        return 'string';
      case 'integer':
        return 'number';
      default:
        return normalizedType;
    }
  }

  /**
   * Validate schema structure
   */
  static validateSchema(schema: DatabaseSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema.title) {
      errors.push('Schema must have a title');
    }

    if (!schema.version || schema.version < 0) {
      errors.push('Schema must have a valid version number');
    }

    if (!schema.primaryKey) {
      errors.push('Schema must have a primary key');
    }

    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      errors.push('Schema must have at least one property');
    }

    // Validate primary key exists in properties
    const primaryKeyField = typeof schema.primaryKey === 'string' 
      ? schema.primaryKey 
      : schema.primaryKey.key;
    
    if (schema.properties && !schema.properties[primaryKeyField]) {
      errors.push(`Primary key field '${primaryKeyField}' must be defined in properties`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Helper functions for creating common schema patterns
export class SchemaHelpers {
  private static resolveLegacyArgs(
    optionsOrDescription: string | Record<string, any> | undefined,
    legacyOptions?: Record<string, any>
  ): Record<string, any> {
    if (typeof optionsOrDescription === 'string') {
      return { ...(legacyOptions || {}), description: optionsOrDescription };
    }
    return optionsOrDescription || {};
  }

  private static withNullable(
    baseType: DatabaseFieldType,
    nullable?: boolean
  ): DatabaseFieldType | readonly DatabaseFieldType[] {
    return nullable ? [baseType, 'null'] : baseType;
  }

  /**
   * Create a string property
   */
  static string(optionsOrDescription: string | {
    description?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
    default?: string;
    nullable?: boolean;
    format?: string;
    [key: string]: any;
  } = {}, legacyOptions?: {
    description?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
    default?: string;
    nullable?: boolean;
    format?: string;
    [key: string]: any;
  }): DatabaseProperty {
    const options = this.resolveLegacyArgs(optionsOrDescription, legacyOptions);
    return {
      type: this.withNullable('string', options.nullable),
      description: options.description,
      minLength: options.minLength,
      maxLength: options.maxLength,
      pattern: options.pattern,
      enum: options.enum,
      default: options.default,
      format: options.format,
      nullable: options.nullable
    };
  }

  /**
   * Create a number property
   */
  static number(optionsOrDescription: string | {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
    integer?: boolean;
    nullable?: boolean;
    multipleOf?: number;
    [key: string]: any;
  } = {}, legacyOptions?: {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
    integer?: boolean;
    nullable?: boolean;
    multipleOf?: number;
    [key: string]: any;
  }): DatabaseProperty {
    const options = this.resolveLegacyArgs(optionsOrDescription, legacyOptions);
    const type = options.integer ? 'integer' : 'number';
    return {
      type: this.withNullable(type, options.nullable),
      description: options.description,
      minimum: options.minimum,
      maximum: options.maximum,
      default: options.default,
      multipleOf: options.multipleOf,
      nullable: options.nullable
    };
  }

  /**
   * Create an integer property
   */
  static integer(optionsOrDescription: string | {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
    nullable?: boolean;
    [key: string]: any;
  } = {}, legacyOptions?: {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
    nullable?: boolean;
    [key: string]: any;
  }): DatabaseProperty {
    const options = this.resolveLegacyArgs(optionsOrDescription, legacyOptions);
    return {
      type: this.withNullable('integer', options.nullable),
      description: options.description,
      minimum: options.minimum,
      maximum: options.maximum,
      default: options.default,
      nullable: options.nullable
    };
  }

  /**
   * Create a boolean property
   */
  static boolean(optionsOrDescription: string | {
    description?: string;
    default?: boolean;
    nullable?: boolean;
    [key: string]: any;
  } = {}, legacyOptions?: {
    description?: string;
    default?: boolean;
    nullable?: boolean;
    [key: string]: any;
  }): DatabaseProperty {
    const options = this.resolveLegacyArgs(optionsOrDescription, legacyOptions);
    return {
      type: this.withNullable('boolean', options.nullable),
      description: options.description,
      default: options.default,
      nullable: options.nullable
    };
  }

  /**
   * Create an array property
   */
  static array(itemsOrDescription: DatabaseProperty | string, options: {
    description?: string;
    default?: any[];
    items?: DatabaseProperty;
    nullable?: boolean;
    [key: string]: any;
  } = {}): DatabaseProperty {
    const items = typeof itemsOrDescription === 'string' ? options.items : itemsOrDescription;
    const description = typeof itemsOrDescription === 'string' ? itemsOrDescription : options.description;
    return {
      type: this.withNullable('array', options.nullable),
      description,
      items,
      default: options.default,
      nullable: options.nullable
    };
  }

  /**
   * Create an object property
   */
  static object(propertiesOrDescription: Record<string, DatabaseProperty> | string, options: {
    description?: string;
    required?: string[];
    default?: any;
    properties?: Record<string, DatabaseProperty>;
    nullable?: boolean;
    [key: string]: any;
  } = {}): DatabaseProperty {
    const properties = typeof propertiesOrDescription === 'string' ? options.properties || {} : propertiesOrDescription;
    const description = typeof propertiesOrDescription === 'string' ? propertiesOrDescription : options.description;
    return {
      type: this.withNullable('object', options.nullable),
      description,
      properties,
      required: options.required,
      default: options.default,
      nullable: options.nullable
    };
  }

  /**
   * Create a timestamp property
   */
  static timestamp(optionsOrDescription: string | {
    description?: string;
    default?: string;
    maxLength?: number;
    nullable?: boolean;
    format?: string;
    [key: string]: any;
  } = {}, legacyOptions?: {
    description?: string;
    default?: string;
    maxLength?: number;
    nullable?: boolean;
    format?: string;
    [key: string]: any;
  }): DatabaseProperty {
    const options = this.resolveLegacyArgs(optionsOrDescription, legacyOptions);
    return {
      type: this.withNullable('timestamp', options.nullable),
      description: options.description,
      format: options.format || 'date-time',
      default: options.default,
      maxLength: options.maxLength,
      nullable: options.nullable
    };
  }

  /**
   * Create a UUID property
   */
  static uuid(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return {
      type: 'uuid',
      description: options.description,
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      default: options.default
    };
  }

  /**
   * Create a reference property
   */
  static ref(collectionName: string, options: {
    description?: string;
    default?: string;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    nullable?: boolean;
    [key: string]: any;
  } = {}): DatabaseProperty {
    return {
      type: this.withNullable('ref', options.nullable),
      description: options.description,
      ref: collectionName,
      default: options.default,
      maxLength: options.maxLength,
      minimum: options.minimum,
      maximum: options.maximum,
      nullable: options.nullable
    };
  }

  /**
   * Create a date property
   */
  static date(optionsOrDescription: string | {
    description?: string;
    default?: string;
    maxLength?: number;
    nullable?: boolean;
    [key: string]: any;
  } = {}, legacyOptions?: {
    description?: string;
    default?: string;
    maxLength?: number;
    nullable?: boolean;
    [key: string]: any;
  }): DatabaseProperty {
    const options = this.resolveLegacyArgs(optionsOrDescription, legacyOptions);
    return {
      type: this.withNullable('date', options.nullable),
      description: options.description,
      format: 'date',
      default: options.default,
      maxLength: options.maxLength,
      nullable: options.nullable
    };
  }

  /**
   * Create a date field property (alias for date)
   */
  static dateField(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return this.date(options);
  }

  /**
   * Create a date-time field property (alias for timestamp)
   */
  static dateTimeField(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return this.timestamp(options);
  }

  /**
   * Create an ID property (primary key)
   */
  static id(options: {
    description?: string;
    type?: 'uuid' | 'string' | 'number';
  } | string = {}): DatabaseProperty {
    if (typeof options === 'string') {
      return this.id({ description: options });
    }
    const idType = options.type || 'uuid';
    
    if (idType === 'uuid') {
      return this.uuid({ description: options.description || 'Unique identifier' });
    } else if (idType === 'number') {
      return this.number({ description: options.description || 'Unique identifier' });
    } else {
      return this.string({ description: options.description || 'Unique identifier' });
    }
  }

  // Field alias methods for backward compatibility
  /**
   * Create a string field property (alias for string)
   */
  static stringField(options: {
    description?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
    default?: string;
  } = {}): DatabaseProperty {
    return this.string(options);
  }

  /**
   * Create a number field property (alias for number)
   */
  static numberField(options: {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
  } = {}): DatabaseProperty {
    return this.number(options);
  }

  /**
   * Create an integer field property (alias for integer)
   */
  static integerField(options: {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
  } = {}): DatabaseProperty {
    return this.integer(options);
  }

  /**
   * Create a boolean field property (alias for boolean)
   */
  static booleanField(options: {
    description?: string;
    default?: boolean;
  } = {}): DatabaseProperty {
    return this.boolean(options);
  }

  /**
   * Create an array field property (alias for array)
   */
  static arrayField(items: DatabaseProperty, options: {
    description?: string;
    default?: any[];
  } = {}): DatabaseProperty {
    return this.array(items, options);
  }

  /**
   * Create an object field property (alias for object)
   */
  static objectField(properties: Record<string, DatabaseProperty>, options: {
    description?: string;
    required?: string[];
    default?: any;
  } = {}): DatabaseProperty {
    return this.object(properties, options);
  }

  /**
   * Create a timestamp field property (alias for timestamp)
   */
  static timestampField(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return this.timestamp(options);
  }

  /**
   * Create a UUID field property (alias for uuid)
   */
  static uuidField(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return this.uuid(options);
  }

  /**
   * Create a reference field property (alias for ref)
   */
  static refField(collectionName: string, options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return this.ref(collectionName, options);
  }

  /**
   * Create an ID field property (alias for id)
   */
  static idField(options: {
    description?: string;
    type?: 'uuid' | 'string' | 'number';
  } = {}): DatabaseProperty {
    return this.id(options);
  }
}

// Utility function to create a database schema
export function createDatabaseSchema(config: {
  title?: string;
  name?: string;
  description?: string;
  version?: number;
  primaryKey: string | { key: string; fields: string[]; separator?: string };
  properties: Record<string, DatabaseProperty>;
  required?: string[];
  indexes?: Array<string | string[]>;
  unique?: UniqueConstraintDefinition[];
  strict?: boolean;
  encrypted?: string[];
}): DatabaseSchema {
  return {
    title: config.title || config.name || 'untitled_schema',
    description: config.description,
    version: config.version || 0,
    primaryKey: config.primaryKey,
    type: 'object',
    properties: config.properties,
    required: config.required,
    indexes: config.indexes,
    unique: config.unique,
    strict: config.strict,
    encrypted: config.encrypted
  };
}

// Export conversion functions for backward compatibility
/**
 * @deprecated RXDB removed - Phase 3. This function will be removed in Phase 4.
 * Use convertToPouchDBSchema or provider-agnostic schemas instead.
 */
export const convertToRxDBSchema = (schema: DatabaseSchema) => DatabaseSchemaConverter.convertToRxDBSchema(schema);
export const convertToPouchDBSchema = (schema: DatabaseSchema) => DatabaseSchemaConverter.convertToPouchDBSchema(schema);

// Deprecated function for backward compatibility
/**
 * @deprecated Use createDatabaseSchema instead
 */
export function createEntitySchema(
  title: string,
  primaryKey: string | { key: string; fields: string[]; separator?: string },
  properties: Record<string, DatabaseProperty>,
  required?: string[],
  indexes?: string[]
): DatabaseSchema {
  logger.warn('createEntitySchema is deprecated. Use createDatabaseSchema instead.');
  return createDatabaseSchema({
    title,
    primaryKey,
    properties,
    required,
    indexes
  });
}

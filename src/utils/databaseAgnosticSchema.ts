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
  | 'ref';

// Database property definition interface
export interface DatabaseProperty {
  type: DatabaseFieldType;
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
  pattern?: string;
  format?: string;
  ref?: string; // For references to other collections
}

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
  indexes?: string[];
  encrypted?: string[];
}

// Collection configuration interface
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
        pattern: prop.pattern,
        format: prop.format,
        ref: prop.ref
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
        default: prop.default
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
      pattern: prop.pattern,
      format: prop.format,
      ref: prop.ref
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
      default: prop.default
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
  private static mapTypeToRxDB(type: DatabaseFieldType): string {
    switch (type) {
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
        return type;
    }
  }

  /**
   * Map database-agnostic types to PouchDB types
   */
  private static mapTypeToPouchDB(type: DatabaseFieldType): string {
    switch (type) {
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
        return type;
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
  /**
   * Create a string property
   */
  static string(options: {
    description?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    default?: string;
  } = {}): DatabaseProperty {
    return {
      type: 'string',
      description: options.description,
      minLength: options.minLength,
      maxLength: options.maxLength,
      pattern: options.pattern,
      enum: options.enum,
      default: options.default
    };
  }

  /**
   * Create a number property
   */
  static number(options: {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
  } = {}): DatabaseProperty {
    return {
      type: 'number',
      description: options.description,
      minimum: options.minimum,
      maximum: options.maximum,
      default: options.default
    };
  }

  /**
   * Create an integer property
   */
  static integer(options: {
    description?: string;
    minimum?: number;
    maximum?: number;
    default?: number;
  } = {}): DatabaseProperty {
    return {
      type: 'integer',
      description: options.description,
      minimum: options.minimum,
      maximum: options.maximum,
      default: options.default
    };
  }

  /**
   * Create a boolean property
   */
  static boolean(options: {
    description?: string;
    default?: boolean;
  } = {}): DatabaseProperty {
    return {
      type: 'boolean',
      description: options.description,
      default: options.default
    };
  }

  /**
   * Create an array property
   */
  static array(items: DatabaseProperty, options: {
    description?: string;
    default?: any[];
  } = {}): DatabaseProperty {
    return {
      type: 'array',
      description: options.description,
      items,
      default: options.default
    };
  }

  /**
   * Create an object property
   */
  static object(properties: Record<string, DatabaseProperty>, options: {
    description?: string;
    required?: string[];
    default?: any;
  } = {}): DatabaseProperty {
    return {
      type: 'object',
      description: options.description,
      properties,
      required: options.required,
      default: options.default
    };
  }

  /**
   * Create a timestamp property
   */
  static timestamp(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return {
      type: 'timestamp',
      description: options.description,
      format: 'date-time',
      default: options.default
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
  } = {}): DatabaseProperty {
    return {
      type: 'ref',
      description: options.description,
      ref: collectionName,
      default: options.default
    };
  }

  /**
   * Create a date property
   */
  static date(options: {
    description?: string;
    default?: string;
  } = {}): DatabaseProperty {
    return {
      type: 'date',
      description: options.description,
      format: 'date',
      default: options.default
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
  } = {}): DatabaseProperty {
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
    enum?: string[];
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
  title: string;
  description?: string;
  version?: number;
  primaryKey: string | { key: string; fields: string[]; separator?: string };
  properties: Record<string, DatabaseProperty>;
  required?: string[];
  indexes?: string[];
  encrypted?: string[];
}): DatabaseSchema {
  return {
    title: config.title,
    description: config.description,
    version: config.version || 0,
    primaryKey: config.primaryKey,
    type: 'object',
    properties: config.properties,
    required: config.required,
    indexes: config.indexes,
    encrypted: config.encrypted
  };
}

// Export conversion functions for backward compatibility
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
  console.warn('createEntitySchema is deprecated. Use createDatabaseSchema instead.');
  return createDatabaseSchema({
    title,
    primaryKey,
    properties,
    required,
    indexes
  });
}
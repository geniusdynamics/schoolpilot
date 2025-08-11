// ABOUTME: Comprehensive data validation utilities for all CRUD operations
// ABOUTME: Provides schema validation, referential integrity checks, and consistency validation

import { EntityData } from '../hooks/useDataHookFactory';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Field validation rules
export interface FieldValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[] | number[];
  custom?: (value: any, entity: any) => ValidationError | null;
}

// Entity validation schema
export interface EntityValidationSchema {
  entityName: string;
  fields: Record<string, FieldValidationRule>;
  relationships?: Record<string, RelationshipRule>;
  businessRules?: BusinessRule[];
}

export interface RelationshipRule {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  targetEntity: string;
  targetField: string;
  required?: boolean;
  cascadeDelete?: boolean;
}

export interface BusinessRule {
  name: string;
  description: string;
  validate: (entity: any, context?: any) => ValidationError | null;
}

// Data consistency check interface
export interface ConsistencyCheck {
  name: string;
  description: string;
  entities: string[];
  check: (data: Record<string, any[]>) => ValidationError[];
}

// Main validation class
export class DataValidator {
  private schemas: Map<string, EntityValidationSchema> = new Map();
  private consistencyChecks: ConsistencyCheck[] = [];

  // Register validation schema for an entity
  registerSchema(schema: EntityValidationSchema): void {
    this.schemas.set(schema.entityName, schema);
  }

  // Register consistency check
  registerConsistencyCheck(check: ConsistencyCheck): void {
    this.consistencyChecks.push(check);
  }

  // Validate a single entity
  validateEntity(entityName: string, data: any, context?: any): ValidationResult {
    const schema = this.schemas.get(entityName);
    if (!schema) {
      return {
        isValid: false,
        errors: [{
          field: '_entity',
          message: `No validation schema found for entity: ${entityName}`,
          code: 'SCHEMA_NOT_FOUND',
          severity: 'critical'
        }],
        warnings: []
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate fields
    for (const [fieldName, rule] of Object.entries(schema.fields)) {
      const fieldErrors = this.validateField(fieldName, data[fieldName], rule, data);
      errors.push(...fieldErrors);
    }

    // Validate business rules
    if (schema.businessRules) {
      for (const businessRule of schema.businessRules) {
        const ruleError = businessRule.validate(data, context);
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate field against rules
  private validateField(fieldName: string, value: any, rule: FieldValidationRule, entity: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
      // Continue with other validations for empty strings to catch length constraints
    }

    // Skip other validations if value is null/undefined and not required
    if ((value === null || value === undefined) && !rule.required) {
      return errors;
    }

    // Skip other validations if value is null/undefined but continue for empty strings
    if (value === null || value === undefined) {
      return errors;
    }

    // Type validation
    if (rule.type) {
      const typeError = this.validateType(fieldName, value, rule.type);
      if (typeError) errors.push(typeError);
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rule.minLength} characters long`,
          code: 'MIN_LENGTH',
          severity: 'error'
        });
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must not exceed ${rule.maxLength} characters`,
          code: 'MAX_LENGTH',
          severity: 'error'
        });
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} format is invalid`,
          code: 'INVALID_FORMAT',
          severity: 'error'
        });
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rule.min}`,
          code: 'MIN_VALUE',
          severity: 'error'
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must not exceed ${rule.max}`,
          code: 'MAX_VALUE',
          severity: 'error'
        });
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${rule.enum.join(', ')}`,
        code: 'INVALID_ENUM',
        severity: 'error'
      });
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, entity);
      if (customError) errors.push(customError);
    }

    return errors;
  }

  // Validate data type
  private validateType(fieldName: string, value: any, expectedType: string): ValidationError | null {
    let isValid = false;

    switch (expectedType) {
      case 'string':
        isValid = typeof value === 'string';
        break;
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        isValid = typeof value === 'boolean';
        break;
      case 'date':
        isValid = value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
        break;
      case 'email':
        isValid = typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        break;
      case 'phone':
        isValid = typeof value === 'string' && /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''));
        break;
      case 'array':
        isValid = Array.isArray(value);
        break;
      case 'object':
        isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
        break;
      default:
        return {
          field: fieldName,
          message: `Unknown validation type: ${expectedType}`,
          code: 'UNKNOWN_TYPE',
          severity: 'critical'
        };
    }

    if (!isValid) {
      return {
        field: fieldName,
        message: `${fieldName} must be of type ${expectedType}`,
        code: 'INVALID_TYPE',
        severity: 'error'
      };
    }

    return null;
  }

  // Validate referential integrity
  async validateReferentialIntegrity(
    entityName: string,
    data: any,
    dataContext: Record<string, any[]>
  ): Promise<ValidationError[]> {
    const schema = this.schemas.get(entityName);
    if (!schema || !schema.relationships) {
      return [];
    }

    const errors: ValidationError[] = [];

    for (const [fieldName, relationship] of Object.entries(schema.relationships)) {
      const foreignKeyValue = data[fieldName];
      
      if (!foreignKeyValue && relationship.required) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required for referential integrity`,
          code: 'REQUIRED_REFERENCE',
          severity: 'error'
        });
        continue;
      }

      if (foreignKeyValue) {
        const targetData = dataContext[relationship.targetEntity];
        if (!targetData) {
          errors.push({
            field: fieldName,
            message: `Target entity ${relationship.targetEntity} not found in data context`,
            code: 'TARGET_ENTITY_NOT_FOUND',
            severity: 'critical'
          });
          continue;
        }

        const referencedEntity = targetData.find(item => 
          item[relationship.targetField] === foreignKeyValue
        );

        if (!referencedEntity) {
          errors.push({
            field: fieldName,
            message: `Referenced ${relationship.targetEntity} with ${relationship.targetField}=${foreignKeyValue} not found`,
            code: 'BROKEN_REFERENCE',
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  // Run consistency checks across multiple entities
  async validateConsistency(dataContext: Record<string, any[]>): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const check of this.consistencyChecks) {
      try {
        const checkErrors = check.check(dataContext);
        errors.push(...checkErrors);
      } catch (error) {
        errors.push({
          field: '_consistency',
          message: `Consistency check '${check.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'CONSISTENCY_CHECK_ERROR',
          severity: 'critical'
        });
      }
    }

    return errors;
  }

  // Validate data migration/upgrade
  validateDataMigration(
    fromVersion: string,
    toVersion: string,
    data: Record<string, any[]>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for required fields in new version
    for (const [entityName, entityData] of Object.entries(data)) {
      const schema = this.schemas.get(entityName);
      if (!schema) continue;

      for (const item of entityData) {
        const validation = this.validateEntity(entityName, item);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }
    }

    // Add migration-specific warnings
    warnings.push({
      field: '_migration',
      message: `Data migrated from version ${fromVersion} to ${toVersion}`,
      code: 'DATA_MIGRATION'
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Get all registered schemas
  getSchemas(): Map<string, EntityValidationSchema> {
    return new Map(this.schemas);
  }

  // Get all consistency checks
  getConsistencyChecks(): ConsistencyCheck[] {
    return [...this.consistencyChecks];
  }
}

// Global validator instance
export const globalDataValidator = new DataValidator();

// Utility functions for common validations
export const CommonValidations = {
  email: (value: string): ValidationError | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return {
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        severity: 'error'
      };
    }
    return null;
  },

  phone: (value: string): ValidationError | null => {
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(cleaned)) {
      return {
        field: 'phone',
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
        severity: 'error'
      };
    }
    return null;
  },

  positiveNumber: (value: number): ValidationError | null => {
    if (value < 0) {
      return {
        field: 'amount',
        message: 'Value must be positive',
        code: 'NEGATIVE_VALUE',
        severity: 'error'
      };
    }
    return null;
  },

  futureDate: (value: string | Date): ValidationError | null => {
    const date = new Date(value);
    if (date <= new Date()) {
      return {
        field: 'date',
        message: 'Date must be in the future',
        code: 'PAST_DATE',
        severity: 'error'
      };
    }
    return null;
  },

  pastDate: (value: string | Date): ValidationError | null => {
    const date = new Date(value);
    if (date >= new Date()) {
      return {
        field: 'date',
        message: 'Date must be in the past',
        code: 'FUTURE_DATE',
        severity: 'error'
      };
    }
    return null;
  }
};
import { logger } from '@/utils/logging';

// ABOUTME: Comprehensive data validation and sanitization system
// ABOUTME: Implements validation rules, input sanitization, and security measures
export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'format' | 'range' | 'custom';
  constraint: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationSchema {
  collection: string;
  version: string;
  rules: ValidationRule[];
  relationships?: RelationshipRule[];
}

export interface RelationshipRule {
  field: string;
  targetCollection: string;
  targetField: string;
  required: boolean;
  cascade?: 'delete' | 'nullify' | 'restrict';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
  metadata: {
    validatedFields: number;
    appliedRules: number;
    processingTime: number;
  };
}

export interface ValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  value: any;
  message: string;
  suggestion?: string;
}

export interface SanitizationConfig {
  enableHtmlSanitization: boolean;
  enableSqlInjectionPrevention: boolean;
  enableXssProtection: boolean;
  enableDataNormalization: boolean;
  trimWhitespace: boolean;
  normalizeCase: boolean;
  removeControlCharacters: boolean;
  maxStringLength: number;
}

/**
 * Data Validation and Sanitization Engine
 * Provides comprehensive data validation, sanitization, and security measures
 */
export class DataValidator {
  private schemas: Map<string, ValidationSchema> = new Map();
  private sanitizationConfig: SanitizationConfig;
  private customValidators: Map<string, (value: any, constraint: any) => boolean> = new Map();

  constructor(config: Partial<SanitizationConfig> = {}) {
    this.sanitizationConfig = {
      enableHtmlSanitization: true,
      enableSqlInjectionPrevention: true,
      enableXssProtection: true,
      enableDataNormalization: true,
      trimWhitespace: true,
      normalizeCase: false,
      removeControlCharacters: true,
      maxStringLength: 10000,
      ...config,
    };

    this.initializeDefaultSchemas();
    this.initializeCustomValidators();
  }

  /**
   * Register a validation schema for a collection
   */
  public registerSchema(schema: ValidationSchema): void {
    this.schemas.set(schema.collection, schema);
    logger.info(`ðŸ“‹ [DataValidator] Registered schema for collection: ${schema.collection}`);
  }

  /**
   * Validate data against registered schema
   */
  public async validateData(
    collection: string,
    data: any,
    options: {
      sanitize?: boolean;
      skipRelationshipValidation?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const schema = this.schemas.get(collection);

    if (!schema) {
      throw new Error(`No validation schema found for collection: ${collection}`);
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitizedData = data;

    // Sanitize data if requested
    if (options.sanitize !== false) {
      sanitizedData = await this.sanitizeData(data);
    }

    // Apply validation rules
    let validatedFields = 0;
    let appliedRules = 0;

    for (const rule of schema.rules) {
      const fieldValue = this.getFieldValue(sanitizedData, rule.field);
      const validationResult = await this.applyValidationRule(rule, fieldValue, sanitizedData);

      if (validationResult.error) {
        errors.push(validationResult.error);
      }

      if (validationResult.warning) {
        warnings.push(validationResult.warning);
      }

      validatedFields++;
      appliedRules++;
    }

    // Validate relationships if not skipped
    if (!options.skipRelationshipValidation && schema.relationships) {
      const relationshipResults = await this.validateRelationships(
        collection,
        sanitizedData,
        schema.relationships
      );

      errors.push(...relationshipResults.errors);
      warnings.push(...relationshipResults.warnings);
    }

    const processingTime = Date.now() - startTime;
    const isValid = errors.length === 0 || (options.strictMode === false && errors.every(e => e.severity === 'warning'));

    return {
      isValid,
      errors,
      warnings,
      sanitizedData: options.sanitize !== false ? sanitizedData : undefined,
      metadata: {
        validatedFields,
        appliedRules,
        processingTime,
      },
    };
  }

  /**
   * Validate multiple records in batch
   */
  public async validateBatch(
    collection: string,
    records: any[],
    options: {
      sanitize?: boolean;
      skipRelationshipValidation?: boolean;
      strictMode?: boolean;
      continueOnError?: boolean;
    } = {}
  ): Promise<{
    results: ValidationResult[];
    summary: {
      totalRecords: number;
      validRecords: number;
      invalidRecords: number;
      totalErrors: number;
      totalWarnings: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let validRecords = 0;

    for (let i = 0; i < records.length; i++) {
      try {
        const result = await this.validateData(collection, records[i], options);
        results.push(result);

        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;

        if (result.isValid) {
          validRecords++;
        }
      } catch (error) {
        const errorResult: ValidationResult = {
          isValid: false,
          errors: [{
            field: '_record',
            value: records[i],
            rule: 'validation_error',
            message: error instanceof Error ? error.message : 'Unknown validation error',
            severity: 'error',
            code: 'VALIDATION_EXCEPTION',
          }],
          warnings: [],
          metadata: {
            validatedFields: 0,
            appliedRules: 0,
            processingTime: 0,
          },
        };

        results.push(errorResult);
        totalErrors++;

        if (!options.continueOnError) {
          break;
        }
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      results,
      summary: {
        totalRecords: records.length,
        validRecords,
        invalidRecords: records.length - validRecords,
        totalErrors,
        totalWarnings,
        processingTime,
      },
    };
  }

  /**
   * Sanitize data for security and consistency
   */
  public async sanitizeData(data: any): Promise<any> {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.sanitizeData(item)));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = await this.sanitizeData(value);
      }
      return sanitized;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    return data;
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(value: string): string {
    let sanitized = value;

    // Trim whitespace
    if (this.sanitizationConfig.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Remove control characters
    if (this.sanitizationConfig.removeControlCharacters) {
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // Limit string length
    if (sanitized.length > this.sanitizationConfig.maxStringLength) {
      sanitized = sanitized.substring(0, this.sanitizationConfig.maxStringLength);
    }

    // HTML sanitization
    if (this.sanitizationConfig.enableHtmlSanitization) {
      sanitized = this.sanitizeHtml(sanitized);
    }

    // XSS protection
    if (this.sanitizationConfig.enableXssProtection) {
      sanitized = this.preventXss(sanitized);
    }

    // SQL injection prevention
    if (this.sanitizationConfig.enableSqlInjectionPrevention) {
      sanitized = this.preventSqlInjection(sanitized);
    }

    // Data normalization
    if (this.sanitizationConfig.enableDataNormalization) {
      sanitized = this.normalizeData(sanitized);
    }

    return sanitized;
  }

  /**
   * Apply a single validation rule
   */
  private async applyValidationRule(
    rule: ValidationRule,
    value: any,
    fullData: any
  ): Promise<{
    error?: ValidationError;
    warning?: ValidationWarning;
  }> {
    try {
      let isValid = true;
      const errorMessage = rule.message;

      switch (rule.type) {
        case 'required':
          isValid = this.validateRequired(value, rule.constraint);
          break;

        case 'type':
          isValid = this.validateType(value, rule.constraint);
          break;

        case 'format':
          isValid = this.validateFormat(value, rule.constraint);
          break;

        case 'range':
          isValid = this.validateRange(value, rule.constraint);
          break;

        case 'custom':
          const customValidator = this.customValidators.get(rule.constraint.validator);
          if (customValidator) {
            isValid = customValidator(value, rule.constraint.params);
          } else {
            throw new Error(`Custom validator not found: ${rule.constraint.validator}`);
          }
          break;

        default:
          throw new Error(`Unknown validation rule type: ${rule.type}`);
      }

      if (!isValid) {
        const error: ValidationError = {
          field: rule.field,
          value,
          rule: rule.type,
          message: errorMessage,
          severity: rule.severity,
          code: this.generateErrorCode(rule),
        };

        if (rule.severity === 'error') {
          return { error };
        } else {
          return {
            warning: {
              field: rule.field,
              value,
              message: errorMessage,
              suggestion: this.generateSuggestion(rule, value),
            },
          };
        }
      }

      return {};
    } catch (error) {
      return {
        error: {
          field: rule.field,
          value,
          rule: rule.type,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          code: 'VALIDATION_ERROR',
        },
      };
    }
  }

  /**
   * Validate relationships between collections
   */
  private async validateRelationships(
    collection: string,
    data: any,
    relationships: RelationshipRule[]
  ): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const relationship of relationships) {
      const fieldValue = this.getFieldValue(data, relationship.field);

      if (fieldValue === null || fieldValue === undefined) {
        if (relationship.required) {
          errors.push({
            field: relationship.field,
            value: fieldValue,
            rule: 'relationship_required',
            message: `Required relationship field '${relationship.field}' is missing`,
            severity: 'error',
            code: 'RELATIONSHIP_REQUIRED',
          });
        }
        continue;
      }

      // In a real implementation, this would check against the actual database
      // For now, we'll simulate relationship validation
      const relationshipExists = await this.checkRelationshipExists(
        relationship.targetCollection,
        relationship.targetField,
        fieldValue
      );

      if (!relationshipExists) {
        errors.push({
          field: relationship.field,
          value: fieldValue,
          rule: 'relationship_invalid',
          message: `Invalid relationship: ${relationship.field} references non-existent ${relationship.targetCollection}`,
          severity: 'error',
          code: 'RELATIONSHIP_INVALID',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validation helper methods
   */
  private validateRequired(value: any, constraint: boolean): boolean {
    if (!constraint) return true;
    return value !== null && value !== undefined && value !== '';
  }

  private validateType(value: any, expectedType: string): boolean {
    if (value === null || value === undefined) return true;

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      case 'url':
        return typeof value === 'string' && this.isValidUrl(value);
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }

  private validateFormat(value: any, pattern: string | RegExp): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return regex.test(value);
  }

  private validateRange(value: any, constraint: { min?: number; max?: number; length?: { min?: number; max?: number } }): boolean {
    if (value === null || value === undefined) return true;

    if (typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) return false;
      if (constraint.max !== undefined && value > constraint.max) return false;
    }

    if (typeof value === 'string' && constraint.length) {
      if (constraint.length.min !== undefined && value.length < constraint.length.min) return false;
      if (constraint.length.max !== undefined && value.length > constraint.length.max) return false;
    }

    return true;
  }

  /**
   * Sanitization helper methods
   */
  private sanitizeHtml(value: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }

  private preventXss(value: string): string {
    // Basic XSS prevention
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private preventSqlInjection(value: string): string {
    // Basic SQL injection prevention
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
      'EXEC', 'EXECUTE', 'UNION', 'SCRIPT', '--', ';'
    ];

    let sanitized = value;
    sqlKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  private normalizeData(value: string): string {
    // Basic data normalization
    let normalized = value;

    // Normalize case if configured
    if (this.sanitizationConfig.normalizeCase) {
      normalized = normalized.toLowerCase();
    }

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized;
  }

  /**
   * Utility methods
   */
  private getFieldValue(data: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private generateErrorCode(rule: ValidationRule): string {
    return `${rule.type.toUpperCase()}_${rule.field.toUpperCase()}`;
  }

  private generateSuggestion(rule: ValidationRule, value: any): string {
    switch (rule.type) {
      case 'type':
        return `Expected ${rule.constraint}, got ${typeof value}`;
      case 'format':
        return `Value should match pattern: ${rule.constraint}`;
      case 'range':
        return `Value should be within specified range`;
      default:
        return 'Please check the value and try again';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async checkRelationshipExists(
    targetCollection: string,
    targetField: string,
    value: any
  ): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll simulate the check
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 10);
    });
  }

  /**
   * Initialize default validation schemas
   */
  private initializeDefaultSchemas(): void {
    // Student schema
    this.registerSchema({
      collection: 'students',
      version: '1.0.0',
      rules: [
        {
          field: 'id',
          type: 'required',
          constraint: true,
          message: 'Student ID is required',
          severity: 'error',
        },
        {
          field: 'name',
          type: 'required',
          constraint: true,
          message: 'Student name is required',
          severity: 'error',
        },
        {
          field: 'name',
          type: 'type',
          constraint: 'string',
          message: 'Student name must be a string',
          severity: 'error',
        },
        {
          field: 'name',
          type: 'range',
          constraint: { length: { min: 2, max: 100 } },
          message: 'Student name must be between 2 and 100 characters',
          severity: 'error',
        },
        {
          field: 'email',
          type: 'type',
          constraint: 'email',
          message: 'Invalid email format',
          severity: 'error',
        },
        {
          field: 'age',
          type: 'type',
          constraint: 'number',
          message: 'Age must be a number',
          severity: 'error',
        },
        {
          field: 'age',
          type: 'range',
          constraint: { min: 5, max: 100 },
          message: 'Age must be between 5 and 100',
          severity: 'error',
        },
      ],
      relationships: [
        {
          field: 'classId',
          targetCollection: 'classes',
          targetField: 'id',
          required: false,
        },
      ],
    });

    // Staff schema
    this.registerSchema({
      collection: 'staff',
      version: '1.0.0',
      rules: [
        {
          field: 'id',
          type: 'required',
          constraint: true,
          message: 'Staff ID is required',
          severity: 'error',
        },
        {
          field: 'name',
          type: 'required',
          constraint: true,
          message: 'Staff name is required',
          severity: 'error',
        },
        {
          field: 'email',
          type: 'type',
          constraint: 'email',
          message: 'Invalid email format',
          severity: 'error',
        },
        {
          field: 'role',
          type: 'custom',
          constraint: {
            validator: 'validStaffRole',
            params: ['teacher', 'admin', 'support', 'principal'],
          },
          message: 'Invalid staff role',
          severity: 'error',
        },
      ],
    });

    logger.info('ðŸ“‹ [DataValidator] Initialized default validation schemas');
  }

  /**
   * Initialize custom validators
   */
  private initializeCustomValidators(): void {
    // Valid staff role validator
    this.customValidators.set('validStaffRole', (value: any, allowedRoles: string[]) => {
      return typeof value === 'string' && allowedRoles.includes(value);
    });

    // Phone number validator
    this.customValidators.set('phoneNumber', (value: any) => {
      if (typeof value !== 'string') return false;
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
    });

    // Strong password validator
    this.customValidators.set('strongPassword', (value: any) => {
      if (typeof value !== 'string') return false;
      return value.length >= 8 &&
             /[A-Z]/.test(value) &&
             /[a-z]/.test(value) &&
             /\d/.test(value) &&
             /[!@#$%^&*]/.test(value);
    });

    logger.info('ðŸ”§ [DataValidator] Initialized custom validators');
  }

  /**
   * Add custom validator
   */
  public addCustomValidator(
    name: string,
    validator: (value: any, constraint: any) => boolean
  ): void {
    this.customValidators.set(name, validator);
    logger.info(`ðŸ”§ [DataValidator] Added custom validator: ${name}`);
  }

  /**
   * Get validation statistics
   */
  public getStatistics(): {
    registeredSchemas: number;
    customValidators: number;
    totalRules: number;
  } {
    let totalRules = 0;
    this.schemas.forEach(schema => {
      totalRules += schema.rules.length;
    });

    return {
      registeredSchemas: this.schemas.size,
      customValidators: this.customValidators.size,
      totalRules,
    };
  }

  /**
   * Update sanitization configuration
   */
  public updateSanitizationConfig(config: Partial<SanitizationConfig>): void {
    this.sanitizationConfig = { ...this.sanitizationConfig, ...config };
    logger.info('ðŸ”§ [DataValidator] Updated sanitization configuration');
  }

  /**
   * Get current sanitization configuration
   */
  public getSanitizationConfig(): SanitizationConfig {
    return { ...this.sanitizationConfig };
  }
}

// Export singleton instance
export const dataValidator = new DataValidator();
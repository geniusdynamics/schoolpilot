import { logger } from '@/utils/logging';

// ABOUTME: Service for maintaining data consistency across demo and production modes
// ABOUTME: Provides validation, integrity checks, and data migration capabilities

import { 
  DataValidator, 
  ValidationResult, 
  ValidationError,
  globalDataValidator 
} from '../../utils/dataValidation';
import { registerCoreValidationSchemas } from '../../utils/validationSchemas';
import { EntityData } from '../../hooks/useDataHookFactory';

export interface DataConsistencyConfig {
  enableValidation: boolean;
  enableReferentialIntegrity: boolean;
  enableConsistencyChecks: boolean;
  validationMode: 'strict' | 'lenient' | 'disabled';
  autoFix: boolean;
  logErrors: boolean;
}

export interface ConsistencyReport {
  timestamp: Date;
  mode: 'demo' | 'production';
  totalEntities: number;
  totalRecords: number;
  validationErrors: ValidationError[];
  consistencyErrors: ValidationError[];
  warnings: number;
  criticalErrors: number;
  summary: {
    isConsistent: boolean;
    entitiesWithErrors: string[];
    errorsByType: Record<string, number>;
  };
}

export interface DataMigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migratedEntities: string[];
  errors: ValidationError[];
  warnings: string[];
  backupCreated: boolean;
  backupPath?: string;
}

export class DataConsistencyService {
  private validator: DataValidator;
  private config: DataConsistencyConfig;
  private lastReport: ConsistencyReport | null = null;

  constructor(config: Partial<DataConsistencyConfig> = {}) {
    this.config = {
      enableValidation: true,
      enableReferentialIntegrity: true,
      enableConsistencyChecks: true,
      validationMode: 'strict',
      autoFix: false,
      logErrors: true,
      ...config
    };

    this.validator = globalDataValidator;
    this.initializeValidationSchemas();
  }

  private initializeValidationSchemas(): void {
    // Register core validation schemas
    registerCoreValidationSchemas();
  }

  // Validate a single entity before CRUD operations
  async validateEntity(
    entityName: string, 
    data: EntityData, 
    operation: 'create' | 'update' | 'delete',
    context?: any
  ): Promise<ValidationResult> {
    if (!this.config.enableValidation || this.config.validationMode === 'disabled') {
      return { isValid: true, errors: [], warnings: [] };
    }

    try {
      // Basic entity validation
      const validation = this.validator.validateEntity(entityName, data, context);

      // Additional operation-specific validations
      if (operation === 'create') {
        validation.errors.push(...await this.validateCreate(entityName, data, context));
      } else if (operation === 'update') {
        validation.errors.push(...await this.validateUpdate(entityName, data, context));
      } else if (operation === 'delete') {
        validation.errors.push(...await this.validateDelete(entityName, data, context));
      }

      // Referential integrity checks
      if (this.config.enableReferentialIntegrity && context?.dataContext) {
        const integrityErrors = await this.validator.validateReferentialIntegrity(
          entityName, 
          data, 
          context.dataContext
        );
        validation.errors.push(...integrityErrors);
      }

      // Log errors if enabled
      if (this.config.logErrors && validation.errors.length > 0) {
        logger.warn(`Validation errors for ${entityName}:`, validation.errors);
      }

      // In lenient mode, convert non-critical errors to warnings
      if (this.config.validationMode === 'lenient') {
        const criticalErrors = validation.errors.filter(e => e.severity === 'critical');
        const nonCriticalErrors = validation.errors.filter(e => e.severity !== 'critical');
        
        validation.warnings.push(...nonCriticalErrors.map(e => ({
          field: e.field,
          message: e.message,
          code: e.code
        })));
        
        validation.errors = criticalErrors;
        validation.isValid = criticalErrors.length === 0;
      }

      return validation;
    } catch (error) {
      const validationError: ValidationError = {
        field: '_validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_FAILURE',
        severity: 'critical'
      };

      return {
        isValid: false,
        errors: [validationError],
        warnings: []
      };
    }
  }

  // Validate create operation
  private async validateCreate(
    entityName: string, 
    data: EntityData, 
    context?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for required ID
    if (!data.id) {
      errors.push({
        field: 'id',
        message: 'ID is required for create operation',
        code: 'MISSING_ID',
        severity: 'error'
      });
    }

    // Check for duplicate ID
    if (context?.dataContext?.[entityName]) {
      const existing = context.dataContext[entityName].find((item: any) => item.id === data.id);
      if (existing) {
        errors.push({
          field: 'id',
          message: `Entity with ID ${data.id} already exists`,
          code: 'DUPLICATE_ID',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  // Validate update operation
  private async validateUpdate(
    entityName: string, 
    data: EntityData, 
    context?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check that entity exists
    if (context?.dataContext?.[entityName]) {
      const existing = context.dataContext[entityName].find((item: any) => item.id === data.id);
      if (!existing) {
        errors.push({
          field: 'id',
          message: `Entity with ID ${data.id} does not exist`,
          code: 'ENTITY_NOT_FOUND',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  // Validate delete operation
  private async validateDelete(
    entityName: string, 
    data: EntityData, 
    context?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check that entity exists
    if (context?.dataContext?.[entityName]) {
      const existing = context.dataContext[entityName].find((item: any) => item.id === data.id);
      if (!existing) {
        errors.push({
          field: 'id',
          message: `Entity with ID ${data.id} does not exist`,
          code: 'ENTITY_NOT_FOUND',
          severity: 'error'
        });
      }
    }

    // Check for cascade delete constraints
    if (context?.dataContext) {
      const cascadeErrors = await this.checkCascadeDeleteConstraints(entityName, data.id, context.dataContext);
      errors.push(...cascadeErrors);
    }

    return errors;
  }

  // Check cascade delete constraints
  private async checkCascadeDeleteConstraints(
    entityName: string,
    entityId: string | number,
    dataContext: Record<string, any[]>
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Define cascade relationships (this could be moved to schema definitions)
    const cascadeRules: Record<string, Array<{entity: string, field: string, allowCascade: boolean}>> = {
      students: [
        { entity: 'studentInvoices', field: 'student_id', allowCascade: false },
        { entity: 'studentPayments', field: 'student_id', allowCascade: false },
        { entity: 'studentSubjectEnrollments', field: 'student_id', allowCascade: true }
      ],
      staff: [
        { entity: 'classStreams', field: 'class_teacher_id', allowCascade: false },
        { entity: 'teacherSubjectAssignments', field: 'teacher_id', allowCascade: true }
      ],
      classStreams: [
        { entity: 'students', field: 'current_class_stream_id', allowCascade: false },
        { entity: 'classSubjectAllocations', field: 'class_stream_id', allowCascade: true }
      ]
    };

    const rules = cascadeRules[entityName];
    if (!rules) return errors;

    for (const rule of rules) {
      const relatedEntities = dataContext[rule.entity] || [];
      const dependentEntities = relatedEntities.filter((item: any) => item[rule.field] === entityId);

      if (dependentEntities.length > 0 && !rule.allowCascade) {
        errors.push({
          field: 'id',
          message: `Cannot delete ${entityName} ${entityId}: ${dependentEntities.length} ${rule.entity} records depend on it`,
          code: 'CASCADE_DELETE_CONSTRAINT',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  // Run comprehensive consistency check
  async runConsistencyCheck(
    dataContext: Record<string, any[]>,
    mode: 'demo' | 'production' = 'demo'
  ): Promise<ConsistencyReport> {
    const startTime = Date.now();
    const validationErrors: ValidationError[] = [];
    const consistencyErrors: ValidationError[] = [];

    try {
      // Count total entities and records
      const totalEntities = Object.keys(dataContext).length;
      const totalRecords = Object.values(dataContext).reduce((sum, arr) => sum + arr.length, 0);

      // Validate each entity
      if (this.config.enableValidation) {
        for (const [entityName, entityData] of Object.entries(dataContext)) {
          if (!Array.isArray(entityData)) continue;

          for (const item of entityData) {
            const validation = await this.validateEntity(entityName, item, 'update', { dataContext });
            validationErrors.push(...validation.errors);
          }
        }
      }

      // Run consistency checks
      if (this.config.enableConsistencyChecks) {
        const consistencyResults = await this.validator.validateConsistency(dataContext);
        consistencyErrors.push(...consistencyResults);
      }

      // Analyze errors
      const allErrors = [...validationErrors, ...consistencyErrors];
      const criticalErrors = allErrors.filter(e => e.severity === 'critical').length;
      const warnings = allErrors.filter(e => e.severity !== 'critical').length;

      const entitiesWithErrors = [...new Set(allErrors.map(e => e.field.split('.')[0]))];
      const errorsByType = allErrors.reduce((acc, error) => {
        acc[error.code] = (acc[error.code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const report: ConsistencyReport = {
        timestamp: new Date(),
        mode,
        totalEntities,
        totalRecords,
        validationErrors,
        consistencyErrors,
        warnings,
        criticalErrors,
        summary: {
          isConsistent: allErrors.length === 0,
          entitiesWithErrors,
          errorsByType
        }
      };

      this.lastReport = report;

      // Log summary
      if (this.config.logErrors) {
        logger.info(`Data consistency check completed in ${Date.now() - startTime}ms`);
        logger.info(`Total errors: ${allErrors.length} (${criticalErrors} critical, ${warnings} warnings)`);
        if (allErrors.length > 0) {
          logger.info('Entities with errors:', entitiesWithErrors);
        }
      }

      return report;
    } catch (error) {
      const errorReport: ConsistencyReport = {
        timestamp: new Date(),
        mode,
        totalEntities: 0,
        totalRecords: 0,
        validationErrors: [{
          field: '_consistency_check',
          message: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'CONSISTENCY_CHECK_FAILURE',
          severity: 'critical'
        }],
        consistencyErrors: [],
        warnings: 0,
        criticalErrors: 1,
        summary: {
          isConsistent: false,
          entitiesWithErrors: ['_system'],
          errorsByType: { 'CONSISTENCY_CHECK_FAILURE': 1 }
        }
      };

      return errorReport;
    }
  }

  // Validate data migration between modes
  async validateDataMigration(
    fromData: Record<string, any[]>,
    toData: Record<string, any[]>,
    fromVersion: string = 'demo',
    toVersion: string = 'production'
  ): Promise<DataMigrationResult> {
    try {
      // Validate source data
      const sourceReport = await this.runConsistencyCheck(fromData, fromVersion as any);
      
      // Validate target data
      const targetReport = await this.runConsistencyCheck(toData, toVersion as any);

      // Check for data loss or corruption
      const migrationErrors: ValidationError[] = [];
      
      for (const [entityName, sourceEntities] of Object.entries(fromData)) {
        const targetEntities = toData[entityName] || [];
        
        if (sourceEntities.length > targetEntities.length) {
          migrationErrors.push({
            field: entityName,
            message: `Data loss detected: ${sourceEntities.length - targetEntities.length} ${entityName} records missing after migration`,
            code: 'DATA_LOSS',
            severity: 'critical'
          });
        }
      }

      const allErrors = [
        ...sourceReport.validationErrors,
        ...sourceReport.consistencyErrors,
        ...targetReport.validationErrors,
        ...targetReport.consistencyErrors,
        ...migrationErrors
      ];

      const result: DataMigrationResult = {
        success: allErrors.filter(e => e.severity === 'critical').length === 0,
        fromVersion,
        toVersion,
        migratedEntities: Object.keys(fromData),
        errors: allErrors,
        warnings: allErrors.filter(e => e.severity !== 'critical').map(e => e.message),
        backupCreated: false // This would be implemented based on the actual backup strategy
      };

      return result;
    } catch (error) {
      return {
        success: false,
        fromVersion,
        toVersion,
        migratedEntities: [],
        errors: [{
          field: '_migration',
          message: `Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'MIGRATION_VALIDATION_FAILURE',
          severity: 'critical'
        }],
        warnings: [],
        backupCreated: false
      };
    }
  }

  // Get the last consistency report
  getLastReport(): ConsistencyReport | null {
    return this.lastReport;
  }

  // Update configuration
  updateConfig(newConfig: Partial<DataConsistencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): DataConsistencyConfig {
    return { ...this.config };
  }

  // Register custom validation schema
  registerValidationSchema(schema: any): void {
    this.validator.registerSchema(schema);
  }

  // Register custom consistency check
  registerConsistencyCheck(check: any): void {
    this.validator.registerConsistencyCheck(check);
  }
}

// Global instance
export const globalDataConsistencyService = new DataConsistencyService();
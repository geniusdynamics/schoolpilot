// ABOUTME: Type definitions for the universal data generation engine
// ABOUTME: Supports multiple storage types and comprehensive data generation

export type StorageType = 'sqlite-opfs' | 'sqlite-livestore' | 'pouchdb' | 'mock';
export type MigrationMode = 'fresh' | 'incremental' | 'merge';

export interface DataGenerationConfig {
  storageType: StorageType;
  migrationMode: MigrationMode;
  batchSize: number;
  enableValidation: boolean;
  enableRelationshipValidation: boolean;
  locale?: string;
  seedData: {
    students: number;
    staff: number;
    subjects: number;
    books: number;
    suppliers: number;
    inventoryItems: number;
    clubs: number;
    dormitories: number;
  };
  customGenerators?: Record<string, (count: number) => any[]>;
  
  // School configuration
  schoolName?: string;
  schoolType?: string;
  currentAcademicYear?: string;
  
  // Administration Generator properties
  targetDepartmentCount?: number;
  targetDesignationCount?: number;
  targetSubjectCount?: number;
  targetDormitoryCount?: number;
  targetTransportRouteCount?: number;
  
  // Library Generator properties
  targetBookCount?: number;
  targetAuthorCount?: number;
  targetPublisherCount?: number;
  targetCategoryCount?: number;
  loanPercentage?: number;
  
  // Financial Generator properties
  targetSupplierCount?: number;
  targetTransactionCount?: number;
  
  // Academics Generator properties
  targetGradeCount?: number;
  targetClassCount?: number;
  targetTermCount?: number;
  targetExamCount?: number;
  targetAssignmentCount?: number;
  
  // Clubs Generator properties
  targetClubCount?: number;
  targetClubCategoryCount?: number;
  targetEventCount?: number;
  targetActivityCount?: number;
  targetAchievementCount?: number;
  membershipPercentage?: number;
}

export interface IStorageAdapter {
  initialize(): Promise<void>;
  createSchema(tableName: string, schema: string): Promise<void>;
  insertBatch(tableName: string, data: any[]): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  validateRelationships(tableName: string, data: any[]): Promise<boolean>;
  cleanup(): Promise<void>;
}

export interface GeneratedEntity {
  id: string;
  tableName: string;
  data: Record<string, any>;
  relationships: Record<string, string[]>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataGenerationResult {
  success: boolean;
  entitiesGenerated: number;
  tablesCreated: string[];
  validationResults: ValidationResult[];
  executionTime: number;
  errors: string[];
}

export interface RelationshipDefinition {
  sourceTable: string;
  targetTable: string;
  sourceField: string;
  targetField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  required: boolean;
}

export interface TableSchema {
  name: string;
  ddl: string;
  dependencies: string[];
  relationships: RelationshipDefinition[];
  seedCount: number;
}
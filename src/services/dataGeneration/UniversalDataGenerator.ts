// ABOUTME: Main orchestrator for universal data generation across storage types
// ABOUTME: Coordinates adapters, relationships, and data generation workflows

import { StorageType, DataGenerationConfig, IStorageAdapter, DataGenerationResult, GeneratedEntity } from './types';
import { AdapterFactory } from './adapters/AdapterFactory';
import { RelationshipManager } from './RelationshipManager';
import {
  AdministrationGenerator,
  AcademicsGenerator,
  FinancialGenerator,
  ClubsGenerator,
  DormitoryGenerator,
  LibraryGenerator,
  NutritionGenerator,
  PayrollGenerator,
  InventoryGenerator,
  TransportGenerator,
  CommunicationGenerator,
  HealthGenerator
} from './generators/index';

export interface UniversalDataGenerationConfig {
  storageType: 'sqlite-opfs' | 'sqlite-livestore' | 'pouchdb' | 'mock';
  locale?: string;
  batchSize?: number;
  logProgress?: boolean;
  validateData?: boolean;
  generateRelationships?: boolean;
  modules?: string[];
  counts?: Record<string, number>;
  seedData?: {
    useRealisticData?: boolean;
    includeTestData?: boolean;
  };
}

export interface GenerationStats {
  totalRecords: number;
  tablesGenerated: string[];
  generationTime: number;
  storageType: string;
}

export class UniversalDataGenerator {
  private adapter: any;
  private relationshipManager: RelationshipManager;
  private config: UniversalDataGenerationConfig;
  private generators: { [key: string]: any } = {};

  constructor(config: UniversalDataGenerationConfig) {
    this.config = config;
    
    // Initialize generators
    this.initializeGenerators();
  }

  private initializeGenerators(): void {
    const generatorConfig: DataGenerationConfig = {
      locale: this.config.locale || 'en',
      batchSize: this.config.batchSize || 100,
      logProgress: this.config.logProgress || false
    };

    this.generators = {
      administration: new AdministrationGenerator(generatorConfig),
      academic: new AcademicsGenerator(generatorConfig),
      finance: new FinancialGenerator(generatorConfig),
      clubs: new ClubsGenerator(generatorConfig),
      dormitory: new DormitoryGenerator(generatorConfig),
      library: new LibraryGenerator(generatorConfig),
      nutrition: new NutritionGenerator(generatorConfig),
      payroll: new PayrollGenerator(generatorConfig),
      inventory: new InventoryGenerator(generatorConfig),
      transport: new TransportGenerator(generatorConfig),
      communication: new CommunicationGenerator(generatorConfig),
      health: new HealthGenerator(generatorConfig)
    };
  }

  async initialize(): Promise<void> {
    try {
      // Create and initialize storage adapter
      this.adapter = await AdapterFactory.createAdapter(this.config.storageType);
      await this.adapter.initialize();
      
      // Initialize relationship manager
      this.relationshipManager = new RelationshipManager();
      
      if (this.config.logProgress) {
        console.log(`Universal Data Generator initialized with ${this.config.storageType} storage`);
      }
    } catch (error) {
      console.error('Failed to initialize Universal Data Generator:', error);
      throw error;
    }
  }

  async generateData(): Promise<GenerationStats> {
    if (!this.adapter || !this.relationshipManager) {
      throw new Error('Generator not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const tablesGenerated: string[] = [];
    let totalRecords = 0;

    try {
      if (this.config.logProgress) {
        console.log('Starting data generation process...');
      }
      
      // Generate data for each requested module
      for (const module of this.config.modules || []) {
        try {
          const records = await this.generateModuleData(module);
          totalRecords += records.recordCount;
          tablesGenerated.push(...records.tables);
        } catch (error) {
          console.error(`Failed to generate data for module ${module}:`, error);
          throw error;
        }
      }

      const generationTime = Date.now() - startTime;
      
      if (this.config.logProgress) {
        console.log(`Data generation completed in ${generationTime}ms`);
        console.log(`Generated ${totalRecords} total records across ${tablesGenerated.length} tables`);
      }
      
      return {
        totalRecords,
        tablesGenerated,
        generationTime,
        storageType: this.config.storageType
      };
    } catch (error) {
      console.error('Data generation failed:', error);
      throw error;
    }
  }

  private async generateModuleData(module: string): Promise<{ recordCount: number; tables: string[] }> {
    const generator = this.generators[module];
    if (!generator) {
      throw new Error(`No generator found for module: ${module}`);
    }

    const data = await generator.generateData(this.config.counts?.[module] || 10);
    
    // Extract unique table names and count records
    const tables = [...new Set(data.map((item: any) => item.table))];
    const recordCount = data.length;
    
    // Store data in adapter if available
    if (this.adapter) {
      for (const item of data) {
        await this.adapter.insertBatch(item.table, item.data);
      }
    }
    
    return {
      recordCount,
      tables
    };
  }



  async validateData(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    if (!this.adapter || !this.relationshipManager) {
      return {
        isValid: false,
        errors: ['Generator not initialized'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate each table's data
      const generationOrder = this.relationshipManager.getGenerationOrder();
      
      for (const tableName of generationOrder) {
        try {
          const data = await this.adapter.query(`SELECT * FROM ${tableName} LIMIT 100`);
          const validation = await this.relationshipManager.validateRelationships(tableName, data);
          
          if (!validation.isValid) {
            errors.push(...validation.errors.map(e => `${tableName}: ${e}`));
          }
          
          warnings.push(...validation.warnings.map(w => `${tableName}: ${w}`));
        } catch (error) {
          errors.push(`Failed to validate ${tableName}: ${error}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        warnings
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.adapter) {
      await this.adapter.cleanup();
    }
    
    this.adapter = null;
    this.relationshipManager = null;
    this.config = null;
    this.generators = null;
    
    console.log('Universal Data Generator cleaned up');
  }

  getGenerationStats(): {
    storageType: StorageType | null;
    tablesGenerated: number;
    totalRecords: number;
    lastGeneration: string | null;
  } {
    return {
      storageType: this.config?.storageType || null,
      tablesGenerated: Object.keys(this.config?.entities || {}).length,
      totalRecords: 0, // Would need to query adapter for actual count
      lastGeneration: null // Would need to track this
    };
  }

  private getTableSchemas(): Record<string, TableSchema> {
    // Return predefined schemas for all tables
    return {
      students: {
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'student_number', type: 'TEXT', unique: true },
          { name: 'first_name', type: 'TEXT', required: true },
          { name: 'last_name', type: 'TEXT', required: true },
          { name: 'email', type: 'TEXT', unique: true },
          { name: 'date_of_birth', type: 'DATE' },
          { name: 'gender', type: 'TEXT' },
          { name: 'phone', type: 'TEXT' },
          { name: 'address', type: 'TEXT' },
          { name: 'emergency_contact', type: 'TEXT' },
          { name: 'enrollment_date', type: 'DATE' },
          { name: 'status', type: 'TEXT' },
          { name: 'class_id', type: 'INTEGER' },
          { name: 'dormitory_id', type: 'INTEGER' },
          { name: 'transport_route_id', type: 'INTEGER' },
          { name: 'created_at', type: 'DATETIME', defaultValue: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'DATETIME', defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        indexes: [
          { columns: ['student_number'], unique: true },
          { columns: ['email'], unique: true },
          { columns: ['class_id'] },
          { columns: ['status'] }
        ]
      },
      staff: {
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'staff_number', type: 'TEXT', unique: true },
          { name: 'first_name', type: 'TEXT', required: true },
          { name: 'last_name', type: 'TEXT', required: true },
          { name: 'email', type: 'TEXT', unique: true },
          { name: 'phone', type: 'TEXT' },
          { name: 'department_id', type: 'INTEGER' },
          { name: 'position', type: 'TEXT' },
          { name: 'hire_date', type: 'DATE' },
          { name: 'salary', type: 'DECIMAL' },
          { name: 'status', type: 'TEXT' },
          { name: 'created_at', type: 'DATETIME', defaultValue: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'DATETIME', defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        indexes: [
          { columns: ['staff_number'], unique: true },
          { columns: ['email'], unique: true },
          { columns: ['department_id'] },
          { columns: ['status'] }
        ]
      }
      // Add more schemas as needed
    };
  }


}
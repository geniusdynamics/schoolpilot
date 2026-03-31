// ABOUTME: Service for managing data layer modes, switching between development, demo, and production configurations
// ABOUTME: Handles data seeding, clearing, and provider switching based on mode

import { getDataLayerConfig } from '../config/dataLayerConfig';
import { DatabaseProviderFactory, getDatabaseProviderFactory, ProviderType } from './database/DatabaseProviderFactory';
import { DatabaseConfig, QueryOptions } from './database/interfaces';
import { DataGenerationConfig } from './dataGeneration/types';
import { EventEmitter } from 'events';
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
  HealthGenerator,
  CommunicationGenerator
} from './dataGeneration/generators/index';

export type DataMode = 'development' | 'demo' | 'production';

export interface ModeTransitionOptions {
  preserveData?: boolean;
  seedData?: boolean;
  clearData?: boolean;
  backupData?: boolean;
}

export interface DataModeManagerOptions {
  preserveData?: boolean;
  seedData?: boolean;
  clearData?: boolean;
  backupData?: boolean;
  requiresReload?: boolean;
}

export interface DataModeStatus {
  currentMode: DataMode;
  activeProvider: string;
  dataCount: number;
  lastSwitched: Date;
  isTransitioning: boolean;
}

export interface SeedDataConfig {
  students: any[];
  teachers: any[];
  classes: any[];
  subjects: any[];
  assignments: any[];
}

export class DataModeManager extends EventEmitter {
  private currentMode: DataMode = 'development';
  private isTransitioning: boolean = false;
  private dbFactory: DatabaseProviderFactory;
  private lastSwitched: Date = new Date();

  private switchQueue: Array<{ task: () => Promise<void>, resolve: () => void, reject: (err: any) => void }> = [];

  constructor() {
    super();
    this.dbFactory = getDatabaseProviderFactory();
    this.initializeMode();
  }

  private async processQueue() {
    if (this.isTransitioning || this.switchQueue.length === 0) return;
    
    this.isTransitioning = true;
    const item = this.switchQueue.shift();
    if (item) {
      try {
        await item.task();
        item.resolve();
      } catch (err) {
        item.reject(err);
      } finally {
        this.isTransitioning = false;
        // Continue processing if there are more items
        if (this.switchQueue.length > 0) {
          this.processQueue();
        }
      }
    }
  }

  private async initializeMode(): Promise<void> {
    try {
      // Detect current mode from environment or stored preference
      // Use the same key as unified config: 'app_data_mode'
      const storedMode = localStorage.getItem('app_data_mode') as DataMode;
      if (storedMode && ['development', 'demo', 'production'].includes(storedMode)) {
        this.currentMode = storedMode;
      } else {
        // Default based on environment
        this.currentMode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
      }

      // Initialize the database factory with the current mode configuration
      const config = getDataLayerConfig(this.currentMode);
      await this.dbFactory.switchProvider(config.provider as ProviderType, config.options as unknown as DatabaseConfig);
      
      this.emit('modeInitialized', this.currentMode);
    } catch (error) {
      console.error('Failed to initialize data mode:', error);
      this.emit('error', error);
    }
  }

  async switchMode(newMode: DataMode, options: ModeTransitionOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.switchQueue.push({
        task: async () => {
          if (this.currentMode === newMode) {
            console.log(`Already in ${newMode} mode`);
            return;
          }

          this.emit('transitionStarted', { from: this.currentMode, to: newMode });
          const previousMode = this.currentMode;
          const currentProvider = this.dbFactory.getActiveProvider();
          const previousProviderName = currentProvider ? currentProvider.name : null;

          try {
            // Step 1: Backup current data if requested
            if (options.backupData) {
              await this.backupCurrentData();
            }

            // Step 2: Get new configuration
            const newConfig = getDataLayerConfig(newMode);
            
            // Step 3: Clear data if requested or switching to a different provider type
            const needsDataClear = options.clearData || 
              (currentProvider && currentProvider.name !== newConfig.provider);
            
            if (needsDataClear && !options.preserveData) {
              await this.clearAllData({ force: true, confirmationToken: 'DANGER_CLEAR_PRODUCTION_DATA' }); // Safe here because it's an internal managed switch
            }

            // Step 4: Switch to new provider
            await this.dbFactory.switchProvider(newConfig.provider as ProviderType, newConfig.options as unknown as DatabaseConfig);

            // Step 5: Seed data if requested (typically for demo mode)
            if (options.seedData || (newMode === 'demo' && options.seedData !== false)) {
              await this.seedDemoData();
            }

            // Step 6: Update current mode and persist preference
            this.currentMode = newMode;
            this.lastSwitched = new Date();
            localStorage.setItem('app_data_mode', newMode);
            localStorage.setItem('app_data_mode_timestamp', this.lastSwitched.toISOString());

            this.emit('modeChanged', { 
              mode: newMode, 
              provider: newConfig.provider,
              timestamp: this.lastSwitched
            });

            this.emit('transitionCompleted', this.currentMode);
          } catch (error) {
            console.error('Failed to switch mode, rolling back:', error);
            
            // Rollback
            try {
              if (previousProviderName) {
                 const prevConfig = getDataLayerConfig(previousMode);
                 await this.dbFactory.switchProvider(previousProviderName as ProviderType, prevConfig.options as unknown as DatabaseConfig);
                 this.currentMode = previousMode;
              }
            } catch (rollbackError) {
              console.error('CRITICAL: Rollback failed after switchMode error', rollbackError);
            }
            
            this.emit('error', error);
            throw error;
          }
        },
        resolve,
        reject
      });
      
      // Trigger queue processing
      this.processQueue();
    });
  }

  async clearAllData(options?: { force?: boolean; confirmationToken?: string }): Promise<void> {
    try {
      const isProduction = process.env.NODE_ENV === 'production' || this.currentMode === 'production';
      
      if (isProduction) {
        if (!options?.force || options.confirmationToken !== 'DANGER_CLEAR_PRODUCTION_DATA') {
          throw new Error('CLEAR_REJECTED: Cannot clear production data without explicit force and confirmation token.');
        }
      }

      const provider = this.dbFactory.getActiveProvider();
      if (!provider) {
        throw new Error('No active database provider');
      }

      // Get all collections and clear them
      const collections = ['students', 'teachers', 'classes', 'subjects', 'assignments', 'grades', 'attendance'];
      
      for (const collectionName of collections) {
        try {
          const collection = await provider.getCollection(collectionName);
          if (collection) {
            try {
              // ICollection.removeMany takes QueryOptions with a selector, {} removes all matched docs
              if (typeof collection.removeMany === 'function') {
                await collection.removeMany({ selector: {} });
              } else if (typeof collection.remove === 'function') {
                const allDocs = await collection.find({});
                for (const doc of allDocs) {
                  await collection.remove((doc as any).id || (doc as any)._id);
                }
              }
            } catch (error) {
              console.warn(`Failed to clear collection ${collectionName}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to clear collection ${collectionName}:`, error);
        }
      }

      // Audit log the clearance
      try {
        const auditCollection = await provider.getCollection('audit_logs');
        if (!auditCollection && typeof provider.createCollection === 'function') {
           const auditSchema = {
             version: 0,
             type: 'object',
             properties: {
               id: { type: 'string' },
               action: { type: 'string' },
               timestamp: { type: 'string' },
               environment: { type: 'string' }
             },
             primaryKey: 'id'
           };
           const newAuditCollection = await provider.createCollection('audit_logs', auditSchema as any);
           if (newAuditCollection && typeof newAuditCollection.insert === 'function') {
             await newAuditCollection.insert({
               id: `audit-${Date.now()}`,
               action: 'CLEAR_ALL_DATA',
               timestamp: new Date().toISOString(),
               environment: this.currentMode
             });
           }
        } else if (auditCollection && typeof auditCollection.insert === 'function') {
          await auditCollection.insert({
            id: `audit-${Date.now()}`,
            action: 'CLEAR_ALL_DATA',
            timestamp: new Date().toISOString(),
            environment: this.currentMode
          });
        }
      } catch (auditError) {
        console.warn('Failed to write audit log for data clearance:', auditError);
      }

      this.emit('dataCleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  async seedDemoData(volume: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise' = 'medium'): Promise<void> {
    try {
      const provider = this.dbFactory.getActiveProvider();
      if (!provider) {
        throw new Error('No active database provider');
      }

      console.log(`[DataModeManager] Seeding comprehensive demo data (volume: ${volume})...`);

      interface VolumePreset {
        students: number; staff: number; subjects: number; classes: number;
        books: number; suppliers: number; vehicles: number; inventoryItems: number;
        dormitories: number; clubs: number; mealPlans: number; healthRecords: number;
        communications: number;
      }
      const volumePresets: Record<'tiny' | 'small' | 'medium' | 'large' | 'enterprise', VolumePreset> = {
        tiny:       { students: 30,  staff: 10,  subjects: 12, classes: 4,  books: 50,   suppliers: 5,   vehicles: 3,   inventoryItems: 30,  dormitories: 2,  clubs: 5,   mealPlans: 3,  healthRecords: 30,  communications: 20   },
        small:      { students: 150, staff: 30,  subjects: 20, classes: 8,  books: 300,  suppliers: 15,  vehicles: 8,   inventoryItems: 100, dormitories: 5,  clubs: 12,  mealPlans: 5,  healthRecords: 150, communications: 100  },
        medium:     { students: 500, staff: 75,  subjects: 30, classes: 20, books: 800,  suppliers: 30,  vehicles: 15,  inventoryItems: 250, dormitories: 10, clubs: 25,  mealPlans: 8,  healthRecords: 500, communications: 300  },
        large:      { students: 1500, staff: 200, subjects: 40, classes: 50, books: 2000, suppliers: 60,  vehicles: 30,  inventoryItems: 600, dormitories: 20, clubs: 50,  mealPlans: 12, healthRecords: 1500, communications: 800 },
        enterprise: { students: 5000, staff: 500, subjects: 50, classes: 120, books: 5000, suppliers: 100, vehicles: 60, inventoryItems: 1200, dormitories: 40, clubs: 80, mealPlans: 20, healthRecords: 5000, communications: 2000 }
      };

      const counts = volumePresets[volume];

      // Full DataGenerationConfig matching the type expected by all generators
      const generatorConfig: DataGenerationConfig = {
        storageType: 'mock',
        migrationMode: 'fresh',
        batchSize: 100,
        enableValidation: true,
        enableRelationshipValidation: true,
        locale: 'en_KE',
        seedData: {
          students: counts.students,
          staff: counts.staff,
          subjects: counts.subjects,
          books: counts.books,
          suppliers: counts.suppliers,
          inventoryItems: counts.inventoryItems,
          clubs: counts.clubs,
          dormitories: counts.dormitories
        }
      };

      // Initialize all module generators with shared config
      const generators = {
        administration:   new AdministrationGenerator(generatorConfig),
        academic:         new AcademicsGenerator(generatorConfig),
        finance:          new FinancialGenerator(generatorConfig),
        clubs:            new ClubsGenerator(generatorConfig),
        dormitory:        new DormitoryGenerator(generatorConfig),
        library:          new LibraryGenerator(generatorConfig),
        nutrition:        new NutritionGenerator(generatorConfig),
        payroll:          new PayrollGenerator(generatorConfig),
        inventory:        new InventoryGenerator(generatorConfig),
        transport:        new TransportGenerator(generatorConfig),
        health:           new HealthGenerator(generatorConfig),
        communications:   new CommunicationGenerator(generatorConfig)
      };

      // Map module names to their count keys in the preset
      type GeneratorKey = keyof typeof generators;
      const countKeys: Record<GeneratorKey, keyof VolumePreset> = {
        administration: 'staff',
        academic: 'students',
        finance: 'staff',
        clubs: 'clubs',
        dormitory: 'dormitories',
        library: 'books',
        nutrition: 'mealPlans',
        payroll: 'staff',
        inventory: 'inventoryItems',
        transport: 'vehicles',
        health: 'healthRecords',
        communications: 'communications'
      };

      // Track which collections exist and which we insert into
      const insertedCounts: Record<string, number> = {};

      // Iterate through all generators and insert their data into real ICollection collections
      for (const [moduleName, generator] of Object.entries(generators)) {
        try {
          const countKey = countKeys[moduleName as GeneratorKey];
          const count = counts[countKey] || 10;
          const generatedData = await generator.generateData(count);
          
          if (!generatedData || generatedData.length === 0) {
            console.warn(`[DataModeManager] No data generated for module: ${moduleName}`);
            continue;
          }

          // Group by table name (each item is { table: string, data: object })
          const tableGroups = new Map<string, any[]>();
          for (const item of generatedData) {
            if (!item || !item.table || !item.data) continue;
            const tableName = this.normalizeTableName(item.table);
            if (!tableGroups.has(tableName)) tableGroups.set(tableName, []);
            tableGroups.get(tableName)!.push(item.data);
          }

          // Insert each group into the real ICollection
          for (const [tableName, records] of tableGroups) {
            try {
              let collection = provider.getCollection(tableName);
              
              // If collection doesn't exist, create it dynamically
              if (!collection) {
                if (typeof provider.createCollection === 'function') {
                  collection = await provider.createCollection(tableName, {
                    version: 0,
                    type: 'object',
                    properties: {},
                    primaryKey: 'id'
                  } as any);
                  console.log(`[DataModeManager] Dynamically created collection: ${tableName}`);
                } else {
                  console.warn(`[DataModeManager] Cannot create collection '${tableName}' — provider doesn't support it`);
                  continue;
                }
              }

              // Insert records using ICollection.insert (supports single or batch via insertMany)
              if (typeof collection.insertMany === 'function') {
                await collection.insertMany(records);
              } else {
                for (const record of records) {
                  if (typeof collection.insert === 'function') {
                    await collection.insert(record);
                  }
                }
              }

              insertedCounts[tableName] = (insertedCounts[tableName] || 0) + records.length;
              console.log(`[DataModeManager] Inserted ${records.length} records into '${tableName}'`);
            } catch (insertError) {
              console.warn(`[DataModeManager] Failed to insert into '${tableName}':`, insertError instanceof Error ? insertError.message : String(insertError));
            }
          }
        } catch (genError) {
          console.warn(`[DataModeManager] Generator '${moduleName}' failed:`, genError instanceof Error ? genError.message : String(genError));
          // Continue with other generators — don't fail the whole seeding
        }
      }

      const totalRecords = Object.values(insertedCounts).reduce((sum, c) => sum + c, 0);
      const tablesPopulated = Object.keys(insertedCounts).length;

      console.log(`[DataModeManager] Demo data seeding complete: ${totalRecords} records across ${tablesPopulated} collections.`, insertedCounts);

      this.emit('dataSeeded', { volume, stats: { totalRecords, tablesGenerated: Object.keys(insertedCounts), insertedCounts } });
    } catch (error) {
      console.error('[DataModeManager] Failed to seed demo data:', error);
      throw error;
    }
  }

  private normalizeTableName(table: string): string {
    return table.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  }



  private async backupCurrentData(): Promise<void> {
    try {
      const provider = this.dbFactory.getActiveProvider();
      if (!provider || typeof provider.backup !== 'function') {
        console.warn('Current provider does not support backup');
        return;
      }

      const backupName = `backup_${this.currentMode}_${Date.now()}`;
      await provider.backup();
      
      this.emit('dataBackedUp', { mode: this.currentMode, backupName });
    } catch (error) {
      console.error('Failed to backup data:', error);
      // Don't throw here, as backup failure shouldn't prevent mode switching
    }
  }

  async getStatus(): Promise<DataModeStatus> {
    const provider = this.dbFactory.getActiveProvider();
    let dataCount = 0;

    try {
      if (provider) {
        // Count total records across all collections
        const collections = ['students', 'teachers', 'classes', 'subjects', 'assignments'];
        for (const collectionName of collections) {
          try {
            const collection = await provider.getCollection(collectionName);
            if (collection && typeof collection.count === 'function') {
              dataCount += await collection.count();
            }
          } catch (error) {
            console.warn(`Failed to count collection ${collectionName}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get data count:', error);
    }

    return {
      currentMode: this.currentMode,
      activeProvider: provider?.name || 'none',
      dataCount,
      lastSwitched: this.lastSwitched,
      isTransitioning: this.isTransitioning
    };
  }

  getCurrentMode(): DataMode {
    return this.currentMode;
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }

  getAvailableModes(): DataMode[] {
    return ['development', 'demo', 'production'];
  }

  async resetToDefaults(): Promise<void> {
    await this.switchMode('development', {
      clearData: true,
      seedData: false,
      preserveData: false
    });
  }

  destroy(): void {
    this.removeAllListeners();
  }
}

// Singleton instance
let dataModeManagerInstance: DataModeManager | null = null;

export function getDataModeManager(): DataModeManager {
  if (!dataModeManagerInstance) {
    dataModeManagerInstance = new DataModeManager();
  }
  return dataModeManagerInstance;
}

export function resetDataModeManager(): void {
  if (dataModeManagerInstance) {
    dataModeManagerInstance.destroy();
    dataModeManagerInstance = null;
  }
}
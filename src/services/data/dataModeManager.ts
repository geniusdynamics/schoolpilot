import { logger } from '@/utils/logging';

// ABOUTME: Service for managing data layer modes, switching between development, demo, and production configurations
// ABOUTME: Handles data seeding, clearing, and provider switching based on mode

import { getDataLayerConfig } from '../../config/dataLayerConfig';
import { DatabaseProviderFactory, getDatabaseProviderFactory, ProviderType } from '../database/DatabaseProviderFactory';
import { DatabaseConfig } from '../database/interfaces';
import { EventEmitter } from 'events';
import { REQUIRED_SCHOOL_COLLECTIONS, seedProviderWithDemoData } from '../database/demoDataSeed';

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
  isDemoDataCleared: boolean;
}

// Storage key for tracking whether demo data has been cleared
const DEMO_DATA_CLEARED_KEY = 'schoolpilot_demo_data_cleared';

/**
 * Check if demo data has been permanently cleared.
 * Once cleared, reverting to demo mode is blocked to prevent data loss.
 */
export function isDemoDataCleared(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_DATA_CLEARED_KEY) === 'true';
}

/**
 * Permanently mark demo data as cleared.
 * This is a one-way operation that blocks future demo mode transitions.
 */
export function markDemoDataCleared(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_DATA_CLEARED_KEY, 'true');
}

/**
 * Reset the demo data cleared flag.
 * Should only be used in development or for complete system reset.
 */
export function resetDemoDataCleared(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_DATA_CLEARED_KEY);
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
      logger.error('Failed to initialize data mode:', error);
      this.emit('error', error);
    }
  }

  async switchMode(newMode: DataMode, options: ModeTransitionOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.switchQueue.push({
        task: async () => {
          if (this.currentMode === newMode) {
            logger.info(`Already in ${newMode} mode`);
            return;
          }

          // HARD ENFORCEMENT: Prevent switching to demo mode if demo data has been cleared
          if (newMode === 'demo' && isDemoDataCleared()) {
            const error = new Error(
              'DEMO_MODE_BLOCKED: Demo data has been permanently cleared. ' +
              'Switching back to demo mode is not allowed to prevent production data loss. ' +
              'The system must remain in production mode.'
            );
            this.emit('error', error);
            throw error;
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
            logger.error('Failed to switch mode, rolling back:', error);
            
            // Rollback
            try {
              if (previousProviderName) {
                 const prevConfig = getDataLayerConfig(previousMode);
                 await this.dbFactory.switchProvider(previousProviderName as ProviderType, prevConfig.options as unknown as DatabaseConfig);
                 this.currentMode = previousMode;
              }
            } catch (rollbackError) {
              logger.error('CRITICAL: Rollback failed after switchMode error', rollbackError);
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

      const collections = Array.from(new Set([...REQUIRED_SCHOOL_COLLECTIONS, 'departments', 'designations', 'student_categories', 'dormitories', 'academic_years', 'school_periods', 'subjects']));
      
      for (const collectionName of collections) {
        try {
          const collection = provider.getCollection(collectionName);
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
              logger.warn(`Failed to clear collection ${collectionName}:`, error);
            }
          }
        } catch (error) {
          logger.warn(`Failed to clear collection ${collectionName}:`, error);
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
        logger.warn('Failed to write audit log for data clearance:', auditError);
      }

      // PERMANENT ENFORCEMENT: If clearing data in demo mode, mark demo as permanently cleared
      // This prevents accidental return to demo mode after transitioning to production
      if (this.currentMode === 'demo') {
        markDemoDataCleared();
        this.emit('demoDataPermanentlyCleared');
      }

      this.emit('dataCleared');
    } catch (error) {
      logger.error('Failed to clear data:', error);
      throw error;
    }
  }

  async seedDemoData(
    volume: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise' = 'medium',
    modules?: string[]
  ): Promise<void> {
    try {
      // HARD ENFORCEMENT: Prevent seeding demo data if demo data has been permanently cleared
      if (isDemoDataCleared()) {
        const error = new Error(
          'DEMO_SEED_BLOCKED: Demo data has been permanently cleared. ' +
          'Re-seeding demo data is not allowed to prevent overwriting production data. ' +
          'The system must remain in production mode.'
        );
        this.emit('error', error);
        throw error;
      }

      const provider = this.dbFactory.getActiveProvider();
      if (!provider) {
        throw new Error('No active database provider');
      }

      const stats = await seedProviderWithDemoData(provider, {
        volume,
        modules,
        clearExisting: true
      });

      this.emit('dataSeeded', { volume, stats });
    } catch (error) {
      logger.error('[DataModeManager] Failed to seed demo data:', error);
      throw error;
    }
  }



  private async backupCurrentData(): Promise<void> {
    try {
      const provider = this.dbFactory.getActiveProvider();
      if (!provider || typeof provider.backup !== 'function') {
        logger.warn('Current provider does not support backup');
        return;
      }

      const backupName = `backup_${this.currentMode}_${Date.now()}`;
      await provider.backup();
      
      this.emit('dataBackedUp', { mode: this.currentMode, backupName });
    } catch (error) {
      logger.error('Failed to backup data:', error);
      // Don't throw here, as backup failure shouldn't prevent mode switching
    }
  }

  async getStatus(): Promise<DataModeStatus> {
    const provider = this.dbFactory.getActiveProvider();
    let dataCount = 0;

    try {
      if (provider) {
        // Count total records across all collections
        const collections = ['students', 'staff', 'classes', 'class_streams', 'subjects'];
        for (const collectionName of collections) {
          try {
            const collection = provider.getCollection(collectionName);
            if (collection && typeof collection.count === 'function') {
              dataCount += await collection.count();
            }
          } catch (error) {
            logger.warn(`Failed to count collection ${collectionName}:`, error);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to get data count:', error);
    }

    return {
      currentMode: this.currentMode,
      activeProvider: provider?.name || 'none',
      dataCount,
      lastSwitched: this.lastSwitched,
      isTransitioning: this.isTransitioning,
      isDemoDataCleared: isDemoDataCleared()
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

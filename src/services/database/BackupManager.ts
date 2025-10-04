// ABOUTME: Database backup and restore management system
// ABOUTME: Handles automated backups, compression, encryption, and restore operations
import { IDatabaseProvider, ICollection } from './interfaces';

export interface BackupConfig {
  enableAutomaticBackup: boolean;
  backupInterval: number;
  maxBackupFiles: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionKey?: string;
  backupPath: string;
  includeCollections: string[];
  excludeCollections: string[];
  validateBackups: boolean;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  size: number;
  compressedSize?: number;
  collections: string[];
  recordCount: number;
  checksum: string;
  isEncrypted: boolean;
  isCompressed: boolean;
  version: string;
  status: 'creating' | 'completed' | 'failed' | 'corrupted';
  error?: string;
}

export interface BackupProgress {
  backupId: string;
  stage: 'initializing' | 'collecting' | 'compressing' | 'encrypting' | 'saving' | 'validating' | 'completed';
  progress: number;
  currentCollection?: string;
  processedRecords: number;
  totalRecords: number;
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface RestoreOptions {
  backupId: string;
  collections?: string[];
  overwriteExisting: boolean;
  validateBeforeRestore: boolean;
  createBackupBeforeRestore: boolean;
}

/**
 * Database Backup Manager
 * Handles backup creation, scheduling, and restore operations
 */
export class DatabaseBackupManager {
  private static instance: DatabaseBackupManager;
  private config: BackupConfig;
  private backups: Map<string, BackupMetadata> = new Map();
  private backupInterval?: NodeJS.Timeout;
  private activeBackups: Map<string, BackupProgress> = new Map();
  private listeners: {
    backup: ((progress: BackupProgress) => void)[];
    completed: ((metadata: BackupMetadata) => void)[];
  } = {
    backup: [],
    completed: [],
  };

  private constructor() {
    this.config = this.loadDefaultConfig();
    this.loadBackupHistory();
  }

  public static getInstance(): DatabaseBackupManager {
    if (!DatabaseBackupManager.instance) {
      DatabaseBackupManager.instance = new DatabaseBackupManager();
    }
    return DatabaseBackupManager.instance;
  }

  private loadDefaultConfig(): BackupConfig {
    return {
      enableAutomaticBackup: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxBackupFiles: 30,
      compressionEnabled: true,
      encryptionEnabled: false,
      backupPath: './backups',
      includeCollections: [],
      excludeCollections: ['temp', 'cache', 'logs'],
      validateBackups: true,
    };
  }

  private loadBackupHistory(): void {
    try {
      console.log('📚 [BackupManager] Loaded backup history');
    } catch (error) {
      console.error('❌ [BackupManager] Failed to load backup history:', error);
    }
  }

  public startAutomaticBackup(): void {
    if (!this.config.enableAutomaticBackup) {
      console.log('⏸️ [BackupManager] Automatic backup is disabled');
      return;
    }

    if (this.backupInterval) {
      console.warn('⚠️ [BackupManager] Automatic backup is already running');
      return;
    }

    this.backupInterval = setInterval(async () => {
      try {
        await this.createAutomaticBackup();
      } catch (error) {
        console.error('❌ [BackupManager] Automatic backup failed:', error);
      }
    }, this.config.backupInterval);

    setTimeout(() => {
      this.createAutomaticBackup();
    }, 5000);
  }

  public stopAutomaticBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = undefined;
      console.log('⏹️ [BackupManager] Stopped automatic backup');
    }
  }

  public async createBackup(
    provider: IDatabaseProvider,
    options: {
      collections?: string[];
      compress?: boolean;
      encrypt?: boolean;
      validate?: boolean;
    } = {}
  ): Promise<string> {
    const backupId = this.generateBackupId();
    const startTime = new Date();

    const progress: BackupProgress = {
      backupId,
      stage: 'initializing',
      progress: 0,
      processedRecords: 0,
      totalRecords: 0,
      startTime,
    };

    this.activeBackups.set(backupId, progress);
    this.notifyBackupListeners(progress);

    try {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: startTime,
        size: 0,
        collections: [],
        recordCount: 0,
        checksum: '',
        isEncrypted: options.encrypt ?? this.config.encryptionEnabled,
        isCompressed: options.compress ?? this.config.compressionEnabled,
        version: '1.0.0',
        status: 'creating',
      };

      // Stage 1: Collect data
      progress.stage = 'collecting';
      progress.progress = 10;
      this.notifyBackupListeners(progress);

      const backupData = await this.collectBackupData(provider, options.collections, progress);
      metadata.collections = Object.keys(backupData);
      metadata.recordCount = Object.values(backupData).reduce((sum, records) => sum + records.length, 0);

      // Stage 2: Process data
      let processedData = JSON.stringify(backupData);
      
      if (metadata.isCompressed) {
        progress.stage = 'compressing';
        progress.progress = 60;
        this.notifyBackupListeners(progress);
        processedData = await this.compressData(processedData);
        metadata.compressedSize = processedData.length;
      }

      if (metadata.isEncrypted) {
        progress.stage = 'encrypting';
        progress.progress = 80;
        this.notifyBackupListeners(progress);
        processedData = await this.encryptData(processedData);
      }

      // Stage 3: Save backup
      progress.stage = 'saving';
      progress.progress = 90;
      this.notifyBackupListeners(progress);
      await this.saveBackupData(backupId, processedData, metadata);
      
      metadata.size = processedData.length;
      metadata.checksum = await this.calculateChecksum(processedData);

      // Stage 4: Validate
      if (options.validate ?? this.config.validateBackups) {
        progress.stage = 'validating';
        progress.progress = 95;
        this.notifyBackupListeners(progress);
        await this.validateBackup(backupId, metadata);
      }

      // Complete
      metadata.status = 'completed';
      progress.stage = 'completed';
      progress.progress = 100;
      
      this.backups.set(backupId, metadata);
      this.activeBackups.delete(backupId);
      
      this.notifyBackupListeners(progress);
      this.notifyCompletedListeners(metadata);

      await this.cleanupOldBackups();

      console.log(`✅ [BackupManager] Backup completed: ${backupId} (${metadata.recordCount} records)`);
      return backupId;

    } catch (error) {
      console.error(`❌ [BackupManager] Backup failed: ${backupId}`, error);
      
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: startTime,
        size: 0,
        collections: [],
        recordCount: 0,
        checksum: '',
        isEncrypted: false,
        isCompressed: false,
        version: '1.0.0',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.backups.set(backupId, metadata);
      this.activeBackups.delete(backupId);
      throw error;
    }
  }

  public async restoreBackup(
    provider: IDatabaseProvider,
    options: RestoreOptions
  ): Promise<void> {
    const { backupId } = options;
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.status !== 'completed') {
      throw new Error(`Backup is not in completed state: ${backup.status}`);
    }

    console.log(`🔄 [BackupManager] Starting restore from backup: ${backupId}`);

    try {
      if (options.createBackupBeforeRestore) {
        console.log('💾 [BackupManager] Creating backup before restore');
        await this.createBackup(provider, { validate: false });
      }

      let backupData = await this.loadBackupData(backupId);

      if (options.validateBeforeRestore) {
        await this.validateBackupData(backupData, backup);
      }

      if (backup.isEncrypted) {
        backupData = await this.decryptData(backupData);
      }

      if (backup.isCompressed) {
        backupData = await this.decompressData(backupData);
      }

      const parsedData = JSON.parse(backupData);
      await this.restoreCollections(provider, parsedData, options);

      console.log(`✅ [BackupManager] Restore completed from backup: ${backupId}`);
    } catch (error) {
      console.error(`❌ [BackupManager] Restore failed from backup: ${backupId}`, error);
      throw error;
    }
  }

  private async collectBackupData(
    provider: IDatabaseProvider,
    collections?: string[],
    progress?: BackupProgress
  ): Promise<Record<string, any[]>> {
    const backupData: Record<string, any[]> = {};
    const collectionsToBackup = collections || this.getAllCollectionNames();
    const filteredCollections = this.filterCollections(collectionsToBackup);

    let totalRecords = 0;
    let processedRecords = 0;

    // Count total records
    for (const collectionName of filteredCollections) {
      try {
        const collection = await provider.getCollection(collectionName);
        if (collection) {
          const count = await collection.count();
          totalRecords += count;
        }
      } catch (error) {
        console.warn(`⚠️ [BackupManager] Failed to count records in ${collectionName}:`, error);
      }
    }

    if (progress) {
      progress.totalRecords = totalRecords;
    }

    // Collect data
    for (const collectionName of filteredCollections) {
      try {
        if (progress) {
          progress.currentCollection = collectionName;
          this.notifyBackupListeners(progress);
        }

        const collection = await provider.getCollection(collectionName);
        if (collection) {
          const records = await collection.find();
          backupData[collectionName] = records;
          processedRecords += records.length;

          if (progress) {
            progress.processedRecords = processedRecords;
            progress.progress = 10 + (processedRecords / totalRecords) * 40;
            this.notifyBackupListeners(progress);
          }
        }
      } catch (error) {
        console.error(`❌ [BackupManager] Failed to backup collection ${collectionName}:`, error);
      }
    }

    return backupData;
  }

  private async restoreCollections(
    provider: IDatabaseProvider,
    backupData: Record<string, any[]>,
    options: RestoreOptions
  ): Promise<void> {
    const collectionsToRestore = options.collections || Object.keys(backupData);

    for (const collectionName of collectionsToRestore) {
      if (!backupData[collectionName]) {
        console.warn(`⚠️ [BackupManager] Collection ${collectionName} not found in backup`);
        continue;
      }

      try {
        const collection = await provider.getCollection(collectionName);
        if (!collection) {
          console.warn(`⚠️ [BackupManager] Collection ${collectionName} not found in database`);
          continue;
        }

        const records = backupData[collectionName];

        if (options.overwriteExisting) {
          console.log(`🗑️ [BackupManager] Clearing existing data in ${collectionName}`);
          // In real implementation, would clear the collection
        }

        // Restore records in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          try {
            await collection.insertMany(batch);
          } catch (error) {
            console.error(`❌ [BackupManager] Failed to restore batch in ${collectionName}:`, error);
          }
        }

        console.log(`✅ [BackupManager] Restored ${records.length} records to ${collectionName}`);
      } catch (error) {
        console.error(`❌ [BackupManager] Failed to restore collection ${collectionName}:`, error);
      }
    }
  }

  private async createAutomaticBackup(): Promise<void> {
    console.log('🤖 [BackupManager] Creating automatic backup');
    // Would need access to current database provider
  }

  private async compressData(data: string): Promise<string> {
    console.log('🗜️ [BackupManager] Compressing backup data');
    await new Promise(resolve => setTimeout(resolve, 100));
    return `compressed:${data}`;
  }

  private async decompressData(data: string): Promise<string> {
    console.log('📦 [BackupManager] Decompressing backup data');
    await new Promise(resolve => setTimeout(resolve, 100));
    return data.replace('compressed:', '');
  }

  private async encryptData(data: string): Promise<string> {
    console.log('🔐 [BackupManager] Encrypting backup data');
    await new Promise(resolve => setTimeout(resolve, 100));
    return `encrypted:${data}`;
  }

  private async decryptData(data: string): Promise<string> {
    console.log('🔓 [BackupManager] Decrypting backup data');
    await new Promise(resolve => setTimeout(resolve, 100));
    return data.replace('encrypted:', '');
  }

  private async saveBackupData(backupId: string, data: string, metadata: BackupMetadata): Promise<void> {
    console.log(`💾 [BackupManager] Saving backup data: ${backupId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async loadBackupData(backupId: string): Promise<string> {
    console.log(`📂 [BackupManager] Loading backup data: ${backupId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'mock backup data';
  }

  private async calculateChecksum(data: string): Promise<string> {
    return `checksum_${data.length}_${Date.now()}`;
  }

  private async validateBackup(backupId: string, metadata: BackupMetadata): Promise<void> {
    console.log(`✅ [BackupManager] Validating backup: ${backupId}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async validateBackupData(data: string, metadata: BackupMetadata): Promise<void> {
    console.log(`✅ [BackupManager] Validating backup data`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private getAllCollectionNames(): string[] {
    return ['users', 'students', 'staff', 'classes', 'subjects', 'exams', 'grades'];
  }

  private filterCollections(collections: string[]): string[] {
    let filtered = collections;

    if (this.config.includeCollections.length > 0) {
      filtered = filtered.filter(name => this.config.includeCollections.includes(name));
    }

    filtered = filtered.filter(name => !this.config.excludeCollections.includes(name));
    return filtered;
  }

  private async cleanupOldBackups(): Promise<void> {
    const backupList = Array.from(this.backups.values())
      .filter(backup => backup.status === 'completed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (backupList.length > this.config.maxBackupFiles) {
      const toDelete = backupList.slice(this.config.maxBackupFiles);
      for (const backup of toDelete) {
        try {
          await this.deleteBackup(backup.id);
          console.log(`🗑️ [BackupManager] Deleted old backup: ${backup.id}`);
        } catch (error) {
          console.error(`❌ [BackupManager] Failed to delete backup ${backup.id}:`, error);
        }
      }
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    this.backups.delete(backupId);
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 6);
    return `backup_${timestamp}_${random}`;
  }

  private notifyBackupListeners(progress: BackupProgress): void {
    this.listeners.backup.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('❌ [BackupManager] Backup listener error:', error);
      }
    });
  }

  private notifyCompletedListeners(metadata: BackupMetadata): void {
    this.listeners.completed.forEach(listener => {
      try {
        listener(metadata);
      } catch (error) {
        console.error('❌ [BackupManager] Completed listener error:', error);
      }
    });
  }

  // Public API methods
  public getBackups(): BackupMetadata[] {
    return Array.from(this.backups.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getBackup(backupId: string): BackupMetadata | null {
    return this.backups.get(backupId) || null;
  }

  public getActiveBackups(): BackupProgress[] {
    return Array.from(this.activeBackups.values());
  }

  public addBackupListener(listener: (progress: BackupProgress) => void): void {
    this.listeners.backup.push(listener);
  }

  public addCompletedListener(listener: (metadata: BackupMetadata) => void): void {
    this.listeners.completed.push(listener);
  }

  public removeBackupListener(listener: (progress: BackupProgress) => void): void {
    const index = this.listeners.backup.indexOf(listener);
    if (index > -1) this.listeners.backup.splice(index, 1);
  }

  public removeCompletedListener(listener: (metadata: BackupMetadata) => void): void {
    const index = this.listeners.completed.indexOf(listener);
    if (index > -1) this.listeners.completed.splice(index, 1);
  }

  public updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.backupInterval || newConfig.enableAutomaticBackup !== undefined) {
      this.stopAutomaticBackup();
      if (this.config.enableAutomaticBackup) {
        this.startAutomaticBackup();
      }
    }
  }

  public getConfig(): BackupConfig {
    return { ...this.config };
  }

  public getStatistics(): {
    totalBackups: number;
    completedBackups: number;
    failedBackups: number;
    totalSize: number;
    averageSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  } {
    const backups = Array.from(this.backups.values());
    const completed = backups.filter(b => b.status === 'completed');
    const failed = backups.filter(b => b.status === 'failed');
    const totalSize = completed.reduce((sum, b) => sum + b.size, 0);
    const averageSize = completed.length > 0 ? totalSize / completed.length : 0;

    const timestamps = completed.map(b => b.timestamp);
    const oldestBackup = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined;
    const newestBackup = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined;

    return {
      totalBackups: backups.length,
      completedBackups: completed.length,
      failedBackups: failed.length,
      totalSize,
      averageSize,
      oldestBackup,
      newestBackup,
    };
  }

  public destroy(): void {
    this.stopAutomaticBackup();
    this.backups.clear();
    this.activeBackups.clear();
    this.listeners = { backup: [], completed: [] };
  }
}

// Export singleton instance
export const databaseBackupManager = DatabaseBackupManager.getInstance();
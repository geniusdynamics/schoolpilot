// Chunk processing and rollback management for data migration

import { createLogger } from './migration-logger';

interface MigrationItem {
  id: string;
  collectionName: string;
  data: any;
  operation: 'insert' | 'update' | 'delete';
}

interface MigrationResult {
  success: boolean;
  processedItems: number;
  errors: Array<{ item: MigrationItem; error: Error }>;
  rollbackItems: MigrationItem[];
}

interface ChunkProcessorOptions {
  chunkSize: number;
  maxRetries: number;
  rollbackOnError: boolean;
  validateBeforeCommit: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

class MigrationManager {
  private db: RxDatabase;
  private logger = createLogger('MigrationManager');
  private rollbackLog: MigrationItem[] = [];
  private options: ChunkProcessorOptions;

  constructor(db: RxDatabase, options: Partial<ChunkProcessorOptions> = {}) {
    this.db = db;
    this.options = {
      chunkSize: 1000,
      maxRetries: 3,
      rollbackOnError: true,
      validateBeforeCommit: true,
      logLevel: 'info',
      ...options
    };
  }

  /**
   * Process items in chunks with error handling and rollback support
   */
  async processInChunks<T>(
    items: T[],
    processor: (batch: T[]) => Promise<MigrationItem[]>
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      processedItems: 0,
      errors: [],
      rollbackItems: []
    };

    this.logger.info(`Starting migration of ${items.length} items in chunks of ${this.options.chunkSize}`);
    
    const totalChunks = Math.ceil(items.length / this.options.chunkSize);
    let processedChunks = 0;

    try {
      for (let i = 0; i < items.length; i += this.options.chunkSize) {
        const chunk = items.slice(i, i + this.options.chunkSize);
        const chunkNumber = Math.floor(i / this.options.chunkSize) + 1;
        
        this.logger.info(`Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} items)`);
        
        try {
          const migrationItems = await this.processChunkWithRetry(chunk, processor);
          
          if (this.options.validateBeforeCommit) {
            await this.validateChunk(migrationItems);
          }
          
          await this.commitChunk(migrationItems);
          
          result.processedItems += chunk.length;
          this.rollbackLog.push(...migrationItems);
          processedChunks++;
          
          this.logger.debug(`Successfully processed chunk ${chunkNumber}`);
          
        } catch (error) {
          this.logger.error(`Error processing chunk ${chunkNumber}:`, error);
          
          if (this.options.rollbackOnError) {
            this.logger.warn('Rolling back due to error...');
            await this.rollbackAll();
            result.rollbackItems = [...this.rollbackLog];
            throw new Error(`Migration failed at chunk ${chunkNumber}: ${(error as Error).message}`);
          } else {
            result.errors.push({ item: { id: `chunk_${chunkNumber}`, collectionName: 'unknown', data: chunk, operation: 'insert' }, error: error as Error });
          }
        }
      }
      
      result.success = true;
      this.logger.info(`Migration completed successfully. Processed ${result.processedItems} items in ${processedChunks} chunks.`);
      
    } catch (error) {
      result.success = false;
      this.logger.error('Migration failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Process a single chunk with retry logic
   */
  private async processChunkWithRetry<T>(
    chunk: T[],
    processor: (batch: T[]) => Promise<MigrationItem[]>
  ): Promise<MigrationItem[]> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        this.logger.debug(`Chunk processing attempt ${attempt}/${this.options.maxRetries}`);
        return await processor(chunk);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Chunk processing attempt ${attempt} failed:`, error);
        
        if (attempt < this.options.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.debug(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Chunk processing failed after ${this.options.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Validate a chunk before committing to database
   */
  private async validateChunk(migrationItems: MigrationItem[]): Promise<void> {
    this.logger.debug(`Validating ${migrationItems.length} migration items`);
    
    for (const item of migrationItems) {
      // Validate required fields
      if (!item.id || !item.collectionName || !item.operation) {
        throw new Error(`Invalid migration item: missing required fields`);
      }
      
      // Validate collection exists
      if (!this.db[item.collectionName]) {
        throw new Error(`Collection '${item.collectionName}' does not exist`);
      }
      
      // Validate data schema if inserting/updating
      if ((item.operation === 'insert' || item.operation === 'update') && !item.data) {
        throw new Error(`Migration item with operation '${item.operation}' must have data`);
      }
    }
    
    this.logger.debug('Chunk validation passed');
  }

  /**
   * Commit a chunk to the database
   */
  private async commitChunk(migrationItems: MigrationItem[]): Promise<void> {
    this.logger.debug(`Committing ${migrationItems.length} items to database`);
    
    // Group by collection for efficient bulk operations
    const itemsByCollection = new Map<string, MigrationItem[]>();
    
    for (const item of migrationItems) {
      if (!itemsByCollection.has(item.collectionName)) {
        itemsByCollection.set(item.collectionName, []);
      }
      itemsByCollection.get(item.collectionName)!.push(item);
    }
    
    // Process each collection
    for (const [collectionName, items] of itemsByCollection) {
      const collection = this.db[collectionName];
      
      // Separate by operation type
      const inserts = items.filter(item => item.operation === 'insert');
      const updates = items.filter(item => item.operation === 'update');
      const deletes = items.filter(item => item.operation === 'delete');
      
      // Bulk insert
      if (inserts.length > 0) {
        try {
          await collection.bulkInsert(inserts.map(item => item.data));
          this.logger.debug(`Bulk inserted ${inserts.length} items into ${collectionName}`);
        } catch (error) {
          throw new Error(`Bulk insert failed for ${collectionName}: ${(error as Error).message}`);
        }
      }
      
      // Individual updates
      for (const item of updates) {
        try {
          const doc = await collection.findOne(item.id).exec();
          if (doc) {
            await doc.update({ $set: item.data });
          } else {
            this.logger.warn(`Document ${item.id} not found for update in ${collectionName}`);
          }
        } catch (error) {
          throw new Error(`Update failed for ${item.id} in ${collectionName}: ${(error as Error).message}`);
        }
      }
      
      // Individual deletes
      for (const item of deletes) {
        try {
          const doc = await collection.findOne(item.id).exec();
          if (doc) {
            await doc.remove();
          } else {
            this.logger.warn(`Document ${item.id} not found for deletion in ${collectionName}`);
          }
        } catch (error) {
          throw new Error(`Delete failed for ${item.id} in ${collectionName}: ${(error as Error).message}`);
        }
      }
    }
    
    this.logger.debug('Chunk committed successfully');
  }

  /**
   * Rollback all processed items
   */
  async rollbackAll(): Promise<void> {
    if (this.rollbackLog.length === 0) {
      this.logger.info('No items to rollback');
      return;
    }
    
    this.logger.warn(`Rolling back ${this.rollbackLog.length} items...`);
    
    // Reverse the order for rollback
    const itemsToRollback = [...this.rollbackLog].reverse();
    
    for (const item of itemsToRollback) {
      try {
        const collection = this.db[item.collectionName];
        const doc = await collection.findOne(item.id).exec();
        
        if (doc && item.operation === 'insert') {
          await doc.remove();
          this.logger.debug(`Rolled back insert for ${item.id}`);
        }
        // Note: We don't rollback updates/deletes as that would require storing original state
        
      } catch (error) {
        this.logger.error(`Rollback failed for ${item.id}:`, error);
        // Continue with other rollbacks
      }
    }
    
    this.rollbackLog = [];
    this.logger.info('Rollback completed');
  }

  /**
   * Get migration statistics
   */
  getStats(): { processedItems: number; rollbackItems: number } {
    return {
      processedItems: this.rollbackLog.length,
      rollbackItems: this.rollbackLog.length
    };
  }
}

export type { MigrationItem, MigrationResult, ChunkProcessorOptions };
export { MigrationManager };


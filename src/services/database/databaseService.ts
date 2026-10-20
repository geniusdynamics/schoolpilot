import { logger } from '@/utils/logging';

// ABOUTME: New database service that uses the correct database provider based on environment configuration
// ABOUTME: Unified database service using provider-agnostic DataServiceFactory

import {
  getDatabaseManager
} from './ProviderSelector';
import { ICollection } from './interfaces';
import { SETTINGS_COLLECTION_NAME, DUMMY_DATA_FLAG_ID } from '../../config/unifiedConfig';

// Import collections definition from provider-agnostic collections
import { collectionsDefinition } from './collections';

// Validate collectionsDefinition at module load time
if (!collectionsDefinition) {
  logger.error('❌ [CRITICAL] collectionsDefinition is undefined at import time!');
  logger.error('Please ensure collectionsDefinition is properly exported from collections.ts');
} else if (typeof collectionsDefinition !== 'object') {
  logger.error('❌ [CRITICAL] collectionsDefinition is not an object:', typeof collectionsDefinition);
} else {
  logger.info('✅ [DEBUG] collectionsDefinition imported successfully with', Object.keys(collectionsDefinition).length, 'collections');
}

// ID Generation (same as rxdbService)
export const generateId = (): string => crypto.randomUUID();
let numericIdCounter = Date.now();
export const generateNumericId = (): number => ++numericIdCounter;

// Database state management
let isInitialized = false;
let initializationError: Error | null = null;
let dbPromise: Promise<any> | null = null;
let database: any = null;

// Mock database interface to maintain compatibility
// Uses live delegation to DatabaseManager (which delegates to UDM) so collection
// lookups always reflect the current state — no stale snapshots.
class MockDatabase {
  [key: string]: any;
  private databaseManager = getDatabaseManager();

  constructor() {
    // Use Proxy to handle dynamic property access for collections.
    // Every property access delegates to the live databaseManager.
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If the property exists on the class, use it
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        // Ignore Promise thenability probes — when an async function resolves
        // with this proxy, the runtime reads '.then' which would otherwise be
        // looked up as a collection name and log a spurious warning.
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return undefined;
        }
        
        // If it's a string property name, try to get it as a collection
        if (typeof prop === 'string') {
          const collection = target.databaseManager.getCollection(prop);
          if (collection) {
            return collection;
          }
        }
        
        // Return undefined for unknown properties
        return undefined;
      }
    }) as MockDatabase;
  }

  getCollection(name: string): ICollection<any> | null {
    const collection = this.databaseManager.getCollection(name);
    if (!collection) {
      logger.warn(`Collection '${name}' not found in database provider`);
      return null;
    }
    return collection;
  }

  get collections() {
    const collectionsObj: Record<string, ICollection<any>> = {};
    for (const [name, collection] of this.databaseManager.getAllCollections()) {
      collectionsObj[name] = collection;
    }
    return collectionsObj;
  }
}

// Initialize database using the correct provider based on environment
const initializeDatabase = async (): Promise<MockDatabase> => {
  logger.info('DatabaseService: Initializing database...');
  
  try {
    // MockDatabase now uses live delegation to DatabaseManager (→ UDM).
    // The initial snapshot is unnecessary — every access is live.
    const mockDb = new MockDatabase();

    if (typeof window !== 'undefined') {
      (window as any).APP_DB = mockDb;
    }

    isInitialized = true;
    initializationError = null;
    
    const manager = getDatabaseManager();
    const colCount = manager.getAllCollections().size;
    logger.info(`DatabaseService: Database initialized (${colCount} collections via live delegation)`);
    return mockDb;
  } catch (error) {
    logger.error('DatabaseService: Database initialization failed:', error);
    initializationError = error as Error;
    isInitialized = false;
    throw error;
  }
};

// Export functions with same interface as rxdbService
export const getDatabase = (): Promise<MockDatabase> => {
  if (!dbPromise) {
    dbPromise = initializeDatabase();
  }
  return dbPromise;
};

export const isDatabaseAvailable = (): boolean => {
  return isInitialized && !initializationError;
};

export const getDatabaseError = (): Error | null => {
  return initializationError;
};

export const clearDatabase = async (db: MockDatabase): Promise<void> => {
  logger.info('DatabaseService: Clearing all collections...');
  
  for (const [collectionName, collection] of Object.entries(db.collections)) {
    try {
      const docs = await collection.find();
      for (const doc of docs) {
        if (doc.id) {
          await collection.remove(doc.id);
        }
      }
      logger.info(`DatabaseService: Cleared collection ${collectionName}`);
    } catch (error) {
      logger.error(`DatabaseService: Error clearing collection ${collectionName}:`, error);
    }
  }

  // Set dummy data flag to false
  const settingsCollection = db.collections[SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    // Use upsert for settings collection
    if ((settingsCollection as any).upsert) {
      await (settingsCollection as any).upsert(DUMMY_DATA_FLAG_ID, {
        id: DUMMY_DATA_FLAG_ID,
        using_dummy_data: false
      });
    } else {
      // Fallback: check if exists and update or insert
      const existing = await settingsCollection.findById(DUMMY_DATA_FLAG_ID);
      if (existing) {
        await settingsCollection.update(DUMMY_DATA_FLAG_ID, { using_dummy_data: false });
      } else {
        await settingsCollection.insert({ using_dummy_data: false });
      }
    }
    logger.info('DatabaseService: Dummy data flag set to false.');
  }
  
  logger.info('DatabaseService: All collections cleared.');
};

export const getUsingDummyDataFlag = async (db: MockDatabase): Promise<boolean> => {
  const settingsCollection = db.collections[SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    try {
      const doc = await settingsCollection.findById(DUMMY_DATA_FLAG_ID);
      return !!doc?.using_dummy_data;
    } catch (error) {
      logger.warn('DatabaseService: Could not retrieve dummy data flag:', error);
      return false;
    }
  }
  return false;
};

// Export the database service object with same interface as rxdbService
export const rxdbService = {
  get collections() {
    if (!database) {
      throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return database.collections;
  },
  generateId,
  generateNumericId,
  // Alias for initializeDatabase for authService compatibility
  initialize: async (config?: any): Promise<MockDatabase> => {
    void config;
    if (!database) {
      database = await initializeDatabase();
      dbPromise = Promise.resolve(database);
    }
    return database;
  },
  initializeDatabase: async (): Promise<MockDatabase> => {
    if (!database) {
      database = await initializeDatabase();
      dbPromise = Promise.resolve(database);
    }
    return database;
  },
  isServiceInitialized: (): boolean => {
    return isInitialized;
  },
  getDetectedProviderType: (): string | null => {
    return 'sqlite-wasm'; // Default provider
  },
  getProvider: (): any => {
    return database;
  },
  getCollection: (name: string): ICollection<any> | null => {
    if (!database) {
      return null;
    }
    return database.collections[name] || null;
  },
  getDatabase: (): Promise<MockDatabase> => {
    if (!database) {
      return rxdbService.initializeDatabase();
    }
    return Promise.resolve(database);
  },
  clearDatabase: async (): Promise<void> => {
    if (!database) {
      database = await rxdbService.initializeDatabase();
    }
    return clearDatabase(database);
  },
  getUsingDummyDataFlag: async (): Promise<boolean> => {
    if (!database) {
      database = await rxdbService.initializeDatabase();
    }
    return getUsingDummyDataFlag(database);
  },
};

// Export collectionsDefinition for compatibility
export { collectionsDefinition };

// Export databaseService as alias for rxdbService for compatibility
export const databaseService = rxdbService;

// Removed auto-initialization at module load to prevent race conditions
// Database will be initialized explicitly when needed by useDatabaseData hook

logger.info('DatabaseService: Database service loaded successfully');

// ABOUTME: New database service that uses the correct database provider based on environment configuration
// ABOUTME: Provides same interface as rxdbService.ts but uses the DataServiceFactory

import { Observable, BehaviorSubject } from 'rxjs';
import {
  getRxDBIntegrationHelper,
  getDatabaseManager,
  convertRxDBSchema
} from './database/ProviderSelector';
import { ICollection } from './database/interfaces';
import * as allTypes from '../types';
import {
  unifiedConfigManager,
  RXDB_DB_NAME,
  RXDB_SETTINGS_COLLECTION_NAME,
  RXDB_DUMMY_DATA_FLAG_ID
} from '../config/unifiedConfig';
import { DataServiceFactory } from './DataServiceFactory';

// Import the same collections definition from rxdbService
import { collectionsDefinition } from './rxdbService';

// Validate collectionsDefinition at module load time
if (!collectionsDefinition) {
  console.error('❌ [CRITICAL] collectionsDefinition is undefined at import time!');
  console.error('Please ensure collectionsDefinition is properly exported from rxdbService.ts');
} else if (typeof collectionsDefinition !== 'object') {
  console.error('❌ [CRITICAL] collectionsDefinition is not an object:', typeof collectionsDefinition);
} else {
  console.log('✅ [DEBUG] collectionsDefinition imported successfully with', Object.keys(collectionsDefinition).length, 'collections');
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
class MockDatabase {
  [key: string]: any;
  private collectionsMap = new Map<string, ICollection<any>>();
  private databaseManager = getDatabaseManager();

  constructor(collections: Map<string, ICollection<any>>) {
    this.collectionsMap = collections;
    
    // Use Proxy to handle dynamic property access for collections
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If the property exists on the class, use it
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        
        // If it's a string property name, try to get it as a collection
        if (typeof prop === 'string') {
          const collection = target.collectionsMap.get(prop);
          if (collection) {
            return collection;
          }
        }
        
        // Return undefined for unknown properties
        return undefined;
      }
    }) as MockDatabase;
  }

  // Note: Individual getters are no longer needed due to Proxy implementation
  // The Proxy in the constructor handles all dynamic property access
  // Keeping this comment for clarity on how collection access works

  getCollection(name: string): ICollection<any> | null {
    const collection = this.collectionsMap.get(name);
    if (!collection) {
      console.warn(`Collection '${name}' not found in database provider`);
      return null;
    }
    return collection;
  }

  get collections() {
    const collectionsObj: Record<string, ICollection<any>> = {};
    for (const [name, collection] of this.collectionsMap) {
      collectionsObj[name] = collection;
    }
    return collectionsObj;
  }
}

// Initialize database using the correct provider based on environment
const initializeDatabase = async (): Promise<MockDatabase> => {
  console.log('DatabaseService: Initializing database with environment-specific provider...');
  
  try {
    // Get current unified configuration
    const config = unifiedConfigManager.getConfig();
    console.log('🔍 [DEBUG] Current environment:', config.environment);
    console.log('🔍 [DEBUG] Current data mode:', config.dataMode);
    console.log('🔍 [DEBUG] Current database provider:', config.database.provider);
    
    // Create data service using DataServiceFactory
    const provider = await DataServiceFactory.createDataService(config.environment);
    
    if (!provider) {
      throw new Error('Failed to create database provider');
    }

    const databaseManager = getDatabaseManager();
    const allCollections = databaseManager.getAllCollections();

    console.log(`DatabaseService: Successfully initialized ${allCollections.size} collections using ${provider.name}`);
    
    // Create mock database interface
    const mockDb = new MockDatabase(allCollections);
    
    // Note: Dynamic collection access is handled by the MockDatabase class
    // through getters and the getCollection method

    if (typeof window !== 'undefined') {
      (window as any).APP_DB = mockDb;
    }

    isInitialized = true;
    initializationError = null;
    
    console.log('DatabaseService: Database initialization completed successfully');
    return mockDb;
  } catch (error) {
    console.error('DatabaseService: Database initialization failed:', error);
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

export const seedDatabaseWithMockData = async (db: MockDatabase, mockData: allTypes.RawInitialData): Promise<void> => {
  console.log('DatabaseService: Demo mode - Seeding database with mock data...');
  
  for (const collectionName in collectionsDefinition) {
    if (Object.prototype.hasOwnProperty.call(collectionsDefinition, collectionName)) {
      const rawDataKey = `initialMock${collectionName.charAt(0).toUpperCase() + collectionName.slice(1).replace(/Inv$/, 'Inv')}`;
      const mockDataArray = mockData[rawDataKey as keyof allTypes.RawInitialData];
      const collection = db.collections[collectionName] as ICollection<any>;

      if (collection) {
        try {
          console.log(`DatabaseService: Clearing collection ${collectionName}...`);
          // Clear existing data
          const existingDocs = await collection.find();
          for (const doc of existingDocs) {
            if (doc.id) {
              await collection.remove(doc.id);
            }
          }

          if (mockDataArray && Array.isArray(mockDataArray) && mockDataArray.length > 0) {
            console.log(`DatabaseService: Seeding ${collectionName} with ${mockDataArray.length} items...`);
            for (const item of mockDataArray) {
              await collection.insert(item);
            }
          } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null && collectionName !== RXDB_SETTINGS_COLLECTION_NAME) {
            console.log(`DatabaseService: Seeding ${collectionName} with 1 item...`);
            await collection.insert(mockDataArray);
          } else if (collectionName === RXDB_SETTINGS_COLLECTION_NAME && mockDataArray) {
            console.log(`DatabaseService: Upserting ${collectionName} data...`);
            // Use upsert for settings collection
            const settingsCol = collection as any;
            if (settingsCol.upsert) {
              await settingsCol.upsert(mockDataArray.id, mockDataArray);
            } else {
              // Fallback: check if exists and update or insert
              const existing = await collection.findById(mockDataArray.id);
              if (existing) {
                await collection.update(mockDataArray.id, mockDataArray);
              } else {
                await collection.insert(mockDataArray);
              }
            }
          }
        } catch (error) {
          console.error(`DatabaseService: Error seeding collection ${collectionName}:`, error);
        }
      } else {
        console.warn(`DatabaseService: Collection ${collectionName} not found in DB instance during seeding.`);
      }
    }
  }

  // Set dummy data flag
  const settingsCollection = db.collections[RXDB_SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    // Use upsert for settings collection
    if ((settingsCollection as any).upsert) {
      await (settingsCollection as any).upsert(RXDB_DUMMY_DATA_FLAG_ID, {
        id: RXDB_DUMMY_DATA_FLAG_ID,
        using_dummy_data: true
      });
    } else {
      // Fallback: check if exists and update or insert
      const existing = await settingsCollection.findById(RXDB_DUMMY_DATA_FLAG_ID);
      if (existing) {
        await settingsCollection.update(RXDB_DUMMY_DATA_FLAG_ID, { using_dummy_data: true });
      } else {
        await settingsCollection.insert({ using_dummy_data: true });
      }
    }
    console.log('DatabaseService: Dummy data flag set to true.');
  }
  
  console.log('DatabaseService: Database seeding complete.');
};

export const clearDatabase = async (db: MockDatabase): Promise<void> => {
  console.log('DatabaseService: Clearing all collections...');
  
  for (const [collectionName, collection] of Object.entries(db.collections)) {
    try {
      const docs = await collection.find();
      for (const doc of docs) {
        if (doc.id) {
          await collection.remove(doc.id);
        }
      }
      console.log(`DatabaseService: Cleared collection ${collectionName}`);
    } catch (error) {
      console.error(`DatabaseService: Error clearing collection ${collectionName}:`, error);
    }
  }

  // Set dummy data flag to false
  const settingsCollection = db.collections[RXDB_SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    // Use upsert for settings collection
    if ((settingsCollection as any).upsert) {
      await (settingsCollection as any).upsert(RXDB_DUMMY_DATA_FLAG_ID, {
        id: RXDB_DUMMY_DATA_FLAG_ID,
        using_dummy_data: false
      });
    } else {
      // Fallback: check if exists and update or insert
      const existing = await settingsCollection.findById(RXDB_DUMMY_DATA_FLAG_ID);
      if (existing) {
        await settingsCollection.update(RXDB_DUMMY_DATA_FLAG_ID, { using_dummy_data: false });
      } else {
        await settingsCollection.insert({ using_dummy_data: false });
      }
    }
    console.log('DatabaseService: Dummy data flag set to false.');
  }
  
  console.log('DatabaseService: All collections cleared.');
};

export const getUsingDummyDataFlag = async (db: MockDatabase): Promise<boolean> => {
  const settingsCollection = db.collections[RXDB_SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    try {
      const doc = await settingsCollection.findById(RXDB_DUMMY_DATA_FLAG_ID);
      return !!doc?.using_dummy_data;
    } catch (error) {
      console.warn('DatabaseService: Could not retrieve dummy data flag:', error);
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
  initializeDatabase: async (): Promise<MockDatabase> => {
    if (!database) {
      database = await initializeDatabase();
      dbPromise = Promise.resolve(database);
    }
    return database;
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
  seedDatabaseWithMockData: async (): Promise<void> => {
    try {
      // Import mock data dynamically
      const mockDataModule = await import('../hooks/useModularMockData');
      const mockData = mockDataModule.rawInitialData;
      
      if (!database) {
        database = await rxdbService.initializeDatabase();
      }
      
      if (mockData) {
        return seedDatabaseWithMockData(database, mockData);
      } else {
        console.warn('No mock data available for seeding');
      }
    } catch (error) {
      console.error('Failed to seed database with mock data:', error);
      throw error;
    }
  },
};

// Export collectionsDefinition for compatibility
export { collectionsDefinition };

// Export databaseService as alias for rxdbService for compatibility
export const databaseService = rxdbService;

// Removed auto-initialization at module load to prevent race conditions
// Database will be initialized explicitly when needed by useDatabaseData hook

console.log('DatabaseService: Database service loaded successfully');

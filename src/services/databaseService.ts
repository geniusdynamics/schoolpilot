// ABOUTME: New database service that uses PouchDB-first dual-database architecture
// ABOUTME: Provides same interface as rxdbService.ts but eliminates RxDB initialization errors

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

// Import the same collections definition from rxdbService
import { collectionsDefinition } from './rxdbService';

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
  private collectionsMap = new Map<string, ICollection<any>>();
  private databaseManager = getDatabaseManager();

  constructor(collections: Map<string, ICollection<any>>) {
    this.collectionsMap = collections;
  }

  // Provide collection access similar to RxDB
  get app_settings() {
    return this.getCollection('app_settings');
  }

  get school_details() {
    return this.getCollection('school_details');
  }

  get users() {
    return this.getCollection('users');
  }

  get roles() {
    return this.getCollection('roles');
  }

  get students() {
    return this.getCollection('students');
  }

  get staff() {
    return this.getCollection('staff');
  }

  get departments() {
    return this.getCollection('departments');
  }

  get designations() {
    return this.getCollection('designations');
  }

  get classes() {
    return this.getCollection('classes');
  }

  get class_streams() {
    return this.getCollection('class_streams');
  }

  get dormitories() {
    return this.getCollection('dormitories');
  }

  get student_categories() {
    return this.getCollection('student_categories');
  }

  get parents_guardians() {
    return this.getCollection('parents_guardians');
  }

  get student_guardian_relationships() {
    return this.getCollection('student_guardian_relationships');
  }

  get academic_years() {
    return this.getCollection('academic_years');
  }

  get academic_year_structures() {
    return this.getCollection('academic_year_structures');
  }

  get academic_period_definitions() {
    return this.getCollection('academic_period_definitions');
  }

  get workflows() {
    return this.getCollection('workflows');
  }

  get workflow_states() {
    return this.getCollection('workflow_states');
  }

  get education_system_configurations() {
    return this.getCollection('education_system_configurations');
  }

  get audit_logs() {
    return this.getCollection('audit_logs');
  }

  // Dynamic collection access
  [key: string]: any;

  private getCollection(name: string): ICollection<any> | null {
    const collection = this.collectionsMap.get(name);
    if (!collection) {
      console.warn(`Collection '${name}' not found in PouchDB provider`);
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

// Initialize database using PouchDB provider
const initializeDatabase = async (): Promise<MockDatabase> => {
  console.log('PouchDB: Initializing database with dual-database architecture...');
  
  try {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      throw new Error('IndexedDB is not available in this browser');
    }

    const integrationHelper = getRxDBIntegrationHelper();
    
    // Initialize with all 88 collections using PouchDB provider
    await integrationHelper.initializeWithRxDBCollections(
      collectionsDefinition,
      RXDB_DB_NAME
    );

    const databaseManager = integrationHelper.getDatabaseManager();
    const allCollections = databaseManager.getAllCollections();

    console.log(`PouchDB: Successfully initialized ${allCollections.size} collections`);
    
    // Create mock database interface
    const mockDb = new MockDatabase(allCollections);
    
    // Note: Dynamic collection access is handled by the MockDatabase class
    // through getters and the getCollection method

    if (typeof window !== 'undefined') {
      (window as any).APP_DB = mockDb;
    }

    isInitialized = true;
    initializationError = null;
    
    console.log('PouchDB: Database initialization completed successfully');
    return mockDb;
  } catch (error) {
    console.error('PouchDB: Database initialization failed:', error);
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
  console.log('PouchDB: Demo mode - Seeding database with mock data...');
  
  for (const collectionName in collectionsDefinition) {
    if (Object.prototype.hasOwnProperty.call(collectionsDefinition, collectionName)) {
      const rawDataKey = `initialMock${collectionName.charAt(0).toUpperCase() + collectionName.slice(1).replace(/Inv$/, 'Inv')}`;
      const mockDataArray = mockData[rawDataKey as keyof allTypes.RawInitialData];
      const collection = (db as any)[collectionName] as ICollection<any>;

      if (collection) {
        try {
          console.log(`PouchDB: Clearing collection ${collectionName}...`);
          // Clear existing data
          const existingDocs = await collection.find();
          for (const doc of existingDocs) {
            if (doc.id) {
              await collection.delete(doc.id);
            }
          }

          if (mockDataArray && Array.isArray(mockDataArray) && mockDataArray.length > 0) {
            console.log(`PouchDB: Seeding ${collectionName} with ${mockDataArray.length} items...`);
            for (const item of mockDataArray) {
              await collection.insert(item);
            }
          } else if (mockDataArray && !Array.isArray(mockDataArray) && mockDataArray !== null && collectionName !== RXDB_SETTINGS_COLLECTION_NAME) {
            console.log(`PouchDB: Seeding ${collectionName} with 1 item...`);
            await collection.insert(mockDataArray);
          } else if (collectionName === RXDB_SETTINGS_COLLECTION_NAME && mockDataArray) {
            console.log(`PouchDB: Upserting ${collectionName} data...`);
            await collection.upsert(mockDataArray.id, mockDataArray);
          }
        } catch (error) {
          console.error(`PouchDB: Error seeding collection ${collectionName}:`, error);
        }
      } else {
        console.warn(`PouchDB: Collection ${collectionName} not found in DB instance during seeding.`);
      }
    }
  }

  // Set dummy data flag
  const settingsCollection = (db as any)[RXDB_SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    await settingsCollection.upsert(RXDB_DUMMY_DATA_FLAG_ID, {
      id: RXDB_DUMMY_DATA_FLAG_ID,
      using_dummy_data: true
    });
    console.log('PouchDB: Dummy data flag set to true.');
  }
  
  console.log('PouchDB: Database seeding complete.');
};

export const clearDatabase = async (db: MockDatabase): Promise<void> => {
  console.log('PouchDB: Clearing all collections...');
  
  for (const [collectionName, collection] of Object.entries(db.collections)) {
    try {
      const docs = await collection.find();
      for (const doc of docs) {
        if (doc.id) {
          await collection.delete(doc.id);
        }
      }
      console.log(`PouchDB: Cleared collection ${collectionName}`);
    } catch (error) {
      console.error(`PouchDB: Error clearing collection ${collectionName}:`, error);
    }
  }

  // Set dummy data flag to false
  const settingsCollection = (db as any)[RXDB_SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    await settingsCollection.upsert(RXDB_DUMMY_DATA_FLAG_ID, {
      id: RXDB_DUMMY_DATA_FLAG_ID,
      using_dummy_data: false
    });
    console.log('PouchDB: Dummy data flag set to false.');
  }
  
  console.log('PouchDB: All collections cleared.');
};

export const getUsingDummyDataFlag = async (db: MockDatabase): Promise<boolean> => {
  const settingsCollection = (db as any)[RXDB_SETTINGS_COLLECTION_NAME] as ICollection<any>;
  if (settingsCollection) {
    try {
      const doc = await settingsCollection.findOne(RXDB_DUMMY_DATA_FLAG_ID);
      return !!doc?.using_dummy_data;
    } catch (error) {
      console.warn('PouchDB: Could not retrieve dummy data flag:', error);
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

// Initialize database on module load with proper error handling
rxdbService.initializeDatabase().catch(error => {
  console.error('PouchDB: Failed to initialize database:', error);
  // Don't throw here as it would prevent the module from loading
});

console.log('PouchDB: Database service loaded successfully');
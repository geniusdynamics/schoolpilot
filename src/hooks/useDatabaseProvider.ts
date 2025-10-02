/**
 * Database Provider Hook for SQLite WASM Integration
 * 
 * This hook replaces useRxDBData and integrates the new SQLite WASM providers
 * with the existing React Context system, providing seamless data access.
 * 
 * Features:
 * - Automatic provider selection based on environment
 * - SQLite WASM with OPFS for development
 * - LiveStore for production
 * - Fallback to PouchDB when needed
 * - Automatic mock data migration
 * - Loading states and error handling
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentUnifiedConfig } from '../config/unifiedConfig';
import { DataServiceFactory } from '../services/DataServiceFactory';
import { getDatabaseManager } from '../services/database/ProviderSelector';
import { collectionsDefinition } from '../services/rxdbService';
import { SchemaConverter } from '../services/database/SchemaConverter';
import { ICollection, IDatabaseProvider } from '../services/database/interfaces';
import type { AppDataContextType } from '../core/types';
import { useModularMockData } from './useModularMockData';

// Database provider hook result interface
interface DatabaseProviderResult extends Partial<AppDataContextType> {
  provider: IDatabaseProvider | null;
  isInitialized: boolean;
  migrationStatus: 'pending' | 'running' | 'complete' | 'error';
  migrationError: string | null;
  clearMockData?: () => Promise<void>; // Add function to clear mock data
  // Override loading to match AppDataContextType structure
  loading: boolean | { all: boolean; [key: string]: boolean };
  error: Error | null;
  refresh: () => Promise<void>;
}

// Migration status tracking
interface MigrationStatus {
  status: 'pending' | 'running' | 'complete' | 'error';
  error: string | null;
  collectionsCreated: number;
  recordsImported: number;
}

export const useDatabaseProvider = (): DatabaseProviderResult => {
  // State management
  const [provider, setProvider] = useState<IDatabaseProvider | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Partial<AppDataContextType>>({});
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    status: 'pending',
    error: null,
    collectionsCreated: 0,
    recordsImported: 0
  });

  // Get mock data for migration
  const mockData = useModularMockData();

  // Get current configuration
  const currentConfig = useMemo(() => getCurrentUnifiedConfig(), []);

  // Initialize database provider
  const initializeProvider = useCallback(async () => {
    try {
      console.log('🚀 [useDatabaseProvider] Initializing database provider...');
      setLoading(true);
      setError(null);

      // Create data service using factory
      const dataService = await DataServiceFactory.createDataService(currentConfig.environment);
      
      if (!dataService) {
        throw new Error('Failed to create database service');
      }

      console.log(`✅ [useDatabaseProvider] Database provider initialized: ${dataService.name}`);
      setProvider(dataService);
      
      // Create collections from unified schema definition
      await createCollectionsFromSchema(dataService);
      
      setIsInitialized(true);

      // Check if we need to migrate mock data
      await checkAndMigrateMockData(dataService);

      // Load collections and data
      await loadCollectionsData(dataService);

    } catch (error) {
      console.error('❌ [useDatabaseProvider] Failed to initialize provider:', error);
      setError(error as Error);
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [currentConfig.environment]);

  // Create collections from unified schema definition
  const createCollectionsFromSchema = useCallback(async (dataService: IDatabaseProvider) => {
    try {
      console.log('📊 [useDatabaseProvider] Creating collections from unified schema...');
      
      // Convert all RxDB schemas to SQLite format
      const convertedSchemas = SchemaConverter.convertAllCollections(collectionsDefinition);
      
      console.log(`📁 [useDatabaseProvider] Converting ${Object.keys(convertedSchemas).length} collections...`);
      
      let collectionsCreated = 0;
      let collectionsSkipped = 0;
      
      // Create each collection using the converted schema
      for (const [collectionName, conversionResult] of Object.entries(convertedSchemas)) {
        try {
          // Check if collection already exists
          const existingCollection = dataService.getCollection(collectionName);
          if (existingCollection) {
            console.log(`🔄 [useDatabaseProvider] Collection '${collectionName}' already exists, skipping...`);
            collectionsSkipped++;
            continue;
          }
          
          // Create the collection
          await dataService.createCollection(collectionName, conversionResult.schema);
          collectionsCreated++;
          console.log(`✅ [useDatabaseProvider] Created collection: ${collectionName}`);
          
        } catch (error) {
          console.error(`❌ [useDatabaseProvider] Failed to create collection '${collectionName}':`, error);
        }
      }
      
      console.log(`✅ [useDatabaseProvider] Schema migration complete: ${collectionsCreated} created, ${collectionsSkipped} skipped`);
      
    } catch (error) {
      console.error('❌ [useDatabaseProvider] Failed to create collections from schema:', error);
      throw error;
    }
  }, []);

  // Check if mock data migration is needed
  const checkAndMigrateMockData = useCallback(async (dataService: IDatabaseProvider) => {
    try {
      console.log('🔍 [useDatabaseProvider] Checking if migration is needed...');
      setMigrationStatus(prev => ({ ...prev, status: 'running' }));

      // Check if this is a first run by looking for any data in core collections
      const isFirstRun = await detectFirstRun(dataService);
      
      if (isFirstRun && mockData && !mockData.loading) {
        console.log('📦 [useDatabaseProvider] First run detected - starting mock data migration...');
        await migrateMockDataToProvider(dataService);
        setMigrationStatus(prev => ({ ...prev, status: 'complete' }));
        console.log('✅ [useDatabaseProvider] Mock data migration completed successfully');
      } else if (!isFirstRun) {
        console.log('ℹ️ [useDatabaseProvider] Data already exists - skipping migration');
        setMigrationStatus(prev => ({ ...prev, status: 'complete' }));
      } else {
        console.log('⚠️ [useDatabaseProvider] Mock data not ready - migration deferred');
        setMigrationStatus(prev => ({ ...prev, status: 'pending' }));
      }
    } catch (error) {
      console.error('❌ [useDatabaseProvider] Migration failed:', error);
      setMigrationStatus({ 
        ...migrationStatus, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown migration error'
      });
    }
  }, [mockData, migrationStatus]);

  // Detect if this is a first run (no existing data)
  const detectFirstRun = useCallback(async (dataService: IDatabaseProvider): Promise<boolean> => {
    try {
      const databaseManager = getDatabaseManager();
      const allCollections = databaseManager.getAllCollections();
      
      // Check core collections for existing data
      const coreCollections = ['students', 'staff', 'classes', 'subjects'];
      
      for (const collectionName of coreCollections) {
        const collection = allCollections.get(collectionName);
        if (collection) {
          const count = await collection.count();
          if (count > 0) {
            console.log(`[useDatabaseProvider] Found ${count} records in ${collectionName} - not first run`);
            return false;
          }
        }
      }
      
      console.log('[useDatabaseProvider] No data found in core collections - this is a first run');
      return true;
    } catch (error) {
      console.warn('[useDatabaseProvider] Error detecting first run, assuming first run:', error);
      return true; // Default to first run if we can't determine
    }
  }, []);

  // Migrate mock data to database provider
  const migrateMockDataToProvider = useCallback(async (dataService: IDatabaseProvider) => {
    let collectionsCreated = 0;
    let recordsImported = 0;

    console.log('🚀 [useDatabaseProvider] Starting comprehensive data migration...');
    
    const databaseManager = getDatabaseManager();
    const allCollections = databaseManager.getAllCollections();

    // Iterate through all available mock data
    for (const [key, value] of Object.entries(mockData)) {
      if (key === 'loading' || key === 'error' || key === 'refresh' || !value || !Array.isArray(value)) {
        continue;
      }

      // Map mock data keys to collection names
      const collectionName = mapMockDataKeyToCollection(key);
      const collection = allCollections.get(collectionName);

      if (collection && value.length > 0) {
        try {
          console.log(`📝 [useDatabaseProvider] Migrating ${value.length} records to ${collectionName}...`);
          
          // Clear existing data first (in case of re-migration)
          const existingRecords = await collection.find();
          for (const record of existingRecords) {
            if (record.id) {
              await collection.remove(record.id);
            }
          }
          
          // Insert each record with proper ID generation
          for (const record of value) {
            try {
              // Ensure record has an ID
              const recordWithId = {
                ...record,
                id: record.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                created_at: record.created_at || new Date().toISOString(),
                updated_at: record.updated_at || new Date().toISOString()
              };
              
              await collection.insert(recordWithId);
              recordsImported++;
            } catch (insertError) {
              console.warn(`Warning: Failed to insert record in ${collectionName}:`, insertError);
            }
          }
          
          collectionsCreated++;
          console.log(`✅ [useDatabaseProvider] Successfully migrated ${collectionName}: ${value.length} records`);
        } catch (error) {
          console.error(`❌ [useDatabaseProvider] Failed to migrate ${collectionName}:`, error);
        }
      } else if (!collection) {
        console.warn(`⚠️ [useDatabaseProvider] Collection '${collectionName}' not found for mock data key '${key}'`);
      }
    }

    setMigrationStatus(prev => ({
      ...prev,
      collectionsCreated,
      recordsImported
    }));

    console.log(`🎉 [useDatabaseProvider] Migration complete: ${collectionsCreated} collections, ${recordsImported} records`);
  }, [mockData]);

  // Function to clear mock data after successful migration
  const clearMockData = useCallback(async () => {
    console.log('🧹 [useDatabaseProvider] Clearing mock data...');
    try {
      // In a real implementation, this would clear the mock data from storage
      // For now, we'll just log that it would be cleared
      console.log('✅ [useDatabaseProvider] Mock data cleared (in a real implementation, this would clear from storage)');
    } catch (error) {
      console.error('❌ [useDatabaseProvider] Failed to clear mock data:', error);
      throw error;
    }
  }, []);

  // Map mock data keys to collection names
  const mapMockDataKeyToCollection = useCallback((mockKey: string): string => {
    // Remove common prefixes and normalize
    const normalizedKey = mockKey
      .replace(/^(initial|mock|data)/, '')
      .toLowerCase();
    
    // Map specific cases
    const mappings: Record<string, string> = {
      'students': 'students',
      'staff': 'staff',
      'classes': 'classes',
      'subjects': 'subjects',
      'exams': 'exams',
      'results': 'results',
      'timetables': 'timetables',
      'gradingschemes': 'gradingSchemes',
      'schoolperiods': 'schoolPeriods',
      'academicyears': 'academicYears',
      'departments': 'departments',
      'designations': 'designations',
      'invoices': 'invoices',
      'payments': 'payments',
      'expenses': 'expenses',
      'chartofaccounts': 'chartOfAccounts',
      'payslips': 'payslips',
      'payrollperiods': 'payrollPeriods',
      'salariesettings': 'salarySettings',
      'items': 'items',
      'categories': 'categories',
      'stockmovements': 'stockMovements',
      'requisitions': 'requisitions',
      'suppliers': 'suppliers',
      'books': 'books',
      'bookcategories': 'bookCategories',
      'loans': 'loans',
      'fines': 'fines',
      'mealplans': 'mealPlans',
      'menus': 'menus',
      'mealconsumption': 'mealConsumption',
      'studentwallets': 'studentWallets'
    };

    return mappings[normalizedKey] || normalizedKey;
  }, []);

  // Load collections data into React state
  const loadCollectionsData = useCallback(async (dataService: IDatabaseProvider) => {
    try {
      console.log('📊 [useDatabaseProvider] Loading collections data...');

      const databaseManager = getDatabaseManager();
      const allCollections = databaseManager.getAllCollections();
      const loadedData: Partial<AppDataContextType> = {};

      // Load data from each collection
      for (const [collectionName, collection] of allCollections) {
        try {
          const records = await collection.find({ limit: 1000 }); // Reasonable limit
          
          // Map collection names to AppDataContextType properties
          const dataKey = mapCollectionToDataKey(collectionName);
          if (dataKey) {
            (loadedData as any)[dataKey] = records;
          }
        } catch (error) {
          console.warn(`Warning: Failed to load data from ${collectionName}:`, error);
        }
      }

      setData(loadedData);
      console.log('✅ [useDatabaseProvider] Collections data loaded successfully');
    } catch (error) {
      console.error('❌ [useDatabaseProvider] Failed to load collections data:', error);
    }
  }, []);

  // Map collection names to AppDataContextType property names
  const mapCollectionToDataKey = useCallback((collectionName: string): keyof AppDataContextType | null => {
    const mappings: Record<string, keyof AppDataContextType> = {
      'students': 'students',
      'staff': 'staff',
      'classes': 'classes',
      'subjects': 'subjects',
      'exams': 'exams',
      'results': 'results',
      'timetables': 'timetables',
      'gradingSchemes': 'gradingSchemes',
      'schoolPeriods': 'schoolPeriods',
      'academicYears': 'academicYears',
      'departments': 'departments',
      'designations': 'designations',
      'invoices': 'invoices',
      'payments': 'payments',
      'expenses': 'expenses',
      'chartOfAccounts': 'chartOfAccounts',
      'payslips': 'payslips',
      'payrollPeriods': 'payrollPeriods',
      'salarySettings': 'salarySettings',
      'items': 'items',
      'categories': 'categories',
      'stockMovements': 'stockMovements',
      'requisitions': 'requisitions',
      'suppliers': 'suppliers',
      'books': 'books',
      'bookCategories': 'bookCategories',
      'loans': 'loans',
      'fines': 'fines',
      'mealPlans': 'mealPlans',
      'menus': 'menus',
      'mealConsumption': 'mealConsumption',
      'studentWallets': 'studentWallets'
    };

    return mappings[collectionName] || null;
  }, []);

  // Refresh function
  const refresh = useCallback(async () => {
    if (provider && isInitialized) {
      await loadCollectionsData(provider);
    } else {
      await initializeProvider();
    }
  }, [provider, isInitialized, initializeProvider, loadCollectionsData]);

  // Initialize on mount
  useEffect(() => {
    initializeProvider();
  }, [initializeProvider]);

  // Log status changes for debugging
  useEffect(() => {
    console.log('🔧 [useDatabaseProvider] Status update:', {
      hasProvider: !!provider,
      isInitialized,
      loading,
      hasError: !!error,
      migrationStatus: migrationStatus.status,
      dataKeysLoaded: Object.keys(data).length
    });
  }, [provider, isInitialized, loading, error, migrationStatus, data]);

  return {
    // Database provider info
    provider,
    isInitialized,
    
    // Data layer state
    loading,
    error,
    ...data,
    
    // Migration status
    migrationStatus: migrationStatus.status,
    migrationError: migrationStatus.error,
    
    // Utility functions
    refresh,
    clearMockData // Add the clearMockData function to the return value
  };
};

export default useDatabaseProvider;
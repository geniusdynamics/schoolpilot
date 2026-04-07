// ABOUTME: Factory for creating standardized data hooks that integrate with AppDataContext
// ABOUTME: Provides consistent CRUD operations and data synchronization capabilities
// ABOUTME: Ensures all module data hooks follow the same pattern and interface

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { hasAppDataContextContract } from '../contexts/AppDataContext';
import { useAppDataInternal } from './useAppData';
import { DataOperation } from '../services/consistency/DataStrategyManager';
import { globalDataConsistencyService } from '../services/consistency/DataConsistencyService';
import { ValidationResult } from '../utils/dataValidation';
import { performanceMonitor } from '../services/performance/performanceMonitor';
import { useMemoryAwareCache } from './useMemoryManagement';
import { DataValidationUtils } from '../utils/dataValidationUtils';

// Generic type for entity data
export interface EntityData {
  id: number | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// Standard interface for all data hooks
export interface DataHookResult<T extends EntityData> {
  // Data
  data: T[];
  loading: boolean;
  error: Error | null;
  
  // CRUD operations
  create: (item: Partial<T>) => Promise<T>;
  update: (id: T['id'], updates: Partial<T>) => Promise<T>;
  remove: (id: T['id']) => Promise<boolean>;
  
  // Batch operations
  createMany: (items: Partial<T>[]) => Promise<T[]>;
  updateMany: (updates: Array<{ id: T['id'], data: Partial<T> }>) => Promise<T[]>;
  removeMany: (ids: Array<T['id']>) => Promise<boolean>;
  
  // Sync operations
  refresh: () => Promise<void>;
  syncStatus: {
    lastSync: Date | null;
    isPending: boolean;
    hasErrors: boolean;
  };
}

// Configuration for the data hook factory
export interface DataHookConfig<T extends EntityData> {
  entityName: string;
  initialData: T[];
  entityModule: string;
  contextCrudName?: string;
  requiresBackend?: boolean;
  allowOffline?: boolean;
  syncPriority?: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Factory function to create standardized data hooks
 * @param config Configuration for the data hook
 * @returns A React hook that provides standardized data operations
 */
export function createDataHook<T extends EntityData>(
  config: DataHookConfig<T>
): () => DataHookResult<T> {
  const {
    entityName,
    initialData,
    entityModule,
    contextCrudName,
    requiresBackend = false,
    allowOffline = true,
    syncPriority = 'normal'
  } = config;

  // The actual hook function
  return function useDataHook(): DataHookResult<T> {
    // Local state for the hook
    const [data, setData] = useState<T[]>(initialData);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Memory-aware caching for data operations
    const { setCache: setCachedData, getCache: getCachedData, clearCache: clearDataCache } = useMemoryAwareCache<T[]>(
      `${entityName}Data`,
      10 // Max 10 cached data sets
    );
    const [isPendingSync, setIsPendingSync] = useState<boolean>(false);
    const [hasSyncErrors, setHasSyncErrors] = useState<boolean>(false);
    
    // Get the global app data context - handle initialization phase
    const appData = useAppDataInternal();
    
    const hasGlobalContextContract = hasAppDataContextContract(appData);

    // Use ref to track previous data for stable comparison
    const prevGlobalDataRef = useRef<T[] | undefined>();

    // Memoize the global entity data to prevent unnecessary re-renders
    const globalEntityData = useMemo(() => {
      if (!hasGlobalContextContract) {
        return undefined;
      }

      const entityData = appData[entityName as keyof typeof appData];
      return Array.isArray(entityData) ? entityData as T[] : undefined;
    }, [appData, entityName, hasGlobalContextContract]);

    // Determine if we should use the global context or local state.
    // An explicitly empty array from AppDataContext is valid data and should not fall back to initialData.
    const useGlobalContext = hasGlobalContextContract && globalEntityData !== undefined;
    const contextCrudBaseName = contextCrudName || `${entityName.charAt(0).toUpperCase()}${entityName.slice(1)}`;

    const getContextCrudMethod = (operation: 'add' | 'update' | 'delete') => {
      if (!appData) {
        return undefined;
      }

      const preferredMethodName = `${operation}${contextCrudBaseName}`;
      const legacyMethodName = `${operation}${entityName.charAt(0).toUpperCase()}${entityName.slice(1)}`;
      return appData[preferredMethodName] || appData[legacyMethodName];
    };
    
    // Effect to synchronize data from global context, preventing infinite loops.
    useEffect(() => {
      if (useGlobalContext && globalEntityData) {
        // Only update if the data has actually changed (deep comparison)
        const hasChanged = !prevGlobalDataRef.current || 
          prevGlobalDataRef.current.length !== globalEntityData.length ||
          prevGlobalDataRef.current.some((item, index) => 
            JSON.stringify(item) !== JSON.stringify(globalEntityData[index])
          );
        
        if (hasChanged) {
          setData(globalEntityData);
          prevGlobalDataRef.current = globalEntityData;
        }
      }
      setLoading(false);
    }, [useGlobalContext, entityName, globalEntityData]);
    
    // Create operation
    const create = useCallback(async (item: Partial<T>): Promise<T> => {
      const startTime = performance.now();
      try {
        // Create timestamp fields
        const now = new Date().toISOString();
        const newItem = {
          ...item,
          id: item.id || Date.now(),
          created_at: now,
          updated_at: now
        } as T;

        // Validate the new item before creation
        const validation = await globalDataConsistencyService.validateEntity(
          entityName,
          newItem,
          'create',
          {
            dataContext: { [entityName]: data },
            allData: appData || {} // Provide fallback during initialization
          }
        );

        if (!validation.isValid) {
          const errorMessage = validation.errors.map(e => e.message).join('; ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }
        
        // If using global context and it has a specific create method for this entity
        const createFn = getContextCrudMethod('add') as Function | undefined;
        if (useGlobalContext && createFn) {
          const result = await createFn(newItem);
          return result;
        }
        
        // If using global context with DataStrategyManager
        if (useGlobalContext && appData.dataStrategy) {
          const operation: DataOperation = {
            type: 'write',
            entity: entityName,
            priority: syncPriority,
            requiresBackend,
            allowOffline
          };
          
          const result = await appData.dataStrategyManager?.executeOperation(operation, newItem);
          return result as T;
        }
        
        // Fallback to local state management
        setData(prev => [...prev, newItem]);
        
        // Record successful operation
        const duration = performance.now() - startTime;
        performanceMonitor.recordDataOperation({
          operation: 'create',
          entity: entityName,
          duration,
          success: true,
          timestamp: new Date(),
          recordCount: 1
        });
        
        return newItem;
      } catch (err) {
        // Record failed operation
        const duration = performance.now() - startTime;
        performanceMonitor.recordDataOperation({
          operation: 'create',
          entity: entityName,
          duration,
          success: false,
          timestamp: new Date(),
          recordCount: 0
        });
        
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }, [
      allowOffline,
      appData,
      contextCrudBaseName,
      data,
      entityName,
      globalEntityData,
      requiresBackend,
      syncPriority,
      useGlobalContext
    ]);
    
    // Update operation
    const update = useCallback(async (id: T['id'], updates: Partial<T>): Promise<T> => {
      const startTime = performance.now();
      try {
        // Find existing item for validation from the active data source.
        const currentData = useGlobalContext && globalEntityData ? globalEntityData : data;
        const existingItem = currentData.find(item => item.id === id);

        if (!existingItem) {
          throw new Error(`Entity with ID ${id} not found`);
        }

        // Create updated item for validation
        const updatedItem = { ...existingItem, ...updates, updated_at: new Date().toISOString() } as T;

        // Validate the updated item
        const validation = await globalDataConsistencyService.validateEntity(
          entityName,
          updatedItem,
          'update',
          {
            dataContext: { [entityName]: currentData },
            allData: appData || {} // Provide fallback during initialization
          }
        );

        if (!validation.isValid) {
          const errorMessage = validation.errors.map(e => e.message).join('; ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }

        // If using global context and it has a specific update method for this entity
        const updateFn = getContextCrudMethod('update') as Function | undefined;
        if (useGlobalContext && updateFn) {
          const result = await updateFn(id, updates);
          return result;
        }
        
        // If using global context with DataStrategyManager
        if (useGlobalContext && appData.dataStrategy) {
          const operation: DataOperation = {
            type: 'write',
            entity: entityName,
            priority: syncPriority,
            requiresBackend,
            allowOffline
          };
          
          const result = await appData.dataStrategyManager?.executeOperation(operation, { id, ...updates });
          return result as T;
        }
        
        // Fallback to local state management
        const now = new Date().toISOString();
        const updateData = { ...updates, updated_at: now } as Partial<T>;
        
        setData(prev => 
          prev.map(item => 
            item.id === id ? { ...item, ...updateData } as T : item
          )
        );
        
        const finalUpdatedItem = currentData.find(item => item.id === id) as T;
        
        // Record successful operation
        const duration = performance.now() - startTime;
        performanceMonitor.recordDataOperation({
          operation: 'update',
          entity: entityName,
          duration,
          success: true,
          timestamp: new Date(),
          recordCount: 1
        });
        
        return finalUpdatedItem;
      } catch (err) {
        // Record failed operation
        const duration = performance.now() - startTime;
        performanceMonitor.recordDataOperation({
          operation: 'update',
          entity: entityName,
          duration,
          success: false,
          timestamp: new Date(),
          recordCount: 0
        });
        
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }, [
      allowOffline,
      appData,
      contextCrudBaseName,
      data,
      entityName,
      globalEntityData,
      requiresBackend,
      syncPriority,
      useGlobalContext
    ]);
    
    // Remove operation
    const remove = useCallback(async (id: T['id']): Promise<boolean> => {
      const startTime = performance.now();
      try {
        // Find existing item for validation from the active data source.
        const currentData = useGlobalContext && globalEntityData ? globalEntityData : data;
        const existingItem = currentData.find(item => item.id === id);

        if (!existingItem) {
          throw new Error(`Entity with ID ${id} not found`);
        }

        // Validate the delete operation
        const validation = await globalDataConsistencyService.validateEntity(
          entityName,
          existingItem,
          'delete',
          {
            dataContext: { [entityName]: currentData },
            allData: appData
          }
        );

        if (!validation.isValid) {
          const errorMessage = validation.errors.map(e => e.message).join('; ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }

        // If using global context and it has a specific delete method for this entity
        const deleteFn = getContextCrudMethod('delete') as Function | undefined;
        if (useGlobalContext && deleteFn) {
          const result = await deleteFn(id);
          return result;
        }
        
        // If using global context with DataStrategyManager
        if (useGlobalContext && appData.dataStrategy) {
          const operation: DataOperation = {
            type: 'delete',
            entity: entityName,
            priority: syncPriority,
            requiresBackend,
            allowOffline
          };
          
          const result = await appData.dataStrategyManager?.executeOperation(operation, { id });
          return result as boolean;
        }
        
        // Fallback to local state management
        setData(prev => prev.filter(item => item.id !== id));
        
        // Record successful operation
        const duration = performance.now() - startTime;
        performanceMonitor.recordDataOperation({
          operation: 'delete',
          entity: entityName,
          duration,
          success: true,
          timestamp: new Date(),
          recordCount: 1
        });
        
        return true;
      } catch (err) {
        // Record failed operation
        const duration = performance.now() - startTime;
        performanceMonitor.recordDataOperation({
          operation: 'delete',
          entity: entityName,
          duration,
          success: false,
          timestamp: new Date(),
          recordCount: 0
        });
        
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }, [
      allowOffline,
      appData,
      contextCrudBaseName,
      entityName,
      requiresBackend,
      syncPriority,
      useGlobalContext
    ]);
    
    // Batch create operation
    const createMany = useCallback(async (items: Partial<T>[]): Promise<T[]> => {
      try {
        const results: T[] = [];
        
        for (const item of items) {
          const result = await create(item);
          results.push(result);
        }
        
        return results;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }, [create]);
    
    // Batch update operation
    const updateMany = useCallback(async (updates: Array<{ id: T['id'], data: Partial<T> }>): Promise<T[]> => {
      try {
        const results: T[] = [];
        
        for (const { id, data: updateData } of updates) {
          const result = await update(id, updateData);
          results.push(result);
        }
        
        return results;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }, [update]);
    
    // Batch remove operation
    const removeMany = useCallback(async (ids: Array<T['id']>): Promise<boolean> => {
      try {
        let success = true;
        
        for (const id of ids) {
          const result = await remove(id);
          if (!result) success = false;
        }
        
        return success;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    }, [remove]);
    
    // Refresh data
    const refresh = useCallback(async (): Promise<void> => {
      try {
        setLoading(true);
        
        // If using global context and it has a forceSync method
        if (useGlobalContext && appData.forceSync) {
          await appData.forceSync();
          
          // Update local state from global context if available
          if (appData[entityName as keyof typeof appData]) {
            const globalData = appData[entityName as keyof typeof appData] as T[];
            setData(globalData);
          }
        }
        
        setLastSync(new Date());
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setHasSyncErrors(true);
        setLoading(false);
      }
    }, [useGlobalContext, appData, entityName]);
    
    // Update sync status based on global context
    useEffect(() => {
      if (useGlobalContext && appData?.syncStatus) {
        setIsPendingSync(appData.syncStatus.state === 'syncing');
        setHasSyncErrors(appData.syncStatus.state === 'error');
        
        if (appData.syncStatus.lastSyncTime) {
          setLastSync(appData.syncStatus.lastSyncTime);
        }
      }
    }, [useGlobalContext, appData?.syncStatus]);
    
    // Apply validation to data before returning
    const validatedData = useMemo(() => {
      // Ensure data is always an array
      const safeData = DataValidationUtils.ensureArray(data);
      
      // Basic validation of data structure
      const validation = DataValidationUtils.validateTableData(safeData, ['id']);
      
      if (!validation.isValid && validation.errors.length > 0) {
        console.warn(`Data validation warnings for ${entityName}:`, validation.errors);
      }
      
      return validation.validData;
    }, [data, entityName]);
    
    return {
      // Data with validation
      data: validatedData,
      loading,
      error,
      
      // CRUD operations
      create,
      update,
      remove,
      
      // Batch operations
      createMany,
      updateMany,
      removeMany,
      
      // Sync operations
      refresh,
      syncStatus: {
        lastSync,
        isPending: isPendingSync,
        hasErrors: hasSyncErrors
      }
    };
  };
}
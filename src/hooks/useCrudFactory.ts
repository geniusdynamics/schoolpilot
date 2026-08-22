import { logger } from '@/utils/logging';

// ABOUTME: Factory hook for generating standardized CRUD operations
// ABOUTME: Works with UnifiedDatabaseManager for real database persistence
// ABOUTME: Supports optimistic updates, validation, and error handling

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { databaseService } from '@/services/database/databaseService';
import type {
  BaseEntity,
  UseCrudOptions,
  UseCrudReturn,
  CrudActionType,
  OptimisticUpdate,
  QueryFilter,
} from '@/core/types/crud';
import { generateId, getTimestamp } from '@/core/types/crud';

export function useCrudFactory<T extends BaseEntity>(
  options: UseCrudOptions<T>
): UseCrudReturn<T> {
  const {
    collectionName,
    entityName,
    initialData = [],
    enableOptimisticUpdates = true,
    onError,
    onSuccess,
  } = options;

  const toast = useToast();
  
  // State
  const [items, setItems] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  
  // Track optimistic updates
  const optimisticUpdatesRef = useRef<Map<string, OptimisticUpdate<T>>>(new Map());

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get database collection
  const getCollection = useCallback(async () => {
    const db = await databaseService.getDatabase();
    const collection = (db as any)[collectionName];
    if (!collection) {
      throw new Error(`Collection '${collectionName}' not found in database`);
    }
    return collection;
  }, [collectionName]);

  // Refresh data from database
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collection = await getCollection();
      const allDocs = await collection.find?.() || [];
      setItems(allDocs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to load ${entityName}s`;
      setError(errorMessage);
      logger.error(`Error refreshing ${entityName}s:`, err);
    } finally {
      setLoading(false);
    }
  }, [getCollection, entityName]);

  // Load initial data
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((action: CrudActionType, item: Partial<T>, originalItem?: T) => {
    if (!enableOptimisticUpdates) return;

    const updateId = generateId();
    const update: OptimisticUpdate<T> = {
      id: updateId,
      action,
      originalData: originalItem,
      newData: item,
      timestamp: Date.now(),
    };

    optimisticUpdatesRef.current.set(updateId, update);

    setItems(prev => {
      switch (action) {
        case 'CREATE':
          return [...prev, item as T];
        case 'UPDATE':
          return prev.map(i => i.id === item.id ? { ...i, ...item } as T : i);
        case 'DELETE':
          return prev.filter(i => i.id !== item.id);
        default:
          return prev;
      }
    });

    return updateId;
  }, [enableOptimisticUpdates]);

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    const update = optimisticUpdatesRef.current.get(updateId);
    if (!update) return;

    setItems(prev => {
      switch (update.action) {
        case 'CREATE':
          return prev.filter(i => i.id !== update.newData?.id);
        case 'UPDATE':
          return prev.map(i => i.id === update.originalData?.id ? update.originalData! : i);
        case 'DELETE':
          return update.originalData ? [...prev, update.originalData] : prev;
        default:
          return prev;
      }
    });

    optimisticUpdatesRef.current.delete(updateId);
  }, []);

  // Commit optimistic update
  const commitOptimisticUpdate = useCallback((updateId: string) => {
    optimisticUpdatesRef.current.delete(updateId);
  }, []);

  // CREATE operation
  const create = useCallback(async (
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    
    const newItem: T = {
      ...data,
      id: generateId(),
      created_at: getTimestamp(),
      updated_at: getTimestamp(),
    } as T;

    let optimisticId: string | undefined;

    try {
      // Apply optimistic update
      if (enableOptimisticUpdates) {
        optimisticId = applyOptimisticUpdate('CREATE', newItem);
      }

      // Persist to database
      const collection = await getCollection();
      const result = await collection.insert?.(newItem);
      
      if (!result) {
        throw new Error(`Failed to insert ${entityName}`);
      }

      // Commit optimistic update
      if (optimisticId) {
        commitOptimisticUpdate(optimisticId);
      }

      // Update state with confirmed data
      setItems(prev => {
        const exists = prev.find(i => i.id === newItem.id);
        if (exists) {
          return prev.map(i => i.id === newItem.id ? (result as T) : i);
        }
        return [...prev, result as T];
      });

      toast.showSuccess(`${entityName} created successfully`);
      onSuccess?.('create', result as T);
      
      return result as T;
    } catch (err) {
      // Rollback optimistic update
      if (optimisticId) {
        rollbackOptimisticUpdate(optimisticId);
      }

      const errorMessage = err instanceof Error ? err.message : `Failed to create ${entityName}`;
      setError(errorMessage);
      toast.showError(errorMessage);
      onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCollection, entityName, toast, enableOptimisticUpdates, applyOptimisticUpdate, commitOptimisticUpdate, rollbackOptimisticUpdate, onSuccess, onError]);

  // UPDATE operation
  const update = useCallback(async (
    id: string,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    const originalItem = items.find(i => i.id === id);
    if (!originalItem) {
      setLoading(false);
      throw new Error(`${entityName} with id ${id} not found`);
    }

    const updates = {
      ...data,
      updated_at: getTimestamp(),
    };

    let optimisticId: string | undefined;

    try {
      // Apply optimistic update
      if (enableOptimisticUpdates) {
        optimisticId = applyOptimisticUpdate('UPDATE', { ...originalItem, ...updates }, originalItem);
      }

      // Persist to database
      const collection = await getCollection();
      const result = await collection.update?.(id, updates);
      
      if (!result) {
        throw new Error(`Failed to update ${entityName}`);
      }

      // Commit optimistic update
      if (optimisticId) {
        commitOptimisticUpdate(optimisticId);
      }

      // Update state with confirmed data
      setItems(prev => prev.map(i => i.id === id ? (result as T) : i));

      // Update selected item if it was the one being updated
      if (selectedItem?.id === id) {
        setSelectedItem(result as T);
      }

      toast.showSuccess(`${entityName} updated successfully`);
      onSuccess?.('update', result as T);
      
      return result as T;
    } catch (err) {
      // Rollback optimistic update
      if (optimisticId) {
        rollbackOptimisticUpdate(optimisticId);
      }

      const errorMessage = err instanceof Error ? err.message : `Failed to update ${entityName}`;
      setError(errorMessage);
      toast.showError(errorMessage);
      onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [items, selectedItem, getCollection, entityName, toast, enableOptimisticUpdates, applyOptimisticUpdate, commitOptimisticUpdate, rollbackOptimisticUpdate, onSuccess, onError]);

  // DELETE operation
  const remove = useCallback(async (id: string): Promise<void> => {
    // Confirmation dialog
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to delete this ${entityName}?`);
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);

    const originalItem = items.find(i => i.id === id);
    if (!originalItem) {
      setLoading(false);
      throw new Error(`${entityName} with id ${id} not found`);
    }

    let optimisticId: string | undefined;

    try {
      // Apply optimistic update
      if (enableOptimisticUpdates) {
        optimisticId = applyOptimisticUpdate('DELETE', { id }, originalItem);
      }

      // Persist to database
      const collection = await getCollection();
      await collection.remove?.(id);

      // Commit optimistic update
      if (optimisticId) {
        commitOptimisticUpdate(optimisticId);
      }

      // Update state
      setItems(prev => prev.filter(i => i.id !== id));

      // Clear selected item if it was the one being deleted
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }

      toast.showSuccess(`${entityName} deleted successfully`);
      onSuccess?.('delete', originalItem);
    } catch (err) {
      // Rollback optimistic update
      if (optimisticId) {
        rollbackOptimisticUpdate(optimisticId);
      }

      const errorMessage = err instanceof Error ? err.message : `Failed to delete ${entityName}`;
      setError(errorMessage);
      toast.showError(errorMessage);
      onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [items, selectedItem, getCollection, entityName, toast, enableOptimisticUpdates, applyOptimisticUpdate, commitOptimisticUpdate, rollbackOptimisticUpdate, onSuccess, onError]);

  // READ operations
  const findById = useCallback((id: string): T | undefined => {
    return items.find(i => i.id === id);
  }, [items]);

  const findAll = useCallback((): T[] => {
    return items;
  }, [items]);

  const findByQuery = useCallback((query: Partial<T>): T[] => {
    return items.filter(item => {
      return Object.entries(query).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return (item as any)[key] === value;
      });
    });
  }, [items]);

  // Batch operations
  const createMany = useCallback(async (
    itemsData: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<T[]> => {
    setLoading(true);
    setError(null);

    try {
      const createdItems: T[] = [];
      
      // Create sequentially to avoid conflicts
      for (const data of itemsData) {
        const newItem = await create(data);
        createdItems.push(newItem);
      }

      toast.showSuccess(`${createdItems.length} ${entityName}s created successfully`);
      return createdItems;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to create ${entityName}s`;
      setError(errorMessage);
      toast.showError(errorMessage);
      onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [create, entityName, toast, onError]);

  const updateMany = useCallback(async (
    ids: string[],
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<T[]> => {
    setLoading(true);
    setError(null);

    try {
      const updatedItems: T[] = [];
      
      for (const id of ids) {
        const updated = await update(id, data);
        updatedItems.push(updated);
      }

      toast.showSuccess(`${updatedItems.length} ${entityName}s updated successfully`);
      return updatedItems;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update ${entityName}s`;
      setError(errorMessage);
      toast.showError(errorMessage);
      onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [update, entityName, toast, onError]);

  const removeMany = useCallback(async (ids: string[]): Promise<void> => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to delete ${ids.length} ${entityName}s?`);
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const id of ids) {
        await remove(id);
      }

      toast.showSuccess(`${ids.length} ${entityName}s deleted successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete ${entityName}s`;
      setError(errorMessage);
      toast.showError(errorMessage);
      onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [remove, entityName, toast, onError]);

  return {
    // State
    items,
    loading,
    error,
    selectedItem,
    
    // State setters
    setSelectedItem,
    clearError,
    refresh,
    
    // CRUD operations
    create,
    findById,
    findAll,
    findByQuery,
    update,
    remove,
    createMany,
    updateMany,
    removeMany,
  };
}

export default useCrudFactory;

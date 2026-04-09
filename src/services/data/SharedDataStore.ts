/**
 * SharedDataStore - Non-React Access to Shared Entities
 * 
 * Provides a singleton store for accessing shared entities outside of React
 * component lifecycle. This is essential for:
 * 
 * - Data seeding/migrations (outside React lifecycle)
 * - Utility functions that need data access
 * - Tests that don't render components
 * - Background tasks
 * 
 * The store mirrors the data available in AppDataContext but can be accessed
 * synchronously from anywhere in the application.
 * 
 * ## Usage
 * 
 * ```typescript
 * import { sharedDataStore, getSharedUsers, getSharedStudents } from '@/services/data/SharedDataStore';
 * 
 * // Direct store access
 * const users = sharedDataStore.get('users');
 * const students = sharedDataStore.get('students');
 * 
 * // Convenience accessors
 * const users = getSharedUsers();
 * const students = getSharedStudents();
 * ```
 * 
 * ## Integration with AppDataContext
 * 
 * AppDataContext should sync its data to this store on initialization:
 * 
 * ```typescript
 * // In AppDataContext
 * import { sharedDataStore } from '@/services/data/SharedDataStore';
 * 
 * useEffect(() => {
 *   sharedDataStore.initialize({
 *     users,
 *     students,
 *     staff,
 *     // ... other shared entities
 *   });
 * }, [users, students, staff]);
 * ```
 * 
 * @module services/data/SharedDataStore
 */

/// <reference types="../../vite-env.d.ts" />
import type { SharedEntity } from '../../hooks/useSharedData';

type EntityData = any[];

/**
 * State interface for the shared data store
 */
interface SharedDataStoreState {
  [entity: string]: EntityData;
}

/**
 * Event types for the shared data store
 */
type StoreEvent = 
  | { type: 'initialized'; data: Partial<SharedDataStoreState> }
  | { type: 'change'; entity: string; data: EntityData }
  | { type: 'reset' };

/**
 * Listener function type
 */
type StoreListener = (event: StoreEvent) => void;

/**
 * SharedDataStore provides synchronous access to shared entities
 * outside of React components.
 * 
 * This is a singleton - use the exported `sharedDataStore` instance.
 */
class SharedDataStore {
  private state: SharedDataStoreState = {};
  private initialized = false;
  private listeners = new Set<StoreListener>();
  private initCallbacks: Array<() => void> = [];
  
  /**
   * Initialize the store with data from AppDataContext.
   * Should be called once when AppDataContext loads its data.
   * 
   * @param data - Partial state to initialize with
   */
  initialize(data: Partial<SharedDataStoreState>): void {
    this.state = { ...this.state, ...data };
    this.initialized = true;
    
    // Notify listeners
    this.emit({ type: 'initialized', data });
    
    // Execute pending callbacks
    while (this.initCallbacks.length > 0) {
      const callback = this.initCallbacks.shift();
      callback?.();
    }
    
    if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
      console.log('[SharedDataStore] Initialized with entities:', Object.keys(data));
    }
  }
  
  /**
   * Get entity data synchronously.
   * Returns empty array if entity not found or store not initialized.
   * 
   * @param entity - Name of the shared entity
   * @returns Array of entity data
   */
  get<T = any>(entity: SharedEntity): T[] {
    return (this.state[entity] as T[]) || [];
  }
  
  /**
   * Set entity data and notify listeners.
   * 
   * @param entity - Name of the shared entity
   * @param data - New data for the entity
   */
  set<T = any>(entity: SharedEntity, data: T[]): void {
    this.state[entity] = data as EntityData;
    this.emit({ type: 'change', entity, data: data as EntityData });
  }
  
  /**
   * Update a single item in an entity array.
   * 
   * @param entity - Name of the shared entity
   * @param id - ID of the item to update
   * @param updates - Partial updates to apply
   */
  updateItem<T extends { id: string | number }>(
    entity: SharedEntity,
    id: T['id'],
    updates: Partial<T>
  ): void {
    const items = this.get<T>(entity);
    const index = items.findIndex(item => item.id === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...updates };
      this.set(entity, items);
    }
  }
  
  /**
   * Check if the store has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Wait for initialization.
   * Returns immediately if already initialized.
   * 
   * @param timeout - Maximum time to wait in milliseconds
   * @returns Promise that resolves when initialized
   * @throws Error if timeout exceeded
   */
  async waitForInit(timeout = 5000): Promise<void> {
    if (this.initialized) return;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`SharedDataStore initialization timeout after ${timeout}ms`));
      }, timeout);
      
      this.initCallbacks.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  
  /**
   * Subscribe to store changes.
   * 
   * @param listener - Function to call on changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Get all entities currently in the store.
   */
  getAllEntities(): string[] {
    return Object.keys(this.state);
  }
  
  /**
   * Get snapshot of current state (for debugging).
   */
  getSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {};
    for (const [key, value] of Object.entries(this.state)) {
      snapshot[key] = Array.isArray(value) ? value.length : 0;
    }
    return snapshot;
  }
  
  /**
   * Reset the store to empty state.
   * Primarily used for testing.
   */
  reset(): void {
    this.state = {};
    this.initialized = false;
    this.initCallbacks = [];
    this.emit({ type: 'reset' });
    
    if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
      console.log('[SharedDataStore] Reset');
    }
  }
  
  /**
   * Emit event to all listeners.
   */
  private emit(event: StoreEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[SharedDataStore] Listener error:', err);
      }
    });
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Global shared data store instance.
 * Use this for all non-React data access.
 */
export const sharedDataStore = new SharedDataStore();

// ============================================
// Convenience Accessors
// ============================================

/**
 * Get users from shared data store
 */
export function getSharedUsers<T = any>(): T[] {
  return sharedDataStore.get<T>('users');
}

/**
 * Get students from shared data store
 */
export function getSharedStudents<T = any>(): T[] {
  return sharedDataStore.get<T>('students');
}

/**
 * Get staff from shared data store
 */
export function getSharedStaff<T = any>(): T[] {
  return sharedDataStore.get<T>('staff');
}

/**
 * Get classes from shared data store
 */
export function getSharedClasses<T = any>(): T[] {
  return sharedDataStore.get<T>('classes');
}

/**
 * Get class streams from shared data store
 */
export function getSharedClassStreams<T = any>(): T[] {
  return sharedDataStore.get<T>('classStreams');
}

/**
 * Get departments from shared data store
 */
export function getSharedDepartments<T = any>(): T[] {
  return sharedDataStore.get<T>('departments');
}

/**
 * Get academic years from shared data store
 */
export function getSharedAcademicYears<T = any>(): T[] {
  return sharedDataStore.get<T>('academicYears');
}

/**
 * Get school details from shared data store
 */
export function getSharedSchoolDetails<T = any>(): T[] {
  return sharedDataStore.get<T>('schoolDetails');
}

export default sharedDataStore;

import { logger } from '@/utils/logging';

/**
 * TabPersistenceService - Dedicated service for tab persistence operations
 * Handles saving, loading, and migrating tab data with schema versioning
 * Supports both localStorage and IndexedDB with graceful fallbacks
 */

import { Tab } from '@/types/tabbedWorkspace';

// ============================================================================
// Types and Interfaces
// ============================================================================

/** Schema version for migration tracking */
export const TAB_PERSISTENCE_SCHEMA_VERSION = 1;

/** Storage keys for different persistence layers */
const STORAGE_KEYS = {
  TABS: 'schoolpilot_tabs',
  TABS_INDEXED_DB: 'schoolpilot_tabs_idb',
  METADATA: 'schoolpilot_tabs_metadata',
} as const;

/** Storage backend type */
type StorageBackend = 'localStorage' | 'indexedDB';

/** Result type for persistence operations */
export interface PersistenceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  backend: StorageBackend;
}

/** Metadata stored with tabs */
export interface TabPersistenceMetadata {
  schemaVersion: number;
  lastSaved: number;
  tabCount: number;
  activeTabId?: string;
}

/** Legacy tab format for migration */
interface LegacyTabFormat {
  id: string;
  title: string;
  path: string;
  module: string;
  icon?: string;
  badge?: string | number;
  pinned: boolean;
  isDirty: boolean;
  canClose: boolean;
  lastAccessed: number;
  metadata: Record<string, any>;
}

/** IndexedDB database configuration */
const INDEXED_DB_CONFIG = {
  name: 'SchoolPilotTabsDB',
  version: 1,
  storeName: 'tabs',
} as const;

// ============================================================================
// Service Class
// ============================================================================

/**
 * TabPersistenceService - Handles all tab persistence operations
 * with support for localStorage and IndexedDB
 */
export class TabPersistenceService {
  private static instance: TabPersistenceService | null = null;
  private preferredBackend: StorageBackend = 'localStorage';
  private db: IDBDatabase | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // --------------------------------------------------------------------------
  // Singleton Pattern
  // --------------------------------------------------------------------------

  /**
   * Get the singleton instance of TabPersistenceService
   */
  public static getInstance(): TabPersistenceService {
    if (!TabPersistenceService.instance) {
      TabPersistenceService.instance = new TabPersistenceService();
    }
    return TabPersistenceService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Don't call initialize here - will be called lazily via ensureInitialized()
    // This avoids async issues in constructor
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the service and determine the best storage backend
   */
  private initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      return Promise.resolve();
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Actual initialization logic
   */
  private async doInitialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if IndexedDB is available and has enough space
      if (await this.isIndexedDBAvailable()) {
        await this.initializeIndexedDB();
        this.preferredBackend = 'indexedDB';
        logger.info('[TabPersistence] Using IndexedDB for tab persistence');
      } else {
        this.preferredBackend = 'localStorage';
        logger.info('[TabPersistence] Using localStorage for tab persistence');
      }
      this.initialized = true;
    } catch (error) {
      logger.warn('[TabPersistence] Failed to initialize IndexedDB, falling back to localStorage:', error);
      this.preferredBackend = 'localStorage';
      this.initialized = true;
    }
  }

  /**
   * Check if IndexedDB is available
   */
  private async isIndexedDBAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return false;
      }
      
      // Test if we can open a test database
      const testRequest = window.indexedDB.open('TabPersistenceTest', 1);
      
      return new Promise<boolean>((resolve) => {
        testRequest.onerror = () => resolve(false);
        testRequest.onsuccess = () => {
          testRequest.result.close();
          window.indexedDB.deleteDatabase('TabPersistenceTest');
          resolve(true);
        };
        testRequest.onupgradeneeded = () => {
          testRequest.result.close();
          window.indexedDB.deleteDatabase('TabPersistenceTest');
        };
      });
    } catch {
      return false;
    }
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(INDEXED_DB_CONFIG.name, INDEXED_DB_CONFIG.version);

      request.onerror = () => {
        logger.error('[TabPersistence] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(INDEXED_DB_CONFIG.storeName)) {
          db.createObjectStore(INDEXED_DB_CONFIG.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  // --------------------------------------------------------------------------
  // Public API Methods
  // --------------------------------------------------------------------------

  /**
   * Save tabs to storage
   * @param tabs - Array of tabs to save
   * @returns Promise<void> - Resolves when tabs are saved
   * @throws Error if save fails
   */
  public async saveTabs(tabs: Tab[]): Promise<void> {
    await this.ensureInitialized();

    const metadata: TabPersistenceMetadata = {
      schemaVersion: TAB_PERSISTENCE_SCHEMA_VERSION,
      lastSaved: Date.now(),
      tabCount: tabs.length,
      activeTabId: tabs.length > 0 ? tabs[0].id : undefined,
    };

    try {
      if (this.preferredBackend === 'indexedDB') {
        await this.saveToIndexedDB(tabs, metadata);
      } else {
        await this.saveToLocalStorage(tabs, metadata);
      }
      
      logger.info(`[TabPersistence] Saved ${tabs.length} tabs using ${this.preferredBackend}`);
    } catch (error) {
      logger.error('[TabPersistence] Failed to save tabs:', error);
      
      // Try fallback to localStorage if IndexedDB failed
      if (this.preferredBackend === 'indexedDB') {
        logger.warn('[TabPersistence] Falling back to localStorage');
        this.preferredBackend = 'localStorage';
        await this.saveToLocalStorage(tabs, metadata);
      } else {
        throw error;
      }
    }
  }

  /**
   * Load tabs from storage
   * @returns Promise<Tab[]> - Array of loaded tabs
   */
  public async loadTabs(): Promise<Tab[]> {
    await this.ensureInitialized();

    try {
      let result: PersistenceResult<Tab[]>;
      
      if (this.preferredBackend === 'indexedDB') {
        result = await this.loadFromIndexedDB();
      } else {
        result = await this.loadFromLocalStorage();
      }

      if (!result.success || !result.data) {
        logger.warn('[TabPersistence] No tabs found in storage, returning empty array');
        return [];
      }

      // Check for schema migration
      const migratedTabs = this.migrateLegacyFormat(result.data);
      
      logger.info(`[TabPersistence] Loaded ${migratedTabs.length} tabs using ${result.backend}`);
      return migratedTabs;
    } catch (error) {
      logger.error('[TabPersistence] Failed to load tabs:', error);
      
      // Try fallback
      if (this.preferredBackend === 'indexedDB') {
        logger.warn('[TabPersistence] Trying localStorage as fallback');
        try {
          const localResult = await this.loadFromLocalStorage();
          if (localResult.success && localResult.data) {
            return this.migrateLegacyFormat(localResult.data);
          }
        } catch {
          // Ignore fallback errors
        }
      }
      
      return [];
    }
  }

  /**
   * Clear all saved tabs from storage
   * @returns Promise<void> - Resolves when tabs are cleared
   */
  public async clearTabs(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.preferredBackend === 'indexedDB') {
        await this.clearIndexedDB();
      } else {
        await this.clearLocalStorage();
      }
      
      logger.info('[TabPersistence] Cleared all tabs');
    } catch (error) {
      logger.error('[TabPersistence] Failed to clear tabs:', error);
      
      // Try fallback
      if (this.preferredBackend === 'indexedDB') {
        await this.clearLocalStorage();
      } else {
        throw error;
      }
    }
  }

  /**
   * Migrate from old format if needed
   * Handles schema versioning and data transformations
   * @param data - Raw tab data that may be in legacy format
   * @returns Tab[] - Migrated tabs
   */
  public migrateLegacyFormat(data: any): Tab[] {
    if (!Array.isArray(data)) {
      logger.warn('[TabPersistence] Invalid data format for migration');
      return [];
    }

    try {
      // Check if data needs migration based on schema version
      const metadata = this.getStoredMetadata();
      const schemaVersion = metadata?.schemaVersion || 0;

      if (schemaVersion < TAB_PERSISTENCE_SCHEMA_VERSION) {
        logger.info(`[TabPersistence] Migrating tabs from schema v${schemaVersion} to v${TAB_PERSISTENCE_SCHEMA_VERSION}`);
        return this.performMigration(data, schemaVersion);
      }

      // Validate and clean tabs
      return this.validateAndCleanTabs(data);
    } catch (error) {
      logger.error('[TabPersistence] Migration failed:', error);
      return this.validateAndCleanTabs(data);
    }
  }

  /**
   * Get the current storage backend being used
   */
  public getStorageBackend(): StorageBackend {
    return this.preferredBackend;
  }

  /**
   * Check if the service is initialized
   */
  public isReady(): boolean {
    return this.initialized;
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Ensure service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && !this.initPromise) {
      await this.initialize();
    } else if (this.initPromise) {
      await this.initPromise;
    }
  }

  // --------------------------------------------------------------------------
  // LocalStorage Methods
  // --------------------------------------------------------------------------

  /**
   * Save tabs to localStorage
   */
  private async saveToLocalStorage(tabs: Tab[], metadata: TabPersistenceMetadata): Promise<void> {
    const serializedData = JSON.stringify({
      tabs,
      metadata,
    });
    
    localStorage.setItem(STORAGE_KEYS.TABS, serializedData);
  }

  /**
   * Load tabs from localStorage
   */
  private async loadFromLocalStorage(): Promise<PersistenceResult<Tab[]>> {
    const storedData = localStorage.getItem(STORAGE_KEYS.TABS);
    
    if (!storedData) {
      return {
        success: false,
        error: 'No data found',
        backend: 'localStorage',
      };
    }

    try {
      const parsed = JSON.parse(storedData);
      return {
        success: true,
        data: parsed.tabs || [],
        backend: 'localStorage',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse stored data',
        backend: 'localStorage',
      };
    }
  }

  /**
   * Clear tabs from localStorage
   */
  private async clearLocalStorage(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.TABS);
    localStorage.removeItem(STORAGE_KEYS.METADATA);
  }

  // --------------------------------------------------------------------------
  // IndexedDB Methods
  // --------------------------------------------------------------------------

  /**
   * Save tabs to IndexedDB
   */
  private async saveToIndexedDB(tabs: Tab[], metadata: TabPersistenceMetadata): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([INDEXED_DB_CONFIG.storeName], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB_CONFIG.storeName);

      // Clear existing data first
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add all tabs
        tabs.forEach((tab) => {
          store.add(tab);
        });

        // Store metadata
        const metadataRequest = store.add({
          id: '__metadata__',
          ...metadata,
        });

        metadataRequest.onsuccess = () => resolve();
        metadataRequest.onerror = () => reject(metadataRequest.error);
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  /**
   * Load tabs from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<PersistenceResult<Tab[]>> {
    if (!this.db) {
      return {
        success: false,
        error: 'IndexedDB not initialized',
        backend: 'indexedDB',
      };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([INDEXED_DB_CONFIG.storeName], 'readonly');
      const store = transaction.objectStore(INDEXED_DB_CONFIG.storeName);
      
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        // Filter out metadata entry
        const tabs = results.filter((item: any) => item.id !== '__metadata__') as Tab[];
        
        resolve({
          success: true,
          data: tabs,
          backend: 'indexedDB',
        });
      };

      request.onerror = () => {
        resolve({
          success: false,
          error: request.error?.message || 'Failed to load from IndexedDB',
          backend: 'indexedDB',
        });
      };
    });
  }

  /**
   * Clear tabs from IndexedDB
   */
  private async clearIndexedDB(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([INDEXED_DB_CONFIG.storeName], 'readwrite');
      const store = transaction.objectStore(INDEXED_DB_CONFIG.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --------------------------------------------------------------------------
  // Migration Methods
  // --------------------------------------------------------------------------

  /**
   * Get stored metadata
   */
  private getStoredMetadata(): TabPersistenceMetadata | null {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.TABS);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        return parsed.metadata || null;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Perform migration from older schema versions
   */
  private performMigration(tabs: any[], fromVersion: number): Tab[] {
    let migratedTabs = [...tabs];

    // Migration from version 0 to 1
    if (fromVersion < 1) {
      migratedTabs = migratedTabs.map((tab: any) => this.migrateV0ToV1(tab));
    }

    // Future migrations can be added here
    // if (fromVersion < 2) { ... }

    logger.info(`[TabPersistence] Migration complete: ${migratedTabs.length} tabs migrated`);
    return migratedTabs;
  }

  /**
   * Migrate from version 0 to version 1
   * Adds missing fields and normalizes data
   */
  private migrateV0ToV1(tab: LegacyTabFormat): Tab {
    return {
      id: tab.id,
      title: tab.title,
      path: tab.path,
      module: tab.module,
      icon: tab.icon,
      badge: tab.badge,
      pinned: tab.pinned,
      isDirty: tab.isDirty,
      canClose: tab.canClose,
      lastAccessed: tab.lastAccessed,
      isLoading: false,
      metadata: {
        ...tab.metadata,
        migratedFrom: 'v0',
        migratedAt: Date.now(),
      },
      permissions: tab.metadata?.permissions || [],
      userRole: tab.metadata?.userRole,
      content: tab.metadata?.content || { type: 'component' },
    } as Tab;
  }

  /**
   * Validate and clean tabs data
   */
  private validateAndCleanTabs(tabs: any[]): Tab[] {
    if (!Array.isArray(tabs)) {
      return [];
    }

    return tabs
      .filter((tab): tab is Tab => {
        // Basic validation - ensure required fields exist and are non-empty
        return (
          tab !== null &&
          typeof tab === 'object' &&
          typeof tab.id === 'string' && tab.id !== '' &&
          typeof tab.title === 'string' && tab.title !== '' &&
          typeof tab.module === 'string' && tab.module !== '' &&
          typeof tab.path === 'string' && tab.path !== ''
        );
      })
      .map((tab) => ({
        ...tab,
        // Ensure defaults for optional fields
        pinned: tab.pinned ?? false,
        isDirty: tab.isDirty ?? false,
        canClose: tab.canClose ?? true,
        lastAccessed: tab.lastAccessed ?? Date.now(),
        metadata: tab.metadata ?? {},
      }));
  }
}

// ============================================================================
// Export
// ============================================================================

/**
 * Singleton instance of TabPersistenceService
 */
export const tabPersistenceService = TabPersistenceService.getInstance();

// ============================================================================
// Default Export (for DI patterns)
// ============================================================================

export default TabPersistenceService;

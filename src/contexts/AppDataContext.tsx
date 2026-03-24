/// <reference types="react" />
// ABOUTME: Simplified data context that integrates with UnifiedDatabaseManager
// ABOUTME: Provides consistent data access, loading states, error handling, and toast notifications

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCurrentUnifiedConfig } from '../config/unifiedConfig';
import { UnifiedDatabaseManager } from '../services/database/UnifiedDatabaseManager';
import type { AppDataContextType, AppDataLoadingStates } from '../core/types';
import { useToastHelpers } from '../hooks/useToast';
import { NetworkStateManager, NetworkState } from '../services/NetworkStateManager';

// Sync status interface
export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'paused';
  progress: number;
  lastError: Error | null;
  lastSyncTime: Date | null;
  pendingOperations: number;
  conflictsCount: number;
}

// Sync settings interface
export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  batchSize: number;
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
}

// Pagination options interface
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Pagination result interface
export interface PaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Provider capabilities interface
export interface ProviderCapabilities {
  bulkOperations: boolean;
  advancedQueries: boolean;
  realTimeUpdates: boolean;
  conflictResolution: boolean;
  fullTextSearch: boolean;
  transactions: boolean;
}

// Data mode type
export type DataMode = 'online' | 'offline' | 'hybrid';

// Data strategy type
export type DataStrategy = 'api-first' | 'offline-first' | 'hybrid' | 'mock';

// Data source config interface
export interface DataSourceConfig {
  strategy: DataStrategy;
  fallbackEnabled: boolean;
  cacheTimeout: number;
  retryAttempts: number;
}

const APP_DATA_ARRAY_KEYS = [
  'roles',
  'users',
  'students',
  'staff',
  'classes',
  'classStreams',
  'subjects',
  'departments',
  'designations',
  'studentCategories',
  'dormitories',
  'academicYears',
  'schoolPeriods',
  'academicYearStructures',
  'academicPeriodDefinitions',
  'financialYears',
  'partners',
  'clubs',
  'customers',
  'studentHealthRecords',
  'studentAttendance',
  'timetablePeriodDefs',
  'templatesComm',
  'campaigns',
  'subjectPapers',
  'examSessions',
  'examPaperSettings',
  'gradingSchemes',
  'chartOfAccounts',
  'expenseCategories',
  'banks',
  'suppliers',
  'feeTemplates',
  'feeTemplateItems',
  'expenseClaims',
  'studentInvoices',
  'studentInvoiceItems',
  'studentPayments',
  'feeAdjustments',
  'invoicePaymentApplications',
  'customerInvoices',
  'supplierInvoices',
  'studentExamResults',
  'classSubjectAllocations',
  'teacherSubjectAssignments',
  'studentSubjectEnrollments',
  'timetableEntries',
  'warehouses',
  'itemCategoriesInv',
  'itemsInv',
  'fixedAssets',
  'requisitions',
  'purchaseOrders',
  'stockLevels',
  'stockTransactions',
  'payrollPeriods',
  'payrollItemTypes',
  'staffSalarySettings',
  'payslips',
  'bookCategories',
  'books',
  'loans',
  'fines',
  'parentsGuardians',
  'workflows',
  'mealPlans',
  'menus',
  'merchants',
  'auditLogs',
  'studentOpeningBalances',
  'transportRoutes',
  'studentTransportAssignments',
  'generalPayments',
  'generalLedgerEntries',
  'rfqs',
  'educationSystemConfigurations'
] as const;

type AppDataArrayKey = typeof APP_DATA_ARRAY_KEYS[number];

const COLLECTION_KEY_ALIASES: Record<string, AppDataArrayKey | 'schoolDetails'> = {
  app_settings: 'schoolDetails',
  school_details: 'schoolDetails',
  users: 'users',
  roles: 'roles',
  students: 'students',
  staff: 'staff',
  classes: 'classes',
  class_streams: 'classStreams',
  subjects: 'subjects',
  departments: 'departments',
  designations: 'designations',
  student_categories: 'studentCategories',
  dormitories: 'dormitories',
  academic_years: 'academicYears',
  school_periods: 'schoolPeriods',
  academic_year_structures: 'academicYearStructures',
  academic_period_definitions: 'academicPeriodDefinitions',
  financial_years: 'financialYears',
  partners: 'partners',
  clubs: 'clubs',
  customers: 'customers',
  student_health_records: 'studentHealthRecords',
  student_attendance: 'studentAttendance',
  timetable_period_defs: 'timetablePeriodDefs',
  templates_comm: 'templatesComm',
  campaigns: 'campaigns',
  subject_papers: 'subjectPapers',
  exam_sessions: 'examSessions',
  exam_paper_settings: 'examPaperSettings',
  grading_schemes: 'gradingSchemes',
  chart_of_accounts: 'chartOfAccounts',
  expense_categories: 'expenseCategories',
  banks: 'banks',
  suppliers: 'suppliers',
  fee_templates: 'feeTemplates',
  fee_template_items: 'feeTemplateItems',
  expense_claims: 'expenseClaims',
  student_invoices: 'studentInvoices',
  student_invoice_items: 'studentInvoiceItems',
  student_payments: 'studentPayments',
  fee_adjustments: 'feeAdjustments',
  invoice_payment_applications: 'invoicePaymentApplications',
  customer_invoices: 'customerInvoices',
  supplier_invoices: 'supplierInvoices',
  student_exam_results: 'studentExamResults',
  class_subject_allocations: 'classSubjectAllocations',
  teacher_subject_assignments: 'teacherSubjectAssignments',
  student_subject_enrollments: 'studentSubjectEnrollments',
  timetable_entries: 'timetableEntries',
  warehouses: 'warehouses',
  item_categories_inv: 'itemCategoriesInv',
  items_inv: 'itemsInv',
  fixed_assets: 'fixedAssets',
  requisitions: 'requisitions',
  purchase_orders: 'purchaseOrders',
  stock_levels: 'stockLevels',
  stock_transactions: 'stockTransactions',
  payroll_periods: 'payrollPeriods',
  payroll_item_types: 'payrollItemTypes',
  staff_salary_settings: 'staffSalarySettings',
  payslips: 'payslips',
  book_categories: 'bookCategories',
  books: 'books',
  loans: 'loans',
  fines: 'fines',
  parents_guardians: 'parentsGuardians',
  workflows: 'workflows',
  meal_plans: 'mealPlans',
  menus: 'menus',
  merchants: 'merchants',
  audit_logs: 'auditLogs',
  student_opening_balances: 'studentOpeningBalances',
  transport_routes: 'transportRoutes',
  student_transport_assignments: 'studentTransportAssignments',
  general_payments: 'generalPayments',
  general_ledger_entries: 'generalLedgerEntries',
  rfqs: 'rfqs',
  education_system_configurations: 'educationSystemConfigurations'
};

const snakeToCamel = (value: string): string =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export const createAppDataLoadingState = (isLoading: boolean): AppDataLoadingStates => {
  const loadingEntries = APP_DATA_ARRAY_KEYS.reduce<Record<string, boolean>>((accumulator, key) => {
    accumulator[key] = isLoading;
    return accumulator;
  }, {
    all: isLoading,
    schoolDetails: isLoading
  });

  return loadingEntries as AppDataLoadingStates;
};

export const normalizeAppDataCollections = (rawData: Record<string, any[] | undefined>) => {
  const normalizedData = APP_DATA_ARRAY_KEYS.reduce<Record<string, any[]>>((accumulator, key) => {
    accumulator[key] = [];
    return accumulator;
  }, {});

  normalizedData.schoolDetails = [];

  Object.entries(rawData).forEach(([collectionName, collectionValue]) => {
    const alias = COLLECTION_KEY_ALIASES[collectionName] || COLLECTION_KEY_ALIASES[snakeToCamel(collectionName)];
    const normalizedValue = Array.isArray(collectionValue) ? collectionValue : [];

    if (alias) {
      normalizedData[alias] = normalizedValue;
      return;
    }

    const camelKey = snakeToCamel(collectionName);
    if (camelKey in normalizedData) {
      normalizedData[camelKey] = normalizedValue;
    }
  });

  return normalizedData as Record<AppDataArrayKey | 'schoolDetails', any[]>;
};

// Enhanced context type with database management and sync capabilities
export interface EnhancedAppDataContextType extends AppDataContextType {
  // Database status
  isDatabaseModeActive: boolean;
  isOnline: boolean;
  appVersion: string;
  deploymentMode: string;
  providerType: string | null;
  
  // Network state (from NetworkStateManager)
  backendAvailable: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  networkState: NetworkState | null;
  
  // Sync status
  syncStatus: SyncStatus;
  
  // Database operations
  refreshData: () => Promise<void>;
  backupData: () => Promise<any>;
  restoreData: (backup: any) => Promise<void>;
  clearAllData: () => Promise<void>;
  
  // Sync operations
  forceSync: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  cancelSync: () => void;
  
  // Sync settings
  getSyncSettings: () => SyncSettings;
  updateSyncSettings: (settings: Partial<SyncSettings>) => void;
  
  // Collection statistics
  getCollectionStats: () => Promise<Array<{
    name: string;
    count: number;
    status: string;
    health: 'healthy' | 'warning' | 'error';
  }>>;
  
  // Enhanced data refresh (Task 4.4.1)
  refreshCollection: (collectionName: string) => Promise<void>;
  refreshDataWithProgress: (onProgress?: (progress: number) => void) => Promise<void>;
  
  // Pagination (Task 4.4.2)
  getCollectionPage: <T = any>(collectionName: string, options: PaginationOptions) => Promise<PaginationResult<T>>;
  
  // Memory management (Task 4.4.3)
  cleanupOldData: (daysOld?: number) => Promise<void>;
  
  // Provider capabilities (Task 4.4.4)
  getProviderCapabilities: () => ProviderCapabilities;
  
  // Data mode tracking (Task 4.4.5)
  currentDataMode: DataMode;
  dataSourceDescription: string;
  
  // Data validation (Task 4.4.6)
  validateData: () => Promise<{
    isValid: boolean;
    issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; collection?: string }>;
  }>;
  
  // Data strategy (Task 4.4.8)
  getDataSourceConfig: () => DataSourceConfig;
  updateDataStrategy: (strategy: DataStrategy) => void;
  
  // Data generation (Task 5)
  generateData: (options?: {
    modules?: string[];
    counts?: Record<string, number>;
    useRealisticData?: boolean;
    includeTestData?: boolean;
    clearExisting?: boolean;
  }) => Promise<{ success: boolean; stats?: any; error?: string }>;
  
  seedDatabase: (seedConfig?: {
    dataMode?: 'demo' | 'development' | 'production';
    modules?: string[];
    volume?: 'small' | 'medium' | 'large';
  }) => Promise<{ success: boolean; message: string; stats?: any }>;
}

// Create the context with a default undefined value
const AppDataContext = createContext<EnhancedAppDataContextType | undefined>(undefined);

// Simplified provider component that uses UnifiedDatabaseManager
export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [data, setData] = useState<Record<string, any[]>>({});
  
  // Network state
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    progress: 0,
    lastError: null,
    lastSyncTime: null,
    pendingOperations: 0,
    conflictsCount: 0
  });
  
  // Sync settings (stored in localStorage)
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => {
    try {
      const stored = localStorage.getItem('sync-settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load sync settings:', err);
    }
    return {
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      batchSize: 100,
      conflictResolution: 'manual' as const
    };
  });
  
  // Data strategy (stored in localStorage)
  const [dataStrategy, setDataStrategy] = useState<DataStrategy>(() => {
    try {
      const stored = localStorage.getItem('data-strategy');
      if (stored) {
        return stored as DataStrategy;
      }
    } catch (err) {
      console.warn('Failed to load data strategy:', err);
    }
    return 'offline-first';
  });
  
  // Last refresh times per collection
  const lastRefreshTimes = useRef<Map<string, Date>>(new Map());
  
  const dbManager = useMemo(() => UnifiedDatabaseManager.getInstance(), []);
  const config = useMemo(() => getCurrentUnifiedConfig(), []);
  const toast = useToastHelpers(); // Toast functions are stable from the hook
  const networkManager = useMemo(() => NetworkStateManager.getInstance(), []);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const performSyncRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize database manager - non-blocking to prevent app hang
  useEffect(() => {
    let mounted = true;

    const initializeDatabase = async () => {
      try {
        console.log('🚀 [AppDataContext] Starting database initialization (non-blocking)...');
        setIsLoading(false);
        setIsInitialized(true);

        const initPromise = dbManager.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database initialization timeout')), 15000);
        });

        await Promise.race([initPromise, timeoutPromise]);

        if (!mounted) return;

        const loadPromise = loadAllCollections();
        const loadTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Load collections timeout')), 20000);
        });

        await Promise.race([loadPromise, loadTimeoutPromise]);

        if (mounted) {
          console.log('✅ [AppDataContext] Database initialized successfully');
          toast.showSuccess('Database initialized successfully');
        }
      } catch (err) {
        console.warn('⚠️ [AppDataContext] Database init failed/timed out, continuing without DB:', err);
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();

    return () => {
      mounted = false;
    };
  }, [dbManager]); // Removed toast from dependencies to prevent re-initialization loop

  // Automatic sync interval
  useEffect(() => {
    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Only set up auto-sync for providers that support it
    const providerType = dbManager.getProviderType();
    const supportsSync = providerType === 'backend-api' || providerType === 'pouchdb';

    if (!supportsSync || !syncSettings.autoSync || !isInitialized) {
      return;
    }

    console.log(`🔄 [AppDataContext] Setting up automatic sync (interval: ${syncSettings.syncInterval}ms)`);

    // Set up interval for automatic sync
    syncIntervalRef.current = setInterval(() => {
      if (isOnline && networkState?.backendAvailable && syncStatus.state !== 'paused' && !isSyncingRef.current && performSyncRef.current) {
        console.log('🔄 [AppDataContext] Automatic sync triggered');
        performSyncRef.current().catch(err => {
          console.error('Automatic sync failed:', err);
        });
      }
    }, syncSettings.syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [syncSettings.autoSync, syncSettings.syncInterval, isInitialized]); // Reduced dependencies to prevent excessive re-runs

  // Load data from all collections
  const loadAllCollections = useCallback(async () => {
    try {
      const collections = dbManager.getAllCollections();
      const loadedData: Record<string, any[]> = {};

      for (const [name, collection] of collections) {
        try {
          if (collection && typeof collection.find === 'function') {
            const docs = await collection.find({});
            loadedData[name] = docs;
          }
        } catch (err) {
          console.warn(`Failed to load collection ${name}:`, err);
          loadedData[name] = [];
        }
      }

      setData(loadedData);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }, [dbManager]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      await loadAllCollections();
      toast.showSuccess('Data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      toast.showError(errorMessage);
      throw err;
    }
  }, [loadAllCollections]); // Removed toast to prevent re-render loop

  // Backup data
  const backupData = useCallback(async () => {
    try {
      toast.showInfo('Starting backup...');
      const backup = await dbManager.createBackup();
      toast.showSuccess('Backup completed successfully');
      return backup;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backup failed';
      console.error('Backup failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager]); // Removed toast to prevent re-render loop

  // Restore data
  const restoreData = useCallback(async (backup: any) => {
    try {
      toast.showInfo('Starting restore...');
      const result = await dbManager.restoreFromBackup(backup, { clearExisting: true });
      await loadAllCollections();
      
      if (result.success) {
        toast.showSuccess(`Restore completed: ${result.restored} records restored`);
      } else {
        toast.showWarning(`Restore completed with errors: ${result.restored} restored, ${result.failed} failed`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      console.error('Restore failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager, loadAllCollections]); // Removed toast to prevent re-render loop

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      toast.showInfo('Clearing all data...');
      await dbManager.clearAllData();
      await loadAllCollections();
      toast.showSuccess('All data cleared successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear data';
      console.error('Clear data failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager, loadAllCollections]); // Removed toast to prevent re-render loop

  // Get collection statistics
  const getCollectionStats = useCallback(async () => {
    try {
      return await dbManager.getCollectionStatistics();
    } catch (err) {
      console.error('Failed to get collection stats:', err);
      return [];
    }
  }, [dbManager]);

  // Perform sync operation
  const performSync = useCallback(async () => {
    // Only sync if provider supports it (backend-api or pouchdb)
    const providerType = dbManager.getProviderType();
    if (providerType !== 'backend-api' && providerType !== 'pouchdb') {
      console.log('ℹ️ [AppDataContext] Sync not supported for provider:', providerType);
      return;
    }

    if (!isOnline || !networkState?.backendAvailable) {
      console.log('ℹ️ [AppDataContext] Skipping sync - offline or backend unavailable');
      return;
    }

    if (isSyncingRef.current) {
      console.log('ℹ️ [AppDataContext] Sync already in progress');
      return;
    }

    if (syncStatus.state === 'paused') {
      console.log('ℹ️ [AppDataContext] Sync is paused');
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncStatus(prev => ({
        ...prev,
        state: 'syncing',
        progress: 0,
        lastError: null
      }));

      console.log('🔄 [AppDataContext] Starting sync...');
      
      // Get the current provider and check if it has sync capability
      const provider = dbManager.getCurrentProvider();
      if (provider && (provider as any).sync && typeof (provider as any).sync === 'function') {
        await (provider as any).sync();
        
        // Reload data after successful sync
        await loadAllCollections();
        
        setSyncStatus(prev => ({
          ...prev,
          state: 'idle',
          progress: 100,
          lastSyncTime: new Date(),
          lastError: null
        }));
        
        console.log('✅ [AppDataContext] Sync completed successfully');
        toast.showSuccess('Data synchronized successfully');
      } else {
        console.warn('⚠️ [AppDataContext] Provider does not support sync');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ [AppDataContext] Sync failed:', error);
      
      setSyncStatus(prev => ({
        ...prev,
        state: 'error',
        lastError: error
      }));
      
      toast.showError(`Sync failed: ${error.message}`);
    } finally {
      isSyncingRef.current = false;
    }
  }, [dbManager, isOnline, networkState, syncStatus.state, loadAllCollections]); // Removed toast to prevent re-render loop

  // Store performSync in ref for use in effects
  useEffect(() => {
    performSyncRef.current = performSync;
  }, []); // Remove performSync from dependencies to prevent circular dependency

  // Monitor online/offline status and network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Subscribe to NetworkStateManager
    const unsubscribe = networkManager.subscribe((state) => {
      setNetworkState(state);
      setIsOnline(state.isOnline);
      
      // Trigger sync on network reconnection if auto-sync is enabled
      if (state.isOnline && syncSettings.autoSync && !isSyncingRef.current && performSyncRef.current) {
        console.log('🔄 [AppDataContext] Network reconnected, triggering sync...');
        performSyncRef.current().catch(err => {
          console.error('Auto-sync on reconnection failed:', err);
        });
      }
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [networkManager, syncSettings.autoSync]);

  // Force sync
  const forceSync = useCallback(async () => {
    console.log('🔄 [AppDataContext] Force sync requested');
    await performSync();
  }, []); // Remove performSync from dependencies to prevent circular dependency

  // Pause sync
  const pauseSync = useCallback(() => {
    console.log('⏸️ [AppDataContext] Sync paused');
    setSyncStatus(prev => ({ ...prev, state: 'paused' }));
    toast.showInfo('Automatic sync paused');
  }, []); // Removed toast to prevent re-render loop

  // Resume sync
  const resumeSync = useCallback(() => {
    console.log('▶️ [AppDataContext] Sync resumed');
    setSyncStatus(prev => ({ ...prev, state: 'idle' }));
    toast.showInfo('Automatic sync resumed');
    
    // Trigger immediate sync if online
    if (isOnline && networkState?.backendAvailable) {
      performSync().catch(err => {
        console.error('Sync on resume failed:', err);
      });
    }
  }, [isOnline, networkState]); // Removed performSync and toast to prevent re-render loop

  // Cancel sync
  const cancelSync = useCallback(() => {
    if (isSyncingRef.current) {
      console.log('🛑 [AppDataContext] Sync cancelled');
      isSyncingRef.current = false;
      setSyncStatus(prev => ({ ...prev, state: 'idle', progress: 0 }));
      toast.showWarning('Sync cancelled');
    }
  }, []); // Removed toast to prevent re-render loop

  // Get sync settings
  const getSyncSettings = useCallback(() => {
    return { ...syncSettings };
  }, [syncSettings]);

  // Update sync settings
  const updateSyncSettings = useCallback((newSettings: Partial<SyncSettings>) => {
    setSyncSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Persist to localStorage
      try {
        localStorage.setItem('sync-settings', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save sync settings:', err);
      }
      
      return updated;
    });
    
    toast.showSuccess('Sync settings updated');
  }, []); // Removed toast to prevent re-render loop

  // ========== Task 4.4: Data Refresh and State Management ==========

  // Task 4.4.1: Enhanced data refresh - Refresh single collection
  const refreshCollection = useCallback(async (collectionName: string) => {
    try {
      const collection = dbManager.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      // Check throttling (max once per 5 seconds)
      const lastRefresh = lastRefreshTimes.current.get(collectionName);
      if (lastRefresh && Date.now() - lastRefresh.getTime() < 5000) {
        console.log(`⏱️ [AppDataContext] Throttling refresh for ${collectionName}`);
        return;
      }

      console.log(`🔄 [AppDataContext] Refreshing collection: ${collectionName}`);
      
      if (typeof collection.find === 'function') {
        const docs = await collection.find({});
        setData(prev => ({ ...prev, [collectionName]: docs }));
        lastRefreshTimes.current.set(collectionName, new Date());
        toast.showSuccess(`${collectionName} refreshed successfully`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to refresh ${collectionName}`;
      console.error(`Failed to refresh collection ${collectionName}:`, err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager]); // Removed toast to prevent re-render loop

  // Task 4.4.1: Refresh data with progress tracking
  const refreshDataWithProgress = useCallback(async (onProgress?: (progress: number) => void) => {
    try {
      const collections = dbManager.getAllCollections();
      const totalCollections = collections.size;
      let completed = 0;

      const loadedData: Record<string, any[]> = {};

      for (const [name, collection] of collections) {
        try {
          if (collection && typeof collection.find === 'function') {
            const docs = await collection.find({});
            loadedData[name] = docs;
          }
        } catch (err) {
          console.warn(`Failed to load collection ${name}:`, err);
          loadedData[name] = [];
        }

        completed++;
        const progress = Math.round((completed / totalCollections) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      }

      setData(loadedData);
      toast.showSuccess('All data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager]); // Removed toast to prevent re-render loop

  // Task 4.4.2: Pagination support
  const getCollectionPage = useCallback(async <T = any,>(
    collectionName: string,
    options: PaginationOptions
  ): Promise<PaginationResult<T>> => {
    try {
      const collection = dbManager.getCollection<T>(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      // Get total count
      const totalCount = typeof collection.count === 'function' 
        ? await collection.count() 
        : 0;

      // Calculate pagination
      const { page, pageSize, sortBy, sortOrder = 'asc' } = options;
      const skip = (page - 1) * pageSize;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Fetch paginated data
      let paginatedData: T[] = [];
      if (typeof collection.find === 'function') {
        const query: any = {
          skip,
          limit: pageSize
        };

        if (sortBy) {
          query.sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        }

        paginatedData = await collection.find(query);
      }

      return {
        data: paginatedData,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (err) {
      console.error(`Failed to get page for collection ${collectionName}:`, err);
      throw err;
    }
  }, [dbManager]);

  // Task 4.4.3: Memory management - Cleanup old data
  const cleanupOldData = useCallback(async (daysOld: number = 30) => {
    try {
      console.log(`🗑️ [AppDataContext] Cleaning up data older than ${daysOld} days...`);
      toast.showInfo(`Cleaning up data older than ${daysOld} days...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let totalCleaned = 0;

      for (const [name, collection] of dbManager.getAllCollections()) {
        try {
          if (collection && typeof collection.find === 'function' && typeof collection.remove === 'function') {
            // Find all documents and filter old ones
            const allDocs = await collection.find({});
            const cutoffTime = cutoffDate.getTime();

            for (const doc of allDocs) {
              // Check if document is old based on createdAt or updatedAt
              const createdAt = doc.createdAt ? new Date(doc.createdAt).getTime() : null;
              const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).getTime() : null;

              const isOld = (createdAt && createdAt < cutoffTime) || (updatedAt && updatedAt < cutoffTime);

              if (isOld && doc.id) {
                await collection.remove(doc.id);
                totalCleaned++;
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to cleanup collection ${name}:`, err);
        }
      }

      console.log(`✅ [AppDataContext] Cleaned up ${totalCleaned} old records`);
      toast.showSuccess(`Cleaned up ${totalCleaned} old records`);
      
      // Refresh data after cleanup
      await loadAllCollections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup old data';
      console.error('Cleanup failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager, loadAllCollections]); // Removed toast to prevent re-render loop

  // Task 4.4.4: Provider capability detection
  const getProviderCapabilities = useCallback((): ProviderCapabilities => {
    const providerType = dbManager.getProviderType();

    // Define capabilities based on provider type
    const capabilities: Record<string, ProviderCapabilities> = {
      'sqlite-file': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: false,
        conflictResolution: false,
        fullTextSearch: true,
        transactions: true
      },
      'sqlite-wasm': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: false,
        conflictResolution: false,
        fullTextSearch: true,
        transactions: true
      },
      'pouchdb': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: true,
        conflictResolution: true,
        fullTextSearch: false,
        transactions: false
      },
      'backend-api': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: true,
        conflictResolution: true,
        fullTextSearch: true,
        transactions: true
      },
      'livestore': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: true,
        conflictResolution: true,
        fullTextSearch: false,
        transactions: false
      }
    };

    return capabilities[providerType || 'pouchdb'] || capabilities['pouchdb'];
  }, [dbManager]);

  // Task 4.4.5: Data mode tracking
  const currentDataMode = useMemo((): DataMode => {
    if (!isOnline) return 'offline';
    if (networkState?.backendAvailable) return 'online';
    return 'hybrid';
  }, [isOnline, networkState]);

  const dataSourceDescription = useMemo((): string => {
    const providerType = dbManager.getProviderType();
    const mode = currentDataMode;

    if (mode === 'offline') {
      return `Offline mode - Using local ${providerType} database`;
    }
    if (mode === 'online') {
      return `Online mode - Syncing with backend via ${providerType}`;
    }
    return `Hybrid mode - Local ${providerType} with limited connectivity`;
  }, [dbManager, currentDataMode]);

  // Task 4.4.6: Data validation
  const validateData = useCallback(async () => {
    try {
      console.log('🔍 [AppDataContext] Validating data integrity...');
      
      const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; collection?: string }> = [];

      for (const [name, collection] of dbManager.getAllCollections()) {
        try {
          // Check if collection is accessible
          if (!collection) {
            issues.push({
              severity: 'error',
              message: `Collection ${name} is null or undefined`,
              collection: name
            });
            continue;
          }

          // Check collection count
          if (typeof collection.count === 'function') {
            const count = await collection.count();
            if (count < 0) {
              issues.push({
                severity: 'error',
                message: `Collection ${name} has negative count: ${count}`,
                collection: name
              });
            }
          }

          // Check for duplicate IDs
          if (typeof collection.find === 'function') {
            const docs = await collection.find({});
            const ids = new Set();
            const duplicates: string[] = [];

            for (const doc of docs) {
              if (doc.id) {
                if (ids.has(doc.id)) {
                  duplicates.push(doc.id);
                } else {
                  ids.add(doc.id);
                }
              }
            }

            if (duplicates.length > 0) {
              issues.push({
                severity: 'error',
                message: `Collection ${name} has ${duplicates.length} duplicate IDs`,
                collection: name
              });
            }
          }
        } catch (err) {
          issues.push({
            severity: 'warning',
            message: `Failed to validate collection ${name}: ${err instanceof Error ? err.message : String(err)}`,
            collection: name
          });
        }
      }

      const isValid = !issues.some(issue => issue.severity === 'error');
      
      if (isValid) {
        toast.showSuccess('Data validation passed');
      } else {
        toast.showWarning(`Data validation found ${issues.filter(i => i.severity === 'error').length} errors`);
      }

      return { isValid, issues };
    } catch (err) {
      console.error('Data validation failed:', err);
      throw err;
    }
  }, [dbManager]); // Removed toast to prevent re-render loop

  // Task 4.4.8: Data strategy configuration
  const getDataSourceConfig = useCallback((): DataSourceConfig => {
    return {
      strategy: dataStrategy,
      fallbackEnabled: true,
      cacheTimeout: 300000, // 5 minutes
      retryAttempts: 3
    };
  }, [dataStrategy]);

  const updateDataStrategy = useCallback((newStrategy: DataStrategy) => {
    if (config.environment !== 'development') {
      toast.showWarning('Data strategy can only be changed in development mode');
      return;
    }

    setDataStrategy(newStrategy);
    
    try {
      localStorage.setItem('data-strategy', newStrategy);
    } catch (err) {
      console.warn('Failed to save data strategy:', err);
    }

    toast.showSuccess(`Data strategy updated to: ${newStrategy}`);
  }, [config.environment]); // Removed toast to prevent re-render loop

  // ========== Task 5: Migrate Mock Data System to Database ==========

  // Task 5.1 & 5.3: Generate data using UniversalDataGenerator
  const generateData = useCallback(async (options?: {
    modules?: string[];
    counts?: Record<string, number>;
    useRealisticData?: boolean;
    includeTestData?: boolean;
    clearExisting?: boolean;
  }) => {
    try {
      console.log('🎲 [AppDataContext] Starting data generation...');
      toast.showInfo('Generating data...');

      const result = await dbManager.generateData(options);

      if (result.success) {
        // Reload data after generation
        await loadAllCollections();
        
        const stats = result.stats;
        const message = stats 
          ? `Generated ${stats.totalRecords} records across ${stats.tablesGenerated.length} collections`
          : 'Data generated successfully';
        
        toast.showSuccess(message);
        console.log('✅ [AppDataContext] Data generation completed:', result.stats);
      } else {
        toast.showError(`Data generation failed: ${result.error}`);
        console.error('❌ [AppDataContext] Data generation failed:', result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Data generation failed';
      console.error('Data generation error:', err);
      toast.showError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [dbManager, loadAllCollections]); // Removed toast to prevent re-render loop

  // Task 5.2: Seed database with configuration-based data
  const seedDatabase = useCallback(async (seedConfig?: {
    dataMode?: 'demo' | 'development' | 'production';
    modules?: string[];
    volume?: 'small' | 'medium' | 'large';
  }) => {
    try {
      console.log('🌱 [AppDataContext] Seeding database...');
      toast.showInfo('Seeding database...');

      const result = await dbManager.seedDatabase(seedConfig);

      if (result.success) {
        // Reload data after seeding
        await loadAllCollections();
        
        toast.showSuccess(result.message);
        console.log('✅ [AppDataContext] Database seeded:', result.stats);
      } else {
        toast.showError(result.message);
        console.error('❌ [AppDataContext] Database seeding failed:', result.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Database seeding failed';
      console.error('Database seeding error:', err);
      toast.showError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }, [dbManager, loadAllCollections]); // Removed toast to prevent re-render loop

  // Create context value
  const contextValue = useMemo(() => {
    const normalizedData = normalizeAppDataCollections(data);
    const loadingState = createAppDataLoadingState(isLoading);

    return {
      // Core data collections
      ...normalizedData,
      
      // Status flags
      isInitialized,
      loading: loadingState,
      error,
      isDatabaseModeActive: isInitialized && !isLoading && !error,
      isOnline,
      appVersion: '1.0.0',
      deploymentMode: dbManager.getDeploymentMode(),
      providerType: dbManager.getProviderType(),
      
      // Network state
      backendAvailable: networkState?.backendAvailable || false,
      connectionQuality: networkState?.connectionQuality || 'offline',
      networkState,
      
      // Sync status
      syncStatus,
      
      // Database operations
      refreshData,
      backupData,
      restoreData,
      clearAllData,
      getCollectionStats,
      
      // Sync operations
      forceSync,
      pauseSync,
      resumeSync,
      cancelSync,
      
      // Sync settings
      getSyncSettings,
      updateSyncSettings,
      
      // Enhanced data refresh (Task 4.4.1)
      refreshCollection,
      refreshDataWithProgress,
      
      // Pagination (Task 4.4.2)
      getCollectionPage,
      
      // Memory management (Task 4.4.3)
      cleanupOldData,
      
      // Provider capabilities (Task 4.4.4)
      getProviderCapabilities,
      
      // Data mode tracking (Task 4.4.5)
      currentDataMode,
      dataSourceDescription,
      
      // Data validation (Task 4.4.6)
      validateData,
      
      // Data strategy (Task 4.4.8)
      getDataSourceConfig,
      updateDataStrategy,
      
      // Data generation (Task 5)
      generateData,
      seedDatabase,
      
      // Legacy compatibility
      refresh: refreshData,
      isRxDBModeActive: isInitialized,
      schoolDetails: normalizedData.schoolDetails?.[0] || null,
      users: normalizedData.users || [],
    } as any as EnhancedAppDataContextType;
  }, [
    data,
    isInitialized,
    isLoading,
    error,
    isOnline,
    dbManager,
    networkState,
    syncStatus,
    refreshData,
    backupData,
    restoreData,
    clearAllData,
    getCollectionStats,
    forceSync,
    pauseSync,
    resumeSync,
    cancelSync,
    getSyncSettings,
    updateSyncSettings,
    refreshCollection,
    refreshDataWithProgress,
    getCollectionPage,
    cleanupOldData,
    getProviderCapabilities,
    currentDataMode,
    dataSourceDescription,
    validateData,
    getDataSourceConfig,
    updateDataStrategy,
    generateData,
    seedDatabase,
    config.environment,
    loadAllCollections
  ]); // Removed toast from dependencies to prevent re-render loop

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading application data...</span>
      </div>
    );
  }

  // Error state with recovery options
  if (error && config.environment === 'production') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-600 text-xl mb-2">⚠️ Application Error</div>
          <div className="text-gray-700 mb-4">
            {error.message || 'We\'re experiencing technical difficulties. Please try again later.'}
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Application
            </button>
            <button 
              onClick={() => setError(null)} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          📡 Offline Mode - Changes will sync when connection is restored
        </div>
      )}
    </AppDataContext.Provider>
  );
};

// Hook to access the data context
export const useAppData = (): EnhancedAppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

// Export the context for use in other files
export { AppDataContext };

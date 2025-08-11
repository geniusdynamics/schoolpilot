// ABOUTME: React hook for accessing backend architecture configuration and capabilities
// ABOUTME: Provides components with backend status, routing decisions, and capability checks

import { useState, useEffect, useCallback } from 'react';
import { 
  backendArchitecture, 
  BackendType, 
  DataSource, 
  BackendCapabilities 
} from '../config/backendArchitecture';
import { backendServiceAdapter } from '../services/BackendServiceAdapter';

export interface BackendStatus {
  type: BackendType;
  dataSource: DataSource;
  apiAvailable: boolean;
  capabilities: BackendCapabilities;
  endpoints: {
    api?: string;
    couchdb?: string;
    auth?: string;
  };
}

export interface ConnectivityStatus {
  local: boolean;
  api: boolean;
  couchdb: boolean;
  lastChecked: Date;
}

export interface UseBackendArchitectureReturn {
  // Current backend status
  status: BackendStatus | null;
  connectivity: ConnectivityStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Backend operations
  switchBackend: (backendType: BackendType) => void;
  testConnectivity: () => Promise<ConnectivityStatus>;
  refreshStatus: () => Promise<void>;
  
  // Capability checks
  hasCapability: (category: keyof BackendCapabilities, capability: string) => boolean;
  canPerformOperation: (functionName: string) => boolean;
  getRecommendedBackend: (functionName: string) => DataSource;
  
  // Function routing
  shouldUseAPI: (functionName: string) => boolean;
  isApiFunction: (functionName: string) => boolean;
  isFrontendOnlyFunction: (functionName: string) => boolean;
  isHybridFunction: (functionName: string) => boolean;
}

/**
 * Hook for accessing backend architecture configuration and capabilities
 */
export function useBackendArchitecture(): UseBackendArchitectureReturn {
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial backend status
  const loadBackendStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const backendStatus = await backendServiceAdapter.getBackendStatus();
      setStatus(backendStatus);
      
      // Also test connectivity
      const connectivityStatus = await backendServiceAdapter.testConnectivity();
      setConnectivity({
        ...connectivityStatus,
        lastChecked: new Date()
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load backend status';
      setError(errorMessage);
      console.error('Failed to load backend status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load status on mount
  useEffect(() => {
    loadBackendStatus();
  }, [loadBackendStatus]);

  // Switch backend type
  const switchBackend = useCallback((backendType: BackendType) => {
    try {
      backendServiceAdapter.switchBackend(backendType);
      // Reload status after switching
      loadBackendStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch backend';
      setError(errorMessage);
      console.error('Failed to switch backend:', err);
    }
  }, [loadBackendStatus]);

  // Test connectivity
  const testConnectivity = useCallback(async (): Promise<ConnectivityStatus> => {
    try {
      setError(null);
      const connectivityStatus = await backendServiceAdapter.testConnectivity();
      const result = {
        ...connectivityStatus,
        lastChecked: new Date()
      };
      setConnectivity(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connectivity';
      setError(errorMessage);
      console.error('Failed to test connectivity:', err);
      throw err;
    }
  }, []);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    await loadBackendStatus();
  }, [loadBackendStatus]);

  // Check if a capability is available
  const hasCapability = useCallback((category: keyof BackendCapabilities, capability: string): boolean => {
    return backendServiceAdapter.hasCapability(category, capability);
  }, []);

  // Check if an operation can be performed
  const canPerformOperation = useCallback((functionName: string): boolean => {
    try {
      const recommendedBackend = backendServiceAdapter.getRecommendedBackend(functionName);
      
      if (recommendedBackend === 'api') {
        return connectivity?.api === true;
      } else if (recommendedBackend === 'pouchdb') {
        return connectivity?.local === true;
      } else if (recommendedBackend === 'hybrid') {
        return connectivity?.local === true || connectivity?.api === true;
      }
      
      return false;
    } catch (err) {
      console.warn('Failed to check operation capability:', err);
      return false;
    }
  }, [connectivity]);

  // Get recommended backend for a function
  const getRecommendedBackend = useCallback((functionName: string): DataSource => {
    return backendServiceAdapter.getRecommendedBackend(functionName);
  }, []);

  // Check if function should use API
  const shouldUseAPI = useCallback((functionName: string): boolean => {
    return backendArchitecture.shouldUseAPI(functionName);
  }, []);

  // Function type checks
  const isApiFunction = useCallback((functionName: string): boolean => {
    const { isApiFunction } = require('../config/backendArchitecture');
    return isApiFunction(functionName);
  }, []);

  const isFrontendOnlyFunction = useCallback((functionName: string): boolean => {
    const { isFrontendOnlyFunction } = require('../config/backendArchitecture');
    return isFrontendOnlyFunction(functionName);
  }, []);

  const isHybridFunction = useCallback((functionName: string): boolean => {
    const { isHybridFunction } = require('../config/backendArchitecture');
    return isHybridFunction(functionName);
  }, []);

  return {
    // Status
    status,
    connectivity,
    isLoading,
    error,
    
    // Operations
    switchBackend,
    testConnectivity,
    refreshStatus,
    
    // Capability checks
    hasCapability,
    canPerformOperation,
    getRecommendedBackend,
    
    // Function routing
    shouldUseAPI,
    isApiFunction,
    isFrontendOnlyFunction,
    isHybridFunction
  };
}

/**
 * Hook for checking specific backend capabilities
 */
export function useBackendCapabilities() {
  const { hasCapability, status } = useBackendArchitecture();
  
  return {
    // CRUD capabilities
    canManageStudents: hasCapability('crud', 'students'),
    canManageTeachers: hasCapability('crud', 'teachers'),
    canManageCourses: hasCapability('crud', 'courses'),
    canManageGrades: hasCapability('crud', 'grades'),
    canManageAttendance: hasCapability('crud', 'attendance'),
    canManageFees: hasCapability('crud', 'fees'),
    canManageLibrary: hasCapability('crud', 'library'),
    canManageInventory: hasCapability('crud', 'inventory'),
    
    // Advanced capabilities
    canGenerateReports: hasCapability('advanced', 'reporting'),
    canViewAnalytics: hasCapability('advanced', 'analytics'),
    canPerformBulkOperations: hasCapability('advanced', 'bulkOperations'),
    canExportData: hasCapability('advanced', 'dataExport'),
    hasRealTimeSync: hasCapability('advanced', 'realTimeSync'),
    hasOfflineSupport: hasCapability('advanced', 'offlineSupport'),
    isMultiTenant: hasCapability('advanced', 'multiTenant'),
    hasRBAC: hasCapability('advanced', 'rbac'),
    
    // Integration capabilities
    canSendSMS: hasCapability('integrations', 'sms'),
    canSendEmail: hasCapability('integrations', 'email'),
    canProcessPayments: hasCapability('integrations', 'payments'),
    hasBiometricSupport: hasCapability('integrations', 'biometric'),
    hasParentPortal: hasCapability('integrations', 'parentPortal'),
    hasMobileApp: hasCapability('integrations', 'mobileApp'),
    
    // Backend type info
    backendType: status?.type,
    dataSource: status?.dataSource,
    apiAvailable: status?.apiAvailable
  };
}

/**
 * Hook for function-specific backend routing
 */
export function useFunctionRouting(functionName: string) {
  const { 
    shouldUseAPI, 
    getRecommendedBackend, 
    canPerformOperation,
    isApiFunction,
    isFrontendOnlyFunction,
    isHybridFunction
  } = useBackendArchitecture();
  
  return {
    shouldUseAPI: shouldUseAPI(functionName),
    recommendedBackend: getRecommendedBackend(functionName),
    canPerform: canPerformOperation(functionName),
    isApiFunction: isApiFunction(functionName),
    isFrontendOnly: isFrontendOnlyFunction(functionName),
    isHybrid: isHybridFunction(functionName)
  };
}
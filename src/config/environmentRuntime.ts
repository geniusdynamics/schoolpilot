// ABOUTME: Runtime environment helpers for capability detection in unified configuration.
// ABOUTME: Isolates browser/process checks so unifiedConfig keeps a stable external facade.

interface RuntimeFeatureConfig {
  enhancedDataLayer: boolean;
  networkStatusIndicator: boolean;
  moduleHealthIndicator: boolean;
  syncStatusComponent: boolean;
  globalNotifications: boolean;
  performanceOptimizations: boolean;
  advancedErrorBoundaries: boolean;
  enableOfflineMode: boolean;
  enableRealTimeSync: boolean;
  enablePerformanceMonitoring: boolean;
  enableAdvancedReporting: boolean;
  enableBulkOperations: boolean;
  enableDataExport: boolean;
  enableNotifications: boolean;
  enableAuditLog: boolean;
  enableMultiTenant: boolean;
  performanceMonitorWidget: boolean;
}

export interface RuntimeOptimalConfiguration {
  useEnhancedFeatures: boolean;
  features: RuntimeFeatureConfig;
}

export function detectOptimalConfigurationRuntime(): RuntimeOptimalConfiguration {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  return {
    useEnhancedFeatures: hasIndexedDB && hasServiceWorker,
    features: {
      enhancedDataLayer: hasIndexedDB,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: hasServiceWorker,
      globalNotifications: true,
      performanceOptimizations: isProduction,
      advancedErrorBoundaries: true,
      enableOfflineMode: hasServiceWorker && hasIndexedDB,
      enableRealTimeSync: isOnline && isProduction,
      enablePerformanceMonitoring: isProduction,
      enableAdvancedReporting: isProduction,
      enableBulkOperations: true,
      enableDataExport: true,
      enableNotifications: true,
      enableAuditLog: isProduction,
      enableMultiTenant: isProduction,
      performanceMonitorWidget: false,
    },
  };
}

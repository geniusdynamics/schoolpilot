// ABOUTME: Runtime environment helpers for capability detection in unified configuration.
// ABOUTME: Delegates to centralized CapabilityDetector for consistent detection.

import { CapabilityDetector } from '@/services/database/detection/CapabilityDetector';

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

export async function detectOptimalConfiguration(): Promise<RuntimeOptimalConfiguration> {
  const detector = CapabilityDetector.getInstance();
  const report = await detector.detectCapabilities();

  const hasIndexedDB = report.storage.hasIndexedDB;
  const hasServiceWorker = report.storage.hasServiceWorker;
  const isOnline = report.network.isOnline;
  const isProduction = report.runtime.isProduction;

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

/**
 * Synchronous version for backward compatibility.
 * Uses cached capabilities if available, otherwise returns minimal defaults.
 */
export function detectOptimalConfigurationRuntime(): RuntimeOptimalConfiguration {
  // Try to get cached report from CapabilityDetector
  try {

    // detectCapabilities is async, so we provide minimal defaults synchronously
    // and let callers use the async version for full detection
    const hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;
    const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    const isProduction = process.env.NODE_ENV === 'production';

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
  } catch {
    // Fallback minimal configuration
    return {
      useEnhancedFeatures: false,
      features: {
        enhancedDataLayer: false,
        networkStatusIndicator: true,
        moduleHealthIndicator: true,
        syncStatusComponent: false,
        globalNotifications: true,
        performanceOptimizations: false,
        advancedErrorBoundaries: true,
        enableOfflineMode: false,
        enableRealTimeSync: false,
        enablePerformanceMonitoring: false,
        enableAdvancedReporting: false,
        enableBulkOperations: true,
        enableDataExport: true,
        enableNotifications: true,
        enableAuditLog: false,
        enableMultiTenant: false,
        performanceMonitorWidget: false,
      },
    };
  }
}

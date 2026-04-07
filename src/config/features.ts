/**
 * Feature Flags Configuration
 * All feature flags, feature grouping, environment-feature matrix, and defaults.
 */

// ---------------------------------------------------------------------------
// Feature Configuration Interface
// ---------------------------------------------------------------------------

export interface FeatureConfig {
  enableAdvancedReporting: boolean;
  enableBulkOperations: boolean;
  enableDataExport: boolean;
  enableNotifications: boolean;
  enableAuditLog: boolean;
  enableMultiTenant: boolean;
  enableOfflineMode: boolean;
  enableRealTimeSync: boolean;
  enablePerformanceMonitoring: boolean;
  enhancedDataLayer: boolean;
  networkStatusIndicator: boolean;
  moduleHealthIndicator: boolean;
  syncStatusComponent: boolean;
  globalNotifications: boolean;
  performanceOptimizations: boolean;
  advancedErrorBoundaries: boolean;
  performanceMonitorWidget: boolean;

  // Tabbed Mode Features
  enableTabbedMode: boolean;
  enablePerModuleControl: boolean;
  tabbedModeModuleOverrides: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Default Feature Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_FEATURES: FeatureConfig = {
  enableAdvancedReporting: false,
  enableBulkOperations: true,
  enableDataExport: true,
  enableNotifications: true,
  enableAuditLog: false,
  enableMultiTenant: false,
  enableOfflineMode: true,
  enableRealTimeSync: false,
  enablePerformanceMonitoring: false,
  enhancedDataLayer: true,
  networkStatusIndicator: false,
  moduleHealthIndicator: false,
  syncStatusComponent: false,
  globalNotifications: false,
  performanceOptimizations: true,
  advancedErrorBoundaries: true,
  performanceMonitorWidget: false,

  // Tabbed Mode Features (enabled by default for testing)
  enableTabbedMode: true,
  enablePerModuleControl: true,
  tabbedModeModuleOverrides: {},
};

// ---------------------------------------------------------------------------
// Feature Flags used in the main UnifiedAppConfig.features section
// (These are the richer set used in the top-level config object)
// ---------------------------------------------------------------------------

export const DEFAULT_APP_FEATURE_FLAGS = {
  // Enhanced features
  enhancedDataLayer: true as const,
  enhancedUI: false,
  performanceMonitorWidget: false,
  enableErrorReporting: true,
  enableLogging: true,

  // Module-specific features
  enableAcademicsModule: true,
  enableAdministrationModule: true,
  enableFinanceModule: true,
  enableHrModule: true,
  enableInventoryModule: true,
  enableLibraryModule: true,
  enableNutritionModule: true,
  enableReportsModule: true,
  enableSettingsModule: true,
  enableAdmissionsModule: true,

  // Feature-specific flags
  globalNotifications: true,
  enableAccessibility: true,
  enableDarkMode: true,
  enableMultiLanguage: true,
  enableOfflineMode: true,
  enableAuditTrail: true,
  enableDataExport: true,
  enableCustomFields: true,
  enableWorkflowEngine: true,
  enableDocumentManagement: true,
  enableCommunicationCenter: true,
  enableAnalyticsDashboard: true,

  // Tabbed mode feature flags
  enableTabbedMode: true,
  enablePerModuleControl: true,
  tabbedModeModuleOverrides: {
    dashboard: true,
    settings: true,
    reports: true,
    academics: false,
    administration: false,
    finance: false,
    hr: false,
    inventory: false,
    library: false,
    nutrition: false,
    admissions: false,
    audit: false,
  },

  // Demo/Test mode features
  demoMode: false,
  testMode: false,
  enableTestDataGeneration: false,
  showDebugInfo: false,
  enableTestLogin: false,
};

// ---------------------------------------------------------------------------
// Configuration Presets (feature-related slice)
// ---------------------------------------------------------------------------

export const FEATURE_PRESETS: Record<string, Partial<FeatureConfig>> = {
  demo: {
    enhancedDataLayer: true,
    networkStatusIndicator: false,
    moduleHealthIndicator: false,
    syncStatusComponent: false,
    globalNotifications: false,
    performanceOptimizations: true,
    advancedErrorBoundaries: true,
    performanceMonitorWidget: false,
    enableAdvancedReporting: false,
    enableBulkOperations: true,
    enableDataExport: true,
    enableNotifications: true,
    enableAuditLog: false,
    enableMultiTenant: false,
    enableOfflineMode: false,
    enableRealTimeSync: false,
    enablePerformanceMonitoring: false,
  },

  enhanced: {
    enhancedDataLayer: true,
    networkStatusIndicator: true,
    moduleHealthIndicator: true,
    syncStatusComponent: true,
    globalNotifications: true,
    performanceOptimizations: true,
    advancedErrorBoundaries: true,
    performanceMonitorWidget: true,
    enableAdvancedReporting: true,
    enableBulkOperations: true,
    enableDataExport: true,
    enableNotifications: true,
    enableAuditLog: true,
    enableMultiTenant: true,
    enableOfflineMode: true,
    enableRealTimeSync: true,
    enablePerformanceMonitoring: true,
  },

  development: {
    enhancedDataLayer: true,
    networkStatusIndicator: true,
    moduleHealthIndicator: true,
    syncStatusComponent: true,
    globalNotifications: true,
    performanceOptimizations: false,
    advancedErrorBoundaries: true,
    performanceMonitorWidget: true,
    enableAdvancedReporting: true,
    enableBulkOperations: true,
    enableDataExport: true,
    enableNotifications: true,
    enableAuditLog: true,
    enableMultiTenant: false,
    enableOfflineMode: true,
    enableRealTimeSync: false,
    enablePerformanceMonitoring: true,
  },
};

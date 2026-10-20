/**
 * Module Service Types
 *
 * Type definitions and interfaces for module management services.
 * Enables dependency injection and testability.
 */

import type { ModuleDefinition } from '../../core/types';

// ============================================================================
// Module Config Types
// ============================================================================

export interface ModuleConfig {
  id: string;
  enabled: boolean;
  settings?: Record<string, any>;
  lastModified: Date;
}

export interface ModuleInfo {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  required: boolean;
  dependencies: string[];
  dependencySatisfied: boolean;
  missingDependencies: string[];
}

export interface ModuleDependency {
  moduleId: string;
  required: boolean;
  version?: string;
}

export interface ModuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// Module Health Types
// ============================================================================

export enum ModuleHealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  LOADING = 'loading',
  UNKNOWN = 'unknown'
}

export interface ModuleHealth {
  moduleId: string;
  status: ModuleHealthStatus;
  lastChecked: Date;
  issues: ModuleHealthIssue[];
  checkResults: Record<string, HealthCheckResult>;
}

export interface ModuleHealthIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'dependencies' | 'performance' | 'functionality' | 'resources';
  message: string;
  details?: any;
}

export interface HealthCheckResult {
  passed: boolean;
  message: string;
  details?: any;
}

export interface ModuleHealthCheck {
  name: string;
  description: string;
  run(moduleId: string, module: ModuleDefinition): Promise<HealthCheckResult>;
  severity: 'critical' | 'warning' | 'info';
  category: 'dependencies' | 'performance' | 'functionality' | 'resources';
}

export interface ModuleHealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  modules: ModuleHealth[];
  timestamp: Date;
  issues: {
    critical: number;
    warning: number;
    info: number;
  };
}

// ============================================================================
// Module Management Types
// ============================================================================

export interface ModuleManagementResult {
  success: boolean;
  message: string;
  errors?: string[];
  moduleInfo?: ModuleInfo;
}

export interface ModuleLoadResult {
  success: boolean;
  module?: ModuleDefinition;
  error?: Error;
  loadTime: number;
}

export interface ModuleUnloadResult {
  success: boolean;
  message: string;
}

// ============================================================================
// Dynamic Module Loader Types
// ============================================================================

export interface ModuleLoadOptions {
  lazy?: boolean;
  preload?: boolean;
  timeout?: number;
  retryCount?: number;
}

export interface ModuleCacheEntry {
  moduleId: string;
  module: ModuleDefinition;
  loadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

// ============================================================================
// Module Data Registry Types
// ============================================================================

export interface ModuleDataRegistration {
  moduleId: string;
  entityTypes: string[];
  collections: string[];
  relationships: ModuleDataRelationship[];
}

export interface ModuleDataRelationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  field: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Module Config Service Interface
 *
 * Manages module configuration, enabling/disabling, and dependency checking.
 */
export interface IModuleConfigService {
  /**
   * Enable a module
   */
  enableModule(moduleId: string): boolean;

  /**
   * Disable a module
   */
  disableModule(moduleId: string): boolean;

  /**
   * Check if a module is enabled
   */
  isModuleEnabled(moduleId: string): boolean;

  /**
   * Get list of enabled modules
   */
  getEnabledModules(): string[];

  /**
   * Get module configuration
   */
  getModuleConfig(moduleId: string): ModuleConfig | null;

  /**
   * Get all module information
   */
  getAllModuleInfo(): ModuleInfo[];

  /**
   * Check module dependencies
   */
  checkDependencies(moduleId: string): { satisfied: boolean; missing: string[] };

  /**
   * Get module dependencies
   */
  getModuleDependencies(moduleId: string): string[];

  /**
   * Update module settings
   */
  updateModuleSettings(moduleId: string, settings: Record<string, any>): void;

  /**
   * Get module settings
   */
  getModuleSettings(moduleId: string): Record<string, any>;

  /**
   * Get all configurations
   */
  getAllConfigurations(): ModuleConfig[];

  /**
   * Reset module configuration
   */
  resetModuleConfig(moduleId: string): void;

  /**
   * Export configurations
   */
  exportConfigurations(): string;

  /**
   * Import configurations
   */
  importConfigurations(configJson: string): void;

  /**
   * Validate configuration
   */
  validateConfig(): ModuleValidationResult;

  /**
   * Get full config with dependencies
   */
  getConfig(): { moduleDependencies: Record<string, string[]> };
}

/**
 * Module Health Monitor Interface
 *
 * Monitors module health and provides status tracking.
 */
export interface IModuleHealthMonitor {
  /**
   * Register a health check
   */
  registerHealthCheck(check: ModuleHealthCheck): void;

  /**
   * Start monitoring
   */
  startMonitoring(interval?: number): void;

  /**
   * Stop monitoring
   */
  stopMonitoring(): void;

  /**
   * Check health of all modules
   */
  checkAllModules(): Promise<void>;

  /**
   * Check health of a specific module
   */
  checkModuleHealth(moduleId: string): Promise<ModuleHealth | null>;

  /**
   * Subscribe to health updates for a module
   */
  subscribeToModuleHealth(moduleId: string, listener: (health: ModuleHealth) => void): () => void;

  /**
   * Get health status of all modules
   */
  getAllModuleHealth(): Map<string, ModuleHealth>;

  /**
   * Get health status of a specific module
   */
  getModuleHealth(moduleId: string): ModuleHealth | undefined;

  /**
   * Check if a module is healthy
   */
  isModuleHealthy(moduleId: string): boolean;

  /**
   * Get modules with issues
   */
  getModulesWithIssues(): ModuleHealth[];

  /**
   * Get modules with critical issues
   */
  getModulesWithCriticalIssues(): ModuleHealth[];

  /**
   * Attempt to reload a failed module
   */
  reloadModule(moduleId: string): Promise<boolean>;
}

/**
 * Module Management Service Interface
 *
 * Manages module lifecycle through the UI.
 */
export interface IModuleManagementService {
  /**
   * Get all module information for UI display
   */
  getAllModuleInfo(): ModuleInfo[];

  /**
   * Enable a module at runtime
   */
  enableModule(moduleId: string): Promise<ModuleManagementResult>;

  /**
   * Disable a module at runtime
   */
  disableModule(moduleId: string): Promise<ModuleManagementResult>;

  /**
   * Check if user can manage modules
   */
  canManageModules(userId: string): Promise<boolean>;

  /**
   * Get module load history
   */
  getModuleLoadHistory(moduleId: string): ModuleLoadResult[];

  /**
   * Get system module status
   */
  getSystemStatus(): {
    totalModules: number;
    enabledModules: number;
    healthyModules: number;
    issues: string[];
  };
}

/**
 * Dynamic Module Loader Interface
 *
 * Handles dynamic loading and unloading of modules.
 */
export interface IDynamicModuleLoader {
  /**
   * Load a module by ID
   */
  loadModuleById(moduleId: string, options?: ModuleLoadOptions): Promise<ModuleDefinition | null>;

  /**
   * Load multiple modules
   */
  loadModules(moduleIds: string[], options?: ModuleLoadOptions): Promise<ModuleLoadResult[]>;

  /**
   * Unload a module
   */
  unloadModule(moduleId: string): ModuleUnloadResult;

  /**
   * Preload a module
   */
  preloadModule(moduleId: string): Promise<boolean>;

  /**
   * Check if module is loaded
   */
  isModuleLoaded(moduleId: string): boolean;

  /**
   * Get loaded modules
   */
  getLoadedModules(): string[];

  /**
   * Clear module cache
   */
  clearCache(): void;
}

/**
 * Module Data Registry Interface
 *
 * Manages module data registrations and relationships.
 */
export interface IModuleDataRegistry {
  /**
   * Register module data
   */
  registerModuleData(registration: ModuleDataRegistration): void;

  /**
   * Unregister module data
   */
  unregisterModuleData(moduleId: string): void;

  /**
   * Get module data registration
   */
  getModuleData(moduleId: string): ModuleDataRegistration | null;

  /**
   * Get all module data registrations
   */
  getAllModuleData(): ModuleDataRegistration[];

  /**
   * Get entity types for a module
   */
  getModuleEntityTypes(moduleId: string): string[];

  /**
   * Get relationships for an entity
   */
  getEntityRelationships(entityType: string): ModuleDataRelationship[];

  /**
   * Check if entity type is registered
   */
  isEntityTypeRegistered(entityType: string): boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export type ModuleEventType =
  | 'module_enabled'
  | 'module_disabled'
  | 'module_loaded'
  | 'module_unloaded'
  | 'health_changed'
  | 'config_updated';

export interface ModuleEvent {
  type: ModuleEventType;
  moduleId: string;
  timestamp: Date;
  data?: any;
}

export type ModuleEventListener = (event: ModuleEvent) => void;

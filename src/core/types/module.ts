/**
 * Module Metadata Types
 * 
 * Defines the TypeScript interfaces for module metadata.
 * These types support the module.json configuration files
 * and enable runtime module discovery and dependency management.
 * 
 * @module core/types/module
 */

/**
 * Module dependency definition
 * Declares a dependency on another module with version constraints
 */
export interface ModuleDependency {
  /** Module ID (kebab-case, matches directory name) */
  moduleId: string;
  
  /** 
   * Semver version range required
   * @example "^1.0.0", ">=1.0.0 <2.0.0", "~1.2.3"
   */
  version: string;
  
  /** Whether this is a required dependency */
  required: boolean;
  
  /** 
   * Reason for the dependency (documentation)
   * Explains why this module depends on the other
   */
  reason?: string;
  
  /** 
   * Entities imported from this module
   * Documents which shared entities are used
   */
  imports?: string[];
}

/**
 * Module capabilities definition
 * Declares what features/capabilities this module provides
 */
export interface ModuleCapabilities {
  /** Supports offline mode operation */
  offlineSupport?: boolean;
  
  /** Requires backend API connectivity */
  requiresBackend?: boolean;
  
  /** Supports multi-tenancy */
  multiTenant?: boolean;
  
  /** Supports data synchronization */
  supportsSync?: boolean;
  
  /** Has real-time features */
  realTime?: boolean;
}

/**
 * Module-provided resources
 * Declares what entities, services, and hooks the module provides
 */
export interface ModuleProvides {
  /** 
   * Data entities provided by this module
   * @example ["invoices", "payments", "fees"]
   */
  entities?: string[];
  
  /** 
   * Services provided by this module
   * @example ["PaymentService", "InvoiceService"]
   */
  services?: string[];
  
  /** 
   * Hooks/events provided by this module
   * @example ["onPaymentReceived", "onInvoiceGenerated"]
   */
  hooks?: string[];
  
  /** 
   * Components provided by this module
   * @example ["InvoiceList", "PaymentForm"]
   */
  components?: string[];
  
  /**
   * Routes provided by this module
   * @example ["/finance/*"]
   */
  routes?: string[];
}

/**
 * Module lifecycle hooks
 * Functions to call at various points in module lifecycle
 */
export interface ModuleLifecycle {
  /** Called when module is being registered */
  onRegister?: string;
  
  /** Called when module is enabled */
  onEnable?: string;
  
  /** Called when module is disabled */
  onDisable?: string;
  
  /** Called during data seeding */
  onSeed?: string;
  
  /** Called before module is unregistered */
  onUnregister?: string;
}

/**
 * Module author information
 */
export interface ModuleAuthor {
  /** Author name */
  name: string;
  
  /** Author email */
  email?: string;
  
  /** Author website/URL */
  url?: string;
}

/**
 * Module metadata
 * Complete metadata definition for a module
 * This corresponds to the module.json file structure
 */
export interface ModuleMetadata {
  /** 
   * JSON Schema reference for validation
   * @example "../../schemas/module-schema.json"
   */
  $schema?: string;

  /** Unique module identifier (kebab-case) */
  id: string;

  /** Human-readable module name */
  name: string;

  /**
   * Module version (semver)
   * @example "1.0.0"
   */
  version: string;

  /** Brief description of the module */
  description?: string;

  /** Module author/maintainer */
  author?: ModuleAuthor;

  /**
   * License identifier (SPDX)
   * @example "MIT", "Apache-2.0", "GPL-3.0"
   */
  license?: string;

  /** Module homepage/documentation URL */
  homepage?: string;

  /** Module repository URL */
  repository?: string;

  /** Keywords for discovery */
  keywords?: string[];

  /** Navigation items for this module */
  navigation?: any[];

  /** Base path for this module's routes */
  path?: string;

  /** Icon component for this module */
  icon?: any;
  
  /** 
   * Required module dependencies
   * These must be present for the module to function
   */
  dependencies?: ModuleDependency[];
  
  /** 
   * Optional module dependencies
   * These enhance functionality but are not required
   */
  optionalDependencies?: ModuleDependency[];
  
  /** 
   * Conflicting modules
   * These modules cannot coexist with this module
   */
  conflicts?: string[];
  
  /** 
   * Database schemas provided by this module
   * @example ["invoices", "payments", "fees"]
   */
  schemas?: string[];
  
  /** 
   * Migrations directory path (relative to module root)
   * @example "./migrations"
   */
  migrations?: string;
  
  /** Resources provided by this module */
  provides?: ModuleProvides;
  
  /** Module capabilities */
  capabilities?: ModuleCapabilities;
  
  /** Lifecycle hook functions */
  lifecycle?: ModuleLifecycle;
  
  /** Default configuration values */
  config?: Record<string, any>;
  
  /** RBAC permissions provided by this module */
  rbacPermissions?: {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'execute';
    feature?: string;
  }[];
  
  /** Feature flags provided by this module */
  featureFlags?: {
    id: string;
    name: string;
    description: string;
    defaultValue: boolean;
  }[];
  
  /** Minimum SchoolPilot version required */
  minSchoolPilotVersion?: string;
  
  /** Target SchoolPilot version (for compatibility) */
  targetSchoolPilotVersion?: string;
}

/**
 * Loaded module information
 * Combines metadata with runtime information
 */
export interface LoadedModule {
  /** Module ID */
  id: string;
  
  /** Module metadata */
  metadata: ModuleMetadata;
  
  /** Module definition (from moduleDefinition.tsx) */
  definition?: any;
  
  /** Whether the module is currently enabled */
  isEnabled: boolean;
  
  /** Loading state */
  isLoaded: boolean;
  
  /** Any errors during loading */
  error?: string;
  
  /** Timestamp when module was loaded */
  loadedAt?: Date;
}

/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
  /** Whether all dependencies are satisfied */
  valid: boolean;
  
  /** Missing required dependencies */
  missing: ModuleDependency[];
  
  /** Dependencies with version mismatches */
  versionMismatches: Array<{
    dependency: ModuleDependency;
    installedVersion: string;
  }>;
  
  /** Conflicting modules detected */
  conflicts: string[];
  
  /** Circular dependencies detected */
  circularDependencies: string[][];
  
  /** Optional dependencies that are missing */
  missingOptional: ModuleDependency[];
}

/**
 * Module compatibility information
 */
export interface ModuleCompatibility {
  /** Whether the module is compatible with current system */
  compatible: boolean;
  
  /** SchoolPilot version compatibility */
  schoolPilotVersion: {
    required: string;
    current: string;
    compatible: boolean;
  };
  
  /** Dependency compatibility results */
  dependencies: DependencyValidationResult;
  
  /** Any compatibility warnings */
  warnings: string[];
}

/**
 * Module registry state
 */
export interface ModuleRegistryState {
  /** All registered modules */
  modules: Map<string, LoadedModule>;
  
  /** Module loading order (dependency-resolved) */
  loadOrder: string[];
  
  /** Current dependency graph */
  dependencyGraph: Map<string, string[]>;
  
  /** Any registry errors */
  errors: Array<{
    moduleId: string;
    error: string;
  }>;
}

/**
 * Module discovery result
 */
export interface ModuleDiscoveryResult {
  /** Modules discovered */
  modules: ModuleMetadata[];
  
  /** Errors during discovery */
  errors: Array<{
    path: string;
    error: string;
  }>;
  
  /** Total modules found */
  count: number;
}

/**
 * Module validation error
 */
export interface ModuleValidationError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Path to the error in the module.json */
  path?: string;
  
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Module validation result
 */
export interface ModuleValidationResult {
  /** Whether the module is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: ModuleValidationError[];
  
  /** Validation warnings */
  warnings: string[];
}

// Re-export from common.ts for backwards compatibility
export type { ModuleDefinition, NavItem } from './common';

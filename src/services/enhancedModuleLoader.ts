// Enhanced Module Loader Types
// This file exports the types that are used by the enhanced dynamic module loader

// Module Health Status
export enum ModuleHealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  DISABLED = 'disabled',
  LOADING = 'loading',
  FAILED = 'failed'
}

// Module Health Interface
export interface ModuleHealth {
  moduleId: string;
  status: ModuleHealthStatus;
  loadTime: number;
  lastError: Error | null;
  loadAttempts: number;
  lastLoadAttempt: Date | null;
  dependencies: ModuleDependency[];
  features: ModuleFeature[];
  performance: ModulePerformanceMetrics;
  lastChecked?: Date;
  checkResults?: Record<string, any>;
}

// Module Dependency Interface
export interface ModuleDependency {
  id: string;
  status: 'satisfied' | 'missing' | 'version_mismatch';
  required: boolean;
  version?: string;
}

// Module Feature Interface
export interface ModuleFeature {
  name: string;
  enabled: boolean;
  working: boolean;
  lastChecked: Date;
}

// Module Performance Metrics
export interface ModulePerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  componentCount: number;
  routeCount: number;
}
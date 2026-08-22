import { logger } from '@/utils/logging';

// ABOUTME: Backend architecture configuration for flexible integration with multiple backend systems
// ABOUTME: Supports frontend-only (PouchDB/CouchDB), Frappe Education API, and custom backend APIs

/**
 * Backend Architecture Configuration
 * 
 * This system is designed to support multiple backend scenarios:
 * 1. Frontend-only: PouchDB (client) + CouchDB (server) for direct database sync
 * 2. Frappe Education: ERPNext Education module API integration
 * 3. Custom Backend: Our own tuned backend server with custom APIs
 * 4. Hybrid: Mix of direct database access and API calls based on functionality
 */

export type BackendType = 'frontend-only' | 'frappe-education' | 'custom-api' | 'hybrid';
export type DataSource = 'pouchdb' | 'couchdb' | 'api' | 'hybrid';
export type SyncStrategy = 'direct-sync' | 'api-sync' | 'hybrid-sync';

// Backend Configuration Interface
export interface BackendConfig {
  type: BackendType;
  dataSource: DataSource;
  syncStrategy: SyncStrategy;
  endpoints: {
    api?: string;
    couchdb?: string;
    auth?: string;
  };
  capabilities: BackendCapabilities;
  fallbackStrategy: FallbackStrategy;
}

// Backend Capabilities
export interface BackendCapabilities {
  // Core Data Operations
  crud: {
    students: boolean;
    teachers: boolean;
    courses: boolean;
    grades: boolean;
    attendance: boolean;
    fees: boolean;
    library: boolean;
    inventory: boolean;
  };
  
  // Advanced Features
  advanced: {
    reporting: boolean;
    analytics: boolean;
    bulkOperations: boolean;
    dataExport: boolean;
    realTimeSync: boolean;
    offlineSupport: boolean;
    multiTenant: boolean;
    rbac: boolean;
  };
  
  // Integration Features
  integrations: {
    sms: boolean;
    email: boolean;
    payments: boolean;
    biometric: boolean;
    parentPortal: boolean;
    mobileApp: boolean;
  };
}

// Fallback Strategy
export interface FallbackStrategy {
  primary: DataSource;
  fallback: DataSource;
  autoFallback: boolean;
  fallbackTimeout: number; // milliseconds
  retryAttempts: number;
}

// Function Routing Configuration
export interface FunctionRouting {
  // Define which functions use which backend
  frontendOnly: string[]; // Functions that work with PouchDB/CouchDB only
  apiRequired: string[];  // Functions that require full backend API
  hybrid: string[];       // Functions that can work with both
}

// Backend Configurations
const BACKEND_CONFIGS: Record<BackendType, BackendConfig> = {
  'frontend-only': {
    type: 'frontend-only',
    dataSource: 'pouchdb',
    syncStrategy: 'direct-sync',
    endpoints: {
      couchdb: process.env.VITE_COUCHDB_URL || 'http://localhost:5984'
    },
    capabilities: {
      crud: {
        students: true,
        teachers: true,
        courses: true,
        grades: true,
        attendance: true,
        fees: true,
        library: true,
        inventory: true
      },
      advanced: {
        reporting: true,
        analytics: false,
        bulkOperations: true,
        dataExport: true,
        realTimeSync: true,
        offlineSupport: true,
        multiTenant: false,
        rbac: true
      },
      integrations: {
        sms: false,
        email: false,
        payments: false,
        biometric: false,
        parentPortal: false,
        mobileApp: false
      }
    },
    fallbackStrategy: {
      primary: 'pouchdb',
      fallback: 'pouchdb',
      autoFallback: false,
      fallbackTimeout: 5000,
      retryAttempts: 3
    }
  },
  
  'frappe-education': {
    type: 'frappe-education',
    dataSource: 'api',
    syncStrategy: 'api-sync',
    endpoints: {
      api: process.env.VITE_FRAPPE_API_URL || 'http://localhost:8000/api',
      auth: process.env.VITE_FRAPPE_AUTH_URL || 'http://localhost:8000/api/method/login'
    },
    capabilities: {
      crud: {
        students: true,
        teachers: true,
        courses: true,
        grades: true,
        attendance: true,
        fees: true,
        library: true,
        inventory: true
      },
      advanced: {
        reporting: true,
        analytics: true,
        bulkOperations: true,
        dataExport: true,
        realTimeSync: true,
        offlineSupport: false,
        multiTenant: true,
        rbac: true
      },
      integrations: {
        sms: true,
        email: true,
        payments: true,
        biometric: true,
        parentPortal: true,
        mobileApp: true
      }
    },
    fallbackStrategy: {
      primary: 'api',
      fallback: 'pouchdb',
      autoFallback: true,
      fallbackTimeout: 10000,
      retryAttempts: 3
    }
  },
  
  'custom-api': {
    type: 'custom-api',
    dataSource: 'api',
    syncStrategy: 'api-sync',
    endpoints: {
      api: process.env.VITE_CUSTOM_API_URL || 'http://localhost:3000/api',
      auth: process.env.VITE_CUSTOM_AUTH_URL || 'http://localhost:3000/auth'
    },
    capabilities: {
      crud: {
        students: true,
        teachers: true,
        courses: true,
        grades: true,
        attendance: true,
        fees: true,
        library: true,
        inventory: true
      },
      advanced: {
        reporting: true,
        analytics: true,
        bulkOperations: true,
        dataExport: true,
        realTimeSync: true,
        offlineSupport: true,
        multiTenant: true,
        rbac: true
      },
      integrations: {
        sms: true,
        email: true,
        payments: true,
        biometric: true,
        parentPortal: true,
        mobileApp: true
      }
    },
    fallbackStrategy: {
      primary: 'api',
      fallback: 'pouchdb',
      autoFallback: true,
      fallbackTimeout: 8000,
      retryAttempts: 5
    }
  },
  
  'hybrid': {
    type: 'hybrid',
    dataSource: 'hybrid',
    syncStrategy: 'hybrid-sync',
    endpoints: {
      api: process.env.VITE_API_URL || 'http://localhost:3000/api',
      couchdb: process.env.VITE_COUCHDB_URL || 'http://localhost:5984',
      auth: process.env.VITE_AUTH_URL || 'http://localhost:3000/auth'
    },
    capabilities: {
      crud: {
        students: true,
        teachers: true,
        courses: true,
        grades: true,
        attendance: true,
        fees: true,
        library: true,
        inventory: true
      },
      advanced: {
        reporting: true,
        analytics: true,
        bulkOperations: true,
        dataExport: true,
        realTimeSync: true,
        offlineSupport: true,
        multiTenant: true,
        rbac: true
      },
      integrations: {
        sms: true,
        email: true,
        payments: true,
        biometric: true,
        parentPortal: true,
        mobileApp: true
      }
    },
    fallbackStrategy: {
      primary: 'hybrid',
      fallback: 'pouchdb',
      autoFallback: true,
      fallbackTimeout: 7000,
      retryAttempts: 4
    }
  }
};

// Function Routing Definitions
export const FUNCTION_ROUTING: FunctionRouting = {
  // Functions that work perfectly with frontend-only (PouchDB/CouchDB)
  frontendOnly: [
    'student.crud',
    'teacher.crud',
    'course.crud',
    'grade.basic',
    'attendance.basic',
    'library.basic',
    'inventory.basic',
    'reports.basic',
    'offline.sync',
    'data.export.basic'
  ],
  
  // Functions that require full backend API
  apiRequired: [
    'sms.send',
    'email.send',
    'payments.process',
    'biometric.verify',
    'analytics.advanced',
    'reports.advanced',
    'multi-tenant.manage',
    'integrations.external',
    'bulk.operations.large',
    'real-time.notifications'
  ],
  
  // Functions that can work with both (intelligent routing)
  hybrid: [
    'grade.calculate',
    'attendance.reports',
    'fee.management',
    'library.advanced',
    'inventory.reports',
    'student.reports',
    'teacher.reports',
    'data.export.advanced',
    'rbac.permissions',
    'user.management'
  ]
};

const BACKEND_STORAGE_KEY = 'schoolpilot-backend-type';

// Backend Detection and Configuration
export class BackendArchitectureManager {
  private currentConfig: BackendConfig;
  private detectedBackend: BackendType;
  
  constructor() {
    this.detectedBackend = this.detectBackendType();
    this.currentConfig = BACKEND_CONFIGS[this.detectedBackend];
  }
  
  /**
   * Detect the current backend type based on environment and availability
   */
  private detectBackendType(): BackendType {
    if (process.env.VITE_BACKEND_TYPE) {
      return process.env.VITE_BACKEND_TYPE as BackendType;
    }

    if (typeof window !== 'undefined') {
      const storedBackend = window.localStorage.getItem(BACKEND_STORAGE_KEY) as BackendType | null;
      if (storedBackend && BACKEND_CONFIGS[storedBackend]) {
        return storedBackend;
      }
    }
    
    return 'frontend-only';
  }
  
  /**
   * Get current backend configuration
   */
  public getConfig(): BackendConfig {
    return this.currentConfig;
  }
  
  /**
   * Check if a function should use API or local database
   */
  public shouldUseAPI(functionName: string): boolean {
    const config = this.getConfig();
    
    // If backend is frontend-only, never use API
    if (config.type === 'frontend-only') {
      return false;
    }
    
    // If function requires API, use API
    if (FUNCTION_ROUTING.apiRequired.includes(functionName)) {
      return true;
    }
    
    // If function is frontend-only, use local database
    if (FUNCTION_ROUTING.frontendOnly.includes(functionName)) {
      return false;
    }
    
    // For hybrid functions, check backend availability and capabilities
    if (FUNCTION_ROUTING.hybrid.includes(functionName)) {
      return this.isBackendAvailable() && config.dataSource !== 'pouchdb';
    }
    
    // Default to API if available, otherwise local
    return this.isBackendAvailable();
  }
  
  /**
   * Check if backend API is available
   */
  public async isBackendAvailable(): Promise<boolean> {
    const config = this.getConfig();
    
    if (!config.endpoints.api) {
      return false;
    }
    
    try {
      const response = await fetch(`${config.endpoints.api}/health`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      logger.warn('Backend API not available:', error);
      return false;
    }
  }
  
  /**
   * Get the appropriate data source for a function
   */
  public getDataSource(functionName: string): DataSource {
    if (this.shouldUseAPI(functionName)) {
      return 'api';
    }
    return 'pouchdb';
  }
  
  /**
   * Switch backend type (for testing or configuration)
   */
  public switchBackend(backendType: BackendType): void {
    this.detectedBackend = backendType;
    this.currentConfig = BACKEND_CONFIGS[backendType];

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BACKEND_STORAGE_KEY, backendType);
    }
  }
  
  /**
   * Get capabilities for current backend
   */
  public getCapabilities(): BackendCapabilities {
    return this.currentConfig.capabilities;
  }
  
  /**
   * Check if a specific capability is available
   */
  public hasCapability(category: keyof BackendCapabilities, capability: string): boolean {
    const capabilities = this.getCapabilities();
    return (capabilities[category] as any)[capability] === true;
  }
}

// Export singleton instance
export const backendArchitecture = new BackendArchitectureManager();

// Export configurations for external use
export { BACKEND_CONFIGS };

// Helper functions
export const isApiFunction = (functionName: string): boolean => {
  return FUNCTION_ROUTING.apiRequired.includes(functionName);
};

export const isFrontendOnlyFunction = (functionName: string): boolean => {
  return FUNCTION_ROUTING.frontendOnly.includes(functionName);
};

export const isHybridFunction = (functionName: string): boolean => {
  return FUNCTION_ROUTING.hybrid.includes(functionName);
};
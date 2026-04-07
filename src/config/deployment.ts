/**
 * Deployment Mode Configuration
 * 
 * SchoolPilot3 is a SINGLE-TENANT frontend app.
 * Each instance serves ONE school and can connect to various backends.
 * 
 * Modes:
 * - standalone: No backend, local SQLite only
 * - networked: LAN server for multi-computer setup
 * - hosted: Connect to self-hosted backend API
 * - saas: Connect to SchoolPilot SaaS backend (backend is multi-tenant, this app is not)
 * - erpnext: Connect to ERPNext instance
 * - demo: Mock data for testing
 */

import type { DeploymentMode } from '@/services/data/types';

export interface DeploymentConfig {
  mode: DeploymentMode;
  name: string;
  description: string;
  provider: 'sqlite' | 'pouchdb' | 'backend-api' | 'mock';
  features: {
    multiUser: boolean;
    realTimeSync: boolean;
    offlineMode: boolean;
    autoDiscovery: boolean;
    backupExport: boolean;
  };
  network: {
    requiresInternet: boolean;
    requiresLAN: boolean;
    allowsOffline: boolean;
  };
  storage: {
    type: 'local' | 'remote' | 'hybrid';
    persistent: boolean;
    encryption: boolean;
  };
}

export const deploymentConfigs: Record<DeploymentMode, DeploymentConfig> = {
  standalone: {
    mode: 'standalone',
    name: 'Standalone',
    description: 'Single computer, no network required',
    provider: 'sqlite',
    features: {
      multiUser: false,
      realTimeSync: false,
      offlineMode: true,
      autoDiscovery: false,
      backupExport: true
    },
    network: {
      requiresInternet: false,
      requiresLAN: false,
      allowsOffline: true
    },
    storage: {
      type: 'local',
      persistent: true,
      encryption: true
    }
  },

  networked: {
    mode: 'networked',
    name: 'Networked',
    description: 'Multiple computers on local network',
    provider: 'pouchdb',
    features: {
      multiUser: true,
      realTimeSync: true,
      offlineMode: true,
      autoDiscovery: true,
      backupExport: true
    },
    network: {
      requiresInternet: false,
      requiresLAN: true,
      allowsOffline: true
    },
    storage: {
      type: 'hybrid',
      persistent: true,
      encryption: false
    }
  },

  hosted: {
    mode: 'hosted',
    name: 'Hosted',
    description: 'School server deployment',
    provider: 'backend-api',
    features: {
      multiUser: true,
      realTimeSync: true,
      offlineMode: false,
      autoDiscovery: false,
      backupExport: true
    },
    network: {
      requiresInternet: false,
      requiresLAN: false,
      allowsOffline: false
    },
    storage: {
      type: 'remote',
      persistent: true,
      encryption: true
    }
  },

  saas: {
    mode: 'saas',
    name: 'SaaS Connect',
    description: 'Connect to SchoolPilot SaaS backend (this app remains single-tenant)',
    provider: 'pouchdb',
    features: {
      multiUser: true,
      realTimeSync: true,
      offlineMode: true,
      autoDiscovery: false,
      backupExport: true
    },
    network: {
      requiresInternet: true,
      requiresLAN: false,
      allowsOffline: true
    },
    storage: {
      type: 'hybrid',
      persistent: true,
      encryption: true
    }
  },

  erpnext: {
    mode: 'erpnext',
    name: 'ERPNext',
    description: 'Integration with ERPNext',
    provider: 'pouchdb',
    features: {
      multiUser: true,
      realTimeSync: true,
      offlineMode: true,
      autoDiscovery: false,
      backupExport: false
    },
    network: {
      requiresInternet: true,
      requiresLAN: false,
      allowsOffline: true
    },
    storage: {
      type: 'hybrid',
      persistent: true,
      encryption: false
    }
  },

  demo: {
    mode: 'demo',
    name: 'Demo',
    description: 'Demonstration mode with mock data',
    provider: 'mock',
    features: {
      multiUser: false,
      realTimeSync: false,
      offlineMode: true,
      autoDiscovery: false,
      backupExport: false
    },
    network: {
      requiresInternet: false,
      requiresLAN: false,
      allowsOffline: true
    },
    storage: {
      type: 'local',
      persistent: false,
      encryption: false
    }
  }
};

/**
 * Get configuration for a deployment mode
 */
export function getDeploymentConfig(mode: DeploymentMode): DeploymentConfig {
  return deploymentConfigs[mode];
}

/**
 * Detect the best deployment mode for current environment
 */
export function detectDeploymentMode(): DeploymentMode {
  // Check for server environment
  if (typeof window === 'undefined') {
    return 'hosted';
  }

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('mode') as DeploymentMode;
  
  if (modeParam && deploymentConfigs[modeParam]) {
    return modeParam;
  }

  // Check localStorage for saved mode
  const savedMode = localStorage.getItem('deployment_mode') as DeploymentMode;
  if (savedMode && deploymentConfigs[savedMode]) {
    return savedMode;
  }

  // Default to demo for development, standalone for production
  if (process.env.NODE_ENV === 'development') {
    return 'demo';
  }

  return 'standalone';
}

/**
 * Save deployment mode preference
 */
export function saveDeploymentMode(mode: DeploymentMode): void {
  localStorage.setItem('deployment_mode', mode);
}

/**
 * Check if a feature is available in current mode
 */
export function isFeatureAvailable(mode: DeploymentMode, feature: keyof DeploymentConfig['features']): boolean {
  return deploymentConfigs[mode].features[feature];
}

export default deploymentConfigs;

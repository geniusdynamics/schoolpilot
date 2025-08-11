/**
 * Production Demo Configuration
 * Manages production demo capabilities and live mode transitions
 */

import { Environment, DataMode } from './environmentMatrix';

// Production Demo Configuration
export interface ProductionDemoConfig {
  enabled: boolean;
  allowTransitionToLive: boolean;
  demoDataRetentionDays: number;
  maxDemoSessions: number;
  autoCleanup: boolean;
  features: {
    limitedDataAccess: boolean;
    readOnlyMode: boolean;
    timeBasedExpiry: boolean;
    userSessionTracking: boolean;
  };
}

// Production Demo State
export interface ProductionDemoState {
  active: boolean;
  sessionId?: string;
  startTime?: Date;
  expiryTime?: Date;
  canTransitionToLive: boolean;
  dataCleared: boolean;
  userCount: number;
}

// Storage keys
const PRODUCTION_DEMO_CONFIG_KEY = 'production_demo_config';
const PRODUCTION_DEMO_STATE_KEY = 'production_demo_state';
const PRODUCTION_DEMO_SESSION_KEY = 'production_demo_session';

// Default production demo configuration
const DEFAULT_PRODUCTION_DEMO_CONFIG: ProductionDemoConfig = {
  enabled: false,
  allowTransitionToLive: true,
  demoDataRetentionDays: 7,
  maxDemoSessions: 100,
  autoCleanup: true,
  features: {
    limitedDataAccess: true,
    readOnlyMode: false,
    timeBasedExpiry: true,
    userSessionTracking: true,
  },
};

// Default production demo state
const DEFAULT_PRODUCTION_DEMO_STATE: ProductionDemoState = {
  active: false,
  canTransitionToLive: true,
  dataCleared: false,
  userCount: 0,
};

// Get production demo configuration
export const getProductionDemoConfig = (environment: Environment): ProductionDemoConfig => {
  // Only enable in production environment
  if (environment !== 'production') {
    return {
      ...DEFAULT_PRODUCTION_DEMO_CONFIG,
      enabled: false,
      allowTransitionToLive: false,
    };
  }
  
  if (typeof window === 'undefined') {
    return DEFAULT_PRODUCTION_DEMO_CONFIG;
  }
  
  try {
    const stored = localStorage.getItem(PRODUCTION_DEMO_CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored) as ProductionDemoConfig;
      return { ...DEFAULT_PRODUCTION_DEMO_CONFIG, ...config };
    }
  } catch {
    // Ignore parsing errors
  }
  
  return DEFAULT_PRODUCTION_DEMO_CONFIG;
};

// Get production demo state
export const getProductionDemoState = (): ProductionDemoState => {
  if (typeof window === 'undefined') {
    return DEFAULT_PRODUCTION_DEMO_STATE;
  }
  
  try {
    const stored = localStorage.getItem(PRODUCTION_DEMO_STATE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as ProductionDemoState;
      // Parse dates
      if (state.startTime) {
        state.startTime = new Date(state.startTime);
      }
      if (state.expiryTime) {
        state.expiryTime = new Date(state.expiryTime);
      }
      return { ...DEFAULT_PRODUCTION_DEMO_STATE, ...state };
    }
  } catch {
    // Ignore parsing errors
  }
  
  return DEFAULT_PRODUCTION_DEMO_STATE;
};

// Store production demo state
const storeProductionDemoState = (state: ProductionDemoState): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(PRODUCTION_DEMO_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

// Generate session ID
const generateSessionId = (): string => {
  return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Initialize production demo
export const initializeProductionDemo = async (
  environment: Environment,
  dataMode: DataMode,
  options: {
    sessionDurationHours?: number;
    clearExistingData?: boolean;
  } = {}
): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
  const { sessionDurationHours = 24, clearExistingData = true } = options;
  
  // Check if production demo is allowed
  const config = getProductionDemoConfig(environment);
  if (!config.enabled) {
    return {
      success: false,
      error: 'Production demo is not enabled for this environment',
    };
  }
  
  // Check if we're in the right data mode
  if (dataMode !== 'demo') {
    return {
      success: false,
      error: 'Production demo can only be initialized in demo data mode',
    };
  }
  
  try {
    const sessionId = generateSessionId();
    const startTime = new Date();
    const expiryTime = new Date(startTime.getTime() + sessionDurationHours * 60 * 60 * 1000);
    
    const newState: ProductionDemoState = {
      active: true,
      sessionId,
      startTime,
      expiryTime,
      canTransitionToLive: config.allowTransitionToLive,
      dataCleared: clearExistingData,
      userCount: 1,
    };
    
    storeProductionDemoState(newState);
    
    // Store session info
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRODUCTION_DEMO_SESSION_KEY, sessionId);
    }
    
    return {
      success: true,
      sessionId,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to initialize production demo: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Transition to live mode
export const transitionToLiveMode = async (
  environment: Environment,
  options: {
    preserveDemoData?: boolean;
    skipConfirmation?: boolean;
  } = {}
): Promise<{ success: boolean; error?: string }> => {
  const { preserveDemoData = false, skipConfirmation = false } = options;
  
  const state = getProductionDemoState();
  const config = getProductionDemoConfig(environment);
  
  // Check if transition is allowed
  if (!state.active) {
    return {
      success: false,
      error: 'No active production demo session to transition from',
    };
  }
  
  if (!config.allowTransitionToLive || !state.canTransitionToLive) {
    return {
      success: false,
      error: 'Transition to live mode is not allowed',
    };
  }
  
  // In a real implementation, this would show a confirmation dialog
  if (!skipConfirmation && environment === 'production') {
    // Assume confirmation is given for now
  }
  
  try {
    // Clear demo state
    const clearedState: ProductionDemoState = {
      ...DEFAULT_PRODUCTION_DEMO_STATE,
      dataCleared: !preserveDemoData,
    };
    
    storeProductionDemoState(clearedState);
    
    // Clear session info
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PRODUCTION_DEMO_SESSION_KEY);
    }
    
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to transition to live mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

// Check if production demo session is expired
export const isProductionDemoExpired = (): boolean => {
  const state = getProductionDemoState();
  
  if (!state.active || !state.expiryTime) {
    return false;
  }
  
  return new Date() > state.expiryTime;
};

// Extend production demo session
export const extendProductionDemoSession = (additionalHours: number): boolean => {
  const state = getProductionDemoState();
  
  if (!state.active || !state.expiryTime) {
    return false;
  }
  
  try {
    const newExpiryTime = new Date(state.expiryTime.getTime() + additionalHours * 60 * 60 * 1000);
    const updatedState: ProductionDemoState = {
      ...state,
      expiryTime: newExpiryTime,
    };
    
    storeProductionDemoState(updatedState);
    return true;
  } catch {
    return false;
  }
};

// Clean up expired demo sessions
export const cleanupExpiredDemoSessions = (): void => {
  if (isProductionDemoExpired()) {
    const clearedState: ProductionDemoState = {
      ...DEFAULT_PRODUCTION_DEMO_STATE,
      dataCleared: true,
    };
    
    storeProductionDemoState(clearedState);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PRODUCTION_DEMO_SESSION_KEY);
    }
  }
};
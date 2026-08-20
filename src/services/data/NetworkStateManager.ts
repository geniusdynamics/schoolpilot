import { logger } from '@/utils/logging';

// Network state management and backend connectivity monitoring
export interface NetworkState {
  isOnline: boolean;
  backendAvailable: boolean;
  latency: number | null;
  lastCheck: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface BackendHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: 'up' | 'down';
    auth: 'up' | 'down';
    storage: 'up' | 'down';
  };
}

export class NetworkStateManager {
  private static instance: NetworkStateManager;
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private state: NetworkState = {
    isOnline: navigator.onLine,
    backendAvailable: false,
    latency: null,
    lastCheck: new Date(),
    connectionQuality: navigator.onLine ? 'good' : 'offline' // Default to good if online
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
  private readonly isDemoMode: boolean = this.checkDemoMode();

  static getInstance(): NetworkStateManager {
    if (!NetworkStateManager.instance) {
      NetworkStateManager.instance = new NetworkStateManager();
    }
    return NetworkStateManager.instance;
  }

  private constructor() {
    this.setupNetworkListeners();
    
    // In demo mode, treat as online with good connection
    if (this.isDemoMode) {
      this.updateState({
        isOnline: navigator.onLine,
        backendAvailable: false, // No backend in demo mode
        connectionQuality: navigator.onLine ? 'good' : 'offline',
        latency: null,
        lastCheck: new Date()
      });
    } else {
      this.startBackendHealthCheck();
      // Initial health check
      this.checkBackendHealth();
    }
  }
  
  private checkDemoMode(): boolean {
    try {
      // Check if we're in demo mode based on app configuration
      const isDemoBuild = import.meta.env.MODE === 'development' || 
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
      
      // Also check if there's an app mode setting (UnifiedAppConfig uses dataMode/demo.active)
      const storedConfig = localStorage.getItem('app-config') || localStorage.getItem('schoolpilot_config');
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig);
          if (config.dataMode === 'demo' || config.mode === 'demo' || config.demo?.active === true) {
            return true;
          }
        } catch {}
      }
      // Also check unified config manager if available
      try {
        const { unifiedConfigManager } = require('@/config/unifiedConfig');
        const cfg: any = unifiedConfigManager.getConfig?.();
        if (cfg?.dataMode === 'demo' || cfg?.demo?.active) return true;
      } catch {}
      
      return isDemoBuild;
    } catch (error) {
      logger.warn('Error checking demo mode:', error);
      return true; // Default to demo mode if unsure
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.updateState({ 
      isOnline: true,
      connectionQuality: this.isDemoMode ? 'good' : 'poor' // Good for demo, poor until health check completes
    });
    // Only check backend health if not in demo mode
    if (!this.isDemoMode) {
      this.checkBackendHealth();
    }
  }

  private handleOffline(): void {
    this.updateState({ 
      isOnline: false, 
      backendAvailable: false,
      connectionQuality: 'offline'
    });
  }

  private startBackendHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (this.state.isOnline) {
        this.checkBackendHealth();
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async checkBackendHealth(): Promise<boolean> {
    if (!this.state.isOnline) {
      return false;
    }

    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      const available = response.ok;

      let healthData: BackendHealthResponse | null = null;
      if (available) {
        try {
          healthData = await response.json();
          // Use healthData for future health monitoring features
          logger.info('Backend health:', healthData);
        } catch (e) {
          // Health endpoint might not return JSON
        }
      }

      const connectionQuality = this.determineConnectionQuality(latency, available);

      this.updateState({
        backendAvailable: available,
        latency,
        lastCheck: new Date(),
        connectionQuality
      });

      return available;
    } catch (error) {
      logger.warn('Backend health check failed:', error);
      this.updateState({
        backendAvailable: false,
        latency: null,
        lastCheck: new Date(),
        connectionQuality: this.state.isOnline ? 'poor' : 'offline'
      });
      return false;
    }
  }

  private determineConnectionQuality(
    latency: number, 
    available: boolean
  ): NetworkState['connectionQuality'] {
    // If offline, always return offline
    if (!this.state.isOnline) return 'offline';
    
    // In demo mode, don't depend on backend availability for connection quality
    if (this.isDemoMode) {
      return this.state.isOnline ? 'good' : 'offline';
    }
    
    // In production mode, consider backend availability
    if (!available) return 'poor'; // Changed from 'offline' to 'poor'
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  }

  private updateState(updates: Partial<NetworkState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Notify listeners if state changed
    if (JSON.stringify(previousState) !== JSON.stringify(this.state)) {
      this.listeners.forEach(listener => listener(this.state));
    }
  }

  public subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): NetworkState {
    return { ...this.state };
  }

  public async forceHealthCheck(): Promise<boolean> {
    return this.checkBackendHealth();
  }

  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    this.listeners.clear();
  }
}
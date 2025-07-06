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
    connectionQuality: 'offline'
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

  static getInstance(): NetworkStateManager {
    if (!NetworkStateManager.instance) {
      NetworkStateManager.instance = new NetworkStateManager();
    }
    return NetworkStateManager.instance;
  }

  private constructor() {
    this.setupNetworkListeners();
    this.startBackendHealthCheck();
    // Initial health check
    this.checkBackendHealth();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.updateState({ isOnline: true });
    // Immediately check backend when coming online
    this.checkBackendHealth();
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
      console.warn('Backend health check failed:', error);
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
    if (!available || !this.state.isOnline) return 'offline';
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
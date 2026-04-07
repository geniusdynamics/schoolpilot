/**
 * Backend Detection Service
 * Handles backend environment detection, status checking, and availability monitoring
 */

import { BackendStatus, BACKEND_STATUS_CACHE_KEY, CACHE_DURATION } from '../../config/unifiedConfig';

export interface BackendDetectionOptions {
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
}

const DEFAULT_OPTIONS: Required<BackendDetectionOptions> = {
  timeout: 5000,
  retries: 2,
  cacheEnabled: true,
};

/**
 * Backend Detection Service Class
 */
export class BackendDetectionService {
  private static instance: BackendDetectionService;
  private cache: Map<string, { data: BackendStatus; timestamp: number }> = new Map();
  private listeners: Set<(status: BackendStatus) => void> = new Set();

  private constructor() {}

  public static getInstance(): BackendDetectionService {
    if (!BackendDetectionService.instance) {
      BackendDetectionService.instance = new BackendDetectionService();
    }
    return BackendDetectionService.instance;
  }

  /**
   * Detect backend environment and capabilities
   */
  public async detectBackend(
    baseUrl: string,
    options: BackendDetectionOptions = {}
  ): Promise<BackendStatus> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cacheKey = `${baseUrl}_status`;

    // Check cache first
    if (opts.cacheEnabled) {
      const cached = this.getCachedStatus(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const status = await this.performDetection(baseUrl, opts);
      
      // Cache the result
      if (opts.cacheEnabled) {
        this.setCachedStatus(cacheKey, status);
      }

      // Notify listeners
      this.notifyListeners(status);
      
      return status;
    } catch (error) {
      console.error('Backend detection failed:', error);
      
      const fallbackStatus: BackendStatus = {
        environment: 'unknown',
        version: 'unknown',
        demoModeEnabled: false,
        available: false,
      };

      this.notifyListeners(fallbackStatus);
      return fallbackStatus;
    }
  }

  /**
   * Perform actual backend detection with retries
   */
  private async performDetection(
    baseUrl: string,
    options: Required<BackendDetectionOptions>
  ): Promise<BackendStatus> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return await this.singleDetectionAttempt(baseUrl, options.timeout);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < options.retries) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Backend detection failed after retries');
  }

  /**
   * Single detection attempt
   */
  private async singleDetectionAttempt(
    baseUrl: string,
    timeout: number
  ): Promise<BackendStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Try multiple endpoints to detect backend
      const endpoints = [
        '/api/status',
        '/api/health',
        '/status',
        '/health',
        '/api/v1/status'
      ];

      let response: Response | null = null;
      let responseData: any = null;

      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          if (response.ok) {
            responseData = await response.json();
            break;
          }
        } catch (endpointError) {
          // Continue to next endpoint
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Backend not available at ${baseUrl}`);
      }

      // Parse response data
      const status = this.parseBackendResponse(responseData);
      return {
        ...status,
        available: true,
      };

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse backend response to extract status information
   */
  private parseBackendResponse(data: any): Omit<BackendStatus, 'available'> {
    // Default values
    let environment: 'development' | 'production' | 'unknown' = 'unknown';
    let version = 'unknown';
    let demoModeEnabled = false;

    if (data && typeof data === 'object') {
      // Check for environment
      if (data.environment) {
        environment = ['development', 'production'].includes(data.environment) 
          ? data.environment 
          : 'unknown';
      } else if (data.env) {
        environment = ['development', 'production'].includes(data.env) 
          ? data.env 
          : 'unknown';
      } else if (data.NODE_ENV) {
        environment = data.NODE_ENV === 'development' ? 'development' : 'production';
      }

      // Check for version
      if (data.version) {
        version = String(data.version);
      } else if (data.appVersion) {
        version = String(data.appVersion);
      }

      // Check for demo mode capability
      if (typeof data.demoModeEnabled === 'boolean') {
        demoModeEnabled = data.demoModeEnabled;
      } else if (typeof data.demo === 'boolean') {
        demoModeEnabled = data.demo;
      } else if (typeof data.mockData === 'boolean') {
        demoModeEnabled = data.mockData;
      } else if (environment === 'development') {
        // Development environments typically support demo mode
        demoModeEnabled = true;
      }
    }

    return {
      environment,
      version,
      demoModeEnabled,
    };
  }

  /**
   * Check if backend is available (simple ping)
   */
  public async isBackendAvailable(
    baseUrl: string,
    timeout: number = 3000
  ): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get cached status if available and not expired
   */
  private getCachedStatus(key: string): BackendStatus | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached status
   */
  private setCachedStatus(key: string, status: BackendStatus): void {
    this.cache.set(key, {
      data: status,
      timestamp: Date.now(),
    });

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(BACKEND_STATUS_CACHE_KEY, JSON.stringify({
        [key]: {
          data: status,
          timestamp: Date.now(),
        },
      }));
    } catch (error) {
      console.warn('Failed to cache backend status in localStorage:', error);
    }
  }

  /**
   * Clear all cached statuses
   */
  public clearCache(): void {
    this.cache.clear();
    try {
      localStorage.removeItem(BACKEND_STATUS_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear backend status cache:', error);
    }
  }

  /**
   * Subscribe to backend status changes
   */
  public subscribe(listener: (status: BackendStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status changes
   */
  private notifyListeners(status: BackendStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in backend status listener:', error);
      }
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load cached status from localStorage on initialization
   */
  public loadPersistedCache(): void {
    try {
      const stored = localStorage.getItem(BACKEND_STATUS_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (value && value.data && value.timestamp) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted backend cache:', error);
    }
  }
}

// Export singleton instance
export const backendDetectionService = BackendDetectionService.getInstance();

// Initialize persisted cache
backendDetectionService.loadPersistedCache();

// Utility functions
export const detectBackend = (baseUrl: string, options?: BackendDetectionOptions) => 
  backendDetectionService.detectBackend(baseUrl, options);

export const isBackendAvailable = (baseUrl: string, timeout?: number) => 
  backendDetectionService.isBackendAvailable(baseUrl, timeout);
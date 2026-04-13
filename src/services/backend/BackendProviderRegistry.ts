/**
 * Backend Provider Registry
 * 
 * Central registry for managing backend provider plugins.
 * Handles provider registration, discovery, and lifecycle.
 */

import type { IBackendProvider, BackendProviderMetadata } from './IBackendProvider';
import type { BackendType } from './types';
import { logger } from '@/utils/logging';

/**
 * Event emitted when a provider is registered
 */
export interface ProviderRegisteredEvent {
  providerId: string;
  providerName: string;
  type: BackendType;
}

/**
 * Event emitted when active provider changes
 */
export interface ActiveProviderChangedEvent {
  previousProviderId: string | null;
  newProviderId: string;
  provider: IBackendProvider;
}

/**
 * Registry for backend providers
 * 
 * Manages the lifecycle of backend provider plugins and maintains
 * the active provider for data operations.
 */
export class BackendProviderRegistry {
  private static instance: BackendProviderRegistry | null = null;
  
  private providers = new Map<string, IBackendProvider>();
  private metadata = new Map<string, BackendProviderMetadata>();
  private activeProvider: IBackendProvider | null = null;
  private activeProviderId: string | null = null;
  
  private eventListeners = new Map<string, Set<Function>>();
  
  private constructor() {
    logger.info('[BackendProviderRegistry] Initialized');
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): BackendProviderRegistry {
    if (!BackendProviderRegistry.instance) {
      BackendProviderRegistry.instance = new BackendProviderRegistry();
    }
    return BackendProviderRegistry.instance;
  }
  
  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    BackendProviderRegistry.instance = null;
  }
  
  // ============================================================================
  // Provider Registration
  // ============================================================================
  
  /**
   * Register a backend provider
   * @param provider Provider instance
   * @param metadata Optional metadata
   */
  register(provider: IBackendProvider, metadata?: Partial<BackendProviderMetadata>): void {
    if (this.providers.has(provider.id)) {
      logger.warn(`[BackendProviderRegistry] Provider ${provider.id} already registered, replacing`);
    }
    
    this.providers.set(provider.id, provider);
    
    // Store metadata
    const fullMetadata: BackendProviderMetadata = {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      description: metadata?.description || '',
      version: provider.version,
      factory: metadata?.factory || (() => provider),
      configSchema: metadata?.configSchema,
    };
    
    this.metadata.set(provider.id, fullMetadata);
    
    logger.info(`[BackendProviderRegistry] Registered provider: ${provider.name} (${provider.id})`);
    
    // Emit event
    this.emit('provider:registered', {
      providerId: provider.id,
      providerName: provider.name,
      type: provider.type,
    } as ProviderRegisteredEvent);
    
    // If no active provider, set this as active
    if (!this.activeProvider) {
      this.setActive(provider.id);
    }
  }
  
  /**
   * Unregister a backend provider
   * @param providerId Provider ID
   */
  async unregister(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      logger.warn(`[BackendProviderRegistry] Provider ${providerId} not found`);
      return;
    }
    
    // If this is the active provider, clear it
    if (this.activeProviderId === providerId) {
      this.activeProvider = null;
      this.activeProviderId = null;
    }
    
    // Disconnect provider
    try {
      await provider.disconnect();
    } catch (error) {
      logger.error(`[BackendProviderRegistry] Error disconnecting provider ${providerId}:`, error);
    }
    
    this.providers.delete(providerId);
    this.metadata.delete(providerId);
    
    logger.info(`[BackendProviderRegistry] Unregistered provider: ${providerId}`);
    
    this.emit('provider:unregistered', { providerId });
  }
  
  // ============================================================================
  // Provider Access
  // ============================================================================
  
  /**
   * Get a provider by ID
   * @param providerId Provider ID
   * @returns Provider instance or undefined
   */
  get(providerId: string): IBackendProvider | undefined {
    return this.providers.get(providerId);
  }
  
  /**
   * Get all registered providers
   * @returns Array of provider instances
   */
  getAll(): IBackendProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get providers by type
   * @param type Backend type
   * @returns Array of matching providers
   */
  getByType(type: BackendType): IBackendProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === type);
  }
  
  /**
   * Get provider metadata
   * @param providerId Provider ID
   * @returns Provider metadata or undefined
   */
  getMetadata(providerId: string): BackendProviderMetadata | undefined {
    return this.metadata.get(providerId);
  }
  
  /**
   * Get all provider metadata
   * @returns Array of provider metadata
   */
  getAllMetadata(): BackendProviderMetadata[] {
    return Array.from(this.metadata.values());
  }
  
  /**
   * Check if a provider is registered
   * @param providerId Provider ID
   * @returns True if registered
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }
  
  // ============================================================================
  // Active Provider Management
  // ============================================================================
  
  /**
   * Set the active backend provider
   * @param providerId Provider ID
   * @throws Error if provider not found
   */
  setActive(providerId: string): void {
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    const previousProviderId = this.activeProviderId;
    
    this.activeProvider = provider;
    this.activeProviderId = providerId;
    
    logger.info(`[BackendProviderRegistry] Active provider set to: ${provider.name} (${providerId})`);
    
    // Emit event
    this.emit('provider:active:changed', {
      previousProviderId,
      newProviderId: providerId,
      provider,
    } as ActiveProviderChangedEvent);
  }
  
  /**
   * Get the active backend provider
   * @returns Active provider or null
   */
  getActive(): IBackendProvider | null {
    return this.activeProvider;
  }
  
  /**
   * Get the active provider ID
   * @returns Active provider ID or null
   */
  getActiveId(): string | null {
    return this.activeProviderId;
  }
  
  /**
   * Check if there is an active provider
   * @returns True if active provider exists
   */
  hasActive(): boolean {
    return this.activeProvider !== null;
  }
  
  /**
   * Clear the active provider
   */
  clearActive(): void {
    const previousProviderId = this.activeProviderId;
    
    this.activeProvider = null;
    this.activeProviderId = null;
    
    logger.info('[BackendProviderRegistry] Active provider cleared');
    
    this.emit('provider:active:cleared', { previousProviderId });
  }
  
  // ============================================================================
  // Provider Discovery
  // ============================================================================
  
  /**
   * Find providers that support a specific entity
   * @param entity Entity name
   * @returns Array of matching providers
   */
  findByEntity(entity: string): IBackendProvider[] {
    return Array.from(this.providers.values()).filter(p => p.supportsEntity(entity));
  }
  
  /**
   * Find providers with specific capabilities
   * @param requiredCapabilities Capabilities to check
   * @returns Array of matching providers
   */
  findByCapabilities(requiredCapabilities: Partial<Record<keyof import('./types').BackendCapabilities, boolean>>): IBackendProvider[] {
    return Array.from(this.providers.values()).filter(provider => {
      const capabilities = provider.getCapabilities();
      
      for (const [key, required] of Object.entries(requiredCapabilities)) {
        if (required && !capabilities[key as keyof typeof capabilities]) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // ============================================================================
  // Health Checks
  // ============================================================================
  
  /**
   * Check health of all registered providers
   * @returns Map of provider IDs to health status
   */
  async checkAllHealth(): Promise<Map<string, import('./types').BackendStatus>> {
    const results = new Map<string, import('./types').BackendStatus>();
    
    for (const [id, provider] of this.providers) {
      try {
        const status = await provider.healthCheck();
        results.set(id, status);
      } catch (error) {
        logger.error(`[BackendProviderRegistry] Health check failed for ${id}:`, error);
        results.set(id, {
          connected: false,
          authenticated: false,
          pendingChanges: 0,
          error: {
            code: 'HEALTH_CHECK_FAILED',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
    
    return results;
  }
  
  /**
   * Check health of active provider
   * @returns Health status or null if no active provider
   */
  async checkActiveHealth(): Promise<import('./types').BackendStatus | null> {
    if (!this.activeProvider) {
      return null;
    }
    
    try {
      return await this.activeProvider.healthCheck();
    } catch (error) {
      logger.error('[BackendProviderRegistry] Active provider health check failed:', error);
      return {
        connected: false,
        authenticated: false,
        pendingChanges: 0,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
  
  // ============================================================================
  // Event System
  // ============================================================================
  
  /**
   * Subscribe to registry events
   * @param event Event name
   * @param callback Event callback
   * @returns Unsubscribe function
   */
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
  
  /**
   * Emit a registry event
   * @param event Event name
   * @param data Event data
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`[BackendProviderRegistry] Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  // ============================================================================
  // Utility Methods
  // ============================================================================
  
  /**
   * Get registry statistics
   * @returns Registry stats
   */
  getStats(): {
    totalProviders: number;
    activeProvider: string | null;
    providersByType: Record<string, number>;
  } {
    const providersByType: Record<string, number> = {};
    
    for (const provider of this.providers.values()) {
      providersByType[provider.type] = (providersByType[provider.type] || 0) + 1;
    }
    
    return {
      totalProviders: this.providers.size,
      activeProvider: this.activeProviderId,
      providersByType,
    };
  }
  
  /**
   * Clear all providers (for testing)
   */
  clear(): void {
    this.providers.clear();
    this.metadata.clear();
    this.activeProvider = null;
    this.activeProviderId = null;
    this.eventListeners.clear();
    
    logger.info('[BackendProviderRegistry] Cleared all providers');
  }
}

// Export singleton instance getter
export const getBackendProviderRegistry = BackendProviderRegistry.getInstance;

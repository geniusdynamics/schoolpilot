/**
 * Sync Manager
 * 
 * Central coordinator for all sync operations.
 * Manages background sync, bandwidth optimization, and conflict resolution.
 */

import type { DataProvider } from '../data/types';
import type { Conflict, ConflictResolution, ConflictResolutionStrategy } from '../backend/types';
import { ConflictResolver } from './ConflictResolver';

export interface SyncManagerConfig {
  // Sync settings
  autoSync: boolean;
  syncInterval: number;  // seconds
  retryInterval: number;  // seconds
  maxRetries: number;
  
  // Bandwidth optimization
  compressionEnabled: boolean;
  compressionThreshold: number;  // bytes
  skipAttachmentsOnSlowConnection: boolean;
  
  // Conflict resolution
  conflictStrategy: ConflictResolutionStrategy;
  entityStrategies: Record<string, ConflictResolutionStrategy>;
  
  // Network awareness
  syncOnMobile: boolean;
  syncOnWifiOnly: boolean;
  minBatteryLevel: number;  // percentage
}

export interface SyncStats {
  lastSync: Date | null;
  nextSync: Date | null;
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  conflictsDetected: number;
  conflictsResolved: number;
  bytesUploaded: number;
  bytesDownloaded: number;
  syncDuration: number;  // ms
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export class SyncManager {
  private config: SyncManagerConfig;
  private providers: Map<string, DataProvider> = new Map();
  private conflictResolver: ConflictResolver;
  private syncInterval: number | null = null;
  private retryInterval: number | null = null;
  private currentState: SyncState = 'idle';
  private stats: SyncStats;
  private pendingResolutions: Map<string, ConflictResolution> = new Map();
  
  // Event handlers
  public onStateChange?: (state: SyncState) => void;
  public onSyncStart?: () => void;
  public onSyncComplete?: (stats: SyncStats) => void;
  public onSyncError?: (error: Error) => void;
  public onConflict?: (conflict: Conflict) => void;
  public onProgress?: (progress: { current: number; total: number; entity: string }) => void;

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = {
      autoSync: true,
      syncInterval: 300,  // 5 minutes
      retryInterval: 60,  // 1 minute
      maxRetries: 5,
      compressionEnabled: true,
      compressionThreshold: 1024,  // 1KB
      skipAttachmentsOnSlowConnection: true,
      conflictStrategy: 'timestamp-wins',
      entityStrategies: {},
      syncOnMobile: true,
      syncOnWifiOnly: false,
      minBatteryLevel: 20,
      ...config,
    };

    this.conflictResolver = new ConflictResolver(this.config.conflictStrategy);
    
    // Set entity-specific strategies
    for (const [entity, strategy] of Object.entries(this.config.entityStrategies)) {
      this.conflictResolver.setEntityRule(entity, strategy);
    }

    this.stats = this.initializeStats();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  registerProvider(name: string, provider: DataProvider): void {
    this.providers.set(name, provider);
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  getProvider(name: string): DataProvider | undefined {
    return this.providers.get(name);
  }

  // ============================================================================
  // Sync Control
  // ============================================================================

  start(): void {
    if (this.syncInterval) return;

    this.setState('idle');

    if (this.config.autoSync) {
      this.scheduleNextSync();
    }
  }

  stop(): void {
    this.clearIntervals();
    this.setState('idle');
  }

  async syncNow(force = false): Promise<SyncStats> {
    if (this.currentState === 'syncing' && !force) {
      console.log('Sync already in progress');
      return this.stats;
    }

    // Check if we should sync
    if (!force && !this.shouldSync()) {
      console.log('Sync conditions not met');
      return this.stats;
    }

    this.setState('syncing');
    this.onSyncStart?.();

    const startTime = Date.now();
    let hasErrors = false;

    try {
      // Sync each registered provider
      for (const [name, provider] of this.providers) {
        if (typeof provider.sync === 'function') {
          try {
            this.onProgress?.({ current: 0, total: 1, entity: name });
            await provider.sync();
            this.onProgress?.({ current: 1, total: 1, entity: name });
          } catch (error) {
            console.error(`Sync failed for provider ${name}:`, error);
            hasErrors = true;
          }
        }
      }

      // Process pending conflict resolutions
      await this.processPendingResolutions();

      // Update stats
      this.stats.lastSync = new Date();
      this.stats.syncDuration = Date.now() - startTime;
      this.stats.nextSync = this.calculateNextSync();

      this.setState(hasErrors ? 'error' : 'idle');
      this.onSyncComplete?.(this.stats);

      // Schedule next sync
      if (this.config.autoSync && !hasErrors) {
        this.scheduleNextSync();
      }
    } catch (error) {
      this.setState('error');
      this.onSyncError?.(error as Error);
      this.scheduleRetry();
    }

    return this.stats;
  }

  async syncProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    if (typeof provider.sync === 'function') {
      await provider.sync();
    }
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  detectConflicts(local: any, remote: any, entity: string): Conflict | null {
    const fieldConflicts = this.conflictResolver.detectConflicts(local, remote);
    
    if (fieldConflicts.length === 0) {
      return null;
    }

    return {
      entity,
      recordId: local.id || remote.id,
      local,
      remote,
      fieldConflicts,
    };
  }

  resolveConflict(conflict: Conflict, resolution?: ConflictResolution): any {
    const resolved = this.conflictResolver.resolve(conflict, resolution);
    
    this.stats.conflictsResolved++;
    
    // Remove from pending if it was there
    this.pendingResolutions.delete(conflict.recordId);

    return resolved;
  }

  queueConflictResolution(conflict: Conflict, resolution: ConflictResolution): void {
    this.pendingResolutions.set(conflict.recordId, resolution);
  }

  private async processPendingResolutions(): Promise<void> {
    if (this.pendingResolutions.size === 0) return;

    // This would apply pending resolutions to the data
    // Implementation depends on specific provider
    console.log(`Processing ${this.pendingResolutions.size} pending conflict resolutions`);
  }

  // ============================================================================
  // Bandwidth Optimization
  // ============================================================================

  shouldCompress(data: any): boolean {
    if (!this.config.compressionEnabled) return false;

    const size = JSON.stringify(data).length;
    return size > this.config.compressionThreshold;
  }

  async compress(data: any): Promise<Uint8Array> {
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    
    // Use CompressionStream if available
    if ('CompressionStream' in window) {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    // Fallback: return uncompressed
    return bytes;
  }

  isSlowConnection(): boolean {
    const nav = navigator as any;
    
    // Check connection type
    if (nav.connection) {
      const conn = nav.connection;
      
      // Save data mode
      if (conn.saveData) return true;
      
      // Slow connection types
      if (['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
        return true;
      }
    }

    return false;
  }

  shouldSyncAttachments(): boolean {
    if (!this.config.skipAttachmentsOnSlowConnection) return true;
    return !this.isSlowConnection();
  }

  // ============================================================================
  // Background Sync (Service Worker)
  // ============================================================================

  async registerBackgroundSync(tag = 'background-sync'): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log('Background sync registered:', tag);
        return true;
      }
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }

    return false;
  }

  async requestPeriodicSync(minIntervalMinutes = 15): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('periodicSync' in registration) {
        const status = await (navigator as any).permissions.query({
          name: 'periodic-background-sync',
        });

        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('schoolpilot-sync', {
            minInterval: minIntervalMinutes * 60 * 1000,
          });
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to register periodic sync:', error);
    }

    return false;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  getState(): SyncState {
    return this.currentState;
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  private setState(state: SyncState): void {
    this.currentState = state;
    this.onStateChange?.(state);
  }

  private initializeStats(): SyncStats {
    return {
      lastSync: null,
      nextSync: null,
      totalOperations: 0,
      pendingOperations: 0,
      failedOperations: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      bytesUploaded: 0,
      bytesDownloaded: 0,
      syncDuration: 0,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private shouldSync(): boolean {
    // Check online status
    if (!navigator.onLine) {
      return false;
    }

    // Check battery level
    if (this.config.minBatteryLevel > 0 && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level * 100 < this.config.minBatteryLevel && !battery.charging) {
          return false;
        }
      });
    }

    // Check connection type
    if (this.config.syncOnWifiOnly) {
      const conn = (navigator as any).connection;
      if (conn && conn.type === 'cellular') {
        return false;
      }
    }

    if (!this.config.syncOnMobile) {
      const conn = (navigator as any).connection;
      if (conn && ['cellular', '2g', '3g'].includes(conn.type)) {
        return false;
      }
    }

    return true;
  }

  private scheduleNextSync(): void {
    this.clearIntervals();

    this.syncInterval = window.setInterval(() => {
      this.syncNow();
    }, this.config.syncInterval * 1000);

    this.stats.nextSync = this.calculateNextSync();
  }

  private scheduleRetry(): void {
    this.clearIntervals();

    this.retryInterval = window.setInterval(() => {
      this.syncNow();
    }, this.config.retryInterval * 1000);

    this.stats.nextSync = new Date(Date.now() + this.config.retryInterval * 1000);
  }

  private clearIntervals(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  private calculateNextSync(): Date {
    return new Date(Date.now() + this.config.syncInterval * 1000);
  }

  private handleOnline(): void {
    console.log('Connection restored, triggering sync');
    this.setState('idle');
    
    if (this.config.autoSync) {
      this.syncNow();
    }
  }

  private handleOffline(): void {
    console.log('Connection lost, pausing sync');
    this.setState('offline');
  }

  // ============================================================================
  // Public API
  // ============================================================================

  updateConfig(config: Partial<SyncManagerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update conflict resolver
    if (config.conflictStrategy) {
      this.conflictResolver.setStrategy(config.conflictStrategy);
    }
    
    if (config.entityStrategies) {
      for (const [entity, strategy] of Object.entries(config.entityStrategies)) {
        this.conflictResolver.setEntityRule(entity, strategy);
      }
    }

    // Restart if running
    if (this.syncInterval) {
      this.start();
    }
  }

  getConfig(): SyncManagerConfig {
    return { ...this.config };
  }

  resetStats(): void {
    this.stats = this.initializeStats();
  }
}

export default SyncManager;

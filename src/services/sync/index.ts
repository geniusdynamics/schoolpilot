/**
 * Enhanced Sync Engine
 *
 * Advanced synchronization capabilities for SchoolPilot3.
 *
 * @example
 * ```typescript
 * import { SyncManager, ConflictResolver } from '@/services/sync';
 *
 * // Create sync manager
 * const syncManager = new SyncManager({
 *   autoSync: true,
 *   syncInterval: 300,
 *   conflictStrategy: 'timestamp-wins',
 *   entityStrategies: {
 *     fees: 'remote-wins',      // ERPNext is source of truth for fees
 *     attendance: 'local-wins', // SchoolPilot is source of truth for attendance
 *   },
 * });
 *
 * // Register providers
 * syncManager.registerProvider('erpnext', erpnextProvider);
 * syncManager.registerProvider('backend', backendProvider);
 *
 * // Start auto-sync
 * syncManager.start();
 *
 * // Handle conflicts
 * syncManager.onConflict = (conflict) => {
 *   showConflictResolutionDialog(conflict);
 * };
 *
 * // Register background sync
 * await syncManager.registerBackgroundSync();
 * ```
 */

// Core service implementations
export { SyncManager } from './SyncManager';
export { ConflictResolver } from './ConflictResolver';

// Service Worker (to be imported in sw.ts)
export { getQueue, addToQueue, removeFromQueue, processQueue } from './sw-sync';

// Local types and interfaces
export * from './types';

// Re-export related types from backend for convenience
export type {
  Conflict,
  FieldConflict,
  ConflictResolutionStrategy,
} from '../backend/types';

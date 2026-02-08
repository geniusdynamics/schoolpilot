/**
 * Conflict Resolver
 * 
 * Handles detection and resolution of sync conflicts.
 * Supports multiple resolution strategies and manual resolution UI.
 */

import type { Conflict, FieldConflict, ConflictResolutionStrategy } from '../backend/types';

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  fieldResolutions?: Record<string, 'local' | 'remote' | 'custom'>;
  customValues?: Record<string, any>;
}

export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;
  private customRules: Map<string, ConflictResolutionStrategy> = new Map();

  constructor(strategy: ConflictResolutionStrategy = 'timestamp-wins') {
    this.strategy = strategy;
  }

  /**
   * Set default resolution strategy
   */
  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Set custom rule for a specific entity
   */
  setEntityRule(entity: string, strategy: ConflictResolutionStrategy): void {
    this.customRules.set(entity, strategy);
  }

  /**
   * Detect conflicts between local and remote records
   */
  detectConflicts(local: Record<string, any>, remote: Record<string, any>, options?: {
    ignoreFields?: string[];
    compareFields?: string[];
  }): FieldConflict[] {
    const conflicts: FieldConflict[] = [];
    const ignoreFields = new Set(options?.ignoreFields || ['id', '_rev', '_cachedAt', 'updatedAt', 'createdAt']);
    
    // Determine which fields to compare
    const fieldsToCompare = options?.compareFields || 
      Object.keys({ ...local, ...remote }).filter(f => !ignoreFields.has(f));

    for (const field of fieldsToCompare) {
      const localValue = local[field];
      const remoteValue = remote[field];

      // Skip if both undefined
      if (localValue === undefined && remoteValue === undefined) continue;

      // Check for difference
      if (!this.valuesEqual(localValue, remoteValue)) {
        conflicts.push({
          field,
          localValue,
          remoteValue,
          localTimestamp: local.updatedAt ? new Date(local.updatedAt) : new Date(),
          remoteTimestamp: remote.updatedAt ? new Date(remote.updatedAt) : new Date(),
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve a conflict using the configured strategy
   */
  resolve(conflict: Conflict, resolution?: ConflictResolution): Record<string, any> {
    const strategy = resolution?.strategy || 
      this.customRules.get(conflict.entity) || 
      this.strategy;

    switch (strategy) {
      case 'local-wins':
        return this.resolveLocalWins(conflict);
      
      case 'remote-wins':
        return this.resolveRemoteWins(conflict);
      
      case 'timestamp-wins':
        return this.resolveTimestampWins(conflict);
      
      case 'merge':
        return this.resolveMerge(conflict, resolution);
      
      case 'manual':
        if (!resolution?.fieldResolutions) {
          throw new Error('Manual resolution requires fieldResolutions');
        }
        return this.resolveManual(conflict, resolution);
      
      default:
        return this.resolveTimestampWins(conflict);
    }
  }

  /**
   * Resolve all conflicts in a batch
   */
  resolveBatch(conflicts: Conflict[], resolutions?: ConflictResolution[]): Record<string, any>[] {
    return conflicts.map((conflict, index) => {
      const resolution = resolutions?.[index];
      return this.resolve(conflict, resolution);
    });
  }

  /**
   * Create a merged record from local and remote
   */
  private resolveMerge(conflict: Conflict, resolution?: ConflictResolution): Record<string, any> {
    const merged = { ...conflict.remote };

    for (const fieldConflict of conflict.fieldConflicts) {
      const fieldResolution = resolution?.fieldResolutions?.[fieldConflict.field];

      if (fieldResolution === 'local') {
        merged[fieldConflict.field] = fieldConflict.localValue;
      } else if (fieldResolution === 'custom' && resolution?.customValues) {
        merged[fieldConflict.field] = resolution.customValues[fieldConflict.field];
      }
      // else keep remote value (default)
    }

    // Mark as merged
    merged._conflictResolved = true;
    merged._conflictResolvedAt = new Date().toISOString();

    return merged;
  }

  /**
   * Manual resolution with per-field decisions
   */
  private resolveManual(conflict: Conflict, resolution: ConflictResolution): Record<string, any> {
    const result = { ...conflict.remote };

    for (const fieldConflict of conflict.fieldConflicts) {
      const decision = resolution.fieldResolutions?.[fieldConflict.field];

      switch (decision) {
        case 'local':
          result[fieldConflict.field] = fieldConflict.localValue;
          break;
        case 'custom':
          if (resolution.customValues?.[fieldConflict.field] !== undefined) {
            result[fieldConflict.field] = resolution.customValues[fieldConflict.field];
          }
          break;
        // 'remote' is default
      }
    }

    result._conflictManuallyResolved = true;
    result._conflictResolvedAt = new Date().toISOString();

    return result;
  }

  /**
   * Local always wins
   */
  private resolveLocalWins(conflict: Conflict): Record<string, any> {
    return {
      ...conflict.local,
      _conflictResolved: true,
      _conflictStrategy: 'local-wins',
      _conflictResolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Remote always wins
   */
  private resolveRemoteWins(conflict: Conflict): Record<string, any> {
    return {
      ...conflict.remote,
      _conflictResolved: true,
      _conflictStrategy: 'remote-wins',
      _conflictResolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Most recent timestamp wins
   */
  private resolveTimestampWins(conflict: Conflict): Record<string, any> {
    const localTime = this.getTimestamp(conflict.local);
    const remoteTime = this.getTimestamp(conflict.remote);

    if (localTime >= remoteTime) {
      return this.resolveLocalWins(conflict);
    } else {
      return this.resolveRemoteWins(conflict);
    }
  }

  /**
   * Compare two values for equality
   */
  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Date comparison
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Array comparison
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.valuesEqual(val, b[idx]));
    }

    // Object comparison
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.valuesEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Get timestamp from record
   */
  private getTimestamp(record: Record<string, any>): number {
    const ts = record.updatedAt || record.modified || record.timestamp || record._cachedAt;
    if (!ts) return 0;
    return new Date(ts).getTime();
  }
}

export default ConflictResolver;

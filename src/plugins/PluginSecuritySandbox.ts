/**
 * Plugin Security Sandbox
 *
 * Manages plugin permissions, security tiers, and sandbox enforcement.
 * Extracted from PluginManager.ts to follow single-responsibility principle.
 */

import type {
  PluginCategory,
  PluginPrivileges,
  LoadedPlugin,
  PluginContext,
  PluginManifest,
} from './types';

export type SecurityTier = 'trusted' | 'verified' | 'community';

export type PluginPermission =
  | 'data:read'
  | 'data:write'
  | 'ui:inject'
  | 'menu:modify'
  | 'settings:access'
  | 'network:access'
  | 'filesystem:access'
  | 'code:execute';

interface SecurityConfig {
  tier: SecurityTier;
  timeoutMs: number;
  sandboxEnabled: boolean;
}

const DEFAULT_PRIVILEGES: PluginPrivileges = {
  dataRead: [],
  dataWrite: [],
  uiInject: false,
  menuModify: false,
  settingsAccess: true,
  networkAccess: false,
  fileSystemAccess: false,
  executeCode: false,
};

export class PluginSecuritySandbox {
  private permissions: Map<string, Set<PluginPermission>> = new Map();

  // Security configuration per tier
  private readonly TIER_CONFIG: Record<SecurityTier, SecurityConfig> = {
    trusted: {
      tier: 'trusted',
      timeoutMs: 5000,
      sandboxEnabled: false,
    },
    verified: {
      tier: 'verified',
      timeoutMs: 2000,
      sandboxEnabled: true,
    },
    community: {
      tier: 'community',
      timeoutMs: 1000,
      sandboxEnabled: true,
    },
  };

  /**
   * Get security tier for a plugin category
   */
  getSecurityTier(category: PluginCategory): SecurityTier {
    switch (category) {
      case 'builtin':
      case 'engine':
        return 'trusted';
      case 'verified':
      case 'private':
        return 'verified';
      case 'community':
      default:
        return 'community';
    }
  }

  /**
   * Get timeout duration for a security tier
   */
  getTimeoutForTier(tier: SecurityTier): number {
    return this.TIER_CONFIG[tier].timeoutMs;
  }

  /**
   * Check if sandbox is enabled for a tier
   */
  isSandboxEnabled(tier: SecurityTier): boolean {
    return this.TIER_CONFIG[tier].sandboxEnabled;
  }

  /**
   * Get full security config for a tier
   */
  getSecurityConfig(tier: SecurityTier): SecurityConfig {
    return { ...this.TIER_CONFIG[tier] };
  }

  /**
   * Check if a plugin has a specific permission
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const perms = this.permissions.get(pluginId);
    return perms !== undefined && perms.has(permission);
  }

  /**
   * Grant permission to a plugin
   */
  grantPermission(pluginId: string, permission: PluginPermission): void {
    if (!this.permissions.has(pluginId)) {
      this.permissions.set(pluginId, new Set());
    }
    this.permissions.get(pluginId)!.add(permission);
  }

  /**
   * Revoke permission from a plugin
   */
  revokePermission(pluginId: string, permission: PluginPermission): void {
    this.permissions.get(pluginId)?.delete(permission);
  }

  /**
   * Set all permissions for a plugin
   */
  setPermissions(pluginId: string, permissions: PluginPermission[]): void {
    this.permissions.set(pluginId, new Set(permissions));
  }

  /**
   * Get all permissions for a plugin
   */
  getPermissions(pluginId: string): PluginPermission[] {
    return Array.from(this.permissions.get(pluginId) || []);
  }

  /**
   * Clear all permissions for a plugin
   */
  clearPermissions(pluginId: string): void {
    this.permissions.delete(pluginId);
  }

  /**
   * Validate if an operation is allowed for a plugin
   */
  validateOperation(
    pluginId: string,
    operation: string,
    manifest?: PluginManifest
  ): boolean {
    const privileges = manifest?.privileges;
    if (!privileges) {
      return false;
    }

    switch (operation) {
      case 'data:read':
        return privileges.dataRead !== undefined && privileges.dataRead.length > 0;
      case 'data:write':
        return privileges.dataWrite !== undefined && privileges.dataWrite.length > 0;
      case 'ui:inject':
        return privileges.uiInject === true;
      case 'menu:modify':
        return privileges.menuModify === true;
      case 'settings:access':
        return privileges.settingsAccess !== false;
      case 'network:access':
        return privileges.networkAccess === true;
      case 'filesystem:access':
        return privileges.fileSystemAccess === true;
      case 'code:execute':
        return privileges.executeCode === true;
      default:
        return false;
    }
  }

  /**
   * Get privileges for a plugin, merged with defaults
   */
  getPrivileges(manifest?: PluginManifest): PluginPrivileges {
    if (!manifest?.privileges) {
      return { ...DEFAULT_PRIVILEGES };
    }

    return {
      ...DEFAULT_PRIVILEGES,
      ...manifest.privileges,
    };
  }

  /**
   * Check if a plugin can access a specific collection
   */
  canAccessCollection(
    pluginId: string,
    collection: string,
    access: 'read' | 'write',
    manifest?: PluginManifest
  ): boolean {
    const privileges = this.getPrivileges(manifest);

    if (access === 'read') {
      return (
        privileges.dataRead.includes(collection) || privileges.dataRead.includes('*')
      );
    }

    return (
      privileges.dataWrite.includes(collection) || privileges.dataWrite.includes('*')
    );
  }

  /**
   * Create a sandboxed plugin context
   */
  createSandboxedContext(plugin: LoadedPlugin): Partial<PluginContext> {
    const tier = this.getSecurityTier(plugin.manifest.category || 'community');
    const config = this.TIER_CONFIG[tier];

    return {
      pluginId: plugin.manifest.id,
      manifest: plugin.manifest,
      // Context is partial - full context built by PluginManager
    };
  }

  /**
   * Validate plugin manifest against security requirements
   */
  validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!manifest.id) {
      errors.push('Plugin ID is required');
    }
    if (!manifest.name) {
      errors.push('Plugin name is required');
    }
    if (!manifest.version) {
      errors.push('Plugin version is required');
    }
    if (!manifest.entry) {
      errors.push('Plugin entry point is required');
    }
    if (!manifest.type) {
      errors.push('Plugin type is required');
    }

    // Validate ID format (should be reverse domain notation)
    if (manifest.id && !/^[a-z][a-z0-9-_.]*$/.test(manifest.id)) {
      errors.push('Plugin ID should be lowercase with dots, hyphens, or underscores');
    }

    // Validate version format (semantic versioning)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Plugin version should follow semantic versioning (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a plugin can be loaded based on security settings
   */
  canLoadPlugin(
    manifest: PluginManifest,
    allowedTypes?: string[],
    allowedCategories?: PluginCategory[]
  ): { allowed: boolean; reason?: string } {
    // Check type restrictions
    if (allowedTypes && !allowedTypes.includes(manifest.type)) {
      return {
        allowed: false,
        reason: `Plugin type "${manifest.type}" is not allowed`,
      };
    }

    // Check category restrictions
    if (allowedCategories && manifest.category && !allowedCategories.includes(manifest.category)) {
      return {
        allowed: false,
        reason: `Plugin category "${manifest.category}" is not allowed`,
      };
    }

    // Validate manifest
    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      return {
        allowed: false,
        reason: `Invalid manifest: ${validation.errors.join(', ')}`,
      };
    }

    return { allowed: true };
  }
}

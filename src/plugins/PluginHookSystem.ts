/**
 * Plugin Hook System
 *
 * Manages plugin hook registration, execution, and circuit breaker protection.
 * Extracted from PluginManager.ts to follow single-responsibility principle.
 */

import type { PluginHook, PluginHookHandler } from './types';
import { logger } from '@/utils/logging';

interface HookStats {
  failures: number;
  lastFailure: number;
}

export class PluginHookSystem {
  private hooks: Map<string, PluginHook> = new Map();
  private hookStats: Map<string, HookStats> = new Map();

  // Security settings
  private readonly HOOK_TIMEOUT_MS = 200;
  private readonly MAX_HOOK_FAILURES = 3;
  private readonly HOOK_BAN_DURATION_MS = 60000; // 1 minute

  /**
   * Register a hook handler
   */
  registerHook(
    name: string,
    handler: (...args: any[]) => any,
    pluginId: string,
    priority = 10
  ): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, { name, handlers: [] });
    }

    const hook = this.hooks.get(name)!;
    const handlerObj: PluginHookHandler = {
      pluginId: pluginId || 'core',
      priority,
      handler,
    };

    // Insert sorted by priority (lower number = higher priority)
    const index = hook.handlers.findIndex((h) => h.priority > priority);
    if (index === -1) {
      hook.handlers.push(handlerObj);
    } else {
      hook.handlers.splice(index, 0, handlerObj);
    }
  }

  /**
   * Remove a specific hook handler
   */
  removeHook(name: string, handler: (...args: any[]) => any): void {
    const hook = this.hooks.get(name);
    if (!hook) return;

    hook.handlers = hook.handlers.filter((h) => h.handler !== handler);
  }

  /**
   * Remove all hooks for a specific plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    for (const hook of this.hooks.values()) {
      hook.handlers = hook.handlers.filter((h) => h.pluginId !== pluginId);
    }
  }

  /**
   * Execute hooks with security (timeout + circuit breaker)
   * Returns array of all hook results
   */
  doHook<T = any>(name: string, ...args: any[]): T[] {
    const hook = this.hooks.get(name);
    if (!hook) return [];

    const results: T[] = [];
    for (const { handler, pluginId } of hook.handlers) {
      // Check if plugin is temporarily banned
      if (this.isPluginBanned(pluginId)) {
        logger.warn(`[PluginHookSystem] Plugin ${pluginId} is temporarily banned from hooks`);
        continue;
      }

      try {
        // Execute with timeout
        const result = this.executeWithTimeout(
          () => handler(...args),
          this.HOOK_TIMEOUT_MS,
          `Hook ${name} for plugin ${pluginId}`
        );
        results.push(result);
      } catch (error) {
        logger.error(`Hook ${name} handler failed for plugin ${pluginId}:`, error);
        this.recordHookFailure(pluginId);
      }
    }

    return results;
  }

  /**
   * Execute hooks with filter (first non-null result wins)
   * Used for filter-type hooks where only one result matters
   */
  applyHook<T = any>(name: string, ...args: any[]): T | undefined {
    const hook = this.hooks.get(name);
    if (!hook) return undefined;

    for (const { handler, pluginId } of hook.handlers) {
      // Check if plugin is temporarily banned
      if (this.isPluginBanned(pluginId)) {
        continue;
      }

      try {
        const result = this.executeWithTimeout(
          () => handler(...args),
          this.HOOK_TIMEOUT_MS,
          `Hook ${name} for plugin ${pluginId}`
        );
        if (result !== undefined && result !== null) {
          return result;
        }
      } catch (error) {
        logger.error(`Hook ${name} handler failed for plugin ${pluginId}:`, error);
        this.recordHookFailure(pluginId);
      }
    }

    return undefined;
  }

  /**
   * Check if a plugin is temporarily banned due to excessive failures
   */
  private isPluginBanned(pluginId: string): boolean {
    const stats = this.hookStats.get(pluginId);
    if (!stats || stats.failures < this.MAX_HOOK_FAILURES) {
      return false;
    }

    const timeSinceFailure = Date.now() - stats.lastFailure;
    if (timeSinceFailure < this.HOOK_BAN_DURATION_MS) {
      return true;
    }

    // Reset ban after cooldown
    this.hookStats.delete(pluginId);
    return false;
  }

  /**
   * Record a hook failure for circuit breaker
   */
  private recordHookFailure(pluginId: string): void {
    const current = this.hookStats.get(pluginId) || { failures: 0, lastFailure: 0 };
    current.failures += 1;
    current.lastFailure = Date.now();
    this.hookStats.set(pluginId, current);

    if (current.failures >= this.MAX_HOOK_FAILURES) {
      logger.error(
        `[PluginHookSystem] Plugin ${pluginId} has been temporarily banned due to ${current.failures} hook failures`
      );
    }
  }

  /**
   * Execute a function with timeout protection
   */
  private executeWithTimeout<T>(fn: () => T, timeoutMs: number, context: string): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (duration > timeoutMs) {
      logger.warn(
        `[PluginHookSystem] ${context} took ${duration.toFixed(2)}ms (timeout: ${timeoutMs}ms)`
      );
    }

    return result;
  }

  /**
   * Get all registered hook names
   */
  getRegisteredHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hook statistics for debugging
   */
  getHookStats(pluginId?: string): Map<string, HookStats> {
    if (pluginId) {
      const stats = this.hookStats.get(pluginId);
      return stats ? new Map([[pluginId, stats]]) : new Map();
    }
    return new Map(this.hookStats);
  }

  /**
   * Clear all hooks and stats
   */
  clear(): void {
    this.hooks.clear();
    this.hookStats.clear();
  }
}

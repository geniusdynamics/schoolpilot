/**
 * Plugin Settings Manager
 *
 * Manages per-plugin configuration storage, validation, and persistence.
 * Extracted from PluginManager.ts to follow single-responsibility principle.
 */

import type { PluginSetting } from './types';
import { logger } from '@/utils/logging';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class PluginSettingsManager {
  private settings: Map<string, Record<string, any>> = new Map();
  private schemas: Map<string, PluginSetting[]> = new Map();

  /**
   * Register settings schema for a plugin
   */
  registerSettingsSchema(pluginId: string, schema: PluginSetting[]): void {
    this.schemas.set(pluginId, schema);

    // Initialize with default values
    const defaults: Record<string, any> = {};
    for (const setting of schema) {
      if (setting.defaultValue !== undefined) {
        defaults[setting.key] = setting.defaultValue;
      }
    }

    // Merge with any existing settings
    const existing = this.settings.get(pluginId) || {};
    this.settings.set(pluginId, { ...defaults, ...existing });
  }

  /**
   * Get a single setting value
   */
  getSetting<T>(pluginId: string, key: string): T | undefined {
    const pluginSettings = this.settings.get(pluginId);
    return pluginSettings?.[key] as T | undefined;
  }

  /**
   * Set a single setting value
   */
  async setSetting<T>(pluginId: string, key: string, value: T): Promise<void> {
    const current = this.settings.get(pluginId) || {};
    this.settings.set(pluginId, { ...current, [key]: value });

    // Persist to storage
    await this.persistSettings(pluginId);
  }

  /**
   * Get all settings for a plugin
   */
  getAllSettings(pluginId: string): Record<string, any> {
    return { ...this.settings.get(pluginId) };
  }

  /**
   * Set multiple settings at once
   */
  async setSettings(pluginId: string, settings: Record<string, any>): Promise<void> {
    const current = this.settings.get(pluginId) || {};
    this.settings.set(pluginId, { ...current, ...settings });
    await this.persistSettings(pluginId);
  }

  /**
   * Reset all settings to defaults for a plugin
   */
  resetToDefaults(pluginId: string): void {
    const schema = this.schemas.get(pluginId);
    if (!schema) {
      this.settings.delete(pluginId);
      return;
    }

    const defaults: Record<string, any> = {};
    for (const setting of schema) {
      if (setting.defaultValue !== undefined) {
        defaults[setting.key] = setting.defaultValue;
      }
    }

    this.settings.set(pluginId, defaults);
    this.persistSettings(pluginId);
  }

  /**
   * Validate settings against schema
   */
  validateSettings(pluginId: string, settings: Record<string, any>): ValidationResult {
    const schema = this.schemas.get(pluginId);
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    for (const setting of schema) {
      const value = settings[setting.key];

      // Check required
      if (setting.required && (value === undefined || value === null)) {
        errors.push(`Setting "${setting.key}" is required`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (setting.type === 'number' && typeof value !== 'number') {
        errors.push(`Setting "${setting.key}" must be a number`);
      } else if (setting.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Setting "${setting.key}" must be a boolean`);
      } else if (setting.type === 'string' && typeof value !== 'string') {
        errors.push(`Setting "${setting.key}" must be a string`);
      }

      // Range validation for numbers
      if (setting.type === 'number' && typeof value === 'number') {
        if (setting.validation?.min !== undefined && value < setting.validation.min) {
          errors.push(
            `Setting "${setting.key}" must be at least ${setting.validation.min}`
          );
        }
        if (setting.validation?.max !== undefined && value > setting.validation.max) {
          errors.push(
            `Setting "${setting.key}" must be at most ${setting.validation.max}`
          );
        }
      }

      // String length validation
      if (setting.type === 'string' && typeof value === 'string') {
        if (setting.validation?.min !== undefined && value.length < setting.validation.min) {
          errors.push(
            `Setting "${setting.key}" must be at least ${setting.validation.min} characters`
          );
        }
        if (setting.validation?.max !== undefined && value.length > setting.validation.max) {
          errors.push(
            `Setting "${setting.key}" must be at most ${setting.validation.max} characters`
          );
        }
        if (setting.validation?.pattern && !new RegExp(setting.validation.pattern).test(value)) {
          errors.push(`Setting "${setting.key}" has invalid format`);
        }
      }

      // Options validation for select/multiselect
      if ((setting.type === 'select' || setting.type === 'multiselect') && setting.options) {
        const validValues = setting.options.map((o) => o.value);
        if (setting.type === 'select') {
          if (!validValues.includes(value)) {
            errors.push(`Setting "${setting.key}" has invalid value`);
          }
        } else if (Array.isArray(value)) {
          const invalidValues = value.filter((v) => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors.push(`Setting "${setting.key}" has invalid values: ${invalidValues.join(', ')}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get settings schema for a plugin
   */
  getSettingsSchema(pluginId: string): PluginSetting[] | undefined {
    return this.schemas.get(pluginId);
  }

  /**
   * Load settings from localStorage
   */
  loadSettings(pluginId: string): void {
    try {
      const stored = localStorage.getItem(`plugin_settings_${pluginId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const current = this.settings.get(pluginId) || {};
        this.settings.set(pluginId, { ...current, ...parsed });
      }
    } catch (error) {
      logger.warn(`[PluginSettingsManager] Failed to load settings for ${pluginId}:`, error);
    }
  }

  /**
   * Persist settings to localStorage
   */
  private async persistSettings(pluginId: string): Promise<void> {
    const settings = this.settings.get(pluginId);
    if (settings) {
      try {
        localStorage.setItem(`plugin_settings_${pluginId}`, JSON.stringify(settings));
      } catch (error) {
        logger.warn(`[PluginSettingsManager] Failed to persist settings for ${pluginId}:`, error);
      }
    }
  }

  /**
   * Clear all settings for a plugin
   */
  clearSettings(pluginId: string): void {
    this.settings.delete(pluginId);
    this.schemas.delete(pluginId);
    try {
      localStorage.removeItem(`plugin_settings_${pluginId}`);
    } catch (error) {
      logger.warn(`[PluginSettingsManager] Failed to clear settings for ${pluginId}:`, error);
    }
  }

  /**
   * Get all plugin IDs with registered settings
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.schemas.keys());
  }
}

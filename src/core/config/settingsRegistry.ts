﻿﻿﻿import { EventEmitter } from 'events';

import { logger } from '@/utils/logging';

/**
 * Settings Registry
 * Central registry for all module settings.
 * Each module registers its settings here.
 *
 * ABOUTME: Legacy config â€” the canonical source is now src/config/.
 * This file is preserved for existing consumers only; new code
 * should import from '@/config/'.
 */

export interface SettingDefinition {
  key: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  defaultValue: any;
  label?: string;
  description?: string;
  options?: Array<{ value: any; label: string }>;
  section?: string;
  category?: string;
}

export interface ModuleSettingsDefinition {
  moduleId: string;
  settings: SettingDefinition[];
  section?: string;
  category?: string;
}

export interface SettingsChangeEvent {
  moduleId: string;
  key: string;
  oldValue: any;
  newValue: any;
}

export class SettingsRegistry extends EventEmitter {
  private settings = new Map<string, Map<string, SettingDefinition>>();
  private values = new Map<string, Map<string, any>>();
  private loaded = false;

  /**
   * Register module settings
   */
  registerModule(definition: ModuleSettingsDefinition): void {
    if (this.loaded) {
      throw new Error('Cannot register settings after initialization');
    }

    const moduleSettings = new Map<string, SettingDefinition>();
    for (const setting of definition.settings) {
      moduleSettings.set(setting.key, setting);
    }

    this.settings.set(definition.moduleId, moduleSettings);
    this.values.set(definition.moduleId, new Map());
  }

  /**
   * Get a setting definition
   */
  getSettingDefinition(moduleId: string, key: string): SettingDefinition | undefined {
    return this.settings.get(moduleId)?.get(key);
  }

  /**
   * Get all settings for a module
   */
  getModuleSettings(moduleId: string): Map<string, SettingDefinition> {
    return this.settings.get(moduleId) || new Map();
  }

  /**
   * Get all registered modules
   */
  getModuleIds(): string[] {
    return Array.from(this.settings.keys());
  }

  /**
   * Get a setting value
   */
  getSetting<T = any>(moduleId: string, key: string): T {
    const moduleValues = this.values.get(moduleId);
    if (!moduleValues) {
      return undefined as T;
    }

    const value = moduleValues.get(key);
    if (value !== undefined) {
      return value as T;
    }

    // Return default value
    const definition = this.settings.get(moduleId)?.get(key);
    return definition?.defaultValue as T;
  }

  /**
   * Set a setting value
   */
  setSetting(moduleId: string, key: string, value: any): void {
    const moduleValues = this.values.get(moduleId);
    if (!moduleValues) {
      throw new Error(`Module "${moduleId}" not found`);
    }

    const oldValue = moduleValues.get(key);
    moduleValues.set(key, value);

    this.emit('setting:changed', {
      moduleId,
      key,
      oldValue,
      newValue: value,
    } as SettingsChangeEvent);
  }

  /**
   * Get all setting values for a module
   */
  getModuleValues(moduleId: string): Map<string, any> {
    return this.values.get(moduleId) || new Map();
  }

  /**
   * Initialize settings from storage
   */
  async initialize(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const stored = localStorage.getItem('module_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [moduleId, values] of Object.entries(parsed)) {
          const moduleValues = this.values.get(moduleId);
          if (moduleValues) {
            for (const [key, value] of Object.entries(values)) {
              moduleValues.set(key, value);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load settings from storage:', error);
    }

    this.loaded = true;
  }

  /**
   * Save all settings to storage
   */
  save(): void {
    const toSave: Record<string, Record<string, any>> = {};

    for (const [moduleId, values] of this.values.entries()) {
      toSave[moduleId] = {};
      for (const [key, value] of values.entries()) {
        toSave[moduleId][key] = value;
      }
    }

    localStorage.setItem('module_settings', JSON.stringify(toSave));
  }

  /**
   * Reset a setting to default value
   */
  resetSetting(moduleId: string, key: string): void {
    const definition = this.settings.get(moduleId)?.get(key);
    if (definition) {
      this.setSetting(moduleId, key, definition.defaultValue);
    }
  }

  /**
   * Reset all settings to defaults
   */
  resetAll(): void {
    for (const moduleId of this.getModuleIds()) {
      for (const key of this.settings.get(moduleId)?.keys() || []) {
        this.resetSetting(moduleId, key);
      }
    }
  }

  /**
   * Check if settings are loaded
   */
  get isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Clear all settings (for testing)
   */
  clear(): void {
    this.settings.clear();
    this.values.clear();
    this.loaded = false;
  }
}

// Singleton instance
export const settingsRegistry = new SettingsRegistry();
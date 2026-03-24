// ABOUTME: One-time migration script for tab settings
// ABOUTME: Transfers legacy feature flags to new central TabsConfig with rollback support

import { unifiedConfigManager } from '../config/unifiedConfig';

const MIGRATION_KEY = 'tabs_settings_migrated';

export const migrateTabSettings = () => {
  try {
    const isMigrated = localStorage.getItem(MIGRATION_KEY) === 'true';
    if (isMigrated) return;

    const config = unifiedConfigManager.getConfig();
    const legacyFeatures = config.features;

    if (
      legacyFeatures.enableTabbedMode !== undefined ||
      legacyFeatures.enablePerModuleControl !== undefined ||
      legacyFeatures.tabbedModeModuleOverrides !== undefined
    ) {
      // Backup legacy settings for rollback
      localStorage.setItem('legacy_tabs_settings_backup', JSON.stringify({
        enableTabbedMode: legacyFeatures.enableTabbedMode,
        enablePerModuleControl: legacyFeatures.enablePerModuleControl,
        tabbedModeModuleOverrides: legacyFeatures.tabbedModeModuleOverrides,
      }));

      // Apply to new TabsConfig
      unifiedConfigManager.updateTabsConfig({
        advanced: {
          ...config.tabs.advanced,
          enableTabbedMode: legacyFeatures.enableTabbedMode ?? true,
          enablePerModuleControl: legacyFeatures.enablePerModuleControl ?? true,
          tabbedModeModuleOverrides: legacyFeatures.tabbedModeModuleOverrides || {},
        },
      });

      // Optional: Clean up legacy fields (though TypeScript will complain if we try to delete them directly, 
      // they can just be ignored going forward or removed from the unifiedConfig definition).
      // Since they are removed from UnifiedAppConfig.features type, we shouldn't access them anymore.

      localStorage.setItem(MIGRATION_KEY, 'true');
      console.log('Tab settings migrated successfully.');
    }
  } catch (error) {
    console.error('Error during tab settings migration:', error);
  }
};

export const rollbackTabSettingsMigration = () => {
  try {
    const backup = localStorage.getItem('legacy_tabs_settings_backup');
    if (backup) {
      const parsed = JSON.parse(backup);
      
      const config = unifiedConfigManager.getConfig();
      unifiedConfigManager.updateConfig({
        features: {
          ...config.features,
          ...parsed,
        }
      });
      
      localStorage.removeItem(MIGRATION_KEY);
      console.log('Tab settings rollback successful.');
    }
  } catch (error) {
    console.error('Error during tab settings rollback:', error);
  }
};

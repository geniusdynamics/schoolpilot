import { describe, it, expect, beforeEach } from 'vitest';
import { unifiedConfigManager } from '../../../../config/unifiedConfig';

describe('Tabs Configuration', () => {
  beforeEach(() => {
    // Reset to default config before each test
    unifiedConfigManager.updateTabsConfig({
      general: { openingDirection: 'ltr', newTabPlacement: 'end', defaultPage: 'dashboard' },
      behavior: { closeButtonVisibility: 'hover', tabScrolling: 'smooth', activationOnHoverTiming: 0, muteUnmuteBehavior: 'click' },
      appearance: { minTabWidth: 120, maxTabWidth: 240, faviconVisibility: true, tabPreviewThumbnails: false, colorAccents: true },
      advanced: { sessionRestoreGranularity: 'all', memorySuspendTimeout: 300000, extensionOverrides: false, debuggingTelemetry: false, enableTabbedMode: true, enablePerModuleControl: true, tabbedModeModuleOverrides: {} }
    });
  });

  it('should update general settings correctly', () => {
    unifiedConfigManager.updateTabsConfig({
      general: { openingDirection: 'rtl', newTabPlacement: 'next', defaultPage: 'settings' }
    });
    const config = unifiedConfigManager.getTabsConfig();
    expect(config.general.openingDirection).toBe('rtl');
    expect(config.general.newTabPlacement).toBe('next');
    expect(config.general.defaultPage).toBe('settings');
  });

  it('should update behavior settings correctly', () => {
    unifiedConfigManager.updateTabsConfig({
      behavior: { closeButtonVisibility: 'always', tabScrolling: 'auto', activationOnHoverTiming: 500, muteUnmuteBehavior: 'context-menu' }
    });
    const config = unifiedConfigManager.getTabsConfig();
    expect(config.behavior.closeButtonVisibility).toBe('always');
    expect(config.behavior.tabScrolling).toBe('auto');
    expect(config.behavior.activationOnHoverTiming).toBe(500);
    expect(config.behavior.muteUnmuteBehavior).toBe('context-menu');
  });

  it('should update appearance settings correctly', () => {
    unifiedConfigManager.updateTabsConfig({
      appearance: { minTabWidth: 100, maxTabWidth: 300, faviconVisibility: false, tabPreviewThumbnails: true, colorAccents: false }
    });
    const config = unifiedConfigManager.getTabsConfig();
    expect(config.appearance.minTabWidth).toBe(100);
    expect(config.appearance.maxTabWidth).toBe(300);
    expect(config.appearance.faviconVisibility).toBe(false);
    expect(config.appearance.tabPreviewThumbnails).toBe(true);
    expect(config.appearance.colorAccents).toBe(false);
  });

  it('should update advanced settings correctly', () => {
    unifiedConfigManager.updateTabsConfig({
      advanced: { sessionRestoreGranularity: 'none', memorySuspendTimeout: 60000, extensionOverrides: true, debuggingTelemetry: true, enableTabbedMode: false, enablePerModuleControl: false, tabbedModeModuleOverrides: { dashboard: false } }
    });
    const config = unifiedConfigManager.getTabsConfig();
    expect(config.advanced.sessionRestoreGranularity).toBe('none');
    expect(config.advanced.memorySuspendTimeout).toBe(60000);
    expect(config.advanced.extensionOverrides).toBe(true);
    expect(config.advanced.debuggingTelemetry).toBe(true);
    expect(config.advanced.enableTabbedMode).toBe(false);
    expect(config.advanced.enablePerModuleControl).toBe(false);
    expect(config.advanced.tabbedModeModuleOverrides.dashboard).toBe(false);
  });
});

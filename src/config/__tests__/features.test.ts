// ABOUTME: Tests for feature flag resolution per environment

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FEATURES,
  DEFAULT_APP_FEATURE_FLAGS,
  FEATURE_PRESETS,
  FeatureConfig,
} from '../features';

describe('Feature Flags Configuration', () => {
  describe('DEFAULT_FEATURES', () => {
    it('should have all required feature flags defined', () => {
      expect(DEFAULT_FEATURES).toHaveProperty('enableAdvancedReporting');
      expect(DEFAULT_FEATURES).toHaveProperty('enableBulkOperations');
      expect(DEFAULT_FEATURES).toHaveProperty('enableDataExport');
      expect(DEFAULT_FEATURES).toHaveProperty('enableNotifications');
      expect(DEFAULT_FEATURES).toHaveProperty('enableAuditLog');
      expect(DEFAULT_FEATURES).toHaveProperty('enableMultiTenant');
      expect(DEFAULT_FEATURES).toHaveProperty('enableOfflineMode');
      expect(DEFAULT_FEATURES).toHaveProperty('enableRealTimeSync');
      expect(DEFAULT_FEATURES).toHaveProperty('enablePerformanceMonitoring');
      expect(DEFAULT_FEATURES).toHaveProperty('enhancedDataLayer');
      expect(DEFAULT_FEATURES).toHaveProperty('networkStatusIndicator');
      expect(DEFAULT_FEATURES).toHaveProperty('moduleHealthIndicator');
      expect(DEFAULT_FEATURES).toHaveProperty('syncStatusComponent');
      expect(DEFAULT_FEATURES).toHaveProperty('globalNotifications');
      expect(DEFAULT_FEATURES).toHaveProperty('performanceOptimizations');
      expect(DEFAULT_FEATURES).toHaveProperty('advancedErrorBoundaries');
      expect(DEFAULT_FEATURES).toHaveProperty('performanceMonitorWidget');
      expect(DEFAULT_FEATURES).toHaveProperty('enableTabbedMode');
      expect(DEFAULT_FEATURES).toHaveProperty('enablePerModuleControl');
      expect(DEFAULT_FEATURES).toHaveProperty('tabbedModeModuleOverrides');
    });

    it('should have correct default values', () => {
      expect(DEFAULT_FEATURES.enableAdvancedReporting).toBe(false);
      expect(DEFAULT_FEATURES.enableBulkOperations).toBe(true);
      expect(DEFAULT_FEATURES.enableDataExport).toBe(true);
      expect(DEFAULT_FEATURES.enableNotifications).toBe(true);
      expect(DEFAULT_FEATURES.enableAuditLog).toBe(false);
      expect(DEFAULT_FEATURES.enableMultiTenant).toBe(false);
      expect(DEFAULT_FEATURES.enableOfflineMode).toBe(true);
      expect(DEFAULT_FEATURES.enableRealTimeSync).toBe(false);
      expect(DEFAULT_FEATURES.enablePerformanceMonitoring).toBe(false);
      expect(DEFAULT_FEATURES.enhancedDataLayer).toBe(true);
      expect(DEFAULT_FEATURES.networkStatusIndicator).toBe(false);
      expect(DEFAULT_FEATURES.moduleHealthIndicator).toBe(false);
      expect(DEFAULT_FEATURES.syncStatusComponent).toBe(false);
      expect(DEFAULT_FEATURES.globalNotifications).toBe(false);
      expect(DEFAULT_FEATURES.performanceOptimizations).toBe(true);
      expect(DEFAULT_FEATURES.advancedErrorBoundaries).toBe(true);
      expect(DEFAULT_FEATURES.performanceMonitorWidget).toBe(false);
      expect(DEFAULT_FEATURES.enableTabbedMode).toBe(true);
      expect(DEFAULT_FEATURES.enablePerModuleControl).toBe(true);
    });

    it('should have tabbedModeModuleOverrides as an object', () => {
      expect(typeof DEFAULT_FEATURES.tabbedModeModuleOverrides).toBe('object');
      expect(Array.isArray(DEFAULT_FEATURES.tabbedModeModuleOverrides)).toBe(false);
    });
  });

  describe('DEFAULT_APP_FEATURE_FLAGS', () => {
    it('should have all module-specific feature flags', () => {
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableAcademicsModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableAdministrationModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableFinanceModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableHrModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableInventoryModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableLibraryModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableNutritionModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableReportsModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableSettingsModule');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableAdmissionsModule');
    });

    it('should enable core modules by default', () => {
      expect(DEFAULT_APP_FEATURE_FLAGS.enableAcademicsModule).toBe(true);
      expect(DEFAULT_APP_FEATURE_FLAGS.enableAdministrationModule).toBe(true);
      expect(DEFAULT_APP_FEATURE_FLAGS.enableFinanceModule).toBe(true);
      expect(DEFAULT_APP_FEATURE_FLAGS.enableSettingsModule).toBe(true);
      expect(DEFAULT_APP_FEATURE_FLAGS.enableReportsModule).toBe(true);
    });

    it('should have tabbed mode configuration', () => {
      expect(DEFAULT_APP_FEATURE_FLAGS.enableTabbedMode).toBe(true);
      expect(DEFAULT_APP_FEATURE_FLAGS.enablePerModuleControl).toBe(true);
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('tabbedModeModuleOverrides');
    });

    it('should have specific module overrides for tabbed mode', () => {
      const overrides = DEFAULT_APP_FEATURE_FLAGS.tabbedModeModuleOverrides;
      expect(overrides).toHaveProperty('dashboard');
      expect(overrides).toHaveProperty('settings');
      expect(overrides).toHaveProperty('reports');
      expect(overrides).toHaveProperty('academics');
      expect(overrides).toHaveProperty('administration');
      expect(overrides).toHaveProperty('finance');
    });

    it('should enable tabbed mode for dashboard, settings, and reports only', () => {
      const overrides = DEFAULT_APP_FEATURE_FLAGS.tabbedModeModuleOverrides;
      expect(overrides.dashboard).toBe(true);
      expect(overrides.settings).toBe(true);
      expect(overrides.reports).toBe(true);
      expect(overrides.academics).toBe(false);
      expect(overrides.administration).toBe(false);
      expect(overrides.finance).toBe(false);
    });

    it('should have demo/test mode flags', () => {
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('demoMode');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('testMode');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableTestDataGeneration');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('showDebugInfo');
      expect(DEFAULT_APP_FEATURE_FLAGS).toHaveProperty('enableTestLogin');
    });

    it('should have disabled demo/test mode flags by default', () => {
      expect(DEFAULT_APP_FEATURE_FLAGS.demoMode).toBe(false);
      expect(DEFAULT_APP_FEATURE_FLAGS.testMode).toBe(false);
      expect(DEFAULT_APP_FEATURE_FLAGS.enableTestDataGeneration).toBe(false);
      expect(DEFAULT_APP_FEATURE_FLAGS.showDebugInfo).toBe(false);
      expect(DEFAULT_APP_FEATURE_FLAGS.enableTestLogin).toBe(false);
    });
  });

  describe('FEATURE_PRESETS', () => {
    it('should have demo preset', () => {
      expect(FEATURE_PRESETS).toHaveProperty('demo');
      expect(FEATURE_PRESETS.demo).toHaveProperty('enhancedDataLayer');
      expect(FEATURE_PRESETS.demo).toHaveProperty('enableOfflineMode');
    });

    it('should have enhanced preset', () => {
      expect(FEATURE_PRESETS).toHaveProperty('enhanced');
      expect(FEATURE_PRESETS.enhanced).toHaveProperty('enableAdvancedReporting');
      expect(FEATURE_PRESETS.enhanced).toHaveProperty('enableAuditLog');
      expect(FEATURE_PRESETS.enhanced).toHaveProperty('enableMultiTenant');
    });

    it('should have development preset', () => {
      expect(FEATURE_PRESETS).toHaveProperty('development');
      expect(FEATURE_PRESETS.development).toHaveProperty('networkStatusIndicator');
      expect(FEATURE_PRESETS.development).toHaveProperty('moduleHealthIndicator');
    });

    it('demo preset should disable offline mode and real-time sync', () => {
      expect(FEATURE_PRESETS.demo.enableOfflineMode).toBe(false);
      expect(FEATURE_PRESETS.demo.enableRealTimeSync).toBe(false);
    });

    it('enhanced preset should enable all advanced features', () => {
      expect(FEATURE_PRESETS.enhanced.enableAdvancedReporting).toBe(true);
      expect(FEATURE_PRESETS.enhanced.enableAuditLog).toBe(true);
      expect(FEATURE_PRESETS.enhanced.enableMultiTenant).toBe(true);
      expect(FEATURE_PRESETS.enhanced.enableRealTimeSync).toBe(true);
      expect(FEATURE_PRESETS.enhanced.enablePerformanceMonitoring).toBe(true);
    });

    it('development preset should enable debugging features', () => {
      expect(FEATURE_PRESETS.development.networkStatusIndicator).toBe(true);
      expect(FEATURE_PRESETS.development.moduleHealthIndicator).toBe(true);
      expect(FEATURE_PRESETS.development.syncStatusComponent).toBe(true);
      expect(FEATURE_PRESETS.development.globalNotifications).toBe(true);
      expect(FEATURE_PRESETS.development.performanceMonitorWidget).toBe(true);
    });

    it('development preset should disable performance optimizations', () => {
      expect(FEATURE_PRESETS.development.performanceOptimizations).toBe(false);
    });
  });

  describe('Feature Flag Resolution', () => {
    it('should merge preset with default features correctly', () => {
      const merged: FeatureConfig = { ...DEFAULT_FEATURES, ...FEATURE_PRESETS.enhanced };

      expect(merged.enableAdvancedReporting).toBe(true); // From enhanced preset
      expect(merged.enableBulkOperations).toBe(true); // From default (not overridden)
      expect(merged.enableOfflineMode).toBe(true); // From default (enhanced doesn't override)
    });

    it('should allow custom feature configuration', () => {
      const customConfig: Partial<FeatureConfig> = {
        enableAdvancedReporting: true,
        enableOfflineMode: false,
      };

      const merged: FeatureConfig = { ...DEFAULT_FEATURES, ...customConfig };

      expect(merged.enableAdvancedReporting).toBe(true);
      expect(merged.enableOfflineMode).toBe(false);
      expect(merged.enableBulkOperations).toBe(true); // Unchanged
    });

    it('should handle empty preset merge', () => {
      const merged: FeatureConfig = { ...DEFAULT_FEATURES, ...{} };

      expect(merged).toEqual(DEFAULT_FEATURES);
    });
  });

  describe('Type Safety', () => {
    it('should have FeatureConfig interface with all boolean properties', () => {
      const testConfig: FeatureConfig = {
        ...DEFAULT_FEATURES,
      };

      // Verify all properties are boolean (except tabbedModeModuleOverrides which is Record)
      Object.entries(testConfig).forEach(([key, value]) => {
        if (key !== 'tabbedModeModuleOverrides') {
          expect(typeof value).toBe('boolean');
        }
      });
    });

    it('should have tabbedModeModuleOverrides as Record<string, boolean>', () => {
      const overrides = DEFAULT_FEATURES.tabbedModeModuleOverrides;

      Object.entries(overrides).forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('Environment-based Feature Resolution', () => {
    it('should provide appropriate features for production environment', () => {
      // Production should use default features with performance optimizations
      const prodFeatures: FeatureConfig = { ...DEFAULT_FEATURES };

      expect(prodFeatures.performanceOptimizations).toBe(true);
      expect(prodFeatures.advancedErrorBoundaries).toBe(true);
      expect(prodFeatures.enablePerformanceMonitoring).toBe(false); // Disabled by default
    });

    it('should provide appropriate features for development environment', () => {
      const devFeatures: FeatureConfig = { ...DEFAULT_FEATURES, ...FEATURE_PRESETS.development };

      expect(devFeatures.networkStatusIndicator).toBe(true);
      expect(devPerformanceOptimizations).toBe(false);
      expect(devFeatures.performanceMonitorWidget).toBe(true);
    });

    it('should provide appropriate features for demo environment', () => {
      const demoFeatures: FeatureConfig = { ...DEFAULT_FEATURES, ...FEATURE_PRESETS.demo };

      expect(demoFeatures.enhancedDataLayer).toBe(true);
      expect(demoFeatures.enableOfflineMode).toBe(false);
      expect(demoFeatures.enableRealTimeSync).toBe(false);
    });
  });
});

// Helper variable for the test above
const devPerformanceOptimizations = FEATURE_PRESETS.development.performanceOptimizations;

// ABOUTME: Integration test for complete configuration switching functionality
// ABOUTME: Tests end-to-end mode switching between development, demo, and production with real providers

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDataModeManager, resetDataModeManager } from '../../services/dataModeManager';
import { getDatabaseProviderFactory } from '../../services/DatabaseProviderFactory';
import { getDataLayerConfig } from '../../config/dataLayerConfig';

describe('Configuration Switching Integration', () => {
  let dataModeManager: ReturnType<typeof getDataModeManager>;

  beforeEach(() => {
    // Reset the singleton before each test
    resetDataModeManager();
    dataModeManager = getDataModeManager();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await dataModeManager.destroy();
    } catch (error) {
      // Ignore cleanup errors
    }
    resetDataModeManager();
  });

  describe('Mode Configuration Loading', () => {
    it('should load development configuration correctly', () => {
      const config = getDataLayerConfig();
      
      expect(config.development).toBeDefined();
      expect(config.development.provider).toBe('sqlite-file');
      expect(config.development.config).toHaveProperty('filename');
    });

    it('should load demo configuration correctly', () => {
      const config = getDataLayerConfig();
      
      expect(config.demo).toBeDefined();
      expect(config.demo.provider).toBe('sqlite');
      expect(config.demo.config).toHaveProperty('storageType', 'opfs');
    });

    it('should load production configuration correctly', () => {
      const config = getDataLayerConfig();
      
      expect(config.production).toBeDefined();
      expect(config.production.provider).toBe('sqlite');
      expect(config.production.config).toHaveProperty('storageType', 'opfs');
    });
  });

  describe('Provider Factory Integration', () => {
    it('should create appropriate providers for each mode', async () => {
      const factory = getDatabaseProviderFactory();
      const config = getDataLayerConfig();

      // Test development provider creation
      const devProvider = await factory.createProvider(
        config.development.provider,
        config.development.config
      );
      expect(devProvider).toBeDefined();
      expect(typeof devProvider.initialize).toBe('function');

      // Test demo provider creation
      const demoProvider = await factory.createProvider(
        config.demo.provider,
        config.demo.config
      );
      expect(demoProvider).toBeDefined();
      expect(typeof demoProvider.initialize).toBe('function');

      // Test production provider creation
      const prodProvider = await factory.createProvider(
        config.production.provider,
        config.production.config
      );
      expect(prodProvider).toBeDefined();
      expect(typeof prodProvider.initialize).toBe('function');
    });

    it('should return available providers', () => {
      const factory = getDatabaseProviderFactory();
      const providers = factory.getAvailableProviders();
      
      expect(providers).toContain('sqlite');
      expect(providers).toContain('sqlite-file');
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Mode Switching', () => {
    it('should successfully switch from development to demo mode', async () => {
      // Initialize in development mode
      await dataModeManager.initializeMode();
      expect(dataModeManager.getCurrentMode()).toBe('development');

      // Switch to demo mode
      await dataModeManager.switchMode('demo');
      expect(dataModeManager.getCurrentMode()).toBe('demo');
      expect(dataModeManager.isInTransition()).toBe(false);
    });

    it('should successfully switch from demo to production mode', async () => {
      // Initialize and switch to demo
      await dataModeManager.initializeMode();
      await dataModeManager.switchMode('demo');
      expect(dataModeManager.getCurrentMode()).toBe('demo');

      // Switch to production
      await dataModeManager.switchMode('production');
      expect(dataModeManager.getCurrentMode()).toBe('production');
      expect(dataModeManager.isInTransition()).toBe(false);
    });

    it('should handle full cycle: dev -> demo -> production -> dev', async () => {
      // Start in development
      await dataModeManager.initializeMode();
      expect(dataModeManager.getCurrentMode()).toBe('development');

      // Switch to demo
      await dataModeManager.switchMode('demo');
      expect(dataModeManager.getCurrentMode()).toBe('demo');

      // Switch to production
      await dataModeManager.switchMode('production');
      expect(dataModeManager.getCurrentMode()).toBe('production');

      // Switch back to development
      await dataModeManager.switchMode('development');
      expect(dataModeManager.getCurrentMode()).toBe('development');
    });
  });

  describe('Data Management Integration', () => {
    beforeEach(async () => {
      await dataModeManager.initializeMode();
    });

    it('should clear data successfully', async () => {
      // This should not throw an error
      await expect(dataModeManager.clearAllData()).resolves.not.toThrow();
    });

    it('should seed demo data when switching to demo mode', async () => {
      // Switch to demo mode with data seeding
      await expect(
        dataModeManager.switchMode('demo', { seedData: true })
      ).resolves.not.toThrow();
      
      expect(dataModeManager.getCurrentMode()).toBe('demo');
    });

    it('should handle data preservation during mode switches', async () => {
      // Switch with data preservation
      await expect(
        dataModeManager.switchMode('demo', { preserveData: true })
      ).resolves.not.toThrow();
      
      expect(dataModeManager.getCurrentMode()).toBe('demo');
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide accurate status information', async () => {
      await dataModeManager.initializeMode();
      
      const status = dataModeManager.getStatus();
      expect(status).toHaveProperty('currentMode');
      expect(status).toHaveProperty('isTransitioning');
      expect(status).toHaveProperty('lastTransition');
      expect(status).toHaveProperty('availableModes');
      
      expect(status.currentMode).toBe('development');
      expect(status.isTransitioning).toBe(false);
      expect(Array.isArray(status.availableModes)).toBe(true);
    });

    it('should track transition states correctly', async () => {
      await dataModeManager.initializeMode();
      
      // Start a mode switch
      const switchPromise = dataModeManager.switchMode('demo');
      
      // Check transition state
      expect(dataModeManager.isInTransition()).toBe(true);
      
      // Wait for completion
      await switchPromise;
      
      // Check final state
      expect(dataModeManager.isInTransition()).toBe(false);
      expect(dataModeManager.getCurrentMode()).toBe('demo');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid mode switches gracefully', async () => {
      await dataModeManager.initializeMode();
      
      // Try to switch to an invalid mode
      await expect(
        dataModeManager.switchMode('invalid' as any)
      ).rejects.toThrow();
      
      // Should remain in original mode
      expect(dataModeManager.getCurrentMode()).toBe('development');
    });

    it('should maintain consistency after errors', async () => {
      await dataModeManager.initializeMode();
      const originalMode = dataModeManager.getCurrentMode();
      
      try {
        await dataModeManager.switchMode('invalid' as any);
      } catch (error) {
        // Expected to fail
      }
      
      // Should not be in transition state after error
      expect(dataModeManager.isInTransition()).toBe(false);
      expect(dataModeManager.getCurrentMode()).toBe(originalMode);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      await dataModeManager.initializeMode();
      await dataModeManager.switchMode('demo');
      
      // Should not throw during cleanup
      await expect(dataModeManager.destroy()).resolves.not.toThrow();
    });

    it('should reset to defaults correctly', async () => {
      await dataModeManager.initializeMode();
      await dataModeManager.switchMode('demo');
      
      await dataModeManager.resetToDefaults();
      
      expect(dataModeManager.getCurrentMode()).toBe('development');
      expect(dataModeManager.isInTransition()).toBe(false);
    });
  });
});
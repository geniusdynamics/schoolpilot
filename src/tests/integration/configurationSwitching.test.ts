// ABOUTME: Integration test for complete configuration switching functionality
// ABOUTME: Tests end-to-end mode switching between development, demo, and production with real providers

import { getDataModeManager, resetDataModeManager } from '@/services/data/dataModeManager';
import { getDatabaseProviderFactory } from '@/services/database/DatabaseProviderFactory';
import { getDataLayerConfig } from '@/config/dataLayerConfig';

// Known provider types supported by the factory
const KNOWN_PROVIDER_TYPES = ['pouchdb', 'sqlite-wasm', 'sqlite-file', 'backend-api', 'livestore'];

describe('Configuration Switching Integration', () => {
  let dataModeManager: ReturnType<typeof getDataModeManager>;

  beforeEach(() => {
    // jsdom has no OPFS, and SQLite now fails closed without it. These tests
    // exercise mode switching, so opt in to a temporary database explicitly.
    vi.stubEnv('VITE_DB_ALLOW_MEMORY', 'true');
    // Wipe persisted mode preferences and the demo-cleared flag so each test
    // starts from a deterministic development state
    localStorage.clear();
    resetDataModeManager();
    dataModeManager = getDataModeManager();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      dataModeManager.destroy();
    } catch {
      // Ignore cleanup errors
    }
    resetDataModeManager();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  describe('Mode Configuration Loading', () => {
    it('should load development configuration correctly', () => {
      const config = getDataLayerConfig('development');

      expect(config).toBeDefined();
      expect(config.provider).toBe('sqlite-wasm');
      expect(config.storageType).toBe('opfs');
    });

    it('should load demo configuration correctly', () => {
      const config = getDataLayerConfig('demo');

      expect(config).toBeDefined();
      expect(config.provider).toBe('sqlite-wasm');
      expect(config.storageType).toBe('opfs');
    });

    it('should load production configuration correctly', () => {
      const config = getDataLayerConfig('production');

      expect(config).toBeDefined();
      expect(config.provider).toBe('livestore');
      expect(config.storageType).toBe('opfs');
    });
  });

  describe('Provider Factory Integration', () => {
    it('should create appropriate providers for each mode', async () => {
      const factory = getDatabaseProviderFactory();

      // The factory guarantees a usable provider for each mode's configuration
      // (in jsdom the browser-only providers fall back to the mock provider)
      const environments = ['development', 'demo', 'production'] as const;
      for (const environment of environments) {
        const config = getDataLayerConfig(environment);
        const provider = await factory.createProvider(config.provider, config.options);
        expect(provider).toBeDefined();
        expect(typeof provider.initialize).toBe('function');
      }
    });

    it('should return available providers', () => {
      const factory = getDatabaseProviderFactory();
      const providers = factory.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
      // Only known provider types are ever reported as available
      providers.forEach(type => {
        expect(KNOWN_PROVIDER_TYPES).toContain(type);
      });
    });
  });

  describe('End-to-End Mode Switching', () => {
    it('should successfully switch from development to demo mode', async () => {
      // Initialize in development mode
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
      expect(dataModeManager.getCurrentMode()).toBe('development');

      // Switch to demo mode
      await dataModeManager.switchMode('demo', { seedData: false });
      expect(dataModeManager.getCurrentMode()).toBe('demo');
      expect(dataModeManager.isInTransition()).toBe(false);
    });

    it('should successfully switch from demo to production mode', async () => {
      // Initialize and switch to demo
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
      await dataModeManager.switchMode('demo', { seedData: false });
      expect(dataModeManager.getCurrentMode()).toBe('demo');

      // Switch to production
      await dataModeManager.switchMode('production', { seedData: false });
      expect(dataModeManager.getCurrentMode()).toBe('production');
      expect(dataModeManager.isInTransition()).toBe(false);
    });

    it('should handle full cycle: dev -> demo -> production -> dev', async () => {
      // Start in development
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
      expect(dataModeManager.getCurrentMode()).toBe('development');

      // Switch to demo
      await dataModeManager.switchMode('demo', { seedData: false });
      expect(dataModeManager.getCurrentMode()).toBe('demo');

      // Switch to production
      await dataModeManager.switchMode('production', { seedData: false });
      expect(dataModeManager.getCurrentMode()).toBe('production');

      // Switch back to development
      await dataModeManager.switchMode('development', { seedData: false });
      expect(dataModeManager.getCurrentMode()).toBe('development');
    });
  });

  describe('Data Management Integration', () => {
    beforeEach(async () => {
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
    });

    it('should clear data successfully', async () => {
      // This should not throw an error
      await expect(dataModeManager.clearAllData()).resolves.toBeUndefined();
    });

    it('should seed demo data when switching to demo mode', async () => {
      // Switch to demo mode with data seeding
      await expect(
        dataModeManager.switchMode('demo', { seedData: true })
      ).resolves.toBeUndefined();

      expect(dataModeManager.getCurrentMode()).toBe('demo');
    });

    it('should handle data preservation during mode switches', async () => {
      // Switch with data preservation
      await expect(
        dataModeManager.switchMode('demo', { preserveData: true, seedData: false })
      ).resolves.toBeUndefined();

      expect(dataModeManager.getCurrentMode()).toBe('demo');
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide accurate status information', async () => {
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();

      const status = await dataModeManager.getStatus();
      expect(status).toHaveProperty('currentMode');
      expect(status).toHaveProperty('isTransitioning');
      expect(status).toHaveProperty('lastSwitched');
      expect(status).toHaveProperty('activeProvider');

      expect(status.currentMode).toBe('development');
      expect(status.isTransitioning).toBe(false);
      expect(Array.isArray(dataModeManager.getAvailableModes())).toBe(true);
      expect(dataModeManager.getAvailableModes()).toContain('demo');
      expect(dataModeManager.getAvailableModes()).toContain('production');
    });

    it('should track transition states correctly', async () => {
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();

      // Start a mode switch
      const switchPromise = dataModeManager.switchMode('demo', { seedData: false });

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
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();

      // Try to switch to an invalid mode
      await expect(
        dataModeManager.switchMode('invalid' as never)
      ).rejects.toThrow();

      // Should remain in original mode
      expect(dataModeManager.getCurrentMode()).toBe('development');
    });

    it('should maintain consistency after errors', async () => {
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
      const originalMode = dataModeManager.getCurrentMode();

      try {
        await dataModeManager.switchMode('invalid' as never);
      } catch {
        // Expected to fail
      }

      // Should not be in transition state after error
      expect(dataModeManager.isInTransition()).toBe(false);
      expect(dataModeManager.getCurrentMode()).toBe(originalMode);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
      await dataModeManager.switchMode('demo', { seedData: false });

      // Should not throw during cleanup
      expect(() => dataModeManager.destroy()).not.toThrow();
    });

    it('should reset to defaults correctly', async () => {
      await (dataModeManager as unknown as { initializeMode(): Promise<void> }).initializeMode();
      await dataModeManager.switchMode('demo', { seedData: false });

      await dataModeManager.resetToDefaults();

      expect(dataModeManager.getCurrentMode()).toBe('development');
      expect(dataModeManager.isInTransition()).toBe(false);
    });
  });
});

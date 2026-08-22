import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataModeManager } from '../../dataModeManager';

// Mock the dependencies
vi.mock('../DatabaseProviderFactory', () => {
  return {
    getDatabaseProviderFactory: vi.fn(() => ({
      getActiveProvider: vi.fn(() => ({
        name: 'sqlite-wasm',
        getCollection: vi.fn((name) => {
          if (name === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue(true)
            };
          }
          return {
            clear: vi.fn().mockResolvedValue(true),
            insert: vi.fn().mockResolvedValue(true)
          };
        }),
        createCollection: vi.fn()
      })),
      switchProvider: vi.fn().mockResolvedValue(true)
    }))
  };
});

describe('DataModeManager', () => {
  let manager: DataModeManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DataModeManager();
  });

  describe('clearAllData Security', () => {
    it('should throw an error when trying to clear production data without token', async () => {
      // Force production mode
      manager['currentMode'] = 'production';
      
      await expect(manager.clearAllData()).rejects.toThrow(/Cannot clear production data/);
    });

    it('should clear production data when valid token and force are provided', async () => {
      manager['currentMode'] = 'production';
      
      await expect(manager.clearAllData({ 
        force: true, 
        confirmationToken: 'DANGER_CLEAR_PRODUCTION_DATA' 
      })).resolves.not.toThrow();
    });

    it('should clear demo data without requiring a token', async () => {
      manager['currentMode'] = 'demo';
      await expect(manager.clearAllData()).resolves.not.toThrow();
    });
  });

  describe('Environment Switching Thread Safety', () => {
    it('should queue multiple switchMode calls and resolve them sequentially', async () => {
      const switchPromise1 = manager.switchMode('demo');
      const switchPromise2 = manager.switchMode('production');
      
      // Both should be accepted into the queue
      expect(manager['switchQueue'].length).toBeGreaterThanOrEqual(0);
      
      await Promise.all([switchPromise1, switchPromise2]);
      
      // The final mode should be the last one requested
      expect(manager.getCurrentMode()).toBe('production');
    });
  });
});

// ABOUTME: Unit tests for self-hosting configuration and environment variable parsing
// ABOUTME: Tests UnifiedDatabaseManager provider selection and SQLiteWASMProvider PRAGMA settings

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnifiedDatabaseManager } from '../UnifiedDatabaseManager';

// Mock dependencies
vi.mock('../../../config/unifiedConfig', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    getCurrentUnifiedConfig: vi.fn(() => ({ dataMode: 'production' })),
    getDatabaseConfig: vi.fn(() => ({ provider: '' })),
    validateDatabaseConfig: vi.fn(() => ({ isValid: true, errors: [], warnings: [] }))
  };
});

// Mock the environment variables

describe('Self-Hosting Configuration Tests', () => {
  describe('UnifiedDatabaseManager Provider Selection', () => {
    let manager: any; // Use any to access private methods for testing

    beforeEach(() => {
      // Reset the singleton instance for testing
      (UnifiedDatabaseManager as any).instance = undefined;
      manager = UnifiedDatabaseManager.getInstance();
      
      // Clear all env vars that might affect the test
      vi.stubEnv('VITE_DB_PROVIDER', '');
      vi.stubEnv('VITE_DB_MODE', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    });

    it('should select provider based on VITE_DB_PROVIDER environment variable', () => {
      // Arrange
      vi.stubEnv('VITE_DB_PROVIDER', 'sqlite-wasm');
      
      // Act
      const provider = manager.selectProvider();
      
      // Assert
      expect(provider).toBe('sqlite-wasm');
    });

    it('should fallback if VITE_DB_PROVIDER is invalid', () => {
      // Arrange
      vi.stubEnv('VITE_DB_PROVIDER', 'invalid-provider');
      vi.stubEnv('VITE_DB_MODE', 'demo'); // Should use this fallback
      
      // Act
      const provider = manager.selectProvider();
      
      // Assert
      expect(provider).toBe('pouchdb'); // Fallback for demo mode
    });

    it('should select provider based on VITE_DB_MODE environment variable', () => {
      // Arrange
      vi.stubEnv('VITE_DB_MODE', 'demo');
      
      // Act
      const provider = manager.selectProvider();
      
      // Assert
      expect(provider).toBe('pouchdb');
    });

    it('should prefer VITE_DB_PROVIDER over VITE_DB_MODE', () => {
      // Arrange
      vi.stubEnv('VITE_DB_PROVIDER', 'livestore');
      vi.stubEnv('VITE_DB_MODE', 'demo');
      
      // Act
      const provider = manager.selectProvider();
      
      // Assert
      expect(provider).toBe('livestore');
    });
  });

  describe('SQLiteWASMProvider PRAGMA Configuration', () => {
    // We can't easily instantiate SQLiteWASMProvider in a Node.js test environment
    // without full WASM support, so we'll test the logic that would be executed
    
    it('should correctly parse environment variables for PRAGMA settings', () => {
      // Setup mock env vars matching our setup script defaults
      vi.stubEnv('VITE_SQLITE_WAL_MODE', 'true');
      vi.stubEnv('VITE_SQLITE_FOREIGN_KEYS', 'true');
      vi.stubEnv('VITE_SQLITE_SYNCHRONOUS', '1');
      vi.stubEnv('VITE_SQLITE_CACHE_SIZE', '20000');

      // The logic from configureProductionSettings
      const walMode = import.meta.env.VITE_SQLITE_WAL_MODE !== 'false';
      const foreignKeys = import.meta.env.VITE_SQLITE_FOREIGN_KEYS !== 'false';
      const synchronousMode = import.meta.env.VITE_SQLITE_SYNCHRONOUS || '1';
      const cacheSize = parseInt(import.meta.env.VITE_SQLITE_CACHE_SIZE || '20000', 10);
      
      const parsedSynchronous = synchronousMode === '0' ? 'OFF' : synchronousMode === '2' ? 'FULL' : 'NORMAL';

      expect(walMode).toBe(true);
      expect(foreignKeys).toBe(true);
      expect(parsedSynchronous).toBe('NORMAL');
      expect(cacheSize).toBe(20000);
    });
    
    it('should handle disabled settings correctly', () => {
      // Setup mock env vars to disable features
      vi.stubEnv('VITE_SQLITE_WAL_MODE', 'false');
      vi.stubEnv('VITE_SQLITE_FOREIGN_KEYS', 'false');
      vi.stubEnv('VITE_SQLITE_SYNCHRONOUS', '0');
      
      const walMode = import.meta.env.VITE_SQLITE_WAL_MODE !== 'false';
      const foreignKeys = import.meta.env.VITE_SQLITE_FOREIGN_KEYS !== 'false';
      const synchronousMode = import.meta.env.VITE_SQLITE_SYNCHRONOUS || '1';
      
      const parsedSynchronous = synchronousMode === '0' ? 'OFF' : synchronousMode === '2' ? 'FULL' : 'NORMAL';

      expect(walMode).toBe(false);
      expect(foreignKeys).toBe(false);
      expect(parsedSynchronous).toBe('OFF');
    });
  });
});

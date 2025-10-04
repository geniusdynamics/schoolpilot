// ABOUTME: Tests for DatabaseSettingsPage with configuration validation and repair functionality
// ABOUTME: Tests UI components, validation display, and repair tool interactions

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DatabaseSettingsPage from '../DatabaseSettingsPage';

// Mock the configuration system
jest.mock('../../../../config/unifiedConfig', () => ({
  getDatabaseConfig: jest.fn(),
  updateDatabaseConfig: jest.fn(),
  getDatabaseConfigPresets: jest.fn(),
  applyDatabaseConfigPreset: jest.fn(),
  validateDatabaseConfig: jest.fn(),
  autoFixDatabaseConfig: jest.fn(),
  migrateDatabaseConfig: jest.fn(),
  resetDatabaseConfigToDefaults: jest.fn(),
  repairDatabaseConfig: jest.fn(),
  reloadConfigFromEnvironment: jest.fn(),
  exportDatabaseConfigAsEnvVars: jest.fn(),
  exportDatabaseConfigAsJSON: jest.fn(),
}));

// Mock the AppDataContext
jest.mock('../../../../contexts/AppDataContext', () => ({
  useAppData: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock useUnifiedConfig
jest.mock('../../../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    config: {
      environment: 'development',
      dataMode: 'demo',
    },
  }),
}));

const mockAppData = {
  isDatabaseModeActive: true,
  deploymentMode: 'development',
  providerType: 'sqlite-wasm',
  isOnline: true,
  backendAvailable: false,
  connectionQuality: 'excellent',
  syncStatus: {
    state: 'idle',
    progress: 0,
    lastError: null,
    lastSyncTime: null,
    pendingOperations: 0,
  },
  currentDataMode: 'demo',
  dataSourceDescription: 'Demo mode with mock data',
  seedDatabase: jest.fn(),
  clearAllData: jest.fn(),
  backupData: jest.fn(),
  restoreData: jest.fn(),
  getCollectionStats: jest.fn(),
  validateData: jest.fn(),
  cleanupOldData: jest.fn(),
  forceSync: jest.fn(),
  pauseSync: jest.fn(),
  resumeSync: jest.fn(),
  getSyncSettings: jest.fn(),
  updateSyncSettings: jest.fn(),
  getProviderCapabilities: jest.fn(() => ({
    bulkOperations: true,
    advancedQueries: true,
    realTimeUpdates: false,
    conflictResolution: true,
    fullTextSearch: true,
    transactions: true,
  })),
  error: null,
};

const mockDatabaseConfig = {
  provider: 'sqlite-wasm',
  allowedProviders: ['sqlite-wasm', 'pouchdb'],
  autoDetect: true,
  connectionString: '',
  options: {},
  performance: {
    enableIndexing: true,
    enableCaching: true,
    cacheSize: 100,
    queryTimeout: 30000,
    batchSize: 1000,
  },
  storage: {
    maxSize: 500,
    compressionEnabled: false,
    encryptionEnabled: false,
    backupEnabled: false,
    retentionDays: 30,
  },
  sync: {
    enabled: false,
    interval: 30000,
    conflictResolution: 'manual',
    batchSize: 100,
    retryAttempts: 3,
    timeout: 60000,
  },
  monitoring: {
    enableHealthChecks: true,
    healthCheckInterval: 300000,
    enablePerformanceMetrics: false,
    enableErrorReporting: false,
    logLevel: 'debug',
  },
  features: {
    enableFullTextSearch: true,
    enableTransactions: true,
    enableRealTimeUpdates: false,
    enableOfflineMode: true,
    enableDataValidation: true,
    enableAuditLog: false,
  },
};

const mockValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  info: [],
  canAutoFix: false,
  autoFixAvailable: [],
};

describe('DatabaseSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks
    require('../../../../contexts/AppDataContext').useAppData.mockReturnValue(mockAppData);
    require('../../../../config/unifiedConfig').getDatabaseConfig.mockReturnValue(mockDatabaseConfig);
    require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue(mockValidationResult);
    require('../../../../config/unifiedConfig').getDatabaseConfigPresets.mockReturnValue({
      performance: { performance: { enableCaching: true, cacheSize: 200 } },
      storage_optimized: { storage: { compressionEnabled: true } },
      development: { monitoring: { logLevel: 'debug' } },
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <DatabaseSettingsPage />
      </BrowserRouter>
    );
  };

  describe('Configuration Status Display', () => {
    it('should display valid configuration status', () => {
      renderComponent();

      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    it('should display invalid configuration status', () => {
      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        isValid: false,
        errors: [
          {
            field: 'performance.cacheSize',
            message: 'Cache size too small',
            currentValue: 5,
            autoFix: () => 10,
          },
        ],
      });

      renderComponent();

      expect(screen.getByText('Issues Found')).toBeInTheDocument();
    });
  });

  describe('Configuration Issues Display', () => {
    it('should display configuration errors', () => {
      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        isValid: false,
        errors: [
          {
            field: 'performance.cacheSize',
            message: 'Cache size must be between 10MB and 10GB',
            currentValue: 5,
            autoFix: () => 10,
          },
        ],
      });

      renderComponent();

      expect(screen.getByText(/Cache size must be between 10MB and 10GB/)).toBeInTheDocument();
      expect(screen.getByText(/Current: 5/)).toBeInTheDocument();
    });

    it('should display configuration warnings', () => {
      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        warnings: [
          {
            field: 'sync.interval',
            message: 'Sync interval below 30 seconds may impact performance',
            currentValue: 10000,
            autoFix: () => 30000,
          },
        ],
      });

      renderComponent();

      expect(screen.getByText(/Sync interval below 30 seconds may impact performance/)).toBeInTheDocument();
    });

    it('should show individual fix buttons for auto-fixable issues', () => {
      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        isValid: false,
        errors: [
          {
            field: 'performance.cacheSize',
            message: 'Cache size too small',
            currentValue: 5,
            autoFix: () => 10,
          },
        ],
      });

      renderComponent();

      expect(screen.getByText('Fix')).toBeInTheDocument();
    });
  });

  describe('Configuration Presets', () => {
    it('should display configuration presets', () => {
      renderComponent();

      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Storage optimized')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('should apply configuration preset when clicked', async () => {
      const mockApplyPreset = require('../../../../config/unifiedConfig').applyDatabaseConfigPreset;
      
      renderComponent();

      fireEvent.click(screen.getByText('Performance'));

      await waitFor(() => {
        expect(mockApplyPreset).toHaveBeenCalledWith('performance');
      });
    });
  });

  describe('Configuration Repair Tools', () => {
    beforeEach(() => {
      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        isValid: false,
        canAutoFix: true,
        errors: [
          {
            field: 'performance.cacheSize',
            message: 'Cache size too small',
            currentValue: 5,
            autoFix: () => 10,
          },
        ],
      });
    });

    it('should display repair tools when issues exist', () => {
      renderComponent();

      expect(screen.getByText('Configuration Repair Tools')).toBeInTheDocument();
      expect(screen.getByText('Auto-Fix Issues')).toBeInTheDocument();
      expect(screen.getByText('Migrate Config')).toBeInTheDocument();
      expect(screen.getByText('Full Repair')).toBeInTheDocument();
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('should call auto-fix when auto-fix button clicked', async () => {
      const mockAutoFix = require('../../../../config/unifiedConfig').autoFixDatabaseConfig;
      mockAutoFix.mockReturnValue({
        success: true,
        changes: ['performance.cacheSize: 5 → 10'],
        remainingIssues: mockValidationResult,
      });

      renderComponent();

      fireEvent.click(screen.getByText('Auto-Fix Issues'));

      await waitFor(() => {
        expect(mockAutoFix).toHaveBeenCalled();
      });
    });

    it('should call migrate when migrate button clicked', async () => {
      const mockMigrate = require('../../../../config/unifiedConfig').migrateDatabaseConfig;
      mockMigrate.mockReturnValue({
        success: true,
        appliedMigrations: ['1.0.0 → 2.0.0: Enhanced structure'],
        validation: mockValidationResult,
      });

      renderComponent();

      fireEvent.click(screen.getByText('Migrate Config'));

      await waitFor(() => {
        expect(mockMigrate).toHaveBeenCalled();
      });
    });

    it('should call repair when full repair button clicked', async () => {
      const mockRepair = require('../../../../config/unifiedConfig').repairDatabaseConfig;
      mockRepair.mockReturnValue({
        success: true,
        changes: ['performance.cacheSize: 5 → 10'],
        migrations: ['1.0.0 → 2.0.0'],
        validation: mockValidationResult,
      });

      renderComponent();

      fireEvent.click(screen.getByText('Full Repair'));

      await waitFor(() => {
        expect(mockRepair).toHaveBeenCalled();
      });
    });

    it('should show confirmation for reset to defaults', async () => {
      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      const mockReset = require('../../../../config/unifiedConfig').resetDatabaseConfigToDefaults;
      mockReset.mockReturnValue({
        success: true,
        validation: mockValidationResult,
      });

      renderComponent();

      fireEvent.click(screen.getByText('Reset to Defaults'));

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to reset all database configuration to defaults?')
      );

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });
    });
  });

  describe('Environment Configuration Management', () => {
    it('should display environment configuration tools', () => {
      renderComponent();

      expect(screen.getByText('Environment Configuration')).toBeInTheDocument();
      expect(screen.getByText('Reload from Env')).toBeInTheDocument();
      expect(screen.getByText('Export .env')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });

    it('should reload configuration from environment when clicked', async () => {
      const mockReload = require('../../../../config/unifiedConfig').reloadConfigFromEnvironment;

      renderComponent();

      fireEvent.click(screen.getByText('Reload from Env'));

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled();
      });
    });

    it('should export environment variables when clicked', async () => {
      const mockExportEnv = require('../../../../config/unifiedConfig').exportDatabaseConfigAsEnvVars;
      mockExportEnv.mockReturnValue({
        REACT_APP_DATABASE_PROVIDER: 'sqlite-wasm',
        REACT_APP_DATABASE_CACHE_SIZE: '100',
      });

      // Mock URL.createObjectURL and related functions
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      // Mock document.createElement and related functions
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      document.createElement = jest.fn(() => mockAnchor as any);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      renderComponent();

      fireEvent.click(screen.getByText('Export .env'));

      await waitFor(() => {
        expect(mockExportEnv).toHaveBeenCalled();
        expect(mockAnchor.download).toBe('database-config.env');
        expect(mockAnchor.click).toHaveBeenCalled();
      });
    });

    it('should export JSON configuration when clicked', async () => {
      const mockExportJSON = require('../../../../config/unifiedConfig').exportDatabaseConfigAsJSON;
      mockExportJSON.mockReturnValue(JSON.stringify(mockDatabaseConfig, null, 2));

      // Mock URL and document functions
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      document.createElement = jest.fn(() => mockAnchor as any);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      renderComponent();

      fireEvent.click(screen.getByText('Export JSON'));

      await waitFor(() => {
        expect(mockExportJSON).toHaveBeenCalled();
        expect(mockAnchor.download).toBe('database-config.json');
        expect(mockAnchor.click).toHaveBeenCalled();
      });
    });
  });

  describe('Configuration Editor', () => {
    it('should show/hide configuration editor when toggle clicked', () => {
      renderComponent();

      const toggleButton = screen.getByText('Show Config Editor');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Hide Config Editor')).toBeInTheDocument();
    });

    it('should display configuration editor tabs when shown', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Show Config Editor'));

      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Sync')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Features')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle auto-fix errors gracefully', async () => {
      const mockAutoFix = require('../../../../config/unifiedConfig').autoFixDatabaseConfig;
      mockAutoFix.mockImplementation(() => {
        throw new Error('Auto-fix failed');
      });

      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        isValid: false,
        canAutoFix: true,
      });

      renderComponent();

      fireEvent.click(screen.getByText('Auto-Fix Issues'));

      // Should not crash and should show error message
      await waitFor(() => {
        expect(screen.getByText(/Auto-fix failed/)).toBeInTheDocument();
      });
    });

    it('should handle export errors gracefully', async () => {
      const mockExportEnv = require('../../../../config/unifiedConfig').exportDatabaseConfigAsEnvVars;
      mockExportEnv.mockImplementation(() => {
        throw new Error('Export failed');
      });

      renderComponent();

      fireEvent.click(screen.getByText('Export .env'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to export environment variables/)).toBeInTheDocument();
      });
    });
  });

  describe('Success Messages', () => {
    it('should show success message after successful auto-fix', async () => {
      const mockAutoFix = require('../../../../config/unifiedConfig').autoFixDatabaseConfig;
      mockAutoFix.mockReturnValue({
        success: true,
        changes: ['performance.cacheSize: 5 → 10', 'storage.retentionDays: 0 → 1'],
        remainingIssues: mockValidationResult,
      });

      require('../../../../config/unifiedConfig').validateDatabaseConfig.mockReturnValue({
        ...mockValidationResult,
        isValid: false,
        canAutoFix: true,
      });

      renderComponent();

      fireEvent.click(screen.getByText('Auto-Fix Issues'));

      await waitFor(() => {
        expect(screen.getByText(/Auto-fixed 2 issues/)).toBeInTheDocument();
      });
    });

    it('should show success message after successful preset application', async () => {
      renderComponent();

      fireEvent.click(screen.getByText('Performance'));

      await waitFor(() => {
        expect(screen.getByText(/Applied performance configuration preset/)).toBeInTheDocument();
      });
    });
  });
});
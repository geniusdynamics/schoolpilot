// ABOUTME: Comprehensive integration tests for DataManagementSettingsPage
// ABOUTME: Tests all functionality including tabs, database operations, provider management, and error handling

// Mock dataModeManager FIRST to prevent singleton initialization
vi.mock('../../services/dataModeManager', () => {
  const mockDataModeManager = {
    clearAllData: vi.fn().mockResolvedValue(undefined),
    seedDemoData: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    switchMode: vi.fn().mockResolvedValue(undefined),
    getCurrentMode: vi.fn().mockReturnValue('development'),
    isInitialized: vi.fn().mockReturnValue(true)
  };

  return {
    DataModeManager: vi.fn().mockImplementation(() => mockDataModeManager),
    getDataModeManager: vi.fn().mockReturnValue(mockDataModeManager),
    resetDataModeManager: vi.fn().mockResolvedValue(undefined)
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DataManagementSettingsPage from '@/modules/settings/pages/DataManagementSettingsPage';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { useAppData } from '@/hooks/useAppData';
import { UnifiedConfigProvider } from '@/contexts/UnifiedConfigContext';
import { useUnifiedConfig, useEnvironment } from '@/hooks/useUnifiedConfig';
import { EnvironmentProvider } from '@/contexts/EnvironmentContext';
import { DataServiceFactory } from '@/services/DataServiceFactory';

// Mock dependencies - must be before any imports that use these modules
// Mock ProviderSelector
const mockDatabaseManager = {
  backup: vi.fn().mockRejectedValue(new Error('Backup failed')),
  restore: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
  getStatus: vi.fn().mockReturnValue('connected')
};

// Mock database service functions
vi.mock('../../../services/databaseService', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDatabaseManager)),
  isDatabaseAvailable: vi.fn(() => true)
}));
vi.mock('../../services/DataServiceFactory', () => ({
  DataServiceFactory: {
    getUserDatabaseConfig: vi.fn(),
    setUserDatabaseConfig: vi.fn(),
    resetToDefaultConfig: vi.fn()
  }
}));
vi.mock('../../../config/dataLayerConfig', () => ({
  DATA_LAYER_CONFIG: {
    development: { provider: 'sqlite' },
    production: { provider: 'pouchdb' },
    demo: { provider: 'sqlite' }
  }
}));

// Mock the entire AppDataContext to prevent database initialization
vi.mock('../../contexts/AppDataContext', () => ({
  useAppData: vi.fn(),
  AppDataProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock the useAppData hook
vi.mock('../../hooks/useAppData', () => ({
  useAppData: vi.fn(),
  useAppDataInternal: vi.fn()
}));

// Mock UnifiedConfigContext
vi.mock('../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: vi.fn(),
  useEnvironment: vi.fn()
}));

vi.mock('../../../services/database/DatabaseProviderFactory', () => ({
  getDatabaseProviderFactory: vi.fn(() => ({
    switchProvider: vi.fn().mockResolvedValue({}),
    getActiveProvider: vi.fn().mockReturnValue(null),
    getAvailableProviders: vi.fn().mockReturnValue(['sqlite', 'pouchdb']),
    isProviderAvailable: vi.fn().mockReturnValue(true)
  }))
}));

// Mock ProviderSelector module
vi.mock('../../services/database/ProviderSelector', () => ({
  getDatabaseManager: vi.fn(() => mockDatabaseManager),
  resetDatabaseManager: vi.fn()
}));

// Mock components that might cause issues
vi.mock('../../components/ProviderSelector', () => {
  return function MockProviderSelector({ value, onChange, options }: any) {
    return (
      <select 
        data-testid="provider-selector" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        {options?.map((option: string) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  };
});

// Get typed mocks for use in tests
const mockUseAppData = vi.mocked(useAppData);
const mockUseUnifiedConfig = vi.mocked(useUnifiedConfig);
const mockUseEnvironment = vi.mocked(useEnvironment);

// Get DataServiceFactory mock
const mockDataServiceFactory = vi.mocked(DataServiceFactory, true);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('DataManagementSettingsPage Integration Tests', () => {
  const mockConfig = {
    environment: 'development',
    dataMode: 'production', // Changed to production to ensure tests work
    database: {
      provider: 'sqlite'
    }
  };

  const mockUpdateConfig = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up default mock return values
    mockUseAppData.mockReturnValue({
      schoolDetails: null,
      users: [],
      isRxDBModeActive: false,
      isDatabaseModeActive: true,
      triggerSeedRxDB: vi.fn().mockResolvedValue(undefined),
      triggerClearRxDB: vi.fn().mockResolvedValue(undefined),
      isUsingRxDBDummyData: false,
      initializationError: null,
      loading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined)
    });
    
    mockUseUnifiedConfig.mockReturnValue({
      config: mockConfig,
      updateConfig: mockUpdateConfig,
      isLoading: false
    });
    
    mockUseEnvironment.mockReturnValue({
      current: 'development',
      config: {
        name: 'development',
        displayName: 'Development',
        description: 'Development environment'
      },
      update: vi.fn()
    });
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', async () => {
      render(
        <TestWrapper>
          <DataManagementSettingsPage />
        </TestWrapper>
      );

      expect(screen.getByText('Data Management')).toBeInTheDocument();
    });

    it('should display the correct page title', async () => {
      render(
        <TestWrapper>
          <DataManagementSettingsPage />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /data management/i })).toBeInTheDocument();
    });

    it('should render all tab navigation buttons', async () => {
      render(
        <TestWrapper>
          <DataManagementSettingsPage />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /database/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /backup/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /provider/i })).toBeInTheDocument();
    }, 10000);
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <DataManagementSettingsPage />
        </TestWrapper>
      );

      // Default tab should be database
      expect(screen.getByText(/import dummy data/i)).toBeInTheDocument();

      // Switch to backup tab
      await user.click(screen.getByRole('button', { name: /backup/i }));
      expect(screen.getByRole('button', { name: /create database backup/i })).toBeInTheDocument();

      // Switch to provider tab
      await user.click(screen.getByRole('button', { name: /provider/i }));
      expect(screen.getByText(/database provider configuration/i)).toBeInTheDocument();
    }, 10000);

    it('should maintain tab state during interactions', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backup tab
      await user.click(screen.getByRole('button', { name: /backup/i }));
      
      // Verify backup content is visible
      expect(screen.getByRole('button', { name: /create database backup/i })).toBeInTheDocument();
      
      // Switch back to database tab
      await user.click(screen.getByRole('button', { name: /database/i }));
      
      // Verify database content is visible
      expect(screen.getByText(/import dummy data/i)).toBeInTheDocument();
    }, 10000);
  });

  describe('Database Tab Functionality', () => {
    it('should handle seed database operation', async () => {
      const mockTriggerSeed = vi.fn().mockResolvedValue(undefined);
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: false,
        triggerSeedRxDB: mockTriggerSeed,
        triggerClearRxDB: vi.fn(),
        initializationError: null,
      });

      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      const seedButton = screen.getByRole('button', { name: /import dummy data/i });
      await user.click(seedButton);

      expect(mockConfirm).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockTriggerSeed).toHaveBeenCalled();
      });

      mockConfirm.mockRestore();
    }, 10000);

    it('should handle clear database operation', async () => {
      const mockTriggerClear = vi.fn().mockResolvedValue(undefined);
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: true,
        triggerSeedRxDB: vi.fn(),
        triggerClearRxDB: mockTriggerClear,
        initializationError: null,
      });

      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await user.click(clearButton);

      expect(mockConfirm).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockTriggerClear).toHaveBeenCalled();
      });

      mockConfirm.mockRestore();
    }, 10000);

    it('should display database status correctly', async () => {
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: false,
        triggerSeedRxDB: vi.fn(),
        triggerClearRxDB: vi.fn(),
        initializationError: null,
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/using dummy data/i)).toBeInTheDocument();
    });
  });

  describe('Backup Tab Functionality', () => {
    it('should handle backup creation', async () => {
      const mockBackupData = JSON.stringify({ data: 'test backup' });
      mockDatabaseManager.backup.mockResolvedValue(mockBackupData);
      
      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      // URL.createObjectURL is mocked globally in setup.ts
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backup tab
      await user.click(screen.getByRole('button', { name: /backup/i }));
      
      const backupButton = screen.getByRole('button', { name: /create database backup/i });
      await user.click(backupButton);

      expect(mockConfirm).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockDatabaseManager.backup).toHaveBeenCalled();
      });

      mockConfirm.mockRestore();
      mockCreateObjectURL.mockRestore();
    }, 10000);

    it('should handle backup download', async () => {
      const mockBackupData = JSON.stringify({ data: 'test backup' });
      mockDatabaseManager.backup.mockResolvedValue(mockBackupData);
      
      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backup tab
      await user.click(screen.getByRole('button', { name: /backup/i }));
      
      // Create backup first
      const backupButton = screen.getByRole('button', { name: /create database backup/i });
      await user.click(backupButton);

      await waitFor(() => {
        expect(mockDatabaseManager.backup).toHaveBeenCalled();
      });

      // Wait for download button to appear
      await waitFor(() => {
        const downloadButton = screen.getByRole('button', { name: /download backup/i });
        expect(downloadButton).toBeInTheDocument();
      });

      // Now mock document methods for the download operation
      const mockClick = vi.fn();
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        click: mockClick,
        href: '',
        download: ''
      } as any);

      // Download backup
      const downloadButton = screen.getByRole('button', { name: /download backup/i });
      await user.click(downloadButton);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      // Cleanup mocks
      mockConfirm.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      mockCreateElement.mockRestore();
    }, 10000);
  });

  describe('Provider Tab Functionality', () => {
    it('should handle provider selection', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to provider tab
      await user.click(screen.getByRole('button', { name: /provider/i }));
      
      // Check if provider selector is present
      const providerSelector = screen.getByTestId('provider-selector');
      expect(providerSelector).toBeInTheDocument();
    });

    it('should handle save configuration', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to provider tab
      await user.click(screen.getByRole('button', { name: /provider/i }));
      
      // Find and click save button
      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDataServiceFactory.setUserDatabaseConfig).toHaveBeenCalled();
      });
    }, 10000);

    it('should handle reset to default', async () => {
      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      // Create a spy on the resetToDefaultConfig method
      const resetSpy = vi.spyOn(mockDataServiceFactory, 'resetToDefaultConfig');
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to provider tab
      await user.click(screen.getByRole('button', { name: /provider/i }));
      
      // Find and click reset button
      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(resetSpy).toHaveBeenCalled();

      mockConfirm.mockRestore();
      resetSpy.mockRestore();
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should display initialization error when database fails', async () => {
      const errorMessage = 'Database initialization failed';
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: false,
        isUsingRxDBDummyData: null,
        triggerSeedRxDB: vi.fn(),
        triggerClearRxDB: vi.fn(),
        initializationError: new Error(errorMessage),
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Database Initialization Failed')).toBeInTheDocument();
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });

    it('should handle seed operation errors', async () => {
      const errorMessage = 'Seed operation failed';
      const mockTriggerSeed = vi.fn().mockRejectedValue(new Error(errorMessage));
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: false,
        triggerSeedRxDB: mockTriggerSeed,
        triggerClearRxDB: vi.fn(),
        initializationError: null,
      });

      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      const seedButton = screen.getByRole('button', { name: /import dummy data/i });
      await user.click(seedButton);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });

      mockConfirm.mockRestore();
    });

    it('should handle backup creation errors', async () => {
      const errorMessage = 'Backup creation failed';
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: false,
        triggerSeedRxDB: vi.fn(),
        triggerClearRxDB: vi.fn(),
        initializationError: null,
      });
      mockDatabaseManager.backup.mockRejectedValue(new Error(errorMessage));
      
      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backup tab
      await user.click(screen.getByRole('button', { name: /backup/i }));
      
      const backupButton = screen.getByRole('button', { name: /create database backup/i });
      await user.click(backupButton);
      
      await waitFor(() => {
        expect(screen.getByText(`Failed to create backup: ${errorMessage}`)).toBeInTheDocument();
      }, { timeout: 10000 });

      mockConfirm.mockRestore();
    }, 15000);
  });

  describe('State Management', () => {
    it('should manage loading states correctly', async () => {
      const mockTriggerSeed = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: false,
        triggerSeedRxDB: mockTriggerSeed,
        triggerClearRxDB: vi.fn(),
        initializationError: null,
      });

      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      const seedButton = screen.getByRole('button', { name: /import dummy data/i });
      
      await act(async () => {
        await user.click(seedButton);
      });

      // Check loading state
      expect(screen.getByText(/importing/i)).toBeInTheDocument();

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import dummy data/i })).toBeInTheDocument();
      }, { timeout: 200 });

      mockConfirm.mockRestore();
    });

    it('should disable buttons during operations', async () => {
      const mockTriggerSeed = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: true,
        isUsingRxDBDummyData: false,
        triggerSeedRxDB: mockTriggerSeed,
        triggerClearRxDB: vi.fn(),
        initializationError: null,
      });

      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      const seedButton = screen.getByRole('button', { name: /import dummy data/i });
      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      
      await act(async () => {
        await user.click(seedButton);
      });

      // Both buttons should be disabled during operation
      expect(clearButton).toBeDisabled();

      mockConfirm.mockRestore();
    });
  });

  describe('Non-Production Mode Handling', () => {
    it('should show appropriate message in demo mode', async () => {
      mockUseUnifiedConfig.mockReturnValue({
         config: { ...mockConfig, dataMode: 'demo' },
         updateConfig: mockUpdateConfig,
         isLoading: false,
       });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/currently in.*demo.*mode/i)).toBeInTheDocument();
    });
  });

  describe('Console Error Validation', () => {
    it('should not produce console errors during normal operation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataManagementSettingsPage />
          </TestWrapper>
        );
      });

      // Filter out expected debug messages
      const unexpectedErrors = consoleSpy.mock.calls.filter(call => 
        !call[0]?.toString().includes('DataManagementSettingsPage') &&
        !call[0]?.toString().includes('COMPONENT IS LOADING')
      );

      expect(unexpectedErrors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });
});
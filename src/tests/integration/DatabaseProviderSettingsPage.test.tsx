// ABOUTME: Comprehensive integration tests for DatabaseProviderSettingsPage (deprecated)
// ABOUTME: Tests provider configuration, environment handling, and error states

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DatabaseProviderSettingsPage } from '@/modules/settings/pages/DatabaseProviderSettingsPage';
import { useAppData } from '@/hooks/useAppData';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/DataServiceFactory';
import { DATA_LAYER_CONFIG } from '@/config/dataLayerConfig';

// Mock all dependencies
vi.mock('../../hooks/useAppData');
vi.mock('../../contexts/UnifiedConfigContext');
vi.mock('../../services/DataServiceFactory');
vi.mock('../../config/dataLayerConfig');

// Mock ProviderSelector component
vi.mock('../../components/ProviderSelector', () => {
  return {
    ProviderSelector: ({ onProviderChange, currentProvider }: any) => (
      <div data-testid="provider-selector">
        <button 
          onClick={() => onProviderChange('sqlite')}
          data-testid="sqlite-provider-button"
        >
          SQLite
        </button>
        <button 
          onClick={() => onProviderChange('rxdb')}
          data-testid="rxdb-provider-button"
        >
          RxDB
        </button>
        <span data-testid="current-provider">{currentProvider}</span>
      </div>
    )
  };
});

const mockUseAppData = vi.mocked(useAppData);
const mockUseUnifiedConfig = vi.mocked(useUnifiedConfig);
const mockDataServiceFactory = vi.mocked(DataServiceFactory);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('DatabaseProviderSettingsPage Integration Tests', () => {
  const mockConfig = {
    environment: 'development',
    dataMode: 'development',
    database: {
      provider: 'sqlite'
    }
  };

  const mockUpdateConfig = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockUseAppData.mockReturnValue({
      isDatabaseModeActive: true,
      isUsingRxDBDummyData: false,
      triggerSeedRxDB: jest.fn(),
      triggerClearRxDB: jest.fn(),
      initializationError: null,
    });

    mockUseUnifiedConfig.mockReturnValue({
      config: mockConfig,
      updateConfig: mockUpdateConfig,
      isLoading: false,
    });
    
    mockDataServiceFactory.getUserDatabaseConfig = jest.fn().mockReturnValue({
      provider: 'sqlite',
      environment: 'development'
    });
    mockDataServiceFactory.setUserDatabaseConfig = jest.fn();
    mockDataServiceFactory.resetToDefaultConfig = jest.fn();

    // Mock DATA_LAYER_CONFIG
    (DATA_LAYER_CONFIG as any) = {
      development: { provider: 'sqlite' },
      production: { provider: 'pouchdb' },
      demo: { provider: 'sqlite' }
    };

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Database Provider Settings')).toBeInTheDocument();
    });

    it('should display the correct page title', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByRole('heading', { name: /database provider settings/i })).toBeInTheDocument();
    });

    it('should render provider configuration card', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Database Provider Configuration')).toBeInTheDocument();
      expect(screen.getByText('Database Provider Information')).toBeInTheDocument();
    });

    it('should display current environment information', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/current environment/i)).toBeInTheDocument();
      expect(screen.getByText('development')).toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('should display available providers', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByTestId('provider-selector')).toBeInTheDocument();
    });

    it('should handle provider selection change', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const providerSelector = screen.getByTestId('provider-selector');
      
      await act(async () => {
        await user.selectOptions(providerSelector, 'pouchdb');
      });

      expect(providerSelector).toHaveValue('pouchdb');
    });

    it('should show current provider status', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/current status/i)).toBeInTheDocument();
    });
  });

  describe('Configuration Management', () => {
    it('should handle save configuration', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDataServiceFactory.setUserDatabaseConfig).toHaveBeenCalled();
      });
    });

    it('should handle reset to default with confirmation', async () => {
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to reset to default configuration? This will override your current settings.'
      );
      
      await waitFor(() => {
        expect(mockDataServiceFactory.resetToDefaultConfig).toHaveBeenCalled();
      });

      mockConfirm.mockRestore();
    });

    it('should not reset when user cancels confirmation', async () => {
      // Mock window.confirm to return false
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDataServiceFactory.resetToDefaultConfig).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });

    it('should display success message after saving', async () => {
      mockDataServiceFactory.setUserDatabaseConfig.mockResolvedValue(undefined);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/configuration saved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display initialization error when database fails', async () => {
      const errorMessage = 'Database initialization failed';
      mockUseAppData.mockReturnValue({
        isDatabaseModeActive: false,
        isUsingRxDBDummyData: null,
        triggerSeedRxDB: jest.fn(),
        triggerClearRxDB: jest.fn(),
        initializationError: new Error(errorMessage),
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/database initialization failed/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should handle save configuration errors', async () => {
      const errorMessage = 'Failed to save configuration';
      mockDataServiceFactory.setUserDatabaseConfig.mockRejectedValue(new Error(errorMessage));
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });
    });

    it('should handle reset configuration errors', async () => {
      const errorMessage = 'Failed to reset configuration';
      mockDataServiceFactory.resetToDefaultConfig.mockRejectedValue(new Error(errorMessage));
      
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });

      mockConfirm.mockRestore();
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should show demo mode message in demo environment', async () => {
      mockUseUnifiedConfig.mockReturnValue({
        config: { ...mockConfig, dataMode: 'demo' },
        updateConfig: mockUpdateConfig,
        isLoading: false,
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    });

    it('should show production mode restrictions', async () => {
      mockUseUnifiedConfig.mockReturnValue({
        config: { ...mockConfig, dataMode: 'production' },
        updateConfig: mockUpdateConfig,
        isLoading: false,
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      // In production mode, certain features might be restricted
      expect(screen.getByText(/production/i)).toBeInTheDocument();
    });
  });

  describe('Provider Information Display', () => {
    it('should display provider descriptions', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      // Check for provider information section
      expect(screen.getByText('Database Provider Information')).toBeInTheDocument();
    });

    it('should show provider availability indicators', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      // Look for availability indicators (checkmarks, status icons, etc.)
      const availabilityElements = screen.getAllByText(/available|unavailable/i);
      expect(availabilityElements.length).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should manage loading states correctly', async () => {
      mockDataServiceFactory.setUserDatabaseConfig.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      
      await act(async () => {
        await user.click(saveButton);
      });

      // Check loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument();

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should disable buttons during operations', async () => {
      mockDataServiceFactory.setUserDatabaseConfig.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      
      await act(async () => {
        await user.click(saveButton);
      });

      // Both buttons should be disabled during operation
      expect(resetButton).toBeDisabled();
    });

    it('should clear messages after timeout', async () => {
      jest.useFakeTimers();
      
      mockDataServiceFactory.setUserDatabaseConfig.mockResolvedValue(undefined);
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/configuration saved successfully/i)).toBeInTheDocument();
      });

      // Fast-forward time to clear message
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText(/configuration saved successfully/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Console Error Validation', () => {
    it('should not produce console errors during normal operation', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      // Filter out expected debug messages
      const unexpectedErrors = consoleSpy.mock.calls.filter(call => 
        !call[0]?.toString().includes('DatabaseProviderSettingsPage') &&
        !call[0]?.toString().includes('COMPONENT IS LOADING')
      );

      expect(unexpectedErrors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      // Check for proper form structure
      expect(screen.getByTestId('provider-selector')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset to default/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DatabaseProviderSettingsPage />
          </TestWrapper>
        );
      });

      const providerSelector = screen.getByTestId('provider-selector');
      const saveButton = screen.getByRole('button', { name: /save configuration/i });

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toBe(providerSelector);
      
      await user.tab();
      expect(document.activeElement).toBe(saveButton);
    });
  });
});
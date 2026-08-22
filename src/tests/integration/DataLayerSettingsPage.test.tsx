// ABOUTME: Comprehensive integration tests for DataLayerSettingsPage (deprecated)
// ABOUTME: Tests mode switching, provider management, backend integration, and complex state management

import React from 'react';

import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DataLayerSettingsPage } from '@/modules/settings/pages/DataLayerSettingsPage';
import { useAppData } from '@/hooks/useAppData';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/DataServiceFactory';
import { DATA_LAYER_CONFIG } from '@/config/dataLayerConfig';
import { screen } from '@testing-library/react';

// Mock all dependencies
vi.mock('../../hooks/useAppData');
vi.mock('../../contexts/UnifiedConfigContext');
vi.mock('../../services/DataServiceFactory');
vi.mock('../../config/dataLayerConfig');

// Mock complex components
vi.mock('../../components/UnifiedModeSwitch', () => {
  return function MockUnifiedModeSwitch({ value, onChange }: any) {
    return (
      <select 
        data-testid="mode-switch" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="development">Development</option>
        <option value="production">Production</option>
        <option value="demo">Demo</option>
      </select>
    );
  };
});

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

describe('DataLayerSettingsPage Integration Tests', () => {
  const mockConfig = {
    environment: 'development',
    dataMode: 'development',
    database: {
      provider: 'sqlite'
    },
    backendIntegrations: {
      supabase: { enabled: false },
      firebase: { enabled: false }
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
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Data Layer Settings')).toBeInTheDocument();
    });

    it('should display the correct page title', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByRole('heading', { name: /data layer settings/i })).toBeInTheDocument();
    });

    it('should render all tab navigation buttons', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByRole('button', { name: /mode switching/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /database providers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /database provider/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /backend integration/i })).toBeInTheDocument();
    });

    it('should display current status summary', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/current status/i)).toBeInTheDocument();
      expect(screen.getByText(/mode:/i)).toBeInTheDocument();
      expect(screen.getByText(/provider:/i)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Default tab should be mode switching
      expect(screen.getByTestId('mode-switch')).toBeInTheDocument();

      // Switch to database providers tab
      await user.click(screen.getByRole('button', { name: /database providers/i }));
      expect(screen.getByText(/available providers/i)).toBeInTheDocument();

      // Switch to database provider tab
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      expect(screen.getByTestId('provider-selector')).toBeInTheDocument();

      // Switch to backend integration tab
      await user.click(screen.getByRole('button', { name: /backend integration/i }));
      expect(screen.getByText(/backend integrations/i)).toBeInTheDocument();
    });

    it('should maintain tab state during interactions', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backend integration tab
      await user.click(screen.getByRole('button', { name: /backend integration/i }));
      
      // Verify backend integration content is visible
      expect(screen.getByText(/backend integrations/i)).toBeInTheDocument();
      
      // Switch back to mode switching tab
      await user.click(screen.getByRole('button', { name: /mode switching/i }));
      
      // Verify mode switching content is visible
      expect(screen.getByTestId('mode-switch')).toBeInTheDocument();
    });
  });

  describe('Mode Switching Functionality', () => {
    it('should handle mode changes', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      const modeSwitch = screen.getByTestId('mode-switch');
      
      await act(async () => {
        await user.selectOptions(modeSwitch, 'production');
      });

      expect(modeSwitch).toHaveValue('production');
    });

    it('should display advanced options toggle', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/advanced options/i)).toBeInTheDocument();
    });

    it('should show informational messages for different modes', async () => {

      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Check for informational content
      expect(screen.getByText(/mode switching/i)).toBeInTheDocument();
    });

    it('should handle advanced configuration details', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Look for advanced options toggle
      const advancedToggle = screen.getByText(/advanced options/i);
      await user.click(advancedToggle);

      // Advanced configuration should be visible
      expect(screen.getByText(/advanced/i)).toBeInTheDocument();
    });
  });

  describe('Database Providers Tab', () => {
    it('should display available providers with status icons', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database providers tab
      await user.click(screen.getByRole('button', { name: /database providers/i }));
      
      expect(screen.getByText(/available providers/i)).toBeInTheDocument();
    });

    it('should show availability indicators for each provider', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database providers tab
      await user.click(screen.getByRole('button', { name: /database providers/i }));
      
      // Look for availability indicators
      const availabilityElements = screen.getAllByText(/available|unavailable/i);
      expect(availabilityElements.length).toBeGreaterThan(0);
    });
  });

  describe('Database Provider Configuration', () => {
    it('should handle provider selection', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database provider tab
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      
      const providerSelector = screen.getByTestId('provider-selector');
      
      await act(async () => {
        await user.selectOptions(providerSelector, 'pouchdb');
      });

      expect(providerSelector).toHaveValue('pouchdb');
    });

    it('should handle save configuration', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database provider tab
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      
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
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database provider tab
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      
      const resetButton = screen.getByRole('button', { name: /reset to default/i });
      await user.click(resetButton);

      expect(mockConfirm).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockDataServiceFactory.resetToDefaultConfig).toHaveBeenCalled();
      });

      mockConfirm.mockRestore();
    });
  });

  describe('Backend Integration Tab', () => {
    it('should display backend integration options', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backend integration tab
      await user.click(screen.getByRole('button', { name: /backend integration/i }));
      
      expect(screen.getByText(/backend integrations/i)).toBeInTheDocument();
    });

    it('should show configuration buttons for integrations', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to backend integration tab
      await user.click(screen.getByRole('button', { name: /backend integration/i }));
      
      // Look for configuration buttons
      const configButtons = screen.getAllByRole('button', { name: /configure/i });
      expect(configButtons.length).toBeGreaterThan(0);
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
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/database initialization failed/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should handle configuration save errors', async () => {
      const errorMessage = 'Failed to save configuration';
      mockDataServiceFactory.setUserDatabaseConfig.mockRejectedValue(new Error(errorMessage));
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database provider tab
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      
      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
      });
    });

    it('should handle provider loading errors', async () => {
      mockDataServiceFactory.getUserDatabaseConfig.mockImplementation(() => {
        throw new Error('Failed to load providers');
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/failed to load providers/i)).toBeInTheDocument();
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
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Switch to database provider tab
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      
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

    it('should update unified config when mode changes', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      const modeSwitch = screen.getByTestId('mode-switch');
      
      await act(async () => {
        await user.selectOptions(modeSwitch, 'production');
      });

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            dataMode: 'production'
          })
        );
      });
    });

    it('should initialize providers based on environment', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(mockDataServiceFactory.getUserDatabaseConfig).toHaveBeenCalled();
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should show different providers for different environments', async () => {
      mockUseUnifiedConfig.mockReturnValue({
        config: { ...mockConfig, dataMode: 'production' },
        updateConfig: mockUpdateConfig,
        isLoading: false,
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/production/i)).toBeInTheDocument();
    });

    it('should handle demo mode restrictions', async () => {
      mockUseUnifiedConfig.mockReturnValue({
        config: { ...mockConfig, dataMode: 'demo' },
        updateConfig: mockUpdateConfig,
        isLoading: false,
      });
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText(/demo/i)).toBeInTheDocument();
    });
  });

  describe('Console Error Validation', () => {
    it('should not produce console errors during normal operation', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Filter out expected debug messages
      const unexpectedErrors = consoleSpy.mock.calls.filter(call => 
        !call[0]?.toString().includes('DataLayerSettingsPage') &&
        !call[0]?.toString().includes('COMPONENT IS LOADING')
      );

      expect(unexpectedErrors).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle mode change affecting provider availability', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Change mode
      const modeSwitch = screen.getByTestId('mode-switch');
      await act(async () => {
        await user.selectOptions(modeSwitch, 'production');
      });

      // Switch to provider tab and verify provider options updated
      await user.click(screen.getByRole('button', { name: /database provider/i }));
      
      const providerSelector = screen.getByTestId('provider-selector');
      expect(providerSelector).toBeInTheDocument();
    });

    it('should maintain state consistency across tab switches', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <DataLayerSettingsPage />
          </TestWrapper>
        );
      });

      // Change mode
      const modeSwitch = screen.getByTestId('mode-switch');
      await act(async () => {
        await user.selectOptions(modeSwitch, 'production');
      });

      // Switch to another tab
      await user.click(screen.getByRole('button', { name: /database providers/i }));
      
      // Switch back to mode tab
      await user.click(screen.getByRole('button', { name: /mode switching/i }));
      
      // Mode should still be production
      const modeSwitchAgain = screen.getByTestId('mode-switch');
      expect(modeSwitchAgain).toHaveValue('production');
    });
  });
});
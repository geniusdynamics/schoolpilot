// ABOUTME: Integration tests for DataLayerSettingsPage (consolidated data-management UI)
// ABOUTME: Tests mode switching, provider management, save/reset flows, and status display

import React from 'react';

import userEvent from '@testing-library/user-event';
import DataLayerSettingsPage from '@/modules/settings/pages/DataLayerSettingsPage';
import { useAppData } from '@/hooks/useAppData';
import { useDataMode } from '@/hooks/useDataMode';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/data/DataServiceFactory';
import { screen, waitFor, within } from '@testing-library/react';
import type { Mock } from 'vitest';

// Mock hooks and services used by the page
vi.mock('@/hooks/useAppData', () => ({
  useAppData: vi.fn(),
}));

vi.mock('@/hooks/useDataMode', () => ({
  useDataMode: vi.fn(),
}));

vi.mock('@/hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: vi.fn(),
}));

vi.mock('@/services/data/DataServiceFactory', () => ({
  DataServiceFactory: {
    setUserDatabaseConfig: vi.fn(),
    resetToDefaultConfig: vi.fn(),
    getUserDatabaseConfig: vi.fn(),
  },
}));

vi.mock('@/config/backendArchitecture', () => ({
  backendArchitecture: {
    switchBackend: vi.fn(),
  },
}));

const { confirmMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  useConfirm: () => confirmMock,
}));

// Mock heavy child components
vi.mock('@/components/BackendConfiguration', () => ({
  BackendConfiguration: () => <div data-testid="backend-configuration">Backend Configuration</div>,
}));

const mockUseAppData = vi.mocked(useAppData);
const mockUseDataMode = vi.mocked(useDataMode);
const mockUseUnifiedConfig = useUnifiedConfig as unknown as Mock;

// Partial shape of UnifiedConfigContextValue covering everything the page reads
const mockConfigValue = {
  config: {
    environment: 'development',
    dataMode: 'demo',
    demo: { active: true },
    backend: { url: 'http://localhost:3000' },
    database: {
      provider: 'sqlite-wasm',
      allowedProviders: ['sqlite-wasm', 'sqlite-file'],
      options: { storageType: 'opfs' },
      apiConfig: { apiBaseUrl: '', apiKey: '', syncInterval: 30000 },
      sync: {
        enabled: false,
        interval: 30000,
        conflictResolution: 'manual',
        batchSize: 50,
        retryAttempts: 3,
        timeout: 30000,
      },
      features: {
        enableOfflineMode: true,
        enableRealTimeUpdates: false,
        enableTransactions: true,
      },
    },
  },
  updateConfig: vi.fn(),
  isLoading: false,
};

const defaultDataModeValue = {
  status: {
    currentMode: 'demo',
    activeProvider: 'sqlite-wasm',
    dataCount: 0,
    lastSwitched: new Date('2025-01-01'),
    isTransitioning: false,
    isDemoDataCleared: false,
  },
  isLoading: false,
  error: null,
  switchMode: vi.fn().mockResolvedValue(undefined),
  clearData: vi.fn().mockResolvedValue(undefined),
  seedData: vi.fn().mockResolvedValue(undefined),
  refreshStatus: vi.fn().mockResolvedValue(undefined),
  resetError: vi.fn(),
  isDemoCleared: false,
  markDemoCleared: vi.fn(),
  isDemoReseedingDisabled: false,
};

const defaultAppDataValue = {
  syncStatus: null,
};

describe('DataLayerSettingsPage Integration Tests', () => {
  const renderPage = () => render(<DataLayerSettingsPage />);

  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);

    mockUseAppData.mockReturnValue(defaultAppDataValue as never);
    mockUseDataMode.mockReturnValue(defaultDataModeValue as never);
    mockUseUnifiedConfig.mockReturnValue(mockConfigValue);

    const mockDataServiceFactory = DataServiceFactory as unknown as Record<string, Mock>;
    mockDataServiceFactory.setUserDatabaseConfig.mockResolvedValue(undefined);
    mockDataServiceFactory.resetToDefaultConfig.mockReturnValue(undefined);
    mockDataServiceFactory.getUserDatabaseConfig.mockReturnValue({
      provider: 'sqlite-wasm',
      environment: 'development',
    });

    // jsdom does not implement navigation; stub reload used after applying config
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });

    // Silence console noise from the component under test
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText(/unified data management/i)).toBeInTheDocument();
    });

    it('should leave the page title to the hub it sits in', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.queryByRole('heading', { name: /data layer settings/i })).toBeNull();
    });

    it('should carry no tab strip of its own: sync lives on its own tab of the hub', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.queryByRole('button', { name: 'Sync Management' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Configuration' })).toBeNull();
    });

    it('should display current status summary', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText(/current status/i)).toBeInTheDocument();
      expect(screen.getByText(/mode:/i)).toBeInTheDocument();
      expect(screen.getByText(/provider:/i)).toBeInTheDocument();
    });
  });

  describe('Mode Switching Functionality', () => {
    it('should handle mode changes', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2); // demo and production
      expect(radios[0]).toBeChecked(); // demo is default

      await user.click(radios[1]); // production

      expect(radios[1]).toBeChecked();
      expect(radios[0]).not.toBeChecked();
    });

    it('should display advanced options toggle', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByRole('button', { name: /show advanced options/i })).toBeInTheDocument();
    });

    it('should show informational messages', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByText(/consolidation notes/i)).toBeInTheDocument();
      expect(screen.getByText(/demo data management/i)).toBeInTheDocument();
    });

    it('should handle advanced configuration details', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /show advanced options/i }));

      expect(screen.getByText(/advanced configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/source mode:/i)).toBeInTheDocument();
      expect(screen.getByText(/backend integration:/i)).toBeInTheDocument();
      expect(screen.getByText(/api base url:/i)).toBeInTheDocument();
    });
  });

  describe('Database Provider Configuration', () => {
    it('should preselect a provider on mount', async () => {
      await act(async () => {
        renderPage();
      });

      const providerSelect = screen.getByRole('combobox', { name: /database type/i });
      expect(providerSelect).toHaveValue('sqlite-wasm');
    });

    it('should handle provider selection', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      // Demo mode only offers SQLite WASM; production adds more providers
      const radios = screen.getAllByRole('radio');
      await user.click(radios[1]); // production

      const providerSelect = screen.getByRole('combobox', { name: /database type/i });
      await user.selectOptions(providerSelect, 'pouchdb');

      expect(providerSelect).toHaveValue('pouchdb');
    });

    it('should handle save configuration', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /apply configuration/i }));

      await waitFor(() => {
        expect(DataServiceFactory.setUserDatabaseConfig).toHaveBeenCalled();
        expect(mockConfigValue.updateConfig).toHaveBeenCalled();
      });
    });

    it('should handle reset to default with confirmation', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /reset/i }));

      await waitFor(() => {
        expect(confirmMock).toHaveBeenCalled();
        expect(DataServiceFactory.resetToDefaultConfig).toHaveBeenCalled();
      });
    });
  });

  describe('Backend Integration Options', () => {
    it('should display backend configuration options', async () => {
      await act(async () => {
        renderPage();
      });

      expect(screen.getByRole('combobox', { name: /backend configuration/i })).toBeInTheDocument();
      expect(screen.getByTestId('backend-configuration')).toBeInTheDocument();
    });

    it('should handle backend integration selection', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      const backendSelect = screen.getByRole('combobox', { name: /backend configuration/i });
      const options = within(backendSelect).getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);

      // Pick a different option if one exists
      const currentValue = (backendSelect as HTMLSelectElement).value;
      const alternative = options.find(option => option.value !== currentValue);
      if (alternative) {
        await user.selectOptions(backendSelect, alternative.value);
        expect(backendSelect).toHaveValue(alternative.value);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration save errors', async () => {
      const errorMessage = 'Failed to save configuration';
      // The component invokes setUserDatabaseConfig without awaiting it, so a
      // synchronous throw is what surfaces through its error handling
      (DataServiceFactory.setUserDatabaseConfig as Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /apply configuration/i }));

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Failed to apply configuration: ${errorMessage}`, 'i'))).toBeInTheDocument();
      });
    });

    it('should handle mode switch errors', async () => {
      const errorMessage = 'Mode switch failed';
      mockUseDataMode.mockReturnValue({
        ...defaultDataModeValue,
        switchMode: vi.fn().mockRejectedValue(new Error(errorMessage)),
      } as never);

      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /apply configuration/i }));

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Failed to apply configuration: ${errorMessage}`, 'i'))).toBeInTheDocument();
      });
    });

    it('should handle reset errors', async () => {
      (DataServiceFactory.resetToDefaultConfig as Mock).mockImplementation(() => {
        throw new Error('Failed to reset');
      });

      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /reset/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to reset/i)).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    it('should manage saving state correctly', async () => {
      // Keep switchMode pending so the save flow stays in its in-progress state
      mockUseDataMode.mockReturnValue({
        ...defaultDataModeValue,
        switchMode: vi.fn().mockImplementation(() => new Promise(() => {})),
      } as never);

      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      const saveButton = screen.getByRole('button', { name: /apply configuration/i });
      await user.click(saveButton);

      // While saving, the button shows an in-progress label and is disabled
      expect(screen.getByRole('button', { name: /applying/i })).toBeDisabled();
    });

    it('should update unified config when applying a production configuration', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      // Switch application mode to production, then apply
      const radios = screen.getAllByRole('radio');
      await user.click(radios[1]);
      await user.click(screen.getByRole('button', { name: /apply configuration/i }));

      await waitFor(() => {
        expect(mockConfigValue.updateConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            dataMode: 'production',
          })
        );
      });
    });

    it('should call switchMode when applying a configuration', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      await user.click(screen.getByRole('button', { name: /apply configuration/i }));

      await waitFor(() => {
        expect(defaultDataModeValue.switchMode).toHaveBeenCalledWith('demo');
      });
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should reflect production mode from data mode status', async () => {
      mockUseDataMode.mockReturnValue({
        ...defaultDataModeValue,
        status: {
          ...defaultDataModeValue.status,
          currentMode: 'production',
        },
      } as never);

      await act(async () => {
        renderPage();
      });

      await waitFor(() => {
        const radios = screen.getAllByRole('radio');
        expect(radios[1]).toBeChecked(); // production preselected
      });
    });

    it('should handle demo mode restrictions', async () => {
      mockUseDataMode.mockReturnValue({
        ...defaultDataModeValue,
        isDemoReseedingDisabled: true,
        isDemoCleared: true,
      } as never);

      await act(async () => {
        renderPage();
      });

      expect(screen.getByText(/demo data cleared/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /seed demo data/i })).not.toBeInTheDocument();
    });
  });

  describe('Console Error Validation', () => {
    it('should not produce console errors during normal operation', async () => {
      const consoleSpy = console.error as unknown as Mock;
      consoleSpy.mockClear();

      await act(async () => {
        renderPage();
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle mode change affecting provider availability', async () => {
      const user = userEvent.setup();

      await act(async () => {
        renderPage();
      });

      const providerSelect = screen.getByRole('combobox', { name: /database type/i });

      // Demo mode does not offer LiveStore
      expect(within(providerSelect).queryByRole('option', { name: 'LiveStore' })).not.toBeInTheDocument();

      // Switch to production; LiveStore becomes available
      const radios = screen.getAllByRole('radio');
      await user.click(radios[1]);

      expect(within(providerSelect).getByRole('option', { name: 'LiveStore' })).toBeInTheDocument();
    });

    it('should keep the chosen mode when the page re-renders', async () => {
      const user = userEvent.setup();

      let view: ReturnType<typeof render>;
      await act(async () => {
        view = renderPage();
      });

      // Change mode to production
      const radios = screen.getAllByRole('radio');
      await user.click(radios[1]);

      view!.rerender(<DataLayerSettingsPage />);

      // Mode selection should be preserved
      const radiosAgain = screen.getAllByRole('radio');
      expect(radiosAgain[1]).toBeChecked();
    });
  });
});

// ABOUTME: Integration tests for consolidated Data Layer Settings workflow
// ABOUTME: Verifies unified mode, database, backend, and sync controls live in one page

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataLayerSettingsPage } from '../../modules/settings/pages/DataLayerSettingsPage';

const mocks = vi.hoisted(() => ({
  switchMode: vi.fn().mockResolvedValue(undefined),
  setUserDatabaseConfig: vi.fn(),
  resetToDefaultConfig: vi.fn(),
  updateConfig: vi.fn(),
  confirm: vi.fn(() => true),
  updateSyncSettings: vi.fn(),
}));

vi.mock('../../hooks/useDataMode', () => ({
  useDataMode: () => ({
    status: { currentMode: 'demo' },
    switchMode: mocks.switchMode,
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useAppData', () => ({
  useAppData: () => ({
    isDatabaseModeActive: true,
    initializationError: null,
    isOnline: true,
    backendAvailable: true,
    syncStatus: { state: 'idle', progress: 0 },
    pendingSyncCount: 0,
    conflicts: [],
    getQueueStatus: () => ({ api: { pending: 0, completed: 0 }, sync: { pending: 0, errors: 0, items: [] } }),
    forceSync: vi.fn(),
    clearSyncQueue: vi.fn(),
    pauseSync: vi.fn(),
    resumeSync: vi.fn(),
    getSyncHistory: () => [],
    getSyncSettings: () => ({
      autoSync: true,
      backgroundSync: true,
      syncInterval: 30000,
      batchSize: 10,
      maxRetries: 3,
      retryDelay: 5000,
      enableConflictResolution: true,
      conflictResolution: 'manual',
      priorityOrder: ['critical', 'high', 'normal', 'low'],
    }),
    updateSyncSettings: mocks.updateSyncSettings,
  }),
}));

vi.mock('../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    config: {
      environment: 'demo',
      dataMode: 'demo',
      demo: { active: true },
      backend: { url: '', environment: 'browser', available: true },
      database: {
        provider: 'sqlite-wasm',
        allowedProviders: ['sqlite-wasm', 'sqlite-file'],
        options: { storageType: 'opfs', backendIntegration: 'none' },
        apiConfig: { apiBaseUrl: '', apiKey: '', syncInterval: 30000, conflictResolution: 'manual' },
        sync: { enabled: true, interval: 30000, conflictResolution: 'manual', batchSize: 10, retryAttempts: 3, timeout: 10000 },
        features: { enableOfflineMode: true, enableRealTimeUpdates: false, enableTransactions: true },
      },
    },
    updateConfig: mocks.updateConfig,
  }),
}));

vi.mock('../../services/DataServiceFactory', () => ({
  DataServiceFactory: {
    getUserDatabaseConfig: () => ({ provider: 'sqlite-wasm', environment: 'demo' }),
    setUserDatabaseConfig: mocks.setUserDatabaseConfig,
    resetToDefaultConfig: mocks.resetToDefaultConfig,
  },
}));

vi.mock('../../components/BackendConfiguration', () => ({
  BackendConfiguration: () => <div>Backend Configuration Panel</div>,
}));

vi.mock('../../components/SyncManagementPanel', () => ({
  default: () => <div>Sync Management Panel</div>,
}));

describe('DataLayerSettingsPage consolidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', mocks.confirm);
  });

  it('renders the consolidated configuration workflow and sync tab', async () => {
    render(
      <MemoryRouter>
        <DataLayerSettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Unified Data Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync management/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Database Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Backend Configuration')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /sync management/i }));
    expect(screen.getByText('Sync Management Panel')).toBeInTheDocument();
  });

  it('applies a compatible production configuration from the consolidated selectors', async () => {
    render(
      <MemoryRouter>
        <DataLayerSettingsPage />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByLabelText(/production/i));
    await userEvent.selectOptions(screen.getByLabelText('Database Type'), 'sqlite-wasm');
    await userEvent.selectOptions(screen.getByLabelText('Backend Configuration'), 'erpnext');
    await userEvent.click(screen.getByRole('button', { name: /apply configuration/i }));

    await waitFor(() => expect(mocks.switchMode).toHaveBeenCalledWith('production'));
    expect(mocks.setUserDatabaseConfig).toHaveBeenCalled();
    expect(mocks.updateConfig).toHaveBeenCalled();
    expect(screen.getByText(/Configuration applied successfully/i)).toBeInTheDocument();
  });
});

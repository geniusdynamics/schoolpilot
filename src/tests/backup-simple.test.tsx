// ABOUTME: Simplified BackupSettingsPage test to isolate React 19 compatibility issues
// ABOUTME: Basic test to check if the component renders without errors

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BackupSettingsPage from '../modules/settings/pages/BackupSettingsPage';
import { useAppData } from '../hooks/useAppData';
import { useUnifiedConfig } from '../hooks/useUnifiedConfig';
import { vi } from 'vitest';

// Mock all dependencies
vi.mock('../hooks/useAppData');
vi.mock('../hooks/useUnifiedConfig');
vi.mock('../services/database/ProviderSelector', () => ({
  getDatabaseManager: () => ({
    backup: vi.fn().mockResolvedValue('{}'),
    restore: vi.fn().mockResolvedValue(true),
    isInitialized: true,
  }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('BackupSettingsPage Simple Test', () => {
  const mockUseAppData = vi.mocked(useAppData);
  const mockUseUnifiedConfig = vi.mocked(useUnifiedConfig);

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAppData.mockReturnValue({
      isDatabaseModeActive: true,
      isUsingRxDBDummyData: false,
      triggerSeedRxDB: vi.fn(),
      triggerClearRxDB: vi.fn(),
      initializationError: null,
    });
    
    mockUseUnifiedConfig.mockReturnValue({
      config: {
        environment: 'production',
        dataMode: 'production',
        database: {
          provider: 'sqlite'
        }
      },
      updateConfig: vi.fn(),
      isLoading: false,
    });
  });

  it('should render without crashing', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <BackupSettingsPage />
        </TestWrapper>
      );
    });

    expect(screen.getByText('Database Backup')).toBeInTheDocument();
  });

  it('should display create backup button', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <BackupSettingsPage />
        </TestWrapper>
      );
    });

    expect(screen.getByRole('button', { name: /create database backup/i })).toBeInTheDocument();
  });
})
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BackupSettingsPage from '../modules/settings/pages/BackupSettingsPage';
import { useAppData } from '../hooks/useAppData';
import { useUnifiedConfig } from '../hooks/useUnifiedConfig';
import { getDatabaseManager } from '../services/database/ProviderSelector';

// Mock all dependencies
vi.mock('../hooks/useAppData');
vi.mock('../hooks/useUnifiedConfig');
vi.mock('../services/database/ProviderSelector');
vi.mock('../services/database/DatabaseProviderFactory');
vi.mock('../services/dataModeManager');
vi.mock('../services/database/providers/SQLiteProvider');
vi.mock('../services/database/providers/RxDBProvider');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}));

const mockUseAppData = vi.mocked(useAppData);
const mockUseUnifiedConfig = vi.mocked(useUnifiedConfig);
const mockGetDatabaseManager = vi.mocked(getDatabaseManager);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('Debug Render Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
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
    
    // Mock getDatabaseManager function
    const mockDatabaseInstance = {
      backup: vi.fn().mockResolvedValue('mock-backup-data')
    };
    mockGetDatabaseManager.mockReturnValue(mockDatabaseInstance);
  });

  it('should render BackupSettingsPage without container issues', () => {
    console.log('Document body exists:', !!document.body);
    console.log('Document body innerHTML:', document.body.innerHTML);
    
    const result = render(
      <TestWrapper>
        <BackupSettingsPage />
      </TestWrapper>
    );
    
    console.log('Render result container:', result.container);
    expect(screen.getByText('Database Backup')).toBeInTheDocument();
    console.log('Test passed - component rendered successfully!');
  });
});
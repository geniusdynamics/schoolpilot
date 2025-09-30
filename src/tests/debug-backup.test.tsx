// ABOUTME: Debug test for BackupSettingsPage to isolate React 19 issues
// ABOUTME: Minimal test to identify specific compatibility problems

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock the hooks
vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({
    initializationError: null,
    isDatabaseModeActive: true,
    isUsingRxDBDummyData: false,
    triggerSeedRxDB: vi.fn(),
    triggerClearRxDB: vi.fn(),
  })
}));

vi.mock('../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    config: {
      environment: 'production',
      dataMode: 'production',
      database: { provider: 'sqlite' }
    },
    updateConfig: vi.fn(),
    isLoading: false,
  })
}));

vi.mock('../services/database/ProviderSelector', () => ({
  getDatabaseManager: () => ({
    backup: vi.fn().mockResolvedValue('{}'),
    restore: vi.fn().mockResolvedValue(true),
    isInitialized: true,
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

// Import the actual component
import BackupSettingsPage from '../modules/settings/pages/BackupSettingsPage';

// Simple component to test
const TestComponent: React.FC = () => {
  return (
    <div>
      <h1>Test Component</h1>
      <button>Test Button</button>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('Debug Backup Test', () => {
  it('should render a simple test component', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
  });

  it('should render BackupSettingsPage component', () => {
    render(
      <TestWrapper>
        <BackupSettingsPage />
      </TestWrapper>
    );
    
    expect(screen.getByText('Database Backup')).toBeInTheDocument();
  });
});
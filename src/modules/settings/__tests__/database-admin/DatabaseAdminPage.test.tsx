import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DatabaseAdminPage from '../../pages/DatabaseAdminPage';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

vi.mock('../../../../hooks/useToast', () => ({
  useToastHelpers: () => ({ showSuccess: vi.fn(), showError: vi.fn() })
}));

vi.mock('../../../../components/BreadcrumbNavigation', () => ({
  default: () => <div data-testid="breadcrumb" />
}));

let mockConfig = {
  database: {
    provider: 'mock',
    apiConfig: { apiBaseUrl: '' },
    performance: { enableIndexing: true, enableCaching: true, cacheSize: 100, queryTimeout: 30000, batchSize: 1000 },
    storage: { maxSize: 500, compressionEnabled: true, encryptionEnabled: false, backupEnabled: true, retentionDays: 30 }
  }
};

vi.mock('../../../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({
    get config() { return mockConfig; },
    updateDatabaseConfig: (updates: any) => {
      mockConfig = {
        ...mockConfig,
        database: {
          ...mockConfig.database,
          ...updates,
          performance: { ...mockConfig.database.performance, ...(updates.performance || {}) },
          storage: { ...mockConfig.database.storage, ...(updates.storage || {}) }
        }
      };
    },
    updateDatabaseProvider: (provider: string) => {
      mockConfig.database.provider = provider;
    }
  })
}));

vi.mock('../../../../config/unifiedConfig', () => ({
  autoFixDatabaseConfig: () => ({ success: true, changes: [] }),
  migrateDatabaseConfig: () => ({ success: true, appliedMigrations: [] })
}));

describe('DatabaseAdminPage', () => {
  beforeEach(() => {
    mockConfig = {
      database: {
        provider: 'mock',
        apiConfig: { apiBaseUrl: '' },
        performance: { enableIndexing: true, enableCaching: true, cacheSize: 100, queryTimeout: 30000, batchSize: 1000 },
        storage: { maxSize: 500, compressionEnabled: true, encryptionEnabled: false, backupEnabled: true, retentionDays: 30 }
      }
    };
  });

  it('renders all main sections', () => {
    render(<DatabaseAdminPage />);
    expect(screen.getByText('Connection & Backend Engine')).toBeInTheDocument();
    expect(screen.getByText('Schema Version Control')).toBeInTheDocument();
    expect(screen.getByText('Performance Tuning')).toBeInTheDocument();
    expect(screen.getByText('Quota & Retention Policies')).toBeInTheDocument();
  });

  it('updates database provider', () => {
    render(<DatabaseAdminPage />);
    
    const providerSelect = screen.getByLabelText('Database Provider', { selector: 'select' });
    fireEvent.change(providerSelect, { target: { value: 'sqlite-wasm' } });
    
    expect(mockConfig.database.provider).toBe('sqlite-wasm');
  });

  it('updates performance settings', () => {
    render(<DatabaseAdminPage />);
    
    const cacheSizeInput = screen.getByLabelText('Cache Size (MB)', { selector: 'input' });
    fireEvent.change(cacheSizeInput, { target: { value: '250' } });
    
    expect(mockConfig.database.performance.cacheSize).toBe(250);
  });
});

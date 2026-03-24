import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DataManagementPage from '../../pages/DataManagementPage';
import { unifiedConfigManager } from '../../../../config/unifiedConfig';
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
    features: { enableOfflineMode: true },
    sync: { enabled: true, interval: 30000, batchSize: 100, retryAttempts: 3, timeout: 60000, conflictResolution: 'manual' }
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
          features: { ...mockConfig.database.features, ...(updates.features || {}) },
          sync: { ...mockConfig.database.sync, ...(updates.sync || {}) }
        }
      };
    }
  })
}));

vi.mock('../../../../hooks/useAppData', () => ({
  useAppData: () => ({
    triggerSeedDatabase: vi.fn(),
    triggerClearDatabase: vi.fn()
  })
}));

describe('DataManagementPage', () => {
  beforeEach(() => {
    mockConfig = {
      database: {
        features: { enableOfflineMode: true },
        sync: { enabled: true, interval: 30000, batchSize: 100, retryAttempts: 3, timeout: 60000, conflictResolution: 'manual' }
      }
    };
  });

  it('renders all main sections', () => {
    render(<DataManagementPage />);
    expect(screen.getByText('Operational Mode')).toBeInTheDocument();
    expect(screen.getByText('Synchronization Rules')).toBeInTheDocument();
    expect(screen.getByText('Data Operations & Mock Data')).toBeInTheDocument();
    expect(screen.getByText('Import & Export')).toBeInTheDocument();
  });

  it('updates operational mode', () => {
    render(<DataManagementPage />);
    
    const offlineMode = screen.getByText('Offline Only');
    fireEvent.click(offlineMode);
    
    expect(mockConfig.database.features.enableOfflineMode).toBe(true);
    expect(mockConfig.database.sync.enabled).toBe(false);
  });

  it('updates sync rules', () => {
    render(<DataManagementPage />);
    
    const intervalInput = screen.getByLabelText('Sync Interval (ms)', { selector: 'input' });
    fireEvent.change(intervalInput, { target: { value: '60000' } });
    
    expect(mockConfig.database.sync.interval).toBe(60000);
  });
});

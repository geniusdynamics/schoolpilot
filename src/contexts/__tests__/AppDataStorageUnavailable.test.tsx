// ABOUTME: Tests that AppDataProvider blocks the app with StorageUnavailableScreen when persistent storage cannot open.
// ABOUTME: Other initialisation errors keep their existing handling; the storage screen is reserved for STORAGE_UNAVAILABLE.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@sqlite.org/sqlite-wasm', () => ({ default: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const manager = vi.hoisted(() => ({
  initialize: vi.fn(),
  getProvider: vi.fn(() => null),
  getProviderType: vi.fn(() => 'sqlite-wasm'),
  getAllCollections: vi.fn(() => new Map()),
  getCollection: vi.fn(() => null),
  getCurrentProvider: vi.fn(() => null),
  getDeploymentMode: vi.fn(() => 'production'),
}));

vi.mock('../../services/database/UnifiedDatabaseManager', () => ({
  UnifiedDatabaseManager: { getInstance: () => manager },
}));

vi.mock('../../hooks/useToast', () => {
  const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
  return { useToastHelpers: () => toast };
});

import { AppDataProvider } from '../AppDataContext';
import { BackupRestoreProvider } from '../appData/BackupRestoreContext';
import { DataGenerationProvider } from '../appData/DataGenerationContext';
import { PaginationProvider } from '../appData/PaginationContext';
import { ValidationProvider } from '../appData/ValidationContext';
import { StorageUnavailableError } from '../../services/database/SQLiteWASMProvider';

describe('AppDataProvider storage failure', () => {
  beforeEach(() => {
    manager.initialize.mockReset();
  });

  it('renders the blocking storage screen instead of the app when storage is unavailable', async () => {
    manager.initialize.mockRejectedValue(new StorageUnavailableError('Missing required OPFS APIs.'));

    render(
      <BackupRestoreProvider>
        <DataGenerationProvider>
          <PaginationProvider>
            <ValidationProvider>
              <AppDataProvider>
                <div>app content</div>
              </AppDataProvider>
            </ValidationProvider>
          </PaginationProvider>
        </DataGenerationProvider>
      </BackupRestoreProvider>
    );

    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('This browser cannot store data offline')).toBeTruthy();
    expect(screen.getByText('Missing required OPFS APIs.')).toBeTruthy();
    expect(screen.queryByText('app content')).toBeNull();
  });
});

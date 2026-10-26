// ABOUTME: Data & System is one hub for where the school's data lives and how it is kept safe: the data layer, sync,
// ABOUTME: backups, integrity checks and health. One row of tabs, a warning when storage is not durable, and old tabs redirect.

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('../DataLayerSettingsPage', () => ({ DataLayerSettingsContent: () => <div>data layer body</div> }));
vi.mock('../DatabaseBackupPage', () => ({ DatabaseBackupContent: () => <div>backup body</div> }));
vi.mock('../SystemHealthPage', () => ({ SystemHealthContent: () => <div>health body</div> }));
vi.mock('../../components/SyncConflictsPanel', () => ({ SyncConflictsPanel: () => <div>sync conflicts body</div> }));
vi.mock('../../components/BackendSyncSettings', () => ({ BackendSyncSettings: () => <div>sync settings body</div> }));
vi.mock('../../components/DataIntegrityTab', () => ({ DataIntegrityTab: () => <div>integrity body</div> }));
vi.mock('../../components/StorageWarning', () => ({ StorageWarning: () => <div>storage warning</div> }));

import { SETTINGS_HUBS } from '../../hubTabs';
import DataAndSystemPage from '../DataAndSystemPage';

/** What each tab of the hub shows, by the id its address names. */
const BODY_OF_TAB: Readonly<Record<string, string>> = {
  'data-layer': 'data layer body',
  sync: 'sync conflicts body',
  backup: 'backup body',
  integrity: 'integrity body',
  health: 'health body',
};

let where = '';
const LocationProbe: React.FC = () => {
  const location = useLocation();
  where = `${location.pathname}${location.search}`;
  return null;
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocationProbe />
      <Routes>
        <Route path="/settings/modules" element={<p>the Modules & Features hub</p>} />
        <Route path="/settings/system" element={<DataAndSystemPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('the Data & System hub', () => {
  it('offers the data layer, sync, backup, integrity and health - one row of tabs', () => {
    renderAt('/settings/system');

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
      'Data Layer',
      'Sync',
      'Backup & Restore',
      'Data Integrity',
      'System Health',
    ]);
    expect(screen.getAllByRole('tablist')).toHaveLength(1);
  });

  it('opens on the data layer', () => {
    renderAt('/settings/system');

    expect(screen.getByText('data layer body')).toBeTruthy();
    expect(SETTINGS_HUBS['/settings/system'].defaultTab).toBe('data-layer');
  });

  it.each(SETTINGS_HUBS['/settings/system'].tabs)('opens the %s tab from its address, as the shared tab list names it', (id) => {
    renderAt(`/settings/system?tab=${id}`);

    expect(screen.getByText(BODY_OF_TAB[id])).toBeTruthy();
  });

  it('offers exactly the tabs the shared list names', () => {
    renderAt('/settings/system');

    expect(screen.getAllByRole('tab')).toHaveLength(SETTINGS_HUBS['/settings/system'].tabs.length);
  });

  it('puts the sync conflicts and the sync settings on the one Sync tab, not on two', () => {
    renderAt('/settings/system?tab=sync');

    expect(screen.getByText('sync conflicts body')).toBeTruthy();
    expect(screen.getByText('sync settings body')).toBeTruthy();
  });

  it('shows the storage warning above every tab', () => {
    renderAt('/settings/system');
    expect(screen.getByText('storage warning')).toBeTruthy();
  });

  it('shows the storage warning on another tab too', () => {
    renderAt('/settings/system?tab=health');
    expect(screen.getByText('storage warning')).toBeTruthy();
  });

  it('sends the old Modules tab to the Modules & Features hub', () => {
    renderAt('/settings/system?tab=modules');

    expect(screen.getByText('the Modules & Features hub')).toBeTruthy();
    expect(where).toBe('/settings/modules');
  });

  it('sends the old Dependencies tab to the Modules & Features hub, where the dependency check lives', () => {
    renderAt('/settings/system?tab=dependencies');

    expect(where).toBe('/settings/modules');
  });

  it('sends the old Plugins tab to the Plugins tab of the Modules & Features hub', () => {
    renderAt('/settings/system?tab=plugins');

    expect(where).toBe('/settings/modules?tab=plugins');
  });
});

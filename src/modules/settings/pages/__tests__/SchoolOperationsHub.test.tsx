// ABOUTME: The School Operations hub no longer carries the Settings dashboard as a tab: the dashboard is the
// ABOUTME: module root (/settings). An old link to ?tab=dashboard lands there, not on a hub with an unknown tab.

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('../SettingsSchoolProfilePage', () => ({ SettingsSchoolProfileContent: () => <div>school profile body</div> }));
vi.mock('../SettingsUsersPage', () => ({ SettingsUsersContent: () => <div>users body</div> }));
vi.mock('../SettingsWorkflowsPage', () => ({ SettingsWorkflowsContent: () => null }));
vi.mock('../AuditLogPage', () => ({ AuditLogContent: () => null }));
vi.mock('../TabSettingsPage', () => ({ TabSettingsContent: () => null }));
vi.mock('../SettingsDashboardPage', () => ({
  SettingsDashboardContent: () => <div>settings dashboard body</div>,
  default: () => <div>settings dashboard body</div>,
}));
vi.mock('../../components/SyncConflictsPanel', () => ({ SyncConflictsPanel: () => null }));

import SchoolOperationsPage from '../SchoolOperationsPage';

let pathname = '';
const LocationProbe: React.FC = () => {
  pathname = useLocation().pathname;
  return null;
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/settings" element={<div>the settings module root</div>} />
        <Route path="/settings/school" element={<SchoolOperationsPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );

describe('the School Operations hub', () => {
  it('offers school profile, users, workflows, audit log, sync conflicts and tab settings', () => {
    renderAt('/settings/school');

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim());
    expect(tabs).toEqual([
      'School Profile',
      'Users',
      'Workflows',
      'Audit Log',
      'Sync Conflicts',
      'Tab Settings',
    ]);
  });

  it('does not carry the Settings dashboard as a tab', () => {
    renderAt('/settings/school');

    expect(screen.queryByRole('tab', { name: /dashboard/i })).toBeNull();
    expect(screen.queryByText('settings dashboard body')).toBeNull();
  });

  it('still opens on the school profile', () => {
    renderAt('/settings/school');

    expect(screen.getByText('school profile body')).toBeTruthy();
  });

  it('still opens the tab a link asks for', () => {
    renderAt('/settings/school?tab=users');

    expect(screen.getByText('users body')).toBeTruthy();
  });

  it('sends an old ?tab=dashboard link to the Settings dashboard at the module root', () => {
    renderAt('/settings/school?tab=dashboard');

    expect(screen.getByText('the settings module root')).toBeTruthy();
    expect(pathname).toBe('/settings');
  });
});

// ABOUTME: School & People is one hub for who the school is and who works in it: profile, users and roles, workflows
// ABOUTME: and the audit log. It has one row of tabs, and the old tab names land where their pages live now.

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('../SettingsSchoolProfilePage', () => ({ SettingsSchoolProfileContent: () => <div>school profile body</div> }));
vi.mock('../SettingsUsersPage', () => ({ SettingsUsersContent: () => <div>users body</div> }));
vi.mock('../SettingsWorkflowsPage', () => ({ SettingsWorkflowsContent: () => <div>workflows body</div> }));
vi.mock('../AuditLogPage', () => ({ AuditLogContent: () => <div>audit log body</div> }));

import { SETTINGS_HUBS, tabIdsOf } from '../../hubTabs';
import SchoolAndPeoplePage from '../SchoolAndPeoplePage';

/** What each tab of the hub shows, by the id its address names. */
const BODY_OF_TAB: Readonly<Record<string, string>> = {
  'school-profile': 'school profile body',
  users: 'users body',
  workflows: 'workflows body',
  audit: 'audit log body',
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
        <Route path="/settings" element={<p>the Settings overview</p>} />
        <Route path="/settings/system" element={<p>the Data & System hub</p>} />
        <Route path="/settings/school" element={<SchoolAndPeoplePage />} />
      </Routes>
    </MemoryRouter>
  );

describe('the School & People hub', () => {
  it('offers school profile, users and roles, workflows and the audit log - one row of tabs', () => {
    renderAt('/settings/school');

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
      'School Profile',
      'Users & Roles',
      'Workflows',
      'Audit Log',
    ]);
    expect(screen.getAllByRole('tablist')).toHaveLength(1);
  });

  it('opens on the school profile', () => {
    renderAt('/settings/school');

    expect(screen.getByText('school profile body')).toBeTruthy();
    expect(SETTINGS_HUBS['/settings/school'].defaultTab).toBe('school-profile');
  });

  it.each(tabIdsOf('/settings/school'))('opens the %s tab from its address, as the shared tab list names it', (id) => {
    renderAt(`/settings/school?tab=${id}`);

    expect(screen.getByText(BODY_OF_TAB[id])).toBeTruthy();
  });

  it('offers exactly the tabs the shared list names, in its order', () => {
    renderAt('/settings/school');

    expect(screen.getAllByRole('tab')).toHaveLength(tabIdsOf('/settings/school').length);
  });

  it('opens the tab a link asks for', () => {
    renderAt('/settings/school?tab=users');
    expect(screen.getByText('users body')).toBeTruthy();
  });

  it('opens the audit log from its address', () => {
    renderAt('/settings/school?tab=audit');
    expect(screen.getByText('audit log body')).toBeTruthy();
  });

  it('sends the old Dashboard tab to the Settings overview, now a page of its own', () => {
    renderAt('/settings/school?tab=dashboard');

    expect(screen.getByText('the Settings overview')).toBeTruthy();
    expect(where).toBe('/settings');
  });

  it('sends the old Sync Conflicts tab to Sync, with the rest of the sync pages', () => {
    renderAt('/settings/school?tab=sync-conflicts');

    expect(screen.getByText('the Data & System hub')).toBeTruthy();
    expect(where).toBe('/settings/system?tab=sync');
  });

  it('opens the profile for the old Tab Settings tab, which was an empty placeholder', () => {
    renderAt('/settings/school?tab=tabs');

    expect(screen.getByText('school profile body')).toBeTruthy();
    expect(where).toBe('/settings/school');
  });
});

// ABOUTME: Modules & Features is one hub for what this installation runs and shows: the modules, the features that can be
// ABOUTME: switched, and the plugins. One row of tabs, each body without a tab strip of its own.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('../../components/ModulesTab', () => ({ ModulesTab: () => <div>modules body</div> }));
vi.mock('../../components/FeaturesTab', () => ({ FeaturesTab: () => <div>features body</div> }));
vi.mock('../PluginSettingsPage', () => ({ PluginSettingsContent: () => <div>plugins body</div> }));

import { SETTINGS_HUBS, tabIdsOf } from '../../hubTabs';
import ModulesAndFeaturesPage from '../ModulesAndFeaturesPage';

/** What each tab of the hub shows, by the id its address names. */
const BODY_OF_TAB: Readonly<Record<string, string>> = {
  modules: 'modules body',
  features: 'features body',
  plugins: 'plugins body',
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/settings/modules" element={<ModulesAndFeaturesPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('the Modules & Features hub', () => {
  it('offers the modules, the features and the plugins - one row of tabs', () => {
    renderAt('/settings/modules');

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual(['Modules', 'Features', 'Plugins']);
    expect(screen.getAllByRole('tablist')).toHaveLength(1);
  });

  it('opens on the modules', () => {
    renderAt('/settings/modules');

    expect(screen.getByText('modules body')).toBeTruthy();
    expect(SETTINGS_HUBS['/settings/modules'].defaultTab).toBe('modules');
  });

  it.each(tabIdsOf('/settings/modules'))('opens the %s tab from its address, as the shared tab list names it', (id) => {
    renderAt(`/settings/modules?tab=${id}`);

    expect(screen.getByText(BODY_OF_TAB[id])).toBeTruthy();
  });

  it('offers exactly the tabs the shared list names', () => {
    renderAt('/settings/modules');

    expect(screen.getAllByRole('tab')).toHaveLength(tabIdsOf('/settings/modules').length);
  });

  it('opens on the modules when the address names a tab the hub does not have', () => {
    renderAt('/settings/modules?tab=marketplace');

    expect(screen.getByText('modules body')).toBeTruthy();
  });
});

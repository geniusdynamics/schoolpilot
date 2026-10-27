// ABOUTME: The list of Settings hubs is what the hubs, the overview and the redirect checks all stand on, so it has to be
// ABOUTME: sound: every hub opens on one of its own tabs, no id or translation key is used twice, and an address is bare for the default.

import { describe, expect, it } from 'vitest';

import { SETTINGS_HUBS, tabAddress, tabIdsOf, type SettingsHubPath } from '../hubTabs';

const PATHS = Object.keys(SETTINGS_HUBS) as SettingsHubPath[];

describe('the list of Settings hubs', () => {
  it('lists the three hubs that are not the overview', () => {
    expect(PATHS).toEqual(['/settings/school', '/settings/modules', '/settings/system']);
  });

  it.each(PATHS)('opens %s on one of its own tabs', (path) => {
    expect(tabIdsOf(path)).toContain(SETTINGS_HUBS[path].defaultTab);
  });

  it.each(PATHS)('uses no tab id twice in %s', (path) => {
    const ids = tabIdsOf(path);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses no translation key twice, across all the hubs', () => {
    const keys = PATHS.flatMap((path) => {
      const hub = SETTINGS_HUBS[path];
      return [hub.title.key, hub.info.key, ...hub.tabs.map((tab) => tab.label.key)];
    });

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every title, line and label some text', () => {
    for (const path of PATHS) {
      const hub = SETTINGS_HUBS[path];
      for (const line of [hub.title, hub.info, ...hub.tabs.map((tab) => tab.label)]) {
        expect(line.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('addresses the default tab by the hub alone, and any other by its tab', () => {
    expect(tabAddress('/settings/school', 'school-profile')).toBe('/settings/school');
    expect(tabAddress('/settings/school', 'users')).toBe('/settings/school?tab=users');
    expect(tabAddress('/settings/system', 'data-layer')).toBe('/settings/system');
    expect(tabAddress('/settings/modules', 'plugins')).toBe('/settings/modules?tab=plugins');
  });
});

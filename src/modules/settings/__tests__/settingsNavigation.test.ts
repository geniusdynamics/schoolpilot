// ABOUTME: The Settings navigation is an overview and three hubs. Every address the old Settings had still works and lands on a page
// ABOUTME: and a tab that exist, with no redirect leading to another redirect, and every label is there in every language.

import { describe, expect, it } from 'vitest';

import en from '@/i18n/locales/en/navigation.json';
import fr from '@/i18n/locales/fr/navigation.json';
import rw from '@/i18n/locales/rw/navigation.json';
import sw from '@/i18n/locales/sw/navigation.json';

import { SETTINGS_HUBS, tabIdsOf, type SettingsHubPath } from '../hubTabs';
import settingsModule from '../moduleDefinition';

const navigation = settingsModule.navigation ?? [];
const live = navigation.filter((entry) => !entry.deprecated);
const old = navigation.filter((entry) => entry.deprecated);
const livePaths = live.map((entry) => entry.path);

/** The page files of the module, by name. */
const pageFiles = Object.keys(import.meta.glob('../pages/*.tsx')).map((key) => key.replace('../pages/', '').replace('.tsx', ''));

/** Every address the Settings module has ever answered at, besides its overview. */
const OLD_ADDRESSES = [
  '/settings/configuration',
  '/settings/unified',
  '/settings/general',
  '/settings/features',
  '/settings/data-layer',
  '/settings/dependency-report',
  '/settings/plugins',
  '/settings/database-backup',
  '/settings/data-integrity',
  '/settings/data-management',
  '/settings/school-profile',
  '/settings/users',
  '/settings/workflows',
  '/settings/audit-log',
  '/settings/tabs',
];

describe('the Settings navigation', () => {
  it('is the overview and the three hubs, in that order, and nothing else is live', () => {
    expect(livePaths).toEqual(['/settings', '/settings/school', '/settings/modules', '/settings/system']);
  });

  it('declares each of them as a route, and no other', () => {
    expect((settingsModule.routes ?? []).map((route) => route.path)).toEqual(livePaths);
  });

  it('names for each route the page its entry names', () => {
    for (const route of settingsModule.routes ?? []) {
      expect(live.find((entry) => entry.path === route.path)?.page).toBe(route.page);
    }
  });

  it('has the hub list for exactly the three hubs', () => {
    expect(Object.keys(SETTINGS_HUBS)).toEqual(livePaths.filter((path) => path !== '/settings'));
  });

  it('has a page file for every page it names', () => {
    for (const entry of navigation) {
      if (entry.page) expect(pageFiles, `the page ${entry.page}`).toContain(entry.page);
    }
  });
});

describe('the old addresses', () => {
  it.each(OLD_ADDRESSES)('still answers at %s, by redirecting', (address) => {
    const entry = old.find((candidate) => candidate.path === address);
    expect(entry?.redirectTo, `a redirect for ${address}`).toBeTruthy();
  });

  it('has no redirect that is not one of those addresses', () => {
    expect(old.map((entry) => entry.path).sort()).toEqual([...OLD_ADDRESSES].sort());
  });

  it.each(old.map((entry) => [entry.path, entry.redirectTo] as const))('sends %s to a page and a tab that exist: %s', (_from, to) => {
    const [pathname, query] = String(to).split('?');
    expect(livePaths, `where ${to} goes`).toContain(pathname);

    const tab = new URLSearchParams(query).get('tab');
    if (tab) {
      expect(tabIdsOf(pathname as SettingsHubPath), `the tab ${tab} of ${pathname}`).toContain(tab);
    }
  });

  it('never sends one old address to another, so no redirect leads to a redirect', () => {
    const oldPaths = old.map((entry) => entry.path);
    for (const entry of old) {
      expect(oldPaths).not.toContain(String(entry.redirectTo).split('?')[0]);
    }
  });
});

describe('the sidebar labels', () => {
  const keysOf = live.map((entry) => String(entry.name).replace('navigation:settings.', ''));
  const locales = { en, fr, rw, sw } as const;

  it.each(Object.entries(locales))('has a label for each live entry in %s', (_language, catalogue) => {
    const settings = catalogue.settings as Record<string, string>;
    for (const key of keysOf) {
      expect(typeof settings[key], `settings.${key}`).toBe('string');
      expect(settings[key].trim().length).toBeGreaterThan(0);
    }
  });
});

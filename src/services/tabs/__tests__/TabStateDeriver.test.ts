// ABOUTME: What a tab is called and where it points: a module's dashboard reads as the module's name
// ABOUTME: ("Finance"), not "Dashboard", so it is never mistaken for the main dashboard beside it.

import { beforeEach, describe, expect, it } from 'vitest';

import { TabStateDeriver } from '../TabStateDeriver';

const NAMES: Record<string, string> = {
  'navigation:dashboard.title': 'Dashboard',
  'navigation:finance.title': 'Finance',
  'navigation:hr.title': 'Human Resources',
  'navigation:portal.title': 'Portal',
  'entities.payments': 'Payments',
  'navigation:settings.title': 'Settings',
  'navigation:settings.schoolPeople': 'School & People',
  'navigation:settings.modulesFeatures': 'Modules & Features',
  'navigation:settings.dataSystem': 'Data & System',
};

describe('TabStateDeriver', () => {
  let deriver: TabStateDeriver;

  beforeEach(() => {
    deriver = new TabStateDeriver((key) => NAMES[key] ?? key);
  });

  describe('a module dashboard', () => {
    it('is named for its module and lives at the module root', () => {
      const tab = deriver.deriveTab('/finance');

      expect(tab).toMatchObject({
        url: '/finance',
        title: 'Finance',
        module: 'finance',
        view: 'dashboard',
        pinned: false,
      });
      expect(tab.entity).toBeUndefined();
    });

    it('takes the module icon, not the generic chart icon', () => {
      expect(deriver.deriveTab('/finance').icon).toBe('DollarSign');
    });

    it.each([
      ['/hr', 'Human Resources'],
      ['/portal', 'Portal'],
    ])('names %s %s', (url, title) => {
      expect(deriver.deriveTab(url).title).toBe(title);
    });

    it('maps the old /module/dashboard link onto the same tab', () => {
      const legacy = deriver.deriveTab('/finance/dashboard');
      const current = deriver.deriveTab('/finance');

      expect(legacy.url).toBe('/finance');
      expect(legacy.title).toBe('Finance');
      expect(legacy.id).toBe(current.id);
    });

    it('treats the old and the new spelling as one tab, so opening one finds the other', () => {
      expect(deriver.isSameEntity('/finance/dashboard', '/finance')).toBe(true);
      expect(deriver.isSameEntity('/finance', '/finance/dashboard')).toBe(true);
    });

    it('does not confuse two modules', () => {
      expect(deriver.isSameEntity('/finance', '/hr')).toBe(false);
    });
  });

  describe('everything else', () => {
    it('still calls the main dashboard "Dashboard", pinned', () => {
      expect(deriver.deriveTab('/dashboard')).toMatchObject({
        url: '/dashboard',
        title: 'Dashboard',
        module: 'dashboard',
        pinned: true,
      });
    });

    it('still names a page for the thing it lists', () => {
      expect(deriver.deriveTab('/finance/payments')).toMatchObject({
        url: '/finance/payments',
        title: 'Payments',
        entity: 'payments',
      });
    });

    it('does not rewrite a dashboard page nested deeper in a module', () => {
      expect(deriver.deriveTab('/reports/analytics/dashboard').url).toBe('/reports/analytics/dashboard');
    });
  });

  describe('a Settings hub', () => {
    it.each([
      ['/settings/school', 'School & People'],
      ['/settings/modules', 'Modules & Features'],
      ['/settings/system', 'Data & System'],
    ])('is named for what it holds: %s is %s', (url, title) => {
      expect(deriver.deriveTab(url).title).toBe(title);
    });

    it('keeps its name whichever tab of the hub is open, and stays the one workspace tab', () => {
      const profile = deriver.deriveTab('/settings/school');
      const users = deriver.deriveTab('/settings/school?tab=users');

      expect(users.title).toBe('School & People');
      expect(users.id).toBe(profile.id);
    });

    it('names the Settings overview for the module', () => {
      expect(deriver.deriveTab('/settings').title).toBe('Settings');
    });

    it('does not rename a page of another module that happens to share the last word of its address', () => {
      expect(deriver.deriveTab('/administration/school').title).toBe('School');
      expect(deriver.deriveTab('/administration/system').title).toBe('System');
    });

    // A reload rebuilds the tab list from the address alone, with no translations to look names up in.
    describe('with no translation to look its name up in', () => {
      const untranslated = new TabStateDeriver((key) => key);

      it.each([
        ['/settings/school', 'School & People'],
        ['/settings/modules?tab=plugins', 'Modules & Features'],
        ['/settings/system?tab=sync', 'Data & System'],
      ])('is still named for what it holds: %s is %s', (url, title) => {
        expect(untranslated.deriveTab(url).title).toBe(title);
      });

      it('still names a page of another module for its address', () => {
        expect(untranslated.deriveTab('/administration/school').title).toBe('School');
      });
    });
  });
});

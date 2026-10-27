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
});

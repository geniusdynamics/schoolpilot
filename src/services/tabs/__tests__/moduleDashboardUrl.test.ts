// ABOUTME: A module's own dashboard lives at the module root (/finance), and the old /finance/dashboard
// ABOUTME: spelling is mapped to it - while the main dashboard and nested pages are left alone.

import { describe, expect, it } from 'vitest';

import { MODULE_DASHBOARD_ROOTS, canonicalTabUrl, isModuleDashboardRoot } from '../moduleDashboardUrl';

describe('canonicalTabUrl', () => {
  it.each(MODULE_DASHBOARD_ROOTS)('maps /%s/dashboard to the module root', (moduleId) => {
    expect(canonicalTabUrl(`/${moduleId}/dashboard`)).toBe(`/${moduleId}`);
  });

  it('keeps the query string and the hash the link carried', () => {
    expect(canonicalTabUrl('/academics/dashboard?term=2')).toBe('/academics?term=2');
    expect(canonicalTabUrl('/finance/dashboard#recent')).toBe('/finance#recent');
  });

  it('accepts a trailing slash and any letter case, and keeps the case it was given', () => {
    expect(canonicalTabUrl('/finance/dashboard/')).toBe('/finance');
    expect(canonicalTabUrl('/Finance/Dashboard')).toBe('/Finance');
  });

  it('is idempotent: a canonical URL maps to itself', () => {
    for (const moduleId of MODULE_DASHBOARD_ROOTS) {
      expect(canonicalTabUrl(`/${moduleId}`)).toBe(`/${moduleId}`);
    }
  });

  it('leaves the main dashboard alone', () => {
    expect(canonicalTabUrl('/dashboard')).toBe('/dashboard');
  });

  it('maps settings too: its dashboard is the module root, no longer a tab of a hub', () => {
    expect(canonicalTabUrl('/settings/dashboard')).toBe('/settings');
  });

  it('leaves deeper dashboard pages and look-alike segments alone', () => {
    expect(canonicalTabUrl('/reports/analytics/dashboard')).toBe('/reports/analytics/dashboard');
    expect(canonicalTabUrl('/finance/dashboards')).toBe('/finance/dashboards');
    expect(canonicalTabUrl('/finance/dashboard-archive')).toBe('/finance/dashboard-archive');
    expect(canonicalTabUrl('/finance/dashboard/extra')).toBe('/finance/dashboard/extra');
  });

  it('leaves every other page and unknown module alone', () => {
    expect(canonicalTabUrl('/finance/payments')).toBe('/finance/payments');
    expect(canonicalTabUrl('/nowhere/dashboard')).toBe('/nowhere/dashboard');
  });
});

describe('MODULE_DASHBOARD_ROOTS', () => {
  it('names every module that has a dashboard of its own, and not the main dashboard', () => {
    expect(isModuleDashboardRoot('settings')).toBe(true);
    expect(isModuleDashboardRoot('finance')).toBe(true);
    expect(isModuleDashboardRoot('dashboard')).toBe(false);
    expect(isModuleDashboardRoot('login')).toBe(false);
  });
});

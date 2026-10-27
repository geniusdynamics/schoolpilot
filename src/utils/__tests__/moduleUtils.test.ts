// ABOUTME: The dashboard address of a module: its root page, named for the module, except for the main
// ABOUTME: dashboard, which is the app's and not a module's.

import { describe, expect, it } from 'vitest';

import { getModuleDashboardPath } from '../moduleUtils';

describe('getModuleDashboardPath', () => {
  it('is the module root for a module whose dashboard is its root page', () => {
    expect(getModuleDashboardPath('finance')).toBe('/finance');
    expect(getModuleDashboardPath('/academics')).toBe('/academics');
    expect(getModuleDashboardPath('hr')).toBe('/hr');
  });

  it('is the main dashboard for the dashboard itself', () => {
    expect(getModuleDashboardPath('dashboard')).toBe('/dashboard');
  });

  it('is the module root for settings too: its dashboard is no longer a tab of a hub', () => {
    expect(getModuleDashboardPath('settings')).toBe('/settings');
  });
});

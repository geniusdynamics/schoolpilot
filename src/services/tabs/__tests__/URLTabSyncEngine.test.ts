import { beforeEach, describe, expect, it } from 'vitest';
import { URLTabSyncEngine } from '../URLTabSyncEngine';
import type { ParsedTabState } from '../types';

const createState = (): ParsedTabState => ({
  tabs: [
    {
      id: 'tab-dashboard',
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      isDirty: false,
      pinned: true,
      icon: 'HomeIcon'
    },
    {
      id: 'tab-academics',
      url: '/academics/students',
      title: 'Students',
      module: 'academics',
      isDirty: false,
      pinned: false,
      icon: 'AcademicCapIcon'
    }
  ],
  activeTabId: 'tab-academics'
});

describe('URLTabSyncEngine', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/#/dashboard');
    sessionStorage.clear();
  });

  it('stores tabs without double-encoding percent values', () => {
    const engine = new URLTabSyncEngine();
    engine.updateURL(createState());

    const href = window.location.href;
    expect(href.includes('%255B')).toBe(false);
    expect(href.includes('tabs=%5B')).toBe(true);
  });

  it('parses tabs from standard JSON search param', () => {
    const tabs = JSON.stringify(createState().tabs);
    const encoded = new URLSearchParams({ tabs, active: 'tab-academics' }).toString();
    const engine = new URLTabSyncEngine();

    const parsed = engine.parseURL(`/?${encoded}#/dashboard`);

    expect(parsed.tabs).toHaveLength(2);
    expect(parsed.activeTabId).toBe('tab-academics');
    expect(parsed.tabs[1].url).toBe('/academics/students');
  });

  it('parses legacy URI-encoded tabs param for backward compatibility', () => {
    const legacyTabs = encodeURIComponent(JSON.stringify(createState().tabs));
    const engine = new URLTabSyncEngine();
    const parsed = engine.parseURL(`/?tabs=${legacyTabs}&active=tab-academics#/dashboard`);

    expect(parsed.tabs).toHaveLength(2);
    expect(parsed.activeTabId).toBe('tab-academics');
  });

  it('parses relative URL input with origin fallback', () => {
    const tabs = JSON.stringify(createState().tabs);
    const encoded = new URLSearchParams({ tabs, active: 'tab-academics' }).toString();
    const engine = new URLTabSyncEngine();

    const parsed = engine.parseURL(`/?${encoded}`);

    expect(parsed.tabs).toHaveLength(2);
    expect(parsed.activeTabId).toBe('tab-academics');
  });
});

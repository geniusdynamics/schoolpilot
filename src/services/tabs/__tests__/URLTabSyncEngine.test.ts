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

  it('stores tabs as compact repeated search params', () => {
    const engine = new URLTabSyncEngine();
    engine.updateURL(createState());

    const url = new URL(window.location.href);

    expect(url.searchParams.getAll('tab')).toEqual(['/dashboard', '/academics/students']);
    expect(url.searchParams.get('a')).toBe('1');
    expect(url.searchParams.getAll('p')).toEqual(['0']);
    expect(url.searchParams.get('tabs')).toBeNull();
    expect(url.searchParams.get('active')).toBeNull();
    expect(window.location.href.includes('title')).toBe(false);
    expect(window.location.href.includes('module')).toBe(false);
    expect(window.location.href.includes('icon')).toBe(false);
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

  it('parses compact repeated tab params and derives tab metadata', () => {
    const engine = new URLTabSyncEngine();

    const parsed = engine.parseURL('/?tab=/dashboard&tab=/administration/applications&a=1&p=0#/administration/applications');

    expect(parsed.tabs).toHaveLength(2);
    expect(parsed.activeTabId).toBe(parsed.tabs[1].id);
    expect(parsed.tabs[0]).toMatchObject({
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      pinned: true
    });
    expect(parsed.tabs[1]).toMatchObject({
      url: '/administration/applications',
      title: 'Applications',
      module: 'administration',
      entity: 'applications',
      pinned: false
    });
  });
});

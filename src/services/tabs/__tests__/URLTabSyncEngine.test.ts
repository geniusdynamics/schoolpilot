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

    const parsed = engine.parseURL(`/?${encoded}#/academics/students`);

    expect(parsed.tabs).toHaveLength(2);
    expect(parsed.activeTabId).toBe('tab-academics');
    expect(parsed.tabs[1].url).toBe('/academics/students');
  });

  it('parses legacy URI-encoded tabs param for backward compatibility', () => {
    const legacyTabs = encodeURIComponent(JSON.stringify(createState().tabs));
    const engine = new URLTabSyncEngine();
    const parsed = engine.parseURL(`/?tabs=${legacyTabs}&active=tab-academics#/academics/students`);

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

  describe('hub sub-tabs and routed state', () => {
    const storedState = (): ParsedTabState => ({
      tabs: [
        {
          id: 'tab-dashboard',
          url: '/dashboard',
          title: 'Dashboard',
          module: 'dashboard',
          isDirty: false,
          pinned: true
        },
        {
          id: 'tab-administration-classes',
          url: '/administration/classes',
          title: 'Classes',
          module: 'administration',
          entity: 'classes',
          isDirty: false,
          pinned: false
        }
      ],
      activeTabId: 'tab-administration-classes'
    });

    const storeState = (state: ParsedTabState) => {
      sessionStorage.setItem('sp_tabs_v2', JSON.stringify(state));
    };

    it('does not turn the ?tab=bulk-streams hub sub-tab into a /bulk-streams tab', () => {
      storeState(storedState());
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/administration/classes?tab=bulk-streams');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard', '/administration/classes']);
      expect(parsed.tabs.some(tab => tab.url === '/bulk-streams')).toBe(false);
      expect(parsed.activeTabId).toBe('tab-administration-classes');
    });

    it('does not turn the ?tab=school-periods hub sub-tab into a /school-periods tab', () => {
      storeState(storedState());
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/administration/academic-calendar?tab=school-periods');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard', '/administration/classes']);
      expect(parsed.tabs.some(tab => tab.url === '/school-periods')).toBe(false);
    });

    it('ignores hub sub-tab ids mixed into compact tab params', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/?tab=/dashboard&tab=bulk-streams&a=1#/dashboard');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.tabs.some(tab => tab.url === '/bulk-streams')).toBe(false);
    });

    it('activates the tab that matches the routed hash instead of a stale index', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/?tab=/dashboard&tab=/administration/classes&a=0#/administration/classes');

      expect(parsed.tabs).toHaveLength(2);
      expect(parsed.activeTabId).toBe(parsed.tabs[1].id);
      expect(parsed.tabs[1].url).toBe('/administration/classes');
    });

    it('keeps the hub tab active while a hub sub-tab is selected in the routed query', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/?tab=/dashboard&tab=/administration/classes&a=0#/administration/classes?tab=bulk-streams');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard', '/administration/classes']);
      expect(parsed.activeTabId).toBe(parsed.tabs[1].id);
    });

    it('restores unique ids when a hub tab carries route query state', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL(
        '/?tab=/administration/classes&tab=/administration/classes?tab=bulk-streams&a=1#/administration/classes?tab=bulk-streams'
      );

      const ids = parsed.tabs.map(tab => tab.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(parsed.activeTabId).toBe(parsed.tabs[1].id);
    });

    it('never restores a tab whose url is not an absolute route path', () => {
      sessionStorage.setItem('sp_tabs_v2', JSON.stringify({
        tabs: [
          { id: 'tab-dashboard', url: '/dashboard', title: 'Dashboard', module: 'dashboard' },
          { id: 'tab-bulk-streams', url: 'bulk-streams', title: 'Bulk Streams', module: 'bulk-streams' }
        ],
        activeTabId: 'tab-bulk-streams'
      }));
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/#/dashboard');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.activeTabId).toBe('tab-dashboard');
    });
  });

  describe('route existence validation', () => {
    const storeState = (state: ParsedTabState) => {
      sessionStorage.setItem('sp_tabs_v2', JSON.stringify(state));
    };

    it('does not restore a stored /bulk-streams tab', () => {
      storeState({
        tabs: [
          { id: 'tab-dashboard', url: '/dashboard', title: 'Dashboard', module: 'dashboard', isDirty: false, pinned: true },
          { id: 'tab-bulk-streams', url: '/bulk-streams', title: 'Bulk Streams', module: 'bulk-streams', isDirty: false, pinned: false }
        ],
        activeTabId: 'tab-bulk-streams'
      });
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/#/bulk-streams');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.activeTabId).toBe('tab-dashboard');
    });

    it('falls back to the default dashboard tab when every stored tab is a 404', () => {
      storeState({
        tabs: [
          { id: 'tab-bulk-streams', url: '/bulk-streams', title: 'Bulk Streams', module: 'bulk-streams', isDirty: false, pinned: false }
        ],
        activeTabId: 'tab-bulk-streams'
      });
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/#/bulk-streams');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.activeTabId).toBe('tab-dashboard');
    });

    it('does not parse /bulk-streams from a repeated tab param', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/?tab=/bulk-streams&a=0#/bulk-streams');

      expect(parsed.tabs.some(tab => tab.url === '/bulk-streams')).toBe(false);
      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.activeTabId).toBe('tab-dashboard');
    });

    it('does not parse a dot-segment path that collapses to /bulk-streams', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/?tab=/dashboard/../bulk-streams&a=0#/dashboard');

      expect(parsed.tabs.some(tab => tab.url.includes('bulk-streams'))).toBe(false);
      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.activeTabId).toBe('tab-dashboard');
    });

    it('keeps the active index on a real tab when an invalid tab is listed first', () => {
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/?tab=/bulk-streams&tab=/dashboard&a=1#/bulk-streams');

      expect(parsed.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(parsed.activeTabId).toBe('tab-dashboard');
    });

    it('never persists a 404 tab through updateURL', () => {
      const engine = new URLTabSyncEngine();

      engine.updateURL({
        tabs: [
          { id: 'tab-dashboard', url: '/dashboard', title: 'Dashboard', module: 'dashboard', isDirty: false, pinned: true },
          { id: 'tab-bulk-streams', url: '/bulk-streams', title: 'Bulk Streams', module: 'bulk-streams', isDirty: false, pinned: false }
        ],
        activeTabId: 'tab-bulk-streams'
      });

      const stored = JSON.parse(sessionStorage.getItem('sp_tabs_v2') || '{}') as ParsedTabState;
      expect(stored.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
      expect(stored.activeTabId).toBe('tab-dashboard');
      expect(new URL(window.location.href).searchParams.getAll('tab')).toEqual(['/dashboard']);
    });

    it('restores tabs whose query values contain spaces', () => {
      storeState({
        tabs: [
          { id: 'tab-dashboard', url: '/dashboard', title: 'Dashboard', module: 'dashboard', isDirty: false, pinned: true },
          {
            id: 'tab-academics-students-list',
            url: '/academics/students?search=John Doe',
            title: 'Students',
            module: 'academics',
            isDirty: false,
            pinned: false
          }
        ],
        activeTabId: 'tab-academics-students-list'
      });
      const engine = new URLTabSyncEngine();

      const parsed = engine.parseURL('/academics/students?search=John Doe#/academics/students');

      expect(parsed.tabs).toHaveLength(2);
      expect(parsed.tabs[1].url).toBe('/academics/students?search=John Doe');
      expect(parsed.activeTabId).toBe('tab-academics-students-list');
    });
  });
});

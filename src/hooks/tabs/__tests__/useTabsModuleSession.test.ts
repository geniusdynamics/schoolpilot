import { describe, expect, it } from 'vitest';
import { buildModuleSessionState } from '../useTabs';
import { TabStateDeriver } from '@/services/tabs/TabStateDeriver';
import type { ParsedTabState } from '@/services/tabs/types';

const createDeriver = () => new TabStateDeriver((key, options) => {
  if (key.startsWith('navigation:')) {
    return key.replace('navigation:', '').split('.')[0].replace(/^\w/, match => match.toUpperCase());
  }

  if (key.startsWith('entities.')) {
    return key.replace('entities.', '').replace(/^\w/, match => match.toUpperCase());
  }

  if (key === 'tabs.editEntity') {
    return `Edit ${String(options?.entity || 'Item')}`;
  }

  if (key === 'tabs.viewEntity') {
    return String(options?.entity || 'Item');
  }

  return key;
});

const createState = (): ParsedTabState => ({
  tabs: [
    {
      id: 'tab-dashboard',
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      pinned: true,
      isDirty: false
    },
    {
      id: 'tab-administration-applications',
      url: '/administration/applications',
      title: 'Applications',
      module: 'administration',
      entity: 'applications',
      pinned: false,
      isDirty: false
    },
    {
      id: 'tab-finance-dashboard',
      url: '/finance/dashboard',
      title: 'Dashboard',
      module: 'finance',
      entity: 'dashboard',
      pinned: true,
      isDirty: false
    }
  ],
  activeTabId: 'tab-administration-applications'
});

describe('buildModuleSessionState', () => {
  it('keeps only allowed pinned tabs when switching modules', async () => {
    const nextState = await buildModuleSessionState({
      currentState: createState(),
      targetUrl: '/academics/dashboard',
      deriver: createDeriver(),
      options: {
        preservePinned: true,
        canPreserveTab: async (tab) => tab.module !== 'finance'
      }
    });

    // A module's dashboard is its root page, and its tab carries the module's name.
    expect(nextState.tabs.map(tab => tab.url)).toEqual(['/dashboard', '/academics']);
    expect(nextState.activeTabId).toBe(nextState.tabs[1].id);
    expect(nextState.tabs[1]).toMatchObject({
      module: 'academics',
      title: 'Academics'
    });
    expect(nextState.tabs[1].entity).toBeUndefined();
  });

  it('closes every tab, the pinned ones too, when no pinned tab is to be preserved', async () => {
    const nextState = await buildModuleSessionState({
      currentState: createState(),
      targetUrl: '/dashboard',
      deriver: createDeriver(),
      options: { preservePinned: false, pinned: true }
    });

    // The pinned finance tab and the working tab are gone; one fresh, pinned dashboard remains.
    expect(nextState.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
    expect(nextState.tabs[0]).toMatchObject({ module: 'dashboard', title: 'Dashboard', pinned: true });
    expect(nextState.activeTabId).toBe(nextState.tabs[0].id);
  });

  it('reuses an existing pinned target tab instead of duplicating it', async () => {
    const state = createState();
    state.tabs.push({
      id: 'tab-academics-dashboard',
      url: '/academics/dashboard',
      title: 'Old Academics Dashboard',
      module: 'academics',
      entity: 'dashboard',
      pinned: true,
      isDirty: true
    });

    const nextState = await buildModuleSessionState({
      currentState: state,
      targetUrl: '/academics/dashboard',
      deriver: createDeriver(),
      options: {
        preservePinned: true
      }
    });

    // The saved tab still carries the old /academics/dashboard address; it is the same tab as the
    // module root, so it is reused (and moved to the current address) rather than duplicated.
    expect(nextState.tabs.filter(tab => tab.module === 'academics')).toHaveLength(1);
    expect(nextState.tabs.at(-1)).toMatchObject({
      id: 'tab-academics-dashboard',
      url: '/academics',
      pinned: true,
      isDirty: true
    });
    expect(nextState.activeTabId).toBe('tab-academics-dashboard');
  });
});

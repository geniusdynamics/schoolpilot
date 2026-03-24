import { describe, expect, it } from 'vitest';
import { buildModuleSessionState } from '../useTabs';
import { TabStateDeriver } from '../../../services/tabs/TabStateDeriver';
import type { ParsedTabState } from '../../../services/tabs/types';

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

    expect(nextState.tabs.map(tab => tab.url)).toEqual(['/dashboard', '/academics/dashboard']);
    expect(nextState.activeTabId).toBe(nextState.tabs[1].id);
    expect(nextState.tabs[1]).toMatchObject({
      module: 'academics',
      entity: 'dashboard',
      title: 'Dashboard'
    });
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

    expect(nextState.tabs.filter(tab => tab.url === '/academics/dashboard')).toHaveLength(1);
    expect(nextState.tabs.at(-1)).toMatchObject({
      id: 'tab-academics-dashboard',
      pinned: true,
      isDirty: true
    });
    expect(nextState.activeTabId).toBe('tab-academics-dashboard');
  });
});

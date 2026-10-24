/**
 * useTabs Hook - URL-Driven Tab Management
 *
 * The primary hook for tab management in the new URL-driven architecture.
 * All tab state is derived from the URL, making it shareable and persistent.
 *
 * @example
 * const { tabs, activeTab, openTab, closeTab, activateTab } = useTabs();
 *
 * // Open a new tab
 * openTab('/academics/students');
 *
 * // Open specific student
 * openTab('/academics/students/123');
 *
 * // Close current tab
 * closeTab(activeTab.id);
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { urlTabSyncEngine } from '@/services/tabs/URLTabSyncEngine';
import { routeToTabMapper } from '@/services/tabs/RouteToTabMapper';
import { TabStateDeriver } from '@/services/tabs/TabStateDeriver';
import type { Tab, TabOptions, ParsedTabState } from '@/services/tabs/types';
import { logger } from '@/utils/logging';
import { useTranslation } from 'react-i18next';

// Singleton engine instance
const engine = urlTabSyncEngine;

export interface ModuleSessionOptions extends TabOptions {
  preservePinned?: boolean;
  refresh?: boolean;
  canPreserveTab?: (tab: Tab) => boolean | Promise<boolean>;
}

interface BuildModuleSessionStateInput {
  currentState: ParsedTabState;
  targetUrl: string;
  deriver: TabStateDeriver;
  options?: ModuleSessionOptions;
}

const resolvePreservedPinnedTabs = async (
  tabs: Tab[],
  options?: ModuleSessionOptions
): Promise<Tab[]> => {
  if (!options?.preservePinned) {
    return [];
  }

  const preserved: Tab[] = [];

  for (const tab of tabs) {
    if (!tab.pinned) {
      continue;
    }

    const canPreserve = options.canPreserveTab ? await options.canPreserveTab(tab) : true;
    if (canPreserve) {
      preserved.push(tab);
    }
  }

  return preserved;
};

export const buildModuleSessionState = async ({
  currentState,
  targetUrl,
  deriver,
  options
}: BuildModuleSessionStateInput): Promise<ParsedTabState> => {
  const preservedPinnedTabs = await resolvePreservedPinnedTabs(currentState.tabs, options);
  const derivedTargetTab = deriver.deriveTab(targetUrl, options);
  const existingTargetTab = preservedPinnedTabs.find(tab => deriver.isSameEntity(tab.url, targetUrl));
  const targetTab = existingTargetTab
    ? {
        ...existingTargetTab,
        ...derivedTargetTab,
        id: existingTargetTab.id,
        pinned: options?.pinned ?? existingTargetTab.pinned,
        isDirty: existingTargetTab.isDirty
      }
    : derivedTargetTab;
  const sessionTabs = [
    ...preservedPinnedTabs.filter(tab => !deriver.isSameEntity(tab.url, targetUrl)),
    targetTab
  ];

  return {
    tabs: sessionTabs,
    activeTabId: targetTab.id
  };
};

interface UseTabsReturn {
  /** All open tabs */
  tabs: Tab[];

  /** Currently active tab */
  activeTab: Tab | null;

  /** ID of active tab */
  activeTabId: string;

  /** Activate a tab by ID */
  activateTab: (tabId: string) => void;

  /** Open a new tab or activate existing */
  openTab: (url: string, options?: TabOptions) => string;

  /** Replace current tabs with a single tab session */
  startSession: (url: string, options?: TabOptions) => string;

  /** Switch modules while preserving allowed pinned tabs */
  switchModuleSession: (url: string, options?: ModuleSessionOptions) => Promise<string>;

  /** Close a tab */
  closeTab: (tabId: string) => void;

  /** Close multiple tabs */
  closeTabs: (tabIds: string[]) => void;

  /** Close all tabs except specified */
  closeOtherTabs: (keepTabId: string) => void;

  /** Close all tabs to the right */
  closeTabsToRight: (tabId: string) => void;

  /** Close all tabs to the left */
  closeTabsToLeft: (tabId: string) => void;

  /** Close all tabs */
  closeAllTabs: () => void;

  /** Close all non-pinned tabs */
  closeAllExceptPinned: () => void;

  /** Pin a tab */
  pinTab: (tabId: string) => void;

  /** Unpin a tab */
  unpinTab: (tabId: string) => void;

  /** Reorder tabs */
  reorderTabs: (newOrder: string[]) => void;

  /** Mark tab as dirty (unsaved changes) */
  markDirty: (tabId: string, isDirty: boolean) => void;

  /** Refresh tab title from URL */
  refreshTab: (tabId: string) => void;

  /** Duplicate a tab */
  duplicateTab: (tabId: string) => string;

  /** Check if tab can be closed */
  canCloseTab: (tabId: string) => boolean;

  /** Maximum number of tabs allowed */
  maxTabs: number;

  /** Whether tab limit is reached */
  isAtLimit: boolean;

  /** Current tab count */
  tabCount: number;
}

const MAX_TABS = 20;

export function useTabs(): UseTabsReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Create deriver with translation function
  const deriver = useMemo(() => new TabStateDeriver(t), [t]);

  // Local state synced with URL
  const [state, setState] = useState<ParsedTabState>(() => engine.parseURL());

  // Track initial mount
  const isInitialMount = useRef(true);

  // Combine URL sync effects into one
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const initialState = engine.parseURL();
      setState(initialState);
      return;
    }

    // When location changes (browser nav), update tab state
    const newState = engine.parseURL(location.pathname + location.search);
    setState(newState);
  }, [location.pathname, location.search]);

  // The engine writes the tab list with `history.replaceState`, which React Router does not observe:
  // a caller that writes the list and does not also navigate left this hook holding the list it
  // started with, so the tabs stayed on screen and the action looked like it did nothing. Following
  // the engine's own notifications keeps the two in step whichever way the URL was written.
  useEffect(() => engine.subscribe((next) => setState(next)), []);

  // Computed values
  const activeTab = useMemo(() => {
    return state.tabs.find(t => t.id === state.activeTabId) || null;
  }, [state.tabs, state.activeTabId]);

  const isAtLimit = state.tabs.length >= MAX_TABS;

  // Sync browser document.title with active tab
  useEffect(() => {
    if (typeof document !== 'undefined' && activeTab?.title) {
      document.title = `${activeTab.title} - SchoolPilot`;
    } else if (typeof document !== 'undefined') {
      document.title = 'SchoolPilot - Modern School Management';
    }
  }, [activeTab?.title]);

  // Actions
  const activateTab = useCallback((tabId: string) => {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Update URL with new active tab
    const newState = { ...state, activeTabId: tabId };
    engine.updateURL(newState);

    // Navigate to tab's URL
    navigate(tab.url);
  }, [state, navigate]);

  const openTab = useCallback((url: string, options?: TabOptions): string => {
    // Unknown routes render the 404 page; they must never become tabs.
    if (!routeToTabMapper.isKnownAppRoute(url)) {
      logger.warn('[useTabs] Refusing to open a tab for an unknown route:', url);
      return state.activeTabId;
    }

    // Check if tab already exists for this URL
    const existingTab = state.tabs.find(t => deriver.isSameEntity(t.url, url));

    if (existingTab) {
      // Activate existing tab
      activateTab(existingTab.id);
      return existingTab.id;
    }

    // Check tab limit
    if (state.tabs.length >= MAX_TABS) {
      // Find oldest non-pinned tab to close
      const closableTabs = state.tabs
        .filter(t => !t.pinned)
        .sort((a, b) => (a.metadata?.lastAccessed || 0) - (b.metadata?.lastAccessed || 0));

      if (closableTabs.length === 0) {
        throw new Error('Maximum tab limit reached and no tabs can be closed');
      }

      // Close oldest tab
      const tabToClose = closableTabs[0];
      const tabsWithoutOldest = state.tabs.filter(t => t.id !== tabToClose.id);

      // Create new tab
      const newTab = deriver.deriveTab(url, options);
      const newTabs = [...tabsWithoutOldest, newTab];
      const newState = { tabs: newTabs, activeTabId: newTab.id };

      engine.updateURL(newState, { push: true });
      navigate(url);

      return newTab.id;
    }

    // Create new tab
    const newTab = deriver.deriveTab(url, options);
    const newTabs = [...state.tabs, newTab];
    const newState = { tabs: newTabs, activeTabId: newTab.id };

    engine.updateURL(newState, { push: true });
    navigate(url);

    return newTab.id;
  }, [state, deriver, activateTab, navigate]);

  const startSession = useCallback((url: string, options?: TabOptions): string => {
    const newTab = deriver.deriveTab(url, options);
    const newState = { tabs: [newTab], activeTabId: newTab.id };
    engine.updateURL(newState, { push: true });
    navigate(url);
    return newTab.id;
  }, [deriver, navigate]);

  const switchModuleSession = useCallback(async (url: string, options?: ModuleSessionOptions): Promise<string> => {
    const newState = await buildModuleSessionState({
      currentState: state,
      targetUrl: url,
      deriver,
      options: {
        preservePinned: true,
        ...options
      }
    });

    if (options?.refresh) {
      const nextUrl = engine.createURL(newState, url);
      engine.updateURL(newState);
      window.location.assign(nextUrl);
      return newState.activeTabId;
    }

    engine.updateURL(newState, { push: true });
    navigate(url);
    return newState.activeTabId;
  }, [state, deriver, navigate]);

  const closeTab = useCallback((tabId: string) => {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    if (tab.pinned) return; // Can't close pinned tabs

    const newTabs = state.tabs.filter(t => t.id !== tabId);

    // Determine new active tab
    let newActiveId = state.activeTabId;
    if (state.activeTabId === tabId) {
      // Closing active tab - activate next or previous
      const closedIndex = state.tabs.findIndex(t => t.id === tabId);
      const newActive = newTabs[Math.min(closedIndex, newTabs.length - 1)];
      newActiveId = newActive?.id || '';
    }

    const newState = { tabs: newTabs, activeTabId: newActiveId };
    engine.updateURL(newState);

    // Navigate to new active tab if we closed the active one
    if (state.activeTabId === tabId && newActiveId) {
      const newActiveTab = newTabs.find(t => t.id === newActiveId);
      if (newActiveTab) {
        navigate(newActiveTab.url);
      }
    } else if (state.activeTabId === tabId && !newActiveId) {
      // If we closed the last tab, go to dashboard
      navigate('/dashboard');
    }
  }, [state, navigate]);

  const closeTabs = useCallback((tabIds: string[]) => {
    const newTabs = state.tabs.filter(t => !tabIds.includes(t.id) || t.pinned);

    // Check if active tab was closed
    let newActiveId = state.activeTabId;
    if (tabIds.includes(state.activeTabId)) {
      const newActive = newTabs[0];
      newActiveId = newActive?.id || '';
    }

    const newState = { tabs: newTabs, activeTabId: newActiveId };
    engine.updateURL(newState);

    if (state.activeTabId !== newActiveId && newActiveId) {
      const newActiveTab = newTabs.find(t => t.id === newActiveId);
      if (newActiveTab) {
        navigate(newActiveTab.url);
      }
    }
  }, [state, navigate]);

  const closeOtherTabs = useCallback((keepTabId: string) => {
    // Keep the specified tab and any pinned tabs; close all other non-pinned tabs
    const newTabs = state.tabs.filter(t => t.id === keepTabId || t.pinned);
    const newState = { tabs: newTabs, activeTabId: keepTabId };
    engine.updateURL(newState);

    // The kept tab becomes the active one, so the page has to follow it: closing the others while
    // looking at a tab that is now gone would leave the tab bar and the page disagreeing.
    if (state.activeTabId !== keepTabId) {
      const kept = newTabs.find(t => t.id === keepTabId);
      if (kept) navigate(kept.url);
    }
  }, [state, navigate]);

  const closeTabsToRight = useCallback((tabId: string) => {
    const tabIndex = state.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tabsToClose = state.tabs
      .slice(tabIndex + 1)
      .filter(t => !t.pinned)
      .map(t => t.id);

    closeTabs(tabsToClose);
  }, [state, closeTabs]);

  const closeTabsToLeft = useCallback((tabId: string) => {
    const tabIndex = state.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tabsToClose = state.tabs
      .slice(0, tabIndex)
      .filter(t => !t.pinned)
      .map(t => t.id);

    closeTabs(tabsToClose);
  }, [state, closeTabs]);

  const closeAllTabs = useCallback(() => {
    // Close ALL tabs including pinned (Close All should close everything)
    const tabsToClose = state.tabs.map(t => t.id);
    closeTabs(tabsToClose);
  }, [state, closeTabs]);

  const closeAllExceptPinned = useCallback(() => {
    const tabsToClose = state.tabs.filter(t => !t.pinned).map(t => t.id);
    closeTabs(tabsToClose);
  }, [state, closeTabs]);

  const pinTab = useCallback((tabId: string) => {
    const newTabs = state.tabs.map(t =>
      t.id === tabId ? { ...t, pinned: true } : t
    );
    const newState = { ...state, tabs: newTabs };
    engine.updateURL(newState);
  }, [state]);

  const unpinTab = useCallback((tabId: string) => {
    const newTabs = state.tabs.map(t =>
      t.id === tabId ? { ...t, pinned: false } : t
    );
    const newState = { ...state, tabs: newTabs };
    engine.updateURL(newState);
  }, [state]);

  const reorderTabs = useCallback((newOrder: string[]) => {
    const orderedTabs = newOrder
      .map(id => state.tabs.find(t => t.id === id))
      .filter((t): t is Tab => !!t);

    // Add any tabs not in newOrder at the end
    const remainingTabs = state.tabs.filter(t => !newOrder.includes(t.id));
    const newTabs = [...orderedTabs, ...remainingTabs];

    const newState = { ...state, tabs: newTabs };
    engine.updateURL(newState);
  }, [state]);

  const markDirty = useCallback((tabId: string, isDirty: boolean) => {
    const newTabs = state.tabs.map(t =>
      t.id === tabId ? { ...t, isDirty } : t
    );
    const newState = { ...state, tabs: newTabs };
    engine.updateURL(newState);
  }, [state]);

  const refreshTab = useCallback((tabId: string) => {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const updatedTab = deriver.updateTabUrl(tab, tab.url);
    const newTabs = state.tabs.map(t =>
      t.id === tabId ? updatedTab : t
    );
    const newState = { ...state, tabs: newTabs };
    engine.updateURL(newState);
  }, [state, deriver]);

  const duplicateTab = useCallback((tabId: string): string => {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) throw new Error('Tab not found');

    const newTab = deriver.deriveTab(tab.url, {
      title: `${tab.title} (Copy)`,
      pinned: false
    });

    const newTabs = [...state.tabs, newTab];
    const newState = { tabs: newTabs, activeTabId: newTab.id };
    engine.updateURL(newState, { push: true });

    return newTab.id;
  }, [state, deriver]);

  const canCloseTab = useCallback((tabId: string): boolean => {
    const tab = state.tabs.find(t => t.id === tabId);
    return !!tab && !tab.pinned;
  }, [state.tabs]);

  return {
    tabs: state.tabs,
    activeTab,
    activeTabId: state.activeTabId,
    activateTab,
    openTab,
    startSession,
    switchModuleSession,
    closeTab,
    closeTabs,
    closeOtherTabs,
    closeTabsToRight,
    closeTabsToLeft,
    closeAllTabs,
    closeAllExceptPinned,
    pinTab,
    unpinTab,
    reorderTabs,
    markDirty,
    refreshTab,
    duplicateTab,
    canCloseTab,
    maxTabs: MAX_TABS,
    isAtLimit,
    tabCount: state.tabs.length
  };
}

export default useTabs;

/**
 * URL Tab Sync Engine
 * 
 * Core engine that synchronizes tab state with the URL.
 * The URL is the single source of truth - tab state is derived from URL.
 */

import type { Tab, ParsedTabState, TabStateSnapshot } from './types';
import { performanceEventManager } from '@/services/performance';
import { TabStateDeriver } from './TabStateDeriver';

const STORAGE_KEY = 'sp_tabs_v2';
const MAX_TABS = 20;
const TAB_PARAM = 'tab';
const ACTIVE_INDEX_PARAM = 'a';
const PINNED_INDEX_PARAM = 'p';
const DIRTY_INDEX_PARAM = 'd';
const LEGACY_TABS_PARAM = 'tabs';
const LEGACY_ACTIVE_PARAM = 'active';

export class URLTabSyncEngine {
  private subscribers: Set<(state: ParsedTabState) => void> = new Set();
  private lastState: ParsedTabState | null = null;
  private isProcessing = false;
  private readonly deriver = new TabStateDeriver((key, options) => {
    if (key.startsWith('navigation:')) {
      return this.formatFallbackLabel(key.replace('navigation:', '').split('.')[0] || 'dashboard');
    }

    if (key.startsWith('entities.')) {
      return this.formatFallbackLabel(key.replace('entities.', ''));
    }

    if (key === 'tabs.editEntity') {
      return `Edit ${String(options?.entity || 'Item')}`;
    }

    if (key === 'tabs.viewEntity') {
      return String(options?.entity || 'Item');
    }

    return key;
  });

  constructor() {
    // Listen for browser back/forward
    window.addEventListener('popstate', () => {
      this.handleURLChange();
    });

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.handleStorageChange();
      }
    });
  }

  /**
   * Parse current URL to get tab state
   */
  parseURL(url: string = window.location.href): ParsedTabState {
    try {
      const urlObj = new URL(url, window.location.origin);
      const params = urlObj.searchParams;

      const compactState = this.parseCompactTabState(params);
      if (compactState) {
        return compactState;
      }

      // Try to get tabs from URL first
      const tabsParam = params.get(LEGACY_TABS_PARAM);
      if (tabsParam) {
        try {
          let tabs: unknown = null;

          try {
            tabs = JSON.parse(tabsParam);
          } catch {
            tabs = JSON.parse(decodeURIComponent(tabsParam));
          }

          if (Array.isArray(tabs) && tabs.length > 0) {
            const validTabs = this.validateTabs(tabs);
            const activeTabId = params.get(LEGACY_ACTIVE_PARAM) || validTabs[0]?.id;
            return { tabs: validTabs, activeTabId };
          }
        } catch (e) {
          console.warn('Failed to parse tabs from URL:', e);
        }
      }

      // Fallback to session storage
      const stored = this.loadFromStorage();
      if (stored && stored.tabs.length > 0) {
        return stored;
      }

      // Default to dashboard
      return this.getDefaultState();
    } catch (error) {
      console.error('Error parsing URL:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Update URL to reflect tab state
   */
  updateURL(state: ParsedTabState, options?: { push?: boolean }): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const finalUrl = this.createURL(state);
      const historyState = this.buildHistoryState(state);
      // Update browser history
      try {
        if (options?.push) {
          window.history.pushState(historyState, '', finalUrl);
        } else {
          window.history.replaceState(historyState, '', finalUrl);
        }
        performanceEventManager.markDiagnostic('tab_url_updated', {
          mode: options?.push ? 'push' : 'replace',
          tabsCount: state.tabs.length,
          activeTabId: state.activeTabId
        });
      } catch (historyErr) {
        performanceEventManager.markDiagnostic('tab_url_update_failed', {
          error: historyErr instanceof Error ? historyErr.message : String(historyErr)
        });
        console.warn('[URLTabSyncEngine] Failed to update browser history:', historyErr);
      }

      // Store in session storage for redundancy
      this.saveToStorage(state);

      // Notify subscribers
      this.lastState = state;
      this.notifySubscribers(state);
    } catch (err) {
      console.error('Error in updateURL:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Subscribe to tab state changes
   */
  subscribe(callback: (state: ParsedTabState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Create a new tab URL
   */
  createTabURL(baseURL: string, tabId: string): string {
    const url = new URL(baseURL, window.location.origin);
    return url.toString();
  }

  /**
   * Get current active tab ID from URL
   */
  getActiveTabId(url: string = window.location.href): string | null {
    try {
      const parsed = this.parseURL(url);
      return parsed.activeTabId || null;
    } catch {
      return null;
    }
  }

  /**
   * Build a tab URL from components
   */
  buildTabURL(module: string, entity?: string, entityId?: string, view?: string): string {
    let path = `/${module}`;
    if (entity) path += `/${entity}`;
    if (entityId) path += `/${entityId}`;
    
    const url = new URL(path, window.location.origin);
    if (view) url.searchParams.set('view', view);
    
    return url.toString();
  }

  /**
   * Parse a URL to extract tab information
   */
  parseTabURL(url: string): { module: string; entity?: string; entityId?: string; view?: string } {
    try {
      const urlObj = new URL(url, window.location.origin);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      
      return {
        module: parts[0] || 'dashboard',
        entity: parts[1],
        entityId: parts[2],
        view: urlObj.searchParams.get('view') || undefined
      };
    } catch {
      return { module: 'dashboard' };
    }
  }

  /**
   * Take a snapshot of current state
   */
  takeSnapshot(): TabStateSnapshot {
    const state = this.parseURL();
    return {
      timestamp: Date.now(),
      state,
      url: window.location.href
    };
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(snapshot: TabStateSnapshot): void {
    this.updateURL(snapshot.state, { push: true });
  }

  /**
   * Clear all tabs and reset to default
   */
  reset(): void {
    const defaultState = this.getDefaultState();
    this.updateURL(defaultState);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private handleURLChange(): void {
    performanceEventManager.markDiagnostic('tab_url_popstate', {
      href: window.location.href
    });
    const state = this.parseURL();
    this.lastState = state;
    this.notifySubscribers(state);
  }

  private handleStorageChange(): void {
    // Cross-tab synchronization
    const state = this.loadFromStorage();
    if (state && this.hasStateChanged(state)) {
      this.lastState = state;
      this.notifySubscribers(state);
    }
  }

  private notifySubscribers(state: ParsedTabState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in tab subscriber:', error);
      }
    });
  }

  private validateTabs(tabs: any[]): Tab[] {
    if (!Array.isArray(tabs)) return [];
    
    return tabs
      .filter(t => t && typeof t === 'object' && t.id && t.url && t.module)
      .slice(0, MAX_TABS)
      .map(t => ({
        id: String(t.id),
        url: String(t.url),
        title: String(t.title || 'Untitled'),
        module: String(t.module),
        entity: t.entity ? String(t.entity) : undefined,
        entityId: t.entityId ? String(t.entityId) : undefined,
        view: t.view ? String(t.view) : undefined,
        isDirty: Boolean(t.isDirty),
        pinned: Boolean(t.pinned),
        icon: t.icon ? String(t.icon) : undefined,
        metadata: {
          createdAt: Number(t.metadata?.createdAt) || Date.now(),
          lastAccessed: Number(t.metadata?.lastAccessed) || Date.now()
        }
      }));
  }

  private getDefaultState(): ParsedTabState {
    const dashboardTab: Tab = {
      id: 'tab-dashboard',
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      isDirty: false,
      pinned: true,
      icon: 'Home'
    };
    
    return {
      tabs: [dashboardTab],
      activeTabId: dashboardTab.id
    };
  }

  private saveToStorage(state: ParsedTabState): void {
    try {
      const data = JSON.stringify(state);
      sessionStorage.setItem(STORAGE_KEY, data);
      console.log('[URLTabSyncEngine] Saved state to storage. Tabs count:', state.tabs.length, 'Data length:', data.length);
    } catch (error) {
      console.error('[URLTabSyncEngine] Failed to save tab state to storage:', error);
    }
  }

  private loadFromStorage(): ParsedTabState | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.tabs && parsed.activeTabId) {
          const validated = {
            tabs: this.validateTabs(parsed.tabs),
            activeTabId: parsed.activeTabId
          };
          console.log('[URLTabSyncEngine] Loaded state from storage. Tabs count:', validated.tabs.length);
          return validated;
        }
      }
    } catch (error) {
      console.warn('[URLTabSyncEngine] Failed to load tab state from storage:', error);
    }
    return null;
  }

  private hasStateChanged(newState: ParsedTabState): boolean {
    if (!this.lastState) return true;
    
    return (
      this.lastState.activeTabId !== newState.activeTabId ||
      this.lastState.tabs.length !== newState.tabs.length ||
      JSON.stringify(this.lastState.tabs.map(t => t.id)) !== 
      JSON.stringify(newState.tabs.map(t => t.id))
    );
  }

  private parseCompactTabState(params: URLSearchParams): ParsedTabState | null {
    const tabUrls = params.getAll(TAB_PARAM).filter(Boolean);

    if (tabUrls.length === 0) {
      return null;
    }

    const pinnedIndices = this.parseIndexSet(params.getAll(PINNED_INDEX_PARAM));
    const dirtyIndices = this.parseIndexSet(params.getAll(DIRTY_INDEX_PARAM));
    const tabs = this.restoreCompactTabs(tabUrls, pinnedIndices, dirtyIndices);

    if (tabs.length === 0) {
      return null;
    }

    const requestedActiveIndex = Number.parseInt(params.get(ACTIVE_INDEX_PARAM) || '0', 10);
    const activeIndex = Number.isInteger(requestedActiveIndex)
      ? Math.min(Math.max(requestedActiveIndex, 0), tabs.length - 1)
      : 0;

    return {
      tabs,
      activeTabId: tabs[activeIndex]?.id || tabs[0].id
    };
  }

  private parseIndexSet(values: string[]): Set<number> {
    return new Set(
      values
        .map(value => Number.parseInt(value, 10))
        .filter(value => Number.isInteger(value) && value >= 0)
    );
  }

  private restoreCompactTabs(tabUrls: string[], pinnedIndices: Set<number>, dirtyIndices: Set<number>): Tab[] {
    const seenUrls = new Map<string, number>();

    return tabUrls
      .map(url => this.normalizeTabUrl(url))
      .filter(Boolean)
      .slice(0, MAX_TABS)
      .map((url, index) => {
        const occurrence = (seenUrls.get(url) || 0) + 1;
        seenUrls.set(url, occurrence);

        const derivedTab = this.deriver.deriveTab(url);

        return {
          ...derivedTab,
          id: this.buildRestoredTabId(derivedTab, occurrence),
          pinned: pinnedIndices.has(index) || derivedTab.pinned,
          isDirty: dirtyIndices.has(index)
        };
      });
  }

  private normalizeTabUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url.startsWith('/') ? url : `/${url.replace(/^\/+/, '')}`;
    }
  }

  createURL(state: ParsedTabState, hashRoute?: string): string {
    const url = new URL(window.location.href);
    const activeTabIndex = Math.max(0, state.tabs.findIndex(tab => tab.id === state.activeTabId));

    this.clearTabSearchParams(url.searchParams);
    this.applyStateToSearchParams(url.searchParams, state, activeTabIndex);

    if (hashRoute !== undefined) {
      url.hash = this.normalizeHashRoute(hashRoute);
    }

    const urlString = url.toString();
    return urlString.length > 2000 ? this.buildStorageFallbackURL(url) : urlString;
  }

  private buildRestoredTabId(tab: Tab, occurrence: number): string {
    if (tab.module === 'dashboard' && !tab.entity && !tab.entityId && occurrence === 1) {
      return 'tab-dashboard';
    }

    const segments = ['tab', tab.module];

    if (tab.entity) {
      segments.push(tab.entity);
    }

    if (tab.entityId) {
      segments.push(tab.entityId);
    }

    if (occurrence > 1 || (!tab.entity && !tab.entityId)) {
      segments.push(String(occurrence));
    }

    return segments.join('-');
  }

  private clearTabSearchParams(params: URLSearchParams): void {
    [
      TAB_PARAM,
      ACTIVE_INDEX_PARAM,
      PINNED_INDEX_PARAM,
      DIRTY_INDEX_PARAM,
      LEGACY_TABS_PARAM,
      LEGACY_ACTIVE_PARAM
    ].forEach(param => params.delete(param));
  }

  private buildStorageFallbackURL(url: URL): string {
    const cleanUrl = new URL(url.toString());
    this.clearTabSearchParams(cleanUrl.searchParams);
    return `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`;
  }

  private applyStateToSearchParams(params: URLSearchParams, state: ParsedTabState, activeTabIndex: number): void {
    state.tabs.forEach((tab, index) => {
      params.append(TAB_PARAM, tab.url);

      if (tab.pinned) {
        params.append(PINNED_INDEX_PARAM, String(index));
      }

      if (tab.isDirty) {
        params.append(DIRTY_INDEX_PARAM, String(index));
      }
    });

    params.set(ACTIVE_INDEX_PARAM, String(activeTabIndex));
  }

  private buildHistoryState(state: ParsedTabState) {
    const activeTabIndex = Math.max(0, state.tabs.findIndex(tab => tab.id === state.activeTabId));

    return {
      tabs: state.tabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        pinned: tab.pinned,
        isDirty: tab.isDirty
      })),
      activeTabId: state.activeTabId,
      activeTabIndex
    };
  }

  private normalizeHashRoute(route: string): string {
    const normalizedRoute = route.startsWith('#') ? route.slice(1) : route;

    if (!normalizedRoute) {
      return '';
    }

    return normalizedRoute.startsWith('/')
      ? `#${normalizedRoute}`
      : `#/${normalizedRoute.replace(/^\/+/, '')}`;
  }

  private formatFallbackLabel(value: string): string {
    return value
      .split(/[-_]/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

// Singleton instance
export const urlTabSyncEngine = new URLTabSyncEngine();

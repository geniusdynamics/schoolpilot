import { logger } from '@/utils/logging';

/**
 * URL Tab Sync Engine
 * 
 * Core engine that synchronizes tab state with the URL.
 * The URL is the single source of truth - tab state is derived from URL.
 */

import type { Tab, ParsedTabState, TabStateSnapshot } from './types';
import { performanceEventManager } from '@/services/performance';
import { TabStateDeriver } from './TabStateDeriver';
import { routeToTabMapper } from './RouteToTabMapper';

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
    // Listen for browser back/forward — HashRouter uses hashchange, not popstate
    window.addEventListener('popstate', () => this.handleURLChange());
    window.addEventListener('hashchange', () => this.handleURLChange());

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
      // The router owns the hash (HashRouter); the tab list only lives in the
      // outer search. The active tab must follow the routed page, never a
      // stale tab-list index.
      const route = this.extractRoute(urlObj);

      const compactState = this.parseCompactTabState(params);
      if (compactState) {
        return this.reconcileActiveTab(compactState, route);
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
            if (validTabs.length > 0) {
              const requestedActiveId = params.get(LEGACY_ACTIVE_PARAM);
              const activeTabId = requestedActiveId && validTabs.some(tab => tab.id === requestedActiveId)
                ? requestedActiveId
                : validTabs[0].id;
              return this.reconcileActiveTab({ tabs: validTabs, activeTabId }, route);
            }
          }
        } catch (e) {
          logger.warn('Failed to parse tabs from URL:', e);
        }
      }

      // Fallback to session storage
      const stored = this.loadFromStorage();
      if (stored && stored.tabs.length > 0) {
        return this.reconcileActiveTab(stored, route);
      }

      // Default to dashboard
      return this.reconcileActiveTab(this.getDefaultState(), route);
    } catch (error) {
      logger.error('Error parsing URL:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Update URL to reflect tab state
   */
  // Queue pending update if another is in flight instead of dropping
  private pendingState: { state: ParsedTabState; options?: { push?: boolean } } | null = null;

  updateURL(state: ParsedTabState, options?: { push?: boolean }): void {
    if (this.isProcessing) {
      this.pendingState = { state, options };
      return;
    }
    this.isProcessing = true;

    try {
      const sanitizedState = this.sanitizeState(state);
      const finalUrl = this.createURL(sanitizedState);
      const historyState = this.buildHistoryState(sanitizedState);
      // Update browser history
      try {
        if (options?.push) {
          window.history.pushState(historyState, '', finalUrl);
        } else {
          window.history.replaceState(historyState, '', finalUrl);
        }
        performanceEventManager.markDiagnostic('tab_url_updated', {
          mode: options?.push ? 'push' : 'replace',
          tabsCount: sanitizedState.tabs.length,
          activeTabId: sanitizedState.activeTabId
        });
      } catch (historyErr) {
        performanceEventManager.markDiagnostic('tab_url_update_failed', {
          error: historyErr instanceof Error ? historyErr.message : String(historyErr)
        });
        logger.warn('[URLTabSyncEngine] Failed to update browser history:', historyErr);
      }

      // Store in session storage for redundancy
      this.saveToStorage(sanitizedState);

      // Notify subscribers
      this.lastState = sanitizedState;
      this.notifySubscribers(sanitizedState);
    } catch (err) {
      logger.error('Error in updateURL:', err);
    } finally {
      this.isProcessing = false;
      if (this.pendingState) {
        const pending = this.pendingState;
        this.pendingState = null;
        this.updateURL(pending.state, pending.options);
      }
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
    // Tab URLs are route URLs; the id is accepted for callers that address a
    // tab by id but does not change the resulting route.
    void tabId;
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
        logger.error('Error in tab subscriber:', error);
      }
    });
  }

  private validateTabs(tabs: any[]): Tab[] {
    if (!Array.isArray(tabs)) return [];

    const usedIds = new Set<string>();
    const validatedTabs: Tab[] = [];

    for (const t of tabs) {
      if (validatedTabs.length >= MAX_TABS) break;
      if (!t || typeof t !== 'object' || !t.id || !t.url || !t.module) continue;

      const url = String(t.url);
      if (!routeToTabMapper.isKnownAppRoute(url)) {
        logger.warn('[URLTabSyncEngine] Ignoring restored tab url the router cannot render:', url);
        continue;
      }

      const id = this.makeUniqueTabId(String(t.id), usedIds);
      usedIds.add(id);

      validatedTabs.push({
        id,
        url,
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
      });
    }

    return validatedTabs;
  }

  /**
   * Drop tabs whose url the router cannot render and keep the active id real
   */
  private sanitizeState(state: ParsedTabState): ParsedTabState {
    const tabs = state.tabs.filter(tab => routeToTabMapper.isKnownAppRoute(tab.url));
    if (tabs.length === state.tabs.length) {
      return state;
    }

    const activeTabId = tabs.some(tab => tab.id === state.activeTabId)
      ? state.activeTabId
      : tabs[0]?.id || '';

    return { tabs, activeTabId };
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
      logger.info('[URLTabSyncEngine] Saved state to storage. Tabs count:', state.tabs.length, 'Data length:', data.length);
    } catch (error) {
      logger.error('[URLTabSyncEngine] Failed to save tab state to storage:', error);
    }
  }

  private loadFromStorage(): ParsedTabState | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.tabs && parsed.activeTabId) {
          const tabs = this.validateTabs(parsed.tabs);
          if (tabs.length === 0) {
            return null;
          }
          const activeTabId = tabs.some(tab => tab.id === parsed.activeTabId)
            ? String(parsed.activeTabId)
            : tabs[0].id;
          const validated = { tabs, activeTabId };
          logger.info('[URLTabSyncEngine] Loaded state from storage. Tabs count:', validated.tabs.length);
          return validated;
        }
      }
    } catch (error) {
      logger.warn('[URLTabSyncEngine] Failed to load tab state from storage:', error);
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

  /**
   * Extract the routed page from a URL
   *
   * HashRouter keeps the real route in the hash. When a caller passes the
   * router's own pathname + search (as useTabs does), that value is the route.
   */
  private extractRoute(urlObj: URL): string | null {
    if (urlObj.hash && urlObj.hash !== '#') {
      const hashRoute = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.hash;
      if (!hashRoute) {
        return null;
      }
      return hashRoute.startsWith('/') ? hashRoute : `/${hashRoute}`;
    }

    return `${urlObj.pathname}${urlObj.search}` || '/';
  }

  /**
   * Point the active tab at the tab that renders the current route
   */
  private reconcileActiveTab(state: ParsedTabState, route: string | null): ParsedTabState {
    if (!route) {
      return state;
    }

    const routedTab = this.findTabByRoute(state.tabs, route);
    if (!routedTab || routedTab.id === state.activeTabId) {
      return state;
    }

    return { ...state, activeTabId: routedTab.id };
  }

  private findTabByRoute(tabs: Tab[], route: string): Tab | null {
    const target = this.splitRoute(route);
    if (!target) {
      return null;
    }

    const tabRoutes = tabs.map(tab => ({ tab, route: this.splitRoute(tab.url) }));

    // Prefer an exact path + query match (hub sub-tab state included)
    const exact = tabRoutes.find(entry =>
      entry.route?.pathname === target.pathname && entry.route?.search === target.search
    );
    if (exact) {
      return exact.tab;
    }

    // A hub tab owns all of its sub-tab queries
    const byPathname = tabRoutes.find(entry => entry.route?.pathname === target.pathname);
    return byPathname ? byPathname.tab : null;
  }

  private splitRoute(route: string): { pathname: string; search: string } | null {
    if (!route || typeof route !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(route, window.location.origin);
      const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
      return { pathname: pathname.toLowerCase(), search: parsed.search };
    } catch (error) {
      logger.warn('[URLTabSyncEngine] Ignoring malformed route:', route, error);
      return null;
    }
  }

  private parseCompactTabState(params: URLSearchParams): ParsedTabState | null {
    // Workspace tabs are route paths. A bare `tab=` value is a hub sub-tab id
    // (`bulk-streams`, `school-periods`) and belongs to the route, not the tab
    // strip — coercing it into "/bulk-streams" creates a 404 tab. Validation
    // happens after URL resolution in restoreCompactTabs.
    const tabUrls = params.getAll(TAB_PARAM);

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
    const usedIds = new Set<string>();

    return tabUrls
      .map(url => this.normalizeTabUrl(url))
      .filter((url): url is string => url !== null)
      .slice(0, MAX_TABS)
      .map((url, index) => {
        const occurrence = (seenUrls.get(url) || 0) + 1;
        seenUrls.set(url, occurrence);

        const derivedTab = this.deriver.deriveTab(url);
        const id = this.makeUniqueTabId(this.buildRestoredTabId(derivedTab, occurrence), usedIds);
        usedIds.add(id);

        return {
          ...derivedTab,
          id,
          pinned: pinnedIndices.has(index) || derivedTab.pinned,
          isDirty: dirtyIndices.has(index)
        };
      });
  }

  private normalizeTabUrl(url: string): string | null {
    if (!routeToTabMapper.isTabRoutePath(url)) {
      logger.warn('[URLTabSyncEngine] Ignoring tab url that is not an app route:', url);
      return null;
    }

    try {
      const parsed = new URL(url, window.location.origin);
      const normalized = `${parsed.pathname}${parsed.search}`;

      // Shape alone is not enough: resolve the url first so dot segments such
      // as /dashboard/../bulk-streams cannot smuggle in a 404 route.
      if (!routeToTabMapper.isKnownAppRoute(normalized)) {
        logger.warn('[URLTabSyncEngine] Ignoring tab url the router cannot render:', url);
        return null;
      }

      return normalized;
    } catch (error) {
      logger.warn('[URLTabSyncEngine] Failed to normalize tab url:', url, error);
      return null;
    }
  }

  private makeUniqueTabId(baseId: string, usedIds: Set<string>): string {
    if (!usedIds.has(baseId)) {
      return baseId;
    }

    let suffix = 2;
    while (usedIds.has(`${baseId}-${suffix}`)) {
      suffix += 1;
    }
    return `${baseId}-${suffix}`;
  }

  createURL(state: ParsedTabState, hashRoute?: string): string {
    const url = new URL(window.location.href);
    const activeTabIndex = Math.max(0, state.tabs.findIndex(tab => tab.id === state.activeTabId));

    // Routes live in the hash (HashRouter), so any real pathname (e.g. a direct
    // hit on /login) is stale noise — pin it to the app base for clean URLs.
    url.pathname = import.meta.env.BASE_URL || '/';

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

/**
 * URL Tab Sync Engine
 * 
 * Core engine that synchronizes tab state with the URL.
 * The URL is the single source of truth - tab state is derived from URL.
 */

import type { Tab, ParsedTabState, TabStateSnapshot } from './types';

const STORAGE_KEY = 'sp_tabs_v2';
const MAX_TABS = 20;

export class URLTabSyncEngine {
  private subscribers: Set<(state: ParsedTabState) => void> = new Set();
  private lastState: ParsedTabState | null = null;
  private isProcessing = false;

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

      // Try to get tabs from URL first
      const tabsParam = params.get('tabs');
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
            const activeTabId = params.get('active') || validTabs[0]?.id;
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
      const url = new URL(window.location.href);

      // Serialize tabs (only essential data to keep URL size reasonable)
      const minimalTabs = state.tabs.map(t => ({
        id: t.id,
        url: t.url,
        title: t.title,
        module: t.module,
        entity: t.entity,
        entityId: t.entityId,
        isDirty: t.isDirty,
        pinned: t.pinned,
        icon: t.icon
      }));

      const tabsParam = JSON.stringify(minimalTabs);
      url.searchParams.set('tabs', tabsParam);
      url.searchParams.set('active', state.activeTabId);

      // Check URL length to avoid exceeding browser limits (typically 2048 chars)
      // If it's too long, we'll just omit the tabs from the URL and rely on sessionStorage
      const urlString = url.toString();
      const finalUrl = urlString.length > 2000 ? window.location.pathname + window.location.search : urlString;

      // Update browser history
      try {
        if (options?.push) {
          window.history.pushState({ tabs: minimalTabs, active: state.activeTabId }, '', finalUrl);
        } else {
          window.history.replaceState({ tabs: minimalTabs, active: state.activeTabId }, '', finalUrl);
        }
      } catch (historyErr) {
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
      const urlObj = new URL(url);
      return urlObj.searchParams.get('active');
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
      icon: 'HomeIcon'
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
}

// Singleton instance
export const urlTabSyncEngine = new URLTabSyncEngine();

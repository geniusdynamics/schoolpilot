import { logger } from '@/utils/logging';

/**
 * TabStateManager - Enhanced tab state management for SchoolPilot3
 * Handles complex tab state logic, module dashboard detection, and platform-aware tab management
 */

import { Tab } from '@/types/tabbedWorkspace';

export interface TabStateConfig {
  maxTabs: number;
  enablePersistence: boolean;
  enableTabGroups: boolean;
  defaultTabBehavior: 'tab' | 'navigate' | 'modal';
  platformAdaptation: boolean;
  moduleDefaults: {
    dashboardCanClose: boolean;
    dashboardPinned: boolean;
    pageCanClose: boolean;
    pagePinned: boolean;
  };
}

export interface NavigationItem {
  module: any;
  child?: any;
}

export interface TabCreationResult {
  tabId: string | null;
  action: 'created' | 'activated' | 'error';
  message?: string;
}

export class TabStateManager {
  private config: TabStateConfig;
  private store: any; // Reference to TabStore
  private platformInfo: { platform: 'web' | 'desktop' | 'mobile'; touchDevice: boolean } | null = null;
  
  constructor(config: TabStateConfig) {
    this.config = {
      maxTabs: 15,
      enablePersistence: true,
      enableTabGroups: false,
      defaultTabBehavior: 'tab',
      platformAdaptation: true,
      moduleDefaults: {
        dashboardCanClose: false,  // Module dashboards cannot be closed
        dashboardPinned: true,     // Module dashboards are pinned
        pageCanClose: true,        // Pages can be closed
        pagePinned: false          // Pages are not pinned by default
      },
      ...config
    };
  }
  
  /**
   * Set reference to the tab store
   */
  setStore(store: any): void {
    this.store = store;
  }
  
  /**
   * Set platform information for adaptive behavior
   */
  setPlatformInfo(platformInfo: { platform: 'web' | 'desktop' | 'mobile'; touchDevice: boolean }): void {
    this.platformInfo = platformInfo;
    if (this.config.platformAdaptation) {
      this.adaptConfigForPlatform(platformInfo.platform);
    }
  }
  
  /**
   * Enhanced module tab creation with proper dashboard detection
   */
  async createModuleTab(navigationItem: NavigationItem, location: Location): Promise<TabCreationResult> {
    if (!this.store) {
      return { tabId: null, action: 'error', message: 'TabStore not initialized' };
    }
    
    try {
      const { module, child } = navigationItem;
      const moduleId = this.extractModuleId(module.name);
      
      // Check if tab already exists for this path
      const existingTab = this.store.tabs.find((tab: Tab) => tab.path === location.pathname);
      if (existingTab) {
        await this.store.activateTab(existingTab.id);
        logger.info('âœ… [TabStateManager] Activated existing tab:', existingTab.id);
        return { tabId: existingTab.id, action: 'activated' };
      }
      
      // Determine if this is a module dashboard
      const isModuleDashboard = !child;
      const tabTitle = this.generateTabTitle(module, child, isModuleDashboard);
      
      // Apply module defaults based on whether this is a dashboard or page
      const tabConfig = {
        title: tabTitle,
        module: moduleId,
        path: location.pathname,
        content: {
          type: 'component',
          component: 'DynamicPageComponent'
        },
        permissions: [],
        canClose: isModuleDashboard ? this.config.moduleDefaults.dashboardCanClose : this.config.moduleDefaults.pageCanClose,
        pinned: isModuleDashboard ? this.config.moduleDefaults.dashboardPinned : this.config.moduleDefaults.pagePinned,
        metadata: {
          moduleContext: moduleId,
          isModuleDashboard,
          navigationItem: module,
          childNavigationItem: child,
          createdAt: Date.now(),
          platform: this.platformInfo?.platform || 'web'
        }
      };
      
      logger.info('ðŸ” [TabStateManager] Creating tab:', {
        title: tabTitle,
        isModuleDashboard,
        canClose: tabConfig.canClose,
        pinned: tabConfig.pinned,
        path: location.pathname
      });
      
      // Perform cleanup if needed before creating new tab
      await this.performTabCleanup();
      
      const newTabId = await this.store.createTab(tabConfig);
      logger.info('âœ… [TabStateManager] Created new tab:', newTabId);
      
      return { tabId: newTabId, action: 'created' };
      
    } catch (error) {
      logger.error('âŒ [TabStateManager] Error creating tab:', error);
      return { 
        tabId: null, 
        action: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate proper tab titles for modules and pages
   */
  generateTabTitle(module: any, child: any, isModuleDashboard: boolean): string {
    if (child) {
      // For child pages, use the child name
      const childName = child.name || child.title || 'Page';
      // Clean up translation keys
      if (childName.startsWith('navigation:')) {
        const cleanName = childName
          .replace('navigation:', '')
          .replace(/\./g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim();
        return this.capitalizeWords(cleanName);
      }
      return childName;
    }
    
    if (isModuleDashboard) {
      // For module dashboards, clean up the module name
      if (module.displayName) return module.displayName;
      if (module.title) return module.title;
      
      let moduleName = module.name || 'Dashboard';
      
      // Clean module name from navigation format
      if (moduleName.startsWith('navigation:')) {
        moduleName = moduleName
          .replace('navigation:', '')
          .replace('.title', '')
          .replace(/\./g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim();
      }
      
      return this.capitalizeWords(moduleName);
    }
    
    return 'Dashboard';
  }
  
  /**
   * Platform-aware tab management adaptation
   */
  adaptConfigForPlatform(platform: 'web' | 'desktop' | 'mobile'): void {
    switch (platform) {
      case 'mobile':
        this.config.maxTabs = 5;
        this.config.defaultTabBehavior = 'navigate';
        // On mobile, more aggressive tab cleanup
        break;
      case 'desktop':
        this.config.maxTabs = 20;
        this.config.defaultTabBehavior = 'tab';
        // Desktop can handle more tabs
        break;
      case 'web':
        this.config.maxTabs = 15;
        this.config.defaultTabBehavior = 'tab';
        // Balanced configuration for web
        break;
    }
    
    logger.info(`ðŸ”§ [TabStateManager] Adapted configuration for ${platform}:`, {
      maxTabs: this.config.maxTabs,
      defaultTabBehavior: this.config.defaultTabBehavior
    });
  }
  
  /**
   * Enhanced tab cleanup with intelligent priority
   */
  async performTabCleanup(): Promise<void> {
    if (!this.store) return;
    
    const tabs = this.store.tabs;
    const now = Date.now();
    
    // Don't cleanup if we're not over the limit
    if (tabs.length <= this.config.maxTabs) {
      return;
    }
    
    logger.info(`ðŸ§¹ [TabStateManager] Performing tab cleanup - ${tabs.length}/${this.config.maxTabs} tabs`);
    
    // Find tabs that can be closed (not pinned, not module dashboards)
    const closeableTabs = tabs.filter((tab: Tab) => 
      tab.canClose !== false && 
      !tab.pinned &&
      !tab.metadata?.isModuleDashboard
    );
    
    if (closeableTabs.length === 0) {
      logger.info('âš ï¸ [TabStateManager] No closeable tabs found for cleanup');
      return;
    }
    
    // Sort by last accessed time (oldest first)
    const sortedTabs = closeableTabs.sort((a: Tab, b: Tab) => 
      (a.lastAccessed || 0) - (b.lastAccessed || 0)
    );
    
    // Calculate how many tabs to close
    const tabsToClose = Math.min(
      sortedTabs.length,
      tabs.length - this.config.maxTabs + 1 // +1 for the new tab we're about to create
    );
    
    // Close the oldest tabs
    for (let i = 0; i < tabsToClose; i++) {
      const tabToClose = sortedTabs[i];
      logger.info(`ðŸ—‘ï¸ [TabStateManager] Closing inactive tab: ${tabToClose.title}`);
      await this.store.closeTab(tabToClose.id);
    }
    
    logger.info(`âœ… [TabStateManager] Cleanup complete - closed ${tabsToClose} tabs`);
  }
  
  /**
   * Get current configuration
   */
  getConfig(): TabStateConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TabStateConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('ðŸ”§ [TabStateManager] Configuration updated:', updates);
  }
  
  /**
   * Get tab statistics
   */
  getTabStatistics(): {
    totalTabs: number;
    pinnedTabs: number;
    moduleDashboards: number;
    pages: number;
    closeableTabs: number;
  } {
    if (!this.store) {
      return { totalTabs: 0, pinnedTabs: 0, moduleDashboards: 0, pages: 0, closeableTabs: 0 };
    }
    
    const tabs = this.store.tabs;
    const pinnedTabs = tabs.filter((tab: Tab) => tab.pinned).length;
    const moduleDashboards = tabs.filter((tab: Tab) => tab.metadata?.isModuleDashboard).length;
    const closeableTabs = tabs.filter((tab: Tab) => tab.canClose !== false).length;
    
    return {
      totalTabs: tabs.length,
      pinnedTabs,
      moduleDashboards,
      pages: tabs.length - moduleDashboards,
      closeableTabs
    };
  }
  
  /**
   * Helper method to extract module ID from module name
   */
  private extractModuleId(moduleName: string): string {
    if (!moduleName) return 'unknown';
    
    return moduleName
      .replace('navigation:', '')
      .replace('.title', '')
      .replace(/\./g, '-')
      .toLowerCase();
  }
  
  /**
   * Helper method to capitalize words
   */
  private capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }
  
  /**
   * Validate tab configuration
   */
  validateTabConfig(tabConfig: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!tabConfig.title) {
      errors.push('Tab title is required');
    }
    
    if (!tabConfig.module) {
      errors.push('Tab module is required');
    }
    
    if (!tabConfig.path) {
      errors.push('Tab path is required');
    }
    
    if (typeof tabConfig.canClose !== 'boolean') {
      errors.push('Tab canClose must be a boolean');
    }
    
    if (typeof tabConfig.pinned !== 'boolean') {
      errors.push('Tab pinned must be a boolean');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Default configuration
export const defaultTabStateConfig: TabStateConfig = {
  maxTabs: 15,
  enablePersistence: true,
  enableTabGroups: false,
  defaultTabBehavior: 'tab',
  platformAdaptation: true,
  moduleDefaults: {
    dashboardCanClose: false,
    dashboardPinned: true,
    pageCanClose: true,
    pagePinned: false
  }
};
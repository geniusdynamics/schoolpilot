import { logger } from '@/utils/logging';

/**
 * TabPerformanceManager - Performance optimization for SchoolPilot3 tabs
 * Handles content caching, lazy loading, memory management, and performance monitoring
 */

import React from 'react';

export interface TabPerformanceConfig {
  tabMemory: {
    maxActiveTabs: number;
    inactiveTabTimeout: number;
    memoryThreshold: number;
    virtualizeContent: boolean;
    enableGarbageCollection: boolean;
  };
  rendering: {
    lazyLoadTabs: boolean;
    preloadAdjacent: boolean;
    memoizeTabContent: boolean;
    debounceTabSwitch: number;
    enableVirtualization: boolean;
  };
  animations: {
    respectReducedMotion: boolean;
    tabSwitchDuration: number;
    useGPUAcceleration: boolean;
    animationFrameOptimization: boolean;
  };
  monitoring: {
    enablePerformanceLogging: boolean;
    trackMemoryUsage: boolean;
    measureTabSwitchTime: boolean;
    alertSlowOperations: boolean;
    slowOperationThreshold: number;
  };
}

export interface TabContentCache {
  content: React.ReactNode;
  timestamp: number;
  lastAccessed: number;
  memorySize: number;
  isActive: boolean;
}

export interface TabPerformanceMetrics {
  tabSwitchTimes: Map<string, number>;
  memoryUsage: Map<string, number>;
  contentLoadTimes: Map<string, number>;
  totalTabs: number;
  activeTabs: number;
  cachedTabs: number;
  averageSwitchTime: number;
  peakMemoryUsage: number;
}

export interface TabContentInfo {
  id: string;
  title: string;
  module: string;
  path: string;
  isActive: boolean;
  canClose: boolean;
  lastAccessed?: number;
  metadata?: any;
}

export class TabPerformanceManager {
  private config: TabPerformanceConfig;
  private contentCache = new Map<string, TabContentCache>();
  private memoryUsage = new Map<string, number>();
  private inactiveTabTimers = new Map<string, NodeJS.Timeout>();
  private performanceMetrics: TabPerformanceMetrics;
  private animationFrameId: number | null = null;
  private switchingInProgress = false;

  /**
   * Safe high-resolution timestamp that falls back to Date.now() when the
   * Performance API is unavailable
   */
  private nowMs(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  constructor(config: TabPerformanceConfig) {
    // Merge section-by-section so each manager owns its own nested config
    // objects (a shallow spread would share references with the caller's
    // config object, e.g. defaultTabPerformanceConfig, and let one manager's
    // updateConfig mutate the defaults for every other manager)
    this.config = {
      tabMemory: {
        maxActiveTabs: 10,
        inactiveTabTimeout: 30 * 60 * 1000, // 30 minutes
        memoryThreshold: 100 * 1024 * 1024, // 100MB
        virtualizeContent: true,
        enableGarbageCollection: true,
        ...config?.tabMemory
      },
      rendering: {
        lazyLoadTabs: true,
        preloadAdjacent: true,
        memoizeTabContent: true,
        debounceTabSwitch: 100,
        enableVirtualization: true,
        ...config?.rendering
      },
      animations: {
        respectReducedMotion: true,
        tabSwitchDuration: 250,
        useGPUAcceleration: true,
        animationFrameOptimization: true,
        ...config?.animations
      },
      monitoring: {
        enablePerformanceLogging: process.env.NODE_ENV === 'development',
        trackMemoryUsage: true,
        measureTabSwitchTime: true,
        alertSlowOperations: true,
        slowOperationThreshold: 500, // 500ms
        ...config?.monitoring
      }
    };
    
    this.performanceMetrics = {
      tabSwitchTimes: new Map(),
      memoryUsage: new Map(),
      contentLoadTimes: new Map(),
      totalTabs: 0,
      activeTabs: 0,
      cachedTabs: 0,
      averageSwitchTime: 0,
      peakMemoryUsage: 0
    };
    
    // Initialize performance monitoring
    if (this.config.monitoring.trackMemoryUsage) {
      this.startMemoryMonitoring();
    }
    
    // Check for reduced motion preference
    if (this.config.animations.respectReducedMotion) {
      this.detectReducedMotionPreference();
    }
  }
  
  /**
   * Intelligent tab content loading with caching and lazy loading
   */
  loadTabContent(tabInfo: TabContentInfo, forceReload = false): React.ReactNode {
    const { id, isActive } = tabInfo;
    const startTime = this.nowMs();
    
    try {
      // Check cache first
      if (!forceReload && this.contentCache.has(id)) {
        const cached = this.contentCache.get(id)!;
        cached.lastAccessed = Date.now();
        cached.isActive = isActive;
        
        this.logPerformance('Content cache hit', id, this.nowMs() - startTime);
        return cached.content;
      }
      
      // For inactive tabs, only load if configured or if it's being preloaded
      if (!isActive && this.config.rendering.lazyLoadTabs) {
        const placeholder = this.createTabContentPlaceholder(tabInfo);
        this.logPerformance('Lazy loading placeholder', id, this.nowMs() - startTime);
        return placeholder;
      }
      
      // Load and cache content
      const content = this.renderTabContent(tabInfo);
      
      if (this.config.rendering.memoizeTabContent) {
        this.cacheTabContent(id, content, isActive);
      }
      
      // Track content load time
      const loadTime = this.nowMs() - startTime;
      this.performanceMetrics.contentLoadTimes.set(id, loadTime);
      
      this.logPerformance('Content loaded and cached', id, loadTime);
      return content;
      
    } catch (error) {
      logger.error(`❌ [TabPerformanceManager] Error loading content for tab ${id}:`, error);
      return this.createErrorContent(tabInfo, error);
    }
  }
  
  /**
   * Optimized tab switching with performance monitoring
   */
  async switchTab(fromTabId: string | null, toTabId: string, tabInfo: TabContentInfo): Promise<void> {
    if (this.switchingInProgress) {
      logger.warn('⚠️ [TabPerformanceManager] Tab switch already in progress, ignoring');
      return;
    }
    
    this.switchingInProgress = true;
    const startTime = this.nowMs();
    
    try {
      // Debounce rapid tab switching
      if (this.config.rendering.debounceTabSwitch > 0) {
        await this.debounceOperation('switch', this.config.rendering.debounceTabSwitch);
      }
      
      // Update tab states
      if (fromTabId) {
        this.markTabInactive(fromTabId);
      }
      this.markTabActive(toTabId, tabInfo);
      
      // Preload adjacent tabs if configured
      if (this.config.rendering.preloadAdjacent) {
        this.preloadAdjacentTabs(toTabId);
      }
      
      // Perform cleanup if needed
      await this.performMemoryCleanup();
      
      // Record performance metrics
      const switchTime = this.nowMs() - startTime;
      this.performanceMetrics.tabSwitchTimes.set(toTabId, switchTime);
      this.updateAverageSwitchTime();
      
      // Alert if operation is slow
      if (this.config.monitoring.alertSlowOperations && 
          switchTime > this.config.monitoring.slowOperationThreshold) {
        logger.warn(`🐌 [TabPerformanceManager] Slow tab switch detected: ${switchTime}ms for tab ${toTabId}`);
      }
      
      this.logPerformance('Tab switch completed', toTabId, switchTime);
      
    } finally {
      this.switchingInProgress = false;
    }
  }
  
  /**
   * Memory management and inactive tab cleanup
   */
  async performMemoryCleanup(): Promise<void> {
    const startTime = this.nowMs();
    
    try {
      // Check memory threshold
      const totalMemoryUsage = this.getTotalMemoryUsage();
      
      if (totalMemoryUsage > this.config.tabMemory.memoryThreshold) {
        logger.info(`🧹 [TabPerformanceManager] Memory threshold exceeded (${totalMemoryUsage} bytes), performing cleanup`);
        
        // Find inactive tabs to cleanup
        const inactiveTabs = Array.from(this.contentCache.entries())
          .filter(([id, cache]) => !cache.isActive)
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        
        // Clean up oldest inactive tabs
        const tabsToClean = Math.min(inactiveTabs.length, Math.floor(inactiveTabs.length * 0.3));
        
        for (let i = 0; i < tabsToClean; i++) {
          const [tabId] = inactiveTabs[i];
          this.unloadTabContent(tabId);
        }
        
        // Force garbage collection if available and enabled
        if (this.config.tabMemory.enableGarbageCollection && 'gc' in window) {
          (window as any).gc();
        }
        
        logger.info(`✅ [TabPerformanceManager] Cleaned up ${tabsToClean} inactive tabs`);
      }
      
      this.logPerformance('Memory cleanup completed', 'system', this.nowMs() - startTime);
      
    } catch (error) {
      logger.error('❌ [TabPerformanceManager] Error during memory cleanup:', error);
    }
  }
  
  /**
   * Schedule tab cleanup after inactivity
   */
  scheduleTabCleanup(tabId: string): void {
    // Clear existing timer
    const existingTimer = this.inactiveTabTimers.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule cleanup
    const timer = setTimeout(() => {
      this.unloadTabContent(tabId);
      this.inactiveTabTimers.delete(tabId);
      logger.info(`🗑️ [TabPerformanceManager] Cleaned up inactive tab: ${tabId}`);
    }, this.config.tabMemory.inactiveTabTimeout);
    
    this.inactiveTabTimers.set(tabId, timer);
  }
  
  /**
   * Preload adjacent tabs for faster switching
   */
  private preloadAdjacentTabs(currentTabId: string): void {
    // This would be implemented based on the tab order in the actual tab store
    logger.info(`🔄 [TabPerformanceManager] Preloading adjacent tabs for: ${currentTabId}`);
  }
  
  /**
   * Cache tab content with memory tracking
   */
  private cacheTabContent(tabId: string, content: React.ReactNode, isActive: boolean): void {
    const timestamp = Date.now();
    const memorySize = this.estimateContentSize(content);
    
    this.contentCache.set(tabId, {
      content,
      timestamp,
      lastAccessed: timestamp,
      memorySize,
      isActive
    });
    
    this.memoryUsage.set(tabId, memorySize);
    this.updateMetrics();
  }
  
  /**
   * Unload tab content and free memory
   */
  private unloadTabContent(tabId: string): void {
    this.contentCache.delete(tabId);
    this.memoryUsage.delete(tabId);
    
    // Clear any pending timers
    const timer = this.inactiveTabTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.inactiveTabTimers.delete(tabId);
    }
    
    this.updateMetrics();
  }
  
  /**
   * Mark tab as active
   */
  private markTabActive(tabId: string, tabInfo: TabContentInfo): void {
    const cached = this.contentCache.get(tabId);
    if (cached) {
      cached.isActive = true;
      cached.lastAccessed = Date.now();
    }
    
    // Cancel cleanup timer
    const timer = this.inactiveTabTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.inactiveTabTimers.delete(tabId);
    }
  }
  
  /**
   * Mark tab as inactive and schedule cleanup
   */
  private markTabInactive(tabId: string): void {
    const cached = this.contentCache.get(tabId);
    if (cached) {
      cached.isActive = false;
      cached.lastAccessed = Date.now();
    }
    
    // Schedule cleanup
    this.scheduleTabCleanup(tabId);
  }
  
  /**
   * Create placeholder content for lazy loading
   */
  private createTabContentPlaceholder(tabInfo: TabContentInfo): React.ReactNode {
    return React.createElement('div', {
      className: 'flex items-center justify-center h-full bg-surface-muted',
      children: React.createElement('div', {
        className: 'text-center',
        children: [
          React.createElement('div', {
            key: 'spinner',
            className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4'
          }),
          React.createElement('p', {
            key: 'text',
            className: 'text-surface-muted-fg',
            children: `Loading ${tabInfo.title}...`
          })
        ]
      })
    });
  }
  
  /**
   * Create error content for failed loads
   */
  private createErrorContent(tabInfo: TabContentInfo, error: any): React.ReactNode {
    return React.createElement('div', {
      className: 'flex items-center justify-center h-full bg-red-50',
      children: React.createElement('div', {
        className: 'text-center max-w-md',
        children: [
          React.createElement('div', {
            key: 'icon',
            className: 'text-red-500 text-4xl mb-4',
            children: '⚠️'
          }),
          React.createElement('h3', {
            key: 'title',
            className: 'text-lg font-semibold text-red-800 mb-2',
            children: 'Failed to Load Content'
          }),
          React.createElement('p', {
            key: 'message',
            className: 'text-red-600 mb-4',
            children: `Unable to load content for ${tabInfo.title}`
          }),
          React.createElement('button', {
            key: 'retry',
            className: 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700',
            onClick: () => this.loadTabContent(tabInfo, true),
            children: 'Retry'
          })
        ]
      })
    });
  }
  
  /**
   * Render tab content (placeholder implementation)
   */
  private renderTabContent(tabInfo: TabContentInfo): React.ReactNode {
    // This would integrate with the actual page component system
    return React.createElement('div', {
      className: 'h-full w-full p-4',
      children: `Content for ${tabInfo.title} (${tabInfo.module})`
    });
  }
  
  /**
   * Estimate content memory size (simplified)
   */
  private estimateContentSize(content: React.ReactNode): number {
    // Simplified estimation - in real implementation this would be more sophisticated
    const contentString = JSON.stringify(content);
    return contentString.length * 2; // Rough estimate for UTF-16
  }
  
  /**
   * Get total memory usage
   */
  private getTotalMemoryUsage(): number {
    return Array.from(this.memoryUsage.values()).reduce((total, size) => total + size, 0);
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    this.performanceMetrics.totalTabs = this.contentCache.size;
    this.performanceMetrics.activeTabs = Array.from(this.contentCache.values())
      .filter(cache => cache.isActive).length;
    this.performanceMetrics.cachedTabs = this.contentCache.size;
    
    const totalMemory = this.getTotalMemoryUsage();
    if (totalMemory > this.performanceMetrics.peakMemoryUsage) {
      this.performanceMetrics.peakMemoryUsage = totalMemory;
    }
  }
  
  /**
   * Update average switch time
   */
  private updateAverageSwitchTime(): void {
    const times = Array.from(this.performanceMetrics.tabSwitchTimes.values());
    this.performanceMetrics.averageSwitchTime = times.length > 0 
      ? times.reduce((sum, time) => sum + time, 0) / times.length 
      : 0;
  }
  
  /**
   * Debounce operation to prevent rapid calls
   */
  private debounceOperation(operation: string, delay: number): Promise<void> {
    return new Promise(resolve => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      this.animationFrameId = requestAnimationFrame(() => {
        setTimeout(() => {
          resolve();
        }, delay);
      });
    });
  }
  
  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize;
        
        if (usage > this.performanceMetrics.peakMemoryUsage) {
          this.performanceMetrics.peakMemoryUsage = usage;
        }
        
        // Alert if memory usage is high
        if (usage > this.config.tabMemory.memoryThreshold * 0.8) {
          logger.warn(`⚠️ [TabPerformanceManager] High memory usage detected: ${(usage / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 10000); // Check every 10 seconds
    }
  }
  
  /**
   * Detect reduced motion preference
   */
  private detectReducedMotionPreference(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (mediaQuery.matches) {
      this.config.animations.tabSwitchDuration = 0;
      this.config.animations.useGPUAcceleration = false;
      logger.info('🎯 [TabPerformanceManager] Reduced motion preference detected');
    }
  }
  
  /**
   * Performance logging
   */
  private logPerformance(operation: string, tabId: string, duration: number): void {
    if (this.config.monitoring.enablePerformanceLogging) {
      logger.info(`⚡ [TabPerformanceManager] ${operation} for ${tabId}: ${duration.toFixed(2)}ms`);
    }
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): TabPerformanceMetrics {
    this.updateMetrics();
    return { ...this.performanceMetrics };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): TabPerformanceConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TabPerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('🔧 [TabPerformanceManager] Configuration updated:', updates);
  }
  
  /**
   * Clear all cached content
   */
  clearCache(): void {
    this.contentCache.clear();
    this.memoryUsage.clear();
    
    // Clear all timers
    this.inactiveTabTimers.forEach(timer => clearTimeout(timer));
    this.inactiveTabTimers.clear();
    
    this.updateMetrics();
    logger.info('🧹 [TabPerformanceManager] All cached content cleared');
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearCache();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    logger.info('🧹 [TabPerformanceManager] Cleanup completed');
  }
}

// Default performance configuration
export const defaultTabPerformanceConfig: TabPerformanceConfig = {
  tabMemory: {
    maxActiveTabs: 10,
    inactiveTabTimeout: 30 * 60 * 1000, // 30 minutes
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    virtualizeContent: true,
    enableGarbageCollection: true
  },
  rendering: {
    lazyLoadTabs: true,
    preloadAdjacent: true,
    memoizeTabContent: true,
    debounceTabSwitch: 100,
    enableVirtualization: true
  },
  animations: {
    respectReducedMotion: true,
    tabSwitchDuration: 250,
    useGPUAcceleration: true,
    animationFrameOptimization: true
  },
  monitoring: {
    enablePerformanceLogging: process.env.NODE_ENV === 'development',
    trackMemoryUsage: true,
    measureTabSwitchTime: true,
    alertSlowOperations: true,
    slowOperationThreshold: 500
  }
};
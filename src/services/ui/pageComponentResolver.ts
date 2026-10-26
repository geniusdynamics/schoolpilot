import { logger } from '@/utils/logging';

// ABOUTME: Enhanced page component resolver with multiple fallback strategies
// ABOUTME: Provides robust component resolution with health monitoring integration

import React from 'react';
import { pageHealthMonitor } from '../performance/pageHealthMonitor';

// Explicit page imports for critical pages to ensure correct resolution
// This fixes the issue where settings pages were all resolving to AuditLogPage
// import DatabaseSettingsPage from '@/modules/settings/pages/DatabaseSettingsPage';
// import DataManagementSettingsPage from '@/modules/settings/pages/DataManagementSettingsPage';
// import BackupSettingsPage from '@/modules/settings/pages/BackupSettingsPage';
import DataLayerSettingsPage from '@/modules/settings/pages/DataLayerSettingsPage';
import AuditLogPage from '@/modules/settings/pages/AuditLogPage';
import PluginSettingsPage from '@/modules/settings/pages/PluginSettingsPage';

// Explicit page mapping
const explicitPageMapping: Record<string, React.ComponentType> = {
  // 'DatabaseSettingsPage': DatabaseSettingsPage,
  // 'DataManagementSettingsPage': DataManagementSettingsPage,
  // 'BackupSettingsPage': BackupSettingsPage,
  'DataLayerSettingsPage': DataLayerSettingsPage,
  'AuditLogPage': AuditLogPage,
  'PluginSettingsPage': PluginSettingsPage,
};

interface PageResolutionStrategy {
  name: string;
  resolve: (nav: any) => Promise<React.ComponentType | null>;
  priority: number;
}

interface PageResolutionResult {
  component: React.ComponentType | null;
  strategy: string;
  loadTime: number;
  fromCache: boolean;
  error?: Error;
}

interface PageResolutionCache {
  component: React.ComponentType;
  strategy: string;
  timestamp: Date;
  accessCount: number;
}

class PageComponentResolver {
  private cache = new Map<string, PageResolutionCache>();
  private strategies: PageResolutionStrategy[] = [];
  private maxCacheSize = 50;
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.initializeStrategies();
  }

  // Initialize resolution strategies in order of priority
  private initializeStrategies() {
    this.strategies = [
      {
        name: 'explicit-mapping',
        priority: 0, // Highest priority - check explicit mappings first
        resolve: this.resolveByExplicitMapping.bind(this)
      },
      {
        name: 'modular-path',
        priority: 1,
        resolve: this.resolveByModularPath.bind(this)
      },
      {
        name: 'legacy-path',
        priority: 2,
        resolve: this.resolveByLegacyPath.bind(this)
      },
      {
        name: 'fallback-path',
        priority: 3,
        resolve: this.resolveByFallbackPath.bind(this)
      },
      {
        name: 'dynamic-import',
        priority: 4,
        resolve: this.resolveByDynamicImport.bind(this)
      }
    ].sort((a, b) => a.priority - b.priority);
  }

  // Strategy 0: Resolve by explicit mapping (highest priority)
  private async resolveByExplicitMapping(nav: any): Promise<React.ComponentType | null> {
    if (!nav.page) return null;
    
    logger.info(`🔍 [PageComponentResolver] Trying explicit mapping for: ${nav.page}`);
    
    const mappedComponent = explicitPageMapping[nav.page];
    if (mappedComponent) {
      logger.info(`✅ [PageComponentResolver] Found explicit mapping for: ${nav.page}`);
      return mappedComponent;
    }
    
    logger.info(`❌ [PageComponentResolver] No explicit mapping found for: ${nav.page}`);
    return null;
  }

  // Main resolution method with caching and health monitoring
  async resolvePageComponent(nav: any): Promise<PageResolutionResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(nav);
    const pageName = nav.name || nav.page || nav.path;

    // Check cache first
    const cached = this.getCachedComponent(cacheKey);
    if (cached) {
      const loadTime = Date.now() - startTime;
      pageHealthMonitor.recordSuccess(pageName, loadTime);
      
      return {
        component: cached.component,
        strategy: cached.strategy,
        loadTime,
        fromCache: true
      };
    }

    // Try each strategy in order
    for (const strategy of this.strategies) {
      try {
        logger.info(`🔍 [PageComponentResolver] Trying strategy: ${strategy.name} for ${pageName}`);
        
        const component = await strategy.resolve(nav);
        if (component) {
          const loadTime = Date.now() - startTime;
          
          // Cache the successful result
          this.cacheComponent(cacheKey, component, strategy.name);
          
          // Record success in health monitor
          pageHealthMonitor.recordSuccess(pageName, loadTime);
          
          logger.info(`✅ [PageComponentResolver] Successfully resolved ${pageName} using ${strategy.name}`);
          
          return {
            component,
            strategy: strategy.name,
            loadTime,
            fromCache: false
          };
        }
      } catch (error) {
        logger.warn(`❌ [PageComponentResolver] Strategy ${strategy.name} failed for ${pageName}:`, error);
        
        // Continue to next strategy instead of failing immediately
        continue;
      }
    }

    // All strategies failed
    const loadTime = Date.now() - startTime;
    const error = new Error(`Failed to resolve page component for ${pageName} using all available strategies`);
    
    pageHealthMonitor.recordError(pageName, error, loadTime);
    
    return {
      component: null,
      strategy: 'none',
      loadTime,
      fromCache: false,
      error
    };
  }

  // Strategy 1: Resolve by modular path (src/modules/<module>/pages/<PageName>.tsx)
  private async resolveByModularPath(nav: any): Promise<React.ComponentType | null> {
    if (!nav.page) return null;

    const pathSegments = nav.path.split('/').filter(Boolean);
    if (pathSegments.length === 0) return null;

    const moduleDir = pathSegments[0];
    const modularPath = `../modules/${moduleDir}/pages/${nav.page}.tsx`;
    
    logger.info(`🔍 [PageComponentResolver] Trying modular path strategy: ${modularPath}`);
    logger.info(`🔍 [PageComponentResolver] Navigation info:`, { path: nav.path, page: nav.page, moduleDir });
    
    try {
      const module = await import(/* @vite-ignore */ modularPath);
      logger.info(`✅ [PageComponentResolver] Successfully loaded module from: ${modularPath}`);
      return module.default;
    } catch (error) {
      logger.warn(`❌ [PageComponentResolver] Failed to load from ${modularPath}:`, error);
      
      // Try with different file extensions or paths
      const alternativePaths = [
        `../modules/${moduleDir}/pages/${nav.page}/index.tsx`,
        `../modules/${moduleDir}/pages/${nav.page}Page.tsx`,
        `../modules/${moduleDir}/components/${nav.page}.tsx`
      ];

      for (const altPath of alternativePaths) {
        try {
          logger.info(`🔍 [PageComponentResolver] Trying alternative path: ${altPath}`);
          const module = await import(/* @vite-ignore */ altPath);
          logger.info(`✅ [PageComponentResolver] Successfully loaded module from alternative path: ${altPath}`);
          return module.default;
        } catch (altError) {
          logger.warn(`❌ [PageComponentResolver] Failed to load from ${altPath}:`, altError);
          continue;
        }
      }
      
      throw error;
    }
  }

  // Strategy 2: Resolve by legacy path patterns
  private async resolveByLegacyPath(nav: any): Promise<React.ComponentType | null> {
    if (!nav.page) return null;

    const legacyPaths = [
      `../pages/${nav.page}.tsx`,
      `../components/pages/${nav.page}.tsx`,
      `../views/${nav.page}.tsx`,
      `../${nav.page}.tsx`
    ];

    for (const legacyPath of legacyPaths) {
      try {
        const module = await import(/* @vite-ignore */ legacyPath);
        return module.default;
      } catch {
        continue;
      }
    }

    return null;
  }

  // Strategy 3: Resolve by fallback path with common naming patterns
  private async resolveByFallbackPath(nav: any): Promise<React.ComponentType | null> {
    const pathSegments = nav.path.split('/').filter(Boolean);
    if (pathSegments.length === 0) return null;

    const moduleDir = pathSegments[0];
    const pageName = nav.page || pathSegments[pathSegments.length - 1];
    
    const fallbackPaths = [
      `../modules/${moduleDir}/pages/index.tsx`,
      `../modules/${moduleDir}/index.tsx`,
      `../modules/${moduleDir}/${pageName}.tsx`,
      `../components/${moduleDir}/${pageName}.tsx`,
      `../pages/${moduleDir}/${pageName}.tsx`
    ];

    for (const fallbackPath of fallbackPaths) {
      try {
        const module = await import(/* @vite-ignore */ fallbackPath);
        return module.default;
      } catch {
        continue;
      }
    }

    return null;
  }

  // Strategy 4: Dynamic import with runtime path construction
  private async resolveByDynamicImport(nav: any): Promise<React.ComponentType | null> {
    // This is a last resort strategy that tries to construct paths dynamically
    // based on available information
    
    try {
      // Try to use Vite's glob import if available
      const modules = import.meta.glob('../modules/*/pages/*.tsx');
      const moduleKeys = Object.keys(modules);
      
      // Find matching module based on nav information
      const matchingKey = moduleKeys.find(key => {
        const keyParts = key.split('/');
        const fileName = keyParts[keyParts.length - 1].replace('.tsx', '');
        
        return fileName === nav.page || 
               key.includes(nav.page) || 
               key.includes(nav.path.split('/')[1]);
      });

      if (matchingKey) {
        const module = await modules[matchingKey]();
        return (module as any).default;
      }
    } catch (error) {
      logger.warn('Dynamic import strategy failed:', error);
    }

    return null;
  }

  // Cache management methods
  private getCacheKey(nav: any): string {
    return `${nav.path}:${nav.page || 'default'}`;
  }

  private getCachedComponent(key: string): PageResolutionCache | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache entry is expired
    const now = Date.now();
    if (now - cached.timestamp.getTime() > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    // Update access count
    cached.accessCount++;
    return cached;
  }

  private cacheComponent(key: string, component: React.ComponentType, strategy: string) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.findLeastRecentlyUsed();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      component,
      strategy,
      timestamp: new Date(),
      accessCount: 1
    });
  }

  private findLeastRecentlyUsed(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    let lowestAccessCount = Infinity;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.accessCount < lowestAccessCount || 
          (cached.accessCount === lowestAccessCount && cached.timestamp.getTime() < oldestTime)) {
        oldestTime = cached.timestamp.getTime();
        lowestAccessCount = cached.accessCount;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Utility methods
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      strategy: cached.strategy,
      timestamp: cached.timestamp,
      accessCount: cached.accessCount
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: entries.sort((a, b) => b.accessCount - a.accessCount)
    };
  }

  getResolutionStats() {
    const healthSummary = pageHealthMonitor.getHealthSummary();
    const cacheStats = this.getCacheStats();
    
    return {
      health: healthSummary,
      cache: cacheStats,
      strategies: this.strategies.map(s => ({ name: s.name, priority: s.priority }))
    };
  }
}

// Global instance
export const pageComponentResolver = new PageComponentResolver();

// Export types
export type { PageResolutionResult, PageResolutionStrategy };
export default PageComponentResolver;
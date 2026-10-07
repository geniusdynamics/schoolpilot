import { logger } from '@/utils/logging';

// ABOUTME: Route preloading service for commonly accessed pages
// ABOUTME: Implements intelligent preloading strategies to improve navigation performance

import { pageComponentResolver } from './pageComponentResolver';

interface PreloadStrategy {
  name: string;
  priority: number;
  shouldPreload: (nav: any, context: PreloadContext) => boolean;
  preload: (nav: any) => Promise<void>;
}

interface PreloadContext {
  currentPath: string;
  userRole: string;
  accessibleModules: string[];
  recentlyVisited: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface PreloadMetrics {
  totalPreloaded: number;
  successfulPreloads: number;
  failedPreloads: number;
  averagePreloadTime: number;
  cacheHitRate: number;
  lastPreloadSession: Date;
}

class RoutePreloader {
  private strategies: PreloadStrategy[] = [];
  private preloadedRoutes = new Set<string>();
  private preloadQueue: Array<{ nav: any; priority: number }> = [];
  private isPreloading = false;
  private metrics: PreloadMetrics = {
    totalPreloaded: 0,
    successfulPreloads: 0,
    failedPreloads: 0,
    averagePreloadTime: 0,
    cacheHitRate: 0,
    lastPreloadSession: new Date()
  };
  private maxConcurrentPreloads = 2;
  private preloadTimeout = 8000; // 8 seconds

  constructor() {
    this.initializeStrategies();
    this.setupIdlePreloading();
  }

  private initializeStrategies() {
    this.strategies = [
      {
        name: 'dashboard-priority',
        priority: 1,
        shouldPreload: (nav, context) => 
          nav.path === '/dashboard' && context.currentPath !== '/dashboard',
        preload: this.preloadRoute.bind(this)
      },
      {
        name: 'frequently-accessed',
        priority: 2,
        shouldPreload: (nav, context) => 
          context.recentlyVisited.includes(nav.path) && 
          context.connectionQuality !== 'poor',
        preload: this.preloadRoute.bind(this)
      },
      {
        name: 'role-based',
        priority: 3,
        shouldPreload: (nav, context) => {
          const requiredRole = nav.requiredRole || 'user';
          return context.userRole === requiredRole || context.userRole === 'admin';
        },
        preload: this.preloadRoute.bind(this)
      },
      {
        name: 'module-siblings',
        priority: 4,
        shouldPreload: (nav, context) => {
          const currentModule = context.currentPath.split('/')[1];
          const navModule = nav.path.split('/')[1];
          return currentModule === navModule && nav.path !== context.currentPath;
        },
        preload: this.preloadRoute.bind(this)
      },
      {
        name: 'time-based',
        priority: 5,
        shouldPreload: (nav, context) => {
          // Preload reports in the morning, student pages in afternoon
          if (context.timeOfDay === 'morning' && nav.path.includes('/reports')) return true;
          if (context.timeOfDay === 'afternoon' && nav.path.includes('/students')) return true;
          return false;
        },
        preload: this.preloadRoute.bind(this)
      }
    ].sort((a, b) => a.priority - b.priority);
  }

  private setupIdlePreloading() {
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleIdleWork = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: 5000 });
      } else {
        setTimeout(callback, 100);
      }
    };

    const processPreloadQueue = () => {
      if (this.preloadQueue.length > 0 && !this.isPreloading) {
        this.processQueue();
      }
      scheduleIdleWork(processPreloadQueue);
    };

    scheduleIdleWork(processPreloadQueue);
  }

  // Main preloading method
  async preloadRoutes(navigationItems: any[], context: PreloadContext) {
    const candidates = this.identifyPreloadCandidates(navigationItems, context);
    
    // Add to queue with priorities
    candidates.forEach(candidate => {
      if (!this.preloadedRoutes.has(candidate.nav.path)) {
        this.preloadQueue.push(candidate);
      }
    });

    // Sort queue by priority
    this.preloadQueue.sort((a, b) => a.priority - b.priority);

    // Start processing if not already running
    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  private identifyPreloadCandidates(navigationItems: any[], context: PreloadContext) {
    const candidates: Array<{ nav: any; priority: number }> = [];

    const processNavItems = (items: any[]) => {
      items.forEach(item => {
        if (item.children) {
          processNavItems(item.children);
        } else if (item.path && item.page) {
          // Check each strategy
          for (const strategy of this.strategies) {
            if (strategy.shouldPreload(item, context)) {
              candidates.push({ nav: item, priority: strategy.priority });
              break; // Use first matching strategy
            }
          }
        }
      });
    };

    processNavItems(navigationItems);
    return candidates;
  }

  private async processQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;
    const batch = this.preloadQueue.splice(0, this.maxConcurrentPreloads);

    const preloadPromises = batch.map(async ({ nav }) => {
      const startTime = Date.now();
      
      try {
        await Promise.race([
          this.preloadRoute(nav),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Preload timeout')), this.preloadTimeout)
          )
        ]);

        const loadTime = Date.now() - startTime;
        this.updateMetrics(true, loadTime);
        this.preloadedRoutes.add(nav.path);
        
        logger.info(`✅ [RoutePreloader] Successfully preloaded: ${nav.path} (${loadTime}ms)`);
      } catch (error) {
        const loadTime = Date.now() - startTime;
        this.updateMetrics(false, loadTime);
        
        logger.warn(`❌ [RoutePreloader] Failed to preload: ${nav.path}`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    this.isPreloading = false;

    // Continue processing if there are more items
    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private async preloadRoute(nav: any): Promise<void> {
    try {
      // Use the page component resolver to preload the component
      const result = await pageComponentResolver.resolvePageComponent(nav);
      
      if (!result.component) {
        throw new Error(`Failed to resolve component for ${nav.path}`);
      }

      // Component is now cached by the resolver
      return;
    } catch (error) {
      throw new Error(`Route preload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private updateMetrics(success: boolean, loadTime: number) {
    this.metrics.totalPreloaded++;
    
    if (success) {
      this.metrics.successfulPreloads++;
    } else {
      this.metrics.failedPreloads++;
    }

    // Update average load time
    const totalTime = this.metrics.averagePreloadTime * (this.metrics.totalPreloaded - 1) + loadTime;
    this.metrics.averagePreloadTime = totalTime / this.metrics.totalPreloaded;

    // Update cache hit rate (from page component resolver)
    const resolverStats = pageComponentResolver.getResolutionStats();
    this.metrics.cacheHitRate = resolverStats.cache.entries.length > 0 
      ? (resolverStats.cache.entries.length / this.metrics.totalPreloaded) * 100 
      : 0;

    this.metrics.lastPreloadSession = new Date();
  }

  // Public methods for external control
  preloadSpecificRoutes(paths: string[], navigationItems: any[]) {
    const navItems = this.findNavItemsByPaths(paths, navigationItems);
    navItems.forEach(nav => {
      if (!this.preloadedRoutes.has(nav.path)) {
        this.preloadQueue.unshift({ nav, priority: 0 }); // High priority
      }
    });

    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  private findNavItemsByPaths(paths: string[], navigationItems: any[]): any[] {
    const found: any[] = [];
    
    const search = (items: any[]) => {
      items.forEach(item => {
        if (item.children) {
          search(item.children);
        } else if (item.path && paths.includes(item.path)) {
          found.push(item);
        }
      });
    };

    search(navigationItems);
    return found;
  }

  clearPreloadCache() {
    this.preloadedRoutes.clear();
    pageComponentResolver.clearCache();
    logger.info('🧹 [RoutePreloader] Preload cache cleared');
  }

  getPreloadMetrics(): PreloadMetrics & { 
    queueLength: number; 
    isPreloading: boolean;
    preloadedRoutes: string[];
  } {
    return {
      ...this.metrics,
      queueLength: this.preloadQueue.length,
      isPreloading: this.isPreloading,
      preloadedRoutes: Array.from(this.preloadedRoutes)
    };
  }

  updatePreloadStrategy(config: {
    maxConcurrentPreloads?: number;
    preloadTimeout?: number;
    enableTimeBasedPreloading?: boolean;
    connectionQualityThreshold?: 'excellent' | 'good' | 'fair' | 'poor';
  }) {
    if (config.maxConcurrentPreloads) {
      this.maxConcurrentPreloads = config.maxConcurrentPreloads;
    }
    
    if (config.preloadTimeout) {
      this.preloadTimeout = config.preloadTimeout;
    }

    // Update strategies based on config
    if (config.enableTimeBasedPreloading === false) {
      this.strategies = this.strategies.filter(s => s.name !== 'time-based');
    }

    logger.info('⚙️ [RoutePreloader] Configuration updated:', config);
  }

  // Integration with navigation system
  onNavigationChange(newPath: string, navigationItems: any[], userContext: any) {
    const context: PreloadContext = {
      currentPath: newPath,
      userRole: userContext.role || 'user',
      accessibleModules: userContext.accessibleModules || [],
      recentlyVisited: this.getRecentlyVisited(),
      timeOfDay: this.getTimeOfDay(),
      connectionQuality: this.getConnectionQuality()
    };

    // Preload related routes
    this.preloadRoutes(navigationItems, context);
  }

  private getRecentlyVisited(): string[] {
    try {
      const visited = localStorage.getItem('recentlyVisited');
      return visited ? JSON.parse(visited) : [];
    } catch {
      return [];
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case '4g': return 'excellent';
        case '3g': return 'good';
        case '2g': return 'fair';
        default: return 'poor';
      }
    }
    
    // Fallback based on online status
    return navigator.onLine ? 'good' : 'poor';
  }
}

// Global instance
export const routePreloader = new RoutePreloader();

// Export types
export type { PreloadStrategy, PreloadContext, PreloadMetrics };
export default RoutePreloader;
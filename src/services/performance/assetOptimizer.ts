// ABOUTME: Asset loading optimization service for improved performance
// ABOUTME: Handles preloading, lazy loading, and caching strategies for various asset types

interface AssetLoadingStrategy {
  type: 'preload' | 'lazy' | 'defer' | 'immediate';
  priority: 'high' | 'medium' | 'low';
  cacheStrategy: 'aggressive' | 'normal' | 'minimal';
}

interface AssetMetrics {
  url: string;
  size: number;
  loadTime: number;
  cached: boolean;
  strategy: AssetLoadingStrategy;
  timestamp: Date;
}

class AssetOptimizer {
  private loadedAssets = new Map<string, AssetMetrics>();
  private preloadQueue: string[] = [];
  private lazyLoadObserver?: IntersectionObserver;

  constructor() {
    this.initializeLazyLoading();
    this.setupPreloadStrategy();
  }

  // Initialize lazy loading observer
  private initializeLazyLoading() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.lazyLoadObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const src = element.dataset.src;
              if (src) {
                this.loadAsset(src, { type: 'lazy', priority: 'medium', cacheStrategy: 'normal' });
                this.lazyLoadObserver?.unobserve(element);
              }
            }
          });
        },
        { rootMargin: '50px' }
      );
    }
  }

  // Setup preload strategy for critical assets
  private setupPreloadStrategy() {
    // Preload critical CSS and fonts
    this.preloadAsset('/fonts/main.woff2', 'font');
    this.preloadAsset('/css/critical.css', 'style');
    
    // Preload commonly accessed module chunks
    this.scheduleModulePreload('administration');
    this.scheduleModulePreload('academics');
  }

  // Preload an asset
  preloadAsset(url: string, type: 'script' | 'style' | 'font' | 'image' = 'script') {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    if (type === 'font') {
      link.crossOrigin = 'anonymous';
    }

    const startTime = Date.now();
    
    link.onload = () => {
      const loadTime = Date.now() - startTime;
      this.recordAssetLoad(url, 0, loadTime, false, {
        type: 'preload',
        priority: 'high',
        cacheStrategy: 'aggressive'
      });
    };

    document.head.appendChild(link);
  }

  // Load asset with specified strategy
  async loadAsset(url: string, strategy: AssetLoadingStrategy): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if already loaded
      if (this.loadedAssets.has(url)) {
        return;
      }

      // Determine loading method based on strategy
      switch (strategy.type) {
        case 'preload':
          this.preloadAsset(url);
          break;
        case 'lazy':
          await this.lazyLoadAsset(url);
          break;
        case 'defer':
          setTimeout(() => this.loadAssetImmediate(url), 100);
          break;
        case 'immediate':
        default:
          await this.loadAssetImmediate(url);
          break;
      }

      const loadTime = Date.now() - startTime;
      this.recordAssetLoad(url, 0, loadTime, false, strategy);
      
    } catch (error) {
      console.warn(`Failed to load asset: ${url}`, error);
    }
  }

  // Lazy load asset when needed
  private async lazyLoadAsset(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  }

  // Load asset immediately
  private async loadAssetImmediate(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.statusText}`);
    }
    return;
  }

  // Schedule module preload based on usage patterns
  scheduleModulePreload(moduleName: string) {
    const moduleUrl = `/src/modules/${moduleName}/index.ts`;
    
    // Add to preload queue with delay to avoid blocking initial load
    setTimeout(() => {
      this.preloadAsset(moduleUrl, 'script');
    }, 2000);
  }

  // Record asset loading metrics
  private recordAssetLoad(
    url: string,
    size: number,
    loadTime: number,
    cached: boolean,
    strategy: AssetLoadingStrategy
  ) {
    this.loadedAssets.set(url, {
      url,
      size,
      loadTime,
      cached,
      strategy,
      timestamp: new Date()
    });
  }

  // Optimize image loading
  optimizeImageLoading(container: HTMLElement) {
    const images = container.querySelectorAll('img[data-src]');
    
    images.forEach(img => {
      if (this.lazyLoadObserver) {
        this.lazyLoadObserver.observe(img);
      }
    });
  }

  // Get loading performance metrics
  getLoadingMetrics() {
    const metrics = Array.from(this.loadedAssets.values());
    
    return {
      totalAssets: metrics.length,
      averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
      cacheHitRate: metrics.filter(m => m.cached).length / metrics.length,
      strategiesUsed: [...new Set(metrics.map(m => m.strategy.type))],
      largestAssets: metrics
        .sort((a, b) => b.size - a.size)
        .slice(0, 5)
        .map(m => ({ url: m.url, size: m.size, loadTime: m.loadTime }))
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const metrics = Array.from(this.loadedAssets.values());
    const recommendations: string[] = [];

    // Check for slow loading assets
    const slowAssets = metrics.filter(m => m.loadTime > 1000);
    if (slowAssets.length > 0) {
      recommendations.push(
        `Optimize slow loading assets: ${slowAssets.length} assets taking >1s to load`
      );
    }

    // Check cache utilization
    const cacheHitRate = metrics.filter(m => m.cached).length / metrics.length;
    if (cacheHitRate < 0.5) {
      recommendations.push('Improve caching strategy - low cache hit rate detected');
    }

    // Check for large assets
    const largeAssets = metrics.filter(m => m.size > 500000);
    if (largeAssets.length > 0) {
      recommendations.push(
        `Consider compressing large assets: ${largeAssets.length} assets >500KB`
      );
    }

    // General recommendations
    recommendations.push(
      'Enable browser caching with appropriate headers',
      'Use WebP format for images where supported',
      'Implement progressive loading for large content',
      'Consider using a CDN for static assets'
    );

    return recommendations;
  }

  // Clean up resources
  cleanup() {
    if (this.lazyLoadObserver) {
      this.lazyLoadObserver.disconnect();
    }
    this.loadedAssets.clear();
    this.preloadQueue.length = 0;
  }

  // Get asset loading summary
  getAssetSummary() {
    const metrics = this.getLoadingMetrics();
    const recommendations = this.getOptimizationRecommendations();
    
    return {
      performance: metrics,
      recommendations,
      status: metrics.averageLoadTime < 1000 ? 'good' : 'needs-improvement'
    };
  }
}

// Global instance
export const assetOptimizer = new AssetOptimizer();

// Export types
export type { AssetLoadingStrategy, AssetMetrics };
export default AssetOptimizer;
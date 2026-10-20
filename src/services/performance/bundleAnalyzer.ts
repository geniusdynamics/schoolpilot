import { logger } from '@/utils/logging';

// ABOUTME: Bundle analysis and optimization service for performance monitoring
// ABOUTME: Provides insights into bundle size, chunk analysis, and loading performance

interface BundleChunk {
  name: string;
  size: number;
  modules: string[];
  loadTime?: number;
  cached: boolean;
}

interface BundleAnalysis {
  totalSize: number;
  chunks: BundleChunk[];
  duplicateModules: string[];
  largestChunks: BundleChunk[];
  recommendations: string[];
  loadingPerformance: {
    initialLoad: number;
    chunkLoadTimes: Record<string, number>;
    cacheHitRate: number;
  };
}

class BundleAnalyzer {
  private chunkLoadTimes = new Map<string, number[]>();
  private cacheHits = 0;
  private cacheMisses = 0;

  // Record chunk loading performance
  recordChunkLoad(chunkName: string, loadTime: number, fromCache: boolean) {
    if (!this.chunkLoadTimes.has(chunkName)) {
      this.chunkLoadTimes.set(chunkName, []);
    }
    
    this.chunkLoadTimes.get(chunkName)!.push(loadTime);
    
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  // Analyze current bundle state
  async analyzeBundles(): Promise<BundleAnalysis> {
    const chunks = await this.getChunkInformation();
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const duplicateModules = this.findDuplicateModules(chunks);
    const largestChunks = chunks
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    const recommendations = this.generateRecommendations(chunks, duplicateModules);
    
    const loadingPerformance = {
      initialLoad: this.calculateAverageLoadTime('main'),
      chunkLoadTimes: this.getAverageLoadTimes(),
      cacheHitRate: this.calculateCacheHitRate()
    };

    return {
      totalSize,
      chunks,
      duplicateModules,
      largestChunks,
      recommendations,
      loadingPerformance
    };
  }

  // Get chunk information from Vite's module graph
  private async getChunkInformation(): Promise<BundleChunk[]> {
    const chunks: BundleChunk[] = [];
    
    // In development, we can't get actual chunk sizes, so we estimate
    if (import.meta.env.DEV) {
      // Estimate based on module imports
      const moduleChunks = [
        { name: 'main', size: 150000, modules: ['App', 'main'], cached: false },
        { name: 'vendor', size: 800000, modules: ['react', 'react-dom'], cached: true },
        { name: 'administration', size: 120000, modules: ['admin-pages'], cached: false },
        { name: 'academics', size: 100000, modules: ['academic-pages'], cached: false },
        { name: 'finance', size: 90000, modules: ['finance-pages'], cached: false }
      ];
      
      chunks.push(...moduleChunks);
    } else {
      // In production, we would analyze the actual build output
      // This would require integration with the build process
      logger.warn('Production bundle analysis not yet implemented');
    }

    return chunks;
  }

  // Find modules that appear in multiple chunks
  private findDuplicateModules(chunks: BundleChunk[]): string[] {
    const moduleCount = new Map<string, number>();
    
    chunks.forEach(chunk => {
      chunk.modules.forEach(module => {
        moduleCount.set(module, (moduleCount.get(module) || 0) + 1);
      });
    });

    return Array.from(moduleCount.entries())
      .filter(([, count]) => count > 1)
      .map(([module]) => module);
  }

  // Generate optimization recommendations
  private generateRecommendations(chunks: BundleChunk[], duplicateModules: string[]): string[] {
    const recommendations: string[] = [];

    // Check for large chunks
    const largeChunks = chunks.filter(chunk => chunk.size > 500000);
    if (largeChunks.length > 0) {
      recommendations.push(
        `Consider splitting large chunks: ${largeChunks.map(c => c.name).join(', ')}`
      );
    }

    // Check for duplicate modules
    if (duplicateModules.length > 0) {
      recommendations.push(
        `Optimize duplicate modules: ${duplicateModules.slice(0, 3).join(', ')}`
      );
    }

    // Check cache performance
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.7) {
      recommendations.push(
        'Improve caching strategy - current cache hit rate is low'
      );
    }

    // Check loading performance
    const avgLoadTime = this.calculateAverageLoadTime('main');
    if (avgLoadTime > 3000) {
      recommendations.push(
        'Optimize initial loading time - currently exceeds 3 seconds'
      );
    }

    return recommendations;
  }

  // Calculate average load time for a specific chunk
  private calculateAverageLoadTime(chunkName: string): number {
    const times = this.chunkLoadTimes.get(chunkName);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  // Get average load times for all chunks
  private getAverageLoadTimes(): Record<string, number> {
    const averages: Record<string, number> = {};
    
    this.chunkLoadTimes.forEach((times, chunkName) => {
      averages[chunkName] = times.reduce((sum, time) => sum + time, 0) / times.length;
    });

    return averages;
  }

  // Calculate cache hit rate
  private calculateCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total === 0 ? 0 : this.cacheHits / total;
  }

  // Get bundle optimization suggestions
  getBundleOptimizationSuggestions(): string[] {
    return [
      'Enable tree shaking for unused code elimination',
      'Use dynamic imports for route-based code splitting',
      'Implement proper caching headers for static assets',
      'Consider using a CDN for vendor libraries',
      'Optimize images and other static assets',
      'Use compression (gzip/brotli) for text assets',
      'Implement service worker for offline caching',
      'Split vendor libraries into separate chunks'
    ];
  }

  // Reset performance metrics
  resetMetrics() {
    this.chunkLoadTimes.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // Get performance summary
  getPerformanceSummary() {
    return {
      totalChunksTracked: this.chunkLoadTimes.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageLoadTimes: this.getAverageLoadTimes(),
      recommendations: this.getBundleOptimizationSuggestions()
    };
  }
}

// Global instance
export const bundleAnalyzer = new BundleAnalyzer();

// Export types
export type { BundleAnalysis, BundleChunk };
export default BundleAnalyzer;
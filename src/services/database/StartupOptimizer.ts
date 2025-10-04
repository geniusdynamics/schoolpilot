// ABOUTME: Database startup performance optimizer
// ABOUTME: Implements lazy loading, progressive data loading, and startup monitoring

import { IDatabaseProvider, ICollection } from './interfaces';
import { getCurrentUnifiedConfig } from '../../config/unifiedConfig';

export interface StartupMetrics {
  totalStartupTime: number;
  databaseInitTime: number;
  providerLoadTime: number;
  schemaLoadTime: number;
  initialDataLoadTime: number;
  cacheWarmupTime: number;
  timestamp: Date;
}

export interface LazyLoadConfig {
  enableLazyLoading: boolean;
  preloadCollections: string[];
  deferredCollections: string[];
  batchSize: number;
  loadDelay: number; // ms between batches
}

export interface ProgressiveLoadingState {
  collectionName: string;
  totalRecords: number;
  loadedRecords: number;
  batchesLoaded: number;
  totalBatches: number;
  isComplete: boolean;
  startTime: Date;
  lastBatchTime: Date;
}

export interface StartupOptimizationConfig {
  enableLazyLoading: boolean;
  enableProgressiveLoading: boolean;
  enableBundleOptimization: boolean;
  enableStartupMetrics: boolean;
  maxInitialLoadTime: number; // ms
  progressiveBatchSize: number;
  lazyLoadDelay: number; // ms
  preloadCriticalCollections: string[];
}

/**
 * Database Startup Performance Optimizer
 * Optimizes database initialization and data loading for faster startup times
 */
export class DatabaseStartupOptimizer {
  private static instance: DatabaseStartupOptimizer;
  private config: StartupOptimizationConfig;
  private startupMetrics: StartupMetrics[] = [];
  private progressiveLoadingStates: Map<string, ProgressiveLoadingState> = new Map();
  private lazyLoadedCollections: Set<string> = new Set();
  private preloadedCollections: Set<string> = new Set();
  private startupStartTime: number = 0;
  private isOptimizing = false;
  private listeners: ((metrics: StartupMetrics) => void)[] = [];

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): DatabaseStartupOptimizer {
    if (!DatabaseStartupOptimizer.instance) {
      DatabaseStartupOptimizer.instance = new DatabaseStartupOptimizer();
    }
    return DatabaseStartupOptimizer.instance;
  }

  /**
   * Load startup optimization configuration
   */
  private loadConfiguration(): StartupOptimizationConfig {
    // Use default configuration for now
    // TODO: Integrate with unifiedConfig when performance properties are added
    return {
      enableLazyLoading: true,
      enableProgressiveLoading: true,
      enableBundleOptimization: true,
      enableStartupMetrics: true,
      maxInitialLoadTime: 5000, // 5 seconds
      progressiveBatchSize: 100,
      lazyLoadDelay: 100, // 100ms
      preloadCriticalCollections: [
        'users', 'settings', 'permissions', 'modules'
      ],
    };
  }

  /**
   * Start startup optimization process
   */
  public async startOptimization(provider: IDatabaseProvider): Promise<void> {
    if (this.isOptimizing) {
      console.warn('⚠️ [StartupOptimizer] Optimization already in progress');
      return;
    }

    this.isOptimizing = true;
    this.startupStartTime = Date.now();
    
    console.log('🚀 [StartupOptimizer] Starting database startup optimization');

    try {
      const metrics: Partial<StartupMetrics> = {
        timestamp: new Date(),
      };

      // Measure provider initialization time
      const providerStartTime = Date.now();
      // Provider should already be initialized, so this is just measurement
      metrics.providerLoadTime = Date.now() - providerStartTime;

      // Measure schema loading time
      const schemaStartTime = Date.now();
      await this.optimizeSchemaLoading(provider);
      metrics.schemaLoadTime = Date.now() - schemaStartTime;

      // Measure initial data loading time
      const dataStartTime = Date.now();
      await this.optimizeInitialDataLoading(provider);
      metrics.initialDataLoadTime = Date.now() - dataStartTime;

      // Measure cache warmup time
      const cacheStartTime = Date.now();
      await this.optimizeCacheWarmup(provider);
      metrics.cacheWarmupTime = Date.now() - cacheStartTime;

      // Calculate total times
      metrics.databaseInitTime = (metrics.providerLoadTime || 0) + (metrics.schemaLoadTime || 0);
      metrics.totalStartupTime = Date.now() - this.startupStartTime;

      // Store metrics
      this.recordStartupMetrics(metrics as StartupMetrics);

      // Start progressive loading for non-critical collections
      if (this.config.enableProgressiveLoading) {
        this.startProgressiveLoading(provider);
      }

      console.log(`✅ [StartupOptimizer] Startup optimization completed in ${metrics.totalStartupTime}ms`);

    } catch (error) {
      console.error('❌ [StartupOptimizer] Startup optimization failed:', error);
      throw error;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize schema loading
   */
  private async optimizeSchemaLoading(provider: IDatabaseProvider): Promise<void> {
    console.log('📋 [StartupOptimizer] Optimizing schema loading');
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate schema loading
  }

  /**
   * Optimize initial data loading
   */
  private async optimizeInitialDataLoading(provider: IDatabaseProvider): Promise<void> {
    console.log('📊 [StartupOptimizer] Optimizing initial data loading');

    if (!this.config.enableLazyLoading) {
      return;
    }

    // Preload only critical collections
    for (const collectionName of this.config.preloadCriticalCollections) {
      try {
        const collection = await provider.getCollection(collectionName);
        if (collection) {
          await collection.find({ limit: 10 });
          this.preloadedCollections.add(collectionName);
          console.log(`📦 [StartupOptimizer] Preloaded critical collection: ${collectionName}`);
        }
      } catch (error) {
        console.warn(`⚠️ [StartupOptimizer] Failed to preload collection ${collectionName}:`, error);
      }
    }
  }

  /**
   * Optimize cache warmup
   */
  private async optimizeCacheWarmup(provider: IDatabaseProvider): Promise<void> {
    console.log('🔥 [StartupOptimizer] Optimizing cache warmup');

    for (const collectionName of this.preloadedCollections) {
      try {
        const collection = await provider.getCollection(collectionName);
        if (collection) {
          await collection.count();
          await collection.find({ limit: 1 });
        }
      } catch (error) {
        console.warn(`⚠️ [StartupOptimizer] Cache warmup failed for ${collectionName}:`, error);
      }
    }
  }

  /**
   * Start progressive loading for non-critical collections
   */
  private async startProgressiveLoading(provider: IDatabaseProvider): Promise<void> {
    console.log('⏳ [StartupOptimizer] Starting progressive loading');

    const allCollections = [
      'students', 'staff', 'classes', 'subjects', 'exams', 'grades',
      'fees', 'payments', 'inventory', 'books', 'meals', 'reports'
    ];

    const nonCriticalCollections = allCollections.filter(
      name => !this.config.preloadCriticalCollections.includes(name)
    );

    for (let i = 0; i < nonCriticalCollections.length; i++) {
      const collectionName = nonCriticalCollections[i];
      
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.lazyLoadDelay));
      }

      this.loadCollectionProgressively(provider, collectionName);
    }
  }

  /**
   * Load a collection progressively in batches
   */
  private async loadCollectionProgressively(
    provider: IDatabaseProvider, 
    collectionName: string
  ): Promise<void> {
    try {
      const collection = await provider.getCollection(collectionName);
      if (!collection) {
        return;
      }

      console.log(`📦 [StartupOptimizer] Starting progressive loading for ${collectionName}`);

      const startTime = new Date();
      const totalRecords = await collection.count();
      const batchSize = this.config.progressiveBatchSize;
      const totalBatches = Math.ceil(totalRecords / batchSize);

      const state: ProgressiveLoadingState = {
        collectionName,
        totalRecords,
        loadedRecords: 0,
        batchesLoaded: 0,
        totalBatches,
        isComplete: false,
        startTime,
        lastBatchTime: startTime,
      };

      this.progressiveLoadingStates.set(collectionName, state);

      for (let batch = 0; batch < totalBatches; batch++) {
        const skip = batch * batchSize;
        const batchData = await collection.find({ 
          skip, 
          limit: batchSize 
        });

        state.loadedRecords += batchData.length;
        state.batchesLoaded = batch + 1;
        state.lastBatchTime = new Date();

        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      state.isComplete = true;
      this.lazyLoadedCollections.add(collectionName);
      
      console.log(`✅ [StartupOptimizer] Progressive loading completed for ${collectionName}: ${state.loadedRecords} records`);

    } catch (error) {
      console.error(`❌ [StartupOptimizer] Progressive loading failed for ${collectionName}:`, error);
    }
  }

  /**
   * Get lazy-loaded collection with on-demand loading
   */
  public async getLazyCollection<T>(
    provider: IDatabaseProvider,
    collectionName: string
  ): Promise<ICollection<T> | null> {
    const collection = await provider.getCollection<T>(collectionName);
    
    if (!collection) {
      return null;
    }

    if (this.config.enableLazyLoading && !this.lazyLoadedCollections.has(collectionName)) {
      console.log(`🔄 [StartupOptimizer] Lazy loading collection: ${collectionName}`);
      this.lazyLoadedCollections.add(collectionName);
      this.loadCollectionProgressively(provider, collectionName);
    }

    return collection;
  }

  /**
   * Record startup metrics
   */
  private recordStartupMetrics(metrics: StartupMetrics): void {
    if (!this.config.enableStartupMetrics) {
      return;
    }

    this.startupMetrics.push(metrics);

    if (this.startupMetrics.length > 50) {
      this.startupMetrics = this.startupMetrics.slice(-50);
    }

    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('❌ [StartupOptimizer] Listener error:', error);
      }
    });

    if (metrics.totalStartupTime > this.config.maxInitialLoadTime) {
      console.warn(`⚠️ [StartupOptimizer] Slow startup detected: ${metrics.totalStartupTime}ms (threshold: ${this.config.maxInitialLoadTime}ms)`);
    }
  }

  public getStartupMetrics(): StartupMetrics[] {
    return [...this.startupMetrics];
  }

  public getLatestStartupMetrics(): StartupMetrics | null {
    return this.startupMetrics.length > 0 ? this.startupMetrics[this.startupMetrics.length - 1] : null;
  }

  public getProgressiveLoadingStates(): Map<string, ProgressiveLoadingState> {
    return new Map(this.progressiveLoadingStates);
  }

  public getProgressiveLoadingState(collectionName: string): ProgressiveLoadingState | null {
    return this.progressiveLoadingStates.get(collectionName) || null;
  }

  public isCollectionLoaded(collectionName: string): boolean {
    return this.lazyLoadedCollections.has(collectionName) || this.preloadedCollections.has(collectionName);
  }

  public getLoadingStatistics(): {
    preloadedCollections: number;
    lazyLoadedCollections: number;
    progressivelyLoadingCollections: number;
    completedProgressiveLoading: number;
    totalCollectionsTracked: number;
  } {
    const progressiveStates = Array.from(this.progressiveLoadingStates.values());
    const progressivelyLoading = progressiveStates.filter(state => !state.isComplete).length;
    const completedProgressive = progressiveStates.filter(state => state.isComplete).length;

    return {
      preloadedCollections: this.preloadedCollections.size,
      lazyLoadedCollections: this.lazyLoadedCollections.size,
      progressivelyLoadingCollections: progressivelyLoading,
      completedProgressiveLoading: completedProgressive,
      totalCollectionsTracked: this.preloadedCollections.size + this.lazyLoadedCollections.size,
    };
  }

  public getStartupPerformanceSummary(): {
    averageStartupTime: number;
    fastestStartup: number;
    slowestStartup: number;
    recentTrend: 'improving' | 'degrading' | 'stable';
    recommendations: string[];
  } {
    if (this.startupMetrics.length === 0) {
      return {
        averageStartupTime: 0,
        fastestStartup: 0,
        slowestStartup: 0,
        recentTrend: 'stable',
        recommendations: ['No startup data available yet'],
      };
    }

    const startupTimes = this.startupMetrics.map(m => m.totalStartupTime);
    const averageStartupTime = startupTimes.reduce((sum, time) => sum + time, 0) / startupTimes.length;
    const fastestStartup = Math.min(...startupTimes);
    const slowestStartup = Math.max(...startupTimes);

    let recentTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (this.startupMetrics.length >= 5) {
      const recent = this.startupMetrics.slice(-3).map(m => m.totalStartupTime);
      const older = this.startupMetrics.slice(-6, -3).map(m => m.totalStartupTime);
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, time) => sum + time, 0) / recent.length;
        const olderAvg = older.reduce((sum, time) => sum + time, 0) / older.length;
        
        const improvement = ((olderAvg - recentAvg) / olderAvg) * 100;
        
        if (improvement > 10) recentTrend = 'improving';
        else if (improvement < -10) recentTrend = 'degrading';
      }
    }

    const recommendations: string[] = [];
    
    if (averageStartupTime > this.config.maxInitialLoadTime) {
      recommendations.push('Consider enabling lazy loading to reduce initial startup time');
    }
    
    if (slowestStartup > averageStartupTime * 2) {
      recommendations.push('Investigate performance bottlenecks causing slow startups');
    }
    
    if (!this.config.enableProgressiveLoading) {
      recommendations.push('Enable progressive loading for better user experience');
    }
    
    if (recentTrend === 'degrading') {
      recommendations.push('Startup performance is degrading - review recent changes');
    }

    const stats = this.getLoadingStatistics();
    if (stats.preloadedCollections > 10) {
      recommendations.push('Consider reducing the number of preloaded collections');
    }

    return {
      averageStartupTime,
      fastestStartup,
      slowestStartup,
      recentTrend,
      recommendations,
    };
  }

  public addStartupListener(listener: (metrics: StartupMetrics) => void): void {
    this.listeners.push(listener);
  }

  public removeStartupListener(listener: (metrics: StartupMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public updateConfiguration(newConfig: Partial<StartupOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 [StartupOptimizer] Configuration updated:', this.config);
  }

  public getConfiguration(): StartupOptimizationConfig {
    return { ...this.config };
  }

  public reset(): void {
    this.startupMetrics = [];
    this.progressiveLoadingStates.clear();
    this.lazyLoadedCollections.clear();
    this.preloadedCollections.clear();
    this.isOptimizing = false;
    console.log('🔄 [StartupOptimizer] Reset all tracking data');
  }

  public destroy(): void {
    this.reset();
    this.listeners = [];
  }
}

// Export singleton instance
export const databaseStartupOptimizer = DatabaseStartupOptimizer.getInstance();

// Export alias for convenience
export { DatabaseStartupOptimizer as StartupOptimizer };

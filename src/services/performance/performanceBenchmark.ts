// ABOUTME: Performance benchmarking service for baseline establishment and performance comparison
// ABOUTME: Provides automated performance regression testing and optimization recommendations

import { performanceMonitor, PerformanceReport } from './performanceMonitor';
import { getCurrentUnifiedConfig, UnifiedAppConfig } from '@/config/unifiedConfig';

export interface PerformanceBenchmark {
  id: string;
  name: string;
  timestamp: number;
  configuration: UnifiedAppConfig;
  metrics: {
    startupTime: number;
    moduleLoadingTime: number;
    memoryUsage: number;
    dataOperationTime: number;
    interactionResponseTime: number;
    totalMetrics: number;
  };
  environment: {
    browser: string;
    version: string;
    platform: string;
    screenSize: string;
    userAgent: string;
  };
  metadata: {
    description?: string;
    tags: string[];
    isBaseline: boolean;
    baselineId?: string;
  };
}

export interface ComparisonResult {
  overall: 'improved' | 'degraded' | 'stable';
  score: number; // Performance score (0-100)
  metrics: {
    [key: string]: {
      baseline: number;
      current: number;
      change: number;
      changePercent: number;
      status: 'improved' | 'degraded' | 'stable';
      significance: 'low' | 'medium' | 'high';
    };
  };
  recommendations: Recommendation[];
  summary: string;
}

export interface RegressionResult {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedMetrics: string[];
  possibleCauses: string[];
  recommendations: string[];
  confidence: number; // 0-1
}

export interface Recommendation {
  id: string;
  type: 'configuration' | 'code' | 'infrastructure' | 'usage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: {
    steps: string[];
    estimatedEffort: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  expectedImprovement: {
    metric: string;
    improvement: string;
  };
}

export interface BenchmarkStorage {
  baselines: PerformanceBenchmark[];
  benchmarks: PerformanceBenchmark[];
  version: string;
  lastUpdated: number;
}

class PerformanceBenchmarkService {
  private readonly STORAGE_KEY = 'performance-benchmarks';
  private readonly STORAGE_VERSION = '1.0.0';
  private readonly MAX_BENCHMARKS = 50; // Limit stored benchmarks
  private readonly MAX_BASELINES = 10; // Limit stored baselines

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        const initialStorage: BenchmarkStorage = {
          baselines: [],
          benchmarks: [],
          version: this.STORAGE_VERSION,
          lastUpdated: Date.now()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialStorage));
      }
    } catch (error) {
      console.warn('Failed to initialize benchmark storage:', error);
    }
  }

  private getStorage(): BenchmarkStorage {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load benchmark storage:', error);
    }

    // Return default storage if loading fails
    return {
      baselines: [],
      benchmarks: [],
      version: this.STORAGE_VERSION,
      lastUpdated: Date.now()
    };
  }

  private saveStorage(storage: BenchmarkStorage): void {
    try {
      storage.lastUpdated = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage));
    } catch (error) {
      console.warn('Failed to save benchmark storage:', error);
    }
  }

  private generateId(): string {
    return `benchmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentEnvironment(): PerformanceBenchmark['environment'] {
    const nav = navigator;
    return {
      browser: this.getBrowserName(),
      version: this.getBrowserVersion(),
      platform: nav.platform || 'unknown',
      screenSize: `${screen.width}x${screen.height}`,
      userAgent: nav.userAgent
    };
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'unknown';
  }

  private extractMetricsFromReport(report: PerformanceReport): PerformanceBenchmark['metrics'] {
    return {
      startupTime: report.startupTime,
      moduleLoadingTime: report.moduleLoadingTime,
      memoryUsage: report.memoryUsage,
      dataOperationTime: report.averageDataOperationTime,
      interactionResponseTime: report.averageInteractionTime,
      totalMetrics: report.totalMetrics
    };
  }

  public async createBaseline(name: string, description?: string, tags: string[] = []): Promise<PerformanceBenchmark> {
    try {
      // Get current performance report
      const report = performanceMonitor.getPerformanceReport();
      const config = getCurrentUnifiedConfig();
      
      const baseline: PerformanceBenchmark = {
        id: this.generateId(),
        name,
        timestamp: Date.now(),
        configuration: config,
        metrics: this.extractMetricsFromReport(report),
        environment: this.getCurrentEnvironment(),
        metadata: {
          description,
          tags: [...tags, 'baseline'],
          isBaseline: true
        }
      };

      // Save to storage
      const storage = this.getStorage();
      storage.baselines.push(baseline);

      // Limit number of baselines
      if (storage.baselines.length > this.MAX_BASELINES) {
        storage.baselines = storage.baselines
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_BASELINES);
      }

      this.saveStorage(storage);
      
      console.log('Performance baseline created:', baseline.name);
      return baseline;
    } catch (error) {
      console.error('Failed to create performance baseline:', error);
      throw new Error('Failed to create performance baseline');
    }
  }

  public async runBenchmark(name?: string, baselineId?: string): Promise<PerformanceBenchmark> {
    try {
      // Get current performance report
      const report = performanceMonitor.getPerformanceReport();
      const config = getCurrentUnifiedConfig();
      
      const benchmark: PerformanceBenchmark = {
        id: this.generateId(),
        name: name || `Benchmark ${new Date().toLocaleString()}`,
        timestamp: Date.now(),
        configuration: config,
        metrics: this.extractMetricsFromReport(report),
        environment: this.getCurrentEnvironment(),
        metadata: {
          tags: ['benchmark'],
          isBaseline: false,
          baselineId
        }
      };

      // Save to storage
      const storage = this.getStorage();
      storage.benchmarks.push(benchmark);

      // Limit number of benchmarks
      if (storage.benchmarks.length > this.MAX_BENCHMARKS) {
        storage.benchmarks = storage.benchmarks
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_BENCHMARKS);
      }

      this.saveStorage(storage);
      
      console.log('Performance benchmark completed:', benchmark.name);
      return benchmark;
    } catch (error) {
      console.error('Failed to run performance benchmark:', error);
      throw new Error('Failed to run performance benchmark');
    }
  }

  public getBaselines(): PerformanceBenchmark[] {
    const storage = this.getStorage();
    return storage.baselines.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getBenchmarks(): PerformanceBenchmark[] {
    const storage = this.getStorage();
    return storage.benchmarks.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getBaseline(id: string): PerformanceBenchmark | null {
    const baselines = this.getBaselines();
    return baselines.find(b => b.id === id) || null;
  }

  public getBenchmark(id: string): PerformanceBenchmark | null {
    const benchmarks = this.getBenchmarks();
    return benchmarks.find(b => b.id === id) || null;
  }

  public deleteBaseline(id: string): boolean {
    try {
      const storage = this.getStorage();
      const initialLength = storage.baselines.length;
      storage.baselines = storage.baselines.filter(b => b.id !== id);
      
      if (storage.baselines.length < initialLength) {
        this.saveStorage(storage);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete baseline:', error);
      return false;
    }
  }

  public deleteBenchmark(id: string): boolean {
    try {
      const storage = this.getStorage();
      const initialLength = storage.benchmarks.length;
      storage.benchmarks = storage.benchmarks.filter(b => b.id !== id);
      
      if (storage.benchmarks.length < initialLength) {
        this.saveStorage(storage);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete benchmark:', error);
      return false;
    }
  }

  public compareBenchmarks(baselineId: string, currentId: string): ComparisonResult {
    const baseline = this.getBaseline(baselineId) || this.getBenchmark(baselineId);
    const current = this.getBenchmark(currentId) || this.getBaseline(currentId);

    if (!baseline || !current) {
      throw new Error('Baseline or current benchmark not found');
    }

    const metrics: ComparisonResult['metrics'] = {};
    let improvementCount = 0;
    let degradationCount = 0;
    let totalSignificantChanges = 0;

    // Compare each metric
    Object.keys(baseline.metrics).forEach(key => {
      const baselineValue = baseline.metrics[key as keyof typeof baseline.metrics];
      const currentValue = current.metrics[key as keyof typeof current.metrics];
      
      const change = currentValue - baselineValue;
      const changePercent = baselineValue > 0 ? (change / baselineValue) * 100 : 0;
      
      // Determine status and significance
      let status: 'improved' | 'degraded' | 'stable' = 'stable';
      let significance: 'low' | 'medium' | 'high' = 'low';
      
      const absChangePercent = Math.abs(changePercent);
      
      if (absChangePercent > 1) { // More than 1% change
        if (key === 'memoryUsage' || key.includes('Time')) {
          // For memory and time metrics, lower is better
          status = change < 0 ? 'improved' : 'degraded';
        } else {
          // For other metrics, higher might be better (context dependent)
          status = change > 0 ? 'improved' : 'degraded';
        }
        
        if (absChangePercent > 20) significance = 'high';
        else if (absChangePercent > 10) significance = 'medium';
        else significance = 'low';
        
        if (significance !== 'low') totalSignificantChanges++;
        if (status === 'improved') improvementCount++;
        if (status === 'degraded') degradationCount++;
      }

      metrics[key] = {
        baseline: baselineValue,
        current: currentValue,
        change,
        changePercent,
        status,
        significance
      };
    });

    // Determine overall status
    let overall: 'improved' | 'degraded' | 'stable' = 'stable';
    if (improvementCount > degradationCount) overall = 'improved';
    else if (degradationCount > improvementCount) overall = 'degraded';

    // Calculate performance score (0-100)
    const score = Math.max(0, Math.min(100, 
      50 + (improvementCount - degradationCount) * 10 - totalSignificantChanges * 5
    ));

    // Generate recommendations
    const recommendations = this.generateRecommendations(baseline, current, metrics);

    // Generate summary
    const summary = this.generateComparisonSummary(overall, improvementCount, degradationCount, totalSignificantChanges);

    return {
      overall,
      score,
      metrics,
      recommendations,
      summary
    };
  }

  private generateRecommendations(
    baseline: PerformanceBenchmark,
    current: PerformanceBenchmark,
    metrics: ComparisonResult['metrics']
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for significant performance degradations
    Object.entries(metrics).forEach(([key, metric]) => {
      if (metric.status === 'degraded' && metric.significance === 'high') {
        if (key === 'startupTime') {
          recommendations.push({
            id: 'startup-optimization',
            type: 'code',
            priority: 'high',
            title: 'Optimize Application Startup',
            description: `Startup time has increased by ${metric.changePercent.toFixed(1)}%. Consider optimizing module loading and initialization.`,
            impact: 'Faster application loading and better user experience',
            implementation: {
              steps: [
                'Review module loading order and dependencies',
                'Implement lazy loading for non-critical modules',
                'Optimize initialization code paths',
                'Consider code splitting strategies'
              ],
              estimatedEffort: '2-4 hours',
              riskLevel: 'medium'
            },
            expectedImprovement: {
              metric: 'startupTime',
              improvement: '10-30% reduction'
            }
          });
        }

        if (key === 'memoryUsage') {
          recommendations.push({
            id: 'memory-optimization',
            type: 'code',
            priority: 'high',
            title: 'Optimize Memory Usage',
            description: `Memory usage has increased by ${metric.changePercent.toFixed(1)}%. Review for potential memory leaks.`,
            impact: 'Reduced memory consumption and better performance',
            implementation: {
              steps: [
                'Run memory profiling to identify leaks',
                'Review component cleanup and unmounting',
                'Optimize data caching strategies',
                'Check for circular references'
              ],
              estimatedEffort: '3-6 hours',
              riskLevel: 'medium'
            },
            expectedImprovement: {
              metric: 'memoryUsage',
              improvement: '15-25% reduction'
            }
          });
        }
      }
    });

    // Configuration-based recommendations
    if (current.configuration.features.performanceOptimizations !== baseline.configuration.features.performanceOptimizations) {
      recommendations.push({
        id: 'performance-config',
        type: 'configuration',
        priority: 'medium',
        title: 'Review Performance Configuration',
        description: 'Performance optimization settings have changed. Verify optimal configuration.',
        impact: 'Consistent performance optimization',
        implementation: {
          steps: [
            'Review current performance optimization settings',
            'Compare with baseline configuration',
            'Test different optimization combinations',
            'Document optimal settings'
          ],
          estimatedEffort: '1-2 hours',
          riskLevel: 'low'
        },
        expectedImprovement: {
          metric: 'overall',
          improvement: '5-15% improvement'
        }
      });
    }

    return recommendations;
  }

  private generateComparisonSummary(
    overall: 'improved' | 'degraded' | 'stable',
    improvementCount: number,
    degradationCount: number,
    significantChanges: number
  ): string {
    if (overall === 'improved') {
      return `Performance has improved with ${improvementCount} metrics showing gains and ${degradationCount} showing degradation. ${significantChanges} significant changes detected.`;
    } else if (overall === 'degraded') {
      return `Performance has degraded with ${degradationCount} metrics showing decline and ${improvementCount} showing improvement. ${significantChanges} significant changes detected.`;
    } else {
      return `Performance is stable with ${improvementCount} improvements and ${degradationCount} degradations. ${significantChanges} significant changes detected.`;
    }
  }

  public detectRegression(benchmarks: PerformanceBenchmark[], baselineId?: string): RegressionResult {
    if (benchmarks.length < 2) {
      return {
        detected: false,
        severity: 'low',
        affectedMetrics: [],
        possibleCauses: [],
        recommendations: [],
        confidence: 0
      };
    }

    // Use provided baseline or find the most recent baseline
    let baseline: PerformanceBenchmark | undefined;
    if (baselineId) {
      baseline = this.getBaseline(baselineId);
    } else {
      const baselines = this.getBaselines();
      baseline = baselines[0]; // Most recent baseline
    }

    if (!baseline) {
      // Use first benchmark as baseline if no baseline exists
      baseline = benchmarks[0];
    }

    const recent = benchmarks.slice(0, 5); // Last 5 benchmarks
    const affectedMetrics: string[] = [];
    let maxDegradation = 0;

    // Check each metric for regression
    Object.keys(baseline.metrics).forEach(key => {
      const baselineValue = baseline!.metrics[key as keyof typeof baseline.metrics];
      const recentValues = recent.map(b => b.metrics[key as keyof typeof b.metrics]);
      const avgRecent = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      
      const change = avgRecent - baselineValue;
      const changePercent = baselineValue > 0 ? Math.abs(change / baselineValue) * 100 : 0;
      
      // For time and memory metrics, increase is degradation
      if ((key.includes('Time') || key === 'memoryUsage') && change > 0 && changePercent > 15) {
        affectedMetrics.push(key);
        maxDegradation = Math.max(maxDegradation, changePercent);
      }
    });

    const detected = affectedMetrics.length > 0;
    let severity: RegressionResult['severity'] = 'low';
    
    if (maxDegradation > 50) severity = 'critical';
    else if (maxDegradation > 30) severity = 'high';
    else if (maxDegradation > 15) severity = 'medium';

    const confidence = Math.min(1, affectedMetrics.length * 0.3 + (maxDegradation / 100));

    return {
      detected,
      severity,
      affectedMetrics,
      possibleCauses: this.generatePossibleCauses(affectedMetrics),
      recommendations: this.generateRegressionRecommendations(affectedMetrics, severity),
      confidence
    };
  }

  private generatePossibleCauses(affectedMetrics: string[]): string[] {
    const causes: string[] = [];
    
    if (affectedMetrics.includes('startupTime')) {
      causes.push('New modules or dependencies added');
      causes.push('Initialization code changes');
      causes.push('Network latency issues');
    }
    
    if (affectedMetrics.includes('memoryUsage')) {
      causes.push('Memory leaks in components');
      causes.push('Increased data caching');
      causes.push('Circular references');
    }
    
    if (affectedMetrics.includes('moduleLoadingTime')) {
      causes.push('Module bundling changes');
      causes.push('Network connectivity issues');
      causes.push('Code splitting modifications');
    }
    
    return causes;
  }

  private generateRegressionRecommendations(affectedMetrics: string[], severity: RegressionResult['severity']): string[] {
    const recommendations: string[] = [];
    
    if (severity === 'critical' || severity === 'high') {
      recommendations.push('Immediately investigate performance degradation');
      recommendations.push('Consider rolling back recent changes');
    }
    
    if (affectedMetrics.includes('startupTime')) {
      recommendations.push('Profile application startup sequence');
      recommendations.push('Review recent module additions');
    }
    
    if (affectedMetrics.includes('memoryUsage')) {
      recommendations.push('Run memory leak detection');
      recommendations.push('Review component lifecycle management');
    }
    
    recommendations.push('Create new baseline after fixes');
    recommendations.push('Implement automated regression testing');
    
    return recommendations;
  }

  public exportBenchmarks(): string {
    const storage = this.getStorage();
    return JSON.stringify({
      ...storage,
      exportedAt: new Date().toISOString(),
      exportedBy: 'SchoolPilot3 Performance Benchmark System'
    }, null, 2);
  }

  public importBenchmarks(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      if (imported.baselines && imported.benchmarks) {
        const storage = this.getStorage();
        
        // Merge imported data with existing data
        storage.baselines = [...storage.baselines, ...imported.baselines];
        storage.benchmarks = [...storage.benchmarks, ...imported.benchmarks];
        
        // Remove duplicates and limit storage
        storage.baselines = storage.baselines
          .filter((baseline, index, self) => 
            index === self.findIndex(b => b.id === baseline.id)
          )
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_BASELINES);
          
        storage.benchmarks = storage.benchmarks
          .filter((benchmark, index, self) => 
            index === self.findIndex(b => b.id === benchmark.id)
          )
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_BENCHMARKS);
        
        this.saveStorage(storage);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import benchmarks:', error);
      return false;
    }
  }

  public clearAllData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.initializeStorage();
    } catch (error) {
      console.error('Failed to clear benchmark data:', error);
    }
  }
}

// Singleton instance
export const performanceBenchmarkService = new PerformanceBenchmarkService();
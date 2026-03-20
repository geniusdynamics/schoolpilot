/**
 * Analytics Engine
 * 
 * Core analytics processing engine for dashboards and reports.
 */

import type { AnalyticsQuery, AnalyticsResult, ChartConfig, MetricCard } from './types';

export class AnalyticsEngine {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  // ============================================================================
  // Query Execution
  // ============================================================================

  /**
   * Execute analytics query
   */
  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);

    // Check cache
    const cached = this.getCached(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          queryTime: Date.now() - startTime,
          cached: true,
        },
      };
    }

    // Execute query (this would connect to actual data sources)
    const result = await this.runQuery(query);

    // Cache result
    this.setCached(cacheKey, result);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        queryTime: Date.now() - startTime,
        cached: false,
      },
    };
  }

  /**
   * Generate chart configuration
   */
  generateChart(
    data: Record<string, any>[],
    type: ChartConfig['type'],
    options: {
      labelField: string;
      valueField: string;
      title?: string;
      colors?: string[];
    }
  ): ChartConfig {
    const { labelField, valueField, title, colors } = options;

    const labels = data.map(d => d[labelField]);
    const values = data.map(d => d[valueField]);

    const defaultColors = [
      '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    ];

    return {
      type,
      data: {
        labels,
        datasets: [{
          label: title || valueField,
          data: values,
          backgroundColor: type === 'pie' || type === 'doughnut' 
            ? (colors || defaultColors).slice(0, values.length)
            : colors?.[0] || defaultColors[0],
          borderColor: colors?.[0] || defaultColors[0],
          borderWidth: 1,
          fill: type === 'line',
          tension: type === 'line' ? 0.4 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: title ? { display: true, text: title } : undefined,
          legend: {
            display: type === 'pie' || type === 'doughnut',
            position: 'right',
          },
        },
        scales: type === 'line' || type === 'bar' ? {
          x: { title: { display: true, text: labelField } },
          y: { title: { display: true, text: valueField }, beginAtZero: true },
        } : undefined,
      },
    };
  }

  /**
   * Calculate metrics
   */
  calculateMetrics(data: Record<string, any>[], metrics: string[]): MetricCard[] {
    const results: MetricCard[] = [];

    for (const metric of metrics) {
      switch (metric) {
        case 'totalStudents':
          results.push({
            id: 'totalStudents',
            title: 'Total Students',
            value: data.length,
            icon: 'Users',
            format: 'number',
          });
          break;

        case 'averageAttendance': {
          const avgAttendance = data.reduce((sum, d) => sum + (d.attendanceRate || 0), 0) / data.length;
          results.push({
            id: 'averageAttendance',
            title: 'Average Attendance',
            value: avgAttendance,
            icon: 'CalendarCheck',
            format: 'percentage',
            suffix: '%',
          });
          break;
        }
        case 'totalFees': {
          const totalFees = data.reduce((sum, d) => sum + (d.amount || 0), 0);
          results.push({
            id: 'totalFees',
            title: 'Total Fees',
            value: totalFees,
            icon: 'DollarSign',
            format: 'currency',
            prefix: '$',
          });
          break;
        }
        case 'passRate': {
          const passed = data.filter(d => d.grade !== 'F').length;
          const passRate = data.length > 0 ? (passed / data.length) * 100 : 0;
          results.push({
            id: 'passRate',
            title: 'Pass Rate',
            value: passRate,
            icon: 'GraduationCap',
            format: 'percentage',
            suffix: '%',
          });
          break;
        }
        case 'newAdmissions': {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const newStudents = data.filter(d => new Date(d.admissionDate) >= thirtyDaysAgo).length;
          results.push({
            id: 'newAdmissions',
            title: 'New Admissions (30d)',
            value: newStudents,
            icon: 'UserPlus',
            format: 'number',
          });
          break;
        }
        case 'genderRatio': {
          const males = data.filter(d => d.gender === 'male').length;
          const females = data.filter(d => d.gender === 'female').length;
          results.push({
            id: 'genderRatio',
            title: 'Gender Ratio',
            value: `${males}:${females}`,
            icon: 'Users',
            format: 'number',
          });
          break;
        }

        default:
          // Custom metric calculation
          if (metric.startsWith('sum:')) {
            const field = metric.split(':')[1];
            const sum = data.reduce((acc, d) => acc + (d[field] || 0), 0);
            results.push({
              id: metric,
              title: `Total ${field}`,
              value: sum,
              icon: 'Calculator',
              format: 'number',
            });
          } else if (metric.startsWith('avg:')) {
            const field = metric.split(':')[1];
            const avg = data.reduce((acc, d) => acc + (d[field] || 0), 0) / data.length;
            results.push({
              id: metric,
              title: `Average ${field}`,
              value: avg,
              icon: 'BarChart2',
              format: 'number',
            });
          }
      }
    }

    return results;
  }

  // ============================================================================
  // Aggregations
  // ============================================================================

  /**
   * Group data by field
   */
  groupBy(data: Record<string, any>[], field: string): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const key = item[field];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Aggregate data
   */
  aggregate(
    data: Record<string, any>[],
    groupField: string,
    aggField: string,
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  ): Record<string, any>[] {
    const groups = this.groupBy(data, groupField);

    return Object.entries(groups).map(([key, items]) => {
      let value: number;

      switch (operation) {
        case 'sum':
          value = items.reduce((sum, item) => sum + (item[aggField] || 0), 0);
          break;
        case 'avg':
          value = items.reduce((sum, item) => sum + (item[aggField] || 0), 0) / items.length;
          break;
        case 'count':
          value = items.length;
          break;
        case 'min':
          value = Math.min(...items.map(item => item[aggField] || 0));
          break;
        case 'max':
          value = Math.max(...items.map(item => item[aggField] || 0));
          break;
        default:
          value = 0;
      }

      return {
        [groupField]: key,
        [aggField]: value,
        count: items.length,
      };
    });
  }

  /**
   * Calculate trend (percentage change)
   */
  calculateTrend(current: number, previous: number): { change: number; type: 'increase' | 'decrease' | 'neutral' } {
    if (previous === 0) {
      return { change: current > 0 ? 100 : 0, type: current > 0 ? 'increase' : 'neutral' };
    }

    const change = ((current - previous) / previous) * 100;
    
    if (change > 0) {
      return { change: Math.abs(change), type: 'increase' };
    } else if (change < 0) {
      return { change: Math.abs(change), type: 'decrease' };
    }
    
    return { change: 0, type: 'neutral' };
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private generateCacheKey(query: AnalyticsQuery): string {
    return `analytics:${JSON.stringify(query)}`;
  }

  private getCached(key: string): AnalyticsResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCached(key: string, data: AnalyticsResult): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async runQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    // This would connect to actual data sources
    // For now, return mock data
    
    const mockData: Record<string, any>[] = [];
    
    // Generate mock data based on query
    for (let i = 0; i < 100; i++) {
      mockData.push({
        id: `item-${i}`,
        value: Math.floor(Math.random() * 100),
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    return {
      data: mockData,
      summary: {
        total: mockData.length,
        average: mockData.reduce((sum, d) => sum + d.value, 0) / mockData.length,
      },
      metadata: {
        queryTime: 0,
        rowCount: mockData.length,
      },
    };
  }
}

// Singleton instance
let analyticsInstance: AnalyticsEngine | null = null;

export function getAnalytics(): AnalyticsEngine {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsEngine();
  }
  return analyticsInstance;
}

export default AnalyticsEngine;

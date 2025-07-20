// ABOUTME: Performance dashboard component for detailed performance analysis
// ABOUTME: Provides comprehensive performance metrics and analysis tools

import React, { useState, useEffect } from 'react';
import { performanceMonitor, PerformanceReport } from '../services/performanceMonitor';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import PerformanceBenchmark from './PerformanceBenchmark';

interface PerformanceDashboardProps {
  className?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className = '' }) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'modules' | 'data' | 'interactions' | 'charts' | 'benchmarks'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { trackUserInteraction } = usePerformanceMonitoring({
    componentName: 'PerformanceDashboard'
  });

  // Update performance report
  useEffect(() => {
    const updateReport = () => {
      const newReport = performanceMonitor.getPerformanceReport();
      setReport(newReport);
    };

    updateReport(); // Initial load
    
    if (autoRefresh) {
      const interval = setInterval(updateReport, 2000); // 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(1)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getPerformanceGrade = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (value <= thresholds.fair) return { grade: 'B', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { grade: 'C', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const handleViewChange = (view: typeof activeView) => {
    trackUserInteraction('change_performance_view', { view });
    setActiveView(view);
  };

  if (!report) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Real-time application performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={() => {
              trackUserInteraction('refresh_performance_data');
              setReport(performanceMonitor.getPerformanceReport());
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'modules', label: 'Modules', icon: '📦' },
          { key: 'data', label: 'Data Ops', icon: '💾' },
          { key: 'interactions', label: 'User Actions', icon: '👆' },
          { key: 'charts', label: 'Charts', icon: '📈' },
          { key: 'benchmarks', label: 'Benchmarks', icon: '🎯' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleViewChange(tab.key as typeof activeView)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              activeView === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Startup Time */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Startup Time</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(report.startupTime)}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  getPerformanceGrade(report.startupTime, { good: 2000, fair: 5000 }).bg
                } ${getPerformanceGrade(report.startupTime, { good: 2000, fair: 5000 }).color}`}>
                  Grade {getPerformanceGrade(report.startupTime, { good: 2000, fair: 5000 }).grade}
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{formatMemory(report.memoryUsage)}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  getPerformanceGrade(report.memoryUsage / (1024 * 1024), { good: 50, fair: 100 }).bg
                } ${getPerformanceGrade(report.memoryUsage / (1024 * 1024), { good: 50, fair: 100 }).color}`}>
                  Grade {getPerformanceGrade(report.memoryUsage / (1024 * 1024), { good: 50, fair: 100 }).grade}
                </div>
              </div>
            </div>

            {/* Module Loading */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Module Load</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(report.moduleLoadingTime)}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  getPerformanceGrade(report.moduleLoadingTime, { good: 500, fair: 1000 }).bg
                } ${getPerformanceGrade(report.moduleLoadingTime, { good: 500, fair: 1000 }).color}`}>
                  Grade {getPerformanceGrade(report.moduleLoadingTime, { good: 500, fair: 1000 }).grade}
                </div>
              </div>
            </div>

            {/* User Interactions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Interaction</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(report.averageInteractionTime)}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  getPerformanceGrade(report.averageInteractionTime, { good: 100, fair: 300 }).bg
                } ${getPerformanceGrade(report.averageInteractionTime, { good: 100, fair: 300 }).color}`}>
                  Grade {getPerformanceGrade(report.averageInteractionTime, { good: 100, fair: 300 }).grade}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'modules' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Loading Performance</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                <div>Module</div>
                <div>Load Time</div>
                <div>Status</div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {performanceMonitor.getModuleMetrics().slice(0, 20).map((metric, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100">
                    <div className="font-medium text-gray-900">{metric.moduleId}</div>
                    <div className={`font-medium ${
                      metric.loadTime < 500 ? 'text-green-600' : 
                      metric.loadTime < 1000 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatTime(metric.loadTime)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        metric.success ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className={metric.success ? 'text-green-600' : 'text-red-600'}>
                        {metric.success ? 'Success' : 'Failed'}
                      </span>
                      {metric.fromCache && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                          Cached
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'data' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Operation Performance</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                <div>Operation</div>
                <div>Entity</div>
                <div>Duration</div>
                <div>Records</div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {performanceMonitor.getDataMetrics().slice(0, 20).map((metric, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100">
                    <div className="font-medium text-gray-900 capitalize">{metric.operation}</div>
                    <div className="text-gray-600">{metric.entity}</div>
                    <div className={`font-medium ${
                      metric.duration < 100 ? 'text-green-600' : 
                      metric.duration < 500 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatTime(metric.duration)}
                    </div>
                    <div className="text-gray-600">{metric.recordCount || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'interactions' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Interaction Performance</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                <div>Action</div>
                <div>Component</div>
                <div>Response Time</div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {performanceMonitor.getInteractionMetrics().slice(0, 20).map((metric, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 text-sm py-2 border-b border-gray-100">
                    <div className="font-medium text-gray-900">{metric.action}</div>
                    <div className="text-gray-600">{metric.component}</div>
                    <div className={`font-medium ${
                      metric.duration < 100 ? 'text-green-600' : 
                      metric.duration < 300 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatTime(metric.duration)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'charts' && (
          <div className="space-y-6">
            {/* Performance Trends */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
              <div className="text-center text-gray-500 py-8">
                <p>📈 Performance charts would be implemented here</p>
                <p className="text-sm mt-2">Consider integrating with Chart.js or Recharts for visualization</p>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Metrics Collected</h4>
                  <p className="text-2xl font-bold text-blue-600">{report.totalMetrics}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Last Updated</h4>
                  <p className="text-sm text-gray-600">{report.lastUpdated.toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'benchmarks' && (
          <PerformanceBenchmark />
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last updated: {report.lastUpdated.toLocaleTimeString()}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                trackUserInteraction('clear_performance_data');
                performanceMonitor.clearOldMetrics(0);
                setReport(performanceMonitor.getPerformanceReport());
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              Clear Data
            </button>
            <button
              onClick={() => {
                trackUserInteraction('export_performance_report');
                const data = performanceMonitor.exportMetrics();
                console.log('Performance Report Export:', data);
                // Could also trigger download
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
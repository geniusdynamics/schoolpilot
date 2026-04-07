// ABOUTME: Performance monitoring display component for development and debugging
// ABOUTME: Shows real-time performance metrics and allows performance analysis

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitor, PerformanceReport } from '../services/performance/performanceMonitor';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { usePerformanceEvents } from '../services/performance/performanceEventManager';

interface PerformanceMonitorProps {
  className?: string;
  refreshInterval?: number;
  showDetails?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  refreshInterval = 15000, // 15 seconds (reduced frequency to prevent flickering)
  showDetails = false
}) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'data' | 'interactions'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false); // Auto-refresh toggle (default OFF)
  
  const { trackUserInteraction } = usePerformanceMonitoring({
    componentName: 'PerformanceMonitor'
  });

  // Use event-driven performance updates
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const { shouldRefresh, emitEvent } = usePerformanceEvents(
    (event) => {
      // Only refresh if widget is visible and enough time has passed
      if (isVisible && shouldRefresh(lastRefresh, 2000)) {
        updateReport();
        setLastRefresh(Date.now());
      }
    },
    ['navigation', 'data_operation', 'manual_refresh', 'tab_switch']
  );

  // Update performance report - Event-driven approach with optional auto-refresh
  const updateReport = useCallback(() => {
    if (!isVisible) return;
    
    try {
      const newReport = performanceMonitor.getPerformanceReport();
      setReport(prevReport => {
        // Only update if there are meaningful changes
        if (!prevReport || 
            Math.abs(newReport.startupTime - prevReport.startupTime) > 100 ||
            newReport.totalMetrics !== prevReport.totalMetrics) {
          return newReport;
        }
        return prevReport;
      });
    } catch (error) {
      console.warn('Error updating performance report:', error);
    }
  }, [isVisible]);

  // Initial load when component becomes visible
  useEffect(() => {
    if (isVisible) {
      updateReport();
    }
  }, [isVisible, updateReport]);

  // Optional auto-refresh (only if explicitly enabled by user)
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isVisible) {
        updateReport();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isVisible, autoRefresh, updateReport]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    emitEvent('manual_refresh', 'performance_monitor');
    updateReport();
    setLastRefresh(Date.now());
  }, [emitEvent, updateReport]);

  // Component is now controlled by feature flag in App.tsx

  const handleToggleVisibility = () => {
    trackUserInteraction('toggle_performance_monitor');
    setIsVisible(!isVisible);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    trackUserInteraction('change_performance_tab', { tab });
    setActiveTab(tab);
    // Emit event for tab change (will trigger refresh if needed)
    emitEvent('user_interaction', 'performance_monitor', { action: 'tab_change', tab });
  };

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

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleToggleVisibility}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
          title="Show Performance Monitor"
        >
          📊 Perf
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 ${className}`}>
      <div className="p-4 max-w-md max-h-96 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Performance Monitor</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleManualRefresh}
              className="text-blue-500 hover:text-blue-700 text-sm"
              title="Refresh data"
            >
              🔄
            </button>
            <button
              onClick={handleToggleVisibility}
              className="text-gray-500 hover:text-gray-700 text-xl"
              title="Hide Performance Monitor"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Auto-refresh toggle */}
        <div className="flex items-center mb-3 text-xs">
          <input
            type="checkbox"
            id="perfMonitorAutoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor="perfMonitorAutoRefresh" className="text-gray-600">
            Auto-refresh (may cause UI updates)
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-3 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'modules', label: 'Modules' },
            { key: 'data', label: 'Data' },
            { key: 'interactions', label: 'UI' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as typeof activeTab)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {report && (
          <div className="space-y-3">
            {activeTab === 'overview' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-green-800 font-medium">Startup Time</div>
                    <div className="text-green-600">{formatTime(report.startupTime)}</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-blue-800 font-medium">Memory Usage</div>
                    <div className="text-blue-600">{formatMemory(report.memoryUsage)}</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-purple-800 font-medium">Avg Module Load</div>
                    <div className="text-purple-600">{formatTime(report.moduleLoadingTime)}</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <div className="text-orange-800 font-medium">Avg Interaction</div>
                    <div className="text-orange-600">{formatTime(report.averageInteractionTime)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {report.totalMetrics} metrics collected
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Module Loading Times</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {performanceMonitor.getModuleMetrics().slice(-10).map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{metric.moduleId}</span>
                      <span className={`font-medium ${
                        metric.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatTime(metric.loadTime)}
                        {!metric.success && ' ❌'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">Data Operations</h4>
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Average Operation Time</div>
                  <div className="font-medium">{formatTime(report.averageDataOperationTime)}</div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {performanceMonitor.getDataMetrics().slice(-5).map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">
                        {metric.operation} {metric.entity}
                      </span>
                      <span className="font-medium">{formatTime(metric.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'interactions' && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">User Interactions</h4>
                <div className="text-sm bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Average Response Time</div>
                  <div className="font-medium">{formatTime(report.averageInteractionTime)}</div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {performanceMonitor.getInteractionMetrics().slice(-5).map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">
                        {metric.action} on {metric.component}
                      </span>
                      <span className="font-medium">{formatTime(metric.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                trackUserInteraction('clear_performance_metrics');
                performanceMonitor.clearOldMetrics(0); // Clear all metrics
                handleManualRefresh(); // Use the event-driven refresh
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              Clear Metrics
            </button>
            <button
              onClick={() => {
                trackUserInteraction('export_performance_data');
                const data = performanceMonitor.exportMetrics();
                console.log('Performance Data Export:', data);
                // Could also download as JSON file
              }}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
            >
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
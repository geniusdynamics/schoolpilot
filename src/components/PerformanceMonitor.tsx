import { logger } from '@/utils/logging';

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
      logger.warn('Error updating performance report:', error);
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
          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
          title="Show Performance Monitor"
        >
          📊 Perf
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-surface-card rounded-lg shadow-xl border border-surface-border ${className}`}>
      <div className="p-4 max-w-md max-h-96 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-surface-foreground">Performance Monitor</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleManualRefresh}
              className="text-primary-500 hover:text-primary-700 text-sm"
              title="Refresh data"
            >
              🔄
            </button>
            <button
              onClick={handleToggleVisibility}
              className="text-surface-muted-fg hover:text-surface-foreground text-xl"
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
          <label htmlFor="perfMonitorAutoRefresh" className="text-surface-muted-fg">
            Auto-refresh (may cause UI updates)
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-3 bg-surface-accent rounded-lg p-1">
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
                  ? 'bg-surface-card text-primary-600 shadow-sm'
                  : 'text-surface-muted-fg hover:text-surface-foreground'
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
                  <div className="bg-primary-50 p-2 rounded">
                    <div className="text-primary-800 font-medium">Memory Usage</div>
                    <div className="text-primary-600">{formatMemory(report.memoryUsage)}</div>
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
                <div className="text-xs text-surface-muted-fg text-center">
                  {report.totalMetrics} metrics collected
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-2">
                <h4 className="font-medium text-surface-foreground">Module Loading Times</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {performanceMonitor.getModuleMetrics().slice(-10).map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-surface-muted-fg">{metric.moduleId}</span>
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
                <h4 className="font-medium text-surface-foreground">Data Operations</h4>
                <div className="text-sm bg-surface-muted p-2 rounded">
                  <div className="text-surface-muted-fg">Average Operation Time</div>
                  <div className="font-medium">{formatTime(report.averageDataOperationTime)}</div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {performanceMonitor.getDataMetrics().slice(-5).map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-surface-muted-fg">
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
                <h4 className="font-medium text-surface-foreground">User Interactions</h4>
                <div className="text-sm bg-surface-muted p-2 rounded">
                  <div className="text-surface-muted-fg">Average Response Time</div>
                  <div className="font-medium">{formatTime(report.averageInteractionTime)}</div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {performanceMonitor.getInteractionMetrics().slice(-5).map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-surface-muted-fg">
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
        <div className="mt-3 pt-3 border-t border-surface-border">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                trackUserInteraction('clear_performance_metrics');
                performanceMonitor.clearOldMetrics(0); // Clear all metrics
                handleManualRefresh(); // Use the event-driven refresh
              }}
              className="text-xs bg-surface-accent hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              Clear Metrics
            </button>
            <button
              onClick={() => {
                trackUserInteraction('export_performance_data');
                const data = performanceMonitor.exportMetrics();
                logger.info('Performance Data Export:', data);
                // Could also download as JSON file
              }}
              className="text-xs bg-primary-100 hover:bg-primary-200 text-primary-700 px-2 py-1 rounded transition-colors"
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
import { logger } from '@/utils/logging';

// ABOUTME: Standalone Performance Monitor Widget for feature flag controlled display
// ABOUTME: This is a simplified version of the PerformanceMonitor for widget use

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitor, PerformanceReport } from '../services/performance/performanceMonitor';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

interface PerformanceMonitorWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  refreshInterval?: number;
  showDetails?: boolean;
}

const PerformanceMonitorWidget: React.FC<PerformanceMonitorWidgetProps> = ({
  className = '',
  position = 'bottom-right',
  refreshInterval = 10000, // 10 seconds
  showDetails = false
}) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false); // Auto-refresh toggle, default OFF
  
  const { trackUserInteraction } = usePerformanceMonitoring({
    componentName: 'PerformanceMonitorWidget'
  });

  // Position classes mapping
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  // Update performance report
  const updateReport = useCallback(() => {
    try {
      const newReport = performanceMonitor.getPerformanceReport();
      setReport(newReport);
    } catch (error) {
      logger.warn('Error updating performance report:', error);
    }
  }, []);

  // Initial load and optional auto-refresh
  useEffect(() => {
    updateReport();
  }, [updateReport]);

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

  // Handle toggle expansion
  const handleToggleExpanded = () => {
    trackUserInteraction('toggle_widget_expansion');
    setIsExpanded(!isExpanded);
  };

  // Handle hide widget
  const handleHideWidget = () => {
    trackUserInteraction('hide_widget');
    setIsVisible(false);
  };

  // Format utilities
  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatMemory = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  // Get performance status color
  const getPerformanceColor = () => {
    if (!report) return 'gray';
    
    if (report.startupTime > 5000 || report.memoryUsage > 100 * 1024 * 1024) {
      return 'red'; // Poor performance
    } else if (report.startupTime > 2000 || report.memoryUsage > 50 * 1024 * 1024) {
      return 'yellow'; // Moderate performance
    }
    return 'green'; // Good performance
  };

  if (!isVisible) {
    return null;
  }

  const performanceColor = getPerformanceColor();
  const colorClasses = {
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    red: 'bg-red-500 text-white',
    gray: 'bg-gray-500 text-white'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      {!isExpanded ? (
        // Collapsed view - small performance indicator
        <div 
          className={`${colorClasses[performanceColor]} px-3 py-2 rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity`}
          onClick={handleToggleExpanded}
          title="Click to expand performance details"
        >
          <div className="flex items-center space-x-2 text-sm font-medium">
            <span>ðŸ“Š</span>
            {report && (
              <div className="flex items-center space-x-1">
                <span>{formatTime(report.startupTime)}</span>
                <span>â€¢</span>
                <span>{formatMemory(report.memoryUsage)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Expanded view - detailed performance information
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">ðŸ“Š</span>
                Performance
              </h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={updateReport}
                  className="text-blue-500 hover:text-blue-700 text-sm p-1"
                  title="Refresh data"
                >
                  ðŸ”„
                </button>
                <button
                  onClick={handleToggleExpanded}
                  className="text-gray-500 hover:text-gray-700 text-sm p-1"
                  title="Collapse widget"
                >
                  âž–
                </button>
                <button
                  onClick={handleHideWidget}
                  className="text-gray-500 hover:text-gray-700 text-lg p-1"
                  title="Hide widget"
                >
                  Ã—
                </button>
              </div>
            </div>

            {/* Auto-refresh toggle */}
            <div className="mb-3">
              <label className="flex items-center text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2 h-3 w-3 text-blue-600 rounded"
                />
                Auto-refresh (may cause flickering)
              </label>
            </div>

            {/* Performance metrics */}
            {report ? (
              <div className="space-y-3">
                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-blue-800 font-medium">Startup</div>
                    <div className="text-blue-600">{formatTime(report.startupTime)}</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-green-800 font-medium">Memory</div>
                    <div className="text-green-600">{formatMemory(report.memoryUsage)}</div>
                  </div>
                </div>

                {/* Additional details if enabled */}
                {showDetails && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 border-t pt-2">
                      <div className="flex justify-between">
                        <span>Modules Loaded:</span>
                        <span>{report.moduleMetrics?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Metrics:</span>
                        <span>{report.totalMetrics}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Updated:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Performance status indicator */}
                    <div className="flex items-center space-x-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${
                        performanceColor === 'green' ? 'bg-green-400' :
                        performanceColor === 'yellow' ? 'bg-yellow-400' :
                        performanceColor === 'red' ? 'bg-red-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-gray-600">
                        {performanceColor === 'green' ? 'Good Performance' :
                         performanceColor === 'yellow' ? 'Moderate Performance' :
                         performanceColor === 'red' ? 'Poor Performance' : 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm">Loading metrics...</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitorWidget;

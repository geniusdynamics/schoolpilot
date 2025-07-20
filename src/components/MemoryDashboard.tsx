// ABOUTME: Memory usage dashboard component for monitoring and optimization
// ABOUTME: Provides comprehensive memory analytics and management tools

import React, { useState, useMemo } from 'react';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { memoryManager, MemoryAlert, MemoryReport } from '../services/memoryManager';

interface MemoryDashboardProps {
  className?: string;
}

const MemoryDashboard: React.FC<MemoryDashboardProps> = ({ className = '' }) => {
  const [activeView, setActiveView] = useState<'overview' | 'alerts' | 'components' | 'cache'>('overview');
  
  const {
    memoryReport,
    activeAlerts,
    forceCleanup,
    isMemoryHigh,
    memoryUsagePercent
  } = useMemoryManagement({
    componentName: 'MemoryDashboard',
    trackLifecycle: true,
    enableAlerts: true
  });

  // Memoized utility functions to prevent re-creation on every render
  const formatBytes = useMemo(() => (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatPercent = useMemo(() => (value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);

  const getMemoryGrade = useMemo(() => (percent: number) => {
    if (percent < 50) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (percent < 70) return { grade: 'B', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (percent < 90) return { grade: 'C', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-50' };
  }, []);

  const getAlertIcon = (type: 'warning' | 'critical') => {
    return type === 'critical' ? '🚨' : '⚠️';
  };

  if (!memoryReport) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading memory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Memory Dashboard</h2>
          <p className="text-gray-600">Real-time memory usage monitoring and optimization</p>
        </div>
        <div className="flex items-center space-x-4">
          {isMemoryHigh && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg">
              <span>🚨</span>
              <span className="text-sm font-medium">High Memory Usage</span>
            </div>
          )}
          <button
            onClick={forceCleanup}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Force Cleanup
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'alerts', label: `Alerts ${activeAlerts.length > 0 ? `(${activeAlerts.length})` : ''}`, icon: '🚨' },
          { key: 'components', label: 'Components', icon: '🧩' },
          { key: 'cache', label: 'Cache', icon: '💾' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key as typeof activeView)}
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
            {/* Memory Usage */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(memoryUsagePercent)}</p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(memoryReport.currentUsage.usedJSHeapSize)} / {formatBytes(memoryReport.currentUsage.jsHeapSizeLimit)}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  getMemoryGrade(memoryUsagePercent).bg
                } ${getMemoryGrade(memoryUsagePercent).color}`}>
                  Grade {getMemoryGrade(memoryUsagePercent).grade}
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      memoryUsagePercent > 90 ? 'bg-red-500' :
                      memoryUsagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(memoryUsagePercent, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  activeAlerts.length === 0 ? 'bg-green-50 text-green-600' :
                  activeAlerts.some(a => a.type === 'critical') ? 'bg-red-50 text-red-600' :
                  'bg-yellow-50 text-yellow-600'
                }`}>
                  {activeAlerts.length === 0 ? 'All Clear' :
                   activeAlerts.some(a => a.type === 'critical') ? 'Critical' : 'Warning'}
                </div>
              </div>
            </div>

            {/* Cache Metrics */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(memoryReport.cacheMetrics.hitRate * 100)}</p>
                  <p className="text-xs text-gray-500">
                    {memoryReport.cacheMetrics.totalEntries} entries
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  memoryReport.cacheMetrics.hitRate > 0.8 ? 'bg-green-50 text-green-600' :
                  memoryReport.cacheMetrics.hitRate > 0.5 ? 'bg-yellow-50 text-yellow-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {memoryReport.cacheMetrics.hitRate > 0.8 ? 'Excellent' :
                   memoryReport.cacheMetrics.hitRate > 0.5 ? 'Good' : 'Poor'}
                </div>
              </div>
            </div>

            {/* Component Count */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tracked Components</p>
                  <p className="text-2xl font-bold text-gray-900">{memoryReport.componentMetrics.length}</p>
                  <p className="text-xs text-gray-500">
                    {memoryReport.componentMetrics.filter(c => !c.unmountTime).length} active
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'alerts' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Alerts</h3>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-500 text-4xl mb-2">✅</div>
                  <p className="text-gray-600">No active memory alerts</p>
                  <p className="text-sm text-gray-500 mt-1">Memory usage is within normal limits</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.type === 'critical' 
                          ? 'bg-red-50 border-red-400' 
                          : 'bg-yellow-50 border-yellow-400'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="text-xl mr-3">{getAlertIcon(alert.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium ${
                              alert.type === 'critical' ? 'text-red-800' : 'text-yellow-800'
                            }`}>
                              {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
                            </h4>
                            <span className="text-xs text-gray-500">
                              {alert.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className={`mt-1 ${
                            alert.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            {alert.message}
                          </p>
                          <div className="mt-2 text-sm text-gray-600">
                            Threshold: {formatPercent(alert.threshold * 100)} | 
                            Current: {formatPercent(alert.currentUsage * 100)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'components' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Memory Tracking</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Component
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Memory Delta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lifespan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mount Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {memoryReport.componentMetrics.slice(-20).map((component, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {component.componentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            component.unmountTime 
                              ? 'bg-gray-100 text-gray-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {component.unmountTime ? 'Unmounted' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {component.memoryDelta !== undefined ? (
                            <span className={component.memoryDelta > 0 ? 'text-red-600' : 'text-green-600'}>
                              {component.memoryDelta > 0 ? '+' : ''}{formatBytes(component.memoryDelta)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {component.lifespan ? `${(component.lifespan / 1000).toFixed(1)}s` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {component.mountTime.toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'cache' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {memoryReport.cacheMetrics.totalEntries}
                  </div>
                  <div className="text-sm text-blue-800">Total Entries</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatBytes(memoryReport.cacheMetrics.totalSize)}
                  </div>
                  <div className="text-sm text-green-800">Cache Size</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {memoryReport.cacheMetrics.evictionCount}
                  </div>
                  <div className="text-sm text-purple-800">Evictions</div>
                </div>
              </div>
              
              {/* Recommendations */}
              {memoryReport.recommendations.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {memoryReport.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-blue-500 mt-0.5">💡</span>
                        <span className="text-sm text-gray-700">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryDashboard;
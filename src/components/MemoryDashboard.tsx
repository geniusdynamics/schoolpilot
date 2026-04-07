// ABOUTME: Memory management dashboard component
// ABOUTME: Displays real-time memory metrics, alerts, and management controls

import React, { useState } from 'react';
import { useMemoryManagement, useMemoryAlerts } from '@/hooks/useMemoryManagement';
import Card from './ui/Card';
import Button from './ui/Button';
import {
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

interface MemoryDashboardProps {
  className?: string;
}

export const MemoryDashboard: React.FC<MemoryDashboardProps> = ({ className = '' }) => {
  const {
    metrics,
    history,
    activeAlerts,
    connectionStats,
    summary,
    thresholds,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    forceCleanup,
    resolveAlert,
    updateThresholds,
    refreshMetrics,
  } = useMemoryManagement();

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'connections' | 'settings'>('overview');
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [tempThresholds, setTempThresholds] = useState(thresholds);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getMemoryUsageColor = (percentage: number) => {
    if (percentage > thresholds.criticalThreshold) return 'text-red-600 bg-red-100';
    if (percentage > thresholds.warningThreshold) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const handleSaveThresholds = () => {
    updateThresholds(tempThresholds);
    setShowThresholdSettings(false);
  };

  const memoryUsagePercent = metrics?.memoryUsagePercent ?? 0;
  const usageColorClass = getMemoryUsageColor(memoryUsagePercent);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CpuChipIcon className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Memory Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshMetrics}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant={isMonitoring ? 'danger' : 'primary'}
            size="sm"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            leftIcon={isMonitoring ? <SignalIcon className="w-4 h-4" /> : <ChartBarIcon className="w-4 h-4" />}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {(['overview', 'alerts', 'connections', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Memory Usage Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${usageColorClass}`}>
                {formatPercentage(memoryUsagePercent)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics ? formatBytes(metrics.usedMemory) : '—'}
            </div>
            <div className="text-sm text-gray-500">
              of {metrics ? formatBytes(metrics.totalMemory) : '—'}
            </div>
          </Card>

          {/* Active Alerts Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Alerts</span>
              {activeAlerts.length > 0 ? (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900">{activeAlerts.length}</div>
            <div className="text-sm text-gray-500">
              {activeAlerts.length === 0 ? 'All clear' : `${activeAlerts.filter(a => a.severity === 'critical').length} critical`}
            </div>
          </Card>

          {/* Connections Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Connections</span>
              <SignalIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{connectionStats.active}</div>
            <div className="text-sm text-gray-500">
              {connectionStats.stale} stale
            </div>
          </Card>

          {/* Trend Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Trend</span>
              <ChartBarIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 capitalize">{summary.trend}</div>
            <div className="text-sm text-gray-500">
              {summary.recommendations.length} recommendations
            </div>
          </Card>

          {/* Recommendations */}
          {summary.recommendations.length > 0 && (
            <Card className="p-4 md:col-span-2 lg:col-span-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {summary.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <Cog6ToothIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Memory Alerts</h3>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{connectionStats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{connectionStats.active}</div>
              <div className="text-sm text-green-600">Active</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{connectionStats.stale}</div>
              <div className="text-sm text-yellow-600">Stale</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                {Object.keys(connectionStats.byProvider).length}
              </div>
              <div className="text-sm text-blue-600">Providers</div>
            </div>
          </div>
          {Object.entries(connectionStats.byProvider).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">By Provider</h4>
              <div className="space-y-1">
                {Object.entries(connectionStats.byProvider).map(([provider, count]) => (
                  <div key={provider} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600 capitalize">{provider}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Threshold Settings</h3>
          {!showThresholdSettings ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Warning Threshold</div>
                  <div className="text-xl font-bold text-yellow-600">
                    {formatPercentage(thresholds.warningThreshold)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Critical Threshold</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatPercentage(thresholds.criticalThreshold)}
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowThresholdSettings(true)}
                leftIcon={<Cog6ToothIcon className="w-4 h-4" />}
              >
                Edit Thresholds
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warning Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempThresholds.warningThreshold}
                  onChange={(e) =>
                    setTempThresholds((prev) => ({
                      ...prev,
                      warningThreshold: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Critical Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempThresholds.criticalThreshold}
                  onChange={(e) =>
                    setTempThresholds((prev) => ({
                      ...prev,
                      criticalThreshold: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleSaveThresholds}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTempThresholds(thresholds);
                    setShowThresholdSettings(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Force Cleanup */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Manual Actions</h4>
            <Button
              variant="danger"
              size="sm"
              onClick={forceCleanup}
              leftIcon={<TrashIcon className="w-4 h-4" />}
            >
              Force Cleanup
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MemoryDashboard;

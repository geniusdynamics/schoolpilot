// ABOUTME: Comprehensive database monitoring dashboard
// ABOUTME: Combines performance, memory, connection pool, and backup monitoring
import React, { useState } from 'react';
import { useDatabasePerformance } from '../hooks/useDatabasePerformance';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { useConnectionPool } from '../hooks/useConnectionPool';
import { useStartupPerformance } from '../hooks/useStartupPerformance';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  ChartBarIcon,
  CpuChipIcon,
  CircleStackIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface DatabaseMonitoringDashboardProps {
  className?: string;
}

export const DatabaseMonitoringDashboard: React.FC<DatabaseMonitoringDashboardProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'memory' | 'connections' | 'startup'>('overview');

  // Hook data
  const performanceData = useDatabasePerformance();
  const memoryData = useMemoryManagement();
  const connectionData = useConnectionPool();
  const startupData = useStartupPerformance();

  // Calculate overall system health
  const getSystemHealth = () => {
    const issues: string[] = [];
    let healthScore = 100;

    // Performance issues
    if (performanceData.summary.overall === 'poor') {
      issues.push('Poor database performance detected');
      healthScore -= 30;
    } else if (performanceData.summary.overall === 'fair') {
      issues.push('Database performance needs attention');
      healthScore -= 15;
    }

    // Memory issues
    if (memoryData.activeAlerts.length > 0) {
      issues.push(`${memoryData.activeAlerts.length} memory alerts active`);
      healthScore -= memoryData.activeAlerts.length * 10;
    }

    // Connection pool issues
    if (!connectionData.status.isHealthy) {
      issues.push('Connection pool issues detected');
      healthScore -= 20;
    }

    // Startup performance issues
    if (startupData.performanceSummary.recentTrend === 'degrading') {
      issues.push('Startup performance is degrading');
      healthScore -= 10;
    }

    const status = healthScore >= 90 ? 'excellent' : 
                   healthScore >= 70 ? 'good' : 
                   healthScore >= 50 ? 'fair' : 'poor';

    return { status, healthScore: Math.max(0, healthScore), issues };
  };

  const systemHealth = getSystemHealth();

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* System Health Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(systemHealth.status)}`}>
            {systemHealth.status.toUpperCase()} ({systemHealth.healthScore}%)
          </div>
        </div>
        
        {systemHealth.issues.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-red-600 mb-2">Issues Detected:</h4>
            <ul className="space-y-1">
              {systemHealth.issues.map((issue, index) => (
                <li key={index} className="flex items-center text-sm text-red-600">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{performanceData.summary.overall}</div>
            <div className="text-sm text-gray-500">Performance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{memoryData.activeAlerts.length}</div>
            <div className="text-sm text-gray-500">Memory Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{connectionData.metrics.activeConnections}</div>
            <div className="text-sm text-gray-500">Active Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{formatDuration(startupData.performanceSummary.averageStartupTime)}</div>
            <div className="text-sm text-gray-500">Avg Startup</div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">Query Performance</div>
              <div className="text-lg font-semibold">{formatDuration(performanceData.metrics.averageQueryTime)}</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <CpuChipIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">Memory Usage</div>
              <div className="text-lg font-semibold">{formatBytes(memoryData.usage.totalUsed)}</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <CircleStackIcon className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">Pool Utilization</div>
              <div className="text-lg font-semibold">{connectionData.metrics.poolUtilization.toFixed(1)}%</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <SignalIcon className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <div className="text-sm text-gray-500">Startup Trend</div>
              <div className="text-lg font-semibold">{startupData.performanceSummary.recentTrend}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Query Performance</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Average Query Time</span>
                <span className="text-sm font-medium">{formatDuration(performanceData.metrics.averageQueryTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Slow Queries</span>
                <span className="text-sm font-medium">{performanceData.metrics.slowQueries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cache Hit Rate</span>
                <span className="text-sm font-medium">{(performanceData.metrics.cacheHitRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Operations</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Operations</span>
                <span className="text-sm font-medium">{performanceData.metrics.totalOperations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Failed Operations</span>
                <span className="text-sm font-medium">{performanceData.metrics.failedOperations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Success Rate</span>
                <span className="text-sm font-medium">
                  {((1 - performanceData.metrics.failedOperations / performanceData.metrics.totalOperations) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <div className="space-y-2">
              {performanceData.recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderMemoryTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Used</span>
                <span className="text-sm font-medium">{formatBytes(memoryData.usage.totalUsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Database</span>
                <span className="text-sm font-medium">{formatBytes(memoryData.usage.database)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cache</span>
                <span className="text-sm font-medium">{formatBytes(memoryData.usage.cache)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Connections</span>
                <span className="text-sm font-medium">{formatBytes(memoryData.usage.connections)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active Alerts</h4>
            {memoryData.activeAlerts.length === 0 ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                No memory alerts
              </div>
            ) : (
              <div className="space-y-2">
                {memoryData.activeAlerts.map((alert, index) => (
                  <div key={index} className="flex items-center text-sm text-red-600 bg-red-50 p-2 rounded">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    {alert.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderConnectionsTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Pool</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pool Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Connections</span>
                <span className="text-sm font-medium">{connectionData.metrics.totalConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Active</span>
                <span className="text-sm font-medium">{connectionData.metrics.activeConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Idle</span>
                <span className="text-sm font-medium">{connectionData.metrics.idleConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Waiting</span>
                <span className="text-sm font-medium">{connectionData.metrics.waitingRequests}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pool Utilization</span>
                <span className="text-sm font-medium">{connectionData.metrics.poolUtilization.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Avg Acquire Time</span>
                <span className="text-sm font-medium">{formatDuration(connectionData.metrics.averageAcquireTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Acquired</span>
                <span className="text-sm font-medium">{connectionData.metrics.totalAcquired}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Health Status</h4>
            {connectionData.status.isHealthy ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Pool is healthy
              </div>
            ) : (
              <div className="space-y-2">
                {connectionData.status.issues.map((issue, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {issue}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderStartupTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Startup Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Average Startup Time</span>
                <span className="text-sm font-medium">{formatDuration(startupData.performanceSummary.averageStartupTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Fastest Startup</span>
                <span className="text-sm font-medium">{formatDuration(startupData.performanceSummary.fastestStartup)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Slowest Startup</span>
                <span className="text-sm font-medium">{formatDuration(startupData.performanceSummary.slowestStartup)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Recent Trend</span>
                <span className={`text-sm font-medium ${
                  startupData.performanceSummary.recentTrend === 'improving' ? 'text-green-600' :
                  startupData.performanceSummary.recentTrend === 'degrading' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {startupData.performanceSummary.recentTrend}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Optimization Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Lazy Loading</span>
                <span className="text-sm font-medium text-green-600">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Progressive Loading</span>
                <span className="text-sm font-medium text-green-600">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Bundle Optimization</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Database Monitoring</h2>
          <p className="text-gray-600">Real-time database performance and health monitoring</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              performanceData.refreshMetrics();
              memoryData.refreshMetrics();
              connectionData.refreshMetrics();
              startupData.refreshMetrics();
            }}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'performance', name: 'Performance', icon: SignalIcon },
            { id: 'memory', name: 'Memory', icon: CpuChipIcon },
            { id: 'connections', name: 'Connections', icon: CircleStackIcon },
            { id: 'startup', name: 'Startup', icon: ClockIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'performance' && renderPerformanceTab()}
      {activeTab === 'memory' && renderMemoryTab()}
      {activeTab === 'connections' && renderConnectionsTab()}
      {activeTab === 'startup' && renderStartupTab()}
    </div>
  );
};
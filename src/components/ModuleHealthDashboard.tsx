import { logger } from '@/utils/logging';

// Module Health Dashboard Component
// Displays real-time health status of all modules with recovery options

import React, { useState, useEffect } from 'react';
import { moduleHealthMonitor } from '../services/module/moduleHealthMonitor';
import { ModuleHealth, ModuleHealthStatus } from '../services/module/enhancedModuleLoader';
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, RefreshCwIcon, XCircleIcon } from './ui/icons';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';

interface ModuleHealthDashboardProps {
  showHealthyModules?: boolean;
  onlyShowIssues?: boolean;
  compact?: boolean;
  className?: string;
}

const ModuleHealthDashboard: React.FC<ModuleHealthDashboardProps> = ({
  showHealthyModules = true,
  onlyShowIssues = false,
  compact = false,
  className = ''
}) => {
  const [moduleHealth, setModuleHealth] = useState<Map<string, ModuleHealth>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reloadingModules, setReloadingModules] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Load module health data
  useEffect(() => {
    const loadHealthData = () => {
      const health = moduleHealthMonitor.getAllModuleHealth();
      setModuleHealth(health);
      setIsLoading(false);
    };

    loadHealthData();

    // Start monitoring if not already started
    moduleHealthMonitor.startMonitoring();

    // Set up subscription for all modules
    const unsubscribes: (() => void)[] = [];
    
    moduleHealthMonitor.getAllModuleHealth().forEach((_, moduleId) => {
      const unsubscribe = moduleHealthMonitor.subscribeToModuleHealth(moduleId, (health) => {
        setModuleHealth(prev => {
          const updated = new Map(prev);
          updated.set(moduleId, health);
          return updated;
        });
      });
      
      unsubscribes.push(unsubscribe);
    });

    // Clean up subscriptions
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [refreshKey]);

  // Handle module reload
  const handleReloadModule = async (moduleId: string) => {
    setReloadingModules(prev => new Set(prev).add(moduleId));
    
    try {
      await moduleHealthMonitor.reloadModule(moduleId);
      // Refresh the dashboard
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      logger.error(`Failed to reload module ${moduleId}:`, error);
    } finally {
      setReloadingModules(prev => {
        const updated = new Set(prev);
        updated.delete(moduleId);
        return updated;
      });
    }
  };

  // Handle refresh all
  const handleRefreshAll = async () => {
    setIsLoading(true);
    await moduleHealthMonitor.checkAllModules();
    setRefreshKey(prev => prev + 1);
  };

  // Filter modules based on props
  const filteredModules = Array.from(moduleHealth.values()).filter(health => {
    if (onlyShowIssues) {
      return health.status === ModuleHealthStatus.ERROR || health.status === ModuleHealthStatus.WARNING;
    }
    
    if (!showHealthyModules) {
      return health.status !== ModuleHealthStatus.HEALTHY;
    }
    
    return true;
  });

  // Sort modules by status (errors first, then warnings, then others)
  const sortedModules = [...filteredModules].sort((a, b) => {
    const statusPriority = {
      [ModuleHealthStatus.ERROR]: 0,
      [ModuleHealthStatus.FAILED]: 1,
      [ModuleHealthStatus.WARNING]: 2,
      [ModuleHealthStatus.LOADING]: 3,
      [ModuleHealthStatus.DISABLED]: 4,
      [ModuleHealthStatus.HEALTHY]: 5
    };
    
    return statusPriority[a.status] - statusPriority[b.status];
  });

  // Get status counts
  const statusCounts = {
    [ModuleHealthStatus.HEALTHY]: 0,
    [ModuleHealthStatus.WARNING]: 0,
    [ModuleHealthStatus.ERROR]: 0,
    [ModuleHealthStatus.FAILED]: 0,
    [ModuleHealthStatus.LOADING]: 0,
    [ModuleHealthStatus.DISABLED]: 0
  };
  
  moduleHealth.forEach(health => {
    statusCounts[health.status]++;
  });

  // Render status badge
  const renderStatusBadge = (status: ModuleHealthStatus) => {
    switch (status) {
      case ModuleHealthStatus.HEALTHY:
        return <Badge variant="success" className="flex items-center"><CheckCircleIcon className="w-3 h-3 mr-1" /> Healthy</Badge>;
      case ModuleHealthStatus.WARNING:
        return <Badge variant="warning" className="flex items-center"><AlertTriangleIcon className="w-3 h-3 mr-1" /> Warning</Badge>;
      case ModuleHealthStatus.ERROR:
        return <Badge variant="danger" className="flex items-center"><AlertCircleIcon className="w-3 h-3 mr-1" /> Error</Badge>;
      case ModuleHealthStatus.FAILED:
        return <Badge variant="danger" className="flex items-center"><XCircleIcon className="w-3 h-3 mr-1" /> Failed</Badge>;
      case ModuleHealthStatus.LOADING:
        return <Badge variant="info" className="flex items-center"><RefreshCwIcon className="w-3 h-3 mr-1 animate-spin" /> Loading</Badge>;
      case ModuleHealthStatus.DISABLED:
        return <Badge variant="secondary" className="flex items-center"><XCircleIcon className="w-3 h-3 mr-1" /> Disabled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card title="Module Health" className={className}>
        <div className="flex justify-center items-center p-8">
          <RefreshCwIcon className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span>Loading module health data...</span>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Module Health</h3>
          <Button size="sm" variant="ghost" onClick={handleRefreshAll} className="p-1">
            <RefreshCwIcon className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <Badge variant="success" className="flex items-center">
            <CheckCircleIcon className="w-3 h-3 mr-1" /> {statusCounts[ModuleHealthStatus.HEALTHY]}
          </Badge>
          <Badge variant="warning" className="flex items-center">
            <AlertTriangleIcon className="w-3 h-3 mr-1" /> {statusCounts[ModuleHealthStatus.WARNING]}
          </Badge>
          <Badge variant="danger" className="flex items-center">
            <AlertCircleIcon className="w-3 h-3 mr-1" /> {statusCounts[ModuleHealthStatus.ERROR] + statusCounts[ModuleHealthStatus.FAILED]}
          </Badge>
        </div>
        
        {(statusCounts[ModuleHealthStatus.ERROR] > 0 || statusCounts[ModuleHealthStatus.FAILED] > 0) && (
          <div className="text-sm text-red-600">
            {statusCounts[ModuleHealthStatus.ERROR] + statusCounts[ModuleHealthStatus.FAILED]} module(s) with critical issues
          </div>
        )}
      </div>
    );
  }

  return (
    <Card 
      title="Module Health Dashboard" 
      className={className}
      actions={
        <Button size="sm" onClick={handleRefreshAll} leftIcon={<RefreshCwIcon className="w-4 h-4" />}>
          Refresh All
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="success" className="flex items-center">
          <CheckCircleIcon className="w-3 h-3 mr-1" /> Healthy: {statusCounts[ModuleHealthStatus.HEALTHY]}
        </Badge>
        <Badge variant="warning" className="flex items-center">
          <AlertTriangleIcon className="w-3 h-3 mr-1" /> Warning: {statusCounts[ModuleHealthStatus.WARNING]}
        </Badge>
        <Badge variant="danger" className="flex items-center">
          <AlertCircleIcon className="w-3 h-3 mr-1" /> Error: {statusCounts[ModuleHealthStatus.ERROR]}
        </Badge>
        <Badge variant="danger" className="flex items-center">
          <XCircleIcon className="w-3 h-3 mr-1" /> Failed: {statusCounts[ModuleHealthStatus.FAILED]}
        </Badge>
        <Badge variant="secondary" className="flex items-center">
          <XCircleIcon className="w-3 h-3 mr-1" /> Disabled: {statusCounts[ModuleHealthStatus.DISABLED]}
        </Badge>
      </div>
      
      {sortedModules.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No modules match the current filter criteria
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Load Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Error
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedModules.map(health => (
                <tr key={health.moduleId} className={
                  health.status === ModuleHealthStatus.ERROR || health.status === ModuleHealthStatus.FAILED
                    ? 'bg-red-50'
                    : health.status === ModuleHealthStatus.WARNING
                      ? 'bg-yellow-50'
                      : ''
                }>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {health.moduleId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {renderStatusBadge(health.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {health.loadTime ? `${health.loadTime.toFixed(2)}ms` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {health.lastError ? (
                      <span title={health.lastError.message}>
                        {health.lastError.message}
                      </span>
                    ) : (
                      'None'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      size="sm"
                      variant={health.status === ModuleHealthStatus.HEALTHY ? 'secondary' : 'primary'}
                      onClick={() => handleReloadModule(health.moduleId)}
                      disabled={reloadingModules.has(health.moduleId)}
                      leftIcon={<RefreshCwIcon className={`w-4 h-4 ${reloadingModules.has(health.moduleId) ? 'animate-spin' : ''}`} />}
                    >
                      {reloadingModules.has(health.moduleId) ? 'Reloading...' : 'Reload'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ModuleHealthDashboard;
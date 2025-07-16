// Module Loading Performance Panel Component
// Displays detailed performance metrics for module loading

import React, { useState } from 'react';
import { useModuleLoadingPerformance } from '../hooks/useModuleLoadingPerformance';
import { ModuleLoadingPriority } from '../services/dynamicModuleLoader';
import { RefreshCwIcon, ChartBarIcon, ClockIcon } from './ui/icons';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface ModuleLoadingPerformancePanelProps {
  className?: string;
}

const ModuleLoadingPerformancePanel: React.FC<ModuleLoadingPerformancePanelProps> = ({
  className = ''
}) => {
  const { 
    performanceReport, 
    allLoadTimes,
    isLoading, 
    refreshMetrics 
  } = useModuleLoadingPerformance({ autoRefresh: false });
  
  const [activeTab, setActiveTab] = useState<'summary' | 'modules' | 'chart'>('summary');
  
  // Get priority color
  const getPriorityColor = (priority: ModuleLoadingPriority): string => {
    switch (priority) {
      case ModuleLoadingPriority.CRITICAL:
        return 'text-red-600';
      case ModuleLoadingPriority.HIGH:
        return 'text-orange-500';
      case ModuleLoadingPriority.NORMAL:
        return 'text-blue-500';
      case ModuleLoadingPriority.LOW:
        return 'text-green-500';
      case ModuleLoadingPriority.LAZY:
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };
  
  // Get load time color based on performance
  const getLoadTimeColor = (loadTime: number): string => {
    if (loadTime < 100) {
      return 'text-green-600';
    } else if (loadTime < 300) {
      return 'text-blue-600';
    } else if (loadTime < 1000) {
      return 'text-orange-500';
    } else {
      return 'text-red-600';
    }
  };
  
  // Render summary tab
  const renderSummaryTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Total Modules</div>
          <div className="text-2xl font-bold">{performanceReport.totalModules}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-500">Average Load Time</div>
          <div className="text-2xl font-bold">{performanceReport.averageLoadTime}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-500">Total Load Time</div>
          <div className="text-2xl font-bold">{performanceReport.totalLoadTime}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-3">Module Priority Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Critical</div>
            <div className="text-xl font-bold text-red-600">{performanceReport.priorityCounts[ModuleLoadingPriority.CRITICAL]}</div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs text-gray-500">High</div>
            <div className="text-xl font-bold text-orange-500">{performanceReport.priorityCounts[ModuleLoadingPriority.HIGH]}</div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Normal</div>
            <div className="text-xl font-bold text-blue-500">{performanceReport.priorityCounts[ModuleLoadingPriority.NORMAL]}</div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Low</div>
            <div className="text-xl font-bold text-green-500">{performanceReport.priorityCounts[ModuleLoadingPriority.LOW]}</div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="text-xs text-gray-500">Lazy</div>
            <div className="text-xl font-bold text-purple-500">{performanceReport.priorityCounts[ModuleLoadingPriority.LAZY]}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-3">Slowest Modules</h3>
        <div className="space-y-2">
          {performanceReport.moduleLoadTimes.slice(0, 5).map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">{index + 1}.</span>
                <span className="font-medium">{item.moduleId}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${getPriorityColor(item.priority)}`}
                >
                  {item.priority}
                </Badge>
              </div>
              <span className={`font-bold ${getLoadTimeColor(parseFloat(item.loadTime))}`}>
                {item.loadTime}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  // Render modules tab
  const renderModulesTab = () => {
    // Convert Map to array and sort by load time (descending)
    const moduleLoadTimes = Array.from(allLoadTimes.entries())
      .map(([moduleId, loadTime]) => ({ moduleId, loadTime }))
      .sort((a, b) => b.loadTime - a.loadTime);
    
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Module ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Load Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {moduleLoadTimes.map(({ moduleId, loadTime }) => (
              <tr key={moduleId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {moduleId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={getLoadTimeColor(loadTime)}>
                    {loadTime.toFixed(2)}ms
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge 
                    variant="secondary" 
                    className={getPriorityColor(performanceReport.moduleLoadTimes.find((m: any) => m.moduleId === moduleId)?.priority || ModuleLoadingPriority.NORMAL)}
                  >
                    {performanceReport.moduleLoadTimes.find((m: any) => m.moduleId === moduleId)?.priority || 'normal'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render chart tab (simplified version without actual chart library)
  const renderChartTab = () => {
    // Group modules by load time ranges
    const ranges = [
      { label: '< 100ms', min: 0, max: 100, count: 0 },
      { label: '100-300ms', min: 100, max: 300, count: 0 },
      { label: '300-500ms', min: 300, max: 500, count: 0 },
      { label: '500-1000ms', min: 500, max: 1000, count: 0 },
      { label: '> 1000ms', min: 1000, max: Infinity, count: 0 }
    ];
    
    allLoadTimes.forEach(loadTime => {
      const range = ranges.find(r => loadTime >= r.min && loadTime < r.max);
      if (range) {
        range.count++;
      }
    });
    
    // Find the maximum count for scaling
    const maxCount = Math.max(...ranges.map(r => r.count));
    
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">Module Load Time Distribution</h3>
        
        <div className="space-y-4">
          {ranges.map((range, index) => (
            <div key={index} className="flex items-center">
              <div className="w-24 text-sm text-gray-600">{range.label}</div>
              <div className="flex-1 ml-2">
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : index === 3 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${maxCount > 0 ? (range.count / maxCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-12 text-right text-sm font-medium ml-2">{range.count}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          Note: This is a simplified visualization. For more detailed analytics, consider using a dedicated performance monitoring tool.
        </div>
      </div>
    );
  };
  
  return (
    <Card 
      title="Module Loading Performance" 
      className={className}
      actions={
        <Button 
          size="sm" 
          onClick={refreshMetrics} 
          disabled={isLoading}
          leftIcon={<RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      }
    >
      <div className="mb-4 border-b">
        <div className="flex space-x-4">
          <button
            className={`pb-2 px-1 ${activeTab === 'summary' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`pb-2 px-1 ${activeTab === 'modules' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('modules')}
          >
            All Modules
          </button>
          <button
            className={`pb-2 px-1 ${activeTab === 'chart' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('chart')}
          >
            Charts
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <RefreshCwIcon className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span>Loading performance data...</span>
        </div>
      ) : (
        <div>
          {activeTab === 'summary' && renderSummaryTab()}
          {activeTab === 'modules' && renderModulesTab()}
          {activeTab === 'chart' && renderChartTab()}
        </div>
      )}
    </Card>
  );
};

export default ModuleLoadingPerformancePanel;
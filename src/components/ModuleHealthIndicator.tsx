// Module Health Indicator Component
// Displays a small indicator showing the overall health status of modules

import React, { useState } from 'react';
import { useModuleHealth } from '../hooks/useModuleHealth';
import { ModuleHealthStatus } from '../services/enhancedModuleLoader';
import { CheckCircleIcon, AlertTriangleIcon, AlertCircleIcon } from './ui/icons';
// import { XCircleIcon } from './ui/icons'; // Unused
import ModuleHealthDashboard from './ModuleHealthDashboard';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ModuleHealthIndicatorProps {
  showCount?: boolean;
  showLabel?: boolean;
  className?: string;
}

const ModuleHealthIndicator: React.FC<ModuleHealthIndicatorProps> = ({
  showCount = true,
  showLabel = false,
  className = ''
}) => {
  const { 
    // isHealthy, // Unused
    hasWarnings, 
    hasErrors, 
    statusCounts,
    modulesWithIssues
    // refreshHealth // Unused
  } = useModuleHealth({ autoRefresh: true, refreshInterval: 30000 });
  
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  
  // Determine status color and icon
  let statusColor = 'text-green-500';
  let StatusIcon = CheckCircleIcon;
  let statusText = 'All modules healthy';
  
  if (hasErrors) {
    statusColor = 'text-red-500';
    StatusIcon = AlertCircleIcon;
    statusText = `${modulesWithIssues.filter(m => 
      m.status === ModuleHealthStatus.ERROR || m.status === ModuleHealthStatus.FAILED
    ).length} module(s) with errors`;
  } else if (hasWarnings) {
    statusColor = 'text-yellow-500';
    StatusIcon = AlertTriangleIcon;
    statusText = `${modulesWithIssues.filter(m => 
      m.status === ModuleHealthStatus.WARNING
    ).length} module(s) with warnings`;
  }
  
  // Calculate total issues count
  const issuesCount = statusCounts[ModuleHealthStatus.ERROR] + 
    statusCounts[ModuleHealthStatus.FAILED] + 
    statusCounts[ModuleHealthStatus.WARNING];
  
  return (
    <>
      <button
        onClick={() => setIsDashboardOpen(true)}
        className={`flex items-center px-2 py-1 rounded hover:bg-gray-100 ${className}`}
        title={statusText}
      >
        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
        
        {showCount && issuesCount > 0 && (
          <span className={`ml-1 text-xs font-medium ${statusColor}`}>
            {issuesCount}
          </span>
        )}
        
        {showLabel && (
          <span className="ml-2 text-sm text-gray-600">
            {statusText}
          </span>
        )}
      </button>
      
      <Modal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        title="Module Health Status"
        size="xl"
        footer={
          <Button onClick={() => setIsDashboardOpen(false)}>Close</Button>
        }
      >
        <ModuleHealthDashboard />
      </Modal>
    </>
  );
};

export default ModuleHealthIndicator;
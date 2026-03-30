// ABOUTME: Enhanced sync management panel with queue controls, priority management, and detailed progress tracking
// ABOUTME: Provides comprehensive user interface for managing data synchronization operations

import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAppData } from '../hooks/useAppData';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface SyncQueueItem {
  id: string;
  operation: {
    entity: string;
    type: 'create' | 'update' | 'delete';
    data: any;
  };
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'error' | 'paused';
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  estimatedDuration?: number;
  actualDuration?: number;
  error?: string;
}

interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  priorityOrder: string[];
  enableConflictResolution: boolean;
  backgroundSync: boolean;
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
}

const SyncManagementPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'settings' | 'history' | 'conflicts'>('queue');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const {
    syncStatus,
    pendingSyncCount,
    getQueueStatus,
    forceSync,
    clearSyncQueue,
    pauseSync,
    resumeSync,
    getSyncSettings,
    updateSyncSettings,
    getSyncHistory,
    conflicts = [],
    isOnline,
    backendAvailable
  } = useAppData() || {};

  // Safely get queue status with comprehensive fallback
  const queueStatus = (getQueueStatus && typeof getQueueStatus === 'function') 
    ? getQueueStatus() 
    : {
        api: { pending: 0, processing: false, byPriority: {}, completed: 0 },
        sync: { pending: 0, processing: false, byPriority: {}, errors: 0, items: [] }
      };
  const syncSettings = getSyncSettings?.() || {
    autoSync: true,
    syncInterval: 30000,
    batchSize: 10,
    maxRetries: 3,
    retryDelay: 5000,
    priorityOrder: ['critical', 'high', 'normal', 'low'],
    enableConflictResolution: true,
    backgroundSync: true,
    conflictResolution: 'manual'
  } as SyncSettings;

  const syncHistory = getSyncHistory?.() || [];

  // Mock queue items for demonstration - in real implementation, this would come from the data context
  const queueItems: SyncQueueItem[] = queueStatus?.sync?.items || [];

  const filteredQueueItems = queueItems.filter(item => {
    const priorityMatch = filterPriority === 'all' || item.priority === filterPriority;
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    return priorityMatch && statusMatch;
  });

  const handleBulkAction = (action: 'pause' | 'resume' | 'delete' | 'retry') => {
    if (selectedItems.length === 0) return;

    switch (action) {
      case 'pause':
        // Implementation would pause selected items
        console.log('Pausing items:', selectedItems);
        break;
      case 'resume':
        // Implementation would resume selected items
        console.log('Resuming items:', selectedItems);
        break;
      case 'delete':
        // Implementation would remove selected items from queue
        console.log('Deleting items:', selectedItems);
        break;
      case 'retry':
        // Implementation would retry selected failed items
        console.log('Retrying items:', selectedItems);
        break;
    }
    setSelectedItems([]);
  };

  const handlePriorityChange = (itemId: string, newPriority: string) => {
    // Implementation would update item priority
    console.log('Changing priority for item:', itemId, 'to:', newPriority);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <PauseIcon className="w-4 h-4 text-amber-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderQueueTab = () => (
    <div className="space-y-4">
      {/* Queue Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Priority:</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="error">Error</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedItems.length > 0 && (
            <>
              <Button size="sm" onClick={() => handleBulkAction('pause')}>
                <PauseIcon className="w-4 h-4 mr-1" />
                Pause
              </Button>
              <Button size="sm" onClick={() => handleBulkAction('resume')}>
                <PlayIcon className="w-4 h-4 mr-1" />
                Resume
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>
                <TrashIcon className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setShowSettings(true)}>
            <Cog6ToothIcon className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-2">
        {filteredQueueItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No items in sync queue</p>
          </div>
        ) : (
          filteredQueueItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.operation.entity} - {item.operation.type}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.timestamp.toLocaleString()}
                        {item.retryCount > 0 && ` • Retry ${item.retryCount}/${item.maxRetries}`}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={item.priority}
                    onChange={(e) => handlePriorityChange(item.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded border ${getPriorityColor(item.priority)}`}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                  
                  {item.error && (
                    <div className="text-xs text-red-600 max-w-xs truncate" title={item.error}>
                      {item.error}
                    </div>
                  )}
                  
                  {item.estimatedDuration && (
                    <div className="text-xs text-gray-500">
                      ~{Math.round(item.estimatedDuration / 1000)}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <Card title="Sync Configuration">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Auto Sync</label>
              <p className="text-xs text-gray-500">Automatically sync changes in the background</p>
            </div>
            <input
              type="checkbox"
              checked={syncSettings.autoSync}
              onChange={(e) => updateSyncSettings?.({ autoSync: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Background Sync</label>
              <p className="text-xs text-gray-500">Continue syncing when app is in background</p>
            </div>
            <input
              type="checkbox"
              checked={syncSettings.backgroundSync}
              onChange={(e) => updateSyncSettings?.({ backgroundSync: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">Sync Interval</label>
            <select
              value={syncSettings.syncInterval / 1000}
              onChange={(e) => updateSyncSettings?.({ syncInterval: parseInt(e.target.value) * 1000 })}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">Batch Size</label>
            <select
              value={syncSettings.batchSize}
              onChange={(e) => updateSyncSettings?.({ batchSize: parseInt(e.target.value) })}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">Max Retries</label>
            <select
              value={syncSettings.maxRetries}
              onChange={(e) => updateSyncSettings?.({ maxRetries: parseInt(e.target.value) })}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1 retry</option>
              <option value={3}>3 retries</option>
              <option value={5}>5 retries</option>
              <option value={10}>10 retries</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">Retry Delay</label>
            <select
              value={syncSettings.retryDelay}
              onChange={(e) => updateSyncSettings?.({ retryDelay: parseInt(e.target.value) })}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Conflict Resolution</label>
              <p className="text-xs text-gray-500">Choose how sync conflicts should be handled by default</p>
            </div>
            <select
              value={syncSettings.conflictResolution}
              onChange={(e) => updateSyncSettings?.({ conflictResolution: e.target.value as SyncSettings['conflictResolution'] })}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="manual">Manual review</option>
              <option value="merge">Merge automatically</option>
              <option value="local-wins">Prefer local changes</option>
              <option value="remote-wins">Prefer remote changes</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="text-center py-8 text-gray-500">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Sync history will be displayed here</p>
        <p className="text-sm">Track completed sync operations and performance metrics</p>
      </div>
    </div>
  );

  const renderConflictsTab = () => (
    <div className="space-y-4">
      {conflicts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-green-300" />
          <p>No sync conflicts</p>
          <p className="text-sm">All data is synchronized successfully</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((conflict, index) => (
            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium text-red-900">
                      Conflict in {conflict.entityName}
                    </div>
                    <div className="text-sm text-red-700">
                      {conflict.conflictType} conflict detected
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="danger">
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'queue', label: 'Sync Queue', count: pendingSyncCount || 0 },
    { id: 'settings', label: 'Settings' },
    { id: 'history', label: 'History' },
    { id: 'conflicts', label: 'Conflicts', count: Array.isArray(conflicts) ? conflicts.length : 0, alert: Array.isArray(conflicts) && conflicts.length > 0 }
  ];

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Sync Management</h2>
            <p className="text-sm text-gray-500">
              Manage data synchronization queue and settings
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOnline && backendAvailable 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isOnline && backendAvailable ? 'Online' : 'Offline'}
            </div>
            {syncStatus?.state === 'syncing' && (
              <div className="flex items-center space-x-1 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span>Syncing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map(({ id, label, count, alert }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  alert 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'queue' && renderQueueTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'conflicts' && renderConflictsTab()}
      </div>
    </div>
  );
};

export default SyncManagementPanel;
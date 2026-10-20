// ABOUTME: Advanced conflict resolution interface with detailed comparison and merge capabilities
// ABOUTME: Provides comprehensive UI for resolving data synchronization conflicts with visual diff and merge tools

import React, { useState, useMemo } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  CodeBracketIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { AlertTriangleIcon } from './ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface ConflictData {
  id: string;
  entityName: string;
  entityId: string;
  conflictType: 'data' | 'structural' | 'deletion';
  localVersion: any;
  remoteVersion: any;
  conflictFields: string[];
  timestamp: Date;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

interface ConflictResolutionInterfaceProps {
  conflicts: ConflictData[];
  onResolveConflict: (conflictId: string, resolution: any) => void;
  onResolveAll: (resolutions: Record<string, any>) => void;
  className?: string;
}

const ConflictResolutionInterface: React.FC<ConflictResolutionInterfaceProps> = ({
  conflicts,
  onResolveConflict,
  onResolveAll,
  className = ''
}) => {
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);
  const [resolutionStrategy, setResolutionStrategy] = useState<'local' | 'remote' | 'merge' | 'custom'>('merge');
  const [customResolution, setCustomResolution] = useState<any>({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'raw'>('side-by-side');

  const { resolveConflict: _resolveConflict, resolveAllConflicts: _resolveAllConflicts } = useAppData() as unknown as {
    resolveConflict: (id: string) => void;
    resolveAllConflicts: () => void;
  };
  void _resolveConflict;
  void _resolveAllConflicts;

  const sortedConflicts = useMemo(() => {
    return [...conflicts].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [conflicts]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'low': return 'bg-surface-accent text-surface-foreground border-surface-border';
      default: return 'bg-surface-accent text-surface-foreground border-surface-border';
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'data':
        return <DocumentDuplicateIcon className="w-5 h-5 text-primary-500" />;
      case 'structural':
        return <CodeBracketIcon className="w-5 h-5 text-purple-500" />;
      case 'deletion':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangleIcon className="w-5 h-5 text-amber-500" />;
    }
  };

  const handleResolveConflict = (conflict: ConflictData) => {
    let resolution;
    
    switch (resolutionStrategy) {
      case 'local':
        resolution = conflict.localVersion;
        break;
      case 'remote':
        resolution = conflict.remoteVersion;
        break;
      case 'merge':
        resolution = { ...conflict.remoteVersion, ...conflict.localVersion };
        break;
      case 'custom':
        resolution = customResolution;
        break;
      default:
        resolution = conflict.localVersion;
    }

    onResolveConflict(conflict.id, resolution);
    setSelectedConflict(null);
    setShowDetailModal(false);
  };

  const handleBulkResolve = (strategy: 'local' | 'remote' | 'merge') => {
    const resolutions: Record<string, any> = {};
    
    conflicts.forEach(conflict => {
      switch (strategy) {
        case 'local':
          resolutions[conflict.id] = conflict.localVersion;
          break;
        case 'remote':
          resolutions[conflict.id] = conflict.remoteVersion;
          break;
        case 'merge':
          resolutions[conflict.id] = { ...conflict.remoteVersion, ...conflict.localVersion };
          break;
      }
    });

    onResolveAll(resolutions);
  };

  const renderFieldComparison = (conflict: ConflictData) => {
    if (!conflict) return null;

    const localData = conflict.localVersion || {};
    const remoteData = conflict.remoteVersion || {};
    const conflictFields = conflict.conflictFields || [];

    return (
      <div className="space-y-4">
        {conflictFields.map(field => (
          <div key={field} className="border rounded-lg p-4">
            <h4 className="font-medium text-surface-foreground mb-3">{field}</h4>
            
            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                    <span className="text-sm font-medium text-surface-foreground">Local Version</span>
                  </div>
                  <div className="bg-primary-50 p-3 rounded border">
                    <pre className="text-sm text-surface-foreground whitespace-pre-wrap">
                      {JSON.stringify(localData[field], null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-surface-foreground">Remote Version</span>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <pre className="text-sm text-surface-foreground whitespace-pre-wrap">
                      {JSON.stringify(remoteData[field], null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'unified' && (
              <div className="space-y-2">
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-red-700">- Local</span>
                  </div>
                  <pre className="text-sm text-red-800 whitespace-pre-wrap">
                    {JSON.stringify(localData[field], null, 2)}
                  </pre>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-green-700">+ Remote</span>
                  </div>
                  <pre className="text-sm text-green-800 whitespace-pre-wrap">
                    {JSON.stringify(remoteData[field], null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {viewMode === 'raw' && (
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-surface-foreground mb-2">Local Version (Raw)</h5>
                  <textarea
                    className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                    value={JSON.stringify(localData[field], null, 2)}
                    readOnly
                  />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-surface-foreground mb-2">Remote Version (Raw)</h5>
                  <textarea
                    className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                    value={JSON.stringify(remoteData[field], null, 2)}
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderConflictDetail = () => {
    if (!selectedConflict) return null;

    return (
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Resolve Conflict: ${selectedConflict.entityName}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Conflict Info */}
          <div className="bg-surface-muted p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-surface-foreground">Entity:</span>
                <span className="ml-2">{selectedConflict.entityName}</span>
              </div>
              <div>
                <span className="font-medium text-surface-foreground">Type:</span>
                <span className="ml-2 capitalize">{selectedConflict.conflictType}</span>
              </div>
              <div>
                <span className="font-medium text-surface-foreground">Priority:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getPriorityColor(selectedConflict.priority)}`}>
                  {selectedConflict.priority}
                </span>
              </div>
              <div>
                <span className="font-medium text-surface-foreground">Time:</span>
                <span className="ml-2">{selectedConflict.timestamp.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-surface-foreground">View Mode:</span>
            <div className="flex space-x-2">
              {[
                { key: 'side-by-side', label: 'Side by Side' },
                { key: 'unified', label: 'Unified' },
                { key: 'raw', label: 'Raw' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-surface-foreground hover:bg-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Field Comparison */}
          {renderFieldComparison(selectedConflict)}

          {/* Resolution Strategy */}
          <div className="space-y-4">
            <h4 className="font-medium text-surface-foreground">Resolution Strategy</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'local', label: 'Keep Local', desc: 'Use your offline changes' },
                { key: 'remote', label: 'Keep Remote', desc: 'Use server version' },
                { key: 'merge', label: 'Auto Merge', desc: 'Combine both versions' },
                { key: 'custom', label: 'Custom', desc: 'Manual resolution' }
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-surface-muted">
                  <input
                    type="radio"
                    name="resolution"
                    value={key}
                    checked={resolutionStrategy === key}
                    onChange={(e) => setResolutionStrategy(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-surface-foreground">{label}</div>
                    <div className="text-sm text-surface-muted-fg">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Resolution Editor */}
          {resolutionStrategy === 'custom' && (
            <div className="space-y-2">
              <h5 className="font-medium text-surface-foreground">Custom Resolution</h5>
              <textarea
                className="w-full h-40 p-3 border rounded-md font-mono text-sm"
                value={JSON.stringify(customResolution, null, 2)}
                onChange={(e) => {
                  try {
                    setCustomResolution(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, keep current state
                  }
                }}
                placeholder="Enter custom resolution as JSON..."
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowDetailModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleResolveConflict(selectedConflict)}
            >
              Resolve Conflict
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  if (conflicts.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-medium text-surface-foreground mb-2">No Conflicts</h3>
        <p className="text-surface-muted-fg">All data is synchronized successfully</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-surface-foreground">Data Conflicts</h3>
          <p className="text-sm text-surface-muted-fg">
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} require resolution
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleBulkResolve('local')}
          >
            Keep All Local
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleBulkResolve('remote')}
          >
            Keep All Remote
          </Button>
          <Button
            size="sm"
            onClick={() => handleBulkResolve('merge')}
          >
            Auto Merge All
          </Button>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="space-y-3">
        {sortedConflicts.map((conflict) => (
          <div key={conflict.id} className="border rounded-lg p-4 hover:bg-surface-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getConflictTypeIcon(conflict.conflictType)}
                <div>
                  <div className="font-medium text-surface-foreground">
                    {conflict.entityName} #{conflict.entityId}
                  </div>
                  <div className="text-sm text-surface-muted-fg">
                    {conflict.conflictFields.length} field{conflict.conflictFields.length !== 1 ? 's' : ''} in conflict
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(conflict.priority)}`}>
                  {conflict.priority}
                </span>
                
                <div className="flex items-center space-x-1 text-xs text-surface-muted-fg">
                  <ClockIcon className="w-4 h-4" />
                  <span>{conflict.timestamp.toLocaleTimeString()}</span>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedConflict(conflict);
                    setShowDetailModal(true);
                  }}
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  Resolve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conflict Detail Modal */}
      {renderConflictDetail()}
    </div>
  );
};

export default ConflictResolutionInterface;
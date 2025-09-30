// ABOUTME: UI component for switching between data layer modes (development, demo, production)
// ABOUTME: DEPRECATED - This component is deprecated in favor of UnifiedModeSwitch. Use UnifiedModeSwitch instead.

import React, { useState, useEffect } from 'react';
import { getDataModeManager, DataMode, DataModeStatus, ModeTransitionOptions } from '../services/dataModeManager';
import { Settings, Database, RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

interface DataModeSwitchProps {
  className?: string;
  showAdvancedOptions?: boolean;
}

export const DataModeSwitch: React.FC<DataModeSwitchProps> = ({ 
  className = '', 
  showAdvancedOptions = false 
}) => {
  // Deprecation warning
  React.useEffect(() => {
    console.warn('DataModeSwitch is deprecated. Please use UnifiedModeSwitch instead.');
  }, []);
  const [status, setStatus] = useState<DataModeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [transitionOptions, setTransitionOptions] = useState<ModeTransitionOptions>({
    preserveData: false,
    seedData: true,
    clearData: false,
    backupData: true
  });

  const dataModeManager = getDataModeManager();

  useEffect(() => {
    loadStatus();

    // Listen for mode changes
    const handleModeChanged = (data: any) => {
      loadStatus();
      setError(null);
    };

    const handleError = (error: Error) => {
      setError(error.message);
      setIsLoading(false);
    };

    const handleTransitionStarted = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleTransitionCompleted = () => {
      setIsLoading(false);
      loadStatus();
    };

    dataModeManager.on('modeChanged', handleModeChanged);
    dataModeManager.on('error', handleError);
    dataModeManager.on('transitionStarted', handleTransitionStarted);
    dataModeManager.on('transitionCompleted', handleTransitionCompleted);

    return () => {
      dataModeManager.off('modeChanged', handleModeChanged);
      dataModeManager.off('error', handleError);
      dataModeManager.off('transitionStarted', handleTransitionStarted);
      dataModeManager.off('transitionCompleted', handleTransitionCompleted);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const currentStatus = await dataModeManager.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Failed to load status:', error);
      setError('Failed to load current status');
    }
  };

  const handleModeSwitch = async (newMode: DataMode) => {
    if (!status || status.isTransitioning) return;

    try {
      setIsLoading(true);
      setError(null);

      // Set default options based on mode
      const options: ModeTransitionOptions = {
        ...transitionOptions,
        seedData: newMode === 'demo' ? transitionOptions.seedData : false
      };

      await dataModeManager.switchMode(newMode, options);
    } catch (error) {
      console.error('Failed to switch mode:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch mode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!status || status.isTransitioning) return;

    try {
      setIsLoading(true);
      setError(null);
      await dataModeManager.clearAllData();
      await loadStatus();
    } catch (error) {
      console.error('Failed to clear data:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!status || status.isTransitioning) return;

    try {
      setIsLoading(true);
      setError(null);
      await dataModeManager.seedDemoData();
      await loadStatus();
    } catch (error) {
      console.error('Failed to seed data:', error);
      setError(error instanceof Error ? error.message : 'Failed to seed data');
    } finally {
      setIsLoading(false);
    }
  };

  const getModeDescription = (mode: DataMode): string => {
    switch (mode) {
      case 'development':
        return 'SQLite file storage for local development';
      case 'demo':
        return 'SQLite WASM with OPFS and sample data';
      case 'production':
        return 'Production database with live data';
      default:
        return '';
    }
  };

  const getModeColor = (mode: DataMode): string => {
    switch (mode) {
      case 'development':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'demo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'production':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!status) {
    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Loading data mode status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg bg-white ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Data Layer Mode</h3>
          </div>
          {showAdvancedOptions && (
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current Status */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Current Mode:</span>
            <span className={`px-2 py-1 text-xs font-medium rounded border ${getModeColor(status.currentMode)}`}>
              {status.currentMode.toUpperCase()}
            </span>
            {status.isTransitioning && (
              <div className="flex items-center space-x-1 text-orange-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="text-xs">Switching...</span>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            <div>Provider: <span className="font-medium">{status.activeProvider}</span></div>
            <div>Data Records: <span className="font-medium">{status.dataCount}</span></div>
            <div>Last Switched: <span className="font-medium">{status.lastSwitched.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Switch to Mode:</label>
          <div className="grid grid-cols-1 gap-2">
            {dataModeManager.getAvailableModes().map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeSwitch(mode)}
                disabled={isLoading || status.isTransitioning || mode === status.currentMode}
                className={`p-3 text-left border rounded transition-colors ${
                  mode === status.currentMode
                    ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                    : 'hover:bg-gray-50 border-gray-200'
                } ${
                  isLoading || status.isTransitioning
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize">{mode}</div>
                    <div className="text-sm text-gray-600">{getModeDescription(mode)}</div>
                  </div>
                  {mode === status.currentMode && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvancedOptions && showOptions && (
          <div className="space-y-3 p-3 bg-gray-50 border rounded">
            <h4 className="text-sm font-medium">Transition Options</h4>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={transitionOptions.preserveData}
                  onChange={(e) => setTransitionOptions(prev => ({ ...prev, preserveData: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Preserve existing data</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={transitionOptions.seedData}
                  onChange={(e) => setTransitionOptions(prev => ({ ...prev, seedData: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Seed demo data (for demo mode)</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={transitionOptions.clearData}
                  onChange={(e) => setTransitionOptions(prev => ({ ...prev, clearData: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Clear data before switching</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={transitionOptions.backupData}
                  onChange={(e) => setTransitionOptions(prev => ({ ...prev, backupData: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Backup data before switching</span>
              </label>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleClearData}
                disabled={isLoading || status.isTransitioning}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Clear All Data
              </button>
              
              <button
                onClick={handleSeedData}
                disabled={isLoading || status.isTransitioning}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Seed Demo Data
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {(isLoading || status.isTransitioning) && (
          <div className="flex items-center justify-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded">
            <Loader className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">
              {status.isTransitioning ? 'Switching modes...' : 'Processing...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataModeSwitch;
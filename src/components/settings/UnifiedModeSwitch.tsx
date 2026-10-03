import { logger } from '@/utils/logging';

// ABOUTME: Unified mode switching component that consolidates duplicate functionality
// ABOUTME: Provides consistent mode switching UI and logic across all settings pages

import React, { useState, useEffect } from 'react';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { getDataModeManager, DataMode, DataModeStatus } from '@/services/data/dataModeManager';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface UnifiedModeSwitchProps {
  className?: string;
  showDescription?: boolean;
  variant?: 'card' | 'inline' | 'radio';
  onModeChange?: (mode: DataMode) => void;
}

export const UnifiedModeSwitch: React.FC<UnifiedModeSwitchProps> = ({
  className = '',
  showDescription = true,
  variant = 'card',
  onModeChange
}) => {
  const { config, updateConfig } = useUnifiedConfig();
  const [status, setStatus] = useState<DataModeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      logger.error('Failed to load status:', error);
      setError('Failed to load current status');
    }
  };

  const handleModeSwitch = async (newMode: DataMode) => {
    if (!status || status.isTransitioning) return;

    try {
      setIsLoading(true);
      setError(null);

      // Update unified config first
      const updatedConfig = {
        ...config,
        dataMode: newMode
      };
      updateConfig(updatedConfig);

      // Then switch the actual mode
      await dataModeManager.switchMode(newMode, {
        preserveData: false,
        seedData: newMode === 'demo',
        clearData: false,
        backupData: true
      });

      // Call external handler if provided
      if (onModeChange) {
        onModeChange(newMode);
      }
    } catch (error) {
      logger.error('Failed to switch mode:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch mode');
    } finally {
      setIsLoading(false);
    }
  };

  const getModeDescription = (mode: DataMode): string => {
    switch (mode) {
      case 'development':
        return 'Local SQLite file storage for development and testing';
      case 'demo':
        return 'Browser-based SQLite with sample data for demonstrations';
      case 'production':
        return 'Production-ready database with optional backend integration';
      default:
        return 'Unknown mode';
    }
  };

  const getModeColor = (mode: DataMode): string => {
    switch (mode) {
      case 'development':
        return 'border-primary-500 bg-primary-50';
      case 'demo':
        return 'border-green-500 bg-green-50';
      case 'production':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-500 bg-surface-muted';
    }
  };

  const currentMode = status?.currentMode || config.dataMode;

  if (variant === 'radio') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="mode"
              value="demo"
              checked={currentMode === 'demo'}
              onChange={() => handleModeSwitch('demo')}
              disabled={isLoading}
              className="mr-2"
            />
            Demo Mode
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="mode"
              value="production"
              checked={currentMode === 'production'}
              onChange={() => handleModeSwitch('production')}
              disabled={isLoading}
              className="mr-2"
            />
            Production Mode
          </label>
        </div>
        {showDescription && (
          <p className="text-sm text-surface-muted-fg">
            Demo mode uses mock data, while production mode uses RxDB with real data persistence.
          </p>
        )}
        {isLoading && (
          <div className="flex items-center space-x-2 text-primary-600">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span className="text-sm">Switching modes...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <span className="text-sm font-medium">Mode:</span>
        <div className="flex space-x-2">
          {(['development', 'demo', 'production'] as DataMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeSwitch(mode)}
              disabled={isLoading}
              className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                currentMode === mode
                  ? getModeColor(mode)
                  : 'border-surface-border bg-surface-card hover:bg-surface-muted'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        {isLoading && (
          <ArrowPathIcon className="w-4 h-4 animate-spin text-primary-600" />
        )}
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Loading/Error States */}
      {isLoading && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin text-primary-600" />
            <span className="text-primary-800">Switching data mode...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['development', 'demo', 'production'] as DataMode[]).map((mode) => (
          <div
            key={mode}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              currentMode === mode
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-border hover:border-surface-border'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isLoading && handleModeSwitch(mode)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium capitalize">{mode}</h4>
              {currentMode === mode && <CheckCircleIcon className="w-5 h-5 text-primary-500" />}
            </div>
            {showDescription && (
              <p className="text-sm text-surface-muted-fg">{getModeDescription(mode)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnifiedModeSwitch;

// ABOUTME: Module loading progress indicator with real module loading tracking
// ABOUTME: Provides visual feedback during actual module initialization

import React, { useState, useEffect } from 'react';
import { dynamicModuleLoader } from '../services/dynamicModuleLoader';

interface ModuleLoadingProgressProps {
  showDetails?: boolean;
  timeoutMs?: number;
  onComplete?: () => void;
  onTimeout?: () => void;
}

const ModuleLoadingProgress: React.FC<ModuleLoadingProgressProps> = ({
  showDetails = false,
  timeoutMs = 10000,
  onComplete,
  onTimeout
}) => {
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState('Initializing...');
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let timeoutHandle: NodeJS.Timeout;
    let checkInterval: NodeJS.Timeout;

    const startLoading = () => {
      // Check if module loading is already complete
      if (dynamicModuleLoader.isLoadingComplete()) {
        setProgress(100);
        setCurrentModule('Complete!');
        setIsCompleted(true);
        if (onComplete) {
          setTimeout(onComplete, 100);
        }
        return;
      }

      // Start progress simulation while checking real status
      setCurrentModule('Loading modules...');
      
      // Simulate smooth progress while waiting for real completion
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (dynamicModuleLoader.isLoadingComplete()) {
            return 100;
          }
          // Slow progress simulation that doesn't reach 100% until real loading is done
          const newProgress = prev + Math.random() * 5;
          return Math.min(newProgress, 95); // Cap at 95% until real loading completes
        });
      }, 300);

      // Check for real completion every 100ms
      checkInterval = setInterval(() => {
        if (dynamicModuleLoader.isLoadingComplete() && !isCompleted) {
          setProgress(100);
          setCurrentModule('Complete!');
          setIsCompleted(true);
          clearInterval(progressInterval);
          clearInterval(checkInterval);
          if (onComplete) {
            setTimeout(onComplete, 200);
          }
        }
      }, 100);

      // Timeout handler
      timeoutHandle = setTimeout(() => {
        setIsTimedOut(true);
        if (onTimeout) {
          onTimeout();
        }
      }, timeoutMs);
    };

    startLoading();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [timeoutMs, onComplete, onTimeout]);

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Progress percentage */}
      <div className="text-center text-sm text-gray-600 mb-2">
        {Math.round(progress)}% Complete
      </div>

      {/* Current module (if details enabled) */}
      {showDetails && (
        <div className="text-center text-xs text-gray-500 mb-4">
          {currentModule}
        </div>
      )}

      {/* Timeout warning */}
      {isTimedOut && (
        <div className="text-center text-xs text-orange-600 mt-2">
          Loading is taking longer than expected...
        </div>
      )}
    </div>
  );
};

export default ModuleLoadingProgress;
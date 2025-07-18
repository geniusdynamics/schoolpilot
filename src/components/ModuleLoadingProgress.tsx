// ABOUTME: Module loading progress indicator with timeout handling
// ABOUTME: Provides visual feedback during module initialization

import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    // Simulate module loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 500);
          }
          return 100;
        }
        return newProgress;
      });
    }, 200);

    // Simulate module names
    const moduleNames = [
      'Core modules...',
      'Authentication...',
      'Navigation system...',
      'Data layer...',
      'UI components...',
      'Module registry...',
      'Finalizing...'
    ];

    const moduleInterval = setInterval(() => {
      setCurrentModule(moduleNames[Math.floor(Math.random() * moduleNames.length)]);
    }, 800);

    // Timeout handler
    const timeout = setTimeout(() => {
      setIsTimedOut(true);
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMs);

    return () => {
      clearInterval(interval);
      clearInterval(moduleInterval);
      clearTimeout(timeout);
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
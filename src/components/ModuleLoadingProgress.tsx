// Module Loading Progress Component
// Displays loading progress for modules with visual indicators

import React, { useState, useEffect, useCallback } from 'react';
import { dynamicModuleLoader, ModuleLoadingProgress as ProgressType } from '../services/dynamicModuleLoader';
import { RefreshCwIcon } from './ui/icons';

interface ModuleLoadingProgressProps {
    onComplete?: () => void;
    showDetails?: boolean;
    className?: string;
    timeoutMs?: number;
}

const ModuleLoadingProgress: React.FC<ModuleLoadingProgressProps> = ({
    onComplete,
    showDetails = true,
    className = '',
    timeoutMs = 10000 // Default timeout of 10 seconds
}) => {
    const [progress, setProgress] = useState(() => {
        const initialProgress = dynamicModuleLoader.getLoadingProgress();
        // If progress is already complete, call onComplete immediately
        if (initialProgress.isComplete && onComplete) {
            setTimeout(() => onComplete(), 0);
        }
        return initialProgress;
    });
    
    const [stalled, setStalled] = useState(false);
    const [lastProgressUpdate, setLastProgressUpdate] = useState(Date.now());

    // Handle completion
    const handleComplete = useCallback(() => {
        if (onComplete) {
            console.log('[ModuleLoadingProgress] Calling onComplete handler');
            onComplete();
        }
    }, [onComplete]);

    // Subscribe to progress updates
    useEffect(() => {
        const unsubscribe = dynamicModuleLoader.subscribeToProgress(currentProgress => {
            setProgress(currentProgress);
            setLastProgressUpdate(Date.now());

            if (currentProgress.isComplete) {
                handleComplete();
            }
        });

        return unsubscribe;
    }, [handleComplete]);

    // Add a safety timeout to ensure we don't get stuck on the loading screen
    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            if (!progress.isComplete) {
                console.warn('[ModuleLoadingProgress] Safety timeout triggered - forcing completion');
                setStalled(true);
                // Force the module loader to complete
                dynamicModuleLoader.forceCompleteLoading();
                handleComplete();
            }
        }, timeoutMs);
        
        return () => clearTimeout(safetyTimeout);
    }, [progress.isComplete, handleComplete, timeoutMs]);

    // Add a stall detector that checks if progress hasn't updated in a while
    useEffect(() => {
        const stallDetector = setInterval(() => {
            const now = Date.now();
            if (!progress.isComplete && now - lastProgressUpdate > 5000) {
                console.warn('[ModuleLoadingProgress] Progress appears to be stalled - forcing completion');
                setStalled(true);
                // Force the module loader to complete
                dynamicModuleLoader.forceCompleteLoading();
                handleComplete();
            }
        }, 1000);
        
        return () => clearInterval(stallDetector);
    }, [progress.isComplete, lastProgressUpdate, handleComplete]);

    if (progress.isComplete) {
        return null;
    }

    return (
        <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Loading Modules</h3>
                <span className="text-sm font-medium text-blue-600">{progress.percentage}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`h-2.5 rounded-full transition-all duration-300 ease-out ${stalled ? 'bg-orange-500' : 'bg-blue-600'}`}
                    style={{ width: `${progress.percentage}%` }}
                ></div>
            </div>

            {showDetails && (
                <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                    <div className="flex items-center">
                        <RefreshCwIcon className="w-3 h-3 mr-1 animate-spin" />
                        {stalled ? (
                            <span className="text-orange-600">Loading appears to be stalled...</span>
                        ) : progress.currentModule ? (
                            <span>Loading: {progress.currentModule}</span>
                        ) : (
                            <span>Initializing modules...</span>
                        )}
                    </div>
                    <div>
                        {progress.loaded}/{progress.total} modules loaded
                        {progress.failed > 0 && (
                            <span className="text-red-500 ml-2">({progress.failed} failed)</span>
                        )}
                    </div>
                </div>
            )}
            
            {stalled && (
                <div className="mt-2 text-xs text-orange-600">
                    Module loading is taking longer than expected. The application will continue shortly.
                </div>
            )}
        </div>
    );
};

export default ModuleLoadingProgress;
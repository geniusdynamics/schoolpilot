// ABOUTME: useAutoSave hook for automatic form data saving
// ABOUTME: Provides debounced auto-save with status tracking and manual trigger

import { useState, useEffect, useRef, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveOptions<T> {
  /** Data to auto-save */
  data: T;
  /** Save function (should return a promise) */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds */
  delay?: number;
  /** Enable/disable auto-save */
  enabled?: boolean;
  /** Minimum time between saves */
  minInterval?: number;
  /** Callback on successful save */
  onSuccess?: () => void;
  /** Callback on save error */
  onError?: (error: Error) => void;
}

export interface UseAutoSaveReturn {
  /** Current auto-save status */
  status: AutoSaveStatus;
  /** Timestamp of last successful save */
  lastSaved: Date | null;
  /** Manually trigger a save */
  triggerSave: () => Promise<void>;
  /** Reset status to idle */
  reset: () => void;
  /** Check if there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Force save immediately (bypasses debounce) */
  forceSave: () => Promise<void>;
}

/**
 * useAutoSave - Hook for automatic form data saving
 *
 * Provides debounced auto-save functionality with status tracking.
 * Useful for forms that need to save data automatically as the user types.
 *
 * @example
 * const { status, lastSaved, triggerSave } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => {
 *     await api.saveForm(data);
 *   },
 *   delay: 2000,
 *   enabled: true,
 * });
 *
 * // Display status
 * <div className="text-sm">
 *   {status === 'saving' && 'Saving...'}
 *   {status === 'saved' && lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
 *   {status === 'error' && 'Save failed'}
 * </div>
 *
 * @example
 * // With form validation
 * const { status, triggerSave } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => {
 *     if (!validateForm(data)) {
 *       throw new Error('Validation failed');
 *     }
 *     await api.saveForm(data);
 *   },
 *   enabled: isValid,
 * });
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  minInterval = 1000,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const previousDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);

  // Save function
  const save = useCallback(async (dataToSave: T) => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setStatus('saving');

    try {
      await onSave(dataToSave);
      setStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      lastSaveTimeRef.current = Date.now();
      onSuccess?.();
    } catch (error) {
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, onSuccess, onError]);

  // Trigger save (respects debounce)
  const triggerSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check min interval
    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
    if (timeSinceLastSave < minInterval) {
      // Wait for min interval
      debounceTimerRef.current = setTimeout(() => {
        save(data);
      }, minInterval - timeSinceLastSave);
    } else {
      // Save immediately
      await save(data);
    }
  }, [data, enabled, minInterval, save]);

  // Force save (bypasses debounce)
  const forceSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    await save(data);
  }, [data, enabled, save]);

  // Reset status
  const reset = useCallback(() => {
    setStatus('idle');
    setHasUnsavedChanges(false);
  }, []);

  // Watch for data changes
  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed
    const dataChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    if (!dataChanged) return;

    previousDataRef.current = data;
    setHasUnsavedChanges(true);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimeRef.current;

      if (timeSinceLastSave >= minInterval) {
        save(data);
      } else {
        // Schedule save for when min interval has passed
        debounceTimerRef.current = setTimeout(() => {
          save(data);
        }, minInterval - timeSinceLastSave);
      }
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, delay, enabled, minInterval, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSaved,
    triggerSave,
    reset,
    hasUnsavedChanges,
    forceSave,
  };
}

export default useAutoSave;

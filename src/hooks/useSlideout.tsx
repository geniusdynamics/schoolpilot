import { logger } from '@/utils/logging';

// ABOUTME: Custom hook for managing slideout panel state and interactions
// ABOUTME: Provides state management, auto-save functionality, and form integration

import { useState, useCallback, useRef, useEffect } from 'react';
import { announceToScreenReader } from '@/utils/accessibility';

export interface UseSlideoutOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (data: any) => void | Promise<void>;
  onClose?: () => void;
  preventCloseOnUnsaved?: boolean;
}

export interface SlideoutState {
  isOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  data: any;
}

export function useSlideout<T = any>(options: UseSlideoutOptions = {}) {
  const {
    autoSave = false,
    autoSaveDelay = 2000,
    onSave,
    onClose,
    preventCloseOnUnsaved = true,
  } = options;

  // State
  const [state, setState] = useState<SlideoutState>({
    isOpen: false,
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    data: null,
  });

  // Refs
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  const initialData = useRef<T | null>(null);

  // Open slideout
  const open = useCallback((data?: T) => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      data: data || null,
      hasUnsavedChanges: false,
    }));
    
    initialData.current = data || null;
    announceToScreenReader('Form panel opened', 'polite');
  }, []);

  // Close slideout
  const close = useCallback(() => {
    if (preventCloseOnUnsaved && state.hasUnsavedChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!shouldClose) return false;
    }

    setState(prev => ({
      ...prev,
      isOpen: false,
      hasUnsavedChanges: false,
      data: null,
    }));

    // Clear auto-save timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    onClose?.();
    announceToScreenReader('Form panel closed', 'polite');
    return true;
  }, [preventCloseOnUnsaved, state.hasUnsavedChanges, onClose]);

  // Update data
  const updateData = useCallback((newData: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      const updatedData = typeof newData === 'function' 
        ? newData(prev.data) 
        : { ...prev.data, ...newData };
      
      return {
        ...prev,
        data: updatedData,
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  // Auto-save functionality
  const triggerAutoSave = useCallback(async () => {
    if (!autoSave || !onSave || !state.hasUnsavedChanges) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      try {
        setState(prev => ({ ...prev, isSaving: true }));
        await onSave(state.data);
        setState(prev => ({ 
          ...prev, 
          isSaving: false, 
          hasUnsavedChanges: false 
        }));
        announceToScreenReader('Changes saved automatically', 'polite');
      } catch (error) {
        setState(prev => ({ ...prev, isSaving: false }));
        logger.error('Auto-save failed:', error);
        announceToScreenReader('Auto-save failed', 'assertive');
      }
    }, autoSaveDelay);
  }, [autoSave, onSave, state.data, state.hasUnsavedChanges, autoSaveDelay]);

  // Manual save
  const save = useCallback(async () => {
    if (!onSave) return;

    try {
      setState(prev => ({ ...prev, isSaving: true }));
      await onSave(state.data);
      setState(prev => ({ 
        ...prev, 
        isSaving: false, 
        hasUnsavedChanges: false 
      }));
      announceToScreenReader('Changes saved successfully', 'polite');
      return true;
    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }));
      logger.error('Save failed:', error);
      announceToScreenReader('Save failed', 'assertive');
      return false;
    }
  }, [onSave, state.data]);

  // Reset to initial data
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      data: initialData.current,
      hasUnsavedChanges: false,
    }));
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
  }, []);

  // Check if data has changed from initial
  const hasChanges = useCallback(() => {
    if (!initialData.current && !state.data) return false;
    return JSON.stringify(initialData.current) !== JSON.stringify(state.data);
  }, [state.data]);

  // Auto-save effect
  useEffect(() => {
    if (state.hasUnsavedChanges) {
      triggerAutoSave();
    }
  }, [state.hasUnsavedChanges, triggerAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  return {
    // State
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    hasUnsavedChanges: state.hasUnsavedChanges,
    data: state.data,
    
    // Actions
    open,
    close,
    updateData,
    setLoading,
    save,
    reset,
    hasChanges,
    
    // Computed
    canClose: !preventCloseOnUnsaved || !state.hasUnsavedChanges,
  };
}

export default useSlideout;
// ABOUTME: useFormProgress hook for tracking form completion progress
// ABOUTME: Calculates progress based on filled/valid fields

import { useState, useCallback, useMemo, useEffect } from 'react';

export interface ProgressField {
  /** Field name */
  name: string;
  /** Whether the field is filled */
  filled: boolean;
  /** Whether the field is valid */
  valid: boolean;
  /** Field weight in progress calculation (default: 1) */
  weight?: number;
  /** Whether the field is required (affects progress calculation) */
  required?: boolean;
}

export interface UseFormProgressOptions {
  /** Fields to track */
  fields: ProgressField[];
  /** Include optional fields in progress calculation */
  includeOptional?: boolean;
  /** Only count valid fields (not just filled) */
  requireValid?: boolean;
  /** Callback when progress reaches 100% */
  onComplete?: () => void;
  /** Callback when progress changes */
  onProgressChange?: (progress: number) => void;
}

export interface UseFormProgressReturn {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Number of completed fields */
  completedCount: number;
  /** Total number of tracked fields */
  totalCount: number;
  /** Whether all fields are complete */
  isComplete: boolean;
  /** List of incomplete field names */
  incompleteFields: string[];
  /** Get progress for a specific field */
  getFieldProgress: (fieldName: string) => { filled: boolean; valid: boolean } | undefined;
  /** Mark a field as filled */
  setFieldFilled: (fieldName: string, filled: boolean) => void;
  /** Mark a field as valid */
  setFieldValid: (fieldName: string, valid: boolean) => void;
  /** Reset all progress */
  reset: () => void;
}

/**
 * useFormProgress - Hook for tracking form completion progress
 *
 * Calculates form progress based on filled/valid fields.
 * Useful for showing progress indicators and completion status.
 *
 * @example
 * const { progress, isComplete, incompleteFields } = useFormProgress({
 *   fields: [
 *     { name: 'firstName', filled: !!formData.firstName, valid: !errors.firstName, required: true },
 *     { name: 'lastName', filled: !!formData.lastName, valid: !errors.lastName, required: true },
 *     { name: 'email', filled: !!formData.email, valid: !errors.email, required: true },
 *     { name: 'phone', filled: !!formData.phone, valid: !errors.phone, required: false },
 *   ],
 *   requireValid: true,
 * });
 *
 * // Display progress
 * <div className="w-full bg-gray-200 rounded-full h-2">
 *   <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
 * </div>
 */
export function useFormProgress({
  fields: initialFields,
  includeOptional = true,
  requireValid = true,
  onComplete,
  onProgressChange,
}: UseFormProgressOptions): UseFormProgressReturn {
  const [fields, setFields] = useState<ProgressField[]>(initialFields);

  // Calculate progress
  const {
    progress,
    completedCount,
    totalCount,
    isComplete,
    incompleteFields,
  } = useMemo(() => {
    // Filter fields based on options
    const trackedFields = fields.filter(field =>
      includeOptional || field.required
    );

    const total = trackedFields.reduce((sum, field) => sum + (field.weight || 1), 0);
    const completed = trackedFields.reduce((sum, field) => {
      const isComplete = requireValid
        ? field.filled && field.valid
        : field.filled;
      return sum + (isComplete ? (field.weight || 1) : 0);
    }, 0);

    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const incomplete = fields
      .filter(field => {
        if (!includeOptional && !field.required) return false;
        return requireValid
          ? !(field.filled && field.valid)
          : !field.filled;
      })
      .map(field => field.name);

    return {
      progress: progressPercent,
      completedCount: completed,
      totalCount: total,
      isComplete: progressPercent === 100,
      incompleteFields: incomplete,
    };
  }, [fields, includeOptional, requireValid]);

  // Callbacks
  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  useEffect(() => {
    if (isComplete) {
      onComplete?.();
    }
  }, [isComplete, onComplete]);

  // Update fields when initialFields change
  useEffect(() => {
    setFields(initialFields);
  }, [initialFields]);

  // Get field progress
  const getFieldProgress = useCallback((fieldName: string) => {
    const field = fields.find(f => f.name === fieldName);
    return field ? { filled: field.filled, valid: field.valid } : undefined;
  }, [fields]);

  // Set field filled
  const setFieldFilled = useCallback((fieldName: string, filled: boolean) => {
    setFields(prev =>
      prev.map(field =>
        field.name === fieldName ? { ...field, filled } : field
      )
    );
  }, []);

  // Set field valid
  const setFieldValid = useCallback((fieldName: string, valid: boolean) => {
    setFields(prev =>
      prev.map(field =>
        field.name === fieldName ? { ...field, valid } : field
      )
    );
  }, []);

  // Reset progress
  const reset = useCallback(() => {
    setFields(prev =>
      prev.map(field => ({ ...field, filled: false, valid: false }))
    );
  }, []);

  return {
    progress,
    completedCount,
    totalCount,
    isComplete,
    incompleteFields,
    getFieldProgress,
    setFieldFilled,
    setFieldValid,
    reset,
  };
}

export default useFormProgress;

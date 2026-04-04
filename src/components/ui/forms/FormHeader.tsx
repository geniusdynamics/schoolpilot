// ABOUTME: FormHeader component for form titles, descriptions, and progress indicators
// ABOUTME: Provides consistent header styling across all form types

import React, { ReactNode } from 'react';
import { useTransition } from '../../../utils/animations';

export interface FormHeaderProps {
  /** Form title */
  title?: string;
  /** Form description or subtitle */
  description?: string;
  /** Progress percentage (0-100) for multi-step forms */
  progress?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Current step label (e.g., "Step 2 of 5") */
  stepLabel?: string;
  /** Icon to display next to title */
  icon?: ReactNode;
  /** Badge or status indicator */
  badge?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Auto-save status indicator */
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  /** Last saved timestamp */
  lastSaved?: Date | null;
}

/**
 * FormHeader - Consistent header component for all form types
 *
 * Displays form title, description, and optional progress indicator.
 * Supports auto-save status display for forms with auto-save enabled.
 *
 * @example
 * // Basic header
 * <FormHeader
 *   title="New Student Registration"
 *   description="Enter the student's personal information"
 * />
 *
 * @example
 * // With progress indicator
 * <FormHeader
 *   title="Application Form"
 *   progress={60}
 *   showProgress
 *   stepLabel="Step 3 of 5"
 * />
 *
 * @example
 * // With auto-save status
 * <FormHeader
 *   title="Edit Profile"
 *   autoSaveStatus="saved"
 *   lastSaved={new Date()}
 * />
 */
const FormHeader: React.FC<FormHeaderProps> = ({
  title,
  description,
  progress,
  showProgress = false,
  stepLabel,
  icon,
  badge,
  className = '',
  size = 'md',
  autoSaveStatus = 'idle',
  lastSaved,
}) => {
  const transitionStyles = useTransition(['all']);

  // Size styles
  const sizeStyles = {
    sm: {
      container: 'space-y-1',
      title: 'text-lg font-semibold text-gray-900',
      description: 'text-sm text-gray-600',
    },
    md: {
      container: 'space-y-2',
      title: 'text-xl font-semibold text-gray-900',
      description: 'text-sm text-gray-600',
    },
    lg: {
      container: 'space-y-3',
      title: 'text-2xl font-bold text-gray-900',
      description: 'text-base text-gray-600',
    },
  };

  const currentSize = sizeStyles[size];

  // Auto-save status display
  const getAutoSaveDisplay = () => {
    if (autoSaveStatus === 'idle' || autoSaveStatus === 'saved') {
      if (!lastSaved) return null;

      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) {
        return 'Saved just now';
      } else if (diffMins < 60) {
        return `Saved ${diffMins} min ago`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        return `Saved ${diffHours}h ago`;
      }
    }

    switch (autoSaveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 text-blue-600">
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1.5 text-green-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Save failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`${currentSize.container} ${className}`}
      style={transitionStyles}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex-shrink-0 text-gray-500">
              {icon}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              {title && (
                <h2 className={currentSize.title}>
                  {title}
                </h2>
              )}
              {badge && (
                <span className="flex-shrink-0">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className={currentSize.description}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Auto-save status */}
        {autoSaveStatus !== 'idle' && (
          <div className="text-xs flex-shrink-0">
            {getAutoSaveDisplay()}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && typeof progress === 'number' && (
        <div className="space-y-2">
          {/* Step label */}
          {stepLabel && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{stepLabel}</span>
              <span className="text-gray-900 font-medium">{progress}%</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FormHeader;

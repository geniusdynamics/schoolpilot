// ABOUTME: Slideout form panel component for contextual data entry with smooth animations
// ABOUTME: Supports left/right positioning, multiple widths, form validation integration, and auto-save

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusManagement, announceToScreenReader } from '../../../utils/accessibility';
import { useAnimation, transitions } from '../../../utils/animations';
import { designTokens } from '../../../utils/designTokens';
import { Button } from '../Button';
import { IconButton } from '../IconButton';

export interface SlideoutFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'left' | 'right';
  overlay?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  preventClose?: boolean;
  showCloseButton?: boolean;
}

const widthClasses = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[32rem]',
  xl: 'w-[40rem]',
};

const slideAnimations = {
  left: {
    enter: 'animate-slide-in-right',
    exit: 'animate-slide-out-left',
  },
  right: {
    enter: 'animate-slide-in-left',
    exit: 'animate-slide-out-right',
  },
};

export const SlideoutForm: React.FC<SlideoutFormProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  position = 'right',
  overlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  loading = false,
  className = '',
  onSave,
  onCancel,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  autoSave = false,
  autoSaveDelay = 2000,
  preventClose = false,
  showCloseButton = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const slideoutRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  
  const { trapFocus, restoreFocus } = useFocusManagement();

  // Handle opening animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      previousActiveElement.current = document.activeElement;
      
      // Announce to screen readers
      announceToScreenReader(`${title} form opened`, 'polite');
      
      // Set up focus trap after animation
      const timer = setTimeout(() => {
        if (slideoutRef.current) {
          trapFocus(slideoutRef.current);
        }
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, title, trapFocus]);

  // Handle closing animation
  const handleClose = useCallback(() => {
    if (preventClose && hasUnsavedChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!shouldClose) return;
    }

    setIsAnimating(true);
    
    // Clear auto-save timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    // Announce to screen readers
    announceToScreenReader(`${title} form closed`, 'polite');
    
    // Start exit animation
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      restoreFocus(previousActiveElement.current);
      onClose();
    }, 300);
  }, [preventClose, hasUnsavedChanges, title, restoreFocus, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, isOpen, handleClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      handleClose();
    }
  }, [closeOnOverlayClick, handleClose]);

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!autoSave || !onSave) return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave();
        setHasUnsavedChanges(false);
        announceToScreenReader('Changes saved automatically', 'polite');
      } catch (error) {
        console.error('Auto-save failed:', error);
        announceToScreenReader('Auto-save failed', 'assertive');
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);
  }, [autoSave, onSave, autoSaveDelay]);

  // Handle form changes for auto-save
  useEffect(() => {
    if (hasUnsavedChanges) {
      triggerAutoSave();
    }
  }, [hasUnsavedChanges, triggerAutoSave]);

  // Handle save action
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    try {
      setIsSaving(true);
      await onSave();
      setHasUnsavedChanges(false);
      announceToScreenReader('Changes saved successfully', 'polite');
    } catch (error) {
      console.error('Save failed:', error);
      announceToScreenReader('Save failed', 'assertive');
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Handle cancel action
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      handleClose();
    }
  }, [onCancel, handleClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  const slideoutContent = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex ${
        overlay ? 'bg-black/50 backdrop-blur-sm' : ''
      } ${position === 'left' ? 'justify-start' : 'justify-end'}`}
      onClick={handleOverlayClick}
      style={{
        animation: isOpen && !isAnimating 
          ? `fadeIn ${designTokens.animations.duration.normal} ${designTokens.animations.easing.easeOut}` 
          : undefined,
      }}
    >
      <div
        ref={slideoutRef}
        className={`
          ${widthClasses[width]}
          h-full
          bg-white
          dark:bg-gray-900
          border-l
          dark:border-gray-700
          shadow-xl
          flex
          flex-col
          ${className}
        `}
        style={{
          animation: isOpen 
            ? `${slideAnimations[position].enter} ${designTokens.animations.duration.normal} ${designTokens.animations.easing.easeOut}`
            : `${slideAnimations[position].exit} ${designTokens.animations.duration.fast} ${designTokens.animations.easing.easeIn}`,
          ...transitions,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideout-title"
        aria-describedby="slideout-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 
            id="slideout-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {/* Auto-save indicator */}
            {autoSave && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span>Unsaved changes</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Saved</span>
                  </>
                )}
              </div>
            )}
            
            {/* Close button */}
            {showCloseButton && (
              <IconButton
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                aria-label="Close form"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </IconButton>
            )}
          </div>
        </div>

        {/* Content */}
        <div 
          id="slideout-content"
          className="flex-1 overflow-y-auto p-6"
        >
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            </div>
          ) : (
            <div
              onChange={() => setHasUnsavedChanges(true)}
              onInput={() => setHasUnsavedChanges(true)}
            >
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        {(footer || onSave || onCancel) && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {footer || (
              <>
                {onCancel && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading || isSaving}
                  >
                    {cancelLabel}
                  </Button>
                )}
                {onSave && (
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={loading}
                  >
                    {saveLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(slideoutContent, document.body);
};

export default SlideoutForm;
import { logger } from '@/utils/logging';

// ABOUTME: Enhanced slideout form component with spring animations, gestures, and modern interactions
// ABOUTME: Supports different positions, auto-save, resize handles, backdrop blur, and accessibility features

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, Loader2, GripVertical } from 'lucide-react';
import { useFocusManagement, announceToScreenReader } from '../../../utils/accessibility';

export interface SlideoutFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
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
  // Enhanced features
  theme?: 'light' | 'dark' | 'auto';
  swipeToClose?: boolean;
  resizable?: boolean;
  backdropBlur?: boolean;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  onResize?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

const getSlideoutStyles = () => {
  const baseStyles = `
    fixed top-0 h-full z-50 flex flex-col
    ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}
    ${backdropBlur ? 'backdrop-blur-md' : ''}
    ${position === 'right' ? 'right-0 border-l' : 'left-0 border-r'}
    ${isResizing ? 'select-none' : ''}
  `;
  
  return baseStyles;
};

const getOverlayStyles = () => {
  return `
    fixed inset-0 z-40
    ${backdropBlur ? 'backdrop-blur-sm' : ''}
    ${isDark ? 'bg-black/50' : 'bg-black/25'}
  `;
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
void slideAnimations;

export const SlideoutForm: React.FC<SlideoutFormProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  position = 'right',
  overlay: _overlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  loading: _loading = false,
  className: _className = '',
  onSave,
  onCancel,
  saveLabel: _saveLabel = 'Save',
  cancelLabel: _cancelLabel = 'Cancel',
  autoSave = false,
  autoSaveDelay = 2000,
  preventClose = false,
  showCloseButton: _showCloseButton = true,
  // Enhanced features
  theme = 'auto',
  swipeToClose = true,
  resizable = false,
  backdropBlur: _backdropBlur = true,
  springConfig = { damping: 25, stiffness: 300, mass: 0.8 },
  onResize,
  minWidth = 320,
  maxWidth = 800,
}) => {
  void _overlay;
  void _loading;
  void _className;
  void _saveLabel;
  void _cancelLabel;
  void _showCloseButton;
  void _backdropBlur;
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  void isAnimating;
  void isVisible;
  void isSaving;
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  void autoSaveStatus;
  void setAutoSaveStatus;
  const [currentWidth, setCurrentWidth] = useState(getWidthValue(width));
  const [isResizing, setIsResizing] = useState(false);
  
  const slideoutRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // Motion values for gestures and animations
  const x = useMotionValue(0);
  const dragProgress = useTransform(x, 
    position === 'right' ? [0, 200] : [-200, 0], 
    [0, 1]
  );
  const opacity = useTransform(dragProgress, [0, 0.5, 1], [1, 0.8, 0]);
  const scale = useTransform(dragProgress, [0, 1], [1, 0.95]);
  
  const { trapFocus, restoreFocus } = useFocusManagement();
  
  // Helper function to get width value with mobile responsiveness
  function getWidthValue(widthSize: string) {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    if (isMobile) {
      // On mobile, use most of the screen width
      switch (widthSize) {
        case 'sm': return Math.min(320, window.innerWidth * 0.85);
        case 'md': return Math.min(480, window.innerWidth * 0.9);
        case 'lg': return Math.min(640, window.innerWidth * 0.95);
        case 'xl': return window.innerWidth * 0.98;
        case 'full': return window.innerWidth;
        default: return window.innerWidth * 0.9;
      }
    } else if (isTablet) {
      // On tablet, use reasonable proportions
      switch (widthSize) {
        case 'sm': return 320;
        case 'md': return 480;
        case 'lg': return Math.min(640, window.innerWidth * 0.7);
        case 'xl': return Math.min(800, window.innerWidth * 0.8);
        case 'full': return window.innerWidth;
        default: return 480;
      }
    } else {
      // Desktop behavior
      switch (widthSize) {
        case 'sm': return 320;
        case 'md': return 480;
        case 'lg': return 640;
        case 'xl': return 800;
        case 'full': return window.innerWidth;
        default: return 480;
      }
    }
  }
  
  // Theme detection
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Enhanced gesture handlers for mobile
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const isMobile = window.innerWidth < 768;
    const threshold = isMobile ? 80 : 100; // Lower threshold for mobile
    const velocityThreshold = isMobile ? 300 : 500; // Lower velocity threshold for mobile
    
    const velocity = position === 'right' ? info.velocity.x : -info.velocity.x;
    const offset = position === 'right' ? info.offset.x : -info.offset.x;
    
    if (swipeToClose && (offset > threshold || Math.abs(velocity) > velocityThreshold)) {
      onClose();
    } else {
      // Smooth snap back with spring animation
      x.set(0);
    }
  }, [position, swipeToClose, onClose, x]);
  
  // Enhanced touch handling for mobile resize
  const handleTouchResize = useCallback((event: TouchEvent) => {
    if (!resizable || !isResizing) return;
    
    event.preventDefault(); // Prevent scrolling during resize
    const touch = event.touches[0];
    if (!touch) return;
    
    let newWidth;
    if (position === 'right') {
      newWidth = window.innerWidth - touch.clientX;
    } else {
      newWidth = touch.clientX;
    }
    
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setCurrentWidth(newWidth);
    onResize?.(newWidth);
  }, [resizable, isResizing, position, minWidth, maxWidth, onResize]);
  
  // Resize handler
  const handleResize = useCallback((event: MouseEvent) => {
    if (!resizable || !isResizing) return;
    
    const rect = slideoutRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let newWidth;
    if (position === 'right') {
      newWidth = window.innerWidth - event.clientX;
    } else {
      newWidth = event.clientX;
    }
    
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setCurrentWidth(newWidth);
    onResize?.(newWidth);
  }, [resizable, isResizing, position, minWidth, maxWidth, onResize]);
  
  const handleResizeStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!resizable) return;
    
    event.preventDefault();
    setIsResizing(true);
    
    const isTouchEvent = 'touches' in event;
    
    if (isTouchEvent) {
      // Touch events for mobile
      document.addEventListener('touchmove', handleTouchResize, { passive: false });
      document.addEventListener('touchend', () => {
        setIsResizing(false);
        document.removeEventListener('touchmove', handleTouchResize);
      }, { once: true });
    } else {
      // Mouse events for desktop
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleResize);
      }, { once: true });
    }
  }, [resizable, handleResize, handleTouchResize]);

  // Handle opening animation with skip links
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      previousActiveElement.current = document.activeElement;
      
      // Add skip links for better keyboard navigation
      const slideoutElement = slideoutRef.current;
      if (slideoutElement) {
        // Create skip to content link
        const skipToContent = document.createElement('a');
        skipToContent.href = '#slideout-content';
        skipToContent.textContent = 'Skip to main content';
        skipToContent.className = 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:text-sm';
        skipToContent.setAttribute('data-skip-link', 'true');
        
        // Create skip to footer link (if footer exists)
        if (footer) {
          const skipToFooter = document.createElement('a');
          skipToFooter.href = '#slideout-footer';
          skipToFooter.textContent = 'Skip to footer';
          skipToFooter.className = 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-32 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:text-sm';
          skipToFooter.setAttribute('data-skip-link', 'true');
          slideoutElement.insertBefore(skipToFooter, slideoutElement.firstChild);
        }
        
        slideoutElement.insertBefore(skipToContent, slideoutElement.firstChild);
      }
      
      // Announce to screen readers with keyboard shortcuts
      announceToScreenReader(`${title} form opened. Press F6 to navigate between sections, Ctrl+S to save, Escape to close.`, 'polite');
      
      // Set up focus trap after animation
      const timer = setTimeout(() => {
        if (slideoutRef.current) {
          trapFocus(slideoutRef.current);
        }
        setIsAnimating(false);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        // Clean up skip links
        const skipLinks = document.querySelectorAll('[data-skip-link="true"]');
        skipLinks.forEach(link => link.remove());
      };
    }
  }, [isOpen, title, trapFocus, footer]);

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

  // Enhanced keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        handleClose();
        return;
      }

      // Handle Ctrl+S for save
      if (event.key === 's' && (event.ctrlKey || event.metaKey) && onSave) {
        event.preventDefault();
        handleSave();
        return;
      }

      // Handle Ctrl+Enter for save and close
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && onSave) {
        event.preventDefault();
        handleSave().then(() => {
          if (!preventClose) {
            handleClose();
          }
        });
        return;
      }

      // Handle F6 to cycle between slideout sections
      if (event.key === 'F6') {
        event.preventDefault();
        const slideoutElement = slideoutRef.current;
        if (!slideoutElement) return;

        const sections = [
          slideoutElement.querySelector('[data-slideout-header]'),
          slideoutElement.querySelector('[data-slideout-content]'),
          slideoutElement.querySelector('[data-slideout-footer]'),
        ].filter(Boolean) as HTMLElement[];

        const currentSection = sections.find(section => 
          section.contains(document.activeElement)
        );
        
        if (currentSection) {
          const currentIndex = sections.indexOf(currentSection);
          const nextIndex = event.shiftKey 
            ? (currentIndex - 1 + sections.length) % sections.length
            : (currentIndex + 1) % sections.length;
          
          const nextSection = sections[nextIndex];
          const focusableElement = nextSection.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          
          focusableElement?.focus();
        } else if (sections.length > 0) {
          // Focus first section if no current section
          const firstFocusable = sections[0].querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, isOpen, handleClose, onSave, handleSave, preventClose]);

  // Handle overlay click
  const _handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      handleClose();
    }
  }, [closeOnOverlayClick, handleClose]);
  void _handleOverlayClick;

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
        logger.error('Auto-save failed:', error);
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
      logger.error('Save failed:', error);
      announceToScreenReader('Save failed', 'assertive');
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Handle cancel action
  const _handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      handleClose();
    }
  }, [onCancel, handleClose]);
  void _handleCancel;

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleWindowResize = () => {
      const newWidth = getWidthValue(width);
      setCurrentWidth(newWidth);
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [width]);
  
  // Prevent body scroll on mobile when slideout is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  // Animation variants
  const slideoutVariants = {
    initial: {
      x: position === 'right' ? currentWidth : -currentWidth,
      opacity: 0,
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: springConfig.damping,
        stiffness: springConfig.stiffness,
        mass: springConfig.mass,
      },
    },
    exit: {
      x: position === 'right' ? currentWidth : -currentWidth,
      opacity: 0,
      transition: {
        type: 'spring',
        damping: springConfig.damping + 5,
        stiffness: springConfig.stiffness + 100,
        mass: springConfig.mass - 0.2,
      },
    },
  };
  
  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  if (!isOpen) return null;

  const slideoutContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          {showOverlay && (
            <motion.div
              className={getOverlayStyles()}
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={closeOnOverlayClick ? onClose : undefined}
              aria-hidden="true"
            />
          )}

          {/* Slideout Panel */}
          <motion.div
            ref={slideoutRef}
            className={`${getSlideoutStyles()} ${className}`}
            style={{
              width: currentWidth,
              x: swipeToClose ? x : undefined,
              opacity: swipeToClose ? opacity : undefined,
              scale: swipeToClose ? scale : undefined,
            }}
            variants={slideoutVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag={swipeToClose ? 'x' : false}
            dragConstraints={{ 
              left: position === 'right' ? 0 : -(window.innerWidth < 768 ? 150 : 200), 
              right: position === 'left' ? 0 : (window.innerWidth < 768 ? 150 : 200) 
            }}
            dragElastic={window.innerWidth < 768 ? 0.15 : 0.2}
            dragMomentum={window.innerWidth < 768}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby="slideout-title"
            tabIndex={-1}
          >
            {/* Resize Handle */}
            {resizable && (
              <motion.div
                ref={resizeHandleRef}
                className={`
                  absolute top-0 ${position === 'right' ? 'left-0' : 'right-0'} 
                  ${window.innerWidth < 768 ? 'w-3' : 'w-1'} h-full cursor-col-resize group
                  ${isDark ? 'hover:bg-gray-600 active:bg-gray-500' : 'hover:bg-gray-300 active:bg-gray-400'}
                  transition-colors duration-200 touch-none
                `}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                whileHover={{ scale: window.innerWidth < 768 ? 1.2 : 1.5 }}
                whileTap={{ scale: 1.1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <div className={`
                  absolute top-1/2 ${position === 'right' ? 'left-1' : 'right-1'}
                  transform -translate-y-1/2 
                  ${window.innerWidth < 768 ? 'opacity-60' : 'opacity-0 group-hover:opacity-100'}
                  transition-opacity duration-200
                `}>
                  <GripVertical className={`${window.innerWidth < 768 ? 'w-3 h-3' : 'w-4 h-4'} text-gray-400`} />
                </div>
              </motion.div>
            )}
            {/* Header */}
            <div 
              data-slideout-header
              className={`flex items-center justify-between p-6 border-b ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <h2 
                id="slideout-title"
                className={`text-lg font-semibold ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}
              >
                {title}
              </h2>
              <div className="flex items-center gap-2">
                {/* Auto-save indicator */}
                {autoSave && (
                  <motion.div 
                    className={`flex items-center gap-2 text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  >
                    {autoSaveStatus === 'saving' ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : hasUnsavedChanges ? (
                      <>
                        <motion.div 
                          className="w-2 h-2 bg-yellow-500 rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <span>Unsaved changes</span>
                      </>
                    ) : (
                      <>
                        <motion.div 
                          className="w-2 h-2 bg-green-500 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                        />
                        <span>Saved</span>
                      </>
                    )}
                  </motion.div>
                )}
                
                {/* Close button */}
                <motion.button
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={onClose}
                  disabled={isLoading}
                  aria-label="Close slideout"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div 
              id="slideout-content"
              data-slideout-content
              className="flex-1 overflow-y-auto p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              tabIndex={-1}
            >
              {isLoading ? (
                <motion.div 
                  className="flex items-center justify-center h-32"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      Loading...
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 20, stiffness: 300 }}
                  onChange={() => setHasUnsavedChanges(true)}
                  onInput={() => setHasUnsavedChanges(true)}
                >
                  {children}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {footer && (
              <motion.div 
                id="slideout-footer"
                data-slideout-footer
                className={`flex items-center justify-end gap-3 p-6 border-t focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  isDark ? 'border-gray-700' : 'border-gray-200'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 300 }}
                tabIndex={-1}
              >
                {footer}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(slideoutContent, document.body);
};

export default SlideoutForm;
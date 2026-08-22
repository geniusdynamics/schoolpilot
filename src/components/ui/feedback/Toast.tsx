import { logger } from '@/utils/logging';

// ABOUTME: Enhanced toast notification component with spring animations and gesture support
// ABOUTME: Supports success, error, warning, info variants with auto-dismiss, progress indicators, pause-on-hover, and swipe-to-dismiss

import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'progress';
export type ToastSize = 'normal' | 'compact';

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  size?: ToastSize;
  duration?: number;
  progress?: number;
  showProgress?: boolean;
  onDismiss?: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  // Enhanced features
  pauseOnHover?: boolean;
  swipeToDismiss?: boolean;
  soundEnabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  theme?: 'light' | 'dark' | 'auto';
  stackIndex?: number;
  totalStacked?: number;
}

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  variant = 'info',
  size = 'normal',
  duration,
  progress,
  showProgress = false,
  onDismiss,
  action,
  className = '',
  // Enhanced features
  pauseOnHover = true,
  swipeToDismiss = true,
  soundEnabled: _soundEnabled = false,
  position = 'top-right',
  theme: _theme = 'auto',
  stackIndex: _stackIndex = 0,
  totalStacked: _totalStacked = 1,
}) => {
  void _soundEnabled;
  void _theme;
  void _stackIndex;
  void _totalStacked;
  // Set default duration based on size
  const defaultDuration = size === 'compact' ? 1500 : 5000;
  const toastDuration = duration !== undefined ? duration : defaultDuration;
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  void isExiting;
  const [timeLeft, setTimeLeft] = useState(toastDuration);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const progressRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  void audioRef;
  
  // Motion values for gesture handling
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  void scale;

  // Sound notification effect
  useEffect(() => {
    if (_soundEnabled && isVisible) {
      const playSound = () => {
        try {
          // Create different sounds for different variants
          const frequency = {
            success: 800,
            error: 400,
            warning: 600,
            info: 500,
            progress: 450
          }[variant];
          
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
          logger.warn('Sound notification failed:', error);
        }
      };
      
      playSound();
    }
  }, [_soundEnabled, isVisible, variant]);

  // Enhanced animation and auto-dismiss logic
  useEffect(() => {
    // Trigger entrance animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    return () => clearTimeout(enterTimer);
  }, []);

  // Auto-dismiss timer with pause support
  useEffect(() => {
    if (toastDuration > 0 && variant !== 'progress' && isVisible && !isPaused) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, timeLeft);

      timerRef.current = dismissTimer;

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [toastDuration, variant, isVisible, isPaused, timeLeft]);

  // Progress timer
  useEffect(() => {
    if (toastDuration > 0 && variant !== 'progress' && isVisible && !isPaused) {
      const progressTimer = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - 100);
          return newTime;
        });
      }, 100);

      return () => clearInterval(progressTimer);
    }
  }, [toastDuration, variant, isVisible, isPaused]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.(id);
    }, 300); // Match exit animation duration
  };

  // Gesture handling for swipe-to-dismiss
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!swipeToDismiss) return;
    
    const threshold = 100;
    const velocity = Math.abs(info.velocity.x);
    const offset = Math.abs(info.offset.x);
    
    if (offset > threshold || velocity > 500) {
      handleDismiss();
    } else {
      // Snap back to original position
      x.set(0);
    }
  };

  // Pause on hover handlers
  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  const getVariantStyles = () => {
    const isDark = _theme === 'dark' || (_theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Calculate stacking transform
    const stackOffset = _stackIndex * 4;
    const stackScale = 1 - (_stackIndex * 0.05);
    const stackOpacity = Math.max(0.7, 1 - (_stackIndex * 0.15));
    void stackOffset;
    void stackScale;
    void stackOpacity;
    
    const baseStyles = `
      relative overflow-hidden rounded-lg border backdrop-blur-sm
      transition-all duration-300 ease-out cursor-pointer
      ${swipeToDismiss ? 'select-none' : ''}
    `;

    const getColorClasses = (variant: ToastVariant) => {
      if (isDark) {
        switch (variant) {
          case 'success':
            return 'bg-green-900/90 border-green-700 text-green-100';
          case 'error':
            return 'bg-red-900/90 border-red-700 text-red-100';
          case 'warning':
            return 'bg-yellow-900/90 border-yellow-700 text-yellow-100';
          case 'progress':
            return 'bg-blue-900/90 border-blue-700 text-blue-100';
          default:
            return 'bg-blue-900/90 border-blue-700 text-blue-100';
        }
      } else {
        switch (variant) {
          case 'success':
            return 'bg-green-50/95 border-green-200 text-green-800';
          case 'error':
            return 'bg-red-50/95 border-red-200 text-red-800';
          case 'warning':
            return 'bg-yellow-50/95 border-yellow-200 text-yellow-800';
          case 'progress':
            return 'bg-blue-50/95 border-blue-200 text-blue-800';
          default:
            return 'bg-blue-50/95 border-blue-200 text-blue-800';
        }
      }
    };

    return `${baseStyles} ${getColorClasses(variant)}`;
  };

  const getIcon = () => {
    const iconClass = size === 'compact' ? "w-4 h-4 flex-shrink-0" : "w-5 h-5 flex-shrink-0";
    
    switch (variant) {
      case 'success':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClass} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'progress':
        return (
          <svg className={`${iconClass} text-blue-500 animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const progressPercentage = progress !== undefined ? progress : 
    (toastDuration > 0 && variant !== 'progress') ? ((toastDuration - timeLeft) / toastDuration) * 100 : 0;

  // Animation variants for spring physics
  const toastVariants = {
    initial: {
      x: position.includes('right') ? 400 : -400,
      opacity: 0,
      scale: 0.8,
      rotateZ: position.includes('right') ? 10 : -10,
    },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1 - (_stackIndex * 0.05),
      rotateZ: 0,
      y: _stackIndex * -4,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
        mass: 0.8,
      },
    },
    exit: {
      x: position.includes('right') ? 400 : -400,
      opacity: 0,
      scale: 0.8,
      rotateZ: position.includes('right') ? 10 : -10,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 400,
        mass: 0.6,
      },
    },
    hover: {
      scale: (1 - (_stackIndex * 0.05)) * 1.02,
      y: _stackIndex * -4 - 2,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 400,
      },
    },
  };

  // Get size-specific classes
  const getSizeClasses = () => {
    if (size === 'compact') {
      return 'w-64 max-w-xs p-2 shadow-md';
    }
    return 'w-80 max-w-sm p-4 shadow-lg';
  };

  return (
    <motion.div
      className={`${getVariantStyles()} ${className} ${getSizeClasses()}`}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={pauseOnHover ? "hover" : undefined}
      drag={swipeToDismiss ? 'x' : false}
      dragConstraints={{ left: -200, right: 200 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        x: swipeToDismiss ? x : undefined,
        opacity: swipeToDismiss ? opacity : undefined,
        zIndex: 1000 - _stackIndex,
      }}
    >
      {/* Progress bar */}
      {(showProgress || variant === 'progress' || (duration > 0 && variant !== 'progress')) && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black bg-opacity-10">
          <div
            ref={progressRef}
            className={`h-full transition-all duration-100 ease-linear ${
              variant === 'success' ? 'bg-green-500' :
              variant === 'error' ? 'bg-red-500' :
              variant === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      <div className={`flex items-start ${size === 'compact' ? 'space-x-2' : 'space-x-3'}`}>
        {getIcon()}
        
        <div className="flex-1 min-w-0">
          {title && size !== 'compact' && (
            <h4 className="text-sm font-semibold mb-1 truncate">
              {title}
            </h4>
          )}
          <p className={`${size === 'compact' ? 'text-xs' : 'text-sm'} leading-relaxed`}>
            {message}
          </p>
          
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 ${size === 'compact' ? 'text-xs' : 'text-sm'} font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded`}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ${size === 'compact' ? 'p-0.5' : 'p-1'} rounded-md hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors`}
          aria-label="Dismiss notification"
        >
          <svg className={`${size === 'compact' ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Pause indicator */}
      {isPaused && pauseOnHover && (
        <motion.div
          className="absolute top-2 right-2 bg-black/20 rounded-full p-1"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Toast;
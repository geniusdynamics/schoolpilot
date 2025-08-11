// ABOUTME: Comprehensive loading states and skeleton components for SchoolPilot3
// ABOUTME: Progressive loading indicators with shimmer animations and accessibility support

import React from 'react';
import { useReducedMotion } from '../../../utils/accessibility';
import { designTokens } from '../../../utils/designTokens';
import { createAnimation } from '../../../utils/animations';

// Base skeleton component with shimmer animation
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'shimmer' | 'none';
  'aria-label'?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'shimmer',
  'aria-label': ariaLabel = 'Loading content',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion && animation !== 'none';

  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };

  const animationClasses = shouldAnimate ? {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
    none: '',
  } : { pulse: '', shimmer: '', none: '' };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

// Text skeleton with realistic text proportions
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  className = '',
  animation = 'shimmer',
}) => {
  const lineWidths = ['100%', '85%', '92%', '78%', '95%', '88%', '90%'];

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading text content">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          width={lineWidths[index % lineWidths.length]}
          animation={animation}
          aria-label={`Loading line ${index + 1} of ${lines}`}
        />
      ))}
    </div>
  );
};

// Avatar skeleton
interface AvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({
  size = 'md',
  className = '',
  animation = 'shimmer',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton
      className={`${sizeClasses[size]} ${className}`}
      variant="circular"
      animation={animation}
      aria-label="Loading avatar"
    />
  );
};

// Card skeleton for data cards
interface CardSkeletonProps {
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className = '',
  showAvatar = false,
  showActions = true,
  animation = 'shimmer',
}) => {
  return (
    <div className={`p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`} role="status" aria-label="Loading card content">
      <div className="space-y-4">
        {/* Header with optional avatar */}
        <div className="flex items-center space-x-3">
          {showAvatar && <AvatarSkeleton size="md" animation={animation} />}
          <div className="flex-1 space-y-2">
            <Skeleton height="1.25rem" width="60%" animation={animation} aria-label="Loading title" />
            <Skeleton height="0.875rem" width="40%" animation={animation} aria-label="Loading subtitle" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <TextSkeleton lines={3} animation={animation} />
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex justify-end space-x-2 pt-4">
            <Skeleton height="2.25rem" width="5rem" animation={animation} aria-label="Loading action button" />
            <Skeleton height="2.25rem" width="4rem" animation={animation} aria-label="Loading action button" />
          </div>
        )}
      </div>
    </div>
  );
};

// Table skeleton for data grids
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = '',
  showHeader = true,
  animation = 'shimmer',
}) => {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading table content">
      {/* Header */}
      {showHeader && (
        <div className="grid gap-4 pb-2 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              height="1rem"
              width="80%"
              animation={animation}
              aria-label={`Loading column header ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                height="1rem"
                width={colIndex === 0 ? '90%' : '70%'} // First column slightly wider
                animation={animation}
                aria-label={`Loading cell ${rowIndex + 1}, ${colIndex + 1}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Form skeleton
interface FormSkeletonProps {
  fields?: number;
  className?: string;
  showButtons?: boolean;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  className = '',
  showButtons = true,
  animation = 'shimmer',
}) => {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading form content">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={`field-${index}`} className="space-y-2">
          {/* Label */}
          <Skeleton height="1rem" width="25%" animation={animation} aria-label={`Loading field label ${index + 1}`} />
          {/* Input */}
          <Skeleton height="2.5rem" width="100%" animation={animation} aria-label={`Loading field input ${index + 1}`} />
        </div>
      ))}

      {/* Buttons */}
      {showButtons && (
        <div className="flex justify-end space-x-3 pt-4">
          <Skeleton height="2.5rem" width="5rem" animation={animation} aria-label="Loading cancel button" />
          <Skeleton height="2.5rem" width="4rem" animation={animation} aria-label="Loading submit button" />
        </div>
      )}
    </div>
  );
};

// List skeleton
interface ListSkeletonProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  className = '',
  showAvatar = true,
  animation = 'shimmer',
}) => {
  return (
    <div className={`space-y-4 ${className}`} role="status" aria-label="Loading list content">
      {Array.from({ length: items }).map((_, index) => (
        <div key={`item-${index}`} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {showAvatar && <AvatarSkeleton size="md" animation={animation} />}
          <div className="flex-1 space-y-2">
            <Skeleton height="1rem" width="70%" animation={animation} aria-label={`Loading item title ${index + 1}`} />
            <Skeleton height="0.875rem" width="50%" animation={animation} aria-label={`Loading item description ${index + 1}`} />
          </div>
          <Skeleton height="2rem" width="3rem" animation={animation} aria-label={`Loading item action ${index + 1}`} />
        </div>
      ))}
    </div>
  );
};

// Progressive loading indicator
interface ProgressiveLoaderProps {
  progress?: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  label?: string;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  progress = 0,
  className = '',
  showPercentage = true,
  label = 'Loading',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label={`${label} ${clampedProgress}% complete`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{clampedProgress}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

// Spinner with different variants
interface SpinnerLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dots' | 'bars';
  className?: string;
  label?: string;
}

export const SpinnerLoader: React.FC<SpinnerLoaderProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
  label = 'Loading',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  if (prefersReducedMotion) {
    return (
      <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
        <div className={`${sizeClasses[size]} border-2 border-primary-600 rounded-full`} />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'} bg-primary-600 rounded-full animate-bounce`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        );
      case 'bars':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${size === 'sm' ? 'w-1 h-4' : size === 'md' ? 'w-1 h-6' : 'w-2 h-8'} bg-primary-600 animate-pulse`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        );
      default:
        return (
          <div className={`${sizeClasses[size]} border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
        );
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
      {renderSpinner()}
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Loading overlay for blocking interactions
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  className = '',
  backdrop = true,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${backdrop ? 'bg-black bg-opacity-50' : ''} ${className}`}
      role="status"
      aria-label={message}
      aria-live="polite"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-sm mx-4">
        <div className="flex items-center space-x-3">
          <SpinnerLoader size="md" />
          <span className="text-gray-700 dark:text-gray-300 font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
};

// Export all components
export default {
  Skeleton,
  TextSkeleton,
  AvatarSkeleton,
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  ListSkeleton,
  ProgressiveLoader,
  SpinnerLoader,
  LoadingOverlay,
};
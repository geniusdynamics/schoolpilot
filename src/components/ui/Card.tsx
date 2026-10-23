
// ABOUTME: Enhanced Card component with modern styling, hover animations, and interactive states
// ABOUTME: Supports multiple variants, responsive layouts, and accessibility features

import React, { ReactNode, forwardRef, HTMLAttributes } from 'react';
import { useTransition } from '@/utils/animations';
import { useReducedMotion } from '@/utils/accessibility';
import { InfoHint } from '@/components/ui/feedback';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'interactive' | 'compact';
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: string; // Optional secondary line rendered under the title
  /**
   * An explanation shown on demand from an icon beside the title, instead of a permanent
   * introductory box in the body. The box cost roughly 70px on every visit and repeated what the
   * title already said; the sentence is read once, so it belongs behind the icon.
   */
  info?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode; // For buttons or links in the header
  icon?: ReactNode; // Optional icon for the card header
  bodyClassName?: string; // Optional class for the content area
  headerClassName?: string; // Optional class for the header area
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean; // Makes the card clickable with hover effects
  loading?: boolean; // Shows loading state
  disabled?: boolean; // Disables interactions
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  'aria-label'?: string;
  role?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  title,
  subtitle,
  info,
  children,
  className = '',
  actions,
  icon,
  bodyClassName = '',
  headerClassName = '',
  variant = 'default',
  size = 'md',
  interactive = false,
  loading = false,
  disabled = false,
  onClick,
  onKeyDown,
  'aria-label': ariaLabel,
  role,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const transitionStyles = useTransition(['all', 'transform', 'box-shadow']);

  // Determine if card should be interactive
  const isInteractive = interactive || onClick;
  const isClickable = !disabled && !loading && isInteractive;

  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(event);
    }
    
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  // Handle click interactions
  const handleClick = () => {
    if (isClickable) {
      onClick?.();
    }
  };

  // Get variant-specific styles
  const getVariantStyles = (): string => {
    const baseStyles = 'bg-surface-card border transition-all duration-300 ease-in-out';
    
    switch (variant) {
      case 'elevated':
        return `${baseStyles} border-surface-border shadow-lg hover:shadow-xl`;
      case 'outlined':
        return `${baseStyles} border-surface-border shadow-none hover:shadow-md`;
      case 'filled':
        return `${baseStyles} border-gray-100 bg-surface-muted shadow-sm hover:shadow-md`;
      case 'interactive':
        return `${baseStyles} border-surface-border shadow-md hover:shadow-lg hover:-translate-y-1 cursor-pointer`;
      case 'compact':
        return `${baseStyles} border-surface-border shadow-sm hover:shadow-md`;
      default:
        return `${baseStyles} border-surface-border shadow-lg`;
    }
  };

  // Get size-specific styles
  const getSizeStyles = (): { card: string; header: string; body: string } => {
    switch (size) {
      case 'sm':
        return {
          card: 'rounded-lg',
          header: 'px-3 py-3 sm:px-4',
          body: 'px-3 py-3 sm:px-4'
        };
      case 'lg':
        return {
          card: 'rounded-2xl',
          header: 'px-6 py-6 sm:px-8',
          body: 'px-6 py-6 sm:px-8'
        };
      case 'xl':
        return {
          card: 'rounded-3xl',
          header: 'px-8 py-8 sm:px-10',
          body: 'px-8 py-8 sm:px-10'
        };
      default: // md
        return {
          card: 'rounded-xl',
          header: 'px-4 py-3 sm:px-6',
          body: 'px-4 py-3 sm:p-6'
        };
    }
  };

  // Get interactive styles
  const getInteractiveStyles = (): string => {
    if (!isInteractive) return '';
    
    const baseInteractive = 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
    
    if (disabled) {
      return `${baseInteractive} opacity-50 cursor-not-allowed`;
    }
    
    if (loading) {
      return `${baseInteractive} cursor-wait`;
    }
    
    return `${baseInteractive} cursor-pointer hover:scale-[1.02] active:scale-[0.98]`;
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const interactiveStyles = getInteractiveStyles();

  // Combine all styles
  const cardClasses = [
    variantStyles,
    sizeStyles.card,
    interactiveStyles,
    'overflow-hidden',
    'group', // For group hover effects
    className
  ].filter(Boolean).join(' ');

  // Loading overlay
  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-surface-card bg-opacity-75 flex items-center justify-center z-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <div
      ref={ref}
      className={cardClasses}
      style={prefersReducedMotion ? {} : transitionStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : undefined}
      role={role || (isClickable ? 'button' : undefined)}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      {...props}
    >
      {loading && <LoadingOverlay />}
      
      {/* Header Section */}
      {(title || subtitle || actions || icon || info) && (
        <div className={`
          border-b border-surface-border flex justify-between items-center
          ${sizeStyles.header}
          ${headerClassName}
        `}>
          <div className="flex items-center min-w-0 flex-1">
            {icon && (
              <span className="mr-3 text-primary-600 flex-shrink-0 group-hover:text-primary-700 transition-colors duration-200">
                {icon}
              </span>
            )}
            {(title || subtitle || info) && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {title && (
                    <h3 className="text-base leading-5 font-semibold text-surface-foreground truncate group-hover:text-surface-foreground transition-colors duration-200">
                      {title}
                    </h3>
                  )}
                  {info && <InfoHint text={info} />}
                </div>
                {subtitle && (
                  <p className="mt-0.5 text-sm text-surface-muted-fg truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
          {actions && (
            <div className="ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Body Section */}
      <div className={`
        relative
        ${sizeStyles.body}
        ${bodyClassName}
      `}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

// Shadcn-ui style sub-components for compatibility
export const CardHeader: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 pb-2 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-base font-semibold text-surface-foreground ${className}`}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-sm text-surface-muted-fg mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 pt-0 ${className}`}>
    {children}
  </div>
);

export default Card;

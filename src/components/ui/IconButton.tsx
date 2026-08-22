// ABOUTME: IconButton component for icon-only interactions with enhanced accessibility
// ABOUTME: Provides proper ARIA labels, tooltips, and focus indicators for icon buttons

import React, { ReactNode, ElementType, forwardRef } from 'react';

import { useTransition } from '@/utils/animations';
import { generateId } from '@/utils/accessibility';

// Spinner component for loading states
const Spinner = ({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Props specific to IconButton component
interface IconButtonBaseProps {
  icon: ReactNode;
  'aria-label': string; // Required for accessibility
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  rounded?: boolean;
  className?: string;
  'aria-describedby'?: string;
  tooltip?: string;
}

// Polymorphic 'as' prop for IconButton
export type PolymorphicIconButtonProps<C extends ElementType> = IconButtonBaseProps & {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, keyof IconButtonBaseProps | 'as'>;

const IconButton = forwardRef(<C extends ElementType = "button">(
  {
    as,
    icon,
    'aria-label': ariaLabel,
    variant = 'ghost',
    size = 'md',
    loading = false,
    rounded = false,
    className = '',
    'aria-describedby': ariaDescribedBy,
    tooltip,
    disabled,
    ...rest
  }: PolymorphicIconButtonProps<C>,
  ref: React.Ref<any>
) => {
  const Component = as || 'button';
  const buttonId = generateId('icon-button');
  const isDisabled = disabled || loading;

  // Enhanced transition styles
  const transitionStyles = useTransition([
    'background-color',
    'border-color',
    'color',
    'box-shadow',
    'transform',
    'opacity'
  ]);

  // Base styles optimized for icon buttons
  const baseStyles = [
    'relative',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'border',
    'focus:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-offset-2',
    'active:scale-95',
    'select-none',
    'flex-shrink-0',
    isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    // Enhanced hover effects
    !isDisabled ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : '',
  ].filter(Boolean).join(' ');

  // Variant styles using standard Tailwind classes
  const variantStyles = {
    primary: [
      'bg-indigo-600 text-white border-indigo-600',
      'hover:bg-indigo-700 hover:border-indigo-700',
      'focus-visible:ring-indigo-500',
      'active:bg-indigo-800',
    ].join(' '),
    secondary: [
      'bg-gray-100 text-gray-900 border-gray-200',
      'hover:bg-gray-200 hover:border-gray-300',
      'focus-visible:ring-gray-500',
      'active:bg-gray-300',
    ].join(' '),
    success: [
      'bg-green-600 text-white border-green-600',
      'hover:bg-green-700 hover:border-green-700',
      'focus-visible:ring-green-500',
      'active:bg-green-800',
    ].join(' '),
    warning: [
      'bg-yellow-600 text-white border-yellow-600',
      'hover:bg-yellow-700 hover:border-yellow-700',
      'focus-visible:ring-yellow-500',
      'active:bg-yellow-800',
    ].join(' '),
    danger: [
      'bg-red-600 text-white border-red-600',
      'hover:bg-red-700 hover:border-red-700',
      'focus-visible:ring-red-500',
      'active:bg-red-800',
    ].join(' '),
    ghost: [
      'bg-transparent text-gray-600 border-transparent',
      'hover:bg-gray-100 hover:text-gray-700',
      'focus-visible:ring-gray-500',
      'active:bg-gray-200',
    ].join(' '),
    outline: [
      'bg-transparent text-indigo-600 border-indigo-600',
      'hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-700',
      'focus-visible:ring-indigo-500',
      'active:bg-indigo-100',
    ].join(' '),
  };

  // Size styles optimized for square icon buttons
  const sizeStyles = {
    xs: `w-7 h-7 ${rounded ? 'rounded-full' : 'rounded-md'}`,
    sm: `w-8 h-8 ${rounded ? 'rounded-full' : 'rounded-md'}`,
    md: `w-10 h-10 ${rounded ? 'rounded-full' : 'rounded-md'}`,
    lg: `w-11 h-11 ${rounded ? 'rounded-full' : 'rounded-lg'}`,
    xl: `w-12 h-12 ${rounded ? 'rounded-full' : 'rounded-lg'}`,
  };

  // Icon size mapping
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  // Spinner size mapping
  const spinnerSizes = {
    xs: 'xs' as const,
    sm: 'xs' as const,
    md: 'sm' as const,
    lg: 'sm' as const,
    xl: 'md' as const,
  };

  const combinedClassName = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].filter(Boolean).join(' ');

  // Icon content with loading state
  const iconContent = loading ? (
    <Spinner size={spinnerSizes[size]} />
  ) : (
    <span className={`${iconSizes[size]} flex items-center justify-center`} aria-hidden="true">
      {icon}
    </span>
  );

  return (
    <Component
      ref={ref}
      id={buttonId}
      className={combinedClassName}
      style={transitionStyles}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      title={tooltip || ariaLabel} // Fallback tooltip
      {...rest}
    >
      {iconContent}
    </Component>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
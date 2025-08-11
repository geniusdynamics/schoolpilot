
// ABOUTME: Enhanced Button component with modern styling, animations, and accessibility
// ABOUTME: Supports loading states, improved hover effects, and WCAG 2.1 AA compliance

import React, { ReactNode, ElementType, forwardRef } from 'react';
import { designTokens } from '../../utils/designTokens';
import { useTransition } from '../../utils/animations';
import { generateId, meetsWCAGAA } from '../../utils/accessibility';

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

// Props specific to our Button component's styling and behavior
interface ButtonBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Polymorphic 'as' prop
export type PolymorphicButtonProps<C extends ElementType> = ButtonBaseProps & {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, keyof ButtonBaseProps | 'as'>;

const Button = forwardRef(<C extends ElementType = "button">(
  {
    as,
    children,
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    loadingText,
    fullWidth = false,
    className = '',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    disabled,
    ...rest
  }: PolymorphicButtonProps<C>,
  ref: React.Ref<any>
) => {
  // Extract leftIcon and rightIcon from rest to prevent them from being passed to DOM
  const { leftIcon: _, rightIcon: __, ...domProps } = rest as any;
  const Component = as || 'button';
  const buttonId = generateId('button');
  const isDisabled = disabled || loading;

  // Enhanced transition styles using design tokens
  const transitionStyles = useTransition([
    'background-color',
    'border-color',
    'color',
    'box-shadow',
    'transform',
    'opacity'
  ]);

  // Base styles with improved focus indicators and animations
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
    fullWidth ? 'w-full' : '',
    isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    // Enhanced hover effects with transform
    !isDisabled ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : '',
  ].filter(Boolean).join(' ');

  // Enhanced variant styles with WCAG AA compliant colors using standard Tailwind classes
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
      'bg-transparent text-indigo-600 border-transparent',
      'hover:bg-indigo-50 hover:text-indigo-700',
      'focus-visible:ring-indigo-500',
      'active:bg-indigo-100',
    ].join(' '),
    outline: [
      'bg-transparent text-indigo-600 border-indigo-600',
      'hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-700',
      'focus-visible:ring-indigo-500',
      'active:bg-indigo-100',
    ].join(' '),
  };

  // Enhanced size styles with better proportions
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5 min-h-[28px]',
    sm: 'px-3 py-2 text-sm rounded-md gap-2 min-h-[32px]',
    md: 'px-4 py-2.5 text-sm rounded-md gap-2 min-h-[40px]',
    lg: 'px-6 py-3 text-base rounded-lg gap-2.5 min-h-[44px]',
    xl: 'px-8 py-4 text-lg rounded-lg gap-3 min-h-[52px]',
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

  // Content with loading state
  const buttonContent = (
    <>
      {loading && (
        <Spinner size={spinnerSizes[size]} />
      )}
      {!loading && leftIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {loading && loadingText ? loadingText : children}
      </span>
      {!loading && rightIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </>
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
      {...domProps}
    >
      {buttonContent}
    </Component>
  );
});

Button.displayName = 'Button';

export default Button;

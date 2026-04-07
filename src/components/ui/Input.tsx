
// ABOUTME: Enhanced Input component with floating labels, animations, and modern styling
// ABOUTME: Supports validation states, loading indicators, icons, and accessibility features

import React, { InputHTMLAttributes, ReactNode, useState, useRef, useEffect } from 'react';
import { getFormFieldIds, getAriaInvalid, createAriaDescribedBy } from '@/utils/accessibility';
import { useTransition } from '@/utils/animations';
import { designTokens } from '@/utils/designTokens';

export interface ModernInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  success?: boolean;
  loading?: boolean;
  helperText?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onValidate?: (value: string) => string | undefined;
  containerClassName?: string;
  floatingLabel?: boolean;
}

const Input: React.FC<ModernInputProps> = ({
  label,
  id,
  error,
  success = false,
  loading = false,
  helperText,
  variant = 'outlined',
  size = 'md',
  leftIcon,
  rightIcon,
  onValidate,
  className = '',
  containerClassName = '',
  floatingLabel = true,
  value,
  defaultValue,
  onFocus,
  onBlur,
  onChange,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(() => {
    // Better initial state calculation
    return Boolean(value || defaultValue);
  });
  const [internalError, setInternalError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const fieldIds = getFormFieldIds(props.name || 'input');
  const inputId = id || fieldIds.field;
  const finalError = error || internalError;
  
  // Animation styles
  const transitionStyles = useTransition(['all'], designTokens.animations.duration.fast);
  
  // Update hasValue when value changes
  useEffect(() => {
    const currentValue = value !== undefined ? value : inputRef.current?.value;
    setHasValue(Boolean(currentValue));
  }, [value]);
  
  // Handle focus events
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(Boolean(e.target.value));
    
    // Run validation on blur if provided
    if (onValidate && e.target.value) {
      const validationError = onValidate(e.target.value);
      setInternalError(validationError);
    }
    
    onBlur?.(e);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasValue(Boolean(newValue));
    
    // Clear error when user starts typing
    if (internalError) {
      setInternalError(undefined);
    }
    
    onChange?.(e);
  };
  
  // Determine if label should be floating
  const shouldFloat = floatingLabel && (isFocused || hasValue || Boolean(value) || props.placeholder || props.type === 'date' || props.type === 'time' || props.type === 'datetime-local');
  
  // Size variants
  const sizeStyles = {
    sm: {
      input: 'px-3 py-2 text-sm',
      label: 'text-xs',
      icon: 'w-4 h-4',
      spacing: 'gap-2',
    },
    md: {
      input: 'px-3 py-2.5 text-sm',
      label: 'text-sm',
      icon: 'w-5 h-5',
      spacing: 'gap-2.5',
    },
    lg: {
      input: 'px-4 py-3 text-base',
      label: 'text-base',
      icon: 'w-6 h-6',
      spacing: 'gap-3',
    },
  };
  
  // Get glow effect class based on state and focus
  const getGlowEffect = () => {
    if (finalError) {
      return isFocused ? 'glow-error' : '';
    }
    
    if (success) {
      return isFocused ? 'glow-success' : '';
    }
    
    if (loading) {
      return 'glow-pulse';
    }
    
    return isFocused ? 'glow-focus' : '';
  };

  // Variant styles
  const variantStyles = {
    outlined: {
      container: 'relative',
      input: `
        border border-gray-300 rounded-lg bg-white
        focus:border-blue-500 focus:ring-0 focus:outline-none
        hover:border-gray-400 hover:glow-subtle
        disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-500
        transition-all duration-300 ease-out
        ${getGlowEffect()}
      `,
      label: floatingLabel ? `
        absolute left-3 transition-all duration-200 ease-out pointer-events-none
        ${shouldFloat 
          ? '-top-2.5 text-xs bg-white px-1 text-blue-600' 
          : 'top-1/2 -translate-y-1/2 text-gray-500'
        }
      ` : 'block text-gray-700 font-medium mb-2',
    },
    filled: {
      container: 'relative',
      input: `
        border-0 border-b-2 border-gray-300 rounded-t-lg bg-gray-50
        focus:border-blue-500 focus:bg-white focus:ring-0 focus:outline-none
        hover:bg-gray-100 hover:glow-subtle
        disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-500
        transition-all duration-300 ease-out
        ${getGlowEffect()}
      `,
      label: floatingLabel ? `
        absolute left-3 transition-all duration-200 ease-out pointer-events-none
        ${shouldFloat 
          ? 'top-2 text-xs text-blue-600' 
          : 'top-1/2 -translate-y-1/2 text-gray-500'
        }
      ` : 'block text-gray-700 font-medium mb-2',
    },
    standard: {
      container: 'relative',
      input: `
        border-0 border-b border-gray-300 rounded-none bg-transparent
        focus:border-blue-500 focus:ring-0 focus:outline-none
        hover:border-gray-400 hover:glow-subtle
        disabled:border-gray-200 disabled:text-gray-500
        transition-all duration-300 ease-out
        ${getGlowEffect()}
      `,
      label: floatingLabel ? `
        absolute left-0 transition-all duration-200 ease-out pointer-events-none
        ${shouldFloat 
          ? '-top-5 text-xs text-blue-600' 
          : 'top-1/2 -translate-y-1/2 text-gray-500'
        }
      ` : 'block text-gray-700 font-medium mb-2',
    },
  };
  
  // State-based styles
  const getStateStyles = () => {
    if (finalError) {
      return {
        input: 'border-red-500 focus:border-red-500',
        label: 'text-red-600',
        icon: 'text-red-500',
      };
    }
    
    if (success) {
      return {
        input: 'border-green-500 focus:border-green-500',
        label: 'text-green-600',
        icon: 'text-green-500',
      };
    }
    
    if (loading) {
      return {
        input: 'border-blue-500',
        label: 'text-blue-600',
        icon: 'text-blue-500',
      };
    }
    
    return {
      input: '',
      label: '',
      icon: 'text-gray-400',
    };
  };
  
  const stateStyles = getStateStyles();
  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];
  
  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
  );
  
  // Success checkmark component
  const SuccessIcon = () => (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
  
  // Error icon component
  const ErrorIcon = () => (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  
  // Determine right icon to show
  const getRightIcon = () => {
    if (loading) return <LoadingSpinner />;
    if (success) return <SuccessIcon />;
    if (finalError) return <ErrorIcon />;
    return rightIcon;
  };
  
  const describedBy = createAriaDescribedBy([
    helperText ? fieldIds.description : undefined,
    finalError ? fieldIds.error : undefined,
  ]);
  
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <div className={`${currentVariant.container} ${currentSize.spacing}`}>
        {/* Label */}
        {!floatingLabel && (
          <label 
            htmlFor={inputId}
            className={`${currentVariant.label} ${stateStyles.label}`}
          >
            {label}
          </label>
        )}
        
        {/* Input container */}
        <div className="relative flex items-center">
          {/* Left icon */}
          {leftIcon && (
            <div className={`absolute left-3 z-10 ${currentSize.icon} ${stateStyles.icon}`}>
              {leftIcon}
            </div>
          )}
          
          {/* Input field */}
          <input
            ref={inputRef}
            id={inputId}
            className={`
              w-full transition-all duration-200 ease-out
              ${currentSize.input}
              ${currentVariant.input}
              ${stateStyles.input}
              ${leftIcon ? 'pl-10' : ''}
              ${getRightIcon() ? 'pr-10' : ''}
              ${className}
            `}
            style={transitionStyles}
            value={value}
            defaultValue={defaultValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            aria-invalid={getAriaInvalid(Boolean(finalError))}
            aria-describedby={describedBy}
            disabled={loading || props.disabled}
            {...props}
          />
          
          {/* Floating label */}
          {floatingLabel && (
            <label 
              htmlFor={inputId}
              className={`${currentVariant.label} ${stateStyles.label}`}
              style={transitionStyles}
            >
              {label}
            </label>
          )}
          
          {/* Right icon */}
          {getRightIcon() && (
            <div className={`absolute right-3 z-10 ${currentSize.icon}`}>
              {getRightIcon()}
            </div>
          )}
        </div>
      </div>
      
      {/* Helper text */}
      {helperText && !finalError && (
        <p 
          id={fieldIds.description}
          className="text-sm text-gray-600"
        >
          {helperText}
        </p>
      )}
      
      {/* Error message */}
      {finalError && (
        <p 
          id={fieldIds.error}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <ErrorIcon />
          {finalError}
        </p>
      )}
    </div>
  );
};

export default Input;
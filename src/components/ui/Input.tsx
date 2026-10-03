
// ABOUTME: Premium form input with top-aligned labels, design-token theming, and validation states
// ABOUTME: Supports optional floating-label mode, icons, loading indicators, and accessibility wiring

import React, { InputHTMLAttributes, ReactNode, useState, useRef, useEffect } from 'react';
import { getFormFieldIds, getAriaInvalid, createAriaDescribedBy } from '@/utils/accessibility';

export interface ModernInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible label. Optional because inputs are frequently wrapped by FormField, which supplies the label. */
  label?: string;
  error?: string;
  /**
   * Style-only error state (red border/ring, aria-invalid) WITHOUT rendering the
   * error message — use when a wrapper (e.g. FormField) renders the message.
   */
  errorState?: boolean;
  success?: boolean;
  loading?: boolean;
  helperText?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onValidate?: (value: string) => string | undefined;
  containerClassName?: string;
  /** Legacy MUI-style inner label. Defaults to false; the canonical look is a top-aligned label. */
  floatingLabel?: boolean;
}

const Input: React.FC<ModernInputProps> = ({
  label,
  id,
  error,
  errorState = false,
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
  floatingLabel = false,
  value,
  defaultValue,
  onFocus,
  onBlur,
  onChange,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(() => {
    return Boolean(value || defaultValue);
  });
  const [internalError, setInternalError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldIds = getFormFieldIds(props.name || 'input');
  const inputId = id || fieldIds.field;
  const finalError = error || internalError;
  // Any error condition (message or style-only) flips the invalid visuals
  const isInvalid = Boolean(finalError) || errorState;

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

  // Size scale: sm 32px / md 40px / lg 44px control heights
  const sizeStyles = {
    sm: {
      input: 'h-8 px-2.5 text-sm rounded-md',
      label: 'text-xs mb-1',
      icon: 'w-4 h-4',
      iconLeft: 'left-2.5',
      iconRight: 'right-2.5',
      padLeft: 'pl-8',
      padRight: 'pr-8',
      floating: 'text-xs',
    },
    md: {
      input: 'h-10 px-3 text-sm rounded-lg',
      label: 'text-sm mb-1.5',
      icon: 'w-4 h-4',
      iconLeft: 'left-3',
      iconRight: 'right-3',
      padLeft: 'pl-9',
      padRight: 'pr-9',
      floating: 'text-xs',
    },
    lg: {
      input: 'h-11 px-3.5 text-base rounded-lg',
      label: 'text-sm mb-2',
      icon: 'w-5 h-5',
      iconLeft: 'left-3',
      iconRight: 'right-3',
      padLeft: 'pl-10',
      padRight: 'pr-10',
      floating: 'text-xs',
    },
  };

  // Variant styles — token-based so they follow the active theme (incl. dark)
  const variantStyles = {
    outlined: {
      container: 'relative',
      input: `
        bg-surface-card border border-surface-input
        hover:border-surface-input-hover
        focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15
        disabled:bg-surface-muted disabled:border-surface-border disabled:text-surface-muted-fg
      `,
      floatingIdle: 'top-1/2 -translate-y-1/2 text-surface-muted-fg',
      floatingActive: '-top-2 text-xs bg-surface-card px-1.5 text-primary-600 dark:text-primary-400',
    },
    filled: {
      container: 'relative',
      input: `
        bg-surface-muted border border-transparent
        hover:bg-surface-accent
        focus:bg-surface-card focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15
        disabled:text-surface-muted-fg
      `,
      floatingIdle: 'top-1/2 -translate-y-1/2 text-surface-muted-fg',
      floatingActive: 'top-1.5 text-xs text-primary-600 dark:text-primary-400',
    },
    standard: {
      container: 'relative',
      input: `
        bg-transparent border-0 border-b border-surface-input rounded-none
        hover:border-surface-input-hover
        focus:border-primary-500 focus:ring-0
        disabled:text-surface-muted-fg
      `,
      floatingIdle: 'top-1/2 -translate-y-1/2 text-surface-muted-fg',
      floatingActive: '-top-4 text-xs text-primary-600 dark:text-primary-400',
    },
  };

  // State-based styles
  const getStateStyles = () => {
    if (isInvalid) {
      return {
        input: 'border-red-400 dark:border-red-500/70 focus:border-red-500 focus:ring-4 focus:ring-red-500/15',
        label: 'text-red-600 dark:text-red-400',
        icon: 'text-red-500',
      };
    }

    if (success) {
      return {
        input: 'border-green-400 dark:border-green-500/70 focus:border-green-500 focus:ring-4 focus:ring-green-500/15',
        label: 'text-green-600 dark:text-green-400',
        icon: 'text-green-500',
      };
    }

    if (loading) {
      return {
        input: '',
        label: '',
        icon: 'text-slate-400',
      };
    }

    return {
      input: '',
      label: '',
      icon: 'text-surface-muted-fg',
    };
  };

  const stateStyles = getStateStyles();
  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
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
    if (isInvalid) return <ErrorIcon />;
    return rightIcon;
  };

  const describedBy = createAriaDescribedBy([
    helperText ? fieldIds.description : undefined,
    finalError ? fieldIds.error : undefined,
  ]);

  return (
    <div className={`${containerClassName}`}>
      {/* Top-aligned label */}
      {!floatingLabel && label && (
        <label
          htmlFor={inputId}
          className={`block font-medium text-surface-foreground ${currentSize.label} ${stateStyles.label}`}
        >
          {label}
        </label>
      )}

      <div className={currentVariant.container}>
        {/* Control row */}
        <div className="relative flex items-center">
          {/* Left icon */}
          {leftIcon && (
            <div className={`absolute ${currentSize.iconLeft} z-10 pointer-events-none ${currentSize.icon} ${stateStyles.icon}`} aria-hidden="true">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={inputRef}
            id={inputId}
            className={`
              w-full outline-none text-surface-foreground
              placeholder:text-surface-muted-fg
              shadow-sm transition-[border-color,box-shadow,background-color] duration-150
              ${currentSize.input}
              ${currentVariant.input}
              ${stateStyles.input}
              ${leftIcon ? currentSize.padLeft : ''}
              ${getRightIcon() ? currentSize.padRight : ''}
              ${className}
            `}
            value={value}
            defaultValue={defaultValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            aria-invalid={getAriaInvalid(isInvalid)}
            aria-describedby={describedBy}
            disabled={loading || props.disabled}
            {...props}
          />

          {/* Right adornment (status icon or custom) */}
          {getRightIcon() && (
            <div className={`absolute ${currentSize.iconRight} z-10 ${currentSize.icon}`} aria-hidden="true">
              {getRightIcon()}
            </div>
          )}

          {/* Floating label */}
          {floatingLabel && label && (
            <label
              htmlFor={inputId}
              className={`absolute left-3 transition-all duration-150 ease-out pointer-events-none font-medium ${
                shouldFloat ? `${currentSize.floating} ${currentVariant.floatingActive}` : currentVariant.floatingIdle
              } ${stateStyles.label}`}
            >
              {label}
            </label>
          )}
        </div>
      </div>

      {/* Helper text */}
      {helperText && !finalError && (
        <p
          id={fieldIds.description}
          className="mt-1.5 text-xs text-surface-muted-fg"
        >
          {helperText}
        </p>
      )}

      {/* Error message */}
      {finalError && (
        <p
          id={fieldIds.error}
          className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1"
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

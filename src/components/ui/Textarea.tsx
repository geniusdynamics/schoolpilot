
// ABOUTME: Premium textarea matching the Input design language
// ABOUTME: Top-aligned labels, token-based theming, helper/error states, optional auto-grow

import React, { TextareaHTMLAttributes, useEffect, useRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /**
   * Style-only error state (red border/ring, aria-invalid) WITHOUT rendering the
   * error message — use when a wrapper (e.g. FormField) renders the message.
   */
  errorState?: boolean;
  helperText?: string;
  /** Grow vertically with content up to max-height (default 12rem). */
  autoGrow?: boolean;
  containerClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  id,
  error,
  errorState = false,
  helperText,
  autoGrow = false,
  className = '',
  containerClassName = '',
  rows = 3,
  onFocus,
  onBlur,
  ...props
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isInvalid = Boolean(error) || errorState;

  const resize = () => {
    if (autoGrow && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 192)}px`;
    }
  };

  useEffect(resize, [autoGrow, props.value, props.defaultValue]);

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={`block font-medium mb-1.5 text-surface-foreground ${error ? 'text-red-600 dark:text-red-400' : ''} text-sm`}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        onFocus={onFocus}
        onBlur={(e) => {
          if (autoGrow) resize();
          onBlur?.(e);
        }}
        onInput={autoGrow ? resize : undefined}
        className={`
          block w-full px-3 py-2 rounded-lg shadow-sm
          bg-surface-card border border-surface-input
          text-sm text-surface-foreground placeholder:text-surface-muted-fg
          hover:border-surface-input-hover
          focus:outline-none focus:border-primary-500 focus:ring-4
          transition-[border-color,box-shadow] duration-150
          ${isInvalid
            ? 'border-red-400 dark:border-red-500/70 focus:border-red-500 focus:ring-red-500/15'
            : 'focus:ring-primary-500/15'}
          disabled:bg-surface-muted disabled:border-surface-border disabled:text-surface-muted-fg disabled:cursor-not-allowed
          ${className}
        `}
        aria-invalid={isInvalid ? true : undefined}
        {...props}
      />
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-surface-muted-fg">{helperText}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Textarea;

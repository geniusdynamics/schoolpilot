// ABOUTME: Premium custom checkbox with token-based theming and error state support
// ABOUTME: Keeps the original onChange(checked: boolean) API for backward compatibility

import React, { InputHTMLAttributes, useId } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  /** Receives the new checked state. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Error state — renders the control and label in red. */
  error?: boolean;
  helperText?: string;
  className?: string;
  children?: React.ReactNode;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  error = false,
  helperText,
  className = '',
  children,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-2.5 select-none ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={`
            flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px]
            border bg-surface-card shadow-sm transition-colors duration-150
            border-surface-input hover:border-surface-input-hover
            peer-checked:bg-primary-600 peer-checked:border-primary-600 peer-checked:hover:bg-primary-700
            peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-500/30 peer-focus-visible:border-primary-500
            peer-checked:[&>svg]:opacity-100
            ${error ? 'border-red-400 dark:border-red-500/70 peer-checked:bg-red-600 peer-checked:border-red-600' : ''}
          `}
        >
          <CheckIcon className="h-3 w-3 text-white opacity-0 transition-opacity duration-100" strokeWidth={3} />
        </span>
        {children && (
          <span className={`text-sm font-medium text-surface-foreground ${error ? 'text-red-600 dark:text-red-400' : ''}`}>
            {children}
          </span>
        )}
      </label>
      {helperText && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-surface-muted-fg'}`}>{helperText}</p>
      )}
    </div>
  );
};

export default Checkbox;

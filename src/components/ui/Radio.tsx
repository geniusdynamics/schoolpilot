// ABOUTME: Premium radio button and radio group with token-based theming
// ABOUTME: RadioGroup provides a simple options-array API matching Select's conventions

import React, { InputHTMLAttributes, ReactNode, useId } from 'react';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: string;
  error?: boolean;
}

export const Radio: React.FC<RadioProps> = ({
  id,
  label,
  description,
  error = false,
  className = '',
  disabled,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-2.5 select-none ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <input
          id={inputId}
          type="radio"
          disabled={disabled}
          aria-describedby={descriptionId}
          aria-invalid={error ? true : undefined}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={`
            relative mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full
            border bg-surface-card shadow-sm transition-colors duration-150
            border-surface-input hover:border-surface-input-hover
            peer-checked:border-primary-600
            before:absolute before:h-2 before:w-2 before:rounded-full before:bg-primary-600
            before:scale-0 before:transition-transform before:duration-150
            peer-checked:before:scale-100
            peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-500/30 peer-focus-visible:border-primary-500
            ${error ? 'border-red-400 dark:border-red-500/70 peer-checked:border-red-600 peer-checked:before:bg-red-600' : ''}
          `}
        />
        {(label || description) && (
          <span className="flex flex-col">
            {label && (
              <span className={`text-sm font-medium text-surface-foreground ${error ? 'text-red-600 dark:text-red-400' : ''}`}>
                {label}
              </span>
            )}
            {description && (
              <span id={descriptionId} className="mt-0.5 text-xs text-surface-muted-fg">
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    </div>
  );
};

export interface RadioGroupOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Group name — required for native radio semantics. */
  name: string;
  label?: string;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioGroupOption[];
  orientation?: 'vertical' | 'horizontal';
  error?: string;
  /**
   * Style-only error state (red controls) WITHOUT rendering the error message —
   * use when a wrapper (e.g. FormField) renders the message.
   */
  errorState?: boolean;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  label,
  required = false,
  value,
  defaultValue,
  onChange,
  options,
  orientation = 'vertical',
  error,
  errorState = false,
  helperText,
  disabled = false,
  className = '',
}) => {
  const groupId = useId();
  const describedBy = error ? `${groupId}-error` : helperText ? `${groupId}-description` : undefined;

  return (
    <div role="radiogroup" aria-labelledby={label ? `${groupId}-label` : undefined} aria-describedby={describedBy} className={className}>
      {label && (
        <span id={`${groupId}-label`} className="mb-1.5 block text-sm font-medium text-surface-foreground">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      <div className={`flex ${orientation === 'horizontal' ? 'flex-row flex-wrap gap-x-6 gap-y-2' : 'flex-col gap-2.5'}`}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            label={option.label}
            description={option.description}
            disabled={disabled || option.disabled}
            checked={value !== undefined ? value === option.value : undefined}
            defaultChecked={value === undefined ? defaultValue === option.value : undefined}
            onChange={() => onChange?.(option.value)}
            error={Boolean(error) || errorState}
          />
        ))}
      </div>
      {helperText && !error && (
        <p id={`${groupId}-description`} className="mt-1.5 text-xs text-surface-muted-fg">
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${groupId}-error`} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Radio;

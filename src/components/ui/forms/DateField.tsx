
// ABOUTME: String-contract date field wrapping the calendar DatePicker
// ABOUTME: Drop-in companion to Input for `YYYY-MM-DD` values — use in forms that
// ABOUTME: store dates as strings (the dominant convention in this codebase).

import React, { useCallback } from 'react';
import DatePicker from './DatePicker';

export interface DateFieldProps {
  /** ISO date string (YYYY-MM-DD). Empty string / undefined = no date. */
  value?: string | null;
  /** Receives the selected date as YYYY-MM-DD ('' when cleared). */
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** Red-border state without rendering a message (wrapper owns the message). */
  errorState?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  showTime?: boolean;
  name?: string;
  'aria-label'?: string;
  className?: string;
}

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const toISODate = (date: Date | null): string => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * DateField — premium calendar picker with the same `YYYY-MM-DD` string contract
 * as `<Input type="date">`, so forms can adopt it without touching their data
 * layer. Rendered on a labeled wrapper matching the Input design language.
 */
export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  name: _name,
  disabled,
  error,
  errorState = false,
  success,
  size = 'md',
  minDate,
  maxDate,
  disabledDates = [],
  showTime = false,
  'aria-label': ariaLabel,
  className = '',
}) => {
  const handleChange = useCallback(
    (date: Date | null) => {
      onChange?.(toISODate(date));
    },
    [onChange]
  );

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-surface-foreground">
          {label}
        </label>
      )}
      <DatePicker
        value={toDate(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        errorState={errorState}
        success={success}
        size={size}
        minDate={toDate(minDate) ?? undefined}
        maxDate={toDate(maxDate) ?? undefined}
        disabledDates={disabledDates.map(toDate).filter((d): d is Date => d !== null)}
        showTime={showTime}
        aria-label={ariaLabel ?? label}
      />
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default DateField;

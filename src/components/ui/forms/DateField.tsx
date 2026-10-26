// ABOUTME: String-contract date field wrapping the typeable, locale-aware DatePicker.
// ABOUTME: Drop-in companion to Input for `YYYY-MM-DD` values; inside FormField the wrapper owns the label.

import React, { useCallback, useState } from 'react';
import DatePicker from './DatePicker';
import type { CalendarId } from '@/domain/calendar';
import { generateId } from '@/utils/accessibility';

export interface DateFieldProps {
  /** ISO date string (YYYY-MM-DD). Empty string / undefined = no date. */
  value?: string | null;
  /** Receives the selected date as YYYY-MM-DD ('' when cleared). */
  onChange?: (value: string) => void;
  /**
   * Visible label. When an `id` is supplied (e.g. by FormField, which renders its own
   * `<label htmlFor>`), the label is used only as the accessible name, so it is not shown twice.
   */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** Red-border state without rendering a message (wrapper owns the message). */
  errorState?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Earliest allowed date (YYYY-MM-DD). */
  minDate?: string;
  /** Latest allowed date (YYYY-MM-DD). */
  maxDate?: string;
  disabledDates?: string[];
  showTime?: boolean;
  /** Display/typing locale; defaults to en-KE (dd/mm/yyyy). */
  locale?: string;
  /** The calendar the field shows and takes dates in; the value stays a Gregorian `YYYY-MM-DD`. The locale's own by default. */
  calendar?: CalendarId;
  name?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
  className?: string;
}

/** Parses `YYYY-MM-DD` (optionally followed by a time) as a local calendar date. */
const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null;
};

const toISODate = (date: Date | null): string => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * DateField: typeable date input (locale order, dd/mm/yyyy by default) with a calendar
 * popover, keeping the same `YYYY-MM-DD` string contract as `<Input type="date">`.
 */
export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  label,
  placeholder,
  disabled,
  error,
  errorState = false,
  success,
  size = 'md',
  minDate,
  maxDate,
  disabledDates = [],
  showTime = false,
  locale = 'en-KE',
  calendar,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  className = '',
}) => {
  const [ownId] = useState(() => generateId('datefield'));
  const labelledExternally = Boolean(id);
  const inputId = id ?? ownId;

  const handleChange = useCallback(
    (date: Date | null) => {
      onChange?.(toISODate(date));
    },
    [onChange]
  );

  return (
    <div className={className}>
      {label && !labelledExternally && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-surface-foreground">
          {label}
        </label>
      )}
      <DatePicker
        id={inputId}
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
        locale={locale}
        calendar={calendar}
        aria-label={ariaLabel ?? label}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
      />
    </div>
  );
};

export default DateField;

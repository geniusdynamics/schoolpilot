// ABOUTME: Modern DatePicker component with calendar interface and accessibility support
// ABOUTME: Supports single date, date range selection, keyboard navigation, and mobile-responsive design

import React, { useState, useRef, useEffect, useCallback, useTransition } from 'react';

import { 
  generateId, 
  createAriaDescribedBy,
  announceToScreenReader 
} from '../../../utils/accessibility';

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** Red-border state without rendering a message (wrapper owns the message). */
  errorState?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outlined' | 'filled';
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  showTime?: boolean;
  format?: string;
  locale?: string;
  className?: string;
  // Range selection props
  isRange?: boolean;
  rangeValue?: [Date | null, Date | null];
  onRangeChange?: (range: [Date | null, Date | null]) => void;
  // Accessibility props
  'aria-label'?: string;
  'aria-describedby'?: string;
  id?: string;
}

interface CalendarState {
  currentMonth: Date;
  selectedDate: Date | null;
  selectedRange: [Date | null, Date | null];
  focusedDate: Date | null;
  isOpen: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  error,
  errorState = false,
  success = false,
  size = 'md',
  variant = 'outlined',
  minDate,
  maxDate,
  disabledDates = [],
  showTime = false,

  locale = 'en-US',
  className = '',
  isRange = false,
  rangeValue,
  onRangeChange,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  id: providedId,
}) => {
  const id = providedId || generateId('datepicker');
  const [calendarState, setCalendarState] = useState<CalendarState>({
    currentMonth: new Date(),
    selectedDate: value || null,
    selectedRange: rangeValue || [null, null],
    focusedDate: value || new Date(),
    isOpen: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  

  const [, startTransition] = useTransition();

  // Format date for display
  const formatDate = useCallback((date: Date | null): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(showTime && { hour: '2-digit', minute: '2-digit' })
    }).format(date);
  }, [locale, showTime]);

  // Check if date is disabled
  const isDateDisabled = useCallback((date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some(disabledDate => 
      date.toDateString() === disabledDate.toDateString()
    );
  }, [minDate, maxDate, disabledDates]);

  // Open calendar
  const openCalendar = useCallback(() => {
    if (disabled) return;
    
    startTransition(() => {
      setCalendarState(prev => ({ ...prev, isOpen: true }));
    });
    
    // Announce to screen readers
    announceToScreenReader('Calendar opened');
  }, [disabled, startTransition]);

  // Close calendar
  const closeCalendar = useCallback(() => {
    startTransition(() => {
      setCalendarState(prev => ({ ...prev, isOpen: false }));
    });
    
    // Return focus to input
    inputRef.current?.focus();
    announceToScreenReader('Calendar closed');
  }, [startTransition]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date | null) => {
    if (!date || isDateDisabled(date)) return;

    if (isRange && onRangeChange) {
      const [start, end] = calendarState.selectedRange;
      
      if (!start || (start && end)) {
        // Start new range
        const newRange: [Date | null, Date | null] = [date, null];
        setCalendarState(prev => ({ ...prev, selectedRange: newRange }));
        onRangeChange(newRange);
      } else {
        // Complete range
        const newRange: [Date | null, Date | null] = start <= date ? [start, date] : [date, start];
        setCalendarState(prev => ({ ...prev, selectedRange: newRange }));
        onRangeChange(newRange);
        closeCalendar();
      }
    } else {
      // Single date selection
      setCalendarState(prev => ({ ...prev, selectedDate: date }));
      onChange?.(date);
      closeCalendar();
    }

    announceToScreenReader(`Date selected: ${formatDate(date)}`);
  }, [isRange, onRangeChange, calendarState.selectedRange, onChange, isDateDisabled, formatDate, closeCalendar]);

  // Handle keyboard navigation in calendar
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    const currentFocused = calendarState.focusedDate || new Date();
    const newFocused = new Date(currentFocused);

    switch (key) {
      case 'Escape':
        event.preventDefault();
        closeCalendar();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleDateSelect(calendarState.focusedDate);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newFocused.setDate(newFocused.getDate() - 1);
        setCalendarState(prev => ({ ...prev, focusedDate: newFocused }));
        break;
      case 'ArrowRight':
        event.preventDefault();
        newFocused.setDate(newFocused.getDate() + 1);
        setCalendarState(prev => ({ ...prev, focusedDate: newFocused }));
        break;
      case 'ArrowUp':
        event.preventDefault();
        newFocused.setDate(newFocused.getDate() - 7);
        setCalendarState(prev => ({ ...prev, focusedDate: newFocused }));
        break;
      case 'ArrowDown':
        event.preventDefault();
        newFocused.setDate(newFocused.getDate() + 7);
        setCalendarState(prev => ({ ...prev, focusedDate: newFocused }));
        break;
      case 'Home':
        event.preventDefault();
        newFocused.setDate(1);
        setCalendarState(prev => ({ ...prev, focusedDate: newFocused }));
        break;
      case 'End':
        event.preventDefault();
        const lastDay = new Date(newFocused.getFullYear(), newFocused.getMonth() + 1, 0);
        setCalendarState(prev => ({ ...prev, focusedDate: lastDay }));
        break;
    }

    // Update current month if needed
    if (newFocused.getMonth() !== calendarState.currentMonth.getMonth()) {
      setCalendarState(prev => ({ ...prev, currentMonth: newFocused }));
    }
  }, [calendarState.focusedDate, calendarState.currentMonth, closeCalendar, handleDateSelect]);

  // Navigate to previous month
  const navigateToPreviousMonth = useCallback(() => {
    const newMonth = new Date(calendarState.currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCalendarState(prev => ({ ...prev, currentMonth: newMonth }));
    announceToScreenReader(`Navigated to ${newMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`);
  }, [calendarState.currentMonth, locale]);

  // Navigate to next month
  const navigateToNextMonth = useCallback(() => {
    const newMonth = new Date(calendarState.currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCalendarState(prev => ({ ...prev, currentMonth: newMonth }));
    announceToScreenReader(`Navigated to ${newMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`);
  }, [calendarState.currentMonth, locale]);

  // Generate calendar days
  const generateCalendarDays = useCallback(() => {
    const year = calendarState.currentMonth.getFullYear();
    const month = calendarState.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);

    // Generate 6 weeks (42 days) to ensure consistent calendar height
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [calendarState.currentMonth]);

  // Check if date is in current month
  const isCurrentMonth = useCallback((date: Date): boolean => {
    return date.getMonth() === calendarState.currentMonth.getMonth();
  }, [calendarState.currentMonth]);

  // Check if date is selected
  const isDateSelected = useCallback((date: Date): boolean => {
    if (isRange) {
      const [start, end] = calendarState.selectedRange;
      if (!start) return false;
      if (!end) return date.toDateString() === start.toDateString();
      return date >= start && date <= end;
    }
    return calendarState.selectedDate?.toDateString() === date.toDateString();
  }, [isRange, calendarState.selectedRange, calendarState.selectedDate]);

  // Check if date is in range (for range selection styling)
  const isDateInRange = useCallback((date: Date): boolean => {
    if (!isRange) return false;
    const [start, end] = calendarState.selectedRange;
    if (!start || !end) return false;
    return date > start && date < end;
  }, [isRange, calendarState.selectedRange]);

  // Check if date is focused
  const isDateFocused = useCallback((date: Date): boolean => {
    return calendarState.focusedDate?.toDateString() === date.toDateString();
  }, [calendarState.focusedDate]);

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        closeCalendar();
      }
    };

    if (calendarState.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [calendarState.isOpen, closeCalendar]);

  // Get display value for input
  const getDisplayValue = (): string => {
    if (isRange) {
      const [start, end] = calendarState.selectedRange;
      if (start && end) {
        return `${formatDate(start)} - ${formatDate(end)}`;
      } else if (start) {
        return formatDate(start);
      }
      return '';
    }
    return formatDate(calendarState.selectedDate);
  };

  // Component styling classes
  const inputClasses = [
    'relative w-full rounded-lg border transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    // Size variants
    size === 'sm' && 'px-3 py-2 text-sm',
    size === 'md' && 'px-4 py-3 text-base',
    size === 'lg' && 'px-5 py-4 text-lg',
    // Variant styles
    variant === 'outlined' && [
      'bg-surface-card border-surface-border',
      'hover:border-gray-400',
      'focus:border-primary-500 focus:ring-primary-500',
    ],
    variant === 'filled' && [
      'bg-surface-muted border-transparent',
      'hover:bg-surface-accent',
      'focus:bg-surface-card focus:border-primary-500 focus:ring-primary-500',
    ],
    // State styles
    (error || errorState) && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success && 'border-green-500 focus:border-green-500 focus:ring-green-500',
    disabled && 'bg-surface-accent text-surface-muted-fg cursor-not-allowed',
    className,
  ].filter(Boolean).flat().join(' ');

  const calendarClasses = [
    'absolute z-50 mt-2 bg-surface-card rounded-lg shadow-lg border border-surface-border',
    'min-w-80 p-4',
    calendarState.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
    'transition-all duration-200 ease-in-out',
  ].filter(Boolean).join(' ');

  return (
    <div className="relative">
      {/* Input Field */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={getDisplayValue()}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        onClick={openCalendar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCalendar();
          }
        }}
        className={inputClasses}
        aria-label={ariaLabel || 'Date picker'}
        aria-describedby={createAriaDescribedBy([
          ariaDescribedBy,
          error ? `${id}-error` : undefined,
          success ? `${id}-success` : undefined,
        ])}
        aria-expanded={calendarState.isOpen}
        aria-haspopup="dialog"
        role="combobox"
      />

      {/* Calendar Icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className={`w-5 h-5 ${disabled ? 'text-surface-muted-fg' : 'text-surface-muted-fg'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Error Message */}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Success Message */}
      {success && (
        <p id={`${id}-success`} className="mt-2 text-sm text-green-600">
          Date selected successfully
        </p>
      )}

      {/* Calendar Dropdown */}
      {calendarState.isOpen && (
        <div
          ref={calendarRef}
          className={calendarClasses}
          role="dialog"
          aria-label="Calendar"
          onKeyDown={handleKeyDown}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={navigateToPreviousMonth}
              className="p-2 rounded-lg hover:bg-surface-accent focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h2 className="text-lg font-semibold text-surface-foreground">
              {calendarState.currentMonth.toLocaleDateString(locale, { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>

            <button
              type="button"
              onClick={navigateToNextMonth}
              className="p-2 rounded-lg hover:bg-surface-accent focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="p-2 text-xs font-medium text-surface-muted-fg text-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {generateCalendarDays().map((date, index) => {
              const isDisabled = isDateDisabled(date);
              const isSelected = isDateSelected(date);
              const isInRange = isDateInRange(date);
              const isFocused = isDateFocused(date);
              const isCurrentMonthDate = isCurrentMonth(date);

              const dayClasses = [
                'p-2 text-sm rounded-lg cursor-pointer transition-all duration-150',
                'hover:bg-surface-accent focus:outline-none focus:ring-2 focus:ring-primary-500',
                // Current month styling
                isCurrentMonthDate ? 'text-surface-foreground' : 'text-surface-muted-fg',
                // Selection styling
                isSelected && 'bg-primary-600 text-white hover:bg-primary-700',
                isInRange && !isSelected && 'bg-primary-100 text-primary-900',
                // Focus styling
                isFocused && !isSelected && 'ring-2 ring-primary-500',
                // Disabled styling
                isDisabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  onFocus={() => setCalendarState(prev => ({ ...prev, focusedDate: date }))}
                  disabled={isDisabled}
                  className={dayClasses}
                  aria-label={`${date.toLocaleDateString(locale, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}${isSelected ? ', selected' : ''}${isDisabled ? ', disabled' : ''}`}
                  aria-selected={isSelected}
                  tabIndex={isFocused ? 0 : -1}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Range Selection Helper Text */}
          {isRange && (
            <div className="mt-4 text-xs text-surface-muted-fg text-center">
              {calendarState.selectedRange[0] && !calendarState.selectedRange[1] 
                ? 'Select end date' 
                : 'Select start date'
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default DatePicker;
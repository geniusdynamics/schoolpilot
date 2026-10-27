// ABOUTME: DatePicker: typeable input in the locale's day/month/year order plus a calendar popover
// ABOUTME: with month and year selectors, min/max limits, range selection and keyboard navigation.

import React, { useState, useRef, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useTranslation } from 'react-i18next';

import {
  generateId,
  createAriaDescribedBy,
  announceToScreenReader
} from '@/utils/accessibility';
import { calendarForLocale, getCalendar, type CalendarId, type CalendarSystem } from '@/domain/calendar';
import { dateEntryPattern, startOfLocaleWeek, weekdayLabels } from '@/utils/locale';

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
  /**
   * The calendar the field shows and takes dates in. The value stays a Gregorian `Date`; the calendar changes how
   * it is read, typed and stepped through. Defaults to the locale's own: Ethiopian for an Ethiopian locale.
   */
  calendar?: CalendarId;
  className?: string;
  // Range selection props
  isRange?: boolean;
  rangeValue?: [Date | null, Date | null];
  onRangeChange?: (range: [Date | null, Date | null]) => void;
  // Accessibility props
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
  id?: string;
}

interface CalendarState {
  currentMonth: Date;
  selectedDate: Date | null;
  selectedRange: [Date | null, Date | null];
  focusedDate: Date | null;
  isOpen: boolean;
}

type DatePart = 'day' | 'month' | 'year';

interface DatePattern {
  order: DatePart[];
  separator: string;
}

const PATTERN_TOKENS: Record<DatePart, string> = { day: 'dd', month: 'mm', year: 'yyyy' };

/** Day/month/year order and separator used by `locale` for numeric dates. */
const getDatePattern = (locale: string): DatePattern => {
  const pattern = dateEntryPattern(locale);
  return { order: [...pattern.order], separator: pattern.separator };
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The day as the calendar names it, written in the locale's order: the Ethiopian 01/01/2016 for 12 September 2023. */
const formatWithPattern = (date: Date, pattern: DatePattern, system: CalendarSystem): string => {
  const { year, month, day } = system.fromGregorian(date);
  return pattern.order
    .map((part) => (part === 'day' ? pad2(day) : part === 'month' ? pad2(month) : String(year).padStart(4, '0')))
    .join(pattern.separator);
};

/**
 * Parses typed text in the locale order (or ISO yyyy-mm-dd) as a date of the calendar, and returns the Gregorian day
 * it falls on. Returns null unless it is a real date of that calendar.
 */
const parseWithPattern = (text: string, pattern: DatePattern, system: CalendarSystem): Date | null => {
  const trimmed = text.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const numbers = iso ? null : trimmed.split(/[^\d]+/).filter(Boolean);
  if (!iso && (!numbers || numbers.length !== 3)) return null;

  const values: Record<DatePart, string> = iso
    ? { year: iso[1], month: iso[2], day: iso[3] }
    : (pattern.order.reduce(
        (acc, part, i) => ({ ...acc, [part]: numbers![i] }),
        {} as Record<DatePart, string>
      ));
  if (values.year.length !== 4 || values.month.length > 2 || values.day.length > 2) return null;

  const calendarDate = { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  return system.isValidDate(calendarDate) ? system.toGregorian(calendarDate) : null;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder,
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
  calendar,
  className = '',
  isRange = false,
  rangeValue,
  onRangeChange,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  id: providedId,
}) => {
  const { t } = useTranslation(['common']);
  const [generatedId] = useState(() => generateId('datepicker'));
  const id = providedId || generatedId;
  const pattern = useMemo(() => getDatePattern(locale), [locale]);
  const system = useMemo(() => getCalendar(calendar ?? calendarForLocale(locale)), [calendar, locale]);
  const typeable = !isRange && !showTime;

  const [calendarState, setCalendarState] = useState<CalendarState>({
    currentMonth: system.startOfMonth(value || new Date()),
    selectedDate: value || null,
    selectedRange: rangeValue || [null, null],
    focusedDate: value || new Date(),
    isOpen: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  /** True while the keyboard drives the day grid, so focus follows `focusedDate`. */
  const gridFocusRef = useRef(false);

  const [, startTransition] = useTransition();

  // Format date for display
  const formatDate = useCallback((date: Date | null): string => {
    if (!date) return '';
    if (showTime) {
      if (system.id !== 'gregorian') {
        const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
        return `${formatWithPattern(date, pattern, system)} ${time}`;
      }
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    return formatWithPattern(date, pattern, system);
  }, [locale, showTime, pattern, system]);

  const [inputText, setInputText] = useState(() => formatDate(value || null));
  const [textInvalid, setTextInvalid] = useState(false);

  // Keep internal state in step with a changed `value` prop
  const valueKey = value ? value.getTime() : null;
  useEffect(() => {
    const next = valueKey === null ? null : new Date(valueKey);
    setCalendarState(prev => {
      const prevKey = prev.selectedDate ? prev.selectedDate.getTime() : null;
      return prevKey === valueKey ? prev : { ...prev, selectedDate: next };
    });
    setInputText(current => {
      const parsed = parseWithPattern(current, pattern, system);
      const currentKey = parsed ? parsed.getTime() : null;
      if (current !== '' && currentKey === valueKey) return current;
      if (current === '' && valueKey === null) return current;
      return formatDate(next);
    });
    setTextInvalid(false);
  }, [valueKey, pattern, system, formatDate]);

  // Check if date is disabled (day granularity)
  const isDateDisabled = useCallback((date: Date): boolean => {
    const day = startOfDay(date);
    if (minDate && day < startOfDay(minDate)) return true;
    if (maxDate && day > startOfDay(maxDate)) return true;
    return disabledDates.some(disabledDate =>
      date.toDateString() === disabledDate.toDateString()
    );
  }, [minDate, maxDate, disabledDates]);

  /** Today, clamped into [minDate, maxDate]. */
  const defaultAnchor = useCallback((): Date => {
    const today = startOfDay(new Date());
    if (minDate && today < startOfDay(minDate)) return startOfDay(minDate);
    if (maxDate && today > startOfDay(maxDate)) return startOfDay(maxDate);
    return today;
  }, [minDate, maxDate]);

  // Open calendar on the selected date's month (or today's)
  const openCalendar = useCallback((focusGrid = false) => {
    if (disabled) return;
    gridFocusRef.current = focusGrid;

    startTransition(() => {
      setCalendarState(prev => {
        const anchor = (isRange ? prev.selectedRange[0] : prev.selectedDate) || defaultAnchor();
        return { ...prev, isOpen: true, currentMonth: system.startOfMonth(anchor), focusedDate: anchor };
      });
    });

    // Announce to screen readers
    announceToScreenReader('Calendar opened');
  }, [disabled, startTransition, isRange, defaultAnchor, system]);

  // Close calendar
  const closeCalendar = useCallback((returnFocus = true) => {
    gridFocusRef.current = false;
    startTransition(() => {
      setCalendarState(prev => ({ ...prev, isOpen: false }));
    });

    // Return focus to input
    if (returnFocus) inputRef.current?.focus();
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
      setInputText(formatDate(date));
      setTextInvalid(false);
      onChange?.(date);
      closeCalendar();
    }

    announceToScreenReader(`Date selected: ${formatDate(date)}`);
  }, [isRange, onRangeChange, calendarState.selectedRange, onChange, isDateDisabled, formatDate, closeCalendar]);

  // Typed entry: emit as soon as the text is a complete, allowed date
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);

    if (text.trim() === '') {
      setTextInvalid(false);
      if (calendarState.selectedDate) {
        setCalendarState(prev => ({ ...prev, selectedDate: null }));
        onChange?.(null);
      }
      return;
    }

    const parsed = parseWithPattern(text, pattern, system);
    const complete = text.replace(/\D/g, '').length >= 8 || parsed !== null;
    if (!parsed || isDateDisabled(parsed)) {
      setTextInvalid(complete);
      return;
    }

    setTextInvalid(false);
    setCalendarState(prev => ({
      ...prev,
      selectedDate: parsed,
      currentMonth: system.startOfMonth(parsed),
      focusedDate: parsed,
    }));
    if (!calendarState.selectedDate || calendarState.selectedDate.getTime() !== parsed.getTime()) {
      onChange?.(parsed);
    }
  }, [pattern, system, isDateDisabled, onChange, calendarState.selectedDate]);

  // Leaving the field with unusable text restores the last valid date
  const handleInputBlur = useCallback(() => {
    if (!typeable) return;
    setInputText(formatDate(calendarState.selectedDate));
    setTextInvalid(false);
  }, [typeable, formatDate, calendarState.selectedDate]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openCalendar(true);
      return;
    }
    if (e.key === 'Escape' && calendarState.isOpen) {
      e.preventDefault();
      closeCalendar();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = typeable ? parseWithPattern(inputText, pattern, system) : null;
      if (parsed && !isDateDisabled(parsed)) {
        setInputText(formatDate(parsed));
        if (calendarState.isOpen) closeCalendar();
        return;
      }
      openCalendar();
      return;
    }
    if (e.key === ' ' && (!typeable || !pattern.separator.includes(' '))) {
      e.preventDefault();
      openCalendar();
    }
  }, [openCalendar, closeCalendar, calendarState.isOpen, typeable, inputText, pattern, system, isDateDisabled, formatDate]);

  // Handle keyboard navigation in calendar
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (key === 'Escape') {
      event.preventDefault();
      closeCalendar();
      return;
    }

    // Only the day grid (or the dialog itself) owns arrow/Enter keys; leave selectors and buttons alone
    const target = event.target as HTMLElement;
    const onDay = target.dataset?.date !== undefined;
    if (!onDay && target !== event.currentTarget) return;

    const currentFocused = calendarState.focusedDate || new Date();
    let newFocused = new Date(currentFocused);

    switch (key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleDateSelect(calendarState.focusedDate);
        return;
      case 'ArrowLeft':
        newFocused.setDate(newFocused.getDate() - 1);
        break;
      case 'ArrowRight':
        newFocused.setDate(newFocused.getDate() + 1);
        break;
      case 'ArrowUp':
        newFocused.setDate(newFocused.getDate() - 7);
        break;
      case 'ArrowDown':
        newFocused.setDate(newFocused.getDate() + 7);
        break;
      case 'Home': {
        const { year, month } = system.fromGregorian(currentFocused);
        newFocused = system.toGregorian({ year, month, day: 1 });
        break;
      }
      case 'End': {
        const { year, month } = system.fromGregorian(currentFocused);
        newFocused = system.toGregorian({ year, month, day: system.daysInMonth(year, month) });
        break;
      }
      case 'PageUp':
        newFocused = system.addMonths(currentFocused, -1);
        break;
      case 'PageDown':
        newFocused = system.addMonths(currentFocused, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    gridFocusRef.current = true;
    const focusedDate = newFocused;
    setCalendarState(prev => ({ ...prev, focusedDate, currentMonth: system.startOfMonth(focusedDate) }));
  }, [calendarState.focusedDate, closeCalendar, handleDateSelect, system]);

  // Move DOM focus to the focused day while the keyboard drives the grid
  useEffect(() => {
    if (!calendarState.isOpen || !gridFocusRef.current || !calendarState.focusedDate) return;
    const button = calendarRef.current?.querySelector<HTMLButtonElement>(
      `[data-date="${dateKey(calendarState.focusedDate)}"]`
    );
    button?.focus();
  }, [calendarState.isOpen, calendarState.focusedDate, calendarState.currentMonth]);

  const showMonth = useCallback((month: Date) => {
    setCalendarState(prev => {
      const target = system.fromGregorian(month);
      const day = prev.focusedDate ? system.fromGregorian(prev.focusedDate).day : 1;
      return {
        ...prev,
        currentMonth: month,
        focusedDate: system.toGregorian({ ...target, day: Math.min(day, system.daysInMonth(target.year, target.month)) }),
      };
    });
    announceToScreenReader(`Navigated to ${system.formatMonthYear(month, locale)}`);
  }, [locale, system]);

  // Navigate to previous month
  const navigateToPreviousMonth = useCallback(() => {
    showMonth(system.addMonths(calendarState.currentMonth, -1));
  }, [calendarState.currentMonth, showMonth, system]);

  // Navigate to next month
  const navigateToNextMonth = useCallback(() => {
    showMonth(system.addMonths(calendarState.currentMonth, 1));
  }, [calendarState.currentMonth, showMonth, system]);

  /** The month and year the popover shows, as the calendar names them. */
  const shownMonth = useMemo(() => system.fromGregorian(calendarState.currentMonth), [system, calendarState.currentMonth]);

  const monthNames = useMemo(() => system.monthNames(locale), [system, locale]);

  const yearOptions = useMemo(() => {
    const thisYear = system.fromGregorian(new Date()).year;
    let first = minDate ? system.fromGregorian(minDate).year : thisYear - 100;
    let last = maxDate ? system.fromGregorian(maxDate).year : thisYear + 20;
    first = Math.min(first, shownMonth.year);
    last = Math.max(last, shownMonth.year);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }, [system, minDate, maxDate, shownMonth.year]);

  // Generate calendar days, from the locale's own first day of the week
  const generateCalendarDays = useCallback(() => {
    const startDate = startOfLocaleWeek(system.startOfMonth(calendarState.currentMonth), locale);

    const days: Date[] = [];
    const current = new Date(startDate);

    // Generate 6 weeks (42 days) to ensure consistent calendar height
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [calendarState.currentMonth, locale, system]);

  // Check if date is in current month
  const isCurrentMonth = useCallback((date: Date): boolean => {
    return system.fromGregorian(date).month === shownMonth.month;
  }, [system, shownMonth.month]);

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

  // Handle click outside to close calendar (without stealing focus from where the user clicked)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        closeCalendar(false);
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
    return typeable ? inputText : formatDate(calendarState.selectedDate);
  };

  const invalid = Boolean(error || errorState || textInvalid || ariaInvalid === true || ariaInvalid === 'true');
  const patternPlaceholder = pattern.order.map((part) => PATTERN_TOKENS[part]).join(pattern.separator);

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
    invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500',
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

  const selectClasses =
    'rounded-md border border-surface-border bg-surface-card px-2 py-1 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="relative">
      {/* Input Field */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={typeable ? 'numeric' : undefined}
        autoComplete="off"
        value={getDisplayValue()}
        placeholder={placeholder ?? (typeable ? patternPlaceholder : undefined)}
        disabled={disabled}
        readOnly={!typeable}
        onChange={typeable ? handleInputChange : undefined}
        onBlur={handleInputBlur}
        onClick={() => openCalendar()}
        onKeyDown={handleInputKeyDown}
        className={inputClasses}
        aria-label={ariaLabel || 'Date picker'}
        aria-describedby={createAriaDescribedBy([
          ariaDescribedBy,
          error ? `${id}-error` : undefined,
          success ? `${id}-success` : undefined,
        ])}
        aria-invalid={invalid ? 'true' : undefined}
        aria-required={ariaRequired === true || ariaRequired === 'true' ? 'true' : undefined}
        aria-expanded={calendarState.isOpen}
        aria-haspopup="dialog"
        role="combobox"
      />

      {/* Calendar Icon */}
      <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-surface-muted-fg"
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
          <div className="flex items-center justify-between gap-2 mb-4">
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

            <h2 className="sr-only" aria-live="polite">
              {system.formatMonthYear(calendarState.currentMonth, locale)}
            </h2>

            <div className="flex items-center gap-2">
              <select
                aria-label={t('common:datePicker.month', 'Month')}
                className={selectClasses}
                value={shownMonth.month - 1}
                onChange={(e) => showMonth(system.toGregorian({ year: shownMonth.year, month: Number(e.target.value) + 1, day: 1 }))}
              >
                {monthNames.map((name, m) => (
                  <option key={name} value={m}>{name}</option>
                ))}
              </select>
              <select
                aria-label={t('common:datePicker.year', 'Year')}
                className={selectClasses}
                value={shownMonth.year}
                onChange={(e) => showMonth(system.toGregorian({ year: Number(e.target.value), month: shownMonth.month, day: 1 }))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

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
            {weekdayLabels(locale, { width: 'short' }).map((day) => (
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
                  data-date={dateKey(date)}
                  onClick={() => handleDateSelect(date)}
                  onFocus={() => setCalendarState(prev => ({ ...prev, focusedDate: date }))}
                  disabled={isDisabled}
                  className={dayClasses}
                  aria-label={`${system.formatLong(date, locale)}${isSelected ? ', selected' : ''}${isDisabled ? ', disabled' : ''}`}
                  aria-selected={isSelected}
                  tabIndex={isFocused ? 0 : -1}
                >
                  {system.fromGregorian(date).day}
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

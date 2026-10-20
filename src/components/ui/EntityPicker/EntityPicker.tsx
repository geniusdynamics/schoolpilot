// ABOUTME: EntityPicker — accessible single-select combobox for entity references.
// ABOUTME: Consumes the DR-04 lookup contract by injection, so it stays independent of the query hooks.

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Spinner from '../Spinner';

export type EntityPickerStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

export interface EntityPickerLookup<Row, Id extends string = string> {
  /** Rows offered by the lookup; archived rows are excluded by the DR-04 contract. */
  options: readonly Row[];
  /** Every resolved row keyed by opaque string id, including archived rows. */
  byId: ReadonlyMap<Id, Row>;
  /** Human label for an id; archived rows carry the documented archived text. */
  label: (id: Id, fallback?: string) => string;
  /** Resolves a row even when it is archived or outside the current options. */
  resolve: (id: Id) => Row | undefined;
  status: EntityPickerStatus;
  error?: unknown;
  isFetching?: boolean;
  /** Row id extractor for legacy id fields; defaults to the row's `id` property. */
  getId?: (row: Row) => Id;
  /** Optional archived predicate; by default a row absent from `options` is treated as archived. */
  isArchived?: (row: Row) => boolean;
}

export interface EntityPickerProps<Row, Id extends string = string> {
  /** Selected entity id; always an opaque string, never a number. */
  value: Id | null;
  onChange: (id: Id | null) => void;
  lookup: EntityPickerLookup<Row, Id>;
  label?: string;
  placeholder?: string;
  /** Scope predicate applied before options are rendered. */
  filter?: (row: Row) => boolean;
  /** CTA slot rendered when the settled lookup has no options. */
  emptyState?: React.ReactNode;
  disabled?: boolean;
  /** Shows a clear control for current values; archived or invalid values are always clearable. */
  allowClear?: boolean;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
  /** Formats an archived label; defaults to prefixing "(archived)" when the lookup has not. */
  archivedLabel?: (label: string) => string;
  loadingText?: string;
  errorText?: string;
  noOptionsText?: string;
  clearLabel?: string;
}

const ARCHIVED_MARKER = /\(archived\)/i;

function defaultArchivedLabel(label: string): string {
  return ARCHIVED_MARKER.test(label) ? label : `(archived) ${label}`;
}

function readRowId<Id extends string>(row: unknown): Id {
  if (row === null || typeof row !== 'object' || !('id' in row)) return '' as Id;
  const id = (row as { id?: unknown }).id;
  return (typeof id === 'string' ? id : '') as Id;
}

/**
 * Single-select entity picker that owns presentation and keyboard behaviour.
 * The query layer supplies options, labels, status and archived resolution.
 */
export function EntityPicker<Row, Id extends string = string>({
  value,
  onChange,
  lookup,
  label,
  placeholder = 'Select an option...',
  filter,
  emptyState,
  disabled = false,
  allowClear = false,
  error,
  helperText,
  size = 'md',
  id,
  name,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'data-testid': dataTestId,
  archivedLabel = defaultArchivedLabel,
  loadingText = 'Loading options...',
  errorText = 'Could not load options.',
  noOptionsText = 'No options available',
  clearLabel = 'Clear selection',
}: EntityPickerProps<Row, Id>) {
  const autoId = useId();
  const fieldId = id ?? `${autoId}-trigger`;
  const labelId = `${fieldId}-label`;
  const helperId = `${fieldId}-helper`;
  const fieldErrorId = `${fieldId}-error`;
  const popupId = `${fieldId}-popup`;
  const listboxId = `${fieldId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const resolveId: (row: Row) => Id = lookup.getId ?? readRowId;

  const visibleOptions = useMemo(
    () => (filter ? lookup.options.filter(filter) : [...lookup.options]),
    [filter, lookup.options]
  );

  const hasOptions = visibleOptions.length > 0;
  const isLoading = lookup.status === 'loading';
  const hasLoadError = lookup.status === 'error' || lookup.error != null;
  const isFetching =
    lookup.isFetching ?? (lookup.status === 'loading' || lookup.status === 'refreshing');
  const lookupSettled = lookup.status === 'success' || lookup.status === 'refreshing';
  const showEmptyState = lookup.status === 'success' && !hasOptions && !hasLoadError;
  // An empty lookup keeps its CTA reachable by Tab; the root blur handler closes
  // the popup once focus leaves. A populated list still closes on Tab as before.
  const tabEntersEmptyState = showEmptyState && Boolean(emptyState);

  const selectedRow =
    value !== null ? lookup.resolve(value) ?? lookup.byId.get(value) : undefined;
  const selectedInOptions =
    value !== null && lookup.options.some((option) => resolveId(option) === value);
  const selectedIsArchived =
    selectedRow !== undefined && lookup.isArchived?.(selectedRow) === true;
  const selectedIsUnavailable =
    value !== null &&
    lookupSettled &&
    (selectedRow === undefined || selectedIsArchived || !selectedInOptions);
  const resolvedLabel = value !== null ? lookup.label(value, '') : '';
  const selectedLabel = value !== null ? resolvedLabel || value : '';
  const selectedText = selectedIsUnavailable ? archivedLabel(selectedLabel) : selectedLabel;
  const canClear =
    value !== null && (allowClear || selectedIsArchived || selectedIsUnavailable);

  const activeOption =
    activeIndex >= 0 && activeIndex < visibleOptions.length ? visibleOptions[activeIndex] : undefined;

  const describedBy =
    [ariaDescribedBy, helperText && !error ? helperId : undefined, error ? fieldErrorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  const openPicker = useCallback(
    (direction: 1 | -1 = 1) => {
      if (disabled) return;
      setOpen(true);
      setActiveIndex(
        visibleOptions.length === 0 ? -1 : direction === 1 ? 0 : visibleOptions.length - 1
      );
    },
    [disabled, visibleOptions.length]
  );

  const closePicker = useCallback((restoreFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const selectOption = useCallback(
    (option: Row) => {
      onChange(resolveId(option));
      closePicker(true);
    },
    [closePicker, onChange, resolveId]
  );

  const clearSelection = useCallback(() => {
    onChange(null);
    closePicker(true);
  }, [closePicker, onChange]);

  const handleRootKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape' || !open) return;
      event.preventDefault();
      closePicker(true);
    },
    [closePicker, open]
  );

  const handleRootBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      // Close only when focus leaves the picker, so Tab can move into popup content.
      const next = event.relatedTarget;
      if (next instanceof Node && rootRef.current?.contains(next)) return;
      closePicker();
    },
    [closePicker]
  );

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    if (open) closePicker();
    else openPicker(1);
  }, [closePicker, disabled, open, openPicker]);

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          if (!open) {
            openPicker(event.key === 'ArrowDown' ? 1 : -1);
            return;
          }
          if (visibleOptions.length === 0) return;
          setActiveIndex((current) => {
            if (event.key === 'ArrowDown') {
              return current < visibleOptions.length - 1 ? current + 1 : 0;
            }
            return current > 0 ? current - 1 : visibleOptions.length - 1;
          });
          return;
        }
        case 'Home':
          if (!open) return;
          event.preventDefault();
          setActiveIndex(0);
          return;
        case 'End':
          if (!open) return;
          event.preventDefault();
          setActiveIndex(visibleOptions.length - 1);
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (!open) {
            openPicker(1);
            return;
          }
          if (activeOption) selectOption(activeOption);
          return;
        case 'Tab':
          if (open && !tabEntersEmptyState) closePicker();
          return;
        default:
          return;
      }
    },
    [
      activeOption,
      closePicker,
      disabled,
      open,
      openPicker,
      selectOption,
      tabEntersEmptyState,
      visibleOptions.length,
    ]
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = document.getElementById(`${listboxId}-option-${activeIndex}`);
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, listboxId, open]);

  const sizeClasses = {
    sm: 'min-h-8 px-2.5 text-sm',
    md: 'min-h-10 px-3 text-sm',
    lg: 'min-h-11 px-3.5 text-base',
  } as const;

  const optionSizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-3.5 py-2.5 text-base',
  } as const;

  const triggerClasses = [
    'relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border py-1.5 text-left shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-150',
    'bg-surface-card',
    sizeClasses[size],
    disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-surface-input-hover',
    open ? 'border-primary-500 ring-[3px] ring-primary-500/15' : 'border-surface-input',
    error ? 'border-red-400 dark:border-red-500/70' : '',
    'focus-visible:ring-[3px] focus-visible:ring-primary-500/15',
  ]
    .filter(Boolean)
    .join(' ');

  const optionLabel = (option: Row, optionId: Id): string => {
    const text = lookup.label(optionId, optionId);
    return lookup.isArchived?.(option) ? archivedLabel(text) : text;
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onBlur={handleRootBlur}
      onKeyDown={handleRootKeyDown}
    >
      {label ? (
        <label
          id={labelId}
          htmlFor={fieldId}
          className="mb-1.5 block text-sm font-medium text-surface-foreground"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <button
          ref={triggerRef}
          id={fieldId}
          type="button"
          name={name}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? (hasOptions ? listboxId : popupId) : undefined}
          aria-activedescendant={
            open && activeOption ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel ?? placeholder}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          className={triggerClasses}
          onClick={toggleOpen}
          onKeyDown={handleTriggerKeyDown}
          data-testid={dataTestId}
        >
          <span
            className={`min-w-0 flex-1 truncate text-left ${
              value === null
                ? 'text-surface-muted-fg'
                : selectedIsUnavailable
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-surface-foreground'
            }`}
          >
            {value === null ? placeholder : selectedText}
          </span>
          {canClear && !disabled ? (
            <span className="w-6 shrink-0" aria-hidden="true" />
          ) : null}
          <span className="flex shrink-0 items-center gap-1.5">
            {isFetching ? <Spinner size="sm" color="text-primary-600" /> : null}
            <ChevronDownIcon
              className={`h-4 w-4 text-surface-muted-fg transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {canClear && !disabled ? (
          <button
            type="button"
            aria-label={clearLabel}
            className="absolute right-9 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-surface-muted-fg transition-colors hover:text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            onClick={clearSelection}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        {open ? (
          <div
            id={popupId}
            className="absolute z-50 mt-1.5 w-full animate-slide-down rounded-xl border border-surface-border bg-surface-popover shadow-lg"
          >
            {hasLoadError ? (
              <div
                role="alert"
                className="border-b border-surface-border px-3 py-2 text-sm text-red-600 last:border-b-0 dark:text-red-400"
              >
                {errorText}
              </div>
            ) : null}

            {isLoading && !hasOptions ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-surface-muted-fg">
                <Spinner size="sm" color="text-primary-600" />
                <span>{loadingText}</span>
              </div>
            ) : null}

            {showEmptyState ? (
              <div
                role="status"
                aria-live="polite"
                className={
                  emptyState
                    ? 'p-2'
                    : 'px-3 py-4 text-center text-sm text-surface-muted-fg'
                }
              >
                {emptyState ?? noOptionsText}
              </div>
            ) : null}

            {hasOptions ? (
              <div
                id={listboxId}
                role="listbox"
                aria-labelledby={label ? labelId : undefined}
                aria-label={label ? undefined : ariaLabel ?? placeholder}
                className="max-h-72 overflow-auto py-1"
              >
                {visibleOptions.map((option, index) => {
                  const optionId = resolveId(option);
                  const isSelected = optionId === value;
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={optionId}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        'mx-1.5 flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg transition-colors duration-100 first:mt-1.5 last:mb-1.5',
                        optionSizeClasses[size],
                        isActive ? 'bg-surface-accent' : '',
                        isSelected
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                          : 'text-surface-foreground',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                    >
                      <span className="min-w-0 flex-1 truncate">{optionLabel(option, optionId)}</span>
                      {isSelected ? (
                        <CheckIcon
                          className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {helperText && !error ? (
        <p id={helperId} className="mt-1.5 text-xs text-surface-muted-fg">
          {helperText}
        </p>
      ) : null}

      {error ? (
        <p
          id={fieldErrorId}
          role="alert"
          className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default EntityPicker;

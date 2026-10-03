import { logger } from '@/utils/logging';

// ABOUTME: Enhanced Select component with modern styling, search, keyboard navigation, and accessibility
// ABOUTME: Supports single/multi-select, loading states, and WCAG 2.1 AA compliance

import React, { 
  useState, 
  useRef, 
  useEffect, 
  useCallback, 
  useMemo,
  KeyboardEvent,
  MouseEvent,
  FocusEvent,
  ReactNode 
} from 'react';
import { ChevronDownIcon, XMarkIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { createAriaDescribedBy, getFormFieldIds, getAriaInvalid, announceToScreenReader } from '@/utils/accessibility';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: ReactNode;
}

export interface SelectProps {
  // Basic props
  label?: string;
  placeholder?: string;
  error?: string;
  /**
   * Style-only error state (red border/ring, aria-invalid) WITHOUT rendering the
   * error message — use when a wrapper (e.g. FormField) renders the message.
   */
  errorState?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  
  // Options and values - support both new and legacy APIs
  options?: SelectOption[];
  children?: ReactNode; // Legacy support for <option> children
  value?: string | string[];
  defaultValue?: string | string[];
  // Legacy mode (<option> children) fires a native select change event.
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  // Enhanced mode (options prop) reports the selected value(s) directly.
  onValueChange?: (value: string | string[]) => void;
  
  // Multi-select
  multiple?: boolean;
  maxSelections?: number;
  
  // Search functionality
  searchable?: boolean;
  searchPlaceholder?: string;
  noOptionsMessage?: string;
  
  // Styling
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outlined' | 'filled';
  className?: string;
  containerClassName?: string;
  
  // Accessibility
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
  
  // Callbacks
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onSearch?: (query: string) => void;
}

const normalizeOption = (option: SelectOption): SelectOption => ({
  ...option,
  value: String(option.value),
});

// Helper function to parse children into SelectOption[]
const parseChildrenToOptions = (children: ReactNode): SelectOption[] => {
  const options: SelectOption[] = [];
  
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const props = child.props as any;
      options.push({
        value: String(props.value || ''),
        label: String(props.children || props.value || ''),
        disabled: props.disabled || false,
      });
    }
  });
  
  return options;
};

const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Select an option...',
  error,
  errorState = false,
  helperText,
  disabled = false,
  required = false,
  loading = false,
  options,
  children,
  value,
  defaultValue,
  onChange,
  onValueChange,
  multiple = false,
  maxSelections,
  searchable = false,
  searchPlaceholder = 'Search options...',
  noOptionsMessage = 'No options found',
  size = 'md',
  variant = 'outlined',
  className = '',
  containerClassName = '',
  id,
  name,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'data-testid': dataTestId,
  onFocus,
  onBlur,
  onSearch,
}) => {
  // Determine if we're using legacy mode (children) or enhanced mode (options)
  const isLegacyMode = !options && children;
  const effectiveOptions = useMemo(() => {
    if (options) return options.map(normalizeOption);
    if (children) return parseChildrenToOptions(children);
    return [];
  }, [options, children]);

  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerFocused, setIsTriggerFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [internalValue, setInternalValue] = useState<string | string[]>(
    defaultValue || (multiple ? [] : '')
  );

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Utilities
  const fieldIds = useMemo(() => getFormFieldIds(name || 'select'), [name]);

  // Any error condition (message or style-only) flips the invalid visuals
  const isInvalid = Boolean(error) || errorState;
  // The message paragraph only renders when an error STRING is supplied
  const finalErrorVisible = Boolean(error);

  // Controlled vs uncontrolled
  const currentValue = value !== undefined ? value : internalValue;
  const isControlled = value !== undefined;
  const normalizedValue = useMemo(() => {
    if (multiple) {
      return Array.isArray(currentValue)
        ? currentValue.map(item => String(item))
        : [];
    }

    if (currentValue === undefined || currentValue === null) {
      return '';
    }

    return String(currentValue);
  }, [currentValue, multiple]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return effectiveOptions;
    return effectiveOptions.filter(option =>
      (option.label?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [effectiveOptions, searchQuery]);

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    if (multiple && Array.isArray(normalizedValue)) {
      return effectiveOptions.filter(option => normalizedValue.includes(option.value));
    }
    if (!multiple && typeof normalizedValue === 'string') {
      return effectiveOptions.filter(option => option.value === normalizedValue);
    }
    return [];
  }, [effectiveOptions, normalizedValue, multiple]);

  // Handle value changes
  const handleValueChange = useCallback((newValue: string | string[]) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }

    // Options-mode consumers receive the selected value(s) directly through
    // either callback; legacy <option>-children consumers receive a native-style
    // change event so existing handlers keep working unchanged.
    if (!isLegacyMode) {
      onValueChange?.(newValue);
      onChange?.(newValue as unknown as React.ChangeEvent<HTMLSelectElement>);
      return;
    }

    if (onChange) {
      // For legacy mode, create a synthetic event that matches HTMLSelectElement onChange
      const syntheticEvent = {
        target: {
          name: name || '',
          value: Array.isArray(newValue) ? newValue[newValue.length - 1] || '' : newValue,
          type: 'select-one',
        },
        currentTarget: {
          name: name || '',
          value: Array.isArray(newValue) ? newValue[newValue.length - 1] || '' : newValue,
        },
      } as React.ChangeEvent<HTMLSelectElement>;

      onChange(syntheticEvent);
    }
  }, [isControlled, onChange, onValueChange, isLegacyMode, name]);

  // Handle option selection
  const handleOptionSelect = useCallback((option: SelectOption) => {
    if (option.disabled) return;

    if (multiple) {
      const currentArray = Array.isArray(normalizedValue) ? normalizedValue : [];
      const isSelected = currentArray.includes(option.value);
      
      let newValue: string[];
      if (isSelected) {
        newValue = currentArray.filter(v => v !== option.value);
      } else {
        if (maxSelections && currentArray.length >= maxSelections) {
          announceToScreenReader(`Maximum ${maxSelections} selections allowed`);
          return;
        }
        newValue = [...currentArray, option.value];
      }
      
      handleValueChange(newValue);
      announceToScreenReader(
        isSelected ? `${option.label} deselected` : `${option.label} selected`
      );
    } else {
      handleValueChange(option.value);
      setIsOpen(false);
      announceToScreenReader(`${option.label} selected`);
    }
  }, [normalizedValue, multiple, maxSelections, handleValueChange]);

  // Handle tag removal in multi-select
  const handleTagRemove = useCallback((optionValue: string, event: MouseEvent) => {
    event.stopPropagation();
    if (Array.isArray(normalizedValue)) {
      const newValue = normalizedValue.filter(v => v !== optionValue);
      handleValueChange(newValue);
      const option = effectiveOptions.find(opt => opt.value === optionValue);
      if (option) {
        announceToScreenReader(`${option.label} removed`);
      }
    }
  }, [normalizedValue, handleValueChange, effectiveOptions]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || loading) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[focusedIndex]);
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          const nextIndex = focusedIndex < filteredOptions.length - 1 ? focusedIndex + 1 : 0;
          setFocusedIndex(nextIndex);
          optionRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(filteredOptions.length - 1);
        } else {
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : filteredOptions.length - 1;
          setFocusedIndex(prevIndex);
          optionRefs.current[prevIndex]?.scrollIntoView({ block: 'nearest' });
        }
        break;
      
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(0);
          optionRefs.current[0]?.scrollIntoView({ block: 'nearest' });
        }
        break;
      
      case 'End':
        if (isOpen) {
          event.preventDefault();
          const lastIndex = filteredOptions.length - 1;
          setFocusedIndex(lastIndex);
          optionRefs.current[lastIndex]?.scrollIntoView({ block: 'nearest' });
        }
        break;
      
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [disabled, isOpen, focusedIndex, filteredOptions, handleOptionSelect]);

  // Handle search input
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    setFocusedIndex(-1);
    onSearch?.(query);
  }, [onSearch]);

  // Handle dropdown toggle
  const handleToggle = useCallback(() => {
    if (disabled || loading) return;
    setIsOpen(!isOpen);
  }, [disabled, loading, isOpen]);

  // Handle focus events
  const handleFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    setIsTriggerFocused(true);
    onFocus?.(event);
  }, [onFocus]);

  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    setIsTriggerFocused(false);
    // For multi-select, don't close on blur - let click outside handle it
    if (multiple) {
      onBlur?.(event);
      return;
    }
    
    // Use setTimeout to allow click events to be processed first
    setTimeout(() => {
      // Only close if focus is moving outside the component and dropdown is still open
      if (!containerRef.current?.contains(document.activeElement as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }, 0);
    onBlur?.(event);
  }, [onBlur, multiple]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      
      // Don't close if clicking on an option (let the option handler run first)
      if (target && target.closest('[role="option"]')) {
        return;
      }
      
      // For multi-select, be more careful about closing
      if (multiple && target && containerRef.current?.contains(target as Node)) {
        return;
      }
      
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, multiple]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen, searchable]);

  // Reset focused index when options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  // Size variants — control heights match Input (sm 32 / md 40 / lg 44)
  const sizeClasses = {
    sm: {
      trigger: 'min-h-8 px-2.5 text-sm',
      dropdown: 'text-sm',
      option: 'px-2.5 py-1.5 text-sm',
      tag: 'px-1.5 py-0.5 text-xs',
    },
    md: {
      trigger: 'min-h-10 px-3 text-sm',
      dropdown: 'text-sm',
      option: 'px-3 py-2 text-sm',
      tag: 'px-2 py-0.5 text-xs',
    },
    lg: {
      trigger: 'min-h-11 px-3.5 text-base',
      dropdown: 'text-base',
      option: 'px-3.5 py-2.5 text-base',
      tag: 'px-2 py-1 text-sm',
    },
  };

  // Variant styles — token-based so they follow the active theme
  const variantClasses = {
    outlined: {
      trigger: 'bg-surface-card border border-surface-input shadow-sm',
    },
    filled: {
      trigger: 'bg-surface-muted border border-transparent',
    },
  };

  const currentSizeClasses = sizeClasses[size];
  const currentVariantClasses = variantClasses[variant];

  // Focus/open ring treatment shared by trigger states
  const accentRing = isInvalid
    ? 'border-red-400 dark:border-red-500/70 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/15'
    : 'border-primary-500 ring-[3px] ring-primary-500/15';

  // Build trigger classes
  const triggerClasses = [
    'relative w-full rounded-lg text-left cursor-pointer',
    'flex items-center justify-between gap-2 py-1.5',
    'outline-none transition-[border-color,box-shadow,background-color] duration-150',
    currentSizeClasses.trigger,
    currentVariantClasses.trigger,
    disabled
      ? 'opacity-60 cursor-not-allowed'
      : isInvalid
        ? 'hover:border-red-400 dark:hover:border-red-500/70'
        : 'hover:border-surface-input-hover',
    isOpen || isTriggerFocused ? accentRing : '',
    className,
  ].filter(Boolean).join(' ');

  // Build dropdown classes
  const dropdownClasses = [
    'absolute z-50 w-full mt-1.5 bg-surface-popover border border-surface-border rounded-xl shadow-lg',
    'max-h-72 overflow-auto',
    'animate-slide-down',
    currentSizeClasses.dropdown,
  ].join(' ');

  // Render selected value display
  const renderSelectedValue = () => {
    if (multiple && Array.isArray(normalizedValue) && normalizedValue.length > 0) {
      return (
        <div className="flex flex-wrap items-center gap-1 py-0.5">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className={`inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-400/30 rounded-md ${currentSizeClasses.tag}`}
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span className="truncate">{option.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleTagRemove(option.value, e)}
                  className="flex-shrink-0 ml-0.5 rounded-full text-primary-500 hover:text-primary-700 dark:hover:text-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                  aria-label={`Remove ${option.label}`}
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      );
    }

    if (!multiple && typeof normalizedValue === 'string' && normalizedValue) {
      const selectedOption = effectiveOptions.find(opt => opt.value === normalizedValue);
      if (selectedOption) {
        return (
          <div className="flex items-center gap-2">
            {selectedOption.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
            <span className="truncate text-surface-foreground">{selectedOption.label}</span>
          </div>
        );
      }
    }

    return (
      <span className="text-surface-muted-fg truncate">
        {loading ? 'Loading...' : placeholder}
      </span>
    );
  };

  // Render option
  const renderOption = (option: SelectOption, index: number) => {
    const isSelected = multiple
      ? Array.isArray(normalizedValue) && normalizedValue.includes(option.value)
      : normalizedValue === option.value;
    const isFocused = index === focusedIndex;

    return (
      <div
        key={option.value}
        ref={(el) => { optionRefs.current[index] = el; }}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled}
        className={[
          'cursor-pointer select-none relative rounded-lg mx-1.5 first:mt-1.5 last:mb-1.5',
          'transition-colors duration-100',
          currentSizeClasses.option,
          option.disabled
            ? 'opacity-50 cursor-not-allowed'
            : isFocused
              ? 'bg-surface-accent'
              : 'hover:bg-surface-accent',
          isSelected && !option.disabled ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300' : 'text-surface-foreground',
        ].filter(Boolean).join(' ')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!option.disabled) {
            handleOptionSelect(option);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {option.icon && <span className="flex-shrink-0 text-surface-muted-fg">{option.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className={isSelected ? 'truncate font-medium' : 'truncate'}>{option.label}</div>
              {option.description && (
                <div className="text-xs text-surface-muted-fg truncate mt-0.5">{option.description}</div>
              )}
            </div>
          </div>
          {isSelected && !option.disabled && (
            <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  // If legacy mode and enhanced features are requested, fall back to standard select
  if (isLegacyMode && (searchable || multiple)) {
    logger.warn('Select: Enhanced features (searchable, multiple) are not supported with children API. Please use options prop instead.');
  }

  // Render legacy HTML select for backward compatibility
  if (isLegacyMode && !searchable && !multiple) {
    return (
      <div className={`relative ${containerClassName}`}>
        {label && (
          <label
            htmlFor={fieldIds.field}
            className="block text-sm font-medium text-surface-foreground mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            id={id ?? fieldIds.field}
            name={name}
            value={Array.isArray(normalizedValue) ? normalizedValue[0] || '' : normalizedValue}
            onChange={onChange as (e: React.ChangeEvent<HTMLSelectElement>) => void}
            disabled={disabled}
            required={required}
            aria-label={ariaLabel}
            aria-describedby={createAriaDescribedBy([
              ariaDescribedBy,
              helperText ? fieldIds.description : undefined,
              finalErrorVisible ? fieldIds.error : undefined,
            ])}
            aria-invalid={getAriaInvalid(isInvalid)}
            data-testid={dataTestId}
            className={[
              'w-full appearance-none rounded-lg text-left cursor-pointer',
              'outline-none transition-[border-color,box-shadow,background-color] duration-150',
              // Native selects don't wrap, so pin the control height like Input
              size === 'sm' ? 'h-8' : size === 'lg' ? 'h-11' : 'h-10',
              currentSizeClasses.trigger,
              currentVariantClasses.trigger,
              disabled
                ? 'opacity-60 cursor-not-allowed'
                : isInvalid
                  ? 'border-red-400 dark:border-red-500/70 hover:border-red-400 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/15'
                  : 'hover:border-surface-input-hover focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/15',
              className,
            ].filter(Boolean).join(' ')}
          >
            {children}
          </select>
          <ChevronDownIcon
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-muted-fg ${
              size === 'sm' ? 'right-2.5' : ''
            }`}
            aria-hidden="true"
          />
        </div>

        {helperText && !error && (
          <p id={fieldIds.description} className="mt-1.5 text-xs text-surface-muted-fg">
            {helperText}
          </p>
        )}

        {error && (
          <p id={fieldIds.error} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${containerClassName}`}>
      {label && (
        <label
          htmlFor={fieldIds.field}
          className="block text-sm font-medium text-surface-foreground mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div
        ref={containerRef}
        className="relative"
      >
        <div
          ref={triggerRef}
          id={id ?? fieldIds.field}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-describedby={createAriaDescribedBy([
            ariaDescribedBy,
            helperText ? fieldIds.description : undefined,
            finalErrorVisible ? fieldIds.error : undefined,
          ])}
          aria-invalid={getAriaInvalid(isInvalid)}
          aria-required={required}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          className={triggerClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          data-testid={dataTestId}
        >
          <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
            <div className="flex-1 min-w-0">
              {renderSelectedValue()}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {loading && (
                <div className="animate-spin w-4 h-4 border-2 border-surface-border border-t-primary-600 rounded-full" />
              )}
              <ChevronDownIcon
                className={`w-4 h-4 text-surface-muted-fg transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={dropdownClasses}
          >
            {searchable && (
              <div className="sticky top-0 z-10 bg-surface-popover border-b border-surface-border p-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-muted-fg pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    className="w-full h-8 pl-9 pr-3 bg-surface-muted dark:bg-slate-800/60 border border-transparent rounded-md text-sm text-surface-foreground placeholder:text-surface-muted-fg focus:outline-none focus:bg-surface-card focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/15"
                  />
                </div>
              </div>
            )}

            <div
              role="listbox"
              aria-multiselectable={multiple}
              className="py-1"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => renderOption(option, index))
              ) : (
                <div className={`text-surface-muted-fg text-center ${currentSizeClasses.option}`}>
                  {searchQuery ? noOptionsMessage : 'No options available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {helperText && !error && (
        <p id={fieldIds.description} className="mt-1.5 text-xs text-surface-muted-fg">
          {helperText}
        </p>
      )}

      {error && (
        <p id={fieldIds.error} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;

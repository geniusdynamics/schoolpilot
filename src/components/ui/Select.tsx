
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
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { designTokens } from '../../utils/designTokens';
import { useTransition, transitions } from '../../utils/animations';
import { 
  useFocusManagement, 
  useKeyboardNavigation, 
  generateId, 
  createAriaDescribedBy,
  getFormFieldIds,
  getAriaInvalid,
  announceToScreenReader 
} from '../../utils/accessibility';

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
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  
  // Options and values - support both new and legacy APIs
  options?: SelectOption[];
  children?: ReactNode; // Legacy support for <option> children
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[] | React.ChangeEvent<HTMLSelectElement>) => void;
  
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
  helperText,
  disabled = false,
  required = false,
  loading = false,
  options,
  children,
  value,
  defaultValue,
  onChange,
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
  const { trapFocus, restoreFocus } = useFocusManagement();
  const fieldIds = useMemo(() => getFormFieldIds(name || 'select'), [name]);
  const transitionStyles = useTransition(['all'], designTokens.animations.duration.fast);

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
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    
    if (onChange) {
      if (isLegacyMode) {
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
        
        (onChange as (e: React.ChangeEvent<HTMLSelectElement>) => void)(syntheticEvent);
      } else {
        // For enhanced mode, pass the value directly
        (onChange as (value: string | string[]) => void)(newValue);
      }
    }
  }, [isControlled, onChange, isLegacyMode, name]);

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
    onFocus?.(event);
  }, [onFocus]);

  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
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

  // Size variants
  const sizeClasses = {
    sm: {
      trigger: 'px-3 py-1.5 text-sm',
      dropdown: 'text-sm',
      option: 'px-3 py-1.5',
      tag: 'px-2 py-0.5 text-xs',
    },
    md: {
      trigger: 'px-3 py-2 text-base',
      dropdown: 'text-base',
      option: 'px-3 py-2',
      tag: 'px-2 py-1 text-sm',
    },
    lg: {
      trigger: 'px-4 py-3 text-lg',
      dropdown: 'text-lg',
      option: 'px-4 py-3',
      tag: 'px-3 py-1.5 text-base',
    },
  };

  // Variant styles
  const variantClasses = {
    outlined: {
      trigger: 'border border-gray-300 bg-white',
      triggerFocus: 'ring-2 ring-primary-500 border-primary-500',
      triggerError: 'border-error-500 ring-error-500',
    },
    filled: {
      trigger: 'border-0 bg-gray-100',
      triggerFocus: 'ring-2 ring-primary-500 bg-white',
      triggerError: 'bg-error-50 ring-error-500',
    },
  };

  const currentSizeClasses = sizeClasses[size];
  const currentVariantClasses = variantClasses[variant];

  // Build trigger classes
  const triggerClasses = [
    'relative w-full rounded-md shadow-sm cursor-pointer',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'transition-all duration-150 ease-in-out',
    currentSizeClasses.trigger,
    currentVariantClasses.trigger,
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400',
    error ? currentVariantClasses.triggerError : currentVariantClasses.triggerFocus,
    isOpen ? 'ring-2 ring-primary-500 border-primary-500' : '',
    className,
  ].filter(Boolean).join(' ');

  // Build dropdown classes
  const dropdownClasses = [
    'absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg',
    'max-h-60 overflow-auto',
    currentSizeClasses.dropdown,
  ].join(' ');

  // Render selected value display
  const renderSelectedValue = () => {
    if (multiple && Array.isArray(normalizedValue) && normalizedValue.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className={`inline-flex items-center gap-1 bg-primary-100 text-primary-800 rounded-md ${currentSizeClasses.tag}`}
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span className="truncate">{option.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleTagRemove(option.value, e)}
                  className="flex-shrink-0 ml-1 text-primary-600 hover:text-primary-800 focus:outline-none focus:text-primary-800"
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
            <span className="truncate">{selectedOption.label}</span>
          </div>
        );
      }
    }

    return (
      <span className="text-gray-500 truncate">
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
        ref={(el) => (optionRefs.current[index] = el)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled}
        className={[
          'cursor-pointer select-none relative',
          currentSizeClasses.option,
          option.disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : isFocused 
              ? 'bg-primary-50 text-primary-900' 
              : 'text-gray-900 hover:bg-gray-50',
          isSelected && !option.disabled ? 'bg-primary-100 text-primary-900' : '',
        ].filter(Boolean).join(' ')}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!option.disabled) {
            handleOptionSelect(option);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{option.label}</div>
              {option.description && (
                <div className="text-sm text-gray-500 truncate">{option.description}</div>
              )}
            </div>
          </div>
          {multiple && isSelected && (
            <CheckIcon className="w-4 h-4 text-primary-600 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  // If legacy mode and enhanced features are requested, fall back to standard select
  if (isLegacyMode && (searchable || multiple)) {
    console.warn('Select: Enhanced features (searchable, multiple) are not supported with children API. Please use options prop instead.');
  }

  // Render legacy HTML select for backward compatibility
  if (isLegacyMode && !searchable && !multiple) {
    return (
      <div className={`relative ${containerClassName}`}>
        {label && (
          <label
            htmlFor={fieldIds.field}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <select
          id={fieldIds.field}
          name={name}
          value={Array.isArray(normalizedValue) ? normalizedValue[0] || '' : normalizedValue}
          onChange={onChange as (e: React.ChangeEvent<HTMLSelectElement>) => void}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-describedby={createAriaDescribedBy([
            ariaDescribedBy,
            helperText ? fieldIds.description : undefined,
            error ? fieldIds.error : undefined,
          ])}
          aria-invalid={getAriaInvalid(!!error)}
          data-testid={dataTestId}
          className={[
            'w-full rounded-md shadow-sm border',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'transition-all duration-150 ease-in-out',
            currentSizeClasses.trigger,
            currentVariantClasses.trigger,
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400',
            error ? currentVariantClasses.triggerError : currentVariantClasses.triggerFocus,
            className,
          ].filter(Boolean).join(' ')}
        >
          {children}
        </select>

        {helperText && !error && (
          <p id={fieldIds.description} className="mt-1 text-sm text-gray-600">
            {helperText}
          </p>
        )}
        
        {error && (
          <p id={fieldIds.error} className="mt-1 text-sm text-error-600">
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
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div
        ref={containerRef}
        className="relative"
      >
        <div
          ref={triggerRef}
          id={fieldIds.field}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-describedby={createAriaDescribedBy([
            ariaDescribedBy,
            helperText ? fieldIds.description : undefined,
            error ? fieldIds.error : undefined,
          ])}
          aria-invalid={getAriaInvalid(!!error)}
          aria-required={required}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          className={triggerClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={transitionStyles}
          data-testid={dataTestId}
        >
          <div className="flex items-center justify-between min-h-[1.5rem]">
            <div className="flex-1 min-w-0 pr-2">
              {renderSelectedValue()}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {loading && (
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full" />
              )}
              {isOpen ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={dropdownClasses}
            style={transitionStyles}
          >
            {searchable && (
              <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <div className={`text-gray-500 text-center ${currentSizeClasses.option}`}>
                  {searchQuery ? noOptionsMessage : 'No options available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {helperText && !error && (
        <p id={fieldIds.description} className="mt-1 text-sm text-gray-600">
          {helperText}
        </p>
      )}
      
      {error && (
        <p id={fieldIds.error} className="mt-1 text-sm text-error-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;

// ABOUTME: Filter bar component with dropdowns, search, and action buttons
// ABOUTME: Provides a consistent filtering interface across modules

import React from 'react';
import { cn } from '@/utils/cn';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterField {
  id: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
  value?: string;
  onChange: (value: string) => void;
  optional?: boolean;
}

interface FilterBarProps {
  filters: FilterField[];
  onClear?: () => void;
  onSearch?: () => void;
  searchLabel?: string;
  className?: string;
  compact?: boolean;
  showIcon?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onClear,
  onSearch,
  searchLabel = 'Search',
  className = '',
  compact = false,
  showIcon = true,
}) => {
  const hasActiveFilters = filters.some((f) => f.value && f.value !== '');

  return (
    <div
      className={cn(
        'bg-emerald-50/50 border border-emerald-100 rounded-xl',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      <div className="flex flex-wrap items-end gap-3">
        {showIcon && (
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <FunnelIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Filters</span>
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.id} className="flex-1 min-w-[180px] max-w-[280px]">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {filter.label}
              {filter.optional && (
                <span className="text-gray-400 font-normal ml-1">(Optional)</span>
              )}
            </label>
            <select
              id={filter.id}
              value={filter.value || ''}
              onChange={(e) => filter.onChange(e.target.value)}
              className={cn(
                'w-full rounded-lg border-gray-300 text-gray-900',
                'focus:border-emerald-500 focus:ring-emerald-500',
                'bg-white shadow-sm',
                compact ? 'py-1.5 text-sm' : 'py-2 text-sm'
              )}
            >
              <option value="">
                {filter.placeholder || `Select ${filter.label}`}
              </option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && onClear && (
            <button
              onClick={onClear}
              className={cn(
                'flex items-center gap-1.5 text-gray-600 hover:text-gray-900',
                'transition-colors font-medium',
                compact ? 'text-sm px-2 py-1.5' : 'text-sm px-3 py-2'
              )}
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </button>
          )}

          {onSearch && (
            <button
              onClick={onSearch}
              className={cn(
                'bg-emerald-600 text-white rounded-lg font-medium',
                'hover:bg-emerald-700 active:bg-emerald-800',
                'transition-colors shadow-sm',
                compact ? 'px-4 py-1.5 text-sm' : 'px-5 py-2 text-sm'
              )}
            >
              {searchLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;

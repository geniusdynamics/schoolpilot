// ABOUTME: Modern DataGrid component with sorting, filtering, selection, and responsive design
// ABOUTME: Replaces the basic Table component with advanced features and contemporary styling

import React, { useState, useMemo, useCallback, ReactNode } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Spinner from '../Spinner';
import SkeletonLoader from './SkeletonLoader';
import TableErrorBoundary from './TableErrorBoundary';
import { DataValidationUtils } from '../../../utils/dataValidationUtils';

export interface DataGridColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean | 'left' | 'right';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  data: T[];
  loading?: boolean;
  isLoading?: boolean; // For backward compatibility with older components
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selected: T[]) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  emptyState?: ReactNode | { 
    icon?: ReactNode; 
    title: string; 
    description?: string; 
    action?: ReactNode | { label: string; onClick: () => void; icon?: ReactNode };
  };
  loadingState?: ReactNode;
  className?: string;
}

interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterState {
  [key: string]: string;
}

// Enhanced DataGrid with validation and error boundaries
const DataGrid = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  isLoading,
  sortable = true,
  filterable = true,
  selectable = false,
  pagination,
  onRowClick,
  onSelectionChange,
  onSort,
  onFilter,
  emptyState,
  loadingState,
  className = ''
}: DataGridProps<T>): React.ReactElement => {
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const effectiveLoading = loading || isLoading || false;

  // Validate and prepare data with defensive checks
  const validatedData = useMemo(() => {
    // Ensure data is always an array
    const safeData = DataValidationUtils.ensureArray(data);
    
    // Validate table data structure
    const requiredColumns = columns
      .filter(col => col.key !== 'actions') // Exclude action columns from validation
      .map(col => col.key as string);
    
    const validation = DataValidationUtils.validateTableData(safeData, requiredColumns);
    
    if (!validation.isValid && validation.errors.length > 0) {
      console.warn('DataGrid validation warnings:', validation.errors);
    }
    
    return validation.validData;
  }, [data, columns]);

  // Validate and prepare columns with safe render functions
  const validatedColumns = useMemo(() => {
    return DataValidationUtils.validateColumns(columns);
  }, [columns]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return;
    
    const newDirection = 
      sortState?.key === columnKey && sortState.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    
    const newSortState = { key: columnKey, direction: newDirection };
    setSortState(newSortState);
    
    if (onSort) {
      onSort(columnKey, newDirection);
    }
  }, [sortState, sortable, onSort]);

  // Handle filtering
  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    const newFilters = { ...filterState, [columnKey]: value };
    if (!value) {
      delete newFilters[columnKey];
    }
    setFilterState(newFilters);
    
    if (onFilter) {
      onFilter(newFilters);
    }
  }, [filterState, onFilter]);

  // Handle row selection
  const handleRowSelection = useCallback((rowIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    setSelectedRows(newSelected);
    
    if (onSelectionChange) {
      const selectedData = Array.from(newSelected).map(index => data[index]);
      onSelectionChange(selectedData);
    }
  }, [selectedRows, data, onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    const newSelected = checked ? new Set(data.map((_, index) => index)) : new Set<number>();
    setSelectedRows(newSelected);
    
    if (onSelectionChange) {
      const selectedData = checked ? [...data] : [];
      onSelectionChange(selectedData);
    }
  }, [data, onSelectionChange]);

  // Process data (sorting and filtering if not handled externally)
  const processedData = useMemo(() => {
    let result = [...validatedData];

    // Apply filtering if not handled externally
    if (!onFilter && Object.keys(filterState).length > 0) {
      result = result.filter(row => {
        return Object.entries(filterState).every(([key, filterValue]) => {
          const cellValue = String(row[key] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting if not handled externally
    if (!onSort && sortState) {
      result.sort((a, b) => {
        const aValue = a[sortState.key];
        const bValue = b[sortState.key];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortState.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortState, filterState, onSort, onFilter]);

  // Render cell content
  const renderCellContent = useCallback((row: T, column: DataGridColumn<T>) => {
    if (column.render) {
      const value = typeof column.key === 'string' ? row[column.key] : undefined;
      return column.render(value, row);
    }
    
    const value = row[column.key as keyof T];
    
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (typeof value === 'number' && !isNaN(value)) {
      return String(value);
    }
    
    return String(value !== undefined && value !== null ? value : '-');
  }, []);

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (!sortable) return null;
    
    const isActive = sortState?.key === columnKey;
    const direction = sortState?.direction;
    
    return (
      <span className="ml-2 flex-none">
        {isActive && direction === 'asc' ? (
          <ChevronUpIcon className="h-4 w-4 text-blue-600" />
        ) : isActive && direction === 'desc' ? (
          <ChevronDownIcon className="h-4 w-4 text-blue-600" />
        ) : (
          <div className="flex flex-col">
            <ChevronUpIcon className="h-3 w-3 text-gray-400" />
            <ChevronDownIcon className="h-3 w-3 text-gray-400 -mt-1" />
          </div>
        )}
      </span>
    );
  };

  const isAllSelected = selectedRows.size === processedData.length && processedData.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < processedData.length;

  const renderEmptyState = () => {
    if (!emptyState) {
      return (
        <div className="text-gray-500">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">No data available</div>
        </div>
      );
    }
    
    // If it's a valid React element or primitive, render it directly
    if (React.isValidElement(emptyState) || typeof emptyState === 'string' || typeof emptyState === 'number') {
      return emptyState as ReactNode;
    }
    
    // Otherwise, treat it as our custom object format
    const state = emptyState as any; // Using any here since we know it's the object shape
    
    let actionElement = null;
    if (state.action) {
      if (React.isValidElement(state.action)) {
        actionElement = state.action;
      } else if (typeof state.action === 'object' && state.action.label) {
        // Fallback for objects like { label: '...', onClick: ... }
        actionElement = (
          <button 
            onClick={state.action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {state.action.icon && <span className="mr-2 -ml-1">{state.action.icon}</span>}
            {state.action.label}
          </button>
        );
      }
    }

    return (
      <div className="text-gray-500 flex flex-col items-center py-4">
        {state.icon && <div className="mb-4">{state.icon}</div>}
        {state.title && <div className="text-lg font-medium text-gray-900 mb-1">{state.title}</div>}
        {state.description && <div className="text-sm mb-4">{state.description}</div>}
        {actionElement && <div>{actionElement}</div>}
      </div>
    );
  };

return (
    <TableErrorBoundary
      tableName="DataGrid"
      fallback={<div>An error occurred while rendering the table. Please try again later.</div>}
    >
      <div className={`bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        {/* Filter Bar */}
      {filterable && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
              {Object.keys(filterState).length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {Object.keys(filterState).length}
                </span>
              )}
            </button>
          </div>
          
          {showFilters && (
            <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {columns.filter(col => col.filterable !== false).map((column, index) => (
                <div key={index} className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {column.header}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Filter ${column.header.toLowerCase()}...`}
                      value={filterState[column.key as string] || ''}
                      onChange={(e) => handleFilterChange(column.key as string, e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${
                    column.sticky === true || column.sticky === 'left' ? 'sticky left-0 bg-gray-50 z-10' : 
                    column.sticky === 'right' ? 'sticky right-0 bg-gray-50 z-10' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key as string)}
                >
                  <div className={`flex items-center ${
                    column.align === 'center' ? 'justify-center' : 
                    column.align === 'right' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{column.header}</span>
                    {column.sortable !== false && renderSortIcon(column.key as string)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {effectiveLoading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center">
                  {loadingState || (
                    <SkeletonLoader rows={5} columns={columns.length} />
                  )}
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  {renderEmptyState()}
                </td>
              </tr>
            ) : (
              processedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-50 transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${selectedRows.has(rowIndex) ? 'bg-blue-50' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelection(rowIndex, e.target.checked);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                        column.align === 'center' ? 'text-center' : 
                        column.align === 'right' ? 'text-right' : 'text-left'
                      } ${
                        column.sticky === true || column.sticky === 'left' ? 'sticky left-0 bg-white z-10' : 
                        column.sticky === 'right' ? 'sticky right-0 bg-white z-10' : ''
                      }`}
                      style={{ width: column.width }}
                    >
                      {renderCellContent(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      </div>
    </TableErrorBoundary>
  );
};

export default DataGrid;
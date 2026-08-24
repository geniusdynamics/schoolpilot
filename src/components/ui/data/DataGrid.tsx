import { logger } from '@/utils/logging';

// ABOUTME: Modern DataGrid component with sorting, filtering, selection, and pagination
// ABOUTME: Single canonical table for the app — see docs/contributing/grids.md for the column contract

import React, { useState, useMemo, useCallback, useRef, ReactNode } from 'react';
import { ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon, FunnelIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import SkeletonLoader from './SkeletonLoader';
import TableErrorBoundary from './TableErrorBoundary';

/**
 * Column contract (documented in docs/contributing/grids.md):
 * - `key` — the row field to display (or an 'actions' style key used only with `render`)
 * - `header` — column heading text
 * - `render` — custom cell renderer receiving (value, row)
 * - `width` — fixed column width; when ANY column sets width the table uses
 *   `table-layout: fixed`, otherwise auto layout
 * - `minWidth` — minimum column width (applies in both layouts)
 * - `align` — text alignment, defaults to left
 * - `sortable` / `filterable` — opt out per column (both default true)
 * - `sticky` — pin column left/right
 */
export interface DataGridColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean | 'left' | 'right';
}

export interface PaginationConfig {
  /** Current page (controlled mode — together with onPageChange). */
  page?: number;
  /** Rows per page. Default 10. */
  pageSize?: number;
  /** Total row count (controlled mode — together with onPageChange). */
  total?: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  /**
   * Controlled pagination: when provided, DataGrid does not slice data itself
   * and every page change is delegated here. Without it DataGrid paginates
   * `data` internally (recommended — buttons just work).
   */
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  data: T[];
  loading?: boolean;
  /** @deprecated Use `loading`. Kept as an alias for older components. */
  isLoading?: boolean;
  /** Row-unique field used for React keys and selection tracking. Default 'id'. */
  keyField?: string;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  /** Pagination config, or `true` for internal pagination with defaults. */
  pagination?: PaginationConfig | boolean;
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

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const IS_DEV = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

function warnOnce(warnedRef: { current: boolean }, message: string) {
  if (!IS_DEV || warnedRef.current) return;
  warnedRef.current = true;
  logger.warn(`[DataGrid] ${message}`);
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const aStr = String(a ?? '');
  const bStr = String(b ?? '');
  return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
}

// Enhanced DataGrid with sticky columns, key-based selection and working pagination
const DataGrid = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  isLoading,
  keyField = 'id',
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
  // Pagination config is normalized once, before any state that depends on it
  const paginationConfig: PaginationConfig | undefined = pagination === true ? {} : (pagination || undefined);

  const [sortState, setSortState] = useState<SortState | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(paginationConfig?.pageSize ?? DEFAULT_PAGE_SIZE);

  const isLoadingDeprecated = useRef(false);
  const keyFieldMissing = useRef(false);

  const effectiveLoading = loading || isLoading || false;
  warnOnce(isLoadingDeprecated, '`isLoading` is deprecated — pass `loading` instead.');

  // Defensive data handling: never mutate, warn in dev instead
  const safeData = useMemo(() => {
    if (Array.isArray(data)) return data;
    warnOnce(keyFieldMissing, '`data` is not an array — rendering nothing.');
    return [];
  }, [data]);

  const validatedColumns = useMemo(() => {
    if (IS_DEV) {
      const duplicates = columns
        .map(c => String(c.key))
        .filter((k, i, arr) => arr.indexOf(k) !== i);
      if (duplicates.length > 0) {
        logger.warn(`[DataGrid] Duplicate column keys: ${duplicates.join(', ')}`);
      }
    }
    return columns;
  }, [columns]);

  // Stable row keys — required for selection and reconciliation after sort/filter
  const rowKeyOf = useCallback((row: T, index: number): string => {
    const value = row?.[keyField];
    if (value !== undefined && value !== null && value !== '') return String(value);
    warnOnce(keyFieldMissing, `Rows are missing the key field '${keyField}' — falling back to index keys. Selection may misbehave after sorting.`);
    return `__idx_${index}`;
  }, [keyField]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return;

    const newDirection =
      sortState?.key === columnKey && sortState.direction === 'asc'
        ? 'desc'
        : 'asc';

    const newSortState = { key: columnKey, direction: newDirection };
    setSortState(newSortState);
    setInternalPage(1);

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
    setInternalPage(1);

    if (onFilter) {
      onFilter(newFilters);
    }
  }, [filterState, onFilter]);

  // Selection is tracked by stable row keys so it survives sorting and filtering
  const emitSelection = useCallback((next: Set<string>, pool: T[]) => {
    if (onSelectionChange) {
      const keyToRow = new Map<string, T>();
      pool.forEach((row, index) => keyToRow.set(rowKeyOf(row, index), row));
      onSelectionChange(Array.from(next).map(k => keyToRow.get(k)).filter(Boolean) as T[]);
    }
  }, [onSelectionChange, rowKeyOf]);

  const handleRowSelection = useCallback((key: string, checked: boolean) => {
    const newSelected = new Set(selectedKeys);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedKeys(newSelected);
    emitSelection(newSelected, processedDataRef.current);
  }, [selectedKeys, emitSelection]);

  const handleSelectAll = useCallback((checked: boolean) => {
    const newSelected = checked
      ? new Set(paginatedDataRef.current.map((row, index) => rowKeyOf(row, (currentPageRef.current - 1) * pageSizeRef.current + index)))
      : new Set<string>();
    setSelectedKeys(newSelected);
    emitSelection(newSelected, processedDataRef.current);
  }, [emitSelection, rowKeyOf]);

  // Process data (sorting and filtering if not handled externally)
  const processedData = useMemo(() => {
    let result = [...safeData];

    // Apply filtering if not handled externally
    if (!onFilter && Object.keys(filterState).length > 0) {
      result = result.filter(row => {
        return Object.entries(filterState).every(([key, filterValue]) => {
          const cellValue = String(row[key] ?? '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting if not handled externally
    if (!onSort && sortState) {
      result.sort((a, b) => {
        const comparison = compareValues(a[sortState.key], b[sortState.key]);
        return sortState.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [safeData, sortState, filterState, onSort, onFilter]);

  // Pagination: controlled when onPageChange is provided, internal otherwise
  const isControlledPagination = Boolean(paginationConfig?.onPageChange);
  const pageSize = isControlledPagination ? (paginationConfig?.pageSize ?? DEFAULT_PAGE_SIZE) : internalPageSize;
  const totalRows = isControlledPagination ? (paginationConfig?.total ?? safeData.length) : processedData.length;
  const currentPage = isControlledPagination ? (paginationConfig?.page ?? 1) : internalPage;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const paginatedData = useMemo(() => {
    if (!pagination || isControlledPagination) return processedData;
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [paginationConfig, isControlledPagination, processedData, currentPage, pageSize]);

  // Refs so selection handlers always see current values without stale closures
  const processedDataRef = useRef(processedData);
  processedDataRef.current = processedData;
  const paginatedDataRef = useRef(paginatedData);
  paginatedDataRef.current = paginatedData;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;

  // Drop selections for rows that no longer exist in the data
  const effectiveSelectedKeys = useMemo(() => {
    if (selectedKeys.size === 0) return selectedKeys;
    const present = new Set(processedData.map((row, index) => rowKeyOf(row, index)));
    const pruned = new Set(Array.from(selectedKeys).filter(k => present.has(k)));
    return pruned.size === selectedKeys.size ? selectedKeys : pruned;
  }, [selectedKeys, processedData, rowKeyOf]);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    if (isControlledPagination) {
      paginationConfig?.onPageChange?.(clamped);
    } else {
      setInternalPage(clamped);
    }
  }, [totalPages, isControlledPagination, paginationConfig]);

  const changePageSize = useCallback((size: number) => {
    if (isControlledPagination) {
      paginationConfig?.onPageSizeChange?.(size);
    } else {
      setInternalPageSize(size);
      setInternalPage(1);
    }
  }, [isControlledPagination, paginationConfig]);

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

  const visibleRowCount = paginatedData.length;
  const isAllSelected = visibleRowCount > 0 && paginatedData.every((row, index) => effectiveSelectedKeys.has(rowKeyOf(row, index)));
  const isIndeterminate = !isAllSelected && paginatedData.some((row, index) => effectiveSelectedKeys.has(rowKeyOf(row, index)));

  const renderEmptyState = () => {
    if (!emptyState) {
      return (
        <div className="text-gray-500">
          <div className="text-lg mb-2 flex justify-center"><TableCellsIcon className="h-6 w-6" aria-hidden="true" /></div>
          <div className="text-sm">No data available</div>
        </div>
      );
    }

    // If it's a valid React element or primitive, render it directly
    if (React.isValidElement(emptyState) || typeof emptyState === 'string' || typeof emptyState === 'number') {
      return emptyState as ReactNode;
    }

    // Otherwise, treat it as our custom object format
    const state = emptyState as any;

    let actionElement = null;
    if (state.action) {
      if (React.isValidElement(state.action)) {
        actionElement = state.action;
      } else if (typeof state.action === 'object' && state.action.label) {
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

  const columnStyle = (column: DataGridColumn<T>): React.CSSProperties => ({
    width: column.width,
    minWidth: column.minWidth
  });

return (
    <TableErrorBoundary
      tableName="DataGrid"
      fallback={<div>An error occurred while rendering the table. Please try again later.</div>}
    >
      <div className={`bg-white shadow-sm border border-gray-200 rounded-lg ${className}`} style={{ overflow: 'visible' }}>
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
              {validatedColumns.filter(col => col.filterable !== false).map((column) => (
                <div key={String(column.key)} className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {column.header}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Filter ${column.header?.toLowerCase() ?? ''}...`}
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

      {/* Table Container — ensure horizontal scroll is not clipped by parent overflow-hidden */}
      <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          className="min-w-full divide-y divide-gray-200"
          style={{ tableLayout: columns.some(c => c.width) ? 'fixed' : 'auto' }}
          aria-label="Data grid"
        >
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
                    aria-label="Select all rows"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              {validatedColumns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${
                    column.sticky === true || column.sticky === 'left' ? 'sticky left-0 bg-gray-50 z-10' :
                    column.sticky === 'right' ? 'sticky right-0 bg-gray-50 z-10' : ''
                  }`}
                  style={columnStyle(column)}
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
                <td colSpan={validatedColumns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center">
                  {loadingState || (
                    <SkeletonLoader rows={5} columns={validatedColumns.length} />
                  )}
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={validatedColumns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  {renderEmptyState()}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowKey = rowKeyOf(row, (currentPage - 1) * pageSize + rowIndex);
                return (
                  <tr
                    key={rowKey}
                    className={`hover:bg-gray-50 transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${effectiveSelectedKeys.has(rowKey) ? 'bg-blue-50' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={effectiveSelectedKeys.has(rowKey)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRowSelection(rowKey, e.target.checked);
                          }}
                          aria-label="Select row"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    {validatedColumns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                          column.align === 'center' ? 'text-center' :
                          column.align === 'right' ? 'text-right' : 'text-left'
                        } ${
                          column.sticky === true || column.sticky === 'left' ? 'sticky left-0 bg-white z-10' :
                          column.sticky === 'right' ? 'sticky right-0 bg-white z-10' : ''
                        }`}
                        style={columnStyle(column)}
                      >
                        {renderCellContent(row, column)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalRows)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{totalRows}</span> results
              </p>
              {(paginationConfig?.showSizeChanger ?? !isControlledPagination) && (
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="sr-only">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2"
                    aria-label="Rows per page"
                  >
                    {(paginationConfig?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS).map(size => (
                      <option key={size} value={size}>{size} / page</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm text-gray-700" aria-current="page">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
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

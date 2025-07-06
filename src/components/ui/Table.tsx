import React, { ReactNode } from 'react';
import Spinner from './Spinner';

interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode); // Allow accessor function for custom rendering
  render?: (item: T) => ReactNode; // Alternative render function
  className?: string; // For th/td styling
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyStateMessage?: string;
}

const Table = <T extends object,>({ columns, data, isLoading = false, emptyStateMessage = "No data available." }: TableProps<T>): React.ReactElement => {
  
  const renderCellContent = (item: T, column: TableColumn<T>): ReactNode => {
    if (column.render) {
      return column.render(item);
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    // Check if accessor is a valid key of T
    if (typeof column.accessor === 'string' && column.accessor in item) {
        const value = item[column.accessor as keyof T];
        if (typeof value === 'boolean') {
        return value ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Yes</span> : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">No</span>;
        }
        // Handle number to string conversion carefully
        if (typeof value === 'number' && !isNaN(value)) {
          return String(value);
        }
        return String(value !== undefined && value !== null ? value : '-');
    }
    
    console.warn(`Table column configuration error for header "${column.header}". Accessor "${String(column.accessor)}" is not a valid key or function, and no render method was provided.`);
    return '-'; 
  };

  const showEmptyState = !isLoading && data.length === 0;

  return (
    <div className="shadow border-b border-gray-200 sm:rounded-lg overflow-hidden">
      <div className="table-responsive">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center">
                    <Spinner size="md" />
                    <span className="ml-2 text-gray-500">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : showEmptyState ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {emptyStateMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors duration-150">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${col.className || ''}`}>
                      {renderCellContent(item, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
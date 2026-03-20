// ABOUTME: Comprehensive data validation utilities for defensive programming
// ABOUTME: Provides null/undefined checks and safe data access patterns for table rendering

import React from 'react';

/**
 * Safe data access utilities for preventing runtime errors in table rendering
 */
export class DataValidationUtils {
  /**
   * Safely access nested properties with null/undefined checks
   */
  static safeGet<T>(obj: any, path: string, defaultValue: T | null = null): T | null {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined && current !== null ? current : defaultValue;
  }

  /**
   * Ensure array is always defined and valid
   */
  static ensureArray<T>(value: T[] | null | undefined): T[] {
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  }

  /**
   * Validate module properties and provide defaults
   */
  static validateModuleData<T extends Record<string, any>>(moduleData: T | null | undefined, requiredFields: string[]): T | null {
    if (!moduleData || typeof moduleData !== 'object') {
      return null;
    }

    // Check if all required fields exist and are not null/undefined
    for (const field of requiredFields) {
      if (this.safeGet(moduleData, field) === null) {
        console.warn(`Missing required field '${field}' in module data`);
        return null;
      }
    }

    return moduleData;
  }

  /**
   * Safe string conversion with fallback
   */
  static safeString(value: any, fallback: string = ''): string {
    if (value === null || value === undefined) {
      return fallback;
    }
    return String(value);
  }

  /**
   * Safe number conversion with fallback
   */
  static safeNumber(value: any, fallback: number = 0): number {
    if (value === null || value === undefined) {
      return fallback;
    }
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Safe boolean conversion with fallback
   */
  static safeBoolean(value: any, fallback: boolean = false): boolean {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return Boolean(value);
  }

  /**
   * Validate table data before rendering
   */
  static validateTableData<T>(data: T[] | null | undefined, requiredColumns: string[]): {
    isValid: boolean;
    validData: T[];
    errors: string[];
  } {
    const errors: string[] = [];
    const validData = this.ensureArray(data);

    if (!Array.isArray(data)) {
      errors.push('Data is not an array');
    }

    if (validData.length === 0) {
      return { isValid: true, validData, errors };
    }

    // Validate each row has required columns
    const invalidRows: number[] = [];
    
    validData.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        invalidRows.push(index);
        errors.push(`Row ${index} is not a valid object`);
        return;
      }

      for (const column of requiredColumns) {
        if (this.safeGet(row, column) === null && this.safeGet(row, column) !== '') {
          // Only warn, don't invalidate the entire row
          console.warn(`Row ${index} missing value for required column '${column}'`);
        }
      }
    });

    // Filter out completely invalid rows
    const cleanedData = validData.filter((_, index) => !invalidRows.includes(index));

    return {
      isValid: errors.length === 0,
      validData: cleanedData,
      errors
    };
  }

  /**
   * Create safe render function for table cells
   */
  static createSafeRenderer<T>(renderFn: ((value: any, row: T) => React.ReactNode) | undefined) {
    return (value: any, row: T): React.ReactNode => {
      try {
        if (!renderFn) {
          return this.safeString(value, '-');
        }
        
        const result = renderFn(value, row);
        return result !== null && result !== undefined ? result : '-';
      } catch (error) {
        console.error('Error in table cell renderer:', error);
        return <span className="text-red-500 text-xs">Error</span>;
      }
    };
  }

  /**
   * Validate and clean columns configuration
   */
  static validateColumns(columns: any[] | null | undefined): any[] {
    const validColumns = this.ensureArray(columns);
    
    return validColumns.map((column, index) => {
      if (!column || typeof column !== 'object') {
        console.warn(`Column ${index} is not a valid object`);
        return {
          key: `invalid_${index}`,
          header: 'Invalid Column',
          render: () => '-'
        };
      }

      return {
        ...column,
        key: column.key || `column_${index}`,
        header: this.safeString(column.header, `Column ${index}`),
        render: this.createSafeRenderer(column.render)
      };
    });
  }

  /**
   * Create error boundary props for components
   */
  static createErrorBoundaryProps(componentName: string) {
    return {
      onError: (error: Error, errorInfo: any) => {
        console.error(`Error in ${componentName}:`, error, errorInfo);
      },
      fallback: <div className="text-red-500 p-4 border border-red-200 rounded">
        <p className="font-semibold">Error loading {componentName}</p>
        <p className="text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    };
  }
}

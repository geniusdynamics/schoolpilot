// ABOUTME: Provides shadcn-style table components used throughout the application
// ABOUTME: These components work with the existing Table component for consistent styling

import React from 'react';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={`bg-white divide-y divide-gray-200 ${className || ''}`}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${className || ''}`}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className || ''}`}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={`bg-gray-50 ${className || ''}`}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={`hover:bg-gray-50 transition-colors duration-150 ${className || ''}`}
    {...props}
  />
));
TableRow.displayName = "TableRow";

// Enhanced Table wrapper component that works with the individual components
export const TableRoot = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="shadow border-b border-gray-200 sm:rounded-lg overflow-hidden">
    <div className="table-responsive">
      <table
        ref={ref}
        className={`min-w-full divide-y divide-gray-200 ${className || ''}`}
        {...props}
      />
    </div>
  </div>
));
TableRoot.displayName = "TableRoot";

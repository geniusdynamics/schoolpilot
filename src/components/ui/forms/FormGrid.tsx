// ABOUTME: FormGrid component for responsive form field layouts
// ABOUTME: Provides flexible grid system with consistent spacing for form fields

import React, { ReactNode } from 'react';

export interface FormGridProps {
  /** Grid content (typically FormField components) */
  children: ReactNode;
  /** Number of columns (responsive: stacks on mobile) */
  columns?: 1 | 2 | 3 | 4;
  /** Gap size between grid items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Disable automatic stacking on mobile */
  noStack?: boolean;
}

/**
 * FormGrid - Responsive grid layout for form fields
 *
 * Provides a consistent grid system that automatically stacks on mobile devices.
 * Use for arranging multiple FormField components in a row.
 *
 * @example
 * // 2-column layout (stacks on mobile)
 * <FormGrid columns={2}>
 *   <FormField label="First Name">
 *     <Input {...} />
 *   </FormField>
 *   <FormField label="Last Name">
 *     <Input {...} />
 *   </FormField>
 * </FormGrid>
 *
 * @example
 * // 3-column layout with large gaps
 * <FormGrid columns={3} gap="lg">
 *   <FormField label="City">
 *     <Input {...} />
 *   </FormField>
 *   <FormField label="State">
 *     <Input {...} />
 *   </FormField>
 *   <FormField label="ZIP">
 *     <Input {...} />
 *   </FormField>
 * </FormGrid>
 *
 * @example
 * // Nested grid for complex layouts
 * <FormSection title="Address">
 *   <FormGrid columns={2}>
 *     <FormField label="Street">
 *       <Input {...} />
 *     </FormField>
 *     <FormField label="Apt/Suite">
 *       <Input {...} />
 *     </FormField>
 *   </FormGrid>
 *   <FormGrid columns={3}>
 *     <FormField label="City">
 *       <Input {...} />
 *     </FormField>
 *     <FormField label="State">
 *       <Select {...} />
 *     </FormField>
 *     <FormField label="ZIP">
 *       <Input {...} />
 *     </FormField>
 *   </FormGrid>
 * </FormSection>
 */
const FormGrid: React.FC<FormGridProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = '',
  noStack = false,
}) => {
  // Column grid classes
  const columnClasses = {
    1: noStack ? 'grid-cols-1' : 'grid-cols-1',
    2: noStack ? 'grid-cols-2' : 'grid grid-cols-1 md:grid-cols-2',
    3: noStack ? 'grid-cols-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: noStack ? 'grid-cols-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  // Gap classes — roomier vertical rhythm so labeled fields breathe
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-x-3 gap-y-3',
    md: 'gap-x-4 gap-y-5',
    lg: 'gap-x-6 gap-y-6',
  };

  return (
    <div className={`${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default FormGrid;

// ABOUTME: FormSection component for logical grouping of form fields
// ABOUTME: Provides consistent section styling with titles, descriptions, and layout options

import React, { ReactNode, useState } from 'react';
import { ChevronDownIcon } from '../icons';

export interface FormSectionProps {
  /** Section content (typically FormField or FormGrid components) */
  children: ReactNode;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Number of columns for field layout (applies FormGrid internally) */
  columns?: 1 | 2 | 3 | 4;
  /** Additional CSS classes */
  className?: string;
  /** Show border below section */
  bordered?: boolean;
  /** Allow section to be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state (only applies if collapsible is true) */
  defaultExpanded?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Force page break before this section when printing */
  pageBreak?: boolean;
  /** Icon to display next to title */
  icon?: ReactNode;
}

/**
 * FormSection - Logical grouping of form fields with consistent styling
 *
 * Provides section headers, descriptions, and responsive grid layouts for form fields.
 * Supports collapsible sections and print-optimized page breaks.
 *
 * @example
 * // Basic section with 2-column layout
 * <FormSection title="Personal Information" columns={2}>
 *   <FormField label="First Name" required>
 *     <Input {...getFieldProps('firstName')} />
 *   </FormField>
 *   <FormField label="Last Name" required>
 *     <Input {...getFieldProps('lastName')} />
 *   </FormField>
 * </FormSection>
 *
 * @example
 * // Collapsible section with description
 * <FormSection
 *   title="Advanced Settings"
 *   description="Optional configuration for advanced users"
 *   collapsible
 *   defaultExpanded={false}
 * >
 *   <FormField label="Setting">
 *     <Input {...getFieldProps('setting')} />
 *   </FormField>
 * </FormSection>
 *
 * @example
 * // Bordered sections with icons
 * <FormSection
 *   title="Contact Details"
 *   icon={<MailIcon />}
 *   bordered
 *   columns={2}
 * >
 *   {/* Fields *\/}
 * </FormSection>
 */
const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  description,
  columns = 1,
  className = '',
  bordered = false,
  collapsible = false,
  defaultExpanded = true,
  size = 'md',
  pageBreak = false,
  icon,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Size styles
  const sizeStyles = {
    sm: {
      section: 'space-y-3',
      title: 'text-sm font-semibold',
      description: 'text-xs',
      content: 'space-y-3',
    },
    md: {
      section: 'space-y-4',
      title: 'text-sm font-semibold text-surface-foreground',
      description: 'text-sm text-surface-muted-fg mt-0.5',
      content: 'space-y-4',
    },
    lg: {
      section: 'space-y-6',
      title: 'text-base font-semibold text-surface-foreground',
      description: 'text-sm text-surface-muted-fg mt-0.5',
      content: 'space-y-5',
    },
  };

  // Column grid classes
  const gridClasses = {
    1: '',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5',
  };

  const currentSize = sizeStyles[size];

  // Toggle handler for collapsible sections
  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`
        ${currentSize.section}
        ${bordered ? 'border-b border-surface-border pb-6 mb-6' : ''}
        ${pageBreak ? 'print:break-before-page' : ''}
        print:break-inside-avoid
        ${className}
      `}
    >
      {/* Section Header */}
      {(title || description) && (
        <div
          className={`
            ${collapsible ? 'cursor-pointer select-none' : ''}
            ${collapsible ? 'flex items-center justify-between' : ''}
          `}
          onClick={handleToggle}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={(e) => {
            if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleToggle();
            }
          }}
          aria-expanded={collapsible ? isExpanded : undefined}
        >
          <div className="flex items-center gap-2">
            {icon && (
              <span className="flex-shrink-0 text-surface-muted-fg">
                {icon}
              </span>
            )}
            <div>
              {title && (
                <h3 className={currentSize.title}>
                  {title}
                </h3>
              )}
              {description && (
                <p className={currentSize.description}>
                  {description}
                </p>
              )}
            </div>
          </div>

          {collapsible && (
            <ChevronDownIcon
              className={`
                w-5 h-5 text-surface-muted-fg transition-transform duration-200
                ${isExpanded ? 'transform rotate-180' : ''}
              `}
            />
          )}
        </div>
      )}

      {/* Section Content */}
      <div
        className={`
          ${collapsible && !isExpanded ? 'hidden' : ''}
          ${title || description ? 'mt-4' : ''}
        `}
      >
        {columns > 1 ? (
          <div className={gridClasses[columns]}>
            {children}
          </div>
        ) : (
          <div className={currentSize.content}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormSection;

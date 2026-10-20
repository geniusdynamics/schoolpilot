// ABOUTME: FormField wrapper component for consistent field layouts and validation states
// ABOUTME: Provides standardized spacing, labels, help text, and error handling

import React, { ReactNode } from 'react';
import { getFormFieldIds, createAriaDescribedBy } from '../../../utils/accessibility';

export interface FormFieldProps {
  children: ReactNode;
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  required?: boolean;
  optional?: boolean;
  className?: string;
  labelClassName?: string;
  fieldId?: string;
  layout?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
}

const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  helperText,
  error,
  success = false,
  required = false,
  optional = false,
  className = '',
  labelClassName = '',
  fieldId,
  layout = 'vertical',
  size = 'md',
}) => {
  const fieldIds = getFormFieldIds(fieldId || 'field');

  // Size variants
  const sizeStyles = {
    sm: {
      spacing: 'space-y-1',
      label: 'text-xs font-medium',
      helper: 'text-xs',
      error: 'text-xs',
    },
    md: {
      spacing: 'space-y-1.5',
      label: 'text-sm font-medium',
      helper: 'text-xs',
      error: 'text-xs',
    },
    lg: {
      spacing: 'space-y-2',
      label: 'text-sm font-medium',
      helper: 'text-xs',
      error: 'text-xs',
    },
  };
  
  // Layout variants
  const layoutStyles = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row items-start gap-4',
  };
  
  const currentSize = sizeStyles[size];
  const currentLayout = layoutStyles[layout];
  
  // State-based label colors
  const getLabelColor = () => {
    if (error) return 'text-red-600 dark:text-red-400';
    if (success) return 'text-green-600 dark:text-green-400';
    return 'text-surface-foreground';
  };
  
  // Success icon component
  const SuccessIcon = () => (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
  
  // Error icon component
  const ErrorIcon = () => (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  
  const describedBy = createAriaDescribedBy([
    helperText ? fieldIds.description : undefined,
    error ? fieldIds.error : undefined,
  ]);
  
  // Clone children to add ARIA attributes
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        id: fieldIds.field,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
        ...(child.props as Record<string, unknown>),
      });
    }
    return child;
  });
  
  return (
    <div className={`${currentLayout} ${currentSize.spacing} ${className}`}>
      {/* Label section */}
      {label && (
        <div className={layout === 'horizontal' ? 'flex-shrink-0 w-32' : ''}>
          <label
            htmlFor={fieldIds.field}
            className={`
              block ${currentSize.label} ${getLabelColor()}
              ${labelClassName}
            `}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-0.5" aria-label="required">
                *
              </span>
            )}
            {optional && (
              <span className="text-surface-muted-fg ml-1 font-normal">
                (optional)
              </span>
            )}
          </label>
        </div>
      )}

      {/* Field section */}
      <div className="flex-1 min-w-0">
        {/* Input field */}
        <div className="relative">
          {enhancedChildren}
        </div>

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={fieldIds.description}
            className={`mt-1.5 ${currentSize.helper} text-surface-muted-fg`}
          >
            {helperText}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p className={`mt-1.5 ${currentSize.helper} text-green-600 dark:text-green-400 flex items-center gap-1`}>
            <SuccessIcon />
            Field is valid
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={fieldIds.error}
            className={`mt-1.5 ${currentSize.error} text-red-600 dark:text-red-400 font-medium flex items-center gap-1`}
            role="alert"
          >
            <ErrorIcon />
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default FormField;
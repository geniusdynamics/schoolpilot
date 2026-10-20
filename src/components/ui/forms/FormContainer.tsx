// ABOUTME: FormContainer component - base wrapper for all form types
// ABOUTME: Provides consistent structure, padding, and layout for forms

import React, { ReactNode, forwardRef } from 'react';

export type FormType = 'default' | 'dialog' | 'slideout' | 'tabbed' | 'wizard' | 'minimal' | 'print';

export interface FormContainerProps {
  /** Form content */
  children: ReactNode;
  /** Form type variant */
  type?: FormType;
  /** Additional CSS classes */
  className?: string;
  /** Form size (affects max-width and padding) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Form ID for form element */
  formId?: string;
  /** Form submission handler */
  onSubmit?: (event: React.FormEvent) => void;
  /** Form name attribute */
  name?: string;
  /** Enable auto-complete */
  autoComplete?: 'on' | 'off';
  /** Disable form (adds disabled attribute and visual styling) */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Make form content scrollable */
  scrollable?: boolean;
  /** Max height for scrollable content */
  maxHeight?: string;
  /** Form aria-label */
  ariaLabel?: string;
}

/**
 * FormContainer - Base wrapper component for all form types
 *
 * Provides consistent structure, styling, and accessibility attributes.
 * Use as the root element for any form, then compose with FormHeader,
 * FormSection, FormGrid, and FormActions.
 *
 * @example
 * // Basic form structure
 * <FormContainer onSubmit={handleSubmit}>
 *   <FormHeader title="New Student" />
 *   <FormSection title="Personal Info" columns={2}>
 *     <FormField label="First Name">
 *       <Input {...} />
 *     </FormField>
 *     <FormField label="Last Name">
 *       <Input {...} />
 *     </FormField>
 *   </FormSection>
 *   <FormActions>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Save</Button>
 *   </FormActions>
 * </FormContainer>
 *
 * @example
 * // Scrollable form with max height
 * <FormContainer scrollable maxHeight="60vh">
 *   {/* Long form content *\/}
 * </FormContainer>
 */
const FormContainer = forwardRef<HTMLFormElement, FormContainerProps>(({
  children,
  type = 'default',
  className = '',
  size = 'md',
  formId,
  onSubmit,
  name,
  autoComplete = 'on',
  disabled = false,
  loading = false,
  scrollable = false,
  maxHeight,
  ariaLabel,
}, ref) => {
  // Size styles (affects padding)
  const sizeStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
    full: 'p-6',
  };

  // Type-specific styles
  const typeStyles = {
    default: '',
    // Dialogs render inside Modal's padded body — don't add a second layer
    dialog: 'max-h-full',
    slideout: 'h-full flex flex-col',
    tabbed: 'flex flex-col h-full',
    wizard: 'flex flex-col h-full',
    minimal: '',
    print: 'print:p-0',
  };

  // Dialogs/minimal never add their own padding
  const paddingClass = type === 'dialog' || type === 'minimal' ? '' : sizeStyles[size];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!disabled && !loading && onSubmit) {
      onSubmit(event);
    }
  };

  return (
    <form
      ref={ref}
      id={formId}
      name={name}
      className={`
        flex flex-col relative
        ${paddingClass}
        ${typeStyles[type]}
        ${scrollable ? 'overflow-y-auto flex-1' : ''}
        ${disabled ? 'opacity-60 pointer-events-none' : ''}
        ${className}
      `}
      style={scrollable && maxHeight ? { maxHeight } : undefined}
      onSubmit={handleSubmit}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading && (
        <div className="absolute inset-0 bg-surface-card flex items-center justify-center z-10 rounded-b-2xl">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-surface-border border-t-primary-600" />
        </div>
      )}
      {children}
    </form>
  );
});

FormContainer.displayName = 'FormContainer';

export default FormContainer;

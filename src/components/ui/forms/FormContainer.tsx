// ABOUTME: FormContainer component - base wrapper for all form types
// ABOUTME: Provides consistent structure, padding, and layout for forms

import React, { ReactNode, forwardRef } from 'react';
import { useTransition } from '../../../utils/animations';

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
  const transitionStyles = useTransition(['all']);

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
    dialog: 'max-h-full',
    slideout: 'h-full flex flex-col',
    tabbed: 'flex flex-col h-full',
    wizard: 'flex flex-col h-full',
    minimal: 'p-0',
    print: 'print:p-0',
  };

  // Scrollable content styles
  const scrollStyles = scrollable
    ? `overflow-y-auto ${maxHeight ? `max-h-[${maxHeight}]` : 'flex-1'}`
    : '';

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
        flex flex-col
        ${sizeStyles[size]}
        ${typeStyles[type]}
        ${scrollStyles}
        ${disabled ? 'opacity-60 pointer-events-none' : ''}
        ${className}
      `}
      onSubmit={handleSubmit}
      autoComplete={autoComplete}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      style={transitionStyles}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      {children}
    </form>
  );
});

FormContainer.displayName = 'FormContainer';

export default FormContainer;

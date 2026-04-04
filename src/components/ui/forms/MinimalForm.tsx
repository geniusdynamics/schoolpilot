// ABOUTME: MinimalForm component for clean, simple forms
// ABOUTME: Provides minimal chrome form layout for login, search, and quick forms

import React, { ReactNode, forwardRef, useImperativeHandle, useRef } from 'react';
import FormContainer, { FormContainerProps } from './FormContainer';
import { useTransition } from '../../../utils/animations';

export interface MinimalFormProps extends Omit<FormContainerProps, 'type'> {
  /** Form content */
  children: ReactNode;
  /** Form title (optional) */
  title?: string;
  /** Form description (optional) */
  description?: string;
  /** Show form actions at bottom */
  showActions?: boolean;
  /** Form actions content (typically buttons) */
  actions?: ReactNode;
  /** Center the form on the page */
  centered?: boolean;
  /** Max width constraint */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Card-like appearance with shadow and border */
  card?: boolean;
  /** Subtle background */
  background?: boolean;
}

export interface MinimalFormRef {
  /** Reference to the form element */
  form: HTMLFormElement | null;
  /** Submit the form programmatically */
  submit: () => void;
  /** Reset the form */
  reset: () => void;
}

/**
 * MinimalForm - Clean, simple form component with minimal chrome
 *
 * Ideal for login forms, search forms, quick filters, and other
 * simple data entry scenarios. Minimal styling with focus on content.
 *
 * @example
 * // Login form
 * <MinimalForm
 *   title="Sign In"
 *   centered
 *   card
 *   onSubmit={handleLogin}
 * >
 *   <FormField label="Email" required>
 *     <Input type="email" {...} />
 *   </FormField>
 *   <FormField label="Password" required>
 *     <Input type="password" {...} />
 *   </FormField>
 *   <FormActions>
 *     <Button variant="primary" type="submit" fullWidth>Sign In</Button>
 *   </FormActions>
 * </MinimalForm>
 *
 * @example
 * // Search form
 * <MinimalForm background onSubmit={handleSearch}>
 *   <FormGrid columns={4}>
 *     <FormField label="Search">
 *       <Input placeholder="Enter keywords..." {...} />
 *     </FormField>
 *     <FormField label="Category">
 *       <Select {...} />
 *     </FormField>
 *     <FormField label="Date Range">
 *       <DatePicker {...} />
 *     </FormField>
 *     <div className="flex items-end gap-2">
 *       <Button type="submit">Search</Button>
 *       <Button variant="ghost" type="reset">Clear</Button>
 *     </div>
 *   </FormGrid>
 * </MinimalForm>
 */
const MinimalForm = forwardRef<MinimalFormRef, MinimalFormProps>(({
  children,
  title,
  description,
  showActions = true,
  actions,
  centered = false,
  maxWidth = 'md',
  card = false,
  background = false,
  onSubmit,
  className = '',
  ...formProps
}, ref) => {
  const formRef = useRef<HTMLFormElement>(null);
  const transitionStyles = useTransition(['all']);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    form: formRef.current,
    submit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
    reset: () => {
      if (formRef.current) {
        formRef.current.reset();
      }
    },
  }));

  // Max width classes
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  // Container classes
  const containerClasses = [
    centered ? 'flex items-center justify-center min-h-full' : '',
    background ? 'bg-gray-50 rounded-lg' : '',
  ].filter(Boolean).join(' ');

  // Form wrapper classes
  const formWrapperClasses = [
    card ? 'bg-white rounded-xl shadow-sm border border-gray-200' : '',
    maxWidthClasses[maxWidth],
    card ? 'p-6' : '',
    centered ? 'w-full' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={formWrapperClasses}>
        {/* Title and description */}
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <FormContainer
          ref={formRef}
          type="minimal"
          onSubmit={onSubmit}
          className={`space-y-4 ${className}`}
          {...formProps}
          style={{ ...transitionStyles, ...formProps.style }}
        >
          {children}

          {/* Actions */}
          {showActions && actions && (
            <div className="pt-4">
              {actions}
            </div>
          )}
        </FormContainer>
      </div>
    </div>
  );
});

MinimalForm.displayName = 'MinimalForm';

export default MinimalForm;

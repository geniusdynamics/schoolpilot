// ABOUTME: FormActions component for consistent right-aligned button positioning
// ABOUTME: Provides standardized form action container with responsive behavior

import React, { ReactNode } from 'react';

export interface FormActionsProps {
  /** Button elements or other action content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Stick to bottom of form container on scroll */
  sticky?: boolean;
  /** Show top border divider */
  divider?: boolean;
  /** Background variant */
  background?: 'default' | 'transparent' | 'filled';
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Mobile behavior: stack buttons vertically */
  stackOnMobile?: boolean;
  /** Align actions to the left instead of right (for special cases like navigation) */
  align?: 'right' | 'left' | 'center' | 'between';
}

/**
 * FormActions - Standardized right-aligned button container for forms
 *
 * This component ensures consistent button positioning across all form types.
 * By default, buttons are right-aligned with proper spacing and responsive behavior.
 *
 * @example
 * // Standard usage with right-aligned buttons
 * <FormActions>
 *   <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
 *   <Button variant="primary" onClick={handleSubmit}>Save</Button>
 * </FormActions>
 *
 * @example
 * // Sticky footer with divider
 * <FormActions sticky divider>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="primary">Submit</Button>
 * </FormActions>
 *
 * @example
 * // With navigation buttons (left) and actions (right)
 * <FormActions align="between">
 *   <Button variant="ghost" leftIcon={<ArrowLeftIcon />}>Previous</Button>
 *   <div className="flex gap-3">
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Next</Button>
 *   </div>
 * </FormActions>
 */
const FormActions: React.FC<FormActionsProps> = ({
  children,
  className = '',
  sticky = false,
  divider = true,
  background = 'default',
  padding = 'md',
  stackOnMobile = true,
  align = 'right',
}) => {
  // Alignment styles
  const alignmentStyles = {
    right: 'justify-end',
    left: 'justify-start',
    center: 'justify-center',
    between: 'justify-between',
  };

  // Background styles
  const backgroundStyles = {
    default: 'bg-surface-muted',
    transparent: 'bg-transparent',
    filled: 'bg-surface-card',
  };

  // Padding styles
  const paddingStyles = {
    sm: 'px-4 py-3',
    md: 'px-6 py-4',
    lg: 'px-8 py-5',
  };

  // Base classes
  const baseClasses = [
    'flex items-center gap-3',
    alignmentStyles[align],
    backgroundStyles[background],
    paddingStyles[padding],
    divider ? 'border-t border-surface-border' : '',
    sticky ? 'sticky bottom-0 z-10' : '',
    'print:hidden', // Hide in print mode
  ].filter(Boolean).join(' ');

  // Mobile stacking classes
  const mobileClasses = stackOnMobile
    ? 'flex-col-reverse sm:flex-row sm:gap-3 gap-2 w-full sm:w-auto'
    : '';

  return (
    <div
      className={`${baseClasses} ${mobileClasses} ${className}`}
      role="group"
      aria-label="Form actions"
    >
      {children}
    </div>
  );
};

export default FormActions;

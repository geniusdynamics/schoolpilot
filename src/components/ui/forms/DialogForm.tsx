// ABOUTME: DialogForm component for modal/popup forms
// ABOUTME: Combines Modal with FormContainer for consistent popup form patterns

import React, { ReactNode, useRef, useImperativeHandle, forwardRef } from 'react';
import Modal, { ModalProps } from '../Modal';
import FormContainer, { FormContainerProps } from './FormContainer';
import FormHeader, { FormHeaderProps } from './FormHeader';

export interface DialogFormProps extends Omit<ModalProps, 'children' | 'isOpen' | 'footer'> {
  /** Form content (FormSection, FormGrid, FormField, etc.) */
  children: ReactNode;
  /** Controls visibility (canonical). */
  isOpen?: boolean;
  /** Alias for `isOpen`, accepted for call-site ergonomics. */
  open?: boolean;
  /** Footer content (buttons/links) rendered in the modal footer. */
  actions?: ReactNode;
  /** Footer content; alias-compatible with `Modal.footer`. Takes precedence over `actions`. */
  footer?: ReactNode;
  /** Form description (displayed below title) */
  description?: string;
  /** Progress percentage for multi-step forms */
  progress?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Step label (e.g., "Step 2 of 5") */
  stepLabel?: string;
  /** Icon to display next to title */
  icon?: ReactNode;
  /** Badge or status indicator */
  badge?: ReactNode;
  /** Form submission handler */
  onSubmit?: (event: React.FormEvent) => void;
  /** Form container props */
  formProps?: Partial<FormContainerProps>;
  /** Form header props */
  headerProps?: Partial<FormHeaderProps>;
  /** Auto-save status */
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  /** Last saved timestamp */
  lastSaved?: Date | null;
  /** Content area padding */
  contentPadding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface DialogFormRef {
  /** Reference to the form element */
  form: HTMLFormElement | null;
  /** Reference to the modal element */
  modal: HTMLDivElement | null;
  /** Submit the form programmatically */
  submit: () => void;
  /** Reset the form */
  reset: () => void;
}

/**
 * DialogForm - Modal form component with consistent structure
 *
 * A complete form solution for popup/modal forms. Combines Modal with
 * FormContainer and provides FormHeader for titles and progress.
 *
 * @example
 * // Basic dialog form
 * <DialogForm
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Add New Student"
 *   onSubmit={handleSubmit}
 * >
 *   <FormSection title="Personal Information" columns={2}>
 *     <FormField label="First Name" required>
 *       <Input {...getFieldProps('firstName')} />
 *     </FormField>
 *     <FormField label="Last Name" required>
 *       <Input {...getFieldProps('lastName')} />
 *     </FormField>
 *   </FormSection>
 *   <FormActions>
 *     <Button variant="secondary" onClick={handleClose}>Cancel</Button>
 *     <Button variant="primary" type="submit">Save</Button>
 *   </FormActions>
 * </DialogForm>
 *
 * @example
 * // With progress indicator
 * <DialogForm
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Application Form"
 *   progress={60}
 *   showProgress
 *   stepLabel="Step 3 of 5"
 * >
 *   {/* Form content *\/}
 * </DialogForm>
 */
const DialogForm = forwardRef<DialogFormRef, DialogFormProps>(({
  children,
  title,
  description,
  progress,
  showProgress = false,
  stepLabel,
  icon,
  badge,
  onSubmit,
  formProps = {},
  headerProps = {},
  autoSaveStatus = 'idle',
  lastSaved,
  contentPadding = 'none',
  size = 'md',
  loading,
  preventClose,
  isOpen,
  open,
  actions,
  footer,
  ...modalProps
}, ref) => {
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    form: formRef.current,
    modal: modalRef.current,
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

  // Content padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Size to max-width mapping for forms
  const formSizeMap = {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    full: 'full',
  } as const;

  return (
    <Modal
      {...modalProps}
      isOpen={isOpen ?? open ?? false}
      footer={footer ?? actions}
      title={title}
      size={size}
      loading={loading}
      preventClose={preventClose}
      ref={modalRef}
    >
      <FormContainer
        ref={formRef}
        type="dialog"
        size={formSizeMap[size]}
        onSubmit={onSubmit}
        {...formProps}
      >
        {/* Form Header */}
        {(title || description || showProgress) && (
          <FormHeader
            title={title}
            description={description}
            progress={progress}
            showProgress={showProgress}
            stepLabel={stepLabel}
            icon={icon}
            badge={badge}
            autoSaveStatus={autoSaveStatus}
            lastSaved={lastSaved}
            {...headerProps}
          />
        )}

        {/* Form Content */}
        <div className={`
          ${paddingStyles[contentPadding]}
          ${title || description ? 'mt-4' : ''}
        `}>
          {children}
        </div>
      </FormContainer>
    </Modal>
  );
});

DialogForm.displayName = 'DialogForm';

export default DialogForm;

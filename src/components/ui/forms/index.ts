// ABOUTME: Form components exports for the SchoolPilot3 design system
// ABOUTME: Centralized exports for form-related UI components

// Existing components
export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as TabbedForm } from './TabbedForm';
export type { TabbedFormProps, FormTab } from './TabbedForm';

export { default as SlideoutForm } from './SlideoutForm';
export type { SlideoutFormProps } from './SlideoutForm';

export { default as DatePicker } from './DatePicker';

// New foundation components
export { default as FormContainer } from './FormContainer';
export type { FormContainerProps, FormType } from './FormContainer';

export { default as FormActions } from './FormActions';
export type { FormActionsProps } from './FormActions';

export { default as FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';

export { default as FormGrid } from './FormGrid';
export type { FormGridProps } from './FormGrid';

export { default as FormHeader } from './FormHeader';
export type { FormHeaderProps } from './FormHeader';

// New form type components
export { default as DialogForm } from './DialogForm';
export type { DialogFormProps, DialogFormRef } from './DialogForm';

export { default as WizardForm } from './WizardForm';
export type { WizardFormProps, WizardFormRef, WizardStep } from './WizardForm';

export { default as MinimalForm } from './MinimalForm';
export type { MinimalFormProps, MinimalFormRef } from './MinimalForm';

export { default as PrintForm } from './PrintForm';
export type { PrintFormProps, PrintFormRef, PrintFormField } from './PrintForm';

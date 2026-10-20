// ABOUTME: Form components exports for the SchoolPilot3 design system
// ABOUTME: Centralized exports for form-related UI components

// Existing components
export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as TabbedForm } from './TabbedForm';
export type { TabbedFormProps, FormTab } from './TabbedForm';

export { default as DatePicker } from './DatePicker';
export { default as DateField } from './DateField';
export type { DateFieldProps } from './DateField';

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

export { default as EntityForm } from './EntityForm';
export type { EntityFormProps, EntityFieldConfig, EntityFormFieldType } from './EntityForm';

// Schema-bound form (P1-D02): validation runs the entity's own zod schema.
export { default as SchemaEntityForm } from './SchemaEntityForm';
export type { SchemaEntityFormProps } from './SchemaEntityForm';
export { validateEntityForm } from './validation';
export type { EntityFormValidation } from './validation';
export {
  fieldControlId,
  getValueAtPath,
  groupFields,
  mapIssuesToFields,
  orderFields,
  resolveFieldOptions,
  resolveFieldRequired,
  resolveFieldWidget,
  setValueAtPath,
  stableFormValue,
} from './fieldTypes';
export type {
  EntityFormFieldMeta,
  EntityFormLookup,
  EntityFormSection,
  EntityLookupRow,
  FieldOption,
  FieldWidget,
} from './fieldTypes';

export { FieldFrame, useFieldId } from './FieldFrame';
export { TextField, TextareaField } from './TextField';
export { default as SelectField } from './SelectField';
export { default as CheckboxField } from './CheckboxField';
export { default as MoneyField, formatMinorUnits, parseMoneyInput } from './MoneyField';
export type { MoneyFieldProps, MoneyParseOptions, MoneyParseResult } from './MoneyField';
export { default as PhoneField, dialCodeForCountry, normalisePhone } from './PhoneField';
export type { PhoneFieldProps, PhoneParseOptions, PhoneParseResult } from './PhoneField';
export { default as IdentifierField } from './IdentifierField';
export type { IdentifierFieldProps, IdentifierValue } from './IdentifierField';
export { default as EntityField } from './EntityField';
export type { EntityFieldProps } from './EntityField';
export {
  createFieldWidgetRegistry,
  defaultFieldWidgets,
} from './fieldRegistry';
export type {
  FieldWidgetProps,
  FieldWidgetRegistry,
  FieldWidgetRenderer,
} from './fieldRegistry';

export { default as WizardForm } from './WizardForm';
export type { WizardFormProps, WizardFormRef, WizardStep } from './WizardForm';

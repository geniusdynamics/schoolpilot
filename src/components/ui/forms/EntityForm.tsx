// ABOUTME: Schema-driven entity form — the canonical create/edit dialog for list pages.
// ABOUTME: Renders a DialogForm from a declarative field config with inline validation,
// ABOUTME: submit-in-progress handling and success/error toasts. See docs/contributing/forms.md.

import React, { useCallback, useEffect, useState } from 'react';
import DialogForm from './DialogForm';
import { FormSection, FormGrid, FormField, FormActions } from './index';
import Input from '../Input';
import Textarea from '../Textarea';
import Select from '../Select';
import Checkbox from '../Checkbox';
import { RadioGroup } from '../Radio';
import Switch from '../Switch';
import Button from '../Button';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

export type EntityFormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'switch';

/** Declarative field configuration for EntityForm. */
export interface EntityFieldConfig {
  /** Field name in the entity object. */
  name: string;
  label: string;
  type?: EntityFormFieldType;
  required?: boolean;
  /**
   * Per-field rule returning an error message, or null/undefined when valid.
   * Runs on blur and on submit; `required` is checked automatically.
   */
  validate?: (value: any, formData: Record<string, any>) => string | null | undefined;
  /** Options for type='select' (values are stringified internally). */
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  helperText?: string;
  /** Grid columns the field spans (1 = half width in a 2-col section). Default 1. */
  colSpan?: 1 | 2;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

export interface EntityFormProps {
  fields: EntityFieldConfig[];
  /** Values seeded into the form when it opens (edit mode passes the entity). */
  initialData?: Record<string, any>;
  /** Async save handler; throw to surface a generic error toast. */
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  /** Extra content rendered after the fields (e.g. nested sections). */
  children?: React.ReactNode;
}

const EMPTY_DATA: Record<string, any> = {};

/**
 * EntityForm — schema-driven modal form for creating/updating entities.
 *
 * @example
 * <EntityForm
 *   isOpen={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   title={editing ? 'Edit Subject' : 'Add Subject'}
 *   initialData={editing ?? undefined}
 *   fields={[
 *     { name: 'name', label: t('subjects.name'), required: true },
 *     { name: 'subject_code', label: t('subjects.code'), required: true },
 *     { name: 'is_compulsory', label: t('subjects.isCompulsory'), type: 'checkbox' },
 *   ]}
 *   onSubmit={handleSave}
 * />
 */
const EntityForm: React.FC<EntityFormProps> = ({
  fields,
  initialData = EMPTY_DATA,
  onSubmit,
  isOpen,
  onClose,
  title,
  description,
  submitLabel,
  cancelLabel,
  children,
}) => {
  const { t } = useTranslation(['common']);
  const toast = useToast();

  const [values, setValues] = useState<Record<string, any>>(EMPTY_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Re-seed local state whenever the dialog opens (fresh add / switched edit target)
  useEffect(() => {
    if (isOpen) {
      setValues({ ...initialData });
      setErrors({});
      setTouched({});
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const validateField = useCallback(
    (field: EntityFieldConfig, value: any, allValues: Record<string, any>): string | null => {
      if (field.required) {
        const empty =
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '');
        if (empty) return `${field.label} is required`;
      }
      const customError = field.validate?.(value, allValues);
      return customError || null;
    },
    []
  );

  const validateAll = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};
    fields.forEach(field => {
      const error = validateField(field, values[field.name], values);
      if (error) nextErrors[field.name] = error;
    });
    setErrors(nextErrors);
    setTouched(Object.fromEntries(fields.map(f => [f.name, true])));
    return Object.keys(nextErrors).length === 0;
  }, [fields, validateField, values]);

  const handleChange = useCallback((field: EntityFieldConfig, value: any) => {
    setValues(prev => ({ ...prev, [field.name]: value }));
    setSubmitError(null);
    // Clear error as soon as the value becomes valid again
    setErrors(prev => {
      if (!prev[field.name]) return prev;
      const error = validateField(field, value, { ...values, [field.name]: value });
      if (!error) {
        const next = { ...prev };
        delete next[field.name];
        return next;
      }
      return prev;
    });
  }, [validateField, values]);

  const handleBlur = useCallback((field: EntityFieldConfig) => {
    setTouched(prev => ({ ...prev, [field.name]: true }));
    setErrors(prev => {
      const error = validateField(field, values[field.name], values);
      if (error) return { ...prev, [field.name]: error };
      if (!prev[field.name]) return prev;
      const next = { ...prev };
      delete next[field.name];
      return next;
    });
  }, [validateField, values]);

  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isSaving) return;

    if (!validateAll()) return;

    setIsSaving(true);
    try {
      await onSubmit(values);
      toast.showSuccess(title.includes(t('common:edit', 'Edit')) ? t('common:updated', 'Updated successfully') : t('common:created', 'Created successfully'));
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      setSubmitError(message || t('common:saveError', 'Failed to save. Please try again.'));
      toast.showError(message || t('common:saveError', 'Failed to save. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, validateAll, onSubmit, values, toast, title, onClose, t]);

  const renderField = (field: EntityFieldConfig) => {
    const error = touched[field.name] ? errors[field.name] : undefined;
    const value = values[field.name];
    const controlFieldId = `entity-form-${field.name}`;
    const commonProps = {
      disabled: field.disabled || isSaving,
      placeholder: field.placeholder,
    };

    let control: React.ReactNode;
    switch (field.type) {
      case 'select':
        control = (
          <Select
            {...commonProps}
            name={field.name}
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => handleChange(field, e.target.value)}
            errorState={Boolean(error)}
          >
            <option value="">{field.placeholder ?? 'Select an option…'}</option>
            {(field.options ?? []).map(option => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
        );
        break;
      case 'textarea':
        control = (
          <Textarea
            {...commonProps}
            value={value ?? ''}
            onChange={(e) => handleChange(field, e.target.value)}
            onBlur={() => handleBlur(field)}
            rows={field.rows ?? 3}
            errorState={Boolean(error)}
          />
        );
        break;
      case 'checkbox': {
        control = (
          <div className="pt-2">
            <Checkbox
              checked={Boolean(value)}
              onChange={(checked) => handleChange(field, checked)}
              disabled={field.disabled || isSaving}
              error={Boolean(error)}
            >
              {field.label}
            </Checkbox>
          </div>
        );
        break;
      }
      case 'switch': {
        control = (
          <div className="pt-2">
            <Switch
              checked={Boolean(value)}
              onChange={(checked) => handleChange(field, checked)}
              disabled={field.disabled || isSaving}
              aria-label={field.label}
            />
          </div>
        );
        break;
      }
      case 'radio': {
        control = (
          <RadioGroup
            name={`entity-form-${field.name}`}
            value={value !== undefined && value !== null ? String(value) : undefined}
            onChange={(nextValue) => handleChange(field, nextValue)}
            options={(field.options ?? []).map(option => ({
              value: String(option.value),
              label: option.label,
            }))}
            errorState={Boolean(error)}
            disabled={field.disabled || isSaving}
          />
        );
        break;
      }
      default:
        control = (
          <Input
            {...commonProps}
            type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : field.type === 'password' ? 'password' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type === 'email' ? 'email' : 'text'}
            value={value ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(field, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
            }
            onBlur={() => handleBlur(field)}
            min={field.min}
            max={field.max}
            step={field.step}
            errorState={Boolean(error)}
          />
        );
    }

    return (
      <FormField
        key={field.name}
        fieldId={controlFieldId}
        label={field.type === 'checkbox' || field.type === 'switch' ? undefined : field.label}
        helperText={field.helperText}
        error={error}
        required={field.required}
        className={field.colSpan === 2 ? 'md:col-span-2' : ''}
      >
        {control}
      </FormField>
    );
  };

  const hasVisibleErrors = Object.keys(errors).some(name => errors[name]);

  return (
    <DialogForm
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      preventClose={isSaving}
      onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
      size="lg"
    >
      <FormSection>
        <FormGrid columns={2}>
          {fields.map(renderField)}
        </FormGrid>
        {children}
      </FormSection>

      {hasVisibleErrors && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t('common:fixErrorsBelow', 'Please fix the highlighted fields before saving.')}
        </p>
      )}
      {submitError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {submitError}
        </p>
      )}

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          {cancelLabel ?? t('common:cancel', 'Cancel')}
        </Button>
        <Button variant="primary" type="submit" loading={isSaving} disabled={isSaving}>
          {submitLabel ?? t('common:save', 'Save')}
        </Button>
      </FormActions>
    </DialogForm>
  );
};

export default EntityForm;

// ABOUTME: Single canonical validation module — schema-driven CRUD validation plus
// ABOUTME: a realtime field-level hook (merged from the former useFormValidation.tsx).

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logging';
import { announceToScreenReader } from '@/utils/accessibility';

// ============================================================================
// Schema-driven validation (canonical API)
// ============================================================================

export type ValidationRule<T> = {
  field: keyof T;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  unique?: boolean;
  custom?: (value: any, data: Partial<T>) => boolean | string;
  message?: string;
};

export type ValidationSchema<T> = ValidationRule<T>[];

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * One-shot schema validation for CRUD operations. Stateless apart from i18n —
 * safe to call inside event handlers and submit paths.
 */
export function useValidation<T extends Record<string, any>>() {
  const { t } = useTranslation();

  const validate = useCallback((
    data: Partial<T>,
    schema: ValidationSchema<T>,
    existingItems: T[] = []
  ): ValidationResult => {
    const errors: ValidationError[] = [];

    for (const rule of schema) {
      const value = data[rule.field];
      const fieldName = String(rule.field);

      // Required check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.required', { field: fieldName })
        });
        continue;
      }

      // Skip other validations if value is empty and not required
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Min length check
      if (rule.minLength !== undefined && String(value).length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.minLength', { field: fieldName, min: rule.minLength })
        });
      }

      // Max length check
      if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.maxLength', { field: fieldName, max: rule.maxLength })
        });
      }

      // Min value check (for numbers)
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.min', { field: fieldName, min: rule.min })
        });
      }

      // Max value check (for numbers)
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.max', { field: fieldName, max: rule.max })
        });
      }

      // Pattern check
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.pattern', { field: fieldName })
        });
      }

      // Email check
      if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        errors.push({
          field: fieldName,
          message: rule.message || t('validation.email', { field: fieldName })
        });
      }

      // Unique check
      if (rule.unique && existingItems.length > 0) {
        const isDuplicate = existingItems.some(
          item => item[rule.field] === value && (data as any).id !== item.id
        );
        if (isDuplicate) {
          errors.push({
            field: fieldName,
            message: rule.message || t('validation.unique', { field: fieldName })
          });
        }
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value, data);
        if (result !== true) {
          errors.push({
            field: fieldName,
            message: typeof result === 'string' ? result : (rule.message || t('validation.invalid', { field: fieldName }))
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, [t]);

  const validateRequired = useCallback((
    data: Partial<T>,
    requiredFields: (keyof T)[]
  ): ValidationResult => {
    const schema: ValidationSchema<T> = requiredFields.map(field => ({
      field,
      required: true
    }));
    return validate(data, schema);
  }, [validate]);

  return {
    validate,
    validateRequired
  };
}

// ============================================================================
// Realtime field-level validation (absorbed from former useFormValidation.tsx)
//
// The original hook re-initialised its whole state in an effect keyed on the
// `config` object identity — an inline literal produced a new identity every
// render, so setState fired on every render forever (the "infinite loop" that
// forced AddStudentPage to drop the import). Here state is adjusted during
// render only when the *set of configured fields* changes, which is idempotent
// and loop-free.
// ============================================================================

/** Validator-style rule used by useFormValidation (distinct from ValidationRule above). */
export type FieldValidationRule<T = any> = {
  validator: (value: T, formData?: Record<string, any>) => boolean | Promise<boolean>;
  message: string;
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  priority?: number; // Lower numbers = higher priority
};

export type FieldValidationConfig<T = any> = {
  rules: FieldValidationRule<T>[];
  required?: boolean;
  requiredMessage?: string;
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
};

export type FormValidationConfig = {
  [fieldName: string]: FieldValidationConfig;
};

export type FieldValidationError = {
  message: string;
  rule?: FieldValidationRule;
  priority: number;
};

export type FieldValidationState = {
  isValid: boolean;
  isValidating: boolean;
  errors: FieldValidationError[];
  touched: boolean;
  dirty: boolean;
};

export type FormValidationState = {
  [fieldName: string]: FieldValidationState;
};

export type UseFormValidationOptions = {
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'all';
  debounceMs?: number;
  announceErrors?: boolean;
  revalidateMode?: 'onChange' | 'onBlur';
  shouldFocusError?: boolean;
};

// Built-in validators
export const validators = {
  required: (message = 'This field is required'): FieldValidationRule => ({
    validator: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== '';
    },
    message,
    priority: 1,
  }),

  minLength: (min: number, message?: string): FieldValidationRule => ({
    validator: (value: string) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters`,
    priority: 2,
  }),

  maxLength: (max: number, message?: string): FieldValidationRule => ({
    validator: (value: string) => !value || value.length <= max,
    message: message || `Must be no more than ${max} characters`,
    priority: 2,
  }),

  email: (message = 'Please enter a valid email address'): FieldValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
    priority: 3,
  }),

  pattern: (regex: RegExp, message: string): FieldValidationRule => ({
    validator: (value: string) => !value || regex.test(value),
    message,
    priority: 3,
  }),

  numeric: (message = 'Please enter a valid number'): FieldValidationRule => ({
    validator: (value: string) => !value || !isNaN(Number(value)),
    message,
    priority: 3,
  }),

  min: (min: number, message?: string): FieldValidationRule => ({
    validator: (value: string | number) => {
      if (!value && value !== 0) return true;
      const num = typeof value === 'string' ? Number(value) : value;
      return !isNaN(num) && num >= min;
    },
    message: message || `Must be at least ${min}`,
    priority: 3,
  }),

  max: (max: number, message?: string): FieldValidationRule => ({
    validator: (value: string | number) => {
      if (!value && value !== 0) return true;
      const num = typeof value === 'string' ? Number(value) : value;
      return !isNaN(num) && num <= max;
    },
    message: message || `Must be no more than ${max}`,
    priority: 3,
  }),

  custom: (validator: (value: any, formData?: Record<string, any>) => boolean | Promise<boolean>, message: string): FieldValidationRule => ({
    validator,
    message,
    priority: 4,
  }),
};

function emptyFieldState(): FieldValidationState {
  return {
    isValid: true,
    isValidating: false,
    errors: [],
    touched: false,
    dirty: false,
  };
}

function buildInitialState(config: FormValidationConfig): FormValidationState {
  const initialState: FormValidationState = {};
  Object.keys(config).forEach(fieldName => {
    initialState[fieldName] = emptyFieldState();
  });
  return initialState;
}

export function useFormValidation<T extends Record<string, any>>(
  config: FormValidationConfig,
  options: UseFormValidationOptions = {}
) {
  const {
    mode = 'onChange',
    debounceMs = 300,
    announceErrors = true,
    revalidateMode = 'onChange',
    shouldFocusError = true,
  } = options;

  // State
  const [formData, setFormData] = useState<T>({} as T);
  const [validationState, setValidationState] = useState<FormValidationState>(() => buildInitialState(config));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for debouncing and cleanup
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fieldRefs = useRef<Record<string, HTMLElement>>({});
  // Monotonic sequence per field so out-of-order async results are discarded
  const validationSeq = useRef<Record<string, number>>({});

  // Loop-fix: adjust state during render ONLY when the configured field set
  // changes. Inline `config` literals change identity every render but keep
  // the same signature, so this settles after at most one extra render.
  const configRef = useRef(config);
  configRef.current = config;
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const configSignature = useMemo(
    () => Object.keys(config).sort().join(','),
    [config]
  );
  const [appliedSignature, setAppliedSignature] = useState(configSignature);
  if (appliedSignature !== configSignature) {
    setAppliedSignature(configSignature);
    setValidationState(prev => {
      const next = buildInitialState(config);
      // Preserve touched/dirty flags for fields that still exist
      Object.keys(next).forEach(fieldName => {
        const prior = prev[fieldName];
        if (prior) {
          next[fieldName] = { ...next[fieldName], touched: prior.touched, dirty: prior.dirty };
        }
      });
      return next;
    });
  }

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Validate a single field
  const validateField = useCallback(async (
    fieldName: string,
    value: any,
    shouldDebounce = true
  ): Promise<FieldValidationError[]> => {
    const fieldConfig = configRef.current[fieldName];
    if (!fieldConfig) return [];

    const errors: FieldValidationError[] = [];
    const effectiveDebounceMs = fieldConfig.debounceMs ?? debounceMs;

    // Clear existing timer
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }

    // Set validating state immediately
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        ...(prev[fieldName] || emptyFieldState()),
        isValidating: true,
      },
    }));

    const runValidation = async (): Promise<FieldValidationError[]> => {
      try {
        const currentFormData = formDataRef.current;

        // Check required validation first
        if (fieldConfig.required) {
          const requiredRule = validators.required(fieldConfig.requiredMessage);
          const isValid = await requiredRule.validator(value, currentFormData);
          if (!isValid) {
            errors.push({
              message: requiredRule.message,
              rule: requiredRule,
              priority: requiredRule.priority || 1,
            });
            // If required validation fails, don't run other validations
            return errors;
          }
        }

        // Run other validation rules
        const ruleResults = fieldConfig.rules.map(async (rule) => {
          try {
            const isValid = await rule.validator(value, currentFormData);
            if (!isValid) {
              return {
                message: rule.message,
                rule,
                priority: rule.priority || 4,
              };
            }
            return null;
          } catch (error) {
            logger.error(`Validation error for field ${fieldName}:`, error);
            return {
              message: 'Validation error occurred',
              rule,
              priority: rule.priority || 4,
            };
          }
        });

        const results = await Promise.all(ruleResults);
        errors.push(...results.filter(Boolean) as FieldValidationError[]);

        // Sort errors by priority
        errors.sort((a, b) => a.priority - b.priority);

        return errors;
      } catch (error) {
        logger.error(`Field validation error for ${fieldName}:`, error);
        return [{
          message: 'Validation error occurred',
          priority: 999,
        }];
      }
    };

    if (shouldDebounce && effectiveDebounceMs > 0) {
      return new Promise((resolve) => {
        debounceTimers.current[fieldName] = setTimeout(async () => {
          resolve(await runValidation());
        }, effectiveDebounceMs);
      });
    }
    return runValidation();
  }, [debounceMs]);

  // Update field validation state
  const updateFieldValidationState = useCallback((
    fieldName: string,
    errors: FieldValidationError[],
    isValidating = false
  ) => {
    setValidationState(prev => {
      const currentField = prev[fieldName] || emptyFieldState();

      const newField = {
        ...currentField,
        isValid: errors.length === 0,
        isValidating,
        errors,
      };

      // Announce errors to screen readers if enabled
      if (announceErrors && errors.length > 0 && !currentField.errors.length) {
        const errorMessage = errors[0].message;
        announceToScreenReader(`${fieldName}: ${errorMessage}`, 'assertive');
      }

      return {
        ...prev,
        [fieldName]: newField,
      };
    });
  }, [announceErrors]);

  // Apply the result of a validation run unless a newer run superseded it
  const applyValidationResult = useCallback((
    fieldName: string,
    sequence: number,
    errors: FieldValidationError[],
    isValidating = false
  ) => {
    if (validationSeq.current[fieldName] !== sequence) return;
    updateFieldValidationState(fieldName, errors, isValidating);
  }, [updateFieldValidationState]);

  // Set field value and trigger validation
  const setFieldValue = useCallback(async (
    fieldName: string,
    value: any,
    opts: {
      shouldValidate?: boolean;
      shouldTouch?: boolean;
      shouldDebounce?: boolean;
    } = {}
  ) => {
    const {
      shouldValidate = mode === 'onChange' || mode === 'all',
      shouldTouch = true,
      shouldDebounce = true,
    } = opts;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // Keep the ref in sync so immediately-following validations see the value
    formDataRef.current = { ...formDataRef.current, [fieldName]: value };

    // Update field state
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        ...(prev[fieldName] || emptyFieldState()),
        touched: shouldTouch ? true : prev[fieldName]?.touched || false,
        dirty: true,
      },
    }));

    // Validate if needed
    if (shouldValidate) {
      const sequence = (validationSeq.current[fieldName] ?? 0) + 1;
      validationSeq.current[fieldName] = sequence;
      const errors = await validateField(fieldName, value, shouldDebounce);
      applyValidationResult(fieldName, sequence, errors);
    }
  }, [mode, validateField, applyValidationResult]);

  // Set field touched state
  const setFieldTouched = useCallback(async (
    fieldName: string,
    touched = true,
    shouldValidate = mode === 'onBlur' || mode === 'all'
  ) => {
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        ...(prev[fieldName] || emptyFieldState()),
        touched,
      },
    }));

    if (shouldValidate && touched) {
      const value = formDataRef.current[fieldName];
      const sequence = (validationSeq.current[fieldName] ?? 0) + 1;
      validationSeq.current[fieldName] = sequence;
      const errors = await validateField(fieldName, value, false);
      applyValidationResult(fieldName, sequence, errors);
    }
  }, [mode, validateField, applyValidationResult]);

  // Validate all fields
  const validateForm = useCallback(async (): Promise<boolean> => {
    const currentFormData = formDataRef.current;
    const fieldNames = Object.keys(configRef.current);
    const validations = fieldNames.map(async (fieldName) => {
      const value = currentFormData[fieldName];
      const sequence = (validationSeq.current[fieldName] ?? 0) + 1;
      validationSeq.current[fieldName] = sequence;
      const errors = await validateField(fieldName, value, false);
      applyValidationResult(fieldName, sequence, errors, false);
      return { fieldName, errors };
    });

    const results = await Promise.all(validations);
    const hasErrors = results.some(result => result.errors.length > 0);

    // Focus first field with error if enabled
    if (hasErrors && shouldFocusError) {
      const firstErrorField = results.find(result => result.errors.length > 0);
      if (firstErrorField && fieldRefs.current[firstErrorField.fieldName]) {
        fieldRefs.current[firstErrorField.fieldName].focus();
      }
    }

    return !hasErrors;
  }, [validateField, applyValidationResult, shouldFocusError]);

  // Submit handler
  const handleSubmit = useCallback(async (
    onSubmit: (data: T) => void | Promise<void>
  ) => {
    setIsSubmitting(true);

    try {
      // Mark all fields as touched
      const touchPromises = Object.keys(configRef.current).map(fieldName =>
        setFieldTouched(fieldName, true, false)
      );
      await Promise.all(touchPromises);

      // Validate all fields
      const isValid = await validateForm();

      if (isValid) {
        await onSubmit(formDataRef.current as T);
      } else {
        // Announce form errors to screen readers
        if (announceErrors) {
          announceToScreenReader('Form contains errors. Please review and correct them.', 'assertive');
        }
      }
    } catch (error) {
      logger.error('Form submission error:', error);
      if (announceErrors) {
        announceToScreenReader('An error occurred while submitting the form.', 'assertive');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [setFieldTouched, validateForm, announceErrors]);

  // Reset form
  const resetForm = useCallback((newData: Partial<T> = {}) => {
    setFormData(newData as T);
    formDataRef.current = { ...newData } as T;
    setValidationState(buildInitialState(configRef.current));
    setAppliedSignature(Object.keys(configRef.current).sort().join(','));

    // Clear debounce timers and invalidate in-flight runs
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    debounceTimers.current = {};
    Object.keys(validationSeq.current).forEach(fieldName => {
      validationSeq.current[fieldName] += 1;
    });
  }, []);

  // Register field ref for focus management
  const registerField = useCallback((fieldName: string, element: HTMLElement | null) => {
    if (element) {
      fieldRefs.current[fieldName] = element;
    } else {
      delete fieldRefs.current[fieldName];
    }
  }, []);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((fieldName: string) => {
    const fieldState = validationState[fieldName] || emptyFieldState();

    return {
      name: fieldName,
      value: formData[fieldName] || '',
      error: fieldState.touched && fieldState.errors.length > 0 ? fieldState.errors[0].message : undefined,
      loading: fieldState.isValidating,
      onChange: (value: any) => setFieldValue(fieldName, value),
      onBlur: () => setFieldTouched(fieldName, true),
      ref: (element: HTMLElement | null) => registerField(fieldName, element),
    };
  }, [validationState, formData, setFieldValue, setFieldTouched, registerField]);

  // Computed values
  const isValid = useMemo(() => {
    return Object.values(validationState).every(field => field.isValid);
  }, [validationState]);

  const isValidating = useMemo(() => {
    return Object.values(validationState).some(field => field.isValidating);
  }, [validationState]);

  const isDirty = useMemo(() => {
    return Object.values(validationState).some(field => field.dirty);
  }, [validationState]);

  const touchedFields = useMemo(() => {
    return Object.keys(validationState).filter(fieldName =>
      validationState[fieldName]?.touched
    );
  }, [validationState]);

  const errors = useMemo(() => {
    const allErrors: Record<string, FieldValidationError[]> = {};
    Object.entries(validationState).forEach(([fieldName, fieldState]) => {
      if (fieldState.errors.length > 0) {
        allErrors[fieldName] = fieldState.errors;
      }
    });
    return allErrors;
  }, [validationState]);

  return {
    // Form data
    formData,
    setFormData,

    // Field operations
    setFieldValue,
    setFieldTouched,
    getFieldProps,
    registerField,

    // Validation
    validateField,
    validateForm,

    // Form operations
    handleSubmit,
    resetForm,

    // State
    validationState,
    isValid,
    isValidating,
    isDirty,
    isSubmitting,
    touchedFields,
    errors,
  };
}

export default useValidation;

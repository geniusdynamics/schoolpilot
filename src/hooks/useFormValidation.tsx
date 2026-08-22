import { logger } from '@/utils/logging';

// ABOUTME: Centralized form validation hook with real-time validation, debouncing, and accessibility
// ABOUTME: Provides validation rule system, error management, and screen reader compatibility

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { announceToScreenReader } from '@/utils/accessibility';

// Validation rule types
export type ValidationRule<T = any> = {
  validator: (value: T, formData?: Record<string, any>) => boolean | Promise<boolean>;
  message: string;
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  priority?: number; // Lower numbers = higher priority
};

export type FieldValidationConfig<T = any> = {
  rules: ValidationRule<T>[];
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

export type ValidationError = {
  message: string;
  rule?: ValidationRule;
  priority: number;
};

export type FieldValidationState = {
  isValid: boolean;
  isValidating: boolean;
  errors: ValidationError[];
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
  required: (message = 'This field is required'): ValidationRule => ({
    validator: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== '';
    },
    message,
    priority: 1,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value: string) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters`,
    priority: 2,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value: string) => !value || value.length <= max,
    message: message || `Must be no more than ${max} characters`,
    priority: 2,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
    priority: 3,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validator: (value: string) => !value || regex.test(value),
    message,
    priority: 3,
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    validator: (value: string) => !value || !isNaN(Number(value)),
    message,
    priority: 3,
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validator: (value: string | number) => {
      if (!value && value !== 0) return true;
      const num = typeof value === 'string' ? Number(value) : value;
      return !isNaN(num) && num >= min;
    },
    message: message || `Must be at least ${min}`,
    priority: 3,
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validator: (value: string | number) => {
      if (!value && value !== 0) return true;
      const num = typeof value === 'string' ? Number(value) : value;
      return !isNaN(num) && num <= max;
    },
    message: message || `Must be no more than ${max}`,
    priority: 3,
  }),

  custom: (validator: (value: any, formData?: Record<string, any>) => boolean | Promise<boolean>, message: string): ValidationRule => ({
    validator,
    message,
    priority: 4,
  }),
};

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
  const [validationState, setValidationState] = useState<FormValidationState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for debouncing and cleanup
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const validationPromises = useRef<Record<string, Promise<any>>>({});
  const fieldRefs = useRef<Record<string, HTMLElement>>({});

  // Initialize validation state for all configured fields
  useEffect(() => {
    const initialState: FormValidationState = {};
    Object.keys(config).forEach(fieldName => {
      initialState[fieldName] = {
        isValid: true,
        isValidating: false,
        errors: [],
        touched: false,
        dirty: false,
      };
    });
    setValidationState(initialState);
  }, [config]);

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
  ): Promise<ValidationError[]> => {
    const fieldConfig = config[fieldName];
    if (!fieldConfig) return [];

    const errors: ValidationError[] = [];
    const effectiveDebounceMs = fieldConfig.debounceMs ?? debounceMs;

    // Clear existing timer
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }

    // Set validating state immediately
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isValidating: true,
      },
    }));

    const runValidation = async () => {
      try {
        // Check required validation first
        if (fieldConfig.required) {
          const requiredRule = validators.required(fieldConfig.requiredMessage);
          const isValid = await requiredRule.validator(value, formData);
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
        const validationPromises = fieldConfig.rules.map(async (rule) => {
          try {
            const isValid = await rule.validator(value, formData);
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

        const results = await Promise.all(validationPromises);
        errors.push(...results.filter(Boolean) as ValidationError[]);

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
          const validationErrors = await runValidation();
          resolve(validationErrors);
        }, effectiveDebounceMs);
      });
    } else {
      return runValidation();
    }
  }, [config, formData, debounceMs]);

  // Update field validation state
  const updateFieldValidationState = useCallback((
    fieldName: string,
    errors: ValidationError[],
    isValidating = false
  ) => {
    setValidationState(prev => {
      const currentField = prev[fieldName] || {
        isValid: true,
        isValidating: false,
        errors: [],
        touched: false,
        dirty: false,
      };

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

  // Set field value and trigger validation
  const setFieldValue = useCallback(async (
    fieldName: string,
    value: any,
    options: {
      shouldValidate?: boolean;
      shouldTouch?: boolean;
      shouldDebounce?: boolean;
    } = {}
  ) => {
    const {
      shouldValidate = mode === 'onChange' || mode === 'all',
      shouldTouch = true,
      shouldDebounce = true,
    } = options;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // Update field state
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched: shouldTouch ? true : prev[fieldName]?.touched || false,
        dirty: true,
      },
    }));

    // Validate if needed
    if (shouldValidate) {
      const errors = await validateField(fieldName, value, shouldDebounce);
      updateFieldValidationState(fieldName, errors);
    }
  }, [mode, validateField, updateFieldValidationState]);

  // Set field touched state
  const setFieldTouched = useCallback(async (
    fieldName: string,
    touched = true,
    shouldValidate = mode === 'onBlur' || mode === 'all'
  ) => {
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched,
      },
    }));

    if (shouldValidate && touched) {
      const value = formData[fieldName];
      const errors = await validateField(fieldName, value, false);
      updateFieldValidationState(fieldName, errors);
    }
  }, [mode, formData, validateField, updateFieldValidationState]);

  // Validate all fields
  const validateForm = useCallback(async (): Promise<boolean> => {
    const fieldNames = Object.keys(config);
    const validationPromises = fieldNames.map(async (fieldName) => {
      const value = formData[fieldName];
      const errors = await validateField(fieldName, value, false);
      updateFieldValidationState(fieldName, errors, false);
      return { fieldName, errors };
    });

    const results = await Promise.all(validationPromises);
    const hasErrors = results.some(result => result.errors.length > 0);

    // Focus first field with error if enabled
    if (hasErrors && shouldFocusError) {
      const firstErrorField = results.find(result => result.errors.length > 0);
      if (firstErrorField && fieldRefs.current[firstErrorField.fieldName]) {
        fieldRefs.current[firstErrorField.fieldName].focus();
      }
    }

    return !hasErrors;
  }, [config, formData, validateField, updateFieldValidationState, shouldFocusError]);

  // Submit handler
  const handleSubmit = useCallback(async (
    onSubmit: (data: T) => void | Promise<void>
  ) => {
    setIsSubmitting(true);

    try {
      // Mark all fields as touched
      const touchPromises = Object.keys(config).map(fieldName =>
        setFieldTouched(fieldName, true, false)
      );
      await Promise.all(touchPromises);

      // Validate all fields
      const isValid = await validateForm();

      if (isValid) {
        await onSubmit(formData);
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
  }, [config, formData, setFieldTouched, validateForm, announceErrors]);

  // Reset form
  const resetForm = useCallback((newData: Partial<T> = {}) => {
    setFormData(newData as T);
    
    const resetState: FormValidationState = {};
    Object.keys(config).forEach(fieldName => {
      resetState[fieldName] = {
        isValid: true,
        isValidating: false,
        errors: [],
        touched: false,
        dirty: false,
      };
    });
    setValidationState(resetState);

    // Clear debounce timers
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    debounceTimers.current = {};
  }, [config]);

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
    const fieldState = validationState[fieldName] || {
      isValid: true,
      isValidating: false,
      errors: [],
      touched: false,
      dirty: false,
    };

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
    const allErrors: Record<string, ValidationError[]> = {};
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

export default useFormValidation;
// ABOUTME: Validation hook for CRUD operations
// ABOUTME: Provides standardized validation with error messages and i18n support

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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

export default useValidation;

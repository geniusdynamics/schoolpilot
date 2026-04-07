// ABOUTME: Tests for useFormValidation hook functionality
// ABOUTME: Verifies validation rules, debouncing, and error handling

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useFormValidation, { validators } from '@/hooks/useFormValidation';

// Mock the accessibility utils
vi.mock('../utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
}));

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    const config = {
      email: {
        rules: [validators.email()],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));

    expect(result.current.formData).toEqual({});
    expect(result.current.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should update form data', async () => {
    const config = {
      name: {
        rules: [validators.minLength(2)],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));

    await act(async () => {
      await result.current.setFieldValue('name', 'John');
    });

    expect(result.current.formData.name).toBe('John');
  });

  it('should provide field props', () => {
    const config = {
      email: {
        rules: [validators.email()],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));

    const fieldProps = result.current.getFieldProps('email');

    expect(fieldProps.name).toBe('email');
    expect(typeof fieldProps.onChange).toBe('function');
    expect(typeof fieldProps.onBlur).toBe('function');
  });

  it('should validate email format', async () => {
    const config = {
      email: {
        rules: [validators.email()],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));

    // Test valid email
    await act(async () => {
      await result.current.setFieldValue('email', 'test@example.com', { shouldDebounce: false });
    });

    expect(result.current.validationState.email?.isValid).toBe(true);

    // Test invalid email
    await act(async () => {
      await result.current.setFieldValue('email', 'invalid-email', { shouldDebounce: false });
    });

    expect(result.current.validationState.email?.isValid).toBe(false);
  });

  it('should validate required fields', async () => {
    const config = {
      name: {
        rules: [],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));

    await act(async () => {
      await result.current.setFieldValue('name', '', { shouldDebounce: false });
    });

    expect(result.current.validationState.name?.isValid).toBe(false);
    expect(result.current.validationState.name?.errors[0]?.message).toBe('This field is required');
  });

  it('should handle form submission', async () => {
    const config = {
      email: {
        rules: [validators.email()],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));
    const onSubmit = vi.fn();

    // Set valid data
    await act(async () => {
      await result.current.setFieldValue('email', 'test@example.com', { shouldDebounce: false });
    });

    // Submit form
    await act(async () => {
      await result.current.handleSubmit(onSubmit);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  it('should reset form', async () => {
    const config = {
      name: {
        rules: [validators.minLength(2)],
        required: true,
      },
    };

    const { result } = renderHook(() => useFormValidation(config));

    // Set some data
    await act(async () => {
      await result.current.setFieldValue('name', 'John');
    });

    expect(result.current.formData.name).toBe('John');

    // Reset form
    await act(async () => {
      result.current.resetForm();
    });

    expect(result.current.formData).toEqual({});
    expect(result.current.isDirty).toBe(false);
  });
});
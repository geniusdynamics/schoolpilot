// ABOUTME: Tests for the merged validation module (Phase 1b.1/1b.2)
// ABOUTME: Schema-driven useValidation + realtime useFormValidation, including the
// ABOUTME: infinite-loop regression that originally forced AddStudentPage to drop
// ABOUTME: the hook (config-identity effect re-initialising state every render).

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useValidation, useFormValidation, validators } from '@/hooks/useValidation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => {
    if (!opts) return key;
    return `${key}:${JSON.stringify(opts)}`;
  } }),
}));

vi.mock('../utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
}));

describe('useValidation (schema-driven)', () => {
  it('flags missing required fields', () => {
    const { result } = renderHook(() => useValidation<{ name: string }>());
    const res = result.current.validate(
      {},
      [{ field: 'name', required: true }]
    );
    expect(res.valid).toBe(false);
    expect(res.errors[0].field).toBe('name');
  });

  it('enforces minLength/maxLength', () => {
    const { result } = renderHook(() => useValidation<{ name: string }>());
    const short = result.current.validate({ name: 'a' }, [{ field: 'name', minLength: 2 }]);
    expect(short.valid).toBe(false);
    const long = result.current.validate({ name: 'abcdef' }, [{ field: 'name', maxLength: 3 }]);
    expect(long.valid).toBe(false);
  });

  it('validates pattern and email rules', () => {
    const { result } = renderHook(() => useValidation<{ email: string; code: string }>());
    const res = result.current.validate(
      { email: 'nope', code: 'abc!' },
      [
        { field: 'email', email: true },
        { field: 'code', pattern: /^[A-Z0-9]+$/ },
      ]
    );
    expect(res.valid).toBe(false);
    expect(res.errors.map(e => e.field).sort()).toEqual(['code', 'email']);
  });

  it('supports custom rules returning a message string', () => {
    const { result } = renderHook(() => useValidation<{ age: number }>());
    const res = result.current.validate(
      { age: 15 },
      [{ field: 'age', custom: v => ((v as number) >= 16 || 'Too young') }]
    );
    expect(res.errors[0].message).toBe('Too young');
  });

  it('checks uniqueness against existing items excluding self by id', () => {
    type Item = { id?: number; name: string };
    const existing: Item[] = [{ id: 1, name: 'Math' }, { id: 2, name: 'Eng' }];
    const { result } = renderHook(() => useValidation<Item>());

    const dup = result.current.validate({ id: 9, name: 'Math' }, [{ field: 'name', unique: true }], existing);
    expect(dup.valid).toBe(false);

    const self = result.current.validate({ id: 1, name: 'Math' }, [{ field: 'name', unique: true }], existing);
    expect(self.valid).toBe(true);
  });

  it('skips optional empty fields but validates filled ones', () => {
    const { result } = renderHook(() => useValidation<{ nickname: string }>());
    expect(result.current.validate({}, [{ field: 'nickname', minLength: 5 }]).valid).toBe(true);
    expect(result.current.validate({ nickname: 'ab' }, [{ field: 'nickname', minLength: 5 }]).valid).toBe(false);
  });

  it('validateRequired builds a required-only schema', () => {
    const { result } = renderHook(() => useValidation<{ name: string; code: string }>());
    const res = result.current.validateRequired({ name: 'x' }, ['name', 'code']);
    expect(res.valid).toBe(false);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].field).toBe('code');
  });
});

describe('useFormValidation (realtime, merged)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // REGRESSION: an inline config literal used to re-run the init effect on
  // every render (new object identity each time), each run calling setState
  // with a fresh object → render loop. State is now adjusted only when the
  // configured-field *signature* changes.
  it('does not loop when given an inline config literal (render count bounded)', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useFormValidation({
        name: { rules: [validators.required()], required: true },
      });
    });

    expect(renders).toBeLessThan(10);
    expect(result.current.isValid).toBe(true);
  });

  it('re-initialises state when the configured field set actually changes', () => {
    const { result, rerender } = renderHook(
      ({ fields }: { fields: string[] }) =>
        useFormValidation(Object.fromEntries(fields.map(f => [f, { rules: [] }]))),
      { initialProps: { fields: ['a'] } }
    );

    rerender({ fields: ['a', 'b'] });
    expect(Object.keys(result.current.validationState).sort()).toEqual(['a', 'b']);

    rerender({ fields: ['a'] });
    expect(Object.keys(result.current.validationState)).toEqual(['a']);
  });

  it('supports async validators and surfaces their errors', async () => {
    const asyncCheck = vi.fn(async (value: string) => value !== 'taken');

    const { result } = renderHook(() =>
      useFormValidation({
        username: { rules: [validators.custom(asyncCheck, 'Username already in use')] },
      })
    );

    await act(async () => {
      await result.current.setFieldValue('username', 'free', { shouldDebounce: false });
    });
    expect(result.current.validationState.username?.isValid).toBe(true);

    await act(async () => {
      await result.current.setFieldValue('username', 'taken', { shouldDebounce: false });
    });
    expect(result.current.validationState.username?.isValid).toBe(false);
    expect(result.current.validationState.username?.errors[0]?.message).toBe('Username already in use');
  });

  it('discards out-of-order async results so the last keystroke wins', async () => {
    let resolveSlow!: (v: boolean) => void;
    const slowValidator = vi.fn((value: string) =>
      value === 'slow' ? new Promise<boolean>(res => { resolveSlow = res; }) : Promise.resolve(value === 'ok')
    );

    const { result } = renderHook(() =>
      useFormValidation({
        field: { rules: [validators.custom(slowValidator as any, 'invalid')] },
      })
    );

    // Start the slow validation...
    await act(async () => {
      result.current.setFieldValue('field', 'slow', { shouldDebounce: false });
    });
    // ...then a fast one that supersedes it
    await act(async () => {
      await result.current.setFieldValue('field', 'ok', { shouldDebounce: false });
    });
    expect(result.current.validationState.field?.isValid).toBe(true);

    // The stale slow result must NOT overwrite the newer state
    await act(async () => {
      resolveSlow(false);
      await Promise.resolve();
    });
    expect(result.current.validationState.field?.isValid).toBe(true);
  });

  it('debounces validation until the timer elapses', async () => {
    // Global setup mocks the system clock, so avoid vi.useFakeTimers and use
    // a short real-timer debounce instead.
    const { result } = renderHook(() =>
      useFormValidation(
        { name: { rules: [validators.minLength(3)] } },
        { debounceMs: 30 }
      )
    );

    // Fire without awaiting: the debounced run has not executed yet
    let settled = false;
    await act(async () => {
      result.current.setFieldValue('name', 'ab').then(() => { settled = true; });
      await Promise.resolve();
    });

    expect(result.current.validationState.name?.errors ?? []).toHaveLength(0);

    // Wait past the debounce window
    await act(async () => {
      await new Promise(res => setTimeout(res, 80));
    });

    expect(settled).toBe(true);
    expect(result.current.validationState.name?.isValid).toBe(false);
    expect(result.current.validationState.name?.errors[0]?.message).toContain('at least 3');
  });

  it('validate-on-blur mode defers validation until touched', async () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { name: { rules: [validators.minLength(3)] } },
        { mode: 'onBlur' }
      )
    );

    await act(async () => {
      await result.current.setFieldValue('name', 'ab');
    });
    expect(result.current.validationState.name?.isValid).toBe(true);

    await act(async () => {
      await result.current.setFieldTouched('name', true);
    });
    expect(result.current.validationState.name?.isValid).toBe(false);
  });

  it('blocks submit with invalid data and calls onSubmit when valid', async () => {
    const onSubmitValid = vi.fn();
    const onSubmitInvalid = vi.fn();

    const { result } = renderHook(() =>
      useFormValidation({
        name: { rules: [], required: true },
      })
    );

    // Invalid: required left empty
    await act(async () => {
      await result.current.handleSubmit(onSubmitInvalid);
    });
    expect(onSubmitInvalid).not.toHaveBeenCalled();
    expect(result.current.isValid).toBe(false);

    // Valid
    await act(async () => {
      await result.current.setFieldValue('name', 'Ada', { shouldDebounce: false });
    });
    await act(async () => {
      await result.current.handleSubmit(onSubmitValid);
    });
    expect(onSubmitValid).toHaveBeenCalledWith({ name: 'Ada' });
  });

  it('resetForm clears data, dirtiness and pending validations', async () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { rules: [validators.minLength(3)] } })
    );

    await act(async () => {
      await result.current.setFieldValue('name', 'ab', { shouldDebounce: false });
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.isValid).toBe(false);

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData).toEqual({});
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isValid).toBe(true);
  });
});

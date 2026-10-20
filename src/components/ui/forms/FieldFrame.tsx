// ABOUTME: Shared label, help-text and error chrome for schema-bound form fields.
// ABOUTME: Links messages through aria-describedby and marks required/optional controls.

import { useId, type ReactNode } from 'react';

import { createAriaDescribedBy } from '@/utils/accessibility';

export interface FieldFrameRenderProps {
  readonly describedBy?: string;
  readonly invalid: boolean;
}

export interface FieldFrameProps {
  readonly id: string;
  readonly label?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly className?: string;
  readonly children: (props: FieldFrameRenderProps) => ReactNode;
}

/** Returns a stable control id, deriving one from React's id when the caller omits it. */
export function useFieldId(provided: string | undefined, prefix: string): string {
  const generated = useId();
  if (provided) return provided;
  const safe = generated.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${prefix}-${safe}`;
}

export function FieldFrame({
  id,
  label,
  helperText,
  error,
  required = false,
  optional = false,
  className = '',
  children,
}: FieldFrameProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const showHelper = Boolean(helperText) && !error;
  const describedBy = createAriaDescribedBy([
    showHelper ? helpId : undefined,
    error ? errorId : undefined,
  ]);

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      {label ? (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-surface-foreground"
        >
          {label}
          {required ? (
            <>
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> required</span>
            </>
          ) : null}
          {optional ? (
            <span className="ml-1 font-normal text-surface-muted-fg">(optional)</span>
          ) : null}
        </label>
      ) : null}

      {children({ describedBy, invalid: Boolean(error) })}

      {showHelper ? (
        <p id={helpId} className="mt-1.5 text-xs text-surface-muted-fg">
          {helperText}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default FieldFrame;

// ABOUTME: Native select control for schema-bound forms, including enum-derived options.
// ABOUTME: Keeps the design-system input styling and exposes label, help and error wiring.

import { FieldFrame, useFieldId } from './FieldFrame';
import type { FieldOption } from './fieldTypes';

export interface SelectFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: string;
  readonly onChange?: (value: string | undefined) => void;
  readonly options?: readonly FieldOption[];
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function SelectField({
  id: providedId,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option…',
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  className = '',
}: SelectFieldProps) {
  const id = useFieldId(providedId, 'select-field');
  const classes = [
    'h-10 w-full rounded-lg border bg-surface-card px-3 text-sm text-surface-foreground shadow-sm',
    'transition-[border-color,box-shadow] duration-150 outline-none',
    'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15',
    'disabled:cursor-not-allowed disabled:border-surface-border disabled:bg-surface-muted disabled:text-surface-muted-fg',
    error
      ? 'border-red-400 dark:border-red-500/70'
      : 'border-surface-input hover:border-surface-input-hover',
  ].join(' ');

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
      optional={optional}
      className={className}
    >
      {({ describedBy, invalid }) => (
        <select
          id={id}
          name={name}
          value={value ?? ''}
          onChange={(event) =>
            onChange?.(event.target.value === '' ? undefined : event.target.value)
          }
          disabled={disabled || readOnly}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-readonly={readOnly || undefined}
          className={classes}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}

export default SelectField;

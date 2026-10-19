// ABOUTME: Entity reference field binding D01's EntityPicker to a lookup injected through props.
// ABOUTME: The form supplies the lookup map; the picker owns options, labels and keyboard behaviour.

import { EntityPicker } from '../EntityPicker';
import { useFieldId } from './FieldFrame';
import type { EntityFormLookup, EntityLookupRow } from './fieldTypes';

export interface EntityFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: string | null;
  readonly onChange: (value: string | null) => void;
  readonly lookup: EntityFormLookup;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly allowClear?: boolean;
  readonly className?: string;
}

export function EntityField({
  id: providedId,
  name,
  label,
  value,
  onChange,
  lookup,
  placeholder,
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  allowClear = true,
  className = '',
}: EntityFieldProps) {
  const id = useFieldId(providedId, 'entity-field');
  const accessibleLabel = required && label ? `${label} (required)` : label;

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

      <EntityPicker<EntityLookupRow>
        id={id}
        name={name}
        value={value ?? null}
        onChange={onChange}
        lookup={lookup}
        placeholder={placeholder}
        disabled={disabled || readOnly}
        allowClear={allowClear}
        error={error}
        helperText={helperText}
        aria-label={accessibleLabel}
      />
    </div>
  );
}

export default EntityField;

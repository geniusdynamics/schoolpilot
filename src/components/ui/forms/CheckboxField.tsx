// ABOUTME: Boolean checkbox control for schema-bound forms.
// ABOUTME: The shared field frame owns the visible label; the control exposes help and error wiring.

import Checkbox from '../Checkbox';
import { FieldFrame, useFieldId } from './FieldFrame';

export interface CheckboxFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: boolean;
  readonly onChange?: (value: boolean) => void;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function CheckboxField({
  id: providedId,
  name,
  label,
  value = false,
  onChange,
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  className = '',
}: CheckboxFieldProps) {
  const id = useFieldId(providedId, 'checkbox-field');

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
        <div className="flex h-10 items-center">
          <Checkbox
            id={id}
            name={name}
            checked={value}
            onChange={(checked) => onChange?.(checked)}
            disabled={disabled || readOnly}
            error={invalid}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            aria-readonly={readOnly || undefined}
          />
        </div>
      )}
    </FieldFrame>
  );
}

export default CheckboxField;

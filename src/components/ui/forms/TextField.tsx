// ABOUTME: Text, email, number and textarea controls for schema-bound forms.
// ABOUTME: Reuses the design-system Input/Textarea and delegates label and error chrome to FieldFrame.

import Input from '../Input';
import Textarea from '../Textarea';
import { FieldFrame, useFieldId } from './FieldFrame';

export interface TextFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'time' | 'number';
  readonly value?: string | number;
  readonly onChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly autoComplete?: string;
  readonly min?: number | string;
  readonly max?: number | string;
  readonly step?: number;
  readonly className?: string;
}

export function TextField({
  id: providedId,
  name,
  label,
  type = 'text',
  value = '',
  onChange,
  placeholder,
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  autoComplete,
  min,
  max,
  step,
  className = '',
}: TextFieldProps) {
  const id = useFieldId(providedId, 'text-field');

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
        <Input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          errorState={invalid}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
        />
      )}
    </FieldFrame>
  );
}

export interface TextareaFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly rows?: number;
  readonly className?: string;
}

export function TextareaField({
  id: providedId,
  name,
  label,
  value = '',
  onChange,
  placeholder,
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  rows = 3,
  className = '',
}: TextareaFieldProps) {
  const id = useFieldId(providedId, 'textarea-field');

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
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          errorState={invalid}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
        />
      )}
    </FieldFrame>
  );
}

export default TextField;

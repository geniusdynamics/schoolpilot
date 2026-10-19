// ABOUTME: Opaque identifier input pairing an identifier scheme (type) with an exact string value.
// ABOUTME: Values keep leading zeroes and are never coerced to numbers.

import { FieldFrame, useFieldId } from './FieldFrame';
import type { FieldOption } from './fieldTypes';

export interface IdentifierValue {
  readonly scheme: string;
  readonly value: string;
}

export interface IdentifierFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: IdentifierValue | null;
  readonly onChange?: (value: IdentifierValue | undefined) => void;
  readonly schemes?: readonly FieldOption[];
  readonly schemeLabel?: string;
  readonly valueLabel?: string;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function IdentifierField({
  id: providedId,
  name,
  label,
  value,
  onChange,
  schemes = [],
  schemeLabel = 'Identifier type',
  valueLabel = 'Identifier value',
  placeholder,
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  className = '',
}: IdentifierFieldProps) {
  const id = useFieldId(providedId, 'identifier-field');
  const schemeId = `${id}-scheme`;
  const defaultScheme = schemes[0]?.value ?? '';
  const currentScheme = value?.scheme ?? defaultScheme;
  const currentValue = value?.value ?? '';

  const emit = (scheme: string, nextValue: string) => {
    if (nextValue === '') {
      onChange?.(undefined);
      return;
    }
    onChange?.({ scheme, value: nextValue });
  };

  const selectClasses = [
    'h-10 w-full rounded-lg border bg-surface-card px-3 text-sm text-surface-foreground shadow-sm',
    'transition-[border-color,box-shadow] duration-150 outline-none',
    'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15',
    'disabled:cursor-not-allowed disabled:border-surface-border disabled:bg-surface-muted disabled:text-surface-muted-fg',
    error
      ? 'border-red-400 dark:border-red-500/70'
      : 'border-surface-input hover:border-surface-input-hover',
  ].join(' ');

  const inputClasses = [
    'h-10 w-full rounded-lg border bg-surface-card px-3 text-sm text-surface-foreground shadow-sm',
    'transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-surface-muted-fg',
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-2/5">
            <label htmlFor={schemeId} className="sr-only">
              {schemeLabel}
            </label>
            <select
              id={schemeId}
              value={currentScheme}
              onChange={(event) => emit(event.target.value, currentValue)}
              disabled={disabled || readOnly}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              aria-required={required || undefined}
              className={selectClasses}
            >
              {schemes.length === 0 ? <option value="">{schemeLabel}</option> : null}
              {schemes.map((scheme) => (
                <option key={scheme.value} value={scheme.value}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-1">
            <input
              id={id}
              name={name}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={currentValue}
              placeholder={placeholder ?? valueLabel}
              disabled={disabled}
              readOnly={readOnly}
              onChange={(event) => emit(currentScheme, event.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              aria-required={required || undefined}
              aria-readonly={readOnly || undefined}
              className={inputClasses}
            />
          </div>
        </div>
      )}
    </FieldFrame>
  );
}

export default IdentifierField;

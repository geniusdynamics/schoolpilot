// ABOUTME: Country-aware phone input that emits the schema's E.164 number plus optional label.
// ABOUTME: National formats are normalised on entry; the stored value never contains display punctuation.

import { useEffect, useRef, useState } from 'react';

import type { Phone } from '@/domain/schema/people';
import {
  DIAL_CODES,
  countryOfLocale,
  dialCodeForCountry,
  normalisePhone,
  phonePlaceholder,
  type PhoneParseOptions,
  type PhoneParseResult,
} from '@/utils/locale';
import { FieldFrame, useFieldId } from './FieldFrame';

export { DIAL_CODES, dialCodeForCountry, normalisePhone };
export type { PhoneParseOptions, PhoneParseResult };

export interface PhoneFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: Phone | null;
  readonly onChange?: (value: Phone | undefined) => void;
  /** The country whose dialling plan the entry is read in; the locale's country when omitted. */
  readonly country?: string;
  /** The locale the field belongs to; supplies the default country and example placeholder. */
  readonly locale?: string;
  readonly dialCode?: string;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
  readonly onBlur?: () => void;
  readonly onValidityChange?: (valid: boolean, message?: string) => void;
}

export function PhoneField({
  id: providedId,
  name,
  label,
  value,
  onChange,
  country,
  locale,
  dialCode,
  placeholder,
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  className = '',
  onBlur,
  onValidityChange,
}: PhoneFieldProps) {
  const id = useFieldId(providedId, 'phone-field');
  const resolvedCountry = country ?? countryOfLocale(locale) ?? 'KE';
  const [draft, setDraft] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const editingRef = useRef(false);
  const lastValueKeyRef = useRef<string | null>(null);
  const labelRef = useRef<string | undefined>(value?.label);

  useEffect(() => {
    if (value) labelRef.current = value.label;
  }, [value]);

  const valueKey = value?.number ?? '';
  const displayText = draft ?? value?.number ?? '';
  const visibleError = parseError ?? error ?? undefined;

  useEffect(() => {
    if (editingRef.current) return;
    if (lastValueKeyRef.current === valueKey && draft === null) return;
    lastValueKeyRef.current = valueKey;
    setDraft(null);
    setParseError(null);
  }, [valueKey, draft]);

  const emit = (number: string) => {
    const labelValue = labelRef.current;
    onChange?.(labelValue ? { number, label: labelValue } : { number });
  };

  const handleChange = (text: string) => {
    setDraft(text);
    const result = normalisePhone(text, { country: resolvedCountry, dialCode });
    if (!result.ok) {
      if (result.reason === 'empty') {
        setParseError(null);
        onValidityChange?.(true);
      } else {
        setParseError('Enter a valid phone number.');
        onValidityChange?.(false, 'Enter a valid phone number.');
      }
      onChange?.(undefined);
      return;
    }
    setParseError(null);
    onValidityChange?.(true);
    emit(result.number);
  };

  const handleBlur = () => {
    editingRef.current = false;
    const result = normalisePhone(displayText, { country: resolvedCountry, dialCode });
    if (result.ok || result.reason === 'empty') {
      setDraft(null);
      setParseError(null);
      onValidityChange?.(true);
    } else {
      setParseError('Enter a valid phone number.');
      onValidityChange?.(false, 'Enter a valid phone number.');
    }
    onBlur?.();
  };

  const classes = [
    'h-10 w-full rounded-lg border bg-surface-card px-3 text-sm text-surface-foreground shadow-sm',
    'transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-surface-muted-fg',
    'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15',
    'disabled:cursor-not-allowed disabled:border-surface-border disabled:bg-surface-muted disabled:text-surface-muted-fg',
    visibleError
      ? 'border-red-400 dark:border-red-500/70'
      : 'border-surface-input hover:border-surface-input-hover',
  ].join(' ');

  return (
    <FieldFrame
      id={id}
      label={label}
      helperText={helperText}
      error={visibleError}
      required={required}
      optional={optional}
      className={className}
    >
      {({ describedBy, invalid }) => (
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={displayText}
          placeholder={placeholder ?? phonePlaceholder(resolvedCountry, locale)}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            editingRef.current = true;
            setDraft((current) => current ?? displayText);
          }}
          onBlur={handleBlur}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-readonly={readOnly || undefined}
          className={classes}
        />
      )}
    </FieldFrame>
  );
}

export default PhoneField;

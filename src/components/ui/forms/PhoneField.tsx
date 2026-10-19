// ABOUTME: Country-aware phone input that emits the schema's E.164 number plus optional label.
// ABOUTME: National formats are normalised on entry; the stored value never contains display punctuation.

import { useEffect, useRef, useState } from 'react';

import type { Phone } from '@/domain/schema/people';
import { FieldFrame, useFieldId } from './FieldFrame';

/** Dialling prefixes for the regions SchoolPilot ships with; packs may pass an explicit code. */
export const DIAL_CODES: Readonly<Record<string, string>> = {
  KE: '254',
  UG: '256',
  TZ: '255',
  RW: '250',
  NG: '234',
  GH: '233',
  ZA: '27',
  GB: '44',
  US: '1',
  FR: '33',
  PT: '351',
  ET: '251',
  CM: '237',
  SN: '221',
  CI: '225',
};

export function dialCodeForCountry(country?: string): string | undefined {
  if (!country) return undefined;
  return DIAL_CODES[country.toUpperCase()];
}

export interface PhoneParseOptions {
  readonly country?: string;
  readonly dialCode?: string;
}

export type PhoneParseResult =
  | { readonly ok: true; readonly number: string }
  | { readonly ok: false; readonly reason: 'empty' | 'invalid' };

/**
 * Normalises a national or international number to E.164. Leading zeroes are replaced by
 * the supplied dialling prefix; `00` and bare country-code entries are accepted.
 */
export function normalisePhone(input: string, options: PhoneParseOptions = {}): PhoneParseResult {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };

  const dial = (options.dialCode ?? dialCodeForCountry(options.country) ?? '254').replace(/\D/g, '');
  const compact = trimmed.replace(/[\s().\-/]/g, '');
  if (!/^[+\d]+$/.test(compact)) return { ok: false, reason: 'invalid' };

  let candidate: string;
  if (compact.startsWith('+')) {
    candidate = compact;
  } else if (compact.startsWith('00')) {
    candidate = `+${compact.slice(2)}`;
  } else if (compact.startsWith(dial) && compact.length > dial.length) {
    candidate = `+${compact}`;
  } else if (compact.startsWith('0')) {
    candidate = `+${dial}${compact.slice(1)}`;
  } else {
    candidate = `+${dial}${compact}`;
  }

  if (!/^\+[1-9]\d{1,14}$/.test(candidate)) return { ok: false, reason: 'invalid' };
  return { ok: true, number: candidate };
}

export interface PhoneFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: Phone | null;
  readonly onChange?: (value: Phone | undefined) => void;
  readonly country?: string;
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
  country = 'KE',
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
  const resolvedDialCode = dialCode ?? dialCodeForCountry(country) ?? '254';
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
    const result = normalisePhone(text, { country, dialCode });
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
    const result = normalisePhone(displayText, { country, dialCode });
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
          placeholder={placeholder ?? `+${resolvedDialCode} 700 000000`}
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

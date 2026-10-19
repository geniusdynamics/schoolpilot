// ABOUTME: Money input that stores exact minor units and never routes amounts through floats.
// ABOUTME: Parses and formats with string arithmetic; display formatting is injectable.

import { useEffect, useRef, useState } from 'react';

import type { Money } from '@/domain/schema/common';
import { FieldFrame, useFieldId } from './FieldFrame';

export interface MoneyParseOptions {
  readonly minorUnitDigits?: number;
  readonly decimalSeparator?: string;
  readonly groupSeparator?: string;
  readonly allowNegative?: boolean;
}

export type MoneyParseFailure =
  | 'empty'
  | 'invalid'
  | 'too_precise'
  | 'negative_not_allowed'
  | 'too_large';

export type MoneyParseResult =
  | { readonly ok: true; readonly amountMinor: number }
  | { readonly ok: false; readonly reason: MoneyParseFailure };

function normaliseDigits(value: number | undefined): number {
  if (value === undefined) return 2;
  return Number.isInteger(value) && value >= 0 && value <= 6 ? value : 2;
}

/**
 * Removes a configured thousands separator only when it sits between valid 3-digit groups.
 * Returns null when the grouping is malformed (`1,2,3`, `1,2345`).
 */
function stripValidGrouping(integerPart: string, groupSeparator: string): string | null {
  if (!groupSeparator || !integerPart.includes(groupSeparator)) return integerPart;

  const groups = integerPart.split(groupSeparator);
  if (groups.length < 2) return integerPart;

  const [first, ...rest] = groups;
  if (!/^\d{1,3}$/.test(first)) return null;
  if (!rest.every((group) => /^\d{3}$/.test(group))) return null;
  return groups.join('');
}

/**
 * Parses a user-entered decimal amount into exact minor units. Fractions longer than the
 * currency precision are rejected rather than rounded, and malformed text is rejected
 * instead of having stray characters stripped out.
 */
export function parseMoneyInput(text: string, options: MoneyParseOptions = {}): MoneyParseResult {
  const digits = normaliseDigits(options.minorUnitDigits);
  const decimalSeparator = options.decimalSeparator ?? '.';
  const groupSeparator = options.groupSeparator ?? ',';
  const allowNegative = options.allowNegative ?? true;

  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };

  let negative = false;
  let unsigned = trimmed;
  if (unsigned.startsWith('-')) {
    negative = true;
    unsigned = unsigned.slice(1);
  } else if (unsigned.startsWith('+')) {
    unsigned = unsigned.slice(1);
  }
  if (unsigned === '') return { ok: false, reason: 'invalid' };

  const groupingIsDistinct = Boolean(groupSeparator) && groupSeparator !== decimalSeparator;
  for (const char of unsigned) {
    if (char >= '0' && char <= '9') continue;
    if (char === decimalSeparator) continue;
    if (groupingIsDistinct && char === groupSeparator) continue;
    return { ok: false, reason: 'invalid' };
  }

  const parts = unsigned.split(decimalSeparator);
  if (parts.length > 2) return { ok: false, reason: 'invalid' };

  const integerRaw = parts[0] ?? '';
  const fractionRaw = parts[1] ?? '';
  if (integerRaw === '' && fractionRaw === '') return { ok: false, reason: 'invalid' };
  if (groupingIsDistinct && fractionRaw.includes(groupSeparator)) {
    return { ok: false, reason: 'invalid' };
  }
  if (!/^\d*$/.test(fractionRaw)) return { ok: false, reason: 'invalid' };
  if (fractionRaw.length > digits) return { ok: false, reason: 'too_precise' };

  const integerPart = groupingIsDistinct
    ? stripValidGrouping(integerRaw, groupSeparator)
    : integerRaw;
  if (integerPart === null || !/^\d*$/.test(integerPart)) {
    return { ok: false, reason: 'invalid' };
  }
  if (negative && !allowNegative) return { ok: false, reason: 'negative_not_allowed' };

  const integerDigits = integerPart === '' ? '0' : integerPart;
  const fractionPart = fractionRaw.padEnd(digits, '0');
  const minor = BigInt(`${integerDigits}${fractionPart}`);
  const signed = negative ? -minor : minor;
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  if (signed > max || signed < min) return { ok: false, reason: 'too_large' };

  return { ok: true, amountMinor: Number(signed) };
}

/** Formats exact minor units as a grouped decimal string without floating-point maths. */
export function formatMinorUnits(
  amountMinor: number,
  digits = 2,
  groupSeparator = ',',
  decimalSeparator = '.'
): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('amountMinor must be a safe integer');
  }

  const precision = normaliseDigits(digits);
  const negative = amountMinor < 0;
  const absolute = Math.abs(amountMinor).toString();
  const padded = precision > 0 ? absolute.padStart(precision + 1, '0') : absolute;
  const integerPart = precision > 0 ? padded.slice(0, -precision) : padded;
  const fractionPart = precision > 0 ? padded.slice(-precision) : '';
  const grouped = groupSeparator
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
    : integerPart;

  return `${negative ? '-' : ''}${grouped}${fractionPart ? `${decimalSeparator}${fractionPart}` : ''}`;
}

function moneyMessage(reason: MoneyParseFailure, digits: number): string | null {
  switch (reason) {
    case 'empty':
      return null;
    case 'too_precise':
      return `Use no more than ${digits} decimal place${digits === 1 ? '' : 's'}.`;
    case 'negative_not_allowed':
      return 'Amount cannot be negative.';
    case 'too_large':
      return 'Amount is too large.';
    case 'invalid':
    default:
      return 'Enter a valid amount.';
  }
}

export interface MoneyFieldProps {
  readonly id?: string;
  readonly name?: string;
  readonly label?: string;
  readonly value?: Money | null;
  readonly onChange?: (value: Money | undefined) => void;
  readonly currency?: string;
  readonly minorUnitDigits?: number;
  readonly decimalSeparator?: string;
  readonly groupSeparator?: string;
  readonly allowNegative?: boolean;
  readonly formatMoney?: (money: Money) => string;
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

export function MoneyField({
  id: providedId,
  name,
  label,
  value,
  onChange,
  currency = 'KES',
  minorUnitDigits,
  decimalSeparator = '.',
  groupSeparator = ',',
  allowNegative = true,
  formatMoney,
  placeholder = '0.00',
  helperText,
  error,
  required = false,
  optional = false,
  disabled = false,
  readOnly = false,
  className = '',
  onBlur,
  onValidityChange,
}: MoneyFieldProps) {
  const id = useFieldId(providedId, 'money-field');
  const digits = normaliseDigits(minorUnitDigits);
  const [draft, setDraft] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const editingRef = useRef(false);
  const lastValueKeyRef = useRef<string | null>(null);

  const valueKey = value ? `${value.amount_minor}:${value.currency}` : '';
  const displayCurrency = value?.currency ?? currency;

  const formatValue = (money: Money): string =>
    formatMoney
      ? formatMoney(money)
      : formatMinorUnits(money.amount_minor, digits, groupSeparator, decimalSeparator);

  const displayText = draft ?? (value ? formatValue(value) : '');
  const visibleError = parseError ?? error ?? undefined;

  useEffect(() => {
    if (editingRef.current) return;
    if (lastValueKeyRef.current === valueKey && draft === null) return;
    lastValueKeyRef.current = valueKey;
    setDraft(null);
    setParseError(null);
  }, [valueKey, draft]);

  const parseOptions: MoneyParseOptions = {
    minorUnitDigits: digits,
    decimalSeparator,
    groupSeparator,
    allowNegative,
  };

  const handleChange = (text: string) => {
    setDraft(text);
    const result = parseMoneyInput(text, parseOptions);

    if (!result.ok) {
      const message = moneyMessage(result.reason, digits);
      setParseError(message);
      if (result.reason === 'empty') {
        onValidityChange?.(true);
      } else {
        onValidityChange?.(false, message ?? 'Enter a valid amount.');
      }
      onChange?.(undefined);
      return;
    }

    setParseError(null);
    onValidityChange?.(true);
    onChange?.({ amount_minor: result.amountMinor, currency: value?.currency ?? currency });
  };

  const handleBlur = () => {
    editingRef.current = false;
    const result = parseMoneyInput(displayText, parseOptions);
    if (result.ok || result.reason === 'empty') {
      setDraft(null);
      setParseError(null);
      onValidityChange?.(true);
    } else {
      const message = moneyMessage(result.reason, digits) ?? 'Enter a valid amount.';
      setParseError(message);
      onValidityChange?.(false, message);
    }
    onBlur?.();
  };

  const classes = [
    'h-10 w-full rounded-lg border bg-surface-card px-3 pr-16 text-sm text-surface-foreground shadow-sm',
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
        <div className="relative">
          <input
            id={id}
            name={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={displayText}
            placeholder={placeholder}
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
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-surface-muted-fg"
          >
            {displayCurrency}
          </span>
        </div>
      )}
    </FieldFrame>
  );
}

export default MoneyField;

// ABOUTME: Default widget registry that renders every schema-bound form field from metadata.
// ABOUTME: Widgets may be overridden by the form; entity lookups arrive through the field context.

import React from 'react';

import { moneySchema, type Money } from '@/domain/schema/common';
import { phoneSchema, type Phone } from '@/domain/schema/people';
import CheckboxField from './CheckboxField';
import DateField from './DateField';
import EntityField from './EntityField';
import FieldFrame from './FieldFrame';
import IdentifierField, { type IdentifierValue } from './IdentifierField';
import MoneyField from './MoneyField';
import PhoneField from './PhoneField';
import SelectField from './SelectField';
import TextField, { TextareaField } from './TextField';
import { isPlainRecord, type EntityFormFieldMeta, type EntityFormLookup, type FieldOption, type FieldWidget } from './fieldTypes';

export interface FieldWidgetProps {
  readonly meta: EntityFormFieldMeta;
  readonly id: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly error?: string;
  readonly options?: readonly FieldOption[];
  readonly lookup?: EntityFormLookup;
  /** Widget-local parse validity; the form blocks submit while any field reports false. */
  readonly onValidityChange?: (valid: boolean, message?: string) => void;
}

export type FieldWidgetRenderer = (props: FieldWidgetProps) => React.ReactNode;
export type FieldWidgetRegistry = Record<FieldWidget, FieldWidgetRenderer>;

function optionalFlag(meta: EntityFormFieldMeta): boolean {
  return meta.required === false;
}

function asMoney(value: unknown): Money | undefined {
  const parsed = moneySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function asPhone(value: unknown): Phone | undefined {
  const parsed = phoneSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function asIdentifier(value: unknown): IdentifierValue | undefined {
  if (!isPlainRecord(value)) return undefined;
  const { scheme, value: identifier } = value;
  return typeof scheme === 'string' && typeof identifier === 'string'
    ? { scheme, value: identifier }
    : undefined;
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function asNumber(value: unknown): string | number {
  return typeof value === 'number' ? value : '';
}

function asEntityId(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

const dateFieldRenderer: FieldWidgetRenderer = ({
  meta,
  id,
  value,
  onChange,
  disabled,
  readOnly,
  required,
  error,
}) => (
  <FieldFrame
    id={id}
    label={meta.label}
    helperText={meta.help}
    error={error}
    required={required}
    optional={optionalFlag(meta)}
  >
    {({ describedBy, invalid }) => (
      <DateField
        id={id}
        name={meta.path}
        label={meta.label}
        value={typeof value === 'string' ? value : ''}
        onChange={(next) => onChange(next === '' ? undefined : next)}
        disabled={disabled || readOnly}
        errorState={invalid}
        minDate={typeof meta.min === 'string' ? meta.min : undefined}
        maxDate={typeof meta.max === 'string' ? meta.max : undefined}
        placeholder={meta.placeholder}
        aria-label={meta.label}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
      />
    )}
  </FieldFrame>
);

const entityRenderer: FieldWidgetRenderer = ({
  meta,
  id,
  value,
  onChange,
  disabled,
  readOnly,
  required,
  error,
  lookup,
}) => {
  if (!lookup) {
    const configError = error ?? 'No options are configured for this field.';
    return (
      <FieldFrame
        id={id}
        label={meta.label}
        helperText={meta.help}
        error={configError}
        required={required}
        optional={optionalFlag(meta)}
      >
        {({ describedBy, invalid }) => (
          <input
            id={id}
            type="text"
            value=""
            disabled
            readOnly
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className="h-10 w-full rounded-lg border border-surface-input bg-surface-muted px-3 text-sm text-surface-muted-fg"
          />
        )}
      </FieldFrame>
    );
  }

  return (
    <EntityField
      id={id}
      name={meta.path}
      label={meta.label}
      value={asEntityId(value)}
      onChange={(next) => onChange(next)}
      lookup={lookup}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
};

/** Default renderers keyed by widget hint. */
export const defaultFieldWidgets: FieldWidgetRegistry = {
  text: ({ meta, id, value, onChange, disabled, readOnly, required, error }) => (
    <TextField
      id={id}
      name={meta.path}
      label={meta.label}
      type="text"
      value={asText(value)}
      onChange={onChange}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={meta.autoComplete}
    />
  ),
  email: ({ meta, id, value, onChange, disabled, readOnly, required, error }) => (
    <TextField
      id={id}
      name={meta.path}
      label={meta.label}
      type="email"
      value={asText(value)}
      onChange={onChange}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={meta.autoComplete}
    />
  ),
  number: ({ meta, id, value, onChange, disabled, readOnly, required, error }) => (
    <TextField
      id={id}
      name={meta.path}
      label={meta.label}
      type="number"
      value={asNumber(value)}
      onChange={(text) => {
        if (text.trim() === '') {
          onChange(undefined);
          return;
        }
        const next = Number(text);
        onChange(Number.isFinite(next) ? next : undefined);
      }}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
      min={meta.min}
      max={meta.max}
      step={meta.step}
    />
  ),
  textarea: ({ meta, id, value, onChange, disabled, readOnly, required, error }) => (
    <TextareaField
      id={id}
      name={meta.path}
      label={meta.label}
      value={asText(value)}
      onChange={onChange}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
      rows={meta.rows}
    />
  ),
  date: dateFieldRenderer,
  money: ({ meta, id, value, onChange, disabled, readOnly, required, error, onValidityChange }) => (
    <MoneyField
      id={id}
      name={meta.path}
      label={meta.label}
      value={asMoney(value)}
      onChange={(next) => onChange(next)}
      currency={meta.currency}
      minorUnitDigits={meta.minorUnitDigits}
      decimalSeparator={meta.decimalSeparator}
      groupSeparator={meta.groupSeparator}
      formatMoney={meta.formatMoney}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
      onValidityChange={onValidityChange}
    />
  ),
  phone: ({ meta, id, value, onChange, disabled, readOnly, required, error, onValidityChange }) => (
    <PhoneField
      id={id}
      name={meta.path}
      label={meta.label}
      value={asPhone(value)}
      onChange={(next) => onChange(next)}
      country={meta.country}
      dialCode={meta.dialCode}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
      onValidityChange={onValidityChange}
    />
  ),
  identifier: ({ meta, id, value, onChange, disabled, readOnly, required, error }) => (
    <IdentifierField
      id={id}
      name={meta.path}
      label={meta.label}
      value={asIdentifier(value)}
      onChange={(next) => onChange(next)}
      schemes={meta.schemes}
      schemeLabel={meta.schemeLabel}
      valueLabel={meta.valueLabel}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
    />
  ),
  entity: entityRenderer,
  select: ({ meta, id, value, onChange, disabled, readOnly, required, error, options }) => (
    <SelectField
      id={id}
      name={meta.path}
      label={meta.label}
      value={typeof value === 'string' ? value : undefined}
      onChange={onChange}
      options={options}
      placeholder={meta.placeholder}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
    />
  ),
  checkbox: ({ meta, id, value, onChange, disabled, readOnly, required, error }) => (
    <CheckboxField
      id={id}
      name={meta.path}
      label={meta.label}
      value={Boolean(value)}
      onChange={onChange}
      helperText={meta.help}
      error={error}
      required={required}
      optional={optionalFlag(meta)}
      disabled={disabled}
      readOnly={readOnly}
    />
  ),
};

/** Merges task-specific widgets over the defaults without mutating the registry. */
export function createFieldWidgetRegistry(
  overrides: Partial<FieldWidgetRegistry> = {}
): FieldWidgetRegistry {
  return { ...defaultFieldWidgets, ...overrides };
}

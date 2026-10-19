// ABOUTME: Tests for MoneyField's exact minor-unit parsing, formatting and accessibility wiring.
// ABOUTME: Covers decimal precision, negative values, safe-integer limits and display overrides.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MoneyField, { formatMinorUnits, parseMoneyInput } from '../MoneyField';

describe('parseMoneyInput', () => {
  it('converts decimal text to exact minor units', () => {
    expect(parseMoneyInput('1,234.56')).toEqual({ ok: true, amountMinor: 123456 });
    expect(parseMoneyInput('0.05')).toEqual({ ok: true, amountMinor: 5 });
    expect(parseMoneyInput('0.29')).toEqual({ ok: true, amountMinor: 29 });
    expect(parseMoneyInput('12')).toEqual({ ok: true, amountMinor: 1200 });
    expect(parseMoneyInput('12.3')).toEqual({ ok: true, amountMinor: 1230 });
    expect(parseMoneyInput('.5')).toEqual({ ok: true, amountMinor: 50 });
    expect(parseMoneyInput('0')).toEqual({ ok: true, amountMinor: 0 });
    expect(parseMoneyInput('-1.50')).toEqual({ ok: true, amountMinor: -150 });
  });

  it('rejects malformed text instead of stripping characters', () => {
    expect(parseMoneyInput('1e3')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('12abc34')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('1,2,3')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('1,2345')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('--1')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('1..2')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('KES 1,234')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('1 234')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('accepts valid multi-group formatting', () => {
    expect(parseMoneyInput('1,234,567.89')).toEqual({ ok: true, amountMinor: 123456789 });
    expect(parseMoneyInput('12,345.6')).toEqual({ ok: true, amountMinor: 1234560 });
  });

  it('rejects excess precision instead of rounding', () => {
    expect(parseMoneyInput('0.005')).toEqual({ ok: false, reason: 'too_precise' });
    expect(parseMoneyInput('1.999')).toEqual({ ok: false, reason: 'too_precise' });
  });

  it('handles zero-decimal currencies', () => {
    expect(parseMoneyInput('1,000', { minorUnitDigits: 0 })).toEqual({
      ok: true,
      amountMinor: 1000,
    });
    expect(parseMoneyInput('1,000.5', { minorUnitDigits: 0 })).toEqual({
      ok: false,
      reason: 'too_precise',
    });
  });

  it('rejects invalid, empty and unsafe values', () => {
    expect(parseMoneyInput('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseMoneyInput('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseMoneyInput('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('12.3.4')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoneyInput('-2', { allowNegative: false })).toEqual({
      ok: false,
      reason: 'negative_not_allowed',
    });
    expect(parseMoneyInput('90071992547409.92')).toEqual({ ok: false, reason: 'too_large' });
    expect(parseMoneyInput('90071992547409.91')).toEqual({
      ok: true,
      amountMinor: 9007199254740991,
    });
  });

  it('supports an alternate decimal separator', () => {
    expect(parseMoneyInput('1.234,56', { decimalSeparator: ',', groupSeparator: '.' })).toEqual({
      ok: true,
      amountMinor: 123456,
    });
  });
});

describe('formatMinorUnits', () => {
  it('formats exact minor units without floating-point maths', () => {
    expect(formatMinorUnits(600000)).toBe('6,000.00');
    expect(formatMinorUnits(5)).toBe('0.05');
    expect(formatMinorUnits(1234)).toBe('12.34');
    expect(formatMinorUnits(0)).toBe('0.00');
    expect(formatMinorUnits(-150)).toBe('-1.50');
    expect(formatMinorUnits(1000, 0)).toBe('1,000');
    expect(formatMinorUnits(9007199254740991)).toBe('90,071,992,547,409.91');
  });
});

describe('MoneyField', () => {
  it('displays the stored amount with the document currency', () => {
    render(
      <MoneyField
        label="Total"
        value={{ amount_minor: 600000, currency: 'KES' }}
        onChange={vi.fn()}
        helperText="School currency"
      />
    );

    expect(screen.getByLabelText('Total')).toHaveValue('6,000.00');
    expect(screen.getByText('KES')).toBeInTheDocument();
    expect(screen.getByText('School currency')).toBeInTheDocument();
  });

  it('emits exact minor units for typed amounts and clears to undefined', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MoneyField
        label="Total"
        value={{ amount_minor: 600000, currency: 'KES' }}
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText('Total');
    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(undefined);

    await user.type(input, '1,234.56');
    expect(onChange).toHaveBeenLastCalledWith({ amount_minor: 123456, currency: 'KES' });

    await user.clear(input);
    await user.type(input, '0.29');
    expect(onChange).toHaveBeenLastCalledWith({ amount_minor: 29, currency: 'KES' });
  });

  it('shows a precision error that is linked to the input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyField label="Total" onChange={onChange} />);

    const input = screen.getByLabelText('Total');
    await user.type(input, '12.345');
    await user.tab();

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Use no more than 2 decimal places.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('honours an injected display formatter without changing the stored value', () => {
    render(
      <MoneyField
        label="Amount"
        value={{ amount_minor: 123456, currency: 'UGX' }}
        onChange={vi.fn()}
        formatMoney={(money) => `${money.currency} ${money.amount_minor}`}
      />
    );

    expect(screen.getByLabelText('Amount')).toHaveValue('UGX 123456');
  });

  it('disables the control while a save is in flight', () => {
    render(
      <MoneyField
        label="Total"
        value={{ amount_minor: 100, currency: 'KES' }}
        onChange={vi.fn()}
        disabled
      />
    );

    expect(screen.getByLabelText('Total')).toBeDisabled();
  });
});

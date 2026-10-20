// ABOUTME: Tests for country-aware phone normalisation and the PhoneField schema shape.
// ABOUTME: Verifies E.164 output, national-format entry, label preservation and error wiring.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PhoneField, { dialCodeForCountry, normalisePhone } from '../PhoneField';

describe('dialCodeForCountry', () => {
  it('resolves supported countries and ignores unknown ones', () => {
    expect(dialCodeForCountry('KE')).toBe('254');
    expect(dialCodeForCountry('ug')).toBe('256');
    expect(dialCodeForCountry('GB')).toBe('44');
    expect(dialCodeForCountry('ZZ')).toBeUndefined();
    expect(dialCodeForCountry()).toBeUndefined();
  });
});

describe('normalisePhone', () => {
  it('turns national, international and zero-prefixed numbers into E.164', () => {
    expect(normalisePhone('0712 345 678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('+254 712 345 678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('00254712345678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('254712345678', { country: 'KE' })).toEqual({
      ok: true,
      number: '+254712345678',
    });
    expect(normalisePhone('0772 000 000', { country: 'UG' })).toEqual({
      ok: true,
      number: '+256772000000',
    });
  });

  it('rejects empty, alphabetic and overlong numbers', () => {
    expect(normalisePhone('', { country: 'KE' })).toEqual({ ok: false, reason: 'empty' });
    expect(normalisePhone('abc', { country: 'KE' })).toEqual({ ok: false, reason: 'invalid' });
    expect(normalisePhone('+2547123456789012345', { country: 'KE' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('honours an explicit dial code over the country map', () => {
    expect(normalisePhone('0712345678', { dialCode: '255' })).toEqual({
      ok: true,
      number: '+255712345678',
    });
  });
});

describe('PhoneField', () => {
  it('renders the stored E.164 number and preserves its label on edit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PhoneField
        label="Phone"
        value={{ number: '+254711000000', label: 'parent' }}
        onChange={onChange}
        country="KE"
      />
    );

    const input = screen.getByLabelText('Phone');
    expect(input).toHaveValue('+254711000000');

    await user.clear(input);
    await user.type(input, '0712 345 678');

    expect(onChange).toHaveBeenLastCalledWith({
      number: '+254712345678',
      label: 'parent',
    });
  });

  it('shows an E.164 error on blur and links it to the input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneField label="Phone" onChange={onChange} country="KE" />);

    const input = screen.getByLabelText('Phone');
    await user.type(input, 'not-a-phone');
    await user.tab();

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Enter a valid phone number.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('uses the country dial code in the placeholder', () => {
    render(<PhoneField label="Phone" onChange={vi.fn()} country="UG" />);
    expect(screen.getByLabelText('Phone')).toHaveAttribute('placeholder', '+256 700 000000');
  });

  it('disables the control while saving', () => {
    render(
      <PhoneField
        label="Phone"
        value={{ number: '+254711000000' }}
        onChange={vi.fn()}
        disabled
      />
    );
    expect(screen.getByLabelText('Phone')).toBeDisabled();
  });
});

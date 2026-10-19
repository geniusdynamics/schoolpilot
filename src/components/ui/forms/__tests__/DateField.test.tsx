// ABOUTME: Tests for the form DateField string contract, including DST boundary dates.
// ABOUTME: Asserts that typed and seeded dates keep the exact YYYY-MM-DD calendar day.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DateField from '../DateField';

describe('DateField', () => {
  it('keeps the ISO calendar day for spring and autumn DST boundaries', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" value="" onChange={onChange} locale="en-GB" />);

    const input = screen.getByLabelText('Date');
    await user.type(input, '2024-03-31');
    expect(onChange).toHaveBeenLastCalledWith('2024-03-31');

    await user.clear(input);
    await user.type(input, '2024-11-03');
    expect(onChange).toHaveBeenLastCalledWith('2024-11-03');

    await user.clear(input);
    await user.type(input, '2024-12-31');
    expect(onChange).toHaveBeenLastCalledWith('2024-12-31');
  });

  it('accepts locale-order typing and emits the same calendar day', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date of birth" value="" onChange={onChange} locale="en-KE" />);

    await user.type(screen.getByLabelText('Date of birth'), '15/03/2014');

    expect(onChange).toHaveBeenLastCalledWith('2014-03-15');
  });

  it('formats a seeded ISO value without timezone drift', () => {
    const { rerender } = render(
      <DateField label="Start date" value="2024-03-31" onChange={vi.fn()} locale="en-KE" />
    );

    expect(screen.getByLabelText('Start date')).toHaveValue('31/03/2024');

    rerender(
      <DateField label="Start date" value="2024-11-03" onChange={vi.fn()} locale="en-KE" />
    );

    expect(screen.getByLabelText('Start date')).toHaveValue('03/11/2024');
  });

  it('does not emit an impossible calendar date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" value="" onChange={onChange} locale="en-GB" />);

    const input = screen.getByLabelText('Date');
    await user.type(input, '31/04/2027');
    await user.tab();

    expect(onChange).not.toHaveBeenCalledWith('2027-04-31');
    expect(input).toHaveValue('');
  });

  it('clears back to an empty string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" value="" onChange={onChange} locale="en-GB" />);

    const input = screen.getByLabelText('Date');
    await user.type(input, '29/02/2024');
    expect(onChange).toHaveBeenLastCalledWith('2024-02-29');

    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('exposes error and required wiring to the control', () => {
    render(
      <DateField
        label="Admission date"
        value="2027-01-05"
        onChange={vi.fn()}
        error="Admission date is required"
        errorState
        aria-describedby="admission-help admission-error"
        aria-required
      />
    );

    const input = screen.getByLabelText('Admission date');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(
      'admission-help admission-error'
    );
    expect(input).toHaveAttribute('aria-required', 'true');
  });
});

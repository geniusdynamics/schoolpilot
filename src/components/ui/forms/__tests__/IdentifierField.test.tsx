// ABOUTME: Tests for IdentifierField's scheme-plus-value shape and opaque string handling.
// ABOUTME: Leading zeroes and punctuation must survive exactly; the scheme change keeps the value.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import IdentifierField, { type IdentifierValue } from '../IdentifierField';

const SCHEMES = [
  { value: 'ke.kemis_upi', label: 'KEMIS UPI' },
  { value: 'national_id', label: 'National ID' },
];

function Harness({ onChange }: { onChange: (value: IdentifierValue | undefined) => void }) {
  const [value, setValue] = useState<IdentifierValue | undefined>(undefined);
  return (
    <IdentifierField
      label="Learner identifier"
      schemes={SCHEMES}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('IdentifierField', () => {
  it('shows the stored scheme and value', () => {
    render(
      <IdentifierField
        label="Learner identifier"
        schemes={SCHEMES}
        value={{ scheme: 'ke.kemis_upi', value: '00123' }}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Learner identifier')).toHaveValue('00123');
    expect(screen.getByLabelText('Identifier type')).toHaveValue('ke.kemis_upi');
  });

  it('keeps leading zeroes and never coerces the value to a number', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: IdentifierValue | undefined) => void>();
    render(<Harness onChange={onChange} />);

    const input = screen.getByLabelText('Learner identifier');
    await user.type(input, '000456');

    expect(onChange).toHaveBeenLastCalledWith({ scheme: 'ke.kemis_upi', value: '000456' });
    expect(onChange.mock.calls.every(([value]) => typeof value?.value === 'string')).toBe(true);
  });

  it('changes the scheme without losing the current value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IdentifierField
        label="Learner identifier"
        schemes={SCHEMES}
        value={{ scheme: 'ke.kemis_upi', value: 'A-000123' }}
        onChange={onChange}
      />
    );

    await user.selectOptions(screen.getByLabelText('Identifier type'), 'national_id');

    expect(onChange).toHaveBeenLastCalledWith({
      scheme: 'national_id',
      value: 'A-000123',
    });
  });

  it('clears an optional identifier when the value is emptied', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IdentifierField
        label="Learner identifier"
        schemes={SCHEMES}
        value={{ scheme: 'ke.kemis_upi', value: '00123' }}
        onChange={onChange}
      />
    );

    await user.clear(screen.getByLabelText('Learner identifier'));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('keeps opaque punctuation and spaces unchanged', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.type(screen.getByLabelText('Learner identifier'), ' AB 12/34 ');

    expect(onChange).toHaveBeenLastCalledWith({
      scheme: 'ke.kemis_upi',
      value: ' AB 12/34 ',
    });
  });

  it('links its error to both controls and marks them invalid', () => {
    render(
      <IdentifierField
        label="Learner identifier"
        schemes={SCHEMES}
        value={{ scheme: 'ke.kemis_upi', value: '' }}
        onChange={vi.fn()}
        error="Identifier value is required"
      />
    );

    const input = screen.getByLabelText('Learner identifier');
    const select = screen.getByLabelText('Identifier type');
    const error = screen.getByRole('alert');

    expect(error).toHaveTextContent('Identifier value is required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(select.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('disables both controls while saving', () => {
    render(
      <IdentifierField
        label="Learner identifier"
        schemes={SCHEMES}
        value={{ scheme: 'ke.kemis_upi', value: '00123' }}
        onChange={vi.fn()}
        disabled
      />
    );

    expect(screen.getByLabelText('Learner identifier')).toBeDisabled();
    expect(screen.getByLabelText('Identifier type')).toBeDisabled();
  });
});

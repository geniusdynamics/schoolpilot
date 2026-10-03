// ABOUTME: Tests for the premium Switch and Radio/RadioGroup controls
// ABOUTME: Covers toggling callbacks, group selection, disabled state

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import Switch from '@/components/ui/Switch';
import { Radio, RadioGroup } from '@/components/ui/Radio';

describe('Switch', () => {
  it('renders with role switch and toggles via onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch label="Dark mode" checked={false} onChange={handleChange} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('respects controlled checked state', () => {
    render(<Switch label="Enabled" checked aria-label="Enabled" />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch label="Locked" checked={false} onChange={handleChange} disabled />);

    await user.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe('RadioGroup', () => {
  const options = [
    { value: 'store', label: 'Return to store' },
    { value: 'supplier', label: 'Return to supplier' },
  ];

  it('renders a radiogroup with radio options', () => {
    render(
      <RadioGroup name="return-type" value="store" onChange={() => {}} options={options} />
    );

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Return to store' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Return to supplier' })).not.toBeChecked();
  });

  it('reports the selected option value through onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <RadioGroup name="return-type" value="store" onChange={handleChange} options={options} />
    );

    await user.click(screen.getByRole('radio', { name: 'Return to supplier' }));
    expect(handleChange).toHaveBeenCalledWith('supplier');
  });

  it('disables all options when the group is disabled', () => {
    render(
      <RadioGroup name="return-type" value="" onChange={() => {}} options={options} disabled />
    );

    expect(screen.getByRole('radio', { name: 'Return to store' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Return to supplier' })).toBeDisabled();
  });

  it('renders standalone Radio without crashing', () => {
    render(<Radio name="solo" label="Solo option" />);
    expect(screen.getByRole('radio', { name: 'Solo option' })).toBeInTheDocument();
  });
});

// ABOUTME: Test suite for Input component focus/state treatments
// ABOUTME: Verifies the tokenized focus rings and status-state styling

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Input from '@/components/ui/Input';

// Mock the animation utilities
vi.mock('../utils/animations', () => ({
  useTransition: () => ({}),
}));

describe('Input Focus & State Effects', () => {
  it('applies the primary accent focus treatment', async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" />);

    const input = screen.getByLabelText('Test Input');
    await user.click(input);

    // Focus styling is CSS-driven via ring utilities
    expect(input).toHaveClass('focus:border-primary-500');
    expect(input).toHaveClass('focus:ring-4');
    expect(input).toHaveClass('focus:ring-primary-500/15');
  });

  it('applies error state styling', async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" error="Test error" />);

    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('border-red-400');
    expect(input).toHaveClass('focus:ring-red-500/15');

    await user.click(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies success state styling', async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" success={true} />);

    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('border-green-400');
    expect(input).toHaveClass('focus:ring-green-500/15');
  });

  it('disables interaction while loading and shows a spinner', () => {
    render(<Input label="Test Input" loading={true} />);

    const input = screen.getByLabelText('Test Input');
    expect(input).toBeDisabled();

    // Loading adornment (spinner) is rendered inside the control row
    const spinner = input.parentElement?.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies hover border treatment', () => {
    render(<Input label="Test Input" />);

    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('hover:border-surface-input-hover');
  });
});

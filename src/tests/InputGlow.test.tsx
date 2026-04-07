// ABOUTME: Test suite for Input component glow effects
// ABOUTME: Tests that glow CSS classes are applied correctly

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Input from '@/components/ui/Input';

// Mock the animation utilities
vi.mock('../utils/animations', () => ({
  useTransition: () => ({}),
}));

describe('Input Glow Effects', () => {
  it('applies glow-focus class when focused', async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" />);
    
    const input = screen.getByLabelText('Test Input');
    await user.click(input);
    
    // Check that the input has glow-focus class applied
    expect(input).toHaveClass('glow-focus');
  });

  it('applies glow-error class when focused with error', async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" error="Test error" />);
    
    const input = screen.getByLabelText('Test Input');
    await user.click(input);
    
    // Check that the input has glow-error class applied
    expect(input).toHaveClass('glow-error');
  });

  it('applies glow-success class when focused with success', async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" success={true} />);
    
    const input = screen.getByLabelText('Test Input');
    await user.click(input);
    
    // Check that the input has glow-success class applied
    expect(input).toHaveClass('glow-success');
  });

  it('applies glow-pulse class when loading', () => {
    render(<Input label="Test Input" loading={true} />);
    
    const input = screen.getByLabelText('Test Input');
    
    // Check that the input has glow-pulse class applied
    expect(input).toHaveClass('glow-pulse');
  });

  it('applies hover:glow-subtle class for hover effects', () => {
    render(<Input label="Test Input" />);
    
    const input = screen.getByLabelText('Test Input');
    
    // Check that the input has hover:glow-subtle class applied
    expect(input).toHaveClass('hover:glow-subtle');
  });
});
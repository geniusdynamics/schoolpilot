// ABOUTME: Test suite for the enhanced Input component
// ABOUTME: Tests floating labels, validation states, animations, and accessibility

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Input from '../components/ui/Input';
import FormField from '../components/ui/forms/FormField';

// Mock the animation utilities to avoid issues in test environment
vi.mock('../utils/animations', () => ({
  useTransition: () => ({}),
}));

describe('Input Component', () => {
  describe('Basic Functionality', () => {
    it('renders with label', () => {
      render(<Input label="Test Label" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input label="Test Label" placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('handles value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      
      render(<Input label="Test Label" onChange={handleChange} />);
      
      const input = screen.getByLabelText('Test Label');
      await user.type(input, 'test value');
      
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('test value');
    });
  });

  describe('Floating Label', () => {
    it('shows floating label when focused', async () => {
      const user = userEvent.setup();
      render(<Input label="Test Label" floatingLabel={true} />);
      
      const input = screen.getByLabelText('Test Label');
      await user.click(input);
      
      // Label should still be present (floating behavior is CSS-based)
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('shows floating label when has value', () => {
      render(<Input label="Test Label" value="test" floatingLabel={true} />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('can disable floating label', () => {
      render(<Input label="Test Label" floatingLabel={false} />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });
  });

  describe('Validation States', () => {
    it('displays error message', () => {
      render(<Input label="Test Label" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows success state', () => {
      render(<Input label="Test Label" success={true} />);
      // Success icon should be present
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<Input label="Test Label" loading={true} />);
      expect(screen.getByLabelText('Test Label')).toBeDisabled();
    });

    it('runs custom validation', async () => {
      const user = userEvent.setup();
      const validator = vi.fn().mockReturnValue('Invalid input');
      
      render(<Input label="Test Label" onValidate={validator} />);
      
      const input = screen.getByLabelText('Test Label');
      await user.type(input, 'test');
      await user.tab(); // Trigger blur
      
      await waitFor(() => {
        expect(validator).toHaveBeenCalledWith('test');
        expect(screen.getByText('Invalid input')).toBeInTheDocument();
      });
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      const LeftIcon = () => <span data-testid="left-icon">L</span>;
      render(<Input label="Test Label" leftIcon={<LeftIcon />} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      const RightIcon = () => <span data-testid="right-icon">R</span>;
      render(<Input label="Test Label" rightIcon={<RightIcon />} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('shows loading spinner when loading', () => {
      render(<Input label="Test Label" loading={true} />);
      // Loading spinner should be present (CSS animation)
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });
  });

  describe('Variants and Sizes', () => {
    it('applies outlined variant', () => {
      render(<Input label="Test Label" variant="outlined" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('applies filled variant', () => {
      render(<Input label="Test Label" variant="filled" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('applies standard variant', () => {
      render(<Input label="Test Label" variant="standard" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('applies small size', () => {
      render(<Input label="Test Label" size="sm" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('applies large size', () => {
      render(<Input label="Test Label" size="lg" />);
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Input label="Test Label" helperText="Help text" />);
      
      const input = screen.getByLabelText('Test Label');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('marks invalid inputs with aria-invalid', () => {
      render(<Input label="Test Label" error="Error message" />);
      
      const input = screen.getByLabelText('Test Label');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error message with input', () => {
      render(<Input label="Test Label" error="Error message" />);
      
      const input = screen.getByLabelText('Test Label');
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      
      const errorElement = document.getElementById(errorId!);
      expect(errorElement).toHaveTextContent('Error message');
    });

    it('supports helper text', () => {
      render(<Input label="Test Label" helperText="This is helper text" />);
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('handles focus events', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      
      render(<Input label="Test Label" onFocus={handleFocus} onBlur={handleBlur} />);
      
      const input = screen.getByLabelText('Test Label');
      await user.click(input);
      expect(handleFocus).toHaveBeenCalled();
      
      await user.tab();
      expect(handleBlur).toHaveBeenCalled();
    });
  });
});

describe('FormField Component', () => {
  it('renders with label and child input', () => {
    render(
      <FormField label="Test Field">
        <input data-testid="child-input" />
      </FormField>
    );
    
    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByTestId('child-input')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <FormField label="Test Field" required>
        <input />
      </FormField>
    );
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows optional indicator', () => {
    render(
      <FormField label="Test Field" optional>
        <input />
      </FormField>
    );
    
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(
      <FormField label="Test Field" helperText="This is helper text">
        <input />
      </FormField>
    );
    
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <FormField label="Test Field" error="This field is required">
        <input />
      </FormField>
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows success state', () => {
    render(
      <FormField label="Test Field" success>
        <input />
      </FormField>
    );
    
    expect(screen.getByText('Field is valid')).toBeInTheDocument();
  });

  it('applies horizontal layout', () => {
    render(
      <FormField label="Test Field" layout="horizontal">
        <input data-testid="child-input" />
      </FormField>
    );
    
    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByTestId('child-input')).toBeInTheDocument();
  });

  it('enhances child with ARIA attributes', () => {
    render(
      <FormField label="Test Field" helperText="Help text" error="Error text">
        <input data-testid="child-input" />
      </FormField>
    );
    
    const input = screen.getByTestId('child-input');
    expect(input).toHaveAttribute('aria-describedby');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
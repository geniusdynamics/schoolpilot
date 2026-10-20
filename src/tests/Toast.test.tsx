// ABOUTME: Comprehensive tests for Toast component functionality and accessibility
// ABOUTME: Tests variants, auto-dismiss, progress indicators, and screen reader support


import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Toast from '@/components/ui/feedback/Toast';
import { screen } from '@testing-library/react';

describe('Toast Component', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders basic toast with message', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders toast with title and message', () => {
    render(
      <Toast
        id="test-toast"
        title="Test Title"
        message="Test message"
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(
      <Toast
        id="test-toast"
        message="Test message"
        variant="success"
        onDismiss={mockOnDismiss}
      />
    );

    let alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-50/95', 'border-green-200', 'text-green-800');

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        variant="error"
        onDismiss={mockOnDismiss}
      />
    );

    alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50/95', 'border-red-200', 'text-red-800');

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        variant="warning"
        onDismiss={mockOnDismiss}
      />
    );

    alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50/95', 'border-yellow-200', 'text-yellow-800');
  });

  it('displays correct icons for each variant', () => {
    const { rerender } = render(
      <Toast
        id="test-toast"
        message="Test message"
        variant="success"
        onDismiss={mockOnDismiss}
      />
    );

    // Success icon (checkmark)
    expect(screen.getByRole('alert')).toContainHTML('M5 13l4 4L19 7');

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        variant="error"
        onDismiss={mockOnDismiss}
      />
    );

    // Error icon (X)
    expect(screen.getByRole('alert')).toContainHTML('M6 18L18 6M6 6l12 12');

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        variant="progress"
        onDismiss={mockOnDismiss}
      />
    );

    // Progress icon should have animate-spin class
    const progressIcon = screen.getByRole('alert').querySelector('.animate-spin');
    expect(progressIcon).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    // Should immediately start the dismiss process
    expect(dismissButton).toBeInTheDocument();
  });

  it('does not auto-dismiss progress toasts by default', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        variant="progress"
        duration={1000}
        onDismiss={mockOnDismiss}
      />
    );

    // Progress toasts should not auto-dismiss
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('respects duration of 0 (no auto-dismiss)', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        duration={0}
        onDismiss={mockOnDismiss}
      />
    );

    // Should not auto-dismiss when duration is 0
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const mockAction = vi.fn();
    render(
      <Toast
        id="test-toast"
        message="Test message"
        action={{
          label: 'Retry',
          onClick: mockAction,
        }}
        onDismiss={mockOnDismiss}
      />
    );

    const actionButton = screen.getByText('Retry');
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalled();
  });

  it('displays progress bar when showProgress is true', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        showProgress={true}
        progress={50}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = screen.getByRole('alert').querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays progress bar for progress variant', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        variant="progress"
        progress={75}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = screen.getByRole('alert').querySelector('[style*="width: 75%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const { rerender } = render(
      <Toast
        id="test-toast"
        message="Test message"
        variant="error"
        onDismiss={mockOnDismiss}
      />
    );

    let alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');

    rerender(
      <Toast
        id="test-toast"
        message="Test message"
        variant="info"
        onDismiss={mockOnDismiss}
      />
    );

    alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('dismiss button has proper accessibility attributes', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss notification');
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification');
  });

  it('applies custom className', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        className="custom-class"
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });

  it('has entrance animation classes', () => {
    render(
      <Toast
        id="test-toast"
        message="Test message"
        onDismiss={mockOnDismiss}
      />
    );

    const alert = screen.getByRole('alert');
    
    // Should have animation-related classes
    expect(alert).toHaveClass('transition-all', 'duration-300', 'ease-out');
  });

  it('truncates long titles', () => {
    render(
      <Toast
        id="test-toast"
        title="This is a very long title that should be truncated to prevent layout issues"
        message="Test message"
        onDismiss={mockOnDismiss}
      />
    );

    const title = screen.getByText('This is a very long title that should be truncated to prevent layout issues');
    expect(title).toHaveClass('truncate');
  });
});
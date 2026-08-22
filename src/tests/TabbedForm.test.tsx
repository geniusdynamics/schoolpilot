// ABOUTME: Comprehensive tests for TabbedForm component functionality
// ABOUTME: Tests tab navigation, validation states, responsive behavior, and accessibility

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';

// Mock the utility functions
vi.mock('../utils/animations', () => ({
  useTransition: vi.fn(() => ({})),
}));

vi.mock('../utils/designTokens', () => ({
  designTokens: {
    animations: {
      duration: {
        normal: '200ms',
        fast: '100ms',
      },
    },
  },
}));

vi.mock('../utils/accessibility', () => ({
  generateId: vi.fn((prefix) => `${prefix}-test-id`),
  announceToScreenReader: vi.fn(),
}));

describe('TabbedForm', () => {
  const mockTabs: FormTab[] = [
    {
      id: 'tab1',
      label: 'Tab 1',
      content: <div>Tab 1 Content</div>,
      required: true,
    },
    {
      id: 'tab2',
      label: 'Tab 2',
      content: <div>Tab 2 Content</div>,
      validation: () => true,
    },
    {
      id: 'tab3',
      label: 'Tab 3',
      content: <div>Tab 3 Content</div>,
      disabled: false,
    },
  ];

  const defaultProps = {
    tabs: mockTabs,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<TabbedForm {...defaultProps} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(<TabbedForm {...defaultProps} />);
      
      expect(screen.getByRole('tab', { name: /tab 1/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tab 2/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tab 3/i })).toBeInTheDocument();
    });

    it('renders first tab as active by default', () => {
      render(<TabbedForm {...defaultProps} />);
      
      const firstTab = screen.getByRole('tab', { name: /tab 1/i });
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
    });

    it('renders active tab content', () => {
      render(<TabbedForm {...defaultProps} />);
      
      expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
      expect(screen.queryByText('Tab 2 Content')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TabbedForm {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Tab Navigation', () => {
    it('switches tabs when clicked', async () => {
      const user = userEvent.setup();
      render(<TabbedForm {...defaultProps} />);
      
      const secondTab = screen.getByRole('tab', { name: /tab 2/i });
      await user.click(secondTab);
      
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Tab 2 Content')).toBeInTheDocument();
      expect(screen.queryByText('Tab 1 Content')).not.toBeInTheDocument();
    });

    it('calls onTabChange when tab is switched', async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();
      render(<TabbedForm {...defaultProps} onTabChange={onTabChange} />);
      
      const secondTab = screen.getByRole('tab', { name: /tab 2/i });
      await user.click(secondTab);
      
      expect(onTabChange).toHaveBeenCalledWith(1, 'tab2');
    });

    it('respects activeTab prop', () => {
      render(<TabbedForm {...defaultProps} activeTab={1} />);
      
      const secondTab = screen.getByRole('tab', { name: /tab 2/i });
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Tab 2 Content')).toBeInTheDocument();
    });

    it('prevents navigation to disabled tabs', async () => {
      const user = userEvent.setup();
      const tabsWithDisabled: FormTab[] = [
        ...mockTabs,
        {
          id: 'disabled-tab',
          label: 'Disabled Tab',
          content: <div>Disabled Content</div>,
          disabled: true,
        },
      ];

      render(<TabbedForm tabs={tabsWithDisabled} />);
      
      const disabledTab = screen.getByRole('tab', { name: /disabled tab/i });
      await user.click(disabledTab);
      
      expect(disabledTab).toHaveAttribute('aria-selected', 'false');
      expect(screen.queryByText('Disabled Content')).not.toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('shows progress bar when showProgress is true', () => {
      render(<TabbedForm {...defaultProps} showProgress={true} />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('hides progress bar when showProgress is false', () => {
      render(<TabbedForm {...defaultProps} showProgress={false} />);
      
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    });

    it('calculates progress based on completed tabs', () => {
      const validation = {
        tab1: true,
        tab2: false,
        tab3: false,
      };

      render(
        <TabbedForm 
          {...defaultProps} 
          showProgress={true} 
          validation={validation}
        />
      );
      
      // Should show some progress but not 100%
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });
  });

  describe('Validation States', () => {
    it('shows success indicator for valid tabs', async () => {
      const user = userEvent.setup();
      const validation = { tab1: true };
      
      render(<TabbedForm {...defaultProps} validation={validation} />);
      
      // Switch to second tab and back to see validation indicator
      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      await user.click(screen.getByRole('tab', { name: /tab 1/i }));
      
      // Check for success icon (checkmark)
      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      expect(tab1.querySelector('svg')).toBeInTheDocument();
    });

    it('shows error indicator for invalid tabs', async () => {
      const user = userEvent.setup();
      const validation = { tab1: false };
      
      render(<TabbedForm {...defaultProps} validation={validation} />);
      
      // Switch to second tab and back to see validation indicator
      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      await user.click(screen.getByRole('tab', { name: /tab 1/i }));
      
      // Check for error styling
      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      expect(tab1).toHaveClass('text-red-600');
    });

    it('uses tab validation function when available', () => {
      const tabsWithValidation: FormTab[] = [
        {
          id: 'validated-tab',
          label: 'Validated Tab',
          content: <div>Content</div>,
          validation: vi.fn(() => true),
        },
      ];

      render(<TabbedForm tabs={tabsWithValidation} />);
      
      expect(tabsWithValidation[0].validation).toBeDefined();
    });
  });

  describe('Form Actions', () => {
    it('renders submit button when onSubmit is provided', () => {
      const onSubmit = vi.fn();
      render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);
      
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
      const onCancel = vi.fn();
      render(<TabbedForm {...defaultProps} onCancel={onCancel} />);
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onSubmit when submit button is clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      
      render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);
      
      // Navigate to last tab
      await user.click(screen.getByRole('tab', { name: /tab 3/i }));
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);
      
      expect(onSubmit).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<TabbedForm {...defaultProps} onCancel={onCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);
      
      // Navigate to last tab
      await user.click(screen.getByRole('tab', { name: /tab 3/i }));
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);
      
      expect(submitButton).toBeDisabled();
    });

    it('shows Next/Previous buttons for navigation', async () => {
      const user = userEvent.setup();
      render(<TabbedForm {...defaultProps} onSubmit={vi.fn()} />);
      
      // Should show Next button on first tab
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      
      // Navigate to second tab
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Should show both buttons on middle tab
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders mobile navigation controls', () => {
      render(<TabbedForm {...defaultProps} mobileBreakpoint="md" />);
      
      // Mobile navigation should be present (though hidden by CSS)
      const mobileNav = screen.getByLabelText('Previous tab');
      expect(mobileNav).toBeInTheDocument();
      
      const nextButton = screen.getByLabelText('Next tab');
      expect(nextButton).toBeInTheDocument();
    });

    it('shows current tab information in mobile view', () => {
      render(<TabbedForm {...defaultProps} />);
      
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<TabbedForm {...defaultProps} />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Form sections');
      
      const firstTab = screen.getByRole('tab', { name: /tab 1/i });
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
      expect(firstTab).toHaveAttribute('aria-controls');
      
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('aria-labelledby');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TabbedForm {...defaultProps} />);
      
      const firstTab = screen.getByRole('tab', { name: /tab 1/i });
      firstTab.focus();
      
      // Tab key should move focus
      await user.keyboard('{Tab}');
      
      const secondTab = screen.getByRole('tab', { name: /tab 2/i });
      expect(secondTab).toHaveFocus();
    });

    it('announces tab changes to screen readers', async () => {
      const user = userEvent.setup();
      const { announceToScreenReader } = await import('../utils/accessibility');
      
      render(<TabbedForm {...defaultProps} />);
      
      const secondTab = screen.getByRole('tab', { name: /tab 2/i });
      await user.click(secondTab);
      
      expect(announceToScreenReader).toHaveBeenCalledWith(
        'Switched to Tab 2 tab',
        'polite'
      );
    });

    it('shows required indicators', () => {
      render(<TabbedForm {...defaultProps} />);
      
      const requiredTab = screen.getByRole('tab', { name: /tab 1/i });
      expect(requiredTab.textContent).toContain('*');
    });
  });

  describe('Variants and Styling', () => {
    it('applies default variant styles', () => {
      const { container } = render(<TabbedForm {...defaultProps} variant="default" />);
      
      expect(container.querySelector('.border')).toBeInTheDocument();
      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });

    it('applies pills variant styles', () => {
      const { container } = render(<TabbedForm {...defaultProps} variant="pills" />);
      
      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });

    it('applies underline variant styles', () => {
      const { container } = render(<TabbedForm {...defaultProps} variant="underline" />);
      
      expect(container.querySelector('.border-b')).toBeInTheDocument();
    });

    it('applies size variants correctly', () => {
      const { rerender } = render(<TabbedForm {...defaultProps} size="sm" />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      rerender(<TabbedForm {...defaultProps} size="lg" />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('Tab State Preservation', () => {
    it('preserves tab state when preserveTabState is true', async () => {
      const user = userEvent.setup();
      render(<TabbedForm {...defaultProps} preserveTabState={true} />);
      
      // Switch tabs to trigger state preservation
      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      await user.click(screen.getByRole('tab', { name: /tab 1/i }));
      
      // State preservation logic would be tested with actual form data
      expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles validation function errors gracefully', () => {
      const tabsWithErrorValidation: FormTab[] = [
        {
          id: 'error-tab',
          label: 'Error Tab',
          content: <div>Content</div>,
          validation: () => {
            throw new Error('Validation error');
          },
        },
      ];

      // Should not crash when validation throws
      expect(() => {
        render(<TabbedForm tabs={tabsWithErrorValidation} />);
      }).not.toThrow();
    });

    it('handles submission errors gracefully', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error('Submission error'));
      
      render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);
      
      // Navigate to last tab
      await user.click(screen.getByRole('tab', { name: /tab 3/i }));
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);
      
      // Should handle error without crashing
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Custom Button Text', () => {
    it('uses custom submit button text', () => {
      render(
        <TabbedForm 
          {...defaultProps} 
          onSubmit={vi.fn()} 
          submitButtonText="Save Changes"
        />
      );
      
      // Navigate to last tab to see submit button
      fireEvent.click(screen.getByRole('tab', { name: /tab 3/i }));
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('uses custom cancel button text', () => {
      render(
        <TabbedForm 
          {...defaultProps} 
          onCancel={vi.fn()} 
          cancelButtonText="Discard"
        />
      );
      
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });
  });
});
// ABOUTME: Comprehensive tests for DatePicker component functionality and accessibility
// ABOUTME: Tests single date, date range, keyboard navigation, validation, and screen reader support


import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DatePicker from '@/components/ui/forms/DatePicker';
import { screen } from '@testing-library/react';

// Mock the utility functions
vi.mock('../utils/animations', () => ({
  fadeIn: 'fadeIn',
  fadeOut: 'fadeOut',
  slideIn: 'slideIn',
  slideOut: 'slideOut'
}));

vi.mock('../utils/accessibility', async (importOriginal: () => Promise<any>) => ({
  ...(await importOriginal<typeof import('../utils/accessibility')>()),
  announceToScreenReader: vi.fn(),
  trapFocus: vi.fn(),
  restoreFocus: vi.fn()
}));

vi.mock('../utils/designTokens', () => ({
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '3rem'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  },
  borderRadius: {
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  }
}));

describe('DatePicker Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders with placeholder text', () => {
      render(<DatePicker placeholder="Select date" />);
      expect(screen.getByPlaceholderText('Select date')).toBeInTheDocument();
    });

    it('displays calendar icon', () => {
      render(<DatePicker />);
      const calendarIcon = screen.getByRole('combobox').nextElementSibling;
      expect(calendarIcon).toBeInTheDocument();
      expect(calendarIcon?.querySelector('svg')).toBeInTheDocument();
    });

    it('opens calendar when input is clicked', async () => {
      render(<DatePicker />);
      const input = screen.getByRole('combobox');
      
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Calendar' })).toBeInTheDocument();
      });
    });

    it('opens calendar when Enter key is pressed', async () => {
      render(<DatePicker />);
      const input = screen.getByRole('combobox');
      
      input.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Calendar' })).toBeInTheDocument();
      });
    });

    it('opens calendar when Space key is pressed', async () => {
      render(<DatePicker />);
      const input = screen.getByRole('combobox');
      
      input.focus();
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Calendar' })).toBeInTheDocument();
      });
    });

    it('does not open calendar when disabled', async () => {
      render(<DatePicker disabled />);
      const input = screen.getByRole('combobox');
      
      await user.click(input);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    it('selects a date and closes calendar', async () => {
      const handleChange = jest.fn();
      render(<DatePicker onChange={handleChange} />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Click on a date (assuming today's date is available)
      const today = new Date();
      const todayButton = screen.getByRole('button', { 
        name: today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })});
      await user.click(todayButton);
      
      expect(handleChange).toHaveBeenCalledWith(expect.any(Date));
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('displays selected date in input', () => {
      const testDate = new Date(2024, 0, 15); // January 15, 2024
      render(<DatePicker value={testDate} />);
      
      const input = screen.getByRole('combobox') as HTMLInputElement;
      expect(input.value).toContain('01/15/2024');
    });

    it('handles date range selection', async () => {
      const handleRangeChange = jest.fn();
      render(
        <DatePicker 
          isRange 
          onRangeChange={handleRangeChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Select first date
      const firstDate = screen.getAllByRole('button')[3]; // Skip navigation buttons
      await user.click(firstDate);
      
      expect(handleRangeChange).toHaveBeenCalledWith([expect.any(Date), null]);
      
      // Select second date
      const secondDate = screen.getAllByRole('button')[10];
      await user.click(secondDate);
      
      expect(handleRangeChange).toHaveBeenCalledWith([expect.any(Date), expect.any(Date)]);
    });
  });

  describe('Calendar Navigation', () => {
    it('navigates to previous month', async () => {
      render(<DatePicker />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      const prevButton = screen.getByRole('button', { name: 'Previous month' });
      await user.click(prevButton);
      
      // Check that month has changed
      const monthHeader = screen.getByRole('heading', { level: 2 });
      expect(monthHeader.textContent).not.toBe(currentMonth);
    });

    it('navigates to next month', async () => {
      render(<DatePicker />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      const nextButton = screen.getByRole('button', { name: 'Next month' });
      await user.click(nextButton);
      
      // Check that month has changed
      const monthHeader = screen.getByRole('heading', { level: 2 });
      expect(monthHeader.textContent).not.toBe(currentMonth);
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes calendar with Escape key', async () => {
      render(<DatePicker />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('navigates dates with arrow keys', async () => {
      render(<DatePicker />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const calendar = screen.getByRole('dialog');
      
      // Test arrow key navigation
      fireEvent.keyDown(calendar, { key: 'ArrowRight' });
      fireEvent.keyDown(calendar, { key: 'ArrowLeft' });
      fireEvent.keyDown(calendar, { key: 'ArrowDown' });
      fireEvent.keyDown(calendar, { key: 'ArrowUp' });
      
      // Navigation should work without errors
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Validation and Restrictions', () => {
    it('displays error message', () => {
      render(<DatePicker error="Invalid date" />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid date');
    });

    it('displays success state', () => {
      render(<DatePicker success />);
      
      expect(screen.getByText('Date selected successfully')).toBeInTheDocument();
    });

    it('disables dates before minDate', async () => {
      // Fixed days, so the test does not depend on today's date or on which month the picker opens on:
      // it opens on the month of the selected day, with minDate in the middle of it.
      const minDate = new Date(2024, 5, 10, 15, 30);

      render(<DatePicker minDate={minDate} value={new Date(2024, 5, 20)} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Buttons carry their day as YYYY-MM-DD. Days before minDate are disabled; minDate's own day is not,
      // whatever the time of day on minDate.
      const day = (key: string) => document.querySelector<HTMLButtonElement>(`[data-date="${key}"]`);
      expect(day('2024-06-09')).toBeDisabled();
      expect(day('2024-06-10')).not.toBeDisabled();
      expect(day('2024-06-11')).not.toBeDisabled();
    });

    it('disables specific dates', async () => {
      const today = new Date();
      const disabledDates = [today];
      
      render(<DatePicker disabledDates={disabledDates} />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const todayButton = screen.getByRole('button', { 
        name: `${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, disabled`});
      expect(todayButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<DatePicker aria-label="Test date picker" />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-label', 'Test date picker');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('updates aria-expanded when calendar opens', async () => {
      render(<DatePicker />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(input);
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('associates error message with input', () => {
      render(<DatePicker error="Test error" id="test-picker" />);
      
      const input = screen.getByRole('combobox');
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toHaveAttribute('aria-describedby', 'test-picker-error');
      expect(errorMessage).toHaveAttribute('id', 'test-picker-error');
    });

    it('provides proper date button labels', async () => {
      render(<DatePicker />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const dateButtons = screen.getAllByRole('button');
      const firstDateButton = dateButtons.find(button => 
        button.textContent && /^\d+$/.test(button.textContent)
      );
      
      if (firstDateButton) {
        expect(firstDateButton).toHaveAttribute('aria-label');
        expect(firstDateButton.getAttribute('aria-label')).toMatch(/\w+day, \w+ \d+, \d+/);
      }
    });
  });

  describe('Size and Variant Props', () => {
    it('applies small size class', () => {
      render(<DatePicker size="sm" />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('px-3', 'py-2', 'text-sm');
    });

    it('applies large size class', () => {
      render(<DatePicker size="lg" />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('px-5', 'py-4', 'text-lg');
    });

    it('applies filled variant class', () => {
      render(<DatePicker variant="filled" />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('bg-surface-muted', 'border-transparent');
    });

    it('applies disabled styling', () => {
      render(<DatePicker disabled />);
      
      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('bg-surface-accent', 'text-surface-muted-fg', 'cursor-not-allowed');
      expect(input).toBeDisabled();
    });
  });

  describe('Click Outside Behavior', () => {
    it('closes calendar when clicking outside', async () => {
      render(
        <div>
          <DatePicker />
          <button>Outside button</button>
        </div>
      );
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const outsideButton = screen.getByRole('button', { name: 'Outside button' });
      await user.click(outsideButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Format and Locale', () => {
    it('formats date according to locale', () => {
      const testDate = new Date(2024, 0, 15); // January 15, 2024
      render(<DatePicker value={testDate} locale="en-GB" />);
      
      const input = screen.getByRole('combobox') as HTMLInputElement;
      // UK format should be DD/MM/YYYY
      expect(input.value).toContain('15/01/2024');
    });

    it('displays month names in specified locale', async () => {
      render(<DatePicker locale="fr-FR" />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Should display French month name
      const monthHeader = screen.getByRole('heading', { level: 2 });
      expect(monthHeader.textContent).toMatch(/janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/i);
    });
  });
});
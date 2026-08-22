// ABOUTME: Comprehensive tests for the enhanced Select component
// ABOUTME: Tests functionality, accessibility, keyboard navigation, and edge cases


import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Select, { SelectOption } from '@/components/ui/Select';
import { screen } from '@testing-library/react';

// Mock scrollIntoView for JSDOM
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock options for testing
const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
  { value: 'option4', label: 'Option 4', description: 'Option 4 description' },
];

const mockIconOptions: SelectOption[] = [
  { 
    value: 'icon1', 
    label: 'Icon Option 1', 
    icon: <span data-testid="icon-1">ðŸ”¥</span> 
  },
  { 
    value: 'icon2', 
    label: 'Icon Option 2', 
    icon: <span data-testid="icon-2">â­</span> 
  },
];

describe('Select Component', () => {
  const user = userEvent.setup();

  describe('Basic Functionality', () => {
    it('renders with label and placeholder', () => {
      render(
        <Select
          label="Test Select"
          placeholder="Choose option"
          options={mockOptions}
        />
      );

      expect(screen.getByText('Test Select')).toBeInTheDocument();
      expect(screen.getByText('Choose option')).toBeInTheDocument();
    });

    it('opens dropdown when clicked', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <Select options={mockOptions} />
          <button>Outside</button>
        </div>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(screen.getByText('Outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('selects option when clicked', async () => {
      const onChange = vi.fn();
      render(<Select options={mockOptions} onChange={onChange} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const option1 = screen.getByRole('option', { name: /Option 1/ });
      await user.click(option1);

      expect(onChange).toHaveBeenCalledWith('option1');
    });

    it('does not select disabled options', async () => {
      const onChange = vi.fn();
      render(<Select options={mockOptions} onChange={onChange} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await user.click(screen.getByText('Option 3'));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Select Functionality', () => {
    it('allows multiple selections', async () => {
      const onChange = vi.fn();
      render(<Select options={mockOptions} onChange={onChange} multiple />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const option1 = screen.getByRole('option', { name: /Option 1/ });
      await user.click(option1);

      expect(onChange).toHaveBeenCalledWith(['option1']);
      
      // Wait a bit to ensure the dropdown stays open
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Dropdown should still be open for multi-select
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
      const option2 = screen.getByRole('option', { name: /Option 2/ });
      await user.click(option2);

      expect(onChange).toHaveBeenCalledWith(['option1', 'option2']);
    });

    it('removes selection when clicked again in multi-select', async () => {
      const onChange = vi.fn();
      render(<Select options={mockOptions} onChange={onChange} multiple value={['option1']} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const option1 = screen.getByRole('option', { name: /Option 1/ });
      await user.click(option1);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('respects maxSelections limit', async () => {
      const onChange = vi.fn();
      render(
        <Select 
          options={mockOptions} 
          onChange={onChange} 
          multiple 
          maxSelections={2}
          value={['option1', 'option2']}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await user.click(screen.getByText('Option 4'));

      // Should not add third option
      expect(onChange).not.toHaveBeenCalledWith(['option1', 'option2', 'option4']);
    });

    it('removes tags when X button is clicked', async () => {
      const onChange = vi.fn();
      render(
        <Select 
          options={mockOptions} 
          onChange={onChange} 
          multiple 
          value={['option1', 'option2']}
        />
      );
      
      const removeButtons = screen.getAllByLabelText(/Remove/);
      await user.click(removeButtons[0]);

      expect(onChange).toHaveBeenCalledWith(['option2']);
    });
  });

  describe('Search Functionality', () => {
    it('shows search input when searchable', async () => {
      render(<Select options={mockOptions} searchable />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByPlaceholderText('Search options...')).toBeInTheDocument();
    });

    it('filters options based on search query', async () => {
      render(<Select options={mockOptions} searchable />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const searchInput = screen.getByPlaceholderText('Search options...');
      await user.type(searchInput, 'Option 1');

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
    });

    it('shows no options message when search yields no results', async () => {
      render(<Select options={mockOptions} searchable noOptionsMessage="No matches" />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const searchInput = screen.getByPlaceholderText('Search options...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No matches')).toBeInTheDocument();
    });

    it('calls onSearch callback when searching', async () => {
      const onSearch = vi.fn();
      render(<Select options={mockOptions} searchable onSearch={onSearch} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const searchInput = screen.getByPlaceholderText('Search options...');
      await user.type(searchInput, 'test');

      expect(onSearch).toHaveBeenCalledWith('test');
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown with Enter key', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown with Space key', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard(' ');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes dropdown with Escape key', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('navigates options with arrow keys', async () => {
      const onChange = vi.fn();
      render(<Select options={mockOptions} onChange={onChange} />);
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Navigate to second option and select it
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('option2');
    });

    it('navigates to first option with Home key', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await user.keyboard('{Home}');
      await user.keyboard('{Enter}');

      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('navigates to last option with End key', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      await user.keyboard('{End}');
      await user.keyboard('{Enter}');

      expect(screen.getByText('Option 4')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when loading', () => {
      render(<Select options={mockOptions} loading />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables interaction when loading', async () => {
      render(<Select options={mockOptions} loading />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Should not open dropdown when loading
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('displays error message', () => {
      render(<Select options={mockOptions} error="This field is required" />);
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styling', () => {
      render(<Select options={mockOptions} error="Error" />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error with field via aria-describedby', () => {
      render(<Select options={mockOptions} error="Error message" />);
      
      const trigger = screen.getByRole('combobox');
      const errorId = trigger.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(screen.getByText('Error message')).toHaveAttribute('id', errorId);
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(<Select options={mockOptions} size="sm" />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('text-sm');
    });

    it('applies large size classes', () => {
      render(<Select options={mockOptions} size="lg" />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('text-lg');
    });
  });

  describe('Style Variants', () => {
    it('applies outlined variant styles', () => {
      render(<Select options={mockOptions} variant="outlined" />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('border', 'bg-white');
    });

    it('applies filled variant styles', () => {
      render(<Select options={mockOptions} variant="filled" />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('bg-gray-100');
    });
  });

  describe('Icons and Descriptions', () => {
    it('renders option icons', async () => {
      render(<Select options={mockIconOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByTestId('icon-1')).toBeInTheDocument();
      expect(screen.getByTestId('icon-2')).toBeInTheDocument();
    });

    it('renders option descriptions', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByText('Option 4 description')).toBeInTheDocument();
    });

    it('shows selected option icon in trigger', async () => {
      render(<Select options={mockIconOptions} value="icon1" />);
      
      expect(screen.getByTestId('icon-1')).toBeInTheDocument();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as controlled component', async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <Select options={mockOptions} value="option1" onChange={onChange} />
      );
      
      // Check initial value is displayed
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const option2 = screen.getByRole('option', { name: /Option 2/ });
      await user.click(option2);
      
      expect(onChange).toHaveBeenCalledWith('option2');
      
      // Value should not change until parent updates it
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      
      rerender(<Select options={mockOptions} value="option2" onChange={onChange} />);
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('works as uncontrolled component', async () => {
      render(<Select options={mockOptions} defaultValue="option1" />);
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const option4 = screen.getByRole('option', { name: /Option 4/ });
      await user.click(option4);
      
      expect(screen.getByText('Option 4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Select options={mockOptions} label="Test Select" />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('role', 'combobox');
    });

    it('updates aria-expanded when opened', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper option roles and attributes', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
      
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[2]).toHaveAttribute('aria-disabled', 'true'); // disabled option
    });

    it('associates label with field', () => {
      render(<Select options={mockOptions} label="Test Select" />);
      
      const label = screen.getByText('Test Select');
      const trigger = screen.getByRole('combobox');
      
      expect(label).toHaveAttribute('for', trigger.id);
    });

    it('shows required indicator', () => {
      render(<Select options={mockOptions} label="Required Field" required />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('has proper accessibility structure', async () => {
      render(
        <Select 
          options={mockOptions} 
          label="Accessible Select"
          helperText="Helper text"
        />
      );
      
      const trigger = screen.getByRole('combobox');
      const label = screen.getByText('Accessible Select');
      const helperText = screen.getByText('Helper text');
      
      expect(label).toHaveAttribute('for', trigger.id);
      expect(trigger).toHaveAttribute('aria-describedby');
      expect(helperText).toHaveAttribute('id');
    });

    it('maintains accessibility when dropdown is open', async () => {
      render(
        <Select 
          options={mockOptions} 
          label="Accessible Select"
          searchable
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');
      
      expect(listbox).toBeInTheDocument();
      expect(options).toHaveLength(4);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty options array', () => {
      render(<Select options={[]} />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('handles undefined value gracefully', () => {
      render(<Select options={mockOptions} value={undefined} />);
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('handles very long option labels', async () => {
      const longOptions: SelectOption[] = [
        { 
          value: 'long', 
          label: 'This is a very long option label that should be truncated properly to avoid layout issues',
          description: 'This is also a very long description that should be handled gracefully'
        },
      ];
      
      render(<Select options={longOptions} />);
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(screen.getByText(/This is a very long option label/)).toBeInTheDocument();
    });

    it('handles rapid open/close operations', async () => {
      render(<Select options={mockOptions} />);
      
      const trigger = screen.getByRole('combobox');
      
      // Rapidly open and close
      await user.click(trigger);
      await user.keyboard('{Escape}');
      await user.click(trigger);
      await user.keyboard('{Escape}');
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
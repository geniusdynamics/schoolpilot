// ABOUTME: Basic tests for the enhanced Select component
// ABOUTME: Tests core functionality and accessibility features

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Select, { SelectOption } from '@/components/ui/Select';

// Mock scrollIntoView for JSDOM
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
  { value: 'option4', label: 'Option 4', description: 'Option 4 description' },
];

describe('Select Component - Basic Tests', () => {
  const user = userEvent.setup();

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
    expect(screen.getByRole('option', { name: /Option 1/ })).toBeInTheDocument();
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

  it('normalizes numeric option values for options-mode consumers', async () => {
    const onChange = vi.fn();
    render(
      <Select
        options={[
          { value: 101 as any, label: 'Grade 1' },
          { value: 202 as any, label: 'Grade 2' },
        ]}
        value={202 as any}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Grade 2')).toBeInTheDocument();

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Grade 1' }));

    expect(onChange).toHaveBeenCalledWith('101');
  });

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

    expect(screen.getByRole('option', { name: /Option 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Option 2/ })).not.toBeInTheDocument();
  });

  it('supports multi-select mode', async () => {
    const onChange = vi.fn();
    render(<Select options={mockOptions} onChange={onChange} multiple />);
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    const option1 = screen.getByRole('option', { name: /Option 1/ });
    await user.click(option1);

    expect(onChange).toHaveBeenCalledWith(['option1']);
  });

  it('shows loading indicator when loading', () => {
    render(<Select options={mockOptions} loading />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Select options={mockOptions} error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<Select options={mockOptions} label="Test Select" />);
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('updates aria-expanded when opened', async () => {
    render(<Select options={mockOptions} />);
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens dropdown with Enter key', async () => {
    render(<Select options={mockOptions} />);
    
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{Enter}');

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

  it('renders option descriptions', async () => {
    render(<Select options={mockOptions} />);
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByText('Option 4 description')).toBeInTheDocument();
  });

  it('handles disabled options', async () => {
    const onChange = vi.fn();
    render(<Select options={mockOptions} onChange={onChange} />);
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    const disabledOption = screen.getByRole('option', { name: /Option 3/ });
    expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
    
    await user.click(disabledOption);
    expect(onChange).not.toHaveBeenCalled();
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

  it('handles empty options array', () => {
    render(<Select options={[]} />);
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
  });

  it('applies size variants correctly', () => {
    const { rerender } = render(<Select options={mockOptions} size="sm" />);
    
    let trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('text-sm');

    rerender(<Select options={mockOptions} size="lg" />);
    trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('text-base');
  });

  it('applies style variants correctly', () => {
    const { rerender } = render(<Select options={mockOptions} variant="outlined" />);
    
    let trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border', 'bg-surface-card');

    rerender(<Select options={mockOptions} variant="filled" />);
    trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('bg-surface-muted');
  });
});

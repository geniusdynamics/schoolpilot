// ABOUTME: Component tests for the typeable, locale-aware DatePicker/DateField (P0-G07, SO-32).
// ABOUTME: Covers typed entry, month/year selectors, min/max, keyboard use and the EntityForm label.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import DatePicker from '../DatePicker';
import DateField from '../DateField';
import EntityForm from '../EntityForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() }),
}));

const calendar = () => screen.getByRole('dialog', { name: 'Calendar' });

/** Controlled DateField harness so typed values round-trip like in a real form. */
function ControlledDateField(props: Partial<React.ComponentProps<typeof DateField>> & { onValue?: (v: string) => void }) {
  const { onValue, ...rest } = props;
  const [value, setValue] = React.useState(props.value ?? '');
  return (
    <DateField
      label="Date of Birth"
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe('DatePicker (typeable, locale-aware)', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('display format follows locale', () => {
    it('shows dd/mm/yyyy for en-KE', () => {
      render(<DatePicker value={new Date(2014, 2, 15)} locale="en-KE" />);
      expect(screen.getByRole('combobox')).toHaveValue('15/03/2014');
    });

    it('shows mm/dd/yyyy for en-US', () => {
      render(<DatePicker value={new Date(2014, 2, 15)} locale="en-US" />);
      expect(screen.getByRole('combobox')).toHaveValue('03/15/2014');
    });

    it('uses the locale pattern as the default placeholder', () => {
      render(<DatePicker locale="en-KE" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'dd/mm/yyyy');
    });

    it('DateField defaults to the en-KE format', () => {
      render(<DateField label="Start" value="2014-03-15" />);
      expect(screen.getByLabelText('Start')).toHaveValue('15/03/2014');
    });
  });

  describe('typed entry', () => {
    it('typing 15/03/2014 sets the date', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" onChange={onChange} />);
      const input = screen.getByRole('combobox');

      await user.type(input, '15/03/2014');

      expect(input).toHaveValue('15/03/2014');
      expect(onChange).toHaveBeenCalledTimes(1);
      const date = onChange.mock.calls[0][0] as Date;
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2014, 2, 15]);
    });

    it('typing through DateField emits an ISO string', async () => {
      const onValue = vi.fn();
      render(<ControlledDateField onValue={onValue} />);

      await user.type(screen.getByLabelText('Date of Birth'), '15/03/2014');

      expect(onValue).toHaveBeenLastCalledWith('2014-03-15');
      expect(screen.getByLabelText('Date of Birth')).toHaveValue('15/03/2014');
    });

    it('does not emit for impossible dates and reverts on blur', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" value={new Date(2020, 0, 1)} onChange={onChange} />);
      const input = screen.getByRole('combobox');

      await user.type(input, '31/02/2014', { initialSelectionStart: 0, initialSelectionEnd: 10 });
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveAttribute('aria-invalid', 'true');

      await user.tab();
      expect(input).toHaveValue('01/01/2020');
    });

    it('clearing the text clears the date', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" value={new Date(2020, 0, 1)} onChange={onChange} />);

      await user.clear(screen.getByRole('combobox'));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('follows a changed value prop', () => {
      const { rerender } = render(<DatePicker locale="en-KE" value={new Date(2020, 0, 1)} />);
      rerender(<DatePicker locale="en-KE" value={new Date(2014, 2, 15)} />);
      expect(screen.getByRole('combobox')).toHaveValue('15/03/2014');
    });
  });

  describe('month and year selectors', () => {
    it('jumps to 2014 in at most 3 interactions and selects a day', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" onChange={onChange} />);

      await user.click(screen.getByRole('combobox')); // 1: open
      await user.selectOptions(within(calendar()).getByRole('combobox', { name: 'Year' }), '2014'); // 2: year

      expect(within(calendar()).getByRole('heading', { level: 2 })).toHaveTextContent('2014');

      await user.selectOptions(within(calendar()).getByRole('combobox', { name: 'Month' }), '2'); // March
      await user.click(within(calendar()).getByRole('button', { name: /15 March 2014/ }));

      const date = onChange.mock.calls[0][0] as Date;
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2014, 2, 15]);
      expect(screen.getByRole('combobox')).toHaveValue('15/03/2014');
    });

    it('opens on the month of the selected date', async () => {
      render(<DatePicker locale="en-KE" value={new Date(2014, 2, 15)} />);
      await user.click(screen.getByRole('combobox'));
      expect(within(calendar()).getByRole('heading', { level: 2 })).toHaveTextContent('March 2014');
    });

    it('limits the year options to the min/max range', async () => {
      render(
        <DatePicker locale="en-KE" minDate={new Date(2010, 0, 1)} maxDate={new Date(2016, 11, 31)} value={new Date(2014, 2, 15)} />
      );
      await user.click(screen.getByRole('combobox'));
      const years = within(within(calendar()).getByRole('combobox', { name: 'Year' }))
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);
      expect(years[0]).toBe('2010');
      expect(years[years.length - 1]).toBe('2016');
    });
  });

  describe('min/max', () => {
    it('rejects a typed date before minDate', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" minDate={new Date(2015, 0, 1)} onChange={onChange} />);
      const input = screen.getByRole('combobox');

      await user.type(input, '15/03/2014');

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('accepts a typed date equal to minDate (day granularity)', async () => {
      const onValue = vi.fn();
      render(<ControlledDateField minDate="2014-03-15" maxDate="2014-03-15" onValue={onValue} />);

      await user.type(screen.getByLabelText('Date of Birth'), '15/03/2014');

      expect(onValue).toHaveBeenLastCalledWith('2014-03-15');
    });

    it('rejects a typed date after maxDate', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" maxDate={new Date(2014, 2, 14)} onChange={onChange} />);

      await user.type(screen.getByRole('combobox'), '15/03/2014');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard', () => {
    it('ArrowDown opens the calendar on the selected day; arrows move focus; Enter selects', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" value={new Date(2014, 2, 15)} onChange={onChange} />);
      const input = screen.getByRole('combobox');

      input.focus();
      await user.keyboard('{ArrowDown}');

      const dialog = calendar();
      expect(within(dialog).getByRole('button', { name: /15 March 2014/ })).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(within(dialog).getByRole('button', { name: /16 March 2014/ })).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      expect(within(dialog).getByRole('button', { name: /23 March 2014/ })).toHaveFocus();

      await user.keyboard('{Enter}');
      const date = onChange.mock.calls[0][0] as Date;
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2014, 2, 23]);
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).not.toBeInTheDocument());
      expect(input).toHaveFocus();
    });

    it('Escape closes the calendar and returns focus to the input', async () => {
      render(<DatePicker locale="en-KE" value={new Date(2014, 2, 15)} />);
      const input = screen.getByRole('combobox');
      input.focus();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Calendar' })).not.toBeInTheDocument());
      expect(input).toHaveFocus();
    });

    it('keys pressed in the year selector do not move the day focus', async () => {
      render(<DatePicker locale="en-KE" value={new Date(2014, 2, 15)} />);
      await user.click(screen.getByRole('combobox'));
      const year = within(calendar()).getByRole('combobox', { name: 'Year' });
      year.focus();
      await user.keyboard('{ArrowLeft}');
      expect(year).toHaveFocus();
    });
  });

  describe('EntityForm date field', () => {
    it('renders its label once and labels the typeable input', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <EntityForm
          isOpen
          title="Add Student"
          onClose={vi.fn()}
          onSubmit={onSubmit}
          fields={[{ name: 'dob', label: 'Date of Birth', type: 'date' }]}
        />
      );

      expect(screen.getAllByText('Date of Birth')).toHaveLength(1);
      const input = screen.getByLabelText('Date of Birth');
      await user.type(input, '15/03/2014');
      await user.click(screen.getByRole('button', { name: /save|create|submit/i }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dob: '2014-03-15' })));
    });
  });
});

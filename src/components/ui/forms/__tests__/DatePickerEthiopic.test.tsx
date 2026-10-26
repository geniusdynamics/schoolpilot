// ABOUTME: The DatePicker and DateField on the Ethiopian calendar: a stored Gregorian day is shown and typed as its
// ABOUTME: Ethiopian date, the popover steps through thirteen months, and the Gregorian picker keeps working as before.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DateField from '../DateField';
import DatePicker from '../DatePicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const calendar = () => screen.getByRole('dialog', { name: 'Calendar' });
const parts = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

/** 1 Meskerem 2016 E.C., Enkutatash. */
const ENKUTATASH_2016 = new Date(2023, 8, 12);

describe('DatePicker on the Ethiopian calendar', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('display', () => {
    it('shows a stored Gregorian day as its Ethiopian date, in the locale order', () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      expect(screen.getByRole('combobox')).toHaveValue('01/01/2016');

      render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2023, 9, 11)} />);
      expect(screen.getAllByRole('combobox')[1]).toHaveValue('30/01/2016');
    });

    it('shows the leap day of Pagume as the sixth day of the thirteenth month', () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2023, 8, 11)} />);
      expect(screen.getByRole('combobox')).toHaveValue('06/13/2015');
    });

    it('follows a changed value prop', () => {
      const { rerender } = render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2020, 0, 1)} />);
      rerender(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      expect(screen.getByRole('combobox')).toHaveValue('01/01/2016');
    });

    it('keeps the Gregorian date when no calendar is asked for', () => {
      render(<DatePicker locale="en-KE" value={ENKUTATASH_2016} />);
      expect(screen.getByRole('combobox')).toHaveValue('12/09/2023');
    });

    it('uses the Ethiopian calendar for an Ethiopian locale when none is given', () => {
      render(<DatePicker locale="en-ET" value={ENKUTATASH_2016} />);
      expect(screen.getByRole('combobox')).toHaveValue('01/01/2016');
    });

    it('lets a locale that names the Gregorian calendar keep it', () => {
      render(<DatePicker locale="en-ET-u-ca-gregory" value={ENKUTATASH_2016} />);
      expect(screen.getByRole('combobox')).not.toHaveValue('01/01/2016');
    });
  });

  describe('typed entry', () => {
    it('reads a typed Ethiopian date as the Gregorian day the app stores', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" calendar="ethiopic" onChange={onChange} />);
      const input = screen.getByRole('combobox');

      await user.type(input, '01/01/2016');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(parts(onChange.mock.calls[0][0] as Date)).toEqual([2023, 9, 12]);
      expect(input).toHaveValue('01/01/2016');
    });

    it('reads the sixth day of Pagume in a leap year', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" calendar="ethiopic" onChange={onChange} />);

      await user.type(screen.getByRole('combobox'), '06/13/2015');

      expect(parts(onChange.mock.calls[0][0] as Date)).toEqual([2023, 9, 11]);
    });

    it.each([
      ['the sixth day of Pagume in a year that has five', '06/13/2016'],
      ['a fourteenth month', '01/14/2016'],
      ['a thirty-first day', '31/01/2016'],
      ['a day zero', '00/01/2016'],
    ])('does not read %s', async (_name, text) => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" calendar="ethiopic" onChange={onChange} />);
      const input = screen.getByRole('combobox');

      await user.type(input, text);

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('holds a typed date to minDate and maxDate, which stay Gregorian days', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" calendar="ethiopic" minDate={new Date(2023, 8, 12)} onChange={onChange} />);

      await user.type(screen.getByRole('combobox'), '30/13/2015');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('reverts unusable text to the last Ethiopian date on blur', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      const input = screen.getByRole('combobox');

      await user.type(input, '07/13/2016', { initialSelectionStart: 0, initialSelectionEnd: 10 });
      await user.tab();

      expect(input).toHaveValue('01/01/2016');
    });
  });

  describe('the calendar popover', () => {
    it('opens on the Ethiopian month of the selected day', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      await user.click(screen.getByRole('combobox'));

      expect(within(calendar()).getByRole('heading', { level: 2 })).toHaveTextContent('Meskerem 2016');
    });

    it('offers thirteen months, the last of them Pagumen', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      await user.click(screen.getByRole('combobox'));

      const options = within(within(calendar()).getByRole('combobox', { name: 'Month' })).getAllByRole('option');
      expect(options).toHaveLength(13);
      expect(options[0]).toHaveTextContent('Meskerem');
      expect(options[12]).toHaveTextContent('Pagumen');
    });

    it('shows the days by their Ethiopian numbers and selects one as its Gregorian day', async () => {
      const onChange = vi.fn();
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));

      await user.click(within(calendar()).getByRole('button', { name: /, 30 Meskerem 2016/ }));

      expect(parts(onChange.mock.calls[0][0] as Date)).toEqual([2023, 10, 11]);
      expect(screen.getByRole('combobox')).toHaveValue('30/01/2016');
    });

    it('steps to the next and the previous Ethiopian month, through Pagumen into the year before', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      await user.click(screen.getByRole('combobox'));
      const heading = () => within(calendar()).getByRole('heading', { level: 2 });

      await user.click(within(calendar()).getByRole('button', { name: 'Next month' }));
      expect(heading()).toHaveTextContent('Tekemt 2016');

      await user.click(within(calendar()).getByRole('button', { name: 'Previous month' }));
      await user.click(within(calendar()).getByRole('button', { name: 'Previous month' }));
      expect(heading()).toHaveTextContent('Pagumen 2015');
    });

    it('shows five days of Pagumen in a common year and six in a leap year', async () => {
      const { unmount } = render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2024, 8, 10)} />);
      await user.click(screen.getByRole('combobox'));
      expect(within(calendar()).getAllByRole('button', { name: / Pagumen 2016/ })).toHaveLength(5);
      unmount();

      render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2023, 8, 11)} />);
      await user.click(screen.getByRole('combobox'));
      expect(within(calendar()).getAllByRole('button', { name: / Pagumen 2015/ })).toHaveLength(6);
    });

    it('jumps to an Ethiopian year from the year selector and keeps the month', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={ENKUTATASH_2016} />);
      await user.click(screen.getByRole('combobox'));

      await user.selectOptions(within(calendar()).getByRole('combobox', { name: 'Year' }), '2012');

      expect(within(calendar()).getByRole('heading', { level: 2 })).toHaveTextContent('Meskerem 2012');
    });

    it('limits the year options to the Ethiopian years of minDate and maxDate', async () => {
      render(
        <DatePicker
          locale="en-KE"
          calendar="ethiopic"
          minDate={new Date(2023, 8, 12)}
          maxDate={new Date(2025, 8, 10)}
          value={ENKUTATASH_2016}
        />
      );
      await user.click(screen.getByRole('combobox'));

      const years = within(within(calendar()).getByRole('combobox', { name: 'Year' }))
        .getAllByRole('option')
        .map((option) => (option as HTMLOptionElement).value);
      expect(years).toEqual(['2016', '2017']);
    });

    it('moves the month and the day with Home, End and PageDown, by Ethiopian months', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2023, 8, 20)} />);
      const input = screen.getByRole('combobox');
      input.focus();
      await user.keyboard('{ArrowDown}');
      const dialog = calendar();
      expect(within(dialog).getByRole('button', { name: /, 9 Meskerem 2016/ })).toHaveFocus();

      await user.keyboard('{End}');
      expect(within(dialog).getByRole('button', { name: /, 30 Meskerem 2016/ })).toHaveFocus();

      await user.keyboard('{Home}');
      expect(within(dialog).getByRole('button', { name: /, 1 Meskerem 2016/ })).toHaveFocus();

      await user.keyboard('{PageDown}');
      expect(within(dialog).getByRole('button', { name: /, 1 Tekemt 2016/ })).toHaveFocus();
    });

    it('keeps the day inside a shorter month when PageDown goes into Pagumen', async () => {
      render(<DatePicker locale="en-KE" calendar="ethiopic" value={new Date(2024, 7, 10)} />);
      const input = screen.getByRole('combobox');
      input.focus();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{End}'); // 30 Nehasse 2016
      await user.keyboard('{PageDown}');

      expect(within(calendar()).getByRole('button', { name: /, 5 Pagumen 2016/ })).toHaveFocus();
    });
  });

  describe('on the Gregorian calendar', () => {
    it('opens on the Gregorian month, as before', async () => {
      render(<DatePicker locale="en-KE" value={ENKUTATASH_2016} />);
      await user.click(screen.getByRole('combobox'));

      expect(within(calendar()).getByRole('heading', { level: 2 })).toHaveTextContent('September 2023');
      expect(within(calendar()).getByRole('combobox', { name: 'Month' }).querySelectorAll('option')).toHaveLength(12);
    });

    it('PageDown from the 31st stops in the next month instead of overflowing into the one after', async () => {
      render(<DatePicker locale="en-KE" value={new Date(2024, 0, 31)} />);
      const input = screen.getByRole('combobox');
      input.focus();
      await user.keyboard('{ArrowDown}');

      await user.keyboard('{PageDown}');

      expect(within(calendar()).getByRole('button', { name: /29 February 2024/ })).toHaveFocus();
    });
  });

  describe('DateField', () => {
    it('keeps its YYYY-MM-DD contract while showing and taking Ethiopian dates', async () => {
      const onChange = vi.fn();
      const Harness: React.FC = () => {
        const [value, setValue] = React.useState('2023-09-12');
        return (
          <DateField
            label="Start"
            value={value}
            locale="en-KE"
            calendar="ethiopic"
            onChange={(next) => {
              setValue(next);
              onChange(next);
            }}
          />
        );
      };
      render(<Harness />);
      const input = screen.getByLabelText('Start');
      expect(input).toHaveValue('01/01/2016');

      await user.clear(input);
      await user.type(input, '30/01/2016');

      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('2023-10-11'));
      expect(input).toHaveValue('30/01/2016');
    });
  });
});

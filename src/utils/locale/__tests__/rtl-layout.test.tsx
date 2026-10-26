// ABOUTME: Proves the RTL layout: an Arabic subtree carries dir="rtl" and the logical utilities that
// ABOUTME: mirror it, the calendar follows the Arabic week, and the core shell has no left/right pairs
// ABOUTME: left to regress into.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LocaleDirectionProvider from '@/components/locale/LocaleDirectionProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import DatePicker from '@/components/ui/forms/DatePicker';
import MoneyField from '@/components/ui/forms/MoneyField';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(() => {
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-locale');
});

describe('an Arabic subtree', () => {
  it('carries dir="rtl" and publishes it on the document', () => {
    render(
      <LocaleDirectionProvider locale="ar-EG">
        <PageHeader title="الطلاب" description="قائمة الطلاب" />
      </LocaleDirectionProvider>
    );

    const root = document.querySelector('[data-locale-root]');
    expect(root).toHaveAttribute('dir', 'rtl');
    expect(root).toHaveAttribute('lang', 'ar-EG');
    expect(root).toHaveAttribute('data-locale', 'ar-EG');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('lays the header out with logical spacing, not left/right pairs', () => {
    render(
      <LocaleDirectionProvider locale="ar-EG">
        <PageHeader title="الطلاب" actions={<button type="button">إضافة</button>} />
      </LocaleDirectionProvider>
    );

    expect(document.querySelector('.gap-4')).not.toBeNull();
    expect(document.querySelector('.space-x-4')).toBeNull();
    expect(document.querySelector('.space-x-2')).toBeNull();
  });

  it('places the date field icon and the money currency at the inline end', () => {
    render(
      <LocaleDirectionProvider locale="ar-EG">
        <DatePicker value={new Date(2026, 2, 15)} locale="ar-EG" />
        <MoneyField
          label="المبلغ"
          value={{ amount_minor: 123456, currency: 'KES' }}
          onChange={vi.fn()}
          locale="ar-EG"
        />
      </LocaleDirectionProvider>
    );

    const dateIcon = document.querySelector('.end-0');
    expect(dateIcon).not.toBeNull();
    expect(dateIcon).toHaveClass('pe-3');
    expect(document.querySelector('.right-0')).toBeNull();

    const moneyBadge = document.querySelector('.end-3');
    expect(moneyBadge).not.toBeNull();
    expect(moneyBadge).toHaveTextContent('KES');
    expect(screen.getByLabelText('المبلغ')).toHaveClass('pe-16');
  });

  it('starts the calendar week on Saturday and labels it in Arabic', async () => {
    const user = userEvent.setup();
    render(
      <LocaleDirectionProvider locale="ar-EG">
        <DatePicker value={new Date(2026, 2, 15)} locale="ar-EG" />
      </LocaleDirectionProvider>
    );

    await user.click(screen.getByRole('combobox'));
    const dialog = screen.getByRole('dialog', { name: 'Calendar' });
    const headers = within(dialog).getAllByText(/^(السبت|الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة)$/);

    expect(headers).toHaveLength(7);
    expect(headers[0]).toHaveTextContent('السبت');
    expect(headers[1]).toHaveTextContent('الأحد');
  });
});

describe('the bare Arabic and Portuguese locale codes the app ships', () => {
  it('renders ar right to left and publishes it on the document', () => {
    render(
      <LocaleDirectionProvider locale="ar">
        <PageHeader title="Students" />
      </LocaleDirectionProvider>
    );

    expect(document.querySelector('[data-locale-root]')).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
  });

  it('renders pt left to right', () => {
    render(
      <LocaleDirectionProvider locale="pt">
        <PageHeader title="Students" />
      </LocaleDirectionProvider>
    );

    expect(document.querySelector('[data-locale-root]')).toHaveAttribute('dir', 'ltr');
  });
});

describe('a left-to-right subtree', () => {
  it('stays ltr, so the logical utilities are not hard-coded to mirror', () => {
    render(
      <LocaleDirectionProvider locale="en-KE">
        <PageHeader title="Students" />
      </LocaleDirectionProvider>
    );

    expect(document.querySelector('[data-locale-root]')).toHaveAttribute('dir', 'ltr');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });
});

describe('the core shell has no physical spacing left to mirror wrongly', () => {
  const RTL_FILES = [
    'src/components/Layout.tsx',
    'src/components/Header.tsx',
    'src/components/PrimarySidebar.tsx',
    'src/components/SecondarySidebar.tsx',
    'src/components/TopOverflowMenu.tsx',
    'src/components/layout/PageHeader.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/forms/DatePicker.tsx',
    'src/components/ui/forms/MoneyField.tsx',
    'src/components/ui/forms/FieldFrame.tsx',
    'src/hooks/useToast.tsx',
  ];

  const FORBIDDEN: ReadonlyArray<RegExp> = [
    /(?<![-\w])(?:pl|pr|ml|mr|text-left|text-right|space-x)-/,
    /(?<![-\w])border-[lr](?![-\w])/,
    /marginLeft|marginRight/,
  ];

  it.each(RTL_FILES)('%s uses logical utilities only', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const pattern of FORBIDDEN) {
      const match = source.match(pattern);
      expect(match?.[0], `${file} still has ${match?.[0]}`).toBeUndefined();
    }
  });

  it('has actually converted the shell and the form controls', () => {
    const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(read('src/components/Layout.tsx')).toContain('marginInlineStart');
    expect(read('src/components/Header.tsx')).toContain('start-16');
    expect(read('src/components/layout/PageHeader.tsx')).toContain('gap-4');
    expect(read('src/components/ui/forms/DatePicker.tsx')).toContain('end-0');
    expect(read('src/components/ui/forms/MoneyField.tsx')).toContain('pe-16');
    expect(read('src/components/SecondarySidebar.tsx')).toContain('border-s');
    expect(read('src/hooks/useToast.tsx')).toContain('end-4');
  });
});

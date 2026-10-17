// ABOUTME: Component tests for the Academic Calendar › School Periods tab backed by the database.
// ABOUTME: Covers listing stored terms, database-backed pickers, default financial year seeding, creating terms, and validation errors.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SchoolPeriodsPage from '../SchoolPeriodsPage';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { FinancialYearStatus } from '@/core/types';
import { databaseService } from '@/services/database/databaseService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, maybeOptions?: Record<string, unknown>) => {
      const options = typeof fallback === 'object' ? fallback : maybeOptions;
      const text = typeof fallback === 'string' ? fallback : (options?.defaultValue as string | undefined) ?? key;
      return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''));
    },
  }),
}));

const mockToast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => mockToast }));

// The calendar picker is not keyboard-typable in jsdom; a native date input keeps the YYYY-MM-DD contract.
vi.mock('@/components/ui/forms/DateField', () => {
  const DateFieldStub = ({ label, value, onChange, name }: { label?: string; value?: string; onChange?: (v: string) => void; name?: string }) => (
    <label>
      {label}
      <input type="date" name={name} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
  return { default: DateFieldStub, DateField: DateFieldStub };
});

vi.mock('@/services/database/databaseService', () => ({
  databaseService: { getDatabase: vi.fn(), generateId: vi.fn(() => 'sp-created') },
}));

type Row = { id: string } & Record<string, unknown>;

function memoryCollection(seed: Row[]) {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      rows = [...rows, { ...doc }];
      return { ...doc };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

const stamp = '2026-01-01T00:00:00.000Z';
let collections: Record<string, ReturnType<typeof memoryCollection>>;

beforeEach(() => {
  vi.clearAllMocks();
  collections = {
    academic_years: memoryCollection([
      { id: 'ay-2027', name: '2027', structure_id: 'st-1', start_date: '2027-01-04', end_date: '2027-11-26', created_at: stamp, updated_at: stamp },
    ]),
    academic_period_definitions: memoryCollection([
      { id: 'pd-1', structure_id: 'st-1', name: 'Term 1', sequence_order: 1, structure_name: 'Three Terms' },
      { id: 'pd-2', structure_id: 'st-1', name: 'Term 2', sequence_order: 2, structure_name: 'Three Terms' },
    ]),
    financial_years: memoryCollection([
      { id: 'fy-2027', name: 'FY 2027', start_date: '2027-01-01', end_date: '2027-12-31', status: FinancialYearStatus.OPEN, created_at: stamp, updated_at: stamp },
    ]),
    school_periods: memoryCollection([
      {
        id: 'sp-1', academic_year_id: 'ay-2027', period_definition_id: 'pd-1', financial_year_id: 'fy-2027',
        start_date: '2027-01-04', end_date: '2027-04-02', is_active: true, name: 'Term 1 - 2027',
        academic_year_name: '2027', period_definition_name: 'Term 1', financial_year_name: 'FY 2027', created_at: stamp, updated_at: stamp,
      },
    ]),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collections[name] ?? null,
  } as never);
});

const renderPage = () => render(<ConfirmProvider><SchoolPeriodsPage /></ConfirmProvider>);

async function openAddForm() {
  const user = userEvent.setup();
  renderPage();
  await screen.findByText('Term 1 - 2027');
  await user.click(screen.getByRole('button', { name: /add school period/i }));
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(dialog.querySelectorAll('select[name=financial_year_id] option').length).toBeGreaterThan(1));
  return { user, dialog };
}

describe('SchoolPeriodsPage', () => {
  it('lists the terms stored in the database', async () => {
    renderPage();
    const row = (await screen.findByText('Term 1 - 2027')).closest('tr') as HTMLElement;
    expect(within(row).getByText('FY 2027')).toBeInTheDocument();
  });

  it('offers academic years, period definitions and financial years from the database', async () => {
    const { dialog } = await openAddForm();
    const optionLabels = (name: string) =>
      Array.from(dialog.querySelectorAll(`select[name=${name}] option`)).map((option) => option.textContent);

    expect(optionLabels('academic_year_id')).toContain('2027');
    expect(optionLabels('period_definition_id')).toEqual(expect.arrayContaining(['Term 1 (Three Terms)', 'Term 2 (Three Terms)']));
    expect(optionLabels('financial_year_id')).toContain('FY 2027');
  });

  it('creates a term with string ids and shows it in the list', async () => {
    const { user, dialog } = await openAddForm();
    await user.selectOptions(dialog.querySelector('select[name=academic_year_id]') as HTMLSelectElement, 'ay-2027');
    await user.selectOptions(dialog.querySelector('select[name=period_definition_id]') as HTMLSelectElement, 'pd-2');
    await user.selectOptions(dialog.querySelector('select[name=financial_year_id]') as HTMLSelectElement, 'fy-2027');
    await user.type(dialog.querySelector('input[name=start_date]') as HTMLInputElement, '2027-05-03');
    await user.type(dialog.querySelector('input[name=end_date]') as HTMLInputElement, '2027-08-06');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(collections.school_periods.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sp-created',
          academic_year_id: 'ay-2027',
          period_definition_id: 'pd-2',
          financial_year_id: 'fy-2027',
          start_date: '2027-05-03',
          end_date: '2027-08-06',
          name: 'Term 2 - 2027',
          financial_year_name: 'FY 2027',
        })
      )
    );
    expect(await screen.findByText('Term 2 - 2027')).toBeInTheDocument();
  });

  it('shows an overlap error and does not save an overlapping term', async () => {
    const { user, dialog } = await openAddForm();
    await user.selectOptions(dialog.querySelector('select[name=academic_year_id]') as HTMLSelectElement, 'ay-2027');
    await user.selectOptions(dialog.querySelector('select[name=period_definition_id]') as HTMLSelectElement, 'pd-2');
    await user.selectOptions(dialog.querySelector('select[name=financial_year_id]') as HTMLSelectElement, 'fy-2027');
    await user.type(dialog.querySelector('input[name=start_date]') as HTMLInputElement, '2027-03-15');
    await user.type(dialog.querySelector('input[name=end_date]') as HTMLInputElement, '2027-06-30');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/overlap Term 1 - 2027/)).toBeInTheDocument();
    expect(collections.school_periods.insert).not.toHaveBeenCalled();
  });

  it('seeds a default financial year when none exist and pre-selects it in the term form', async () => {
    collections.financial_years = memoryCollection([]);
    const year = new Date().getFullYear();

    const { dialog } = await openAddForm();

    expect(collections.financial_years.insert).toHaveBeenCalledTimes(1);
    expect(collections.financial_years.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: `FY ${year}`, start_date: `${year}-01-01`, end_date: `${year}-12-31`, status: FinancialYearStatus.OPEN })
    );
    const select = dialog.querySelector('select[name=financial_year_id]') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toContain(`FY ${year}`);
    await waitFor(() => expect(select.selectedOptions[0]?.textContent).toBe(`FY ${year}`));
  });

  it('does not seed a financial year when one already exists', async () => {
    await openAddForm();
    expect(collections.financial_years.insert).not.toHaveBeenCalled();
  });

  it('deletes a term by its string id after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText('Term 1 - 2027')).closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: /delete/i }));
    const confirmDialog = await screen.findByRole('dialog');
    await user.click(within(confirmDialog).getByRole('button', { name: /delete|confirm/i }));

    await waitFor(() => expect(collections.school_periods.remove).toHaveBeenCalledWith('sp-1'));
  });
});

// ABOUTME: Component tests for the Academic Years page (SO-21, SO-23).
// ABOUTME: Covers (id, patch) updates, string structure ids, date-range/overlap validation and read-time structure names.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcademicYearsContent } from '../AcademicYearsPage';

const mockUseAppData = vi.fn();

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object') {
        const { defaultValue, ...vars } = fallback as Record<string, string>;
        return (defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) => vars[name] ?? '');
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// The calendar picker is not keyboard-typeable in jsdom; swap it for a plain input
// that keeps the same `YYYY-MM-DD` string contract.
vi.mock('@/components/ui/forms/DateField', () => ({
  default: ({ label, value, onChange }: { label?: string; value?: string; onChange?: (v: string) => void }) => (
    <input aria-label={label} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const addAcademicYear = vi.fn();
const updateAcademicYear = vi.fn();

const structures = [
  { id: 'STR-TERMS', name: 'Three Terms' },
  { id: 'STR-SEM', name: 'Two Semesters' },
];

const years = [
  { id: 'AY-2025', name: 'AY 2025', structure_id: 'STR-TERMS', start_date: '2025-01-06', end_date: '2025-11-28' },
  { id: 'AY-2026', name: 'AY 2026', structure_id: 'STR-SEM', start_date: '2026-01-05', end_date: '2026-11-27' },
];

const buildAppData = () => ({
  academicYears: years,
  academicYearStructures: structures,
  loading: {},
  addAcademicYear,
  updateAcademicYear,
  deleteAcademicYear: vi.fn(),
});

const rowFor = (name: string) => {
  const cell = screen.getAllByText(name).find((el) => el.closest('tr'));
  if (!cell) throw new Error(`row ${name} not found`);
  return cell.closest('tr') as HTMLElement;
};

const setField = (dialog: HTMLElement, label: RegExp, value: string) => {
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
};

const openAddDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Add Academic Year/i }));
  const dialog = await screen.findByRole('dialog');
  setField(dialog, /Year Name/i, 'AY 2027');
  fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'STR-TERMS' } });
  return dialog;
};

describe('AcademicYearsContent', () => {
  beforeEach(() => {
    addAcademicYear.mockReset().mockResolvedValue(undefined);
    updateAcademicYear.mockReset().mockResolvedValue(undefined);
    mockUseAppData.mockReturnValue(buildAppData());
  });

  it('resolves the structure name from structures at read time (SO-21)', () => {
    render(<AcademicYearsContent />);

    expect(within(rowFor('AY 2025')).getByText('Three Terms')).toBeInTheDocument();
    expect(within(rowFor('AY 2026')).getByText('Two Semesters')).toBeInTheDocument();
  });

  it('persists an edit through update(id, patch) with a string structure id (SO-23)', async () => {
    render(<AcademicYearsContent />);

    fireEvent.click(within(rowFor('AY 2025')).getByRole('button', { name: /Edit/i }));
    const dialog = await screen.findByRole('dialog');
    setField(dialog, /Year Name/i, 'AY 2025 (revised)');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(updateAcademicYear).toHaveBeenCalledTimes(1));
    expect(updateAcademicYear).toHaveBeenCalledWith('AY-2025', {
      name: 'AY 2025 (revised)',
      structure_id: 'STR-TERMS',
      start_date: '2025-01-06',
      end_date: '2025-11-28',
    });
  });

  it('creates a non-overlapping year with a string structure id', async () => {
    render(<AcademicYearsContent />);

    const dialog = await openAddDialog();
    setField(dialog, /Start Date/i, '2027-01-04');
    setField(dialog, /End Date/i, '2027-11-26');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(addAcademicYear).toHaveBeenCalledTimes(1));
    expect(addAcademicYear).toHaveBeenCalledWith({
      name: 'AY 2027',
      structure_id: 'STR-TERMS',
      start_date: '2027-01-04',
      end_date: '2027-11-26',
    });
  });

  it('rejects an end date that is not after the start date', async () => {
    render(<AcademicYearsContent />);

    const dialog = await openAddDialog();
    setField(dialog, /Start Date/i, '2027-06-01');
    setField(dialog, /End Date/i, '2027-06-01');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));

    expect(await within(dialog).findByText(/End date must be after the start date/i)).toBeInTheDocument();
    expect(addAcademicYear).not.toHaveBeenCalled();
  });

  it('rejects a year that overlaps an existing year', async () => {
    render(<AcademicYearsContent />);

    const dialog = await openAddDialog();
    setField(dialog, /Start Date/i, '2026-10-01');
    setField(dialog, /End Date/i, '2027-09-30');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));

    expect(await within(dialog).findByText(/overlap AY 2026/i)).toBeInTheDocument();
    expect(addAcademicYear).not.toHaveBeenCalled();
  });

  it('does not treat the year being edited as overlapping itself', async () => {
    render(<AcademicYearsContent />);

    fireEvent.click(within(rowFor('AY 2026')).getByRole('button', { name: /Edit/i }));
    const dialog = await screen.findByRole('dialog');
    setField(dialog, /End Date/i, '2026-12-04');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(updateAcademicYear).toHaveBeenCalledTimes(1));
    expect(updateAcademicYear).toHaveBeenCalledWith('AY-2026', expect.objectContaining({ end_date: '2026-12-04' }));
  });
});

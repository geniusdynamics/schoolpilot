// ABOUTME: Component tests for the Academic Period Definitions page (SO-21, SO-23).
// ABOUTME: Covers string structure ids on create/update and read-time structure name resolution.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcademicPeriodDefinitionsPage from '../AcademicPeriodDefinitionsPage';

const mockUseAppData = vi.fn();

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
}));

const addAcademicPeriodDefinition = vi.fn();
const updateAcademicPeriodDefinition = vi.fn();

const structures = [
  { id: 'STR-TERMS', name: 'Three Terms' },
  { id: 'STR-SEM', name: 'Two Semesters' },
];

const definitions = [
  { id: 'APD-T1', name: 'Term 1', structure_id: 'STR-TERMS', sequence_order: 1 },
  { id: 'APD-S1', name: 'Semester 1', structure_id: 'STR-SEM', sequence_order: 1 },
];

const rowFor = (name: string) => {
  const cell = screen.getAllByText(name).find((el) => el.closest('tr'));
  if (!cell) throw new Error(`row ${name} not found`);
  return cell.closest('tr') as HTMLElement;
};

describe('AcademicPeriodDefinitionsPage', () => {
  beforeEach(() => {
    addAcademicPeriodDefinition.mockReset().mockResolvedValue(undefined);
    updateAcademicPeriodDefinition.mockReset().mockResolvedValue(undefined);
    mockUseAppData.mockReturnValue({
      academicPeriodDefinitions: definitions,
      academicYearStructures: structures,
      loading: {},
      addAcademicPeriodDefinition,
      updateAcademicPeriodDefinition,
      deleteAcademicPeriodDefinition: vi.fn(),
    });
  });

  it('resolves the structure name from structures at read time (SO-21)', () => {
    render(<AcademicPeriodDefinitionsPage />);

    expect(within(rowFor('Term 1')).getByText('Three Terms')).toBeInTheDocument();
    expect(within(rowFor('Semester 1')).getByText('Two Semesters')).toBeInTheDocument();
  });

  it('creates a definition with the string structure id and next sequence order', async () => {
    render(<AcademicPeriodDefinitionsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Add Definition/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'STR-TERMS' } });
    fireEvent.change(within(dialog).getByPlaceholderText(/Term 1, Semester 2/i), { target: { value: 'Term 2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Definition/i }));

    await waitFor(() => expect(addAcademicPeriodDefinition).toHaveBeenCalledTimes(1));
    expect(addAcademicPeriodDefinition).toHaveBeenCalledWith({
      name: 'Term 2',
      structure_id: 'STR-TERMS',
      sequence_order: 2,
    });
  });

  it('persists an edit through update(id, patch) keeping the string structure id (SO-23)', async () => {
    render(<AcademicPeriodDefinitionsPage />);

    fireEvent.click(within(rowFor('Semester 1')).getByRole('button', { name: /Edit/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText(/Term 1, Semester 2/i), { target: { value: 'Semester One' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(updateAcademicPeriodDefinition).toHaveBeenCalledTimes(1));
    expect(updateAcademicPeriodDefinition).toHaveBeenCalledWith('APD-S1', {
      name: 'Semester One',
      structure_id: 'STR-SEM',
      sequence_order: 1,
    });
  });
});

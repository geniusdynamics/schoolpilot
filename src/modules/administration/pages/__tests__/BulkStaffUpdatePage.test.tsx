// ABOUTME: Page tests for bulk staff update (P0-D05, SO-11): updates go through useAdministration().updateStaff
// ABOUTME: and a department change writes the department id together with its name.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkStaffUpdateContent } from '../BulkStaffUpdatePage';

const mockUseAdministration = vi.fn();

vi.mock('../../hooks/useAdministration', () => ({
  useAdministration: () => mockUseAdministration(),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('BulkStaffUpdatePage must use useAdministration(), not useAppData()');
  },
}));

const updateStaff = vi.fn();

const buildAdministration = () => ({
  staff: [
    { id: 'STF-1', staff_no: 'EMP001', first_name: 'Jane', last_name: 'Wanjiru', department_id: 'DEP-1', is_active: true },
    { id: 'STF-2', staff_no: 'EMP002', first_name: 'Peter', last_name: 'Otieno', department_id: 'DEP-1', is_active: true },
    { id: 'STF-3', staff_no: 'EMP003', first_name: 'Mary', last_name: 'Achieng', department_id: 'DEP-2', is_active: true },
  ],
  departments: [
    { id: 'DEP-1', name: 'Sciences', is_academic: true },
    { id: 'DEP-2', name: 'Humanities', is_academic: true },
  ],
  designations: [],
  loading: false,
  updateStaff,
});

describe('BulkStaffUpdateContent (P0-D05)', () => {
  beforeEach(() => {
    updateStaff.mockReset().mockResolvedValue(undefined);
    mockUseAdministration.mockReturnValue(buildAdministration());
  });

  it('moves every staff member of a department through updateStaff with id and name', async () => {
    render(<BulkStaffUpdateContent />);

    // Department filter options come from the department lookup, not denormalised strings
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Sciences' } });
    expect(screen.getByText('Jane Wanjiru')).toBeInTheDocument();
    expect(screen.queryByText('Mary Achieng')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Bulk Update/i }));
    const dialog = await screen.findByRole('dialog');
    const [fieldSelect] = within(dialog).getAllByRole('combobox');
    fireEvent.change(fieldSelect, { target: { value: 'department' } });
    fireEvent.change(within(dialog).getByPlaceholderText(/Enter new value/i), { target: { value: 'Humanities' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Update Records/i }));

    await waitFor(() => expect(updateStaff).toHaveBeenCalledTimes(2));
    expect(updateStaff).toHaveBeenCalledWith('STF-1', { department_id: 'DEP-2', department_name: 'Humanities' });
    expect(updateStaff).toHaveBeenCalledWith('STF-2', { department_id: 'DEP-2', department_name: 'Humanities' });
  });

  // The heading-density convention: this is a hub tab body, so the tab's title rides on the Card
  // header (not a second page heading) and the sentence it used to spend a permanent coloured row on
  // is reachable from the info hint beside the Card title.
  it('keeps the page explanation on the info hint instead of a permanent intro box', () => {
    render(<BulkStaffUpdateContent />);

    expect(screen.getByRole('heading', { name: 'Bulk Staff Update' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About this section' })).toBeInTheDocument();
    // The deleted box's heading is gone from the page body.
    expect(screen.queryByText('Multi-Field Batch Update for Staff Records')).not.toBeInTheDocument();
  });
});

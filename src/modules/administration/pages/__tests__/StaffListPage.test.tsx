// ABOUTME: Page tests for the staff list (P0-D05, SO-11/SO-31): add, edit and delete go through
// ABOUTME: useAdministration() and the form captures email, gender, national ID, employer no. and employment type.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { StaffListContent } from '../StaffListPage';

const mockUseAdministration = vi.fn();

vi.mock('../../hooks/useAdministration', () => ({
  useAdministration: () => mockUseAdministration(),
}));

// The page must not depend on the app-wide context for staff CRUD: it has no staff mutators (SO-11).
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('StaffListPage must use useAdministration(), not useAppData()');
  },
}));

const addStaff = vi.fn();
const updateStaff = vi.fn();
const deleteStaff = vi.fn();

const existing = {
  id: 'STF-1',
  staff_no: 'EMP001',
  first_name: 'Jane',
  last_name: 'Wanjiru',
  phone: '0711000001',
  email: 'jane@school.ac.ke',
  gender: 'female',
  national_id: '12345678',
  employer_number: 'TSC123456',
  employment_type: 'permanent',
  department_id: 'DEP-1',
  designation_id: 3,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const buildAdministration = (overrides: Record<string, unknown> = {}) => ({
  staff: [existing],
  departments: [{ id: 'DEP-1', name: 'Sciences', is_academic: true }],
  designations: [{ id: 3, title: 'Teacher' }],
  loading: false,
  addStaff,
  updateStaff,
  deleteStaff,
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <StaffListContent />
      </ConfirmProvider>
    </MemoryRouter>
  );

const fill = (dialog: HTMLElement, label: RegExp, value: string) => {
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
};

describe('StaffListContent (P0-D05)', () => {
  beforeEach(() => {
    addStaff.mockReset().mockResolvedValue({ id: 'STF-2' });
    updateStaff.mockReset().mockResolvedValue(undefined);
    deleteStaff.mockReset().mockResolvedValue(undefined);
    mockUseAdministration.mockReturnValue(buildAdministration());
  });

  it('lists staff with department and designation names resolved from the lookups', () => {
    renderPage();
    expect(screen.getByText('Jane Wanjiru')).toBeInTheDocument();
    expect(screen.getByText('Sciences')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
  });

  it('adds a staff member with the new identity and employment fields through addStaff', async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /Add Staff/i })[0]);
    const dialog = await screen.findByRole('dialog');

    fill(dialog, /Staff No/i, 'EMP002');
    fill(dialog, /First Name/i, 'Peter');
    fill(dialog, /Last Name/i, 'Otieno');
    fill(dialog, /^Phone/i, '0711000002');
    fill(dialog, /Email/i, 'peter@school.ac.ke');
    fill(dialog, /Gender/i, 'male');
    fill(dialog, /National ID/i, '87654321');
    fill(dialog, /Employer No/i, 'TSC654321');
    fill(dialog, /Employment Type/i, 'contract');
    fill(dialog, /^Department/i, 'DEP-1');

    fireEvent.click(within(dialog).getByRole('button', { name: /Add Staff Member/i }));

    await waitFor(() => expect(addStaff).toHaveBeenCalledTimes(1));
    expect(addStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        staff_no: 'EMP002',
        first_name: 'Peter',
        last_name: 'Otieno',
        phone: '0711000002',
        email: 'peter@school.ac.ke',
        gender: 'male',
        national_id: '87654321',
        employer_number: 'TSC654321',
        employment_type: 'contract',
        department_id: 'DEP-1',
        department_name: 'Sciences',
        is_active: true,
      })
    );
  });

  it('keeps the first four text inputs as staff no, first name, last name, phone (probe C09 order)', async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /Add Staff/i })[0]);
    const dialog = await screen.findByRole('dialog');
    const textInputs = dialog.querySelectorAll('input[type=text], input:not([type])');
    const labels = Array.from(textInputs)
      .slice(0, 4)
      .map((el) => ((el as HTMLInputElement).labels?.[0]?.textContent ?? '').replace(/\*/g, '').trim());
    expect(labels).toEqual(['Staff No.', 'First Name', 'Last Name', 'Phone']);
  });

  it('edits a staff member with updateStaff(id, patch)', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByLabelText(/National ID/i) as HTMLInputElement).value).toBe('12345678');

    fill(dialog, /Employment Type/i, 'contract');
    fireEvent.click(within(dialog).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(updateStaff).toHaveBeenCalledTimes(1));
    expect(updateStaff).toHaveBeenCalledWith(
      'STF-1',
      expect.objectContaining({ employment_type: 'contract', national_id: '12345678', email: 'jane@school.ac.ke' })
    );
  });

  it('deletes a staff member with deleteStaff(id) after confirmation', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    const confirmDialog = await screen.findByRole('dialog');
    expect(confirmDialog).toHaveTextContent(/delete this staff member/i);
    expect(deleteStaff).not.toHaveBeenCalled();
    const buttons = within(confirmDialog).getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(deleteStaff).toHaveBeenCalledWith('STF-1'));
  });
});

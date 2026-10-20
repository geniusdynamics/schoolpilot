// ABOUTME: Tests for modernized StudentsListPage with TabbedForm and EntityForm (quick edit) integration
// ABOUTME: Covers form validation, tab navigation, quick edit functionality, and accessibility
//
// NOTE: This file imports RTL's render directly, which bypasses the global
// provider wrapper in setup.ts. The page calls useToast() internally, so every
// render is wrapped in a ToastProvider via a single local helper (same pattern
// as src/contexts/data/__tests__/AdministrationDataContext.test.tsx).

import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StudentsListPage from '../pages/StudentsListPage';
import { useAppData } from '@/hooks/useAppData';
import { ToastProvider } from '@/hooks/useToast';
import { PersonGender, StudentStatus } from '@/types';

const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<ToastProvider>{ui}</ToastProvider>, options);

// Mock dependencies — the page consumes useAppData() from '@/hooks/useAppData'
// (which itself only reads the AppDataContext), so mocking the hook module is
// the single point that satisfies both the page and any internal consumers.
vi.mock('@/hooks/useAppData');
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

const mockUseAppData = vi.mocked(useAppData);

const mockStudents = [
  {
    id: '1',
    admission_no: 'ADM001',
    first_name: 'John',
    last_name: 'Doe',
    gender: PersonGender.MALE,
    status: StudentStatus.ACTIVE,
    current_class_name: 'Form 1',
    current_class_stream_name: 'A',
    primary_guardian: {
      id: 'g1',
      name: 'Jane Doe',
      phone: '+1234567890',
      relationship_type: 'Mother',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockClassStreams = [
  { id: 1, name: 'A', class_name: 'Form 1' },
  { id: 2, name: 'B', class_name: 'Form 1' },
];

const mockStudentCategories = [
  { id: 1, name: 'Day Scholar' },
  { id: 2, name: 'Boarder' },
];

const mockDormitories = [
  { id: 1, name: 'East Wing' },
  { id: 2, name: 'West Wing' },
];

const buildAppData = (overrides: Record<string, any> = {}) => ({
  students: mockStudents,
  classStreams: mockClassStreams,
  studentCategories: mockStudentCategories,
  dormitories: mockDormitories,
  loading: { students: false, all: false },
  addStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  ...overrides,
});

/** Click the header "Add Student" button that opens the modal (not the modal's own submit button). */
const openAddModal = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add Student' }));
};

/**
 * Navigate to the last ("Academic Details") tab inside the open modal, where
 * TabbedForm renders the final submit button.
 */
const goToLastTab = () => {
  fireEvent.click(screen.getByRole('tab', { name: /Academic Details/ }));
};

describe('StudentsListPage - Modernized Form', () => {
  beforeEach(() => {
    mockUseAppData.mockReturnValue(buildAppData() as any);
  });

  it('renders student list with modernized actions', () => {
    render(<StudentsListPage />);

    expect(screen.getByText('Student Management')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ADM001')).toBeInTheDocument();

    // Row actions: quick edit (icon button), full edit and delete
    expect(screen.getByTitle('Quick Edit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('opens tabbed form modal when clicking Add Student', async () => {
    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      expect(screen.getByText('Add New Student')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Personal Details/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Guardian Details/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Academic Details/ })).toBeInTheDocument();
    });
  });

  it('shows progress indicator in tabbed form', async () => {
    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  it('flags required fields when submitting an empty form', async () => {
    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Academic Details/ })).toBeInTheDocument();
    });
    goToLastTab();

    // Submit without filling any required fields
    const submitButtons = screen.getAllByRole('button', { name: 'Add Student' });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    // The page surfaces required-field validation via a warning toast
    expect(
      await screen.findByText('Please fill in all required fields (Admission No, First Name, Last Name)')
    ).toBeInTheDocument();
  });

  it('allows navigation between tabs', async () => {
    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: /Guardian Details/ }));

      expect(screen.getByLabelText('Guardian Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Relationship Type')).toBeInTheDocument();
    });
  });

  it('opens quick edit form for a student', async () => {
    render(<StudentsListPage />);

    const quickEditButton = screen.getByTitle('Quick Edit');
    fireEvent.click(quickEditButton);

    await waitFor(() => {
      // EntityForm dialog titled "Quick Edit — <name>"
      expect(screen.getByText('Quick Edit — John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      // The quick-edit dialog offers a jump to the full editor
      expect(screen.getByText('Full Edit')).toBeInTheDocument();
    });
  });

  it('shows the active tab as selected after interacting with the form', async () => {
    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      const personalTab = screen.getByRole('tab', { name: /Personal Details/ });
      expect(personalTab).toBeInTheDocument();
      expect(personalTab).toHaveAttribute('aria-selected', 'true');
    });

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.blur(screen.getByLabelText('First Name'));

    const personalTab = screen.getByRole('tab', { name: /Personal Details/ });
    expect(personalTab).toHaveAttribute('aria-selected', 'true');
  });

  it('handles form submission with validation', async () => {
    const mockAddStudent = vi.fn();
    mockUseAppData.mockReturnValue(buildAppData({ addStudent: mockAddStudent }) as any);

    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      // Fill required fields
      fireEvent.change(screen.getByLabelText('Admission No.'), { target: { value: 'ADM002' } });
      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
      // Required Select labels render a trailing "*" marker
      fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: PersonGender.FEMALE } });
      fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: StudentStatus.ACTIVE } });
    });

    // Navigate to last tab and submit
    await waitFor(() => {
      goToLastTab();
    });

    await waitFor(() => {
      const submitButtons = screen.getAllByRole('button', { name: 'Add Student' });
      fireEvent.click(submitButtons[submitButtons.length - 1]);
    });

    await waitFor(() => {
      expect(mockAddStudent).toHaveBeenCalled();
    });
  });

  it('navigates tabs with the keyboard-accessible Next/Previous controls', async () => {
    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      const personalTab = screen.getByRole('tab', { name: /Personal Details/ });
      personalTab.focus();
      expect(personalTab).toHaveFocus();

      // Move forward using the footer Next button (reachable via keyboard)
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('tab', { name: /Guardian Details/ })).toHaveAttribute('aria-selected', 'true');

      // And back with Previous
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(screen.getByRole('tab', { name: /Personal Details/ })).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('disables the submit button while students are loading', async () => {
    mockUseAppData.mockReturnValue(buildAppData({ loading: { students: true, all: false } }) as any);

    render(<StudentsListPage />);

    openAddModal();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Academic Details/ })).toBeInTheDocument();
    });
    goToLastTab();

    await waitFor(() => {
      // The modal's submit button (second "Add Student" button on screen) is disabled while loading
      const submitButtons = screen.getAllByRole('button', { name: 'Add Student' });
      expect(submitButtons.length).toBeGreaterThan(1);
      expect(submitButtons[submitButtons.length - 1]).toBeDisabled();
    });
  });

  it('saves quick edit changes', async () => {
    const mockUpdateStudent = vi.fn();
    mockUseAppData.mockReturnValue(buildAppData({ updateStudent: mockUpdateStudent }) as any);

    render(<StudentsListPage />);

    const quickEditButton = screen.getByTitle('Quick Edit');
    fireEvent.click(quickEditButton);

    await waitFor(() => {
      const firstNameInput = screen.getByDisplayValue('John');
      fireEvent.change(firstNameInput, { target: { value: 'Johnny' } });
    });

    // Click the EntityForm save button
    await waitFor(() => {
      const dialog = screen.getByText('Quick Edit — John Doe').closest('div[role="dialog"]') as HTMLElement | null;
      const saveButton = dialog
        ? within(dialog).getByRole('button', { name: 'Save' })
        : screen.getByRole('button', { name: 'Save' });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockUpdateStudent).toHaveBeenCalled();
    });
  });
});

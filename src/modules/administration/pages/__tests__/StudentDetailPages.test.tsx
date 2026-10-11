// ABOUTME: Page tests for the student profile and student financial detail pages (SO-12, P0-D04).
// ABOUTME: Both pages must load the learner by route id from module hooks, for seeded and UI-created learners.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentDetailPage from '../StudentDetailPage';
import StudentFinancialDetailPage from '../StudentFinancialDetailPage';

const mockUseAdministration = vi.fn();
const mockUseFinance = vi.fn();

vi.mock('../../hooks/useAdministration', () => ({
  useAdministration: () => mockUseAdministration(),
}));

vi.mock('@/modules/finance/hooks', () => ({
  useFinance: () => mockUseFinance(),
}));

// The legacy aggregate provider must not be needed to open a profile.
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => {
    throw new Error('student detail pages must not use useAppData');
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
}));

const classes = [{ id: 'CLS-1', name: 'Form 1' }];
const classStreams = [{ id: 'STR-1', class_id: 'CLS-1', name: 'East' }];

// Seeded learner: carries the denormalised display names written by the seed.
const seededStudent = {
  id: 'STU-SEED-1',
  admission_no: 'ADM-001',
  first_name: 'Amina',
  last_name: 'Otieno',
  gender: 'Female',
  status: 'Active',
  current_class_stream_id: 'STR-1',
  current_class_name: 'Form 1',
  current_class_stream_name: 'East',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  guardians: [],
};

// UI-created learner: uuid id, no denormalised names, guardian linked through relationships.
const uiStudent = {
  id: '6f1c2b8e-0d6a-4e3b-9a52-6f2c1d9e7a10',
  admission_no: 'ADM-900',
  first_name: 'Brian',
  last_name: 'Kamau',
  gender: 'Male',
  status: 'Active',
  current_class_stream_id: 'STR-1',
  current_class_name: null,
  current_class_stream_name: null,
  address: 'Nakuru',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  guardians: [{ id: 'G-1', name: 'Grace Kamau', phone: '0712000000', relationship_type: 'Mother' }],
};

const getStudentDetailsById = vi.fn();
const updateStudent = vi.fn();
const getStudentFinancialDetailsById = vi.fn();

const buildAdministration = (overrides: Record<string, unknown> = {}) => ({
  students: [],
  classes,
  classStreams,
  getStudentDetailsById,
  updateStudent,
  ...overrides,
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/administration/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/administration/students/:studentId/financial" element={<StudentFinancialDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('StudentDetailPage (P0-D04)', () => {
  beforeEach(() => {
    getStudentDetailsById.mockReset();
    updateStudent.mockReset().mockResolvedValue(undefined);
    mockUseAdministration.mockReturnValue(buildAdministration());
    mockUseFinance.mockReturnValue({ getStudentFinancialDetailsById });
  });

  it('opens the profile of a seeded learner by route id', async () => {
    getStudentDetailsById.mockResolvedValue(seededStudent);

    renderAt('/administration/students/STU-SEED-1');

    expect(await screen.findByRole('heading', { name: 'Amina Otieno' })).toBeInTheDocument();
    expect(getStudentDetailsById).toHaveBeenCalledWith('STU-SEED-1');
    expect(screen.getAllByText(/Form 1 - East/).length).toBeGreaterThan(0);
  });

  it('opens the profile of a UI-created learner and resolves class, stream and guardian at read time', async () => {
    getStudentDetailsById.mockResolvedValue(uiStudent);

    renderAt(`/administration/students/${uiStudent.id}`);

    expect(await screen.findByRole('heading', { name: 'Brian Kamau' })).toBeInTheDocument();
    expect(getStudentDetailsById).toHaveBeenCalledWith(uiStudent.id);
    expect(screen.getAllByText(/Form 1 - East/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Grace Kamau/)).toBeInTheDocument();
  });

  it('falls back to the live students collection when the loader has no record yet', async () => {
    getStudentDetailsById.mockResolvedValue(null);
    const plainStudent = { ...uiStudent, guardians: undefined };
    mockUseAdministration.mockReturnValue(buildAdministration({ students: [plainStudent] }));

    renderAt(`/administration/students/${uiStudent.id}`);

    expect(await screen.findByRole('heading', { name: 'Brian Kamau' })).toBeInTheDocument();
  });

  it('shows "Student not found" for an unknown id', async () => {
    getStudentDetailsById.mockResolvedValue(null);

    renderAt('/administration/students/NOPE');

    expect(await screen.findByText('Student not found.')).toBeInTheDocument();
  });

  it('Edit button opens the bio-data editor pre-filled and saves through updateStudent', async () => {
    getStudentDetailsById.mockResolvedValue(uiStudent);

    renderAt(`/administration/students/${uiStudent.id}`);
    await screen.findByRole('heading', { name: 'Brian Kamau' });

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Edit Bio Data/i)).toBeInTheDocument();
    const firstName = within(dialog).getByLabelText(/First Name/i) as HTMLInputElement;
    expect(firstName.value).toBe('Brian');

    fireEvent.change(firstName, { target: { value: 'Bryan' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(updateStudent).toHaveBeenCalledTimes(1));
    expect(updateStudent).toHaveBeenCalledWith(uiStudent.id, expect.objectContaining({ first_name: 'Bryan', last_name: 'Kamau' }));
    expect(await screen.findByRole('heading', { name: 'Bryan Kamau' })).toBeInTheDocument();
  });
});

describe('StudentFinancialDetailPage (P0-D04)', () => {
  beforeEach(() => {
    getStudentFinancialDetailsById.mockReset();
    mockUseAdministration.mockReturnValue(buildAdministration());
    mockUseFinance.mockReturnValue({ getStudentFinancialDetailsById });
  });

  it('loads the financial profile by route id from the finance module hook', async () => {
    const plainStudent = { ...uiStudent, guardians: undefined };
    getStudentFinancialDetailsById.mockResolvedValue({
      ...plainStudent,
      financial_summary: { totalFees: 10000, totalPaid: 4000, totalDiscount: 0, totalFine: 0, currentBalance: 6000 },
      invoices_charges: [
        { id: 'INV-1', invoiceId: 'INV/2026/0001', feeTypeDescription: 'Tuition', dueDate: '2026-02-01', amount: 10000, status: 'Due' },
      ],
      payment_history: [],
      enrolled_subjects: [],
    });

    renderAt(`/administration/students/${uiStudent.id}/financial`);

    expect(await screen.findByRole('heading', { name: 'Brian Kamau' })).toBeInTheDocument();
    expect(getStudentFinancialDetailsById).toHaveBeenCalledWith(uiStudent.id);
    expect(screen.getByText(/Form 1 - East/)).toBeInTheDocument();
    expect(screen.getByText('Ksh 6000.00')).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown id', async () => {
    getStudentFinancialDetailsById.mockResolvedValue(null);

    renderAt('/administration/students/NOPE/financial');

    expect(await screen.findByText('Student financial data not found.')).toBeInTheDocument();
  });
});

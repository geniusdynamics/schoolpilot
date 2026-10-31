// ABOUTME: Page tests for the administration pages migrated onto the canonical repository (P1-E01).
// ABOUTME: Each page renders from a real in-memory repository, a write reaches it, and a reference is an EntityPicker.

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { ToastProvider } from '@/hooks/useToast';
import { createTestContext, closeTestContext, type TestContext } from '@/data/__tests__/harness';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { DepartmentsContent } from '../DepartmentsPage';
import { DesignationsContent } from '../DesignationsPage';
import { StaffListContent } from '../StaffListPage';
import { AcademicYearsContent } from '../AcademicYearsPage';
import { StudentsListContent } from '../StudentsListPage';
import { ManualAttendanceContent } from '../ManualAttendancePage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === 'string' ? fallback : String(key).split('.').pop()?.replace(/([A-Z])/g, ' $1') ?? key,
    i18n: { language: 'en' },
  }),
}));

let context: TestContext;

beforeEach(async () => {
  context = await createTestContext();
});

afterEach(async () => {
  await closeTestContext(context);
  vi.clearAllMocks();
});

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <ConfirmProvider>
          <CanonicalRepositoryProvider repository={context.repository}>{ui}</CanonicalRepositoryProvider>
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>
  );

const submit = (dialog: HTMLElement) => {
  const form = dialog.querySelector('form');
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
};

describe('DepartmentsContent (P1-E01)', () => {
  it('lists the departments the repository holds', async () => {
    renderPage(<DepartmentsContent />);
    expect(await screen.findByText('Sciences')).toBeInTheDocument();
  });

  it('creates a department through the repository', async () => {
    renderPage(<DepartmentsContent />);
    await screen.findByText('Sciences');
    fireEvent.click(screen.getByRole('button', { name: /add Department/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Department Name/i), {
      target: { value: 'Languages' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Department kind/i), {
      target: { value: 'academic' },
    });
    submit(dialog);

    await waitFor(async () => {
      const page = await context.repository.list('department', { where: { name: 'Languages' } });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.kind).toBe('academic');
    });
  });

  it('edits a department with the version it read', async () => {
    renderPage(<DepartmentsContent />);
    await screen.findByText('Sciences');
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Department Name/i), {
      target: { value: 'Applied Sciences' },
    });
    submit(dialog);

    await waitFor(async () => {
      const row = await context.repository.get('department', context.seed.idOf('department'));
      expect(row?.name).toBe('Applied Sciences');
    });
  });
});

describe('DesignationsContent (P1-E01)', () => {
  it('creates a job title through the repository', async () => {
    renderPage(<DesignationsContent />);
    await screen.findByText('Teacher');
    fireEvent.click(screen.getByRole('button', { name: /add Designation/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Designation Title/i), {
      target: { value: 'Bursar' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Category/i), {
      target: { value: 'non_teaching' },
    });
    submit(dialog);

    await waitFor(async () => {
      const page = await context.repository.list('job_title', { where: { name: 'Bursar' } });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.category).toBe('non_teaching');
    });
  });
});

describe('StaffListContent (P1-E01)', () => {
  it('renders the staff of the repository with the department and designation resolved', async () => {
    renderPage(<StaffListContent />);
    expect(await screen.findByText('Grace Wekesa')).toBeInTheDocument();
    expect(await screen.findByText('Sciences')).toBeInTheDocument();
    expect(await screen.findByText('Teacher')).toBeInTheDocument();
  });

  it('creates a staff member through the repository', async () => {
    renderPage(<StaffListContent />);
    await screen.findByText('Grace Wekesa');
    fireEvent.click(await screen.findByRole('button', { name: /Add Staff/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Staff No\./i), { target: { value: 'EMP900' } });
    fireEvent.change(within(dialog).getByLabelText(/First Name/i), { target: { value: 'Peter' } });
    fireEvent.change(within(dialog).getByLabelText(/Last Name/i), { target: { value: 'Otieno' } });
    fireEvent.change(within(dialog).getByLabelText(/Start Date/i), {
      target: { value: '2027-01-05' },
    });
    submit(dialog);

    await waitFor(async () => {
      const page = await context.repository.list('staff', { where: { employee_number: 'EMP900' } });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.given_name).toBe('Peter');
    });
  });

  it('chooses the department through an EntityPicker', async () => {
    renderPage(<StaffListContent />);
    await screen.findByText('Grace Wekesa');
    fireEvent.click(await screen.findByRole('button', { name: /Add Staff/i }));
    const dialog = await screen.findByRole('dialog');

    const picker = await within(dialog).findByRole('combobox', { name: /Department/i });
    fireEvent.click(picker);
    const option = await screen.findByRole('option', { name: 'Sciences' });
    fireEvent.click(option);
    await waitFor(() => expect(picker).toHaveTextContent('Sciences'));
    expect(within(dialog).queryByRole('option', { name: 'Sciences' })).not.toBeInTheDocument();
  });
});

describe('AcademicYearsContent (P1-E01)', () => {
  it('lists the academic years and creates one against a calendar picked through EntityPicker', async () => {
    renderPage(<AcademicYearsContent />);
    expect(await screen.findByText('2027')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Add Academic Year/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Year Name/i), { target: { value: '2028' } });
    fireEvent.change(within(dialog).getByLabelText(/Start Date/i), {
      target: { value: '2028-01-04' },
    });
    fireEvent.change(within(dialog).getByLabelText(/End Date/i), {
      target: { value: '2028-11-29' },
    });

    const calendar = within(dialog).getByRole('combobox', { name: /Calendar/i });
    fireEvent.click(calendar);
    fireEvent.click(await screen.findByRole('option', { name: 'National Calendar' }));

    submit(dialog);

    await waitFor(async () => {
      const page = await context.repository.list('academic_year', { where: { name: '2028' } });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.calendar_id).toBe(context.seed.idOf('calendar'));
    });
  });
});

describe('StudentsListContent (P1-E01)', () => {
  it('renders a canonical learner with the class placement and the primary guardian', async () => {
    renderPage(<StudentsListContent />);
    expect(await screen.findByText('Amani Wekesa')).toBeInTheDocument();
    expect(await screen.findByText('GA/2027/001')).toBeInTheDocument();
    expect(await screen.findByText('Amani Wekesa')).toBeInTheDocument();
  });

  it('admits a learner, the guardian and the placement through the repository', async () => {
    renderPage(<StudentsListContent />);
    await screen.findByText('Amani Wekesa');
    fireEvent.click(screen.getByRole('button', { name: /Add Student/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Admission No\./i), {
      target: { value: 'GA/2027/002' },
    });
    fireEvent.change(within(dialog).getByLabelText(/First Name/i), { target: { value: 'Zawadi' } });
    fireEvent.change(within(dialog).getByLabelText(/Last Name/i), { target: { value: 'Otieno' } });

    // The class group is a reference on the academic tab, so it is chosen through an EntityPicker.
    fireEvent.click(within(dialog).getByRole('tab', { name: /Academic Details/i }));
    const picker = within(dialog).getByRole('combobox', { name: /Class Group/i });
    fireEvent.click(picker);
    fireEvent.click(await within(dialog).findByRole('option', { name: /Grade 7/ }));

    fireEvent.click(within(dialog).getByRole('button', { name: /Add Student/i }));

    await waitFor(async () => {
      const page = await context.repository.list('learner', {
        where: { admission_number: 'GA/2027/002' },
      });
      expect(page.items).toHaveLength(1);
      const learner = page.items[0]!;
      const enrolments = await context.repository.list('enrolment', {
        where: { learner_id: learner.id },
      });
      expect(enrolments.items).toHaveLength(1);
      expect(enrolments.items[0]?.class_group_id).toBe(context.seed.idOf('class_group'));
    });
  });

  it('admits a learner with the guardian filled on the Guardian Details tab', async () => {
    renderPage(<StudentsListContent />);
    await screen.findByText('Amani Wekesa');
    fireEvent.click(screen.getByRole('button', { name: /Add Student/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Admission No\./i), {
      target: { value: 'GA/2027/010' },
    });
    fireEvent.change(within(dialog).getByLabelText(/First Name/i), { target: { value: 'Neema' } });
    fireEvent.change(within(dialog).getByLabelText(/Last Name/i), { target: { value: 'Kiptoo' } });

    fireEvent.click(within(dialog).getByRole('tab', { name: /Guardian Details/i }));
    fireEvent.change(within(dialog).getByLabelText(/Guardian Full Name/i), {
      target: { value: 'Grace Otieno' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Phone Number/i), {
      target: { value: '+254711222333' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Relationship Type/i), {
      target: { value: 'Mother' },
    });

    // The submit button sits on the last tab, so the run moves there and submits from it.
    fireEvent.click(within(dialog).getByRole('tab', { name: /Academic Details/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Student/i }));

    await waitFor(async () => {
      const page = await context.repository.list('learner', {
        where: { admission_number: 'GA/2027/010' },
      });
      expect(page.items).toHaveLength(1);
      const learner = page.items[0]!;

      const links = await context.repository.list('learner_guardian', {
        where: { learner_id: learner.id },
      });
      expect(links.items).toHaveLength(1);
      expect(links.items[0]?.is_primary).toBe(true);
      expect(links.items[0]?.relationship).toBe('mother');

      const guardians = await context.repository.list('guardian', { limit: 50 });
      const guardian = guardians.items.find((row) => row.id === links.items[0]?.guardian_id);
      expect(guardian?.given_name).toBe('Grace');
      expect(guardian?.family_name).toBe('Otieno');
      expect(guardian?.phones?.[0]?.number).toBe('+254711222333');
    });
  });
});

describe('ManualAttendanceContent (P1-E01)', () => {
  it('writes one register and its marks through the attendance service', async () => {
    renderPage(<ManualAttendanceContent />);
    await screen.findByText('Manual Attendance');

    const picker = screen.getByRole('combobox', { name: /^Class$/i });
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: /Grade 7 · Blue/ }));

    const row = await screen.findByRole('row', { name: /Amani Wekesa/ });
    fireEvent.click(within(row).getByRole('button', { name: 'Absent' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Attendance/i }));

    await waitFor(
      async () => {
        const marks = await context.repository.list('attendance_mark', {
          where: { learner_id: context.seed.idOf('learner') },
        });
        expect(marks.items).toHaveLength(1);
        expect(marks.items[0]?.status).toBe('absent');
      },
      { timeout: 10000 }
    );
  });
});

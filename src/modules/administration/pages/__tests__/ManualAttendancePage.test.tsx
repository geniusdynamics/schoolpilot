// ABOUTME: Regression tests for the manual attendance roll-call (audit SO-14, probe C13).
// ABOUTME: Covers stream-id class options, seeded plus UI-created learners and one saved mark per learner.

import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManualAttendancePage from '../ManualAttendancePage';
import { ToastProvider } from '@/hooks/useToast';

const render = (ui: React.ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);

const mockUseAppData = vi.fn();

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mockUseAppData(),
  useAppDataInternal: () => mockUseAppData()
}));

const saveStudentAttendance = vi.fn();

const classes = [
  { id: 'c-7', name: 'Grade 7' },
  { id: 'c-8', name: 'Grade 8' }
];

const classStreams = [
  { id: 's-blue', class_id: 'c-7', name: 'Blue' },
  { id: 's-red', class_id: 'c-7', name: 'Red' },
  { id: 's-green', class_id: 'c-8', name: 'Green' }
];

const students = [
  // Seeded learner: denormalised class names are present.
  {
    id: 'stu-1', first_name: 'Amani', last_name: 'Otieno', admission_no: 'ADM001',
    current_class_stream_id: 's-blue', current_class_name: 'Grade 7', current_class_stream_name: 'Blue'
  },
  // UI-created learner: denormalised names were never persisted.
  {
    id: 'stu-2', first_name: 'Baraka', last_name: 'Mwangi', admission_no: 'ADM002',
    current_class_stream_id: 's-blue', current_class_name: null, current_class_stream_name: null
  },
  // Learner in another stream; must not appear for Grade 7 · Blue.
  {
    id: 'stu-3', first_name: 'Chebet', last_name: 'Kip', admission_no: 'ADM003',
    current_class_stream_id: 's-green', current_class_name: 'Grade 8', current_class_stream_name: 'Green'
  }
];

const classSelect = () => screen.getAllByRole('combobox')[0] as HTMLSelectElement;
const optionLabels = () => within(classSelect()).getAllByRole('option').map(o => o.textContent);

describe('ManualAttendancePage roll-call', () => {
  beforeEach(() => {
    saveStudentAttendance.mockReset();
    saveStudentAttendance.mockResolvedValue(undefined);
    mockUseAppData.mockReturnValue({
      students,
      classes,
      classStreams,
      loading: { all: false },
      saveStudentAttendance
    });
  });

  it('offers every class stream with its level prefix and stream-id values', () => {
    render(<ManualAttendancePage />);
    const options = within(classSelect()).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map(o => o.value)).toEqual(['', 's-blue', 's-red', 's-green']);
    expect(optionLabels()).toEqual(['All Classes', 'Grade 7 · Blue', 'Grade 7 · Red', 'Grade 8 · Green']);
  });

  it('lists the learners of the chosen stream, including UI-created ones, and keeps the options', () => {
    render(<ManualAttendancePage />);
    fireEvent.change(classSelect(), { target: { value: 's-blue' } });

    expect(screen.getByText('Amani Otieno')).toBeInTheDocument();
    expect(screen.getByText('Baraka Mwangi')).toBeInTheDocument();
    expect(screen.queryByText('Chebet Kip')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Absent' })).toHaveLength(2);
    expect(optionLabels()).toEqual(['All Classes', 'Grade 7 · Blue', 'Grade 7 · Red', 'Grade 8 · Green']);
  });

  it('saves one mark per learner of the roll-call for the date and session', async () => {
    render(<ManualAttendancePage />);
    fireEvent.change(classSelect(), { target: { value: 's-blue' } });
    fireEvent.change(screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/), { target: { value: '2026-10-09' } });

    const absentButtons = screen.getAllByRole('button', { name: 'Absent' });
    fireEvent.click(absentButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Attendance' }));

    await waitFor(() => expect(saveStudentAttendance).toHaveBeenCalledTimes(1));
    const records = saveStudentAttendance.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(records).toHaveLength(2);
    const byStudent = Object.fromEntries(records.map(r => [r.student_id, r]));
    expect(byStudent['stu-1']).toMatchObject({ date: '2026-10-09', status: 'Present', class_stream_id: 's-blue' });
    expect(byStudent['stu-2']).toMatchObject({ date: '2026-10-09', status: 'Absent', class_stream_id: 's-blue' });
    const keys = records.map(r => `${String(r.student_id)}|${String(r.date)}|${String(r.session)}`);
    expect(new Set(keys).size).toBe(records.length);
    expect(records.every(r => typeof r.session === 'string' && r.session.length > 0)).toBe(true);
  });
});

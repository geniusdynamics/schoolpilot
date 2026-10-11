// ABOUTME: Tests that marks entry lists a stream's active students for string stream ids.
// ABOUTME: Covers seeded numeric-string ids ("1") and UI-created UUID ids, which parseInt broke.

import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import StudentExamResultsEntryPage from '../StudentExamResultsEntryPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import { ToastProvider } from '@/hooks/useToast';
import { ExamSessionStatus } from '@/modules/academics/data/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const UUID_STREAM = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';

const student = (id: string, first: string, streamId: string, status = 'Active') => ({
  id,
  admission_no: id.toUpperCase(),
  first_name: first,
  last_name: 'Pupil',
  status,
  current_class_stream_id: streamId,
});

const contextValue = {
  studentExamResults: [],
  students: [
    student('s1', 'Seeded', '1'),
    student('s2', 'Twelve', '12'),
    student('s3', 'Uuidkid', UUID_STREAM),
    student('s4', 'Leaver', UUID_STREAM, 'Graduated'),
    student('s5', 'Wrongrecord', '874'),
  ],
  examSessions: [
    {
      id: 'session-1',
      name: 'Term 1 Exams',
      school_period_name: 'Term 1',
      status: ExamSessionStatus.MARKS_ENTRY_OPEN,
      paper_settings: [
        { id: 'ps-1', exam_session_id: 'session-1', subject_name: 'Maths', subject_paper_name: 'Paper 1', marks_out_of: 100 },
      ],
    },
  ],
  classStreams: [
    { id: '1', class_name: 'Form 1', name: 'A' },
    { id: '12', class_name: 'Form 1', name: 'B' },
    { id: UUID_STREAM, class_name: 'Grade 7', name: 'North' },
  ],
  loading: { students: false, examSessions: false, classStreams: false },
  saveStudentExamResult: vi.fn(),
};

const renderPage = () =>
  rtlRender(
    <ToastProvider>
      <AppDataContext.Provider value={contextValue as any}>
        <StudentExamResultsEntryPage />
      </AppDataContext.Provider>
    </ToastProvider>
  );

const chooseStream = async (streamId: string) => {
  const view = renderPage();
  const [sessionSelect, streamSelect] = Array.from(view.container.querySelectorAll('select')) as HTMLSelectElement[];
  fireEvent.change(sessionSelect, { target: { value: 'session-1' } });
  await waitFor(() => expect(streamSelect).not.toBeDisabled());
  fireEvent.change(streamSelect, { target: { value: streamId } });
  return { ...view, streamSelect };
};

describe('StudentExamResultsEntryPage stream ids', () => {
  it('lists the active students of a numeric-string stream', async () => {
    const { streamSelect } = await chooseStream('1');
    await waitFor(() => expect(screen.getByText('Seeded Pupil')).toBeInTheDocument());
    expect(streamSelect.value).toBe('1');
    expect(screen.queryByText('Twelve Pupil')).not.toBeInTheDocument();
    expect(screen.queryByText('No students in selected class stream.')).not.toBeInTheDocument();
  });

  it('lists the active students of a UUID stream without coercing the id', async () => {
    const { streamSelect } = await chooseStream(UUID_STREAM);
    await waitFor(() => expect(screen.getByText('Uuidkid Pupil')).toBeInTheDocument());
    expect(streamSelect.value).toBe(UUID_STREAM);
    expect(screen.queryByText('Leaver Pupil')).not.toBeInTheDocument();
    expect(screen.queryByText('Wrongrecord Pupil')).not.toBeInTheDocument();
  });
});

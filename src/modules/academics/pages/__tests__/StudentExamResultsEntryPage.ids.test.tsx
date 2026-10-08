// ABOUTME: Tests that marks entry lists a stream's active students for string and UUID stream ids.
// ABOUTME: Guards against the parseInt/number coercion that emptied the roster (audit SO-13, SO-22).

import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import StudentExamResultsEntryPage from '../StudentExamResultsEntryPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import { ToastProvider } from '@/hooks/useToast';
import { ExamSessionStatus } from '@/modules/academics/data/types';

const render = (ui: React.ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const UUID_STREAM = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const OTHER_STREAM = '874b9758-ffff-4e5f-8a9b-0c1d2e3f4a5b';

const studentRow = (id: string, firstName: string, streamId: string, status = 'Active') => ({
  id,
  admission_no: `ADM-${id}`,
  first_name: firstName,
  last_name: 'Pupil',
  status,
  current_class_stream_id: streamId,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const contextValue = {
  studentExamResults: [],
  students: [
    studentRow('s1', 'Amina', '1'),
    studentRow('s2', 'Baraka', '1', 'Transferred'),
    studentRow('s3', 'Chebet', UUID_STREAM),
    studentRow('s4', 'Dalmas', OTHER_STREAM),
  ],
  examSessions: [
    {
      id: 'session-1',
      name: 'Term 1 Exams',
      school_period_id: '1',
      school_period_name: 'Term 1',
      status: ExamSessionStatus.MARKS_ENTRY_OPEN,
      paper_settings: [
        {
          id: 'paper-setting-1',
          exam_session_id: 'session-1',
          subject_paper_id: '1',
          subject_name: 'Mathematics',
          subject_paper_name: 'Paper 1',
          marks_out_of: 100,
          weight_percentage: 50,
        },
      ],
    },
  ],
  classStreams: [
    { id: '1', class_id: '10', class_name: 'Form 1', name: 'A' },
    { id: UUID_STREAM, class_id: '11', class_name: 'Form 2', name: 'East' },
    { id: OTHER_STREAM, class_id: '11', class_name: 'Form 2', name: 'West' },
  ],
  loading: { students: false, examSessions: false, classStreams: false },
  saveStudentExamResult: vi.fn(),
};

const selectStream = async (streamId: string) => {
  const { container } = render(
    <AppDataContext.Provider value={contextValue as unknown as React.ContextType<typeof AppDataContext>}>
      <StudentExamResultsEntryPage />
    </AppDataContext.Provider>
  );
  const [sessionSelect, streamSelect] = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
  fireEvent.change(sessionSelect, { target: { value: 'session-1' } });
  await waitFor(() => expect(streamSelect).not.toBeDisabled());
  fireEvent.change(streamSelect, { target: { value: streamId } });
  return streamSelect;
};

describe('StudentExamResultsEntryPage stream ids', () => {
  it('lists the active students of a numeric-string stream id', async () => {
    const streamSelect = await selectStream('1');

    await waitFor(() => expect(screen.getByText('Amina Pupil')).toBeInTheDocument());
    expect(screen.queryByText('Baraka Pupil')).not.toBeInTheDocument();
    expect(screen.queryByText(/No students in selected class stream/)).not.toBeInTheDocument();
    expect(streamSelect.value).toBe('1');
  });

  it('lists the active students of a UUID stream id', async () => {
    const streamSelect = await selectStream(UUID_STREAM);

    await waitFor(() => expect(screen.getByText('Chebet Pupil')).toBeInTheDocument());
    expect(screen.queryByText('Dalmas Pupil')).not.toBeInTheDocument();
    expect(screen.queryByText(/No students in selected class stream/)).not.toBeInTheDocument();
    expect(streamSelect.value).toBe(UUID_STREAM);
  });
});

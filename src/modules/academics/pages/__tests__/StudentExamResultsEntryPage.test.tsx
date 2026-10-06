// ABOUTME: This test file covers StudentExamResultsEntryPage loading and save behavior.
// ABOUTME: It verifies the page reads live session paper settings and persists marks through AppDataContext.

import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentExamResultsEntryPage from '../StudentExamResultsEntryPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import { ToastProvider } from '@/hooks/useToast';
import { ExamSessionStatus } from '@/modules/academics/data/types';

// This file imports RTL's render directly (bypassing the global provider
// wrapper in setup.ts); the page calls useToast(), so wrap every render here.
const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<ToastProvider>{ui}</ToastProvider>, options);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const mockSaveStudentExamResult = vi.fn();

const baseContextValue = {
  studentExamResults: [],
  students: [
    {
      id: 'student-1',
      admission_no: 'ADM001',
      first_name: 'Jane',
      last_name: 'Doe',
      status: 'Active',
      current_class_stream_id: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
  ],
  examSessions: [
    {
      id: 'session-1',
      name: 'Term 1 Exams',
      school_period_id: 1,
      school_period_name: 'Term 1',
      status: ExamSessionStatus.MARKS_ENTRY_OPEN,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      paper_settings: [
        {
          id: 'paper-setting-1',
          exam_session_id: 'session-1',
          subject_paper_id: 1,
          subject_name: 'Mathematics',
          subject_paper_name: 'Paper 1',
          marks_out_of: 100,
          weight_percentage: 50,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      ]
    }
  ],
  classStreams: [
    {
      id: 1,
      class_id: 10,
      class_name: 'Grade 7',
      name: 'North'
    }
  ],
  loading: {
    students: false,
    examSessions: false,
    classStreams: false
  },
  saveStudentExamResult: mockSaveStudentExamResult
};

const renderPage = (contextOverrides: Record<string, unknown> = {}) => render(
  <AppDataContext.Provider value={{ ...baseContextValue, ...contextOverrides } as any}>
    <StudentExamResultsEntryPage />
  </AppDataContext.Provider>
);

describe('StudentExamResultsEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves entered marks through saveStudentExamResult using live session papers', async () => {
    const { container } = renderPage();

    const [sessionSelect, classStreamSelect] = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    fireEvent.change(sessionSelect, { target: { value: 'session-1' } });

    await waitFor(() => {
      expect(classStreamSelect).not.toBeDisabled();
    });

    fireEvent.change(classStreamSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save All Marks' })).toBeInTheDocument();
      expect(container.querySelector('input[type="number"]')).toBeTruthy();
    });

    fireEvent.change(container.querySelector('input[type="number"]') as HTMLInputElement, { target: { value: '78' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save All Marks' }));

    await waitFor(() => {
      expect(mockSaveStudentExamResult).toHaveBeenCalledWith({
        student_id: 'student-1',
        exam_session_id: 'session-1',
        total_marks: 78,
        marks: [
          {
            paper_setting_id: 'paper-setting-1',
            score: 78
          }
        ]
      });
    });
  }, 10000);

  it('blocks saving when a mark exceeds the configured paper maximum', async () => {
    const { container } = renderPage();

    const [sessionSelect, classStreamSelect] = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    fireEvent.change(sessionSelect, { target: { value: 'session-1' } });

    await waitFor(() => {
      expect(classStreamSelect).not.toBeDisabled();
    });

    fireEvent.change(classStreamSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save All Marks' })).toBeInTheDocument();
      expect(container.querySelector('input[type="number"]')).toBeTruthy();
    });

    fireEvent.change(container.querySelector('input[type="number"]') as HTMLInputElement, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save All Marks' }));

    await waitFor(() => {
      expect(mockSaveStudentExamResult).not.toHaveBeenCalled();
      // Out-of-range marks are blocked with a warning toast (not window.alert)
      expect(
        screen.getByText('Score for Jane Doe in Paper 1 must be between 0 and 100.')
      ).toBeInTheDocument();
    });
  }, 10000);
});

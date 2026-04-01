// ABOUTME: This test file covers ExamSessionsPage session and nested paper-setting CRUD interactions.
// ABOUTME: It verifies the page uses AppDataContext mutations instead of the removed placeholder TODO handlers.

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import ExamSessionsPage from '../ExamSessionsPage';
import { AppDataContext } from '@/contexts/AppDataContext';
import { ExamSessionStatus } from '@/modules/academics/data/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const mockAddExamSession = vi.fn();
const mockUpdateExamSession = vi.fn();
const mockDeleteExamSession = vi.fn();
const mockAddExamPaperSetting = vi.fn();
const mockUpdateExamPaperSetting = vi.fn();
const mockDeleteExamPaperSetting = vi.fn();

const baseContextValue = {
  examSessions: [
    {
      id: 'session-1',
      name: 'Mid Term',
      school_period_id: 1,
      school_period_name: 'Term 1',
      status: ExamSessionStatus.PLANNING,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      paper_settings: [
        {
          id: 'setting-1',
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
  schoolPeriods: [
    { id: 1, name: 'Term 1', is_active: true },
    { id: 2, name: 'Term 2', is_active: false }
  ],
  subjectPapers: [
    { id: 1, subject_id: 101, subject_name: 'Mathematics', name: 'Paper 1', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
    { id: 2, subject_id: 102, subject_name: 'English', name: 'Paper 1', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }
  ],
  loading: {
    examSessions: false,
    schoolPeriods: false,
    subjectPapers: false
  },
  addExamSession: mockAddExamSession,
  updateExamSession: mockUpdateExamSession,
  deleteExamSession: mockDeleteExamSession,
  addExamPaperSetting: mockAddExamPaperSetting,
  updateExamPaperSetting: mockUpdateExamPaperSetting,
  deleteExamPaperSetting: mockDeleteExamPaperSetting
};

const renderPage = (contextOverrides: Record<string, unknown> = {}) => render(
  <AppDataContext.Provider value={{ ...baseContextValue, ...contextOverrides } as any}>
    <ExamSessionsPage />
  </AppDataContext.Provider>
);

describe('ExamSessionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('creates a new exam session through the context add handler', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add Exam Session' }));
    fireEvent.change(screen.getByLabelText('Exam Session Name'), { target: { value: 'End Term' } });
    fireEvent.change(document.querySelector('select[name="school_period_id"]') as HTMLSelectElement, { target: { value: '2' } });
    fireEvent.change(document.querySelector('select[name="status"]') as HTMLSelectElement, { target: { value: ExamSessionStatus.MARKS_ENTRY_OPEN } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Session' }));

    await waitFor(() => {
      expect(mockAddExamSession).toHaveBeenCalledWith({
        name: 'End Term',
        school_period_id: 2,
        status: ExamSessionStatus.MARKS_ENTRY_OPEN
      });
    });
  });

  it('updates an existing exam session through the context update handler', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Exam Session Name'), { target: { value: 'Updated Mid Term' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateExamSession).toHaveBeenCalledWith('session-1', {
        name: 'Updated Mid Term',
        school_period_id: 1,
        status: ExamSessionStatus.PLANNING
      });
    });
  });

  it('creates and updates paper settings through nested context handlers', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Papers' }));
    fireEvent.change(document.querySelector('select[name="subject_paper_id"]') as HTMLSelectElement, { target: { value: '2' } });
    fireEvent.change(document.querySelector('input[name="marks_out_of"]') as HTMLInputElement, { target: { value: '80' } });
    fireEvent.change(document.querySelector('input[name="weight_percentage"]') as HTMLInputElement, { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Paper' }));

    await waitFor(() => {
      expect(mockAddExamPaperSetting).toHaveBeenCalledWith({
        exam_session_id: 'session-1',
        subject_paper_id: 2,
        marks_out_of: 80,
        weight_percentage: 40
      });
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    fireEvent.change(document.querySelector('input[name="marks_out_of"]') as HTMLInputElement, { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Paper' }));

    await waitFor(() => {
      expect(mockUpdateExamPaperSetting).toHaveBeenCalledWith('setting-1', {
        exam_session_id: 'session-1',
        subject_paper_id: 1,
        marks_out_of: 90,
        weight_percentage: 50
      });
    });
  });

  it('deletes exam sessions and paper settings through the context delete handlers', async () => {
    const { unmount } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mockDeleteExamSession).toHaveBeenCalledWith('session-1'));

    unmount();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Papers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Del' }));
    await waitFor(() => expect(mockDeleteExamPaperSetting).toHaveBeenCalledWith('setting-1'));
  });
});

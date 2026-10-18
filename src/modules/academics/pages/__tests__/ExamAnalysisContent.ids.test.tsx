// ABOUTME: Exam analysis with UUID ids (P0-F04, SO-13/SO-22): the stream picker keeps string ids and
// ABOUTME: the analysis finds the stream's allocations, students and marks instead of coercing ids to numbers.

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppDataContext } from '@/contexts/AppDataContext';
import { ExamAnalysisContent } from '../ExamAnalysisContent';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

const YEAR = '0192a1b2-0000-7000-8000-00000000a001';
const TERM = '0192a1b2-0000-7000-8000-00000000b001';
const STREAM = '874b9758-0000-7000-8000-00000000d001';
const SUBJECT = '0192a1b2-0000-7000-8000-00000000e001';
const PAPER = '0192a1b2-0000-7000-8000-00000000e101';
const STUDENT = '0192a1b2-0000-7000-8000-00000000f001';
const SESSION = '0192a1b2-0000-7000-8000-000000004001';
const SETTING = '0192a1b2-0000-7000-8000-000000005001';

const value = {
  examSessions: [{
    id: SESSION, name: 'End Term', school_period_id: TERM, school_period_name: 'Term 1', status: 'Published',
    created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-03-01T00:00:00.000Z',
    paper_settings: [{ id: SETTING, exam_session_id: SESSION, subject_paper_id: PAPER, marks_out_of: 100, weight_percentage: 100 }],
  }],
  classStreams: [{ id: STREAM, class_id: 'class-1', class_name: 'Grade 7', name: 'East' }],
  students: [{ id: STUDENT, first_name: 'Amani', last_name: 'Otieno', current_class_stream_id: STREAM, status: 'Active' }],
  studentExamResults: [{ id: 'res-1', exam_session_id: SESSION, student_id: STUDENT, marks: [{ paper_setting_id: SETTING, score: 72 }] }],
  subjects: [{ id: SUBJECT, name: 'Mathematics', subject_code: 'MAT' }],
  subjectPapers: [{ id: PAPER, subject_id: SUBJECT, name: 'Paper 1' }],
  classSubjectAllocations: [{ id: 'alloc-1', class_stream_id: STREAM, subject_id: SUBJECT, academic_year_id: YEAR }],
  academicYears: [{ id: YEAR, name: '2026' }],
  schoolPeriods: [{ id: TERM, academic_year_id: YEAR, name: 'Term 1' }],
  examPaperSettings: [],
  gradingSchemes: [],
  loading: {},
};

describe('ExamAnalysisContent with UUID ids (P0-F04)', () => {
  it('analyses a UUID stream and lists its subject', async () => {
    render(
      <MemoryRouter>
        <AppDataContext.Provider value={value as never}>
          <ExamAnalysisContent />
        </AppDataContext.Provider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Select Exam Session'), { target: { value: SESSION } });
    const stream = screen.getByLabelText('Select Class Stream') as HTMLSelectElement;
    fireEvent.change(stream, { target: { value: STREAM } });
    expect(stream.value).toBe(STREAM);

    fireEvent.click(screen.getByRole('button', { name: /load analysis/i }));
    await waitFor(() => expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0));
  });
});

// ABOUTME: This test file verifies academics data operations that persist exam result records.
// ABOUTME: It guards weighted total and mean grade recalculation when exam marks are saved or updated.

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAcademicsOperations } from '../useAcademicsOperations';
import {
  AcademicPeriodType,
  EducationSystemType,
  GradingSystemType
} from '@/modules/academics/data/types';

describe('useAcademicsOperations', () => {
  it('recalculates weighted totals and grades when exam results are saved', async () => {
    let currentData = {
      students: [
        {
          id: 'student-1',
          admission_no: 'ADM001',
          first_name: 'Jane',
          last_name: 'Doe',
          current_class_stream_id: 1,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      ],
      class_streams: [
        {
          id: 1,
          class_name: 'Grade 7',
          name: 'North'
        }
      ],
      exam_sessions: [
        {
          id: 'session-1',
          name: 'Term 1 Exams',
          education_system_id: 'education-system-1',
          paper_settings: [
            {
              id: 'paper-1',
              marks_out_of: 100,
              weight_percentage: 50
            },
            {
              id: 'paper-2',
              marks_out_of: 50,
              weight_percentage: 50
            }
          ]
        }
      ],
      education_system_configurations: [
        {
          id: 'education-system-1',
          name: 'Kenya Secondary',
          country_code: 'KE',
          system_type: EducationSystemType.SECONDARY,
          grading_system_type: GradingSystemType.LETTER_GRADES,
          academic_period_type: AcademicPeriodType.TERM,
          periods_per_year: 3
        }
      ],
      grading_schemes: [],
      student_exam_results: [
        {
          id: 'result-1',
          student_id: 'student-1',
          exam_session_id: 'session-1',
          total_marks: 35,
          mean_grade: 'D',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          marks: [
            { id: 'mark-1', student_exam_result_id: 'result-1', paper_setting_id: 'paper-1', score: 35 }
          ]
        }
      ]
    };
    const setData = vi.fn((updater: any) => {
      currentData = typeof updater === 'function' ? updater(currentData) : updater;
    });
    const loadAllCollections = vi.fn();
    const dbManager = {
      getCollection: vi.fn(() => null)
    } as any;

    const { result } = renderHook(() => useAcademicsOperations(dbManager, currentData, setData as any, loadAllCollections));

    let savedResult: any;
    await act(async () => {
      savedResult = await result.current.saveStudentExamResult({
        student_id: 'student-1',
        exam_session_id: 'session-1',
        total_marks: 120,
        marks: [
          { paper_setting_id: 'paper-1', score: 80 },
          { paper_setting_id: 'paper-2', score: 40 }
        ]
      });
    });

    expect(savedResult).toMatchObject({
      id: 'result-1',
      student_id: 'student-1',
      exam_session_id: 'session-1',
      total_marks: 80,
      mean_grade: 'A'
    });
    expect(savedResult.marks).toEqual([
      expect.objectContaining({
        paper_setting_id: 'paper-1',
        score: 80,
        student_exam_result_id: 'result-1'
      }),
      expect.objectContaining({
        paper_setting_id: 'paper-2',
        score: 40,
        student_exam_result_id: 'result-1'
      })
    ]);
    expect(currentData.student_exam_results).toEqual([
      expect.objectContaining({
        id: 'result-1',
        total_marks: 80,
        mean_grade: 'A'
      })
    ]);
    expect(loadAllCollections).not.toHaveBeenCalled();
  });
});

// ABOUTME: Tests for Academic domain data hook - CRUD operations for Subjects, Exams, Timetables, etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAcademicData } from '../useAcademicData';
import { databaseService } from '@/services/database/databaseService';

// Mock the database service
vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(() => 'mock-id-123'),
  },
}));

describe('useAcademicData', () => {
  const mockDb = {
    subjects: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    subject_papers: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    exam_sessions: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    exam_paper_settings: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
    },
    grading_schemes: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    student_exam_results: {
      insert: vi.fn(),
    },
    student_subject_enrollments: {
      find: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    class_subject_allocations: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    teacher_subject_assignments: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    timetable_period_defs: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    timetable_entries: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    academic_years: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    school_periods: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    academic_year_structures: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    academic_period_definitions: {
      insert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (databaseService.getDatabase as any).mockResolvedValue(mockDb);
  });

  describe('Subject CRUD Operations', () => {
    it('should add a subject successfully', async () => {
      const mockSubject = { id: 'mock-id-123', name: 'Mathematics', code: 'MATH' };
      mockDb.subjects.insert.mockResolvedValue({ doc: mockSubject });

      const { result } = renderHook(() => useAcademicData({}));

      let addedSubject: any;
      await act(async () => {
        addedSubject = await result.current.addSubject({ name: 'Mathematics', code: 'MATH' });
      });

      expect(mockDb.subjects.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Mathematics',
        code: 'MATH',
        id: 'mock-id-123',
      }));
      expect(addedSubject).toEqual(mockSubject);
    });

    it('should update a subject successfully', async () => {
      const mockSubject = { id: 'subject-1', name: 'Advanced Mathematics', code: 'MATH' };
      mockDb.subjects.update.mockResolvedValue({ doc: mockSubject });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedSubject: any;
      await act(async () => {
        updatedSubject = await result.current.updateSubject('subject-1', { name: 'Advanced Mathematics' });
      });

      expect(mockDb.subjects.update).toHaveBeenCalledWith('subject-1', { name: 'Advanced Mathematics' });
      expect(updatedSubject).toEqual(mockSubject);
    });

    it('should delete a subject successfully', async () => {
      mockDb.subjects.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAcademicData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteSubject('subject-1');
      });

      expect(mockDb.subjects.remove).toHaveBeenCalledWith('subject-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Subject Paper CRUD Operations', () => {
    it('should add a subject paper successfully', async () => {
      const mockPaper = { id: 'mock-id-123', name: 'Paper 1', subject_id: 'subject-1' };
      mockDb.subject_papers.insert.mockResolvedValue({ doc: mockPaper });

      const { result } = renderHook(() => useAcademicData({}));

      let addedPaper: any;
      await act(async () => {
        addedPaper = await result.current.addSubjectPaper({ name: 'Paper 1', subject_id: 'subject-1' });
      });

      expect(mockDb.subject_papers.insert).toHaveBeenCalled();
      expect(addedPaper).toEqual(mockPaper);
    });

    it('should update a subject paper successfully', async () => {
      const mockPaper = { id: 'paper-1', name: 'Updated Paper 1' };
      mockDb.subject_papers.update.mockResolvedValue({ doc: mockPaper });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedPaper: any;
      await act(async () => {
        updatedPaper = await result.current.updateSubjectPaper('paper-1', { name: 'Updated Paper 1' });
      });

      expect(mockDb.subject_papers.update).toHaveBeenCalledWith('paper-1', { name: 'Updated Paper 1' });
      expect(updatedPaper).toEqual(mockPaper);
    });
  });

  describe('Exam Session CRUD Operations', () => {
    it('should add an exam session successfully', async () => {
      const mockSession = { id: 'mock-id-123', name: 'Mid Term 2024', start_date: '2024-03-01' };
      mockDb.exam_sessions.insert.mockResolvedValue({ doc: mockSession });

      const { result } = renderHook(() => useAcademicData({}));

      let addedSession: any;
      await act(async () => {
        addedSession = await result.current.addExamSession({ name: 'Mid Term 2024', start_date: '2024-03-01' } as any);
      });

      expect(mockDb.exam_sessions.insert).toHaveBeenCalled();
      expect(addedSession).toEqual(mockSession);
    });

    it('should update an exam session successfully', async () => {
      const mockSession = { id: 'session-1', name: 'Updated Mid Term' };
      mockDb.exam_sessions.update.mockResolvedValue({ doc: mockSession });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedSession: any;
      await act(async () => {
        updatedSession = await result.current.updateExamSession('session-1', { name: 'Updated Mid Term' });
      });

      expect(mockDb.exam_sessions.update).toHaveBeenCalledWith('session-1', { name: 'Updated Mid Term' });
      expect(updatedSession).toEqual(mockSession);
    });

    it('should delete an exam session successfully', async () => {
      mockDb.exam_sessions.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAcademicData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteExamSession('session-1');
      });

      expect(mockDb.exam_sessions.remove).toHaveBeenCalledWith('session-1');
      expect(deleteResult).toBe(true);
    });
  });

  describe('Grading Scheme CRUD Operations', () => {
    it('should add a grading scheme successfully', async () => {
      const mockScheme = { id: 'mock-id-123', name: 'KCSE Grading', grades: [] };
      mockDb.grading_schemes.insert.mockResolvedValue({ doc: mockScheme });

      const { result } = renderHook(() => useAcademicData({}));

      let addedScheme: any;
      await act(async () => {
        addedScheme = await result.current.addGradingScheme({ name: 'KCSE Grading', grades: [] } as any);
      });

      expect(mockDb.grading_schemes.insert).toHaveBeenCalled();
      expect(addedScheme).toEqual(mockScheme);
    });

    it('should update a grading scheme successfully', async () => {
      const mockScheme = { id: 'scheme-1', name: 'Updated Grading' };
      mockDb.grading_schemes.update.mockResolvedValue({ doc: mockScheme });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedScheme: any;
      await act(async () => {
        updatedScheme = await result.current.updateGradingScheme('scheme-1', { name: 'Updated Grading' });
      });

      expect(mockDb.grading_schemes.update).toHaveBeenCalledWith('scheme-1', { name: 'Updated Grading' });
      expect(updatedScheme).toEqual(mockScheme);
    });
  });

  describe('Timetable Operations', () => {
    it('should add a timetable period definition successfully', async () => {
      const mockPeriod = { id: 'mock-id-123', name: 'Period 1', start_time: '08:00', end_time: '09:00' };
      mockDb.timetable_period_defs.insert.mockResolvedValue({ doc: mockPeriod });

      const { result } = renderHook(() => useAcademicData({}));

      let addedPeriod: any;
      await act(async () => {
        addedPeriod = await result.current.addTimetablePeriodDef({
          name: 'Period 1',
          start_time: '08:00',
          end_time: '09:00',
        } as any);
      });

      expect(mockDb.timetable_period_defs.insert).toHaveBeenCalled();
      expect(addedPeriod).toEqual(mockPeriod);
    });

    it('should add a timetable entry successfully', async () => {
      const mockEntry = { id: 'mock-id-123', class_stream_id: 1, subject_id: 'sub-1', day_of_week: 1 };
      mockDb.timetable_entries.insert.mockResolvedValue({ doc: mockEntry });

      const { result } = renderHook(() => useAcademicData({}));

      let addedEntry: any;
      await act(async () => {
        addedEntry = await result.current.addTimetableEntry({
          class_stream_id: 1,
          subject_id: 'sub-1',
          day_of_week: 1,
        } as any);
      });

      expect(mockDb.timetable_entries.insert).toHaveBeenCalled();
      expect(addedEntry).toEqual(mockEntry);
    });

    it('should update a timetable entry successfully', async () => {
      const mockEntry = { id: 'entry-1', subject_id: 'sub-2' };
      mockDb.timetable_entries.update.mockResolvedValue({ doc: mockEntry });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedEntry: any;
      await act(async () => {
        updatedEntry = await result.current.updateTimetableEntry('entry-1', { subject_id: 'sub-2' });
      });

      expect(mockDb.timetable_entries.update).toHaveBeenCalledWith('entry-1', { subject_id: 'sub-2' });
      expect(updatedEntry).toEqual(mockEntry);
    });

    it('should delete a timetable entry successfully', async () => {
      mockDb.timetable_entries.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAcademicData({}));

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteTimetableEntry('entry-1');
      });

      expect(mockDb.timetable_entries.remove).toHaveBeenCalledWith('entry-1');
      expect(deleteResult).toBe(true);
    });

    it('should get timetable entries by class stream', () => {
      const mockEntries = [
        { id: '1', class_stream_id: 1, subject_id: 'sub-1' },
        { id: '2', class_stream_id: 2, subject_id: 'sub-2' },
        { id: '3', class_stream_id: 1, subject_id: 'sub-3' },
      ];

      const { result } = renderHook(() => useAcademicData({
        timetableEntries: mockEntries,
      }));

      const entries = result.current.getTimetableEntries(1);

      expect(entries).toHaveLength(2);
      expect(entries.map((e: any) => e.id)).toContain('1');
      expect(entries.map((e: any) => e.id)).toContain('3');
    });
  });

  describe('Class Subject Allocation CRUD Operations', () => {
    it('should add a class subject allocation successfully', async () => {
      const mockAllocation = { id: 'mock-id-123', class_id: 'class-1', subject_id: 'sub-1' };
      mockDb.class_subject_allocations.insert.mockResolvedValue({ doc: mockAllocation });

      const { result } = renderHook(() => useAcademicData({}));

      let addedAllocation: any;
      await act(async () => {
        addedAllocation = await result.current.addClassSubjectAllocation({
          class_id: 'class-1',
          subject_id: 'sub-1',
        } as any);
      });

      expect(mockDb.class_subject_allocations.insert).toHaveBeenCalled();
      expect(addedAllocation).toEqual(mockAllocation);
    });

    it('should update a class subject allocation successfully', async () => {
      const mockAllocation = { id: 'alloc-1', teacher_id: 'teacher-1' };
      mockDb.class_subject_allocations.update.mockResolvedValue({ doc: mockAllocation });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedAllocation: any;
      await act(async () => {
        updatedAllocation = await result.current.updateClassSubjectAllocation('alloc-1', { teacher_id: 'teacher-1' });
      });

      expect(mockDb.class_subject_allocations.update).toHaveBeenCalledWith('alloc-1', { teacher_id: 'teacher-1' });
      expect(updatedAllocation).toEqual(mockAllocation);
    });
  });

  describe('Academic Year CRUD Operations', () => {
    it('should add an academic year successfully', async () => {
      const mockYear = { id: 'mock-id-123', name: '2024', start_date: '2024-01-01' };
      mockDb.academic_years.insert.mockResolvedValue({ doc: mockYear });

      const { result } = renderHook(() => useAcademicData({}));

      let addedYear: any;
      await act(async () => {
        addedYear = await result.current.addAcademicYear({ name: '2024', start_date: '2024-01-01' } as any);
      });

      expect(mockDb.academic_years.insert).toHaveBeenCalled();
      expect(addedYear).toEqual(mockYear);
    });

    it('should update an academic year successfully', async () => {
      const mockYear = { id: 'year-1', name: '2024-2025' };
      mockDb.academic_years.update.mockResolvedValue({ doc: mockYear });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedYear: any;
      await act(async () => {
        updatedYear = await result.current.updateAcademicYear('year-1', { name: '2024-2025' });
      });

      expect(mockDb.academic_years.update).toHaveBeenCalledWith('year-1', { name: '2024-2025' });
      expect(updatedYear).toEqual(mockYear);
    });
  });

  describe('School Period CRUD Operations', () => {
    it('should add a school period successfully', async () => {
      const mockPeriod = { id: 'mock-id-123', name: 'Term 1', start_date: '2024-01-01' };
      mockDb.school_periods.insert.mockResolvedValue({ doc: mockPeriod });

      const { result } = renderHook(() => useAcademicData({}));

      let addedPeriod: any;
      await act(async () => {
        addedPeriod = await result.current.addSchoolPeriod({ name: 'Term 1', start_date: '2024-01-01' } as any);
      });

      expect(mockDb.school_periods.insert).toHaveBeenCalled();
      expect(addedPeriod).toEqual(mockPeriod);
    });

    it('should update a school period successfully', async () => {
      const mockPeriod = { id: 'period-1', name: 'Updated Term 1' };
      mockDb.school_periods.update.mockResolvedValue({ doc: mockPeriod });

      const { result } = renderHook(() => useAcademicData({}));

      let updatedPeriod: any;
      await act(async () => {
        updatedPeriod = await result.current.updateSchoolPeriod('period-1', { name: 'Updated Term 1' });
      });

      expect(mockDb.school_periods.update).toHaveBeenCalledWith('period-1', { name: 'Updated Term 1' });
      expect(updatedPeriod).toEqual(mockPeriod);
    });
  });

  describe('Exam Results Operations', () => {
    it('should save student exam result successfully', async () => {
      const mockResult = { id: 'mock-id-123', student_id: 'student-1', exam_session_id: 'session-1', marks: 85 };
      mockDb.student_exam_results.insert.mockResolvedValue({ doc: mockResult });

      const { result } = renderHook(() => useAcademicData({}));

      let savedResult: any;
      await act(async () => {
        savedResult = await result.current.saveStudentExamResult({
          student_id: 'student-1',
          exam_session_id: 'session-1',
          marks: 85,
        });
      });

      expect(mockDb.student_exam_results.insert).toHaveBeenCalled();
      expect(savedResult).toEqual(mockResult);
    });

    it('should get students for exam entry', async () => {
      const mockEnrollments = [{ id: '1', student_id: 'student-1', exam_session_id: 'session-1' }];
      mockDb.student_subject_enrollments.find.mockResolvedValue({ docs: mockEnrollments });

      const { result } = renderHook(() => useAcademicData({}));

      let enrollments: any;
      await act(async () => {
        enrollments = await result.current.getStudentsForExamEntry('session-1');
      });

      expect(mockDb.student_subject_enrollments.find).toHaveBeenCalledWith({ exam_session_id: 'session-1' });
      expect(enrollments).toEqual(mockEnrollments);
    });

    it('should get exam paper settings for session', async () => {
      const mockSettings = [{ id: '1', exam_session_id: 'session-1', max_marks: 100 }];
      mockDb.exam_paper_settings.find.mockResolvedValue({ docs: mockSettings });

      const { result } = renderHook(() => useAcademicData({}));

      let settings: any;
      await act(async () => {
        settings = await result.current.getExamPaperSettingsForSession('session-1');
      });

      expect(mockDb.exam_paper_settings.find).toHaveBeenCalledWith({ exam_session_id: 'session-1' });
      expect(settings).toEqual(mockSettings);
    });
  });

  describe('Initial Data State', () => {
    it('should return empty arrays for all data properties initially', () => {
      const { result } = renderHook(() => useAcademicData({}));

      expect(result.current.subjects).toEqual([]);
      expect(result.current.subjectPapers).toEqual([]);
      expect(result.current.examSessions).toEqual([]);
      expect(result.current.examPaperSettings).toEqual([]);
      expect(result.current.gradingSchemes).toEqual([]);
      expect(result.current.studentExamResults).toEqual([]);
      expect(result.current.classSubjectAllocations).toEqual([]);
      expect(result.current.teacherSubjectAssignments).toEqual([]);
      expect(result.current.studentSubjectEnrollments).toEqual([]);
      expect(result.current.timetablePeriodDefs).toEqual([]);
      expect(result.current.timetableEntries).toEqual([]);
      expect(result.current.academicYears).toEqual([]);
      expect(result.current.schoolPeriods).toEqual([]);
      expect(result.current.academicYearStructures).toEqual([]);
      expect(result.current.academicPeriodDefinitions).toEqual([]);
    });
  });
});

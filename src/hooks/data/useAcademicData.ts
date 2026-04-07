// ABOUTME: Academic domain hook — Subjects, Exams, Timetables, Grading, Marks, Results,
// ABOUTME: Academic Years, Terms, Education levels, Class allocations

import { useState, useCallback } from 'react';
import type { AppDataContextType } from '../../types';
import { databaseService } from '../../services/database/databaseService';
import * as allTypes from '../../types';

type RawInitialData = AppDataContextType['rawInitialData'];

export function useAcademicData(mockDataForSeeding: RawInitialData) {
  const [academicData] = useState<{
    subjects: any[];
    subjectPapers: any[];
    examSessions: allTypes.ExamSession[];
    examPaperSettings: allTypes.ExamPaperSetting[];
    gradingSchemes: allTypes.GradingScheme[];
    studentExamResults: any[];
    classSubjectAllocations: allTypes.ClassSubjectAllocation[];
    teacherSubjectAssignments: any[];
    studentSubjectEnrollments: any[];
    timetablePeriodDefs: allTypes.TimetablePeriodDef[];
    timetableEntries: allTypes.TimetableEntry[];
    academicYears: allTypes.AcademicYear[];
    schoolPeriods: allTypes.SchoolPeriod[];
    academicYearStructures: allTypes.AcademicYearStructure[];
    academicPeriodDefinitions: allTypes.AcademicPeriodDefinition[];
  }>({
    subjects: [],
    subjectPapers: [],
    examSessions: [],
    examPaperSettings: [],
    gradingSchemes: [],
    studentExamResults: [],
    classSubjectAllocations: [],
    teacherSubjectAssignments: [],
    studentSubjectEnrollments: [],
    timetablePeriodDefs: [],
    timetableEntries: [],
    academicYears: [],
    schoolPeriods: [],
    academicYearStructures: [],
    academicPeriodDefinitions: [],
  });

  // Local mutable timetable state for optimistic updates
  const [localTimetableEntries, setLocalTimetableEntries] = useState<allTypes.TimetableEntry[]>([]);

  const getCachedCollection = useCallback(<T,>(cached: T[], fallback: T[] | undefined): T[] => {
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return Array.isArray(fallback) ? fallback : cached;
  }, []);

  const getCachedTimetablePeriodDefs = useCallback(
    () => getCachedCollection(academicData.timetablePeriodDefs, mockDataForSeeding?.timetablePeriodDefs),
    [academicData.timetablePeriodDefs, getCachedCollection, mockDataForSeeding]
  );

  const getCachedTimetableEntries = useCallback(
    () => {
      const combined = [...academicData.timetableEntries, ...localTimetableEntries];
      return getCachedCollection(combined, mockDataForSeeding?.timetableEntries);
    },
    [academicData.timetableEntries, localTimetableEntries, getCachedCollection, mockDataForSeeding]
  );

  // ── Subjects ──────────────────────────────────────────────────────────────────
  const addSubject = useCallback(async (data: Omit<any, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.subjects?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding subject:', error); throw error; }
  }, []);

  const updateSubject = useCallback(async (id: string, data: Partial<any>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.subjects?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating subject:', error); throw error; }
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.subjects?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting subject:', error); throw error; }
  }, []);

  // ── Subject Papers ────────────────────────────────────────────────────────────
  const addSubjectPaper = useCallback(async (data: Omit<any, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.subject_papers?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding subject paper:', error); throw error; }
  }, []);

  const updateSubjectPaper = useCallback(async (id: string, data: Partial<any>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.subject_papers?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating subject paper:', error); throw error; }
  }, []);

  const deleteSubjectPaper = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.subject_papers?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting subject paper:', error); throw error; }
  }, []);

  // ── Exam Sessions ─────────────────────────────────────────────────────────────
  const addExamSession = useCallback(async (data: Omit<allTypes.ExamSession, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.exam_sessions?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding exam session:', error); throw error; }
  }, []);

  const updateExamSession = useCallback(async (id: string, data: Partial<allTypes.ExamSession>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.exam_sessions?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating exam session:', error); throw error; }
  }, []);

  const deleteExamSession = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.exam_sessions?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting exam session:', error); throw error; }
  }, []);

  // ── Exam Paper Settings ───────────────────────────────────────────────────────
  const addExamPaperSetting = useCallback(async (data: Omit<allTypes.ExamPaperSetting, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.exam_paper_settings?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding exam paper setting:', error); throw error; }
  }, []);

  const updateExamPaperSetting = useCallback(async (id: string, data: Partial<allTypes.ExamPaperSetting>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.exam_paper_settings?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating exam paper setting:', error); throw error; }
  }, []);

  const deleteExamPaperSetting = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.exam_paper_settings?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting exam paper setting:', error); throw error; }
  }, []);

  // ── Grading Schemes ───────────────────────────────────────────────────────────
  const addGradingScheme = useCallback(async (data: Omit<allTypes.GradingScheme, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.grading_schemes?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding grading scheme:', error); throw error; }
  }, []);

  const updateGradingScheme = useCallback(async (id: string, data: Partial<allTypes.GradingScheme>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.grading_schemes?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating grading scheme:', error); throw error; }
  }, []);

  const deleteGradingScheme = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.grading_schemes?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting grading scheme:', error); throw error; }
  }, []);

  // ── Exam Results helpers ──────────────────────────────────────────────────────
  const getStudentsForExamEntry = useCallback(async (examSessionId: string, classId?: string) => {
    try {
      const db = await databaseService.getDatabase();
      const filters: any = { exam_session_id: examSessionId };
      if (classId) filters.class_id = classId;
      const results = await db.student_subject_enrollments?.find(filters);
      return results?.docs || [];
    } catch (error) { console.error('Error getting students for exam entry:', error); throw error; }
  }, []);

  const getExamPaperSettingsForSession = useCallback(async (examSessionId: string) => {
    try {
      const db = await databaseService.getDatabase();
      const results = await db.exam_paper_settings?.find({ exam_session_id: examSessionId });
      return results?.docs || [];
    } catch (error) { console.error('Error getting exam paper settings for session:', error); throw error; }
  }, []);

  const saveStudentExamResult = useCallback(async (resultData: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...resultData, id: databaseService.generateId() };
      const result = await db.student_exam_results?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error saving student exam result:', error); throw error; }
  }, []);

  // ── Timetable ─────────────────────────────────────────────────────────────────
  const getTimetablePeriodDefs = useCallback(() => {
    try { return getCachedTimetablePeriodDefs(); }
    catch (error) { console.error('Error getting timetable period definitions:', error); return []; }
  }, [getCachedTimetablePeriodDefs]);

  const addTimetablePeriodDef = useCallback(async (data: Omit<allTypes.TimetablePeriodDef, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.timetable_period_defs?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding timetable period definition:', error); throw error; }
  }, []);

  const updateTimetablePeriodDef = useCallback(async (id: string, data: Partial<allTypes.TimetablePeriodDef>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.timetable_period_defs?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating timetable period definition:', error); throw error; }
  }, []);

  const deleteTimetablePeriodDef = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.timetable_period_defs?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting timetable period definition:', error); throw error; }
  }, []);

  const getTimetableEntries = useCallback((classStreamId: number) => {
    try { return getCachedTimetableEntries().filter(entry => Number(entry.class_stream_id) === Number(classStreamId)); }
    catch (error) { console.error('Error getting timetable entries:', error); return []; }
  }, [getCachedTimetableEntries]);

  const addTimetableEntry = useCallback(async (data: Omit<allTypes.TimetableEntry, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.timetable_entries?.insert(d);
      const saved = result?.doc || d;
      setLocalTimetableEntries(prev => [...prev, saved]);
      return saved;
    } catch (error) { console.error('Error adding timetable entry:', error); throw error; }
  }, []);

  const updateTimetableEntry = useCallback(async (
    entryOrId: string | Partial<allTypes.TimetableEntry>,
    entryData?: Partial<allTypes.TimetableEntry>
  ) => {
    try {
      const entryId = typeof entryOrId === 'string' ? entryOrId : entryOrId.id;
      if (!entryId) throw new Error('Timetable entry id is required for updates.');
      const nextEntryData = typeof entryOrId === 'string' ? (entryData || {}) : entryOrId;
      const { id: _id, ...updatePayload } = nextEntryData;
      const db = await databaseService.getDatabase();
      const result = await db.timetable_entries?.update(entryId, updatePayload);
      const saved = result?.doc || { ...nextEntryData, id: entryId };
      setLocalTimetableEntries(prev =>
        prev.map(e => e.id === entryId ? { ...e, ...saved } : e)
      );
      return saved;
    } catch (error) { console.error('Error updating timetable entry:', error); throw error; }
  }, []);

  const deleteTimetableEntry = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.timetable_entries?.remove(id);
      setLocalTimetableEntries(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (error) { console.error('Error deleting timetable entry:', error); throw error; }
  }, []);

  // ── Class Subject Allocations ─────────────────────────────────────────────────
  const addClassSubjectAllocation = useCallback(async (data: Omit<allTypes.ClassSubjectAllocation, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.class_subject_allocations?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding class subject allocation:', error); throw error; }
  }, []);

  const updateClassSubjectAllocation = useCallback(async (id: string, data: Partial<allTypes.ClassSubjectAllocation>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.class_subject_allocations?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating class subject allocation:', error); throw error; }
  }, []);

  const deleteClassSubjectAllocation = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.class_subject_allocations?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting class subject allocation:', error); throw error; }
  }, []);

  // ── Teacher Subject Assignments ───────────────────────────────────────────────
  const addTeacherSubjectAssignment = useCallback(async (data: Omit<any, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.teacher_subject_assignments?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding teacher subject assignment:', error); throw error; }
  }, []);

  const updateTeacherSubjectAssignment = useCallback(async (id: string, data: Partial<any>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.teacher_subject_assignments?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating teacher subject assignment:', error); throw error; }
  }, []);

  const deleteTeacherSubjectAssignment = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.teacher_subject_assignments?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting teacher subject assignment:', error); throw error; }
  }, []);

  // ── Student Subject Enrollments ───────────────────────────────────────────────
  const addStudentSubjectEnrollment = useCallback(async (data: Omit<any, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.student_subject_enrollments?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding student subject enrollment:', error); throw error; }
  }, []);

  const updateStudentSubjectEnrollment = useCallback(async (id: string, data: Partial<any>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.student_subject_enrollments?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating student subject enrollment:', error); throw error; }
  }, []);

  const deleteStudentSubjectEnrollment = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.student_subject_enrollments?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting student subject enrollment:', error); throw error; }
  }, []);

  // ── Academic Years / Periods ──────────────────────────────────────────────────
  const addAcademicYearStructure = useCallback(async (data: Omit<allTypes.AcademicYearStructure, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.academic_year_structures?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding academic year structure:', error); throw error; }
  }, []);

  const updateAcademicYearStructure = useCallback(async (id: string, data: Partial<allTypes.AcademicYearStructure>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.academic_year_structures?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating academic year structure:', error); throw error; }
  }, []);

  const deleteAcademicYearStructure = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.academic_year_structures?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting academic year structure:', error); throw error; }
  }, []);

  const addAcademicPeriodDefinition = useCallback(async (data: Omit<allTypes.AcademicPeriodDefinition, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.academic_period_definitions?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding academic period definition:', error); throw error; }
  }, []);

  const updateAcademicPeriodDefinition = useCallback(async (id: string, data: Partial<allTypes.AcademicPeriodDefinition>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.academic_period_definitions?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating academic period definition:', error); throw error; }
  }, []);

  const deleteAcademicPeriodDefinition = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.academic_period_definitions?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting academic period definition:', error); throw error; }
  }, []);

  const addAcademicYear = useCallback(async (data: Omit<allTypes.AcademicYear, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.academic_years?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding academic year:', error); throw error; }
  }, []);

  const updateAcademicYear = useCallback(async (id: string, data: Partial<allTypes.AcademicYear>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.academic_years?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating academic year:', error); throw error; }
  }, []);

  const deleteAcademicYear = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.academic_years?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting academic year:', error); throw error; }
  }, []);

  const addSchoolPeriod = useCallback(async (data: Omit<allTypes.SchoolPeriod, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.school_periods?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding school period:', error); throw error; }
  }, []);

  const updateSchoolPeriod = useCallback(async (id: string, data: Partial<allTypes.SchoolPeriod>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.school_periods?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating school period:', error); throw error; }
  }, []);

  const deleteSchoolPeriod = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.school_periods?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting school period:', error); throw error; }
  }, []);

  return {
    // Data
    subjects: academicData.subjects,
    subjectPapers: academicData.subjectPapers,
    examSessions: academicData.examSessions,
    examPaperSettings: academicData.examPaperSettings,
    gradingSchemes: academicData.gradingSchemes,
    studentExamResults: academicData.studentExamResults,
    classSubjectAllocations: academicData.classSubjectAllocations,
    teacherSubjectAssignments: academicData.teacherSubjectAssignments,
    studentSubjectEnrollments: academicData.studentSubjectEnrollments,
    timetablePeriodDefs: academicData.timetablePeriodDefs,
    timetableEntries: [...academicData.timetableEntries, ...localTimetableEntries],
    academicYears: academicData.academicYears,
    schoolPeriods: academicData.schoolPeriods,
    academicYearStructures: academicData.academicYearStructures,
    academicPeriodDefinitions: academicData.academicPeriodDefinitions,

    // CRUD
    addSubject, updateSubject, deleteSubject,
    addSubjectPaper, updateSubjectPaper, deleteSubjectPaper,
    addExamSession, updateExamSession, deleteExamSession,
    addExamPaperSetting, updateExamPaperSetting, deleteExamPaperSetting,
    addGradingScheme, updateGradingScheme, deleteGradingScheme,
    getStudentsForExamEntry, getExamPaperSettingsForSession, saveStudentExamResult,
    getTimetablePeriodDefs, addTimetablePeriodDef, updateTimetablePeriodDef, deleteTimetablePeriodDef,
    getTimetableEntries, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation,
    addTeacherSubjectAssignment, updateTeacherSubjectAssignment, deleteTeacherSubjectAssignment,
    addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment,
    addAcademicYearStructure, updateAcademicYearStructure, deleteAcademicYearStructure,
    addAcademicPeriodDefinition, updateAcademicPeriodDefinition, deleteAcademicPeriodDefinition,
    addAcademicYear, updateAcademicYear, deleteAcademicYear,
    addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod,
  };
}

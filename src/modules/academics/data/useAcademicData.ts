import { logger } from '@/utils/logging';

// ABOUTME: Academic domain hook — Subjects, Exams, Timetables, Grading, Marks, Results,
// ABOUTME: Academic Years, Terms, Education levels, Class allocations
// ABOUTME: Uses real database-backed hooks for persistent data

import { useCallback, useMemo } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import * as allTypes from '@/modules/academics/data/types';
import { useEducationSystemData } from './useEducationSystemData';

export function useAcademicData() {
  const subjectsCollection = useDatabaseCollection<any>('subjects');
  const subjectPapersCollection = useDatabaseCollection<any>('subject_papers');
  const examSessionsCollection = useDatabaseCollection<allTypes.ExamSession>('exam_sessions');
  const gradingSchemesCollection = useDatabaseCollection<allTypes.GradingScheme>('grading_schemes');
  const studentExamResultsCollection = useDatabaseCollection<any>('student_exam_results');
  const classSubjectAllocationsCollection = useDatabaseCollection<allTypes.ClassSubjectAllocation>('class_subject_allocations');
  const teacherSubjectAssignmentsCollection = useDatabaseCollection<any>('teacher_subject_assignments');
  const studentSubjectEnrollmentsCollection = useDatabaseCollection<any>('student_subject_enrollments');
  const timetablePeriodDefsCollection = useDatabaseCollection<allTypes.TimetablePeriodDef>('timetable_period_definitions');
  const timetableEntriesCollection = useDatabaseCollection<allTypes.TimetableEntry>('timetable_entries');
  const academicYearsCollection = useDatabaseCollection<allTypes.AcademicYear>('academic_years');
  const schoolPeriodsCollection = useDatabaseCollection<allTypes.SchoolPeriod>('school_periods');
  const academicYearStructuresCollection = useDatabaseCollection<allTypes.AcademicYearStructure>('academic_year_structures');
  const academicPeriodDefinitionsCollection = useDatabaseCollection<allTypes.AcademicPeriodDefinition>('academic_period_definitions');

  // ── Subjects ──────────────────────────────────────────────────────────────────
  const addSubject = useCallback(async (data: Omit<any, 'id'>) => {
    return subjectsCollection.insert(data);
  }, [subjectsCollection]);

  const updateSubject = useCallback(async (id: string, data: Partial<any>) => {
    return subjectsCollection.update(id, data);
  }, [subjectsCollection]);

  const deleteSubject = useCallback(async (id: string) => {
    return subjectsCollection.remove(id);
  }, [subjectsCollection]);

  // ── Subject Papers ────────────────────────────────────────────────────────────
  const addSubjectPaper = useCallback(async (data: Omit<any, 'id'>) => {
    return subjectPapersCollection.insert(data);
  }, [subjectPapersCollection]);

  const updateSubjectPaper = useCallback(async (id: string, data: Partial<any>) => {
    return subjectPapersCollection.update(id, data);
  }, [subjectPapersCollection]);

  const deleteSubjectPaper = useCallback(async (id: string) => {
    return subjectPapersCollection.remove(id);
  }, [subjectPapersCollection]);

  // ── Exam Sessions ─────────────────────────────────────────────────────────────
  const addExamSession = useCallback(async (data: Omit<allTypes.ExamSession, 'id'>) => {
    return examSessionsCollection.insert(data);
  }, [examSessionsCollection]);

  const updateExamSession = useCallback(async (id: string, data: Partial<allTypes.ExamSession>) => {
    return examSessionsCollection.update(id, data);
  }, [examSessionsCollection]);

  const deleteExamSession = useCallback(async (id: string) => {
    return examSessionsCollection.remove(id);
  }, [examSessionsCollection]);

  // ── Exam Paper Settings (stored in exam_sessions.paper_settings) ─────────────
  const examPaperSettings = useMemo<allTypes.ExamPaperSetting[]>(() =>
    examSessionsCollection.data.flatMap((session: any) =>
      (session.paper_settings || []).map((setting: allTypes.ExamPaperSetting) => ({ ...setting, exam_session_id: session.id }))
    ), [examSessionsCollection.data]);

  const findSessionWithSetting = useCallback(async (settingId: string) => {
    const db = await databaseService.getDatabase();
    const sessions = (await db.getCollection('exam_sessions')?.find({})) || [];
    return sessions.find((session: any) => (session.paper_settings || []).some((setting: any) => setting.id === settingId));
  }, []);

  const addExamPaperSetting = useCallback(async (data: Omit<allTypes.ExamPaperSetting, 'id'>) => {
    const db = await databaseService.getDatabase();
    const session: any = await db.getCollection('exam_sessions')?.findById(String(data.exam_session_id));
    if (!session) throw new Error(`Exam session ${data.exam_session_id} not found`);
    const now = new Date().toISOString();
    const setting = { created_at: now, ...data, id: databaseService.generateId(), exam_session_id: session.id, updated_at: now } as allTypes.ExamPaperSetting;
    await examSessionsCollection.update(session.id, { paper_settings: [...(session.paper_settings || []), setting] } as any);
    return setting;
  }, [examSessionsCollection]);

  const updateExamPaperSetting = useCallback(async (id: string, data: Partial<allTypes.ExamPaperSetting>) => {
    const session: any = await findSessionWithSetting(id);
    if (!session) throw new Error(`Exam paper setting ${id} not found`);
    const paperSettings = session.paper_settings.map((setting: any) =>
      setting.id === id ? { ...setting, ...data, id, updated_at: new Date().toISOString() } : setting);
    await examSessionsCollection.update(session.id, { paper_settings: paperSettings } as any);
    return paperSettings.find((setting: any) => setting.id === id);
  }, [examSessionsCollection, findSessionWithSetting]);

  const deleteExamPaperSetting = useCallback(async (id: string) => {
    const session: any = await findSessionWithSetting(id);
    if (!session) return false;
    await examSessionsCollection.update(session.id, {
      paper_settings: session.paper_settings.filter((setting: any) => setting.id !== id),
    } as any);
    return true;
  }, [examSessionsCollection, findSessionWithSetting]);

  // ── Grading Schemes ───────────────────────────────────────────────────────────
  const addGradingScheme = useCallback(async (data: Omit<allTypes.GradingScheme, 'id'>) => {
    return gradingSchemesCollection.insert(data);
  }, [gradingSchemesCollection]);

  const updateGradingScheme = useCallback(async (id: string, data: Partial<allTypes.GradingScheme>) => {
    return gradingSchemesCollection.update(id, data);
  }, [gradingSchemesCollection]);

  const deleteGradingScheme = useCallback(async (id: string) => {
    return gradingSchemesCollection.remove(id);
  }, [gradingSchemesCollection]);

  // ── Exam Results helpers ──────────────────────────────────────────────────────
  const getStudentsForExamEntry = useCallback(async (examSessionId: string, classId?: string) => {
    try {
      const db = await databaseService.getDatabase();
      const filters: any = { exam_session_id: examSessionId };
      if (classId) filters.class_id = classId;
      const results = await db.student_subject_enrollments?.find(filters);
      return results?.docs || [];
    } catch (error) { logger.error('Error getting students for exam entry:', error); throw error; }
  }, []);

  const getExamPaperSettingsForSession = useCallback(async (examSessionId: string) => {
    try {
      const db = await databaseService.getDatabase();
      const session: any = await db.getCollection('exam_sessions')?.findById(examSessionId);
      return (session?.paper_settings || []).map((setting: any) => ({ ...setting, exam_session_id: examSessionId }));
    } catch (error) { logger.error('Error getting exam paper settings for session:', error); throw error; }
  }, []);

  const saveStudentExamResult = useCallback(async (resultData: any) => {
    return studentExamResultsCollection.insert(resultData);
  }, [studentExamResultsCollection]);

  // ── Timetable ─────────────────────────────────────────────────────────────────
  const getTimetablePeriodDefs = useCallback(() => {
    return timetablePeriodDefsCollection.data;
  }, [timetablePeriodDefsCollection.data]);

  const addTimetablePeriodDef = useCallback(async (data: Omit<allTypes.TimetablePeriodDef, 'id'>) => {
    return timetablePeriodDefsCollection.insert(data);
  }, [timetablePeriodDefsCollection]);

  const updateTimetablePeriodDef = useCallback(async (id: string, data: Partial<allTypes.TimetablePeriodDef>) => {
    return timetablePeriodDefsCollection.update(id, data);
  }, [timetablePeriodDefsCollection]);

  const deleteTimetablePeriodDef = useCallback(async (id: string) => {
    return timetablePeriodDefsCollection.remove(id);
  }, [timetablePeriodDefsCollection]);

  const getTimetableEntries = useCallback((classStreamId: number) => {
    return timetableEntriesCollection.data.filter(entry => Number(entry.class_stream_id) === Number(classStreamId));
  }, [timetableEntriesCollection.data]);

  const addTimetableEntry = useCallback(async (data: Omit<allTypes.TimetableEntry, 'id'>) => {
    return timetableEntriesCollection.insert(data);
  }, [timetableEntriesCollection]);

  const updateTimetableEntry = useCallback(async (
    entryOrId: string | Partial<allTypes.TimetableEntry>,
    entryData?: Partial<allTypes.TimetableEntry>
  ) => {
    const entryId = typeof entryOrId === 'string' ? entryOrId : entryOrId.id;
    if (!entryId) throw new Error('Timetable entry id is required for updates.');
    const nextEntryData = typeof entryOrId === 'string' ? (entryData || {}) : entryOrId;
    const updatePayload = { ...nextEntryData };
    delete updatePayload.id;
    return timetableEntriesCollection.update(entryId, updatePayload);
  }, [timetableEntriesCollection]);

  const deleteTimetableEntry = useCallback(async (id: string) => {
    return timetableEntriesCollection.remove(id);
  }, [timetableEntriesCollection]);

  // ── Class Subject Allocations ─────────────────────────────────────────────────
  const addClassSubjectAllocation = useCallback(async (data: Omit<allTypes.ClassSubjectAllocation, 'id'>) => {
    return classSubjectAllocationsCollection.insert(data);
  }, [classSubjectAllocationsCollection]);

  const updateClassSubjectAllocation = useCallback(async (id: string, data: Partial<allTypes.ClassSubjectAllocation>) => {
    return classSubjectAllocationsCollection.update(id, data);
  }, [classSubjectAllocationsCollection]);

  const deleteClassSubjectAllocation = useCallback(async (id: string) => {
    return classSubjectAllocationsCollection.remove(id);
  }, [classSubjectAllocationsCollection]);

  // ── Teacher Subject Assignments ───────────────────────────────────────────────
  const addTeacherSubjectAssignment = useCallback(async (data: Omit<any, 'id'>) => {
    return teacherSubjectAssignmentsCollection.insert(data);
  }, [teacherSubjectAssignmentsCollection]);

  const updateTeacherSubjectAssignment = useCallback(async (id: string, data: Partial<any>) => {
    return teacherSubjectAssignmentsCollection.update(id, data);
  }, [teacherSubjectAssignmentsCollection]);

  const deleteTeacherSubjectAssignment = useCallback(async (id: string) => {
    return teacherSubjectAssignmentsCollection.remove(id);
  }, [teacherSubjectAssignmentsCollection]);

  // ── Student Subject Enrollments ───────────────────────────────────────────────
  const addStudentSubjectEnrollment = useCallback(async (data: Omit<any, 'id'>) => {
    return studentSubjectEnrollmentsCollection.insert(data);
  }, [studentSubjectEnrollmentsCollection]);

  const updateStudentSubjectEnrollment = useCallback(async (id: string, data: Partial<any>) => {
    return studentSubjectEnrollmentsCollection.update(id, data);
  }, [studentSubjectEnrollmentsCollection]);

  const deleteStudentSubjectEnrollment = useCallback(async (id: string) => {
    return studentSubjectEnrollmentsCollection.remove(id);
  }, [studentSubjectEnrollmentsCollection]);

  // ── Academic Years / Periods ──────────────────────────────────────────────────
  const addAcademicYearStructure = useCallback(async (data: Omit<allTypes.AcademicYearStructure, 'id'>) => {
    return academicYearStructuresCollection.insert(data);
  }, [academicYearStructuresCollection]);

  const updateAcademicYearStructure = useCallback(async (id: string, data: Partial<allTypes.AcademicYearStructure>) => {
    return academicYearStructuresCollection.update(id, data);
  }, [academicYearStructuresCollection]);

  const deleteAcademicYearStructure = useCallback(async (id: string) => {
    return academicYearStructuresCollection.remove(id);
  }, [academicYearStructuresCollection]);

  const addAcademicPeriodDefinition = useCallback(async (data: Omit<allTypes.AcademicPeriodDefinition, 'id'>) => {
    return academicPeriodDefinitionsCollection.insert(data);
  }, [academicPeriodDefinitionsCollection]);

  const updateAcademicPeriodDefinition = useCallback(async (id: string, data: Partial<allTypes.AcademicPeriodDefinition>) => {
    return academicPeriodDefinitionsCollection.update(id, data);
  }, [academicPeriodDefinitionsCollection]);

  const deleteAcademicPeriodDefinition = useCallback(async (id: string) => {
    return academicPeriodDefinitionsCollection.remove(id);
  }, [academicPeriodDefinitionsCollection]);

  const addAcademicYear = useCallback(async (data: Omit<allTypes.AcademicYear, 'id'>) => {
    return academicYearsCollection.insert(data);
  }, [academicYearsCollection]);

  const updateAcademicYear = useCallback(async (id: string, data: Partial<allTypes.AcademicYear>) => {
    return academicYearsCollection.update(id, data);
  }, [academicYearsCollection]);

  const deleteAcademicYear = useCallback(async (id: string) => {
    return academicYearsCollection.remove(id);
  }, [academicYearsCollection]);

  const addSchoolPeriod = useCallback(async (data: Omit<allTypes.SchoolPeriod, 'id'>) => {
    return schoolPeriodsCollection.insert(data);
  }, [schoolPeriodsCollection]);

  const updateSchoolPeriod = useCallback(async (id: string, data: Partial<allTypes.SchoolPeriod>) => {
    return schoolPeriodsCollection.update(id, data);
  }, [schoolPeriodsCollection]);

  const deleteSchoolPeriod = useCallback(async (id: string) => {
    return schoolPeriodsCollection.remove(id);
  }, [schoolPeriodsCollection]);

  // ── Education System Configurations (id, patch) facade ─────────────────────
  const {
    educationSystemConfigurations,
    addEducationSystemConfiguration: addStoredEducationSystem,
    updateEducationSystemConfiguration: replaceStoredEducationSystem,
    deleteEducationSystemConfiguration: deleteStoredEducationSystem,
    getEducationSystemConfiguration,
  } = useEducationSystemData();

  const addEducationSystemConfiguration = useCallback(async (data: Partial<allTypes.EducationSystemConfiguration>) => {
    const record = { ...data, id: data.id || `edu-system-${databaseService.generateId()}` };
    await addStoredEducationSystem(record);
    return record;
  }, [addStoredEducationSystem]);

  const updateEducationSystemConfiguration = useCallback(async (id: string, data: Partial<allTypes.EducationSystemConfiguration>) => {
    const current = getEducationSystemConfiguration(id);
    if (!current) throw new Error(`Education system ${id} not found`);
    return replaceStoredEducationSystem({ ...current, ...data, id });
  }, [getEducationSystemConfiguration, replaceStoredEducationSystem]);

  const deleteEducationSystemConfiguration = useCallback(async (id: string) => {
    return deleteStoredEducationSystem(id);
  }, [deleteStoredEducationSystem]);

  return {
    // Data
    subjects: subjectsCollection.data,
    subjectPapers: subjectPapersCollection.data,
    examSessions: examSessionsCollection.data,
    examPaperSettings,
    educationSystemConfigurations,
    gradingSchemes: gradingSchemesCollection.data,
    studentExamResults: studentExamResultsCollection.data,
    classSubjectAllocations: classSubjectAllocationsCollection.data,
    teacherSubjectAssignments: teacherSubjectAssignmentsCollection.data,
    studentSubjectEnrollments: studentSubjectEnrollmentsCollection.data,
    timetablePeriodDefs: timetablePeriodDefsCollection.data,
    timetableEntries: timetableEntriesCollection.data,
    academicYears: academicYearsCollection.data,
    schoolPeriods: schoolPeriodsCollection.data,
    academicYearStructures: academicYearStructuresCollection.data,
    academicPeriodDefinitions: academicPeriodDefinitionsCollection.data,

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
    addEducationSystemConfiguration, updateEducationSystemConfiguration, deleteEducationSystemConfiguration,
  };
}

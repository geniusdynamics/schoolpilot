// ABOUTME: Hook containing all Academics-specific data operations
// ABOUTME: Extracted from AppDataContext to reduce God Object size

import { useCallback } from 'react';
import { UnifiedDatabaseManager } from '../../services/database/UnifiedDatabaseManager';
import { normalizeAppDataCollections } from './appDataCollections';
import { GradingSystemType } from '../../modules/academics/data/types';
import { GradingEngineService } from '../../modules/academics/services/GradingEngineService';

const roundScore = (value: number) => Number(value.toFixed(2));

const calculateWeightedTotalMarks = (
  marks: any[],
  session: any,
  fallbackTotal: unknown
) => {
  if (!Array.isArray(marks) || marks.length === 0) {
    const numericFallback = Number(fallbackTotal);
    return Number.isFinite(numericFallback) ? numericFallback : null;
  }

  let usedPaperWeights = false;
  const weightedTotal = marks.reduce((sum, mark) => {
    const paperSetting = (session?.paper_settings || []).find(
      (item: any) => String(item.id) === String(mark.paper_setting_id)
    );
    const score = Number(mark.score ?? 0);
    const marksOutOf = Number(paperSetting?.marks_out_of);
    const weightPercentage = Number(paperSetting?.weight_percentage);

    if (!paperSetting || !Number.isFinite(score) || !Number.isFinite(marksOutOf) || marksOutOf <= 0) {
      return sum;
    }

    if (!Number.isFinite(weightPercentage) || weightPercentage < 0) {
      return sum;
    }

    usedPaperWeights = true;
    return sum + ((score / marksOutOf) * weightPercentage);
  }, 0);

  if (usedPaperWeights) {
    return roundScore(weightedTotal);
  }

  const rawTotal = marks.reduce((sum, mark) => sum + Number(mark.score || 0), 0);
  return roundScore(rawTotal);
};

const resolveEducationSystem = (normalized: Record<string, any[]>, session: any) => {
  const educationSystems = normalized.educationSystemConfigurations || [];
  if (!educationSystems.length) {
    return { grading_system_type: GradingSystemType.LETTER_GRADES };
  }

  return educationSystems.find((item: any) =>
    String(item.id) === String(session?.education_system_id)
  ) || educationSystems[0];
};

const resolveGradingScheme = (
  normalized: Record<string, any[]>,
  educationSystem: any
) => {
  const gradingSchemes = normalized.gradingSchemes || [];
  if (!gradingSchemes.length) {
    return undefined;
  }

  const matchingSchemes = gradingSchemes.filter((scheme: any) =>
    !educationSystem?.id ||
    !scheme.education_system_id ||
    String(scheme.education_system_id) === String(educationSystem.id)
  );

  return matchingSchemes.find((scheme: any) => scheme.is_default) ||
    matchingSchemes[0] ||
    gradingSchemes.find((scheme: any) => scheme.is_default) ||
    gradingSchemes[0];
};

const calculateMeanGrade = (
  normalized: Record<string, any[]>,
  session: any,
  totalMarks: number | null,
  fallbackMeanGrade: unknown
) => {
  if (totalMarks === null) {
    return typeof fallbackMeanGrade === 'string' ? fallbackMeanGrade : null;
  }

  try {
    const educationSystem = resolveEducationSystem(normalized, session);
    const gradingScheme = resolveGradingScheme(normalized, educationSystem);
    const gradingEngine = new GradingEngineService(educationSystem as any);
    const gradedResult = gradingEngine.calculateGrades({
      id: 'calculated-result',
      student_id: 'calculated-student',
      exam_session_id: String(session?.id || 'calculated-session'),
      total_marks: totalMarks,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString()
    } as any, gradingScheme as any);

    return gradedResult.mean_grade ?? null;
  } catch {
    return typeof fallbackMeanGrade === 'string' ? fallbackMeanGrade : null;
  }
};

export const useAcademicsOperations = (
  dbManager: UnifiedDatabaseManager,
  data: Record<string, any[]>,
  setData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>,
  loadAllCollections: () => Promise<void>
) => {
  const getNormalizedData = useCallback(() => normalizeAppDataCollections(data), [data]);

  const getTimetablePeriodDefs = useCallback(() => {
    return getNormalizedData().timetablePeriodDefs || [];
  }, [getNormalizedData]);

  const getTimetableEntries = useCallback((classStreamId: number) => {
    return (getNormalizedData().timetableEntries || []).filter((entry: any) => Number(entry.class_stream_id) === Number(classStreamId));
  }, [getNormalizedData]);

  const getStudentAttendanceByFilters = useCallback((date: string, classStreamId: number, periodId: number) => {
    const normalized = getNormalizedData();
    const studentsInStream = (normalized.students || []).filter((student: any) => Number(student.current_class_stream_id) === Number(classStreamId));
    const studentIds = new Set(studentsInStream.map((student: any) => String(student.id)));

    return (normalized.studentAttendance || []).filter((record: any) =>
      record.date === date &&
      Number(record.period_id) === Number(periodId) &&
      studentIds.has(String(record.student_id))
    );
  }, [getNormalizedData]);

  const saveStudentAttendance = useCallback(async (attendanceRecords: any[]) => {
    const collection = dbManager.getCollection('student_attendance');
    const records = Array.isArray(attendanceRecords) ? attendanceRecords : [attendanceRecords];
    const normalizedRecords = records.map((record) => ({
      ...record,
      id: record.id || `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (collection) {
      if (typeof collection.insertMany === 'function') {
        await collection.insertMany(normalizedRecords);
      } else {
        for (const record of normalizedRecords) {
          await collection.insert(record);
        }
      }
      await loadAllCollections();
      return;
    }

    setData((previous) => ({
      ...previous,
      student_attendance: [...(previous.student_attendance || []), ...normalizedRecords]
    }));
  }, [dbManager, loadAllCollections, setData]);

  const resolveSubjectPaperDetails = useCallback((subjectPaperId: number) => {
    const normalized = getNormalizedData();
    const subjectPaper = (normalized.subjectPapers || []).find(
      (item: any) => Number(item.id) === Number(subjectPaperId)
    );
    return {
      subject_name: subjectPaper?.subject_name || null,
      subject_paper_name: subjectPaper?.name || null
    };
  }, [getNormalizedData]);

  const mutateExamSessionRecord = useCallback(async (
    sessionId: string,
    updater: (session: any, timestamp: string) => any
  ) => {
    const normalized = getNormalizedData();
    const currentSession = (normalized.examSessions || []).find((item: any) => String(item.id) === String(sessionId));
    if (!currentSession) {
      throw new Error(`Exam session ${sessionId} not found`);
    }

    const timestamp = new Date().toISOString();
    const nextSession = updater(currentSession, timestamp);
    const collection = dbManager.getCollection('exam_sessions');

    if (collection && typeof collection.update === 'function') {
      await collection.update(String(sessionId), nextSession);
      await loadAllCollections();
      return nextSession;
    }

    setData((previous) => ({
      ...previous,
      exam_sessions: (previous.exam_sessions || []).map((session: any) =>
        String(session.id) === String(sessionId) ? nextSession : session
      )
    }));
    return nextSession;
  }, [dbManager, getNormalizedData, loadAllCollections, setData]);

  const addExamSession = useCallback(async (sessionData: any) => {
    const normalized = getNormalizedData();
    const schoolPeriod = (normalized.schoolPeriods || []).find(
      (item: any) => Number(item.id) === Number(sessionData.school_period_id)
    );
    const timestamp = new Date().toISOString();
    const nextSession = {
      ...sessionData,
      id: sessionData.id || `exam-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      paper_settings: Array.isArray(sessionData.paper_settings) ? sessionData.paper_settings : [],
      school_period_name: sessionData.school_period_name || schoolPeriod?.name || null,
      created_at: sessionData.created_at || timestamp,
      updated_at: timestamp
    };
    const collection = dbManager.getCollection('exam_sessions');

    if (collection) {
      await collection.insert(nextSession);
      await loadAllCollections();
      return nextSession;
    }

    setData((previous) => ({
      ...previous,
      exam_sessions: [...(previous.exam_sessions || []), nextSession]
    }));
    return nextSession;
  }, [dbManager, getNormalizedData, loadAllCollections, setData]);

  const updateExamSession = useCallback(async (sessionId: string, sessionData: any) => {
    return mutateExamSessionRecord(sessionId, (currentSession, timestamp) => {
      const normalized = getNormalizedData();
      const schoolPeriodId = sessionData.school_period_id ?? currentSession.school_period_id;
      const schoolPeriod = (normalized.schoolPeriods || []).find((item: any) => Number(item.id) === Number(schoolPeriodId));
      return {
        ...currentSession,
        ...sessionData,
        school_period_name: sessionData.school_period_name || schoolPeriod?.name || currentSession.school_period_name || null,
        updated_at: timestamp
      };
    });
  }, [getNormalizedData, mutateExamSessionRecord]);

  const deleteExamSession = useCallback(async (sessionId: string) => {
    const collection = dbManager.getCollection('exam_sessions');
    if (collection && typeof collection.remove === 'function') {
      await collection.remove(String(sessionId));
      await loadAllCollections();
      return;
    }

    setData((previous) => ({
      ...previous,
      exam_sessions: (previous.exam_sessions || []).filter((session: any) => String(session.id) !== String(sessionId))
    }));
  }, [dbManager, loadAllCollections, setData]);

  const addExamPaperSetting = useCallback(async (settingData: any) => {
    const timestamp = new Date().toISOString();
    const paperDetails = resolveSubjectPaperDetails(Number(settingData.subject_paper_id));
    const nextSetting = {
      ...settingData,
      ...paperDetails,
      id: settingData.id || `paper-setting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: settingData.created_at || timestamp,
      updated_at: timestamp
    };
    return mutateExamSessionRecord(String(settingData.exam_session_id), (currentSession, updatedAt) => ({
      ...currentSession,
      paper_settings: [...(currentSession.paper_settings || []), { ...nextSetting, updated_at: updatedAt }],
      updated_at: updatedAt
    }));
  }, [mutateExamSessionRecord, resolveSubjectPaperDetails]);

  const updateExamPaperSetting = useCallback(async (settingId: string, settingData: any) => {
    const normalized = getNormalizedData();
    const currentSession = (normalized.examSessions || []).find((session: any) =>
      (session.paper_settings || []).some((setting: any) => String(setting.id) === String(settingId))
    );
    if (!currentSession) {
      throw new Error(`Exam paper setting ${settingId} not found`);
    }

    return mutateExamSessionRecord(String(currentSession.id), (session, timestamp) => ({
      ...session,
      paper_settings: (session.paper_settings || []).map((setting: any) => {
        if (String(setting.id) !== String(settingId)) return setting;
        const paperDetails = resolveSubjectPaperDetails(Number(settingData.subject_paper_id ?? setting.subject_paper_id));
        return { ...setting, ...settingData, ...paperDetails, updated_at: timestamp };
      }),
      updated_at: timestamp
    }));
  }, [getNormalizedData, mutateExamSessionRecord, resolveSubjectPaperDetails]);

  const deleteExamPaperSetting = useCallback(async (settingId: string) => {
    const normalized = getNormalizedData();
    const currentSession = (normalized.examSessions || []).find((session: any) =>
      (session.paper_settings || []).some((setting: any) => String(setting.id) === String(settingId))
    );
    if (!currentSession) {
      return;
    }

    await mutateExamSessionRecord(String(currentSession.id), (session, timestamp) => ({
      ...session,
      paper_settings: (session.paper_settings || []).filter((setting: any) => String(setting.id) !== String(settingId)),
      updated_at: timestamp
    }));
  }, [getNormalizedData, mutateExamSessionRecord]);

  const saveStudentExamResult = useCallback(async (resultData: any) => {
    const normalized = getNormalizedData();
    const existingResult = (normalized.studentExamResults || []).find((item: any) =>
      String(item.student_id) === String(resultData.student_id) &&
      String(item.exam_session_id) === String(resultData.exam_session_id)
    );
    const timestamp = new Date().toISOString();
    const student = (normalized.students || []).find((item: any) => String(item.id) === String(resultData.student_id));
    const session = (normalized.examSessions || []).find((item: any) => String(item.id) === String(resultData.exam_session_id));
    const classStream = (normalized.classStreams || []).find((item: any) => Number(item.id) === Number(student?.current_class_stream_id));
    const markInputs = Array.isArray(resultData.marks) ? resultData.marks : (existingResult?.marks || []);
    const marks = markInputs.map((mark: any) => {
      const paper = (session?.paper_settings || []).find((item: any) => String(item.id) === String(mark.paper_setting_id));
      return {
        ...mark,
        id: mark.id || `paper-mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        student_exam_result_id: existingResult?.id || resultData.id || '',
        subject_name: mark.subject_name || paper?.subject_name || null,
        subject_paper_name: mark.subject_paper_name || paper?.subject_paper_name || null,
        marks_out_of: mark.marks_out_of ?? paper?.marks_out_of ?? null
      };
    });
    const totalMarks = calculateWeightedTotalMarks(
      marks,
      session,
      resultData.total_marks ?? existingResult?.total_marks
    );
    const meanGrade = calculateMeanGrade(
      normalized,
      session,
      totalMarks,
      resultData.mean_grade ?? existingResult?.mean_grade
    );
    const nextResult = {
      ...existingResult,
      ...resultData,
      id: existingResult?.id || resultData.id || `exam-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      total_marks: totalMarks,
      mean_grade: meanGrade,
      marks,
      student_name: resultData.student_name || (student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : null),
      admission_no: resultData.admission_no || student?.admission_no || null,
      class_name: resultData.class_name || classStream?.class_name || student?.current_class_name || null,
      stream_name: resultData.stream_name || classStream?.name || student?.current_class_stream_name || null,
      exam_session_name: resultData.exam_session_name || session?.name || null,
      created_at: existingResult?.created_at || resultData.created_at || timestamp,
      updated_at: timestamp
    };
    nextResult.marks = marks.map((mark: any) => ({ ...mark, student_exam_result_id: nextResult.id }));
    const collection = dbManager.getCollection('student_exam_results');

    if (collection) {
      if (existingResult && typeof collection.update === 'function') {
        await collection.update(String(existingResult.id), nextResult);
      } else {
        await collection.insert(nextResult);
      }
      await loadAllCollections();
      return nextResult;
    }

    setData((previous) => ({
      ...previous,
      student_exam_results: existingResult
        ? (previous.student_exam_results || []).map((result: any) => String(result.id) === String(existingResult.id) ? nextResult : result)
        : [...(previous.student_exam_results || []), nextResult]
    }));
    return nextResult;
  }, [dbManager, getNormalizedData, loadAllCollections, setData]);

  const addTimetableEntry = useCallback(async (entryData: any) => {
    const normalized = getNormalizedData();
    const classStream = (normalized.classStreams || []).find((item: any) => Number(item.id) === Number(entryData.class_stream_id));
    const period = (normalized.timetablePeriodDefs || []).find((item: any) => Number(item.id) === Number(entryData.period_id));
    const subject = (normalized.subjects || []).find((item: any) => Number(item.id) === Number(entryData.subject_id));
    const teacher = (normalized.staff || []).find((item: any) => String(item.id) === String(entryData.teacher_id));

    const newEntry = {
      ...entryData,
      id: entryData.id || `tt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      class_stream_name: entryData.class_stream_name || (classStream ? `${classStream.class_name || ''} ${classStream.name || ''}`.trim() : ''),
      period_name: entryData.period_name || period?.period_name || '',
      subject_name: entryData.subject_name || subject?.name || subject?.subject_name || '',
      teacher_name: entryData.teacher_name || (teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : ''),
      created_at: entryData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const collection = dbManager.getCollection('timetable_entries');
    if (collection) {
      await collection.insert(newEntry);
      await loadAllCollections();
      return;
    }

    setData((previous) => ({
      ...previous,
      timetable_entries: [...(previous.timetable_entries || []), newEntry]
    }));
  }, [dbManager, getNormalizedData, loadAllCollections, setData]);

  const updateTimetableEntry = useCallback(async (updatedEntry: any) => {
    const collection = dbManager.getCollection('timetable_entries');
    const nextEntry = {
      ...updatedEntry,
      updated_at: new Date().toISOString()
    };

    if (collection && typeof collection.update === 'function') {
      await collection.update(String(updatedEntry.id), nextEntry);
      await loadAllCollections();
      return;
    }

    setData((previous) => ({
      ...previous,
      timetable_entries: (previous.timetable_entries || []).map((entry: any) =>
        String(entry.id) === String(updatedEntry.id) ? nextEntry : entry
      )
    }));
  }, [dbManager, loadAllCollections, setData]);

  const deleteTimetableEntry = useCallback(async (entryId: string) => {
    const collection = dbManager.getCollection('timetable_entries');
    if (collection && typeof collection.remove === 'function') {
      await collection.remove(String(entryId));
      await loadAllCollections();
      return;
    }

    setData((previous) => ({
      ...previous,
      timetable_entries: (previous.timetable_entries || []).filter((entry: any) => String(entry.id) !== String(entryId))
    }));
  }, [dbManager, loadAllCollections, setData]);

  return {
    getTimetablePeriodDefs,
    getTimetableEntries,
    getStudentAttendanceByFilters,
    saveStudentAttendance,
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting,
    saveStudentExamResult,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
  };
};

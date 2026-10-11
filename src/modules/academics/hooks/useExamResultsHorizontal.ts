// ABOUTME: Computed view hook replacing vw_edm_exam_results_horizontal
// ABOUTME: Pivots student exam results into a horizontal format with subject scores as columns
// ABOUTME: Mirrors the SQL view: joins exam results with students, exam_sessions, paper marks, and subjects

import { useMemo, useCallback } from 'react';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

/**
 * Represents a single row of the exam results horizontal view.
 * Each row is one student's result for one exam session, with subject scores
 * pivoted into a Record keyed by subject abbreviation.
 */
export interface ExamResultsHorizontalRow {
  /** Exam result ID (from edm.student_exam_results.id) */
  resultId: string;
  /** Student admission number */
  admissionNo: string;
  /** Full student name (first + last) */
  studentName: string;
  /** Exam session name (e.g., "Mid-Term Exam 2025") */
  examName: string;
  /** Total marks across all subjects */
  totalMarks: number | null;
  /** Mean grade (e.g., "B+", "A-") */
  meanGrade: string | null;
  /** Rank within the stream */
  streamRank: number | null;
  /** Rank within the class */
  classRank: number | null;
  /** Subject scores pivoted by abbreviation (e.g., { ENG: 85, KIS: 72, MAT: 68 }) */
  subjectScores: Record<string, number | null>;
}

/**
 * Computed view hook that replicates `vw_edm_exam_results_horizontal`.
 *
 * Aggregates data from:
 * - student_exam_results (core result records)
 * - student_paper_marks (individual paper scores)
 * - exam_sessions.paper_settings (paper weight/marks_out_of, nested in each session)
 * - subject_papers (link between paper settings and subjects)
 * - subjects (subject names and abbreviations)
 * - exam_sessions (exam name)
 * - students (admission_no, name)
 *
 * The pivot logic computes weighted scores:
 *   weighted_score = (score / marks_out_of) * 100 * (weight_percentage / 100)
 * then groups by result_id and pivots subject abbreviations into columns.
 *
 * Usage:
 * ```tsx
 * const { data: results, loading, error, refresh } = useExamResultsHorizontal();
 * ```
 */
export function useExamResultsHorizontal() {
  const studentExamResultsCol = useDatabaseCollection<Record<string, any>>('student_exam_results');
  const studentPaperMarksCol = useDatabaseCollection<Record<string, any>>('student_paper_marks');
  const subjectPapersCol = useDatabaseCollection<Record<string, any>>('subject_papers');
  const subjectsCol = useDatabaseCollection<Record<string, any>>('subjects');
  const examSessionsCol = useDatabaseCollection<Record<string, any>>('exam_sessions');
  const studentsCol = useDatabaseCollection<Record<string, any>>('students');

  const data = useMemo<ExamResultsHorizontalRow[]>(() => {
    if (
      studentExamResultsCol.loading ||
      studentPaperMarksCol.loading ||
      subjectPapersCol.loading ||
      subjectsCol.loading ||
      examSessionsCol.loading ||
      studentsCol.loading
    ) {
      return [];
    }

    const examResults = studentExamResultsCol.data;
    const paperMarks = studentPaperMarksCol.data;
    const subjectPapersList = subjectPapersCol.data;
    const subjects = subjectsCol.data;
    const examSessions = examSessionsCol.data;
    const paperSettings: Record<string, any>[] = examSessions.flatMap(session => session.paper_settings || []);
    const students = studentsCol.data;

    // Build lookup maps for O(1) access
    const studentMap = new Map(students.map(s => [String(s.id), s]));
    const examSessionMap = new Map(examSessions.map(es => [String(es.id), es]));
    const subjectMap = new Map(subjects.map(sub => [String(sub.id), sub]));

    // Build paper_setting → (subject_id, weighted_score) lookup
    // First map paper_setting_id → { paperSetting, subjectId }
    const paperSettingMap = new Map(paperSettings.map(ps => [String(ps.id), ps]));

    // Map subject_paper_id to subject_id via subject_papers
    const subjectPaperMap = new Map(subjectPapersList.map(sp => [String(sp.id), sp]));

    // Step 1: For each paper mark, compute the weighted score per subject
    // grouped by (student_exam_result_id, subject_id)
    const resultSubjectScores = new Map<string, Map<string, number>>();
    // Key: resultId, Value: Map<subjectAbbreviation, sumOfWeightedScores>

    for (const mark of paperMarks) {
      const resultId = String(mark.student_exam_result_id);
      const paperSettingId = String(mark.paper_setting_id);
      const score = Number(mark.score) || 0;

      // Look up paper setting for marks_out_of and weight_percentage
      const paperSetting = paperSettingMap.get(paperSettingId);
      if (!paperSetting) continue;

      const marksOutOf = Number(paperSetting.marks_out_of) || 100;
      const weightPercentage = Number(paperSetting.weight_percentage) || 100;

      // Look up subject via paper setting → subject_paper → subject
      const subjectPaperId = String(paperSetting.subject_paper_id);
      const subjectPaper = subjectPaperMap.get(subjectPaperId);
      if (!subjectPaper) continue;

      const subjectId = String(subjectPaper.subject_id);
      const subject = subjectMap.get(subjectId);
      if (!subject) continue;

      const abbreviation = String(subject.abbreviation ?? subject.name ?? 'UNKNOWN');

      // Compute weighted score: (score / marks_out_of) * 100 * (weight_percentage / 100)
      const weightedScore = marksOutOf > 0
        ? (score / marksOutOf) * 100 * (weightPercentage / 100)
        : 0;

      if (!resultSubjectScores.has(resultId)) {
        resultSubjectScores.set(resultId, new Map());
      }
      const subjectMapForResult = resultSubjectScores.get(resultId)!;
      subjectMapForResult.set(
        abbreviation,
        (subjectMapForResult.get(abbreviation) ?? 0) + weightedScore
      );
    }

    // Step 2: Build the horizontal result rows
    const result: ExamResultsHorizontalRow[] = [];

    for (const examResult of examResults) {
      const resultId = String(examResult.id);
      const studentId = String(examResult.student_id);
      const examSessionId = String(examResult.exam_session_id);

      // Resolve student info
      const student = studentMap.get(studentId);
      const admissionNo = student ? String(student.admission_no ?? '') : '';
      const firstName = student ? String(student.first_name ?? '') : '';
      const lastName = student ? String(student.last_name ?? '') : '';
      const studentName = `${firstName} ${lastName}`.trim();

      // Resolve exam session name
      const examSession = examSessionMap.get(examSessionId);
      const examName = examSession ? String(examSession.name ?? '') : '';

      // Get subject scores for this result, rounding to 2 decimal places
      const subjectScores: Record<string, number | null> = {};
      const scoresForResult = resultSubjectScores.get(resultId);
      if (scoresForResult) {
        for (const [abbr, score] of scoresForResult) {
          subjectScores[abbr] = Math.round(score * 100) / 100;
        }
      }

      result.push({
        resultId,
        admissionNo,
        studentName,
        examName,
        totalMarks: examResult.total_marks != null ? Number(examResult.total_marks) : null,
        meanGrade: examResult.mean_grade != null ? String(examResult.mean_grade) : null,
        streamRank: examResult.stream_rank != null ? Number(examResult.stream_rank) : null,
        classRank: examResult.class_rank != null ? Number(examResult.class_rank) : null,
        subjectScores,
      });
    }

    return result;
  }, [
    studentExamResultsCol.data, studentPaperMarksCol.data,
    subjectPapersCol.data,
    subjectsCol.data, examSessionsCol.data, studentsCol.data,
    studentExamResultsCol.loading, studentPaperMarksCol.loading,
    subjectPapersCol.loading,
    subjectsCol.loading, examSessionsCol.loading, studentsCol.loading,
  ]);

  const { refresh: refreshExamResults } = studentExamResultsCol;
  const { refresh: refreshPaperMarks } = studentPaperMarksCol;
  const { refresh: refreshSubjectPapers } = subjectPapersCol;
  const { refresh: refreshSubjects } = subjectsCol;
  const { refresh: refreshExamSessions } = examSessionsCol;
  const { refresh: refreshStudents } = studentsCol;
  const refresh = useCallback(async () => {
    await Promise.all([
      refreshExamResults(),
      refreshPaperMarks(),
      refreshSubjectPapers(),
      refreshSubjects(),
      refreshExamSessions(),
      refreshStudents(),
    ]);
  }, [refreshExamResults, refreshPaperMarks, refreshSubjectPapers, refreshSubjects, refreshExamSessions, refreshStudents]);

  return {
    data,
    loading:
      studentExamResultsCol.loading ||
      studentPaperMarksCol.loading ||
      subjectPapersCol.loading ||
      subjectsCol.loading ||
      examSessionsCol.loading ||
      studentsCol.loading,
    error:
      studentExamResultsCol.error ||
      studentPaperMarksCol.error ||
      subjectPapersCol.error ||
      subjectsCol.error ||
      examSessionsCol.error ||
      studentsCol.error,
    refresh,
  };
}

export default useExamResultsHorizontal;
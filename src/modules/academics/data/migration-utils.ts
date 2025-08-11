// ABOUTME: Migration utility class for transforming legacy database data to new SP3 schema
// ABOUTME: Implements transformation rules defined in Phase 4 data schema mapping

import { v5 as uuidv5 } from 'uuid';
import * as types from './types';

// Migration namespace for deterministic UUID generation
const MIGRATION_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Legacy database record interfaces
 */
interface LegacyExamination {
  id: number;
  Term: string;
  ExamName: string;
  TotalMarks: number;
  Year: string;
  last_date_of_entry: string;
}

interface LegacySubject {
  id: number;
  subject_name: string;
  subject_code: string;
  department: string;
}

interface LegacySplitSubject {
  id: number;
  subject: string;
  abbreviation: string;
  contribution: number;
  class: string;
}

interface LegacyExamResult {
  id: number;
  admno: number;
  Examination: string;
  Term: string;
  Year: string;
  Class: string;
  Stream: string;
  total: number;
  mean: number;
  mean_grade: string;
  points: number;
  stream_pos: number;
  overall_pos: number;
  // Dynamic subject columns (ENG, KIS, MAT, etc.)
  [subjectCode: string]: any;
}

interface LegacyGrading {
  id: number;
  Class: string;
  Term: string;
  Year: string;
  A: number;
  A_minus: number;
  B_plus: number;
  B: number;
  B_minus: number;
  C_plus: number;
  C: number;
  C_minus: number;
  D_plus: number;
  D: number;
  D_minus: number;
  E: number;
}

/**
 * Migration utility class
 */
export class AcademicsMigrationUtils {
  
  /**
   * Generate deterministic UUID for migration
   */
  static generateMigrationUUID(legacyTable: string, legacyId: string): string {
    return uuidv5(`${legacyTable}:${legacyId}`, MIGRATION_NAMESPACE);
  }

  /**
   * Transform legacy examination to new exam session
   * Rule TR-01: Term + Year → school_period_id
   */
  static transformExaminationToExamSession(
    legacyExam: LegacyExamination,
    schoolPeriodId: number
  ): types.AcademicsExamSessionType {
    return {
      id: this.generateMigrationUUID('examinations', legacyExam.id.toString()),
      name: legacyExam.ExamName,
      school_period_id: schoolPeriodId,
      status: types.ExamSessionStatus.COMPLETED, // Default status for legacy data
      result_publication_date: legacyExam.last_date_of_entry || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      school_period_name: null, // Will be populated via join
      paper_settings: [] // Will be populated separately
    };
  }

  /**
   * Transform legacy subject to new subject schema
   */
  static transformLegacySubject(
    legacySubject: LegacySubject,
    departmentId?: number
  ): types.AcademicsSubjectType {
    return {
      id: legacySubject.id,
      subject_code: legacySubject.subject_code,
      abbreviation: this.extractAbbreviation(legacySubject.subject_code),
      name: legacySubject.subject_name,
      department_id: departmentId || null,
      is_compulsory: this.determineIfCompulsory(legacySubject.subject_name),
      grouping: this.determineSubjectGrouping(legacySubject.subject_name),
      department_name: null, // Will be populated via join
      papers: [], // Will be populated from split_subjects
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Transform legacy split subject to subject paper
   */
  static transformSplitSubjectToSubjectPaper(
    splitSubject: LegacySplitSubject,
    subjectId: number
  ): types.AcademicsSubjectPaperType {
    return {
      id: splitSubject.id,
      subject_id: subjectId,
      name: splitSubject.abbreviation, // e.g., "P1", "P2"
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subject_name: null // Will be populated via join
    };
  }

  /**
   * Transform legacy exam result to student exam result
   */
  static transformExamResultToStudentExamResult(
    legacyResult: LegacyExamResult,
    studentId: string,
    examSessionId: string
  ): types.AcademicsStudentExamResultWithDetailsType {
    return {
      id: this.generateMigrationUUID('exam_results', legacyResult.id.toString()),
      student_id: studentId,
      exam_session_id: examSessionId,
      total_marks: legacyResult.total,
      mean_grade: legacyResult.mean_grade,
      class_rank: legacyResult.overall_pos,
      stream_rank: legacyResult.stream_pos,
      overall_comment: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      marks: [], // Will be populated from subject columns
      student_name: null, // Will be populated via join
      admission_no: legacyResult.admno.toString(),
      class_name: legacyResult.Class,
      stream_name: legacyResult.Stream,
      exam_session_name: null // Will be populated via join
    };
  }

  /**
   * Transform subject column marks to student paper marks
   * Rule TR-02: Split Subject Marks → StudentPaperMark Rows
   */
  static transformSubjectMarksToStudentPaperMarks(
    legacyResult: LegacyExamResult,
    studentExamResultId: string,
    subjectPapers: Array<{
      subject_code: string;
      paper_id: number;
      paper_name: string;
      paper_setting_id: string;
      marks_out_of: number;
    }>
  ): types.AcademicsStudentPaperMarkWithDetailsType[] {
    const paperMarks: types.AcademicsStudentPaperMarkWithDetailsType[] = [];

    // Known subject columns from legacy system
    const subjectColumns = ['ENG', 'KIS', 'MAT', 'BIO', 'CHEM', 'PHY', 'HIST', 'GEO', 'CRE', 'IRE', 'HRE'];

    for (const subjectCode of subjectColumns) {
      const subjectScore = legacyResult[subjectCode];
      if (subjectScore !== undefined && subjectScore !== null) {
        
        // Find papers for this subject
        const relatedPapers = subjectPapers.filter(sp => sp.subject_code === subjectCode);
        
        if (relatedPapers.length > 1) {
          // Split subject - need to get individual paper marks
          // This would require additional data from exam_split_subject_results table
          for (const paper of relatedPapers) {
            paperMarks.push({
              id: this.generateMigrationUUID('student_paper_marks', `${studentExamResultId}_${paper.paper_id}`),
              student_exam_result_id: studentExamResultId,
              paper_setting_id: paper.paper_setting_id,
              score: null, // Would need split marks data
              subject_paper_name: paper.paper_name,
              subject_name: subjectCode,
              marks_out_of: paper.marks_out_of
            });
          }
        } else if (relatedPapers.length === 1) {
          // Single paper subject
          const paper = relatedPapers[0];
          paperMarks.push({
            id: this.generateMigrationUUID('student_paper_marks', `${studentExamResultId}_${paper.paper_id}`),
            student_exam_result_id: studentExamResultId,
            paper_setting_id: paper.paper_setting_id,
            score: subjectScore,
            subject_paper_name: paper.paper_name,
            subject_name: subjectCode,
            marks_out_of: paper.marks_out_of
          });
        }
      }
    }

    return paperMarks;
  }

  /**
   * Transform legacy grading to new grading scheme
   */
  static transformLegacyGradingToGradingScheme(
    legacyGrading: LegacyGrading
  ): types.AcademicsGradingSchemeType {
    const gradeMapping = [
      { grade: 'A', min_score: legacyGrading.A, max_score: 100, points: 12 },
      { grade: 'A-', min_score: legacyGrading.A_minus, max_score: legacyGrading.A - 1, points: 11 },
      { grade: 'B+', min_score: legacyGrading.B_plus, max_score: legacyGrading.A_minus - 1, points: 10 },
      { grade: 'B', min_score: legacyGrading.B, max_score: legacyGrading.B_plus - 1, points: 9 },
      { grade: 'B-', min_score: legacyGrading.B_minus, max_score: legacyGrading.B - 1, points: 8 },
      { grade: 'C+', min_score: legacyGrading.C_plus, max_score: legacyGrading.B_minus - 1, points: 7 },
      { grade: 'C', min_score: legacyGrading.C, max_score: legacyGrading.C_plus - 1, points: 6 },
      { grade: 'C-', min_score: legacyGrading.C_minus, max_score: legacyGrading.C - 1, points: 5 },
      { grade: 'D+', min_score: legacyGrading.D_plus, max_score: legacyGrading.C_minus - 1, points: 4 },
      { grade: 'D', min_score: legacyGrading.D, max_score: legacyGrading.D_plus - 1, points: 3 },
      { grade: 'D-', min_score: legacyGrading.D_minus, max_score: legacyGrading.D - 1, points: 2 },
      { grade: 'E', min_score: 0, max_score: legacyGrading.D_minus - 1, points: 1 }
    ];

    const levels: types.AcademicsGradingSchemeLevelType[] = gradeMapping.map((grade, index) => ({
      id: index + 1,
      scheme_id: legacyGrading.id,
      grade: grade.grade,
      min_score: grade.min_score,
      max_score: grade.max_score,
      points: grade.points,
      comment: null
    }));

    return {
      id: legacyGrading.id,
      name: `${legacyGrading.Class} - ${legacyGrading.Term} ${legacyGrading.Year}`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      levels: levels
    };
  }

  /**
   * Helper methods
   */
  private static extractAbbreviation(subjectCode: string): string {
    // Extract abbreviation from subject code or generate one
    return subjectCode.length <= 10 ? subjectCode : subjectCode.substring(0, 10);
  }

  private static determineIfCompulsory(subjectName: string): boolean {
    const compulsorySubjects = ['English', 'Kiswahili', 'Mathematics'];
    return compulsorySubjects.some(subject => 
      subjectName.toLowerCase().includes(subject.toLowerCase())
    );
  }

  private static determineSubjectGrouping(subjectName: string): types.SubjectGrouping {
    const scienceSubjects = ['Biology', 'Chemistry', 'Physics', 'Mathematics'];
    const humanitiesSubjects = ['History', 'Geography', 'English', 'Kiswahili'];
    
    if (scienceSubjects.some(subject => subjectName.toLowerCase().includes(subject.toLowerCase()))) {
      return types.SubjectGrouping.SCIENCES;
    } else if (humanitiesSubjects.some(subject => subjectName.toLowerCase().includes(subject.toLowerCase()))) {
      return types.SubjectGrouping.HUMANITIES;
    } else {
      return types.SubjectGrouping.APPLIED;
    }
  }

  /**
   * Validation methods for data integrity
   */
  static validateTransformedData(
    originalCount: number,
    transformedCount: number,
    entityType: string
  ): boolean {
    if (originalCount !== transformedCount) {
      console.error(`Data integrity check failed for ${entityType}: Original: ${originalCount}, Transformed: ${transformedCount}`);
      return false;
    }
    return true;
  }

  /**
   * Create school period lookup from Term + Year combinations
   */
  static createSchoolPeriodLookup(examinations: LegacyExamination[]): Map<string, number> {
    const periodLookup = new Map<string, number>();
    let periodId = 1;

    examinations.forEach(exam => {
      const key = `${exam.Term}_${exam.Year}`;
      if (!periodLookup.has(key)) {
        periodLookup.set(key, periodId++);
      }
    });

    return periodLookup;
  }

  /**
   * Batch processing utility for large datasets
   */
  static async processBatch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Log progress
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
    }
    
    return results;
  }
}

// ABOUTME: Comprehensive academic data generator with exam workflows, grading, and rankings
// ABOUTME: Implements exam states (Planning, Open, Closed, Published), grading schemes, and student results

import type {
  Subject,
  SubjectPaper,
  ExamSession,
  ExamPaperSetting,
  GradingScheme,
  GradingLevel,
  StudentExamResult,
  StudentPaperMark,
  ClassSubjectAllocation,
  TeacherSubjectAssignment,
  StudentSubjectEnrollment
} from '@/core/types';
import { ExamSessionStatus } from '@/core/types';

import { getRandomItem, getRandomInt } from './dataUtils';

// 18 subjects as per Kenya education system
export const SUBJECT_DEFINITIONS = [
  { name: 'English', code: 'ENG', hasPapers: true, paperWeights: [0.5, 0.5], compulsory: true },
  { name: 'Kiswahili', code: 'KIS', hasPapers: true, paperWeights: [0.5, 0.5], compulsory: true },
  { name: 'Mathematics', code: 'MAT', hasPapers: true, paperWeights: [0.5, 0.5], compulsory: true },
  { name: 'Biology', code: 'BIO', hasPapers: true, paperWeights: [0.4, 0.6], compulsory: false },
  { name: 'Physics', code: 'PHY', hasPapers: true, paperWeights: [0.4, 0.6], compulsory: false },
  { name: 'Chemistry', code: 'CHE', hasPapers: true, paperWeights: [0.4, 0.6], compulsory: false },
  { name: 'History', code: 'HIS', hasPapers: false, compulsory: false },
  { name: 'Geography', code: 'GEO', hasPapers: false, compulsory: false },
  { name: 'Christian Religious Education', code: 'CRE', hasPapers: false, compulsory: false },
  { name: 'Islamic Religious Education', code: 'IRE', hasPapers: false, compulsory: false },
  { name: 'Business Studies', code: 'BST', hasPapers: false, compulsory: false },
  { name: 'Computer Studies', code: 'COM', hasPapers: false, compulsory: false },
  { name: 'Agriculture', code: 'AGR', hasPapers: false, compulsory: false },
  { name: 'Art & Design', code: 'ART', hasPapers: true, paperWeights: [0.5, 0.5], compulsory: false },
  { name: 'Music', code: 'MUS', hasPapers: true, paperWeights: [0.5, 0.5], compulsory: false },
  { name: 'Home Science', code: 'HSC', hasPapers: true, paperWeights: [0.5, 0.5], compulsory: false },
  { name: 'French', code: 'FRE', hasPapers: false, compulsory: false },
  { name: 'German', code: 'GER', hasPapers: false, compulsory: false }
];

// Grading schemes
export const GRADING_SCHEMES: GradingScheme[] = [
  {
    id: 1,
    name: 'A-E Grading (8-4-4)',
    description: 'Kenya 8-4-4 system A-E grades',
    is_active: true,
    levels: [
      { min_mark: 80, max_mark: 100, grade: 'A', points: 12, description: 'Excellent' },
      { min_mark: 75, max_mark: 79, grade: 'A-', points: 11, description: 'Very Good' },
      { min_mark: 70, max_mark: 74, grade: 'B+', points: 10, description: 'Good' },
      { min_mark: 65, max_mark: 69, grade: 'B', points: 9, description: 'Good' },
      { min_mark: 60, max_mark: 64, grade: 'B-', points: 8, description: 'Satisfactory' },
      { min_mark: 55, max_mark: 59, grade: 'C+', points: 7, description: 'Satisfactory' },
      { min_mark: 50, max_mark: 54, grade: 'C', points: 6, description: 'Pass' },
      { min_mark: 45, max_mark: 49, grade: 'C-', points: 5, description: 'Pass' },
      { min_mark: 40, max_mark: 44, grade: 'D+', points: 4, description: 'Weak Pass' },
      { min_mark: 35, max_mark: 39, grade: 'D', points: 3, description: 'Weak Pass' },
      { min_mark: 30, max_mark: 34, grade: 'D-', points: 2, description: 'Weak Pass' },
      { min_mark: 0, max_mark: 29, grade: 'E', points: 1, description: 'Fail' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'CBC Grading',
    description: 'Competency Based Curriculum grading',
    is_active: true,
    levels: [
      { min_mark: 80, max_mark: 100, grade: 'Exceeding Expectations', points: 4, description: 'Exceeds Expectations' },
      { min_mark: 70, max_mark: 79, grade: 'Meeting Expectations', points: 3, description: 'Meets Expectations' },
      { min_mark: 50, max_mark: 69, grade: 'Approaching Expectations', points: 2, description: 'Approaching' },
      { min_mark: 0, max_mark: 49, grade: 'Below Expectations', points: 1, description: 'Below' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export interface AcademicGenerationOptions {
  schoolPeriodId: number;
  classStreamIds: number[];
  studentIds: string[];
  staffIds: string[];
  gradingSchemeId: number;
}

export interface GeneratedAcademicData {
  subjects: Subject[];
  subjectPapers: SubjectPaper[];
  examSessions: ExamSession[];
  examPaperSettings: ExamPaperSetting[];
  gradingSchemes: GradingScheme[];
  classSubjectAllocations: ClassSubjectAllocation[];
  teacherSubjectAssignments: TeacherSubjectAssignment[];
  studentSubjectEnrollments: StudentSubjectEnrollment[];
  studentExamResults: StudentExamResult[];
  studentPaperMarks: StudentPaperMark[];
}

/**
 * Generates comprehensive academic data including subjects, exams, and results
 */
export function generateAcademicData(options: AcademicGenerationOptions): GeneratedAcademicData {
  const { schoolPeriodId, classStreamIds, studentIds, staffIds, gradingSchemeId } = options;

  // Generate subjects
  const subjects: Subject[] = SUBJECT_DEFINITIONS.map((def, idx) => ({
    id: idx + 1,
    name: def.name,
    code: def.code,
    description: `${def.name} subject`,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  // Generate subject papers for subjects with papers
  const subjectPapers: SubjectPaper[] = [];
  let paperId = 1;

  subjects.forEach(subject => {
    const def = SUBJECT_DEFINITIONS.find(d => d.name === subject.name);
    if (def?.hasPapers) {
      const numPapers = def.paperWeights?.length || 1;
      for (let i = 1; i <= numPapers; i++) {
        subjectPapers.push({
          id: paperId++,
          subject_id: subject.id,
          paper_number: i,
          paper_name: `Paper ${i}`,
          max_marks: 100,
          weight: def.paperWeights?.[i - 1] || 1 / numPapers,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  });

  // Generate exam sessions with various states
  const examSessions: ExamSession[] = [
    // Published exams (completed)
    {
      id: 1,
      name: 'Term 1 Opening Exam 2024',
      academic_year: 2024,
      school_period_id: schoolPeriodId,
      exam_type: 'Opening',
      start_date: new Date('2024-01-15').toISOString(),
      end_date: new Date('2024-01-26').toISOString(),
      status: ExamSessionStatus.PUBLISHED,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Term 1 CAT 1 2024',
      academic_year: 2024,
      school_period_id: schoolPeriodId,
      exam_type: 'CAT',
      start_date: new Date('2024-02-15').toISOString(),
      end_date: new Date('2024-02-23').toISOString(),
      status: ExamSessionStatus.PUBLISHED,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // In-progress (marks entry open)
    {
      id: 3,
      name: 'Term 1 Mid-Term Exam 2024',
      academic_year: 2024,
      school_period_id: schoolPeriodId,
      exam_type: 'Mid-Term',
      start_date: new Date('2024-03-04').toISOString(),
      end_date: new Date('2024-03-08').toISOString(),
      status: ExamSessionStatus.CLOSED, // Closed but not yet published
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // Planning
    {
      id: 4,
      name: 'Term 1 CAT 2 2024',
      academic_year: 2024,
      school_period_id: schoolPeriodId,
      exam_type: 'CAT',
      start_date: new Date('2024-04-08').toISOString(),
      end_date: new Date('2024-04-12').toISOString(),
      status: ExamSessionStatus.PLANNING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Generate exam paper settings
  const examPaperSettings: ExamPaperSetting[] = [];
  let settingId = 1;

  examSessions.forEach(session => {
    subjects.forEach(subject => {
      const def = SUBJECT_DEFINITIONS.find(d => d.name === subject.name);
      if (def?.hasPapers) {
        subjectPapers
          .filter(p => p.subject_id === subject.id)
          .forEach(paper => {
            examPaperSettings.push({
              id: settingId++,
              exam_session_id: session.id,
              subject_id: subject.id,
              paper_id: paper.id,
              max_marks: 100,
              weight: paper.weight,
              grading_scheme_id: gradingSchemeId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          });
      } else {
        // Subjects without papers
        examPaperSettings.push({
          id: settingId++,
          exam_session_id: session.id,
          subject_id: subject.id,
          paper_id: null,
          max_marks: 100,
          weight: 1,
          grading_scheme_id: gradingSchemeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });

  // Generate class-subject allocations
  const classSubjectAllocations: ClassSubjectAllocation[] = [];
  let allocationId = 1;

  classStreamIds.forEach(classStreamId => {
    // All streams get compulsory subjects + some electives (compulsory always included)
    subjects.forEach(subject => {
      const def = SUBJECT_DEFINITIONS.find(d => d.name === subject.name);
      const isCompulsory = def?.compulsory;
      const shouldInclude = isCompulsory ? true : Math.random() < 0.4;
      
      if (shouldInclude) {
        classSubjectAllocations.push({
          id: allocationId++,
          class_stream_id: classStreamId,
          school_period_id: schoolPeriodId,
          subject_id: subject.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });

  // Generate teacher subject assignments
  const teacherSubjectAssignments: TeacherSubjectAssignment[] = [];
  let assignmentId = 1;

  classSubjectAllocations.forEach(allocation => {
    const teacherId = getRandomItem(staffIds);
    teacherSubjectAssignments.push({
      id: assignmentId++,
      staff_id: teacherId,
      class_subject_allocation_id: allocation.id,
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  // Generate student subject enrollments
  const studentSubjectEnrollments: StudentSubjectEnrollment[] = [];
  let enrollmentId = 1;

  // Deterministic enrollment: same current_class_stream_id join - map student index to stream cyclically for reproducibility
  const studentStreamMap = new Map<string, number>();
  studentIds.forEach((studentId, idx) => {
    // deterministic hash: use idx modulo, but also stable for string ids via char code sum
    let hash = idx;
    if (typeof studentId === 'string') {
      for (let i = 0; i < studentId.length; i++) hash += studentId.charCodeAt(i);
    }
    const classStreamId = classStreamIds[hash % classStreamIds.length];
    studentStreamMap.set(studentId, classStreamId);
    const streamAllocations = classSubjectAllocations.filter(a => a.class_stream_id === classStreamId);

    streamAllocations.forEach(allocation => {
      studentSubjectEnrollments.push({
        id: enrollmentId++,
        student_id: studentId,
        class_subject_allocation_id: allocation.id,
        enrollment_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  // Generate exam results and marks (only for published/closed exams)
  const studentExamResults: StudentExamResult[] = [];
  const studentPaperMarks: StudentPaperMark[] = [];
  let resultId = 1;
  let markId = 1;

  const publishedExams = examSessions.filter(e => e.status === ExamSessionStatus.PUBLISHED);

  studentIds.forEach(studentId => {
    // reuse deterministic mapping from enrollment to keep same current_class_stream_id
    const classStreamId = studentStreamMap.get(studentId) ?? classStreamIds[0];
    const streamAllocations = classSubjectAllocations.filter(a => a.class_stream_id === classStreamId);

    publishedExams.forEach(exam => {
      let totalPoints = 0;
      let subjectCount = 0;

      streamAllocations.forEach(allocation => {
        const subjectId = allocation.subject_id;
        const def = SUBJECT_DEFINITIONS.find(d => d.id === subjectId);
        
        if (def?.hasPapers) {
          // Generate paper marks
          let totalWeightedMarks = 0;
          const papers = subjectPapers.filter(p => p.subject_id === subjectId);

          papers.forEach(paper => {
            const marks = getRandomInt(25, 98); // Realistic marks range
            studentPaperMarks.push({
              id: markId++,
              student_exam_result_id: resultId,
              paper_id: paper.id,
              marks_obtained: marks,
              max_marks: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            totalWeightedMarks += marks * paper.weight;
          });

          // Calculate grade based on weighted marks
          const gradeInfo = calculateGrade(totalWeightedMarks, gradingSchemeId);
          totalPoints += gradeInfo.points;
          subjectCount++;
        } else {
          // Subjects without papers - single mark
          const marks = getRandomInt(25, 98);
          const gradeInfo = calculateGrade(marks, gradingSchemeId);
          totalPoints += gradeInfo.points;
          subjectCount++;
        }
      });

      // Calculate mean grade
      const meanPoints = subjectCount > 0 ? totalPoints / subjectCount : 0;
      const meanGrade = calculateGradeFromPoints(meanPoints, gradingSchemeId);

      studentExamResults.push({
        id: resultId++,
        student_id: studentId,
        exam_session_id: exam.id,
        class_stream_id: classStreamId,
        total_marks: totalPoints,
        mean_marks: meanPoints,
        mean_grade: meanGrade.grade,
        total_points: totalPoints,
        ranking: 0, // Will be calculated later
        stream_ranking: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  // Calculate rankings
  publishedExams.forEach(exam => {
    const examResults = studentExamResults.filter(r => r.exam_session_id === exam.id);
    
    // Overall ranking
    const sortedByTotal = [...examResults].sort((a, b) => b.total_points - a.total_points);
    sortedByTotal.forEach((result, idx) => {
      const original = studentExamResults.find(r => r.id === result.id);
      if (original) original.ranking = idx + 1;
    });

    // Stream ranking
    const streams = [...new Set(examResults.map(r => r.class_stream_id))];
    streams.forEach(streamId => {
      const streamResults = examResults.filter(r => r.class_stream_id === streamId);
      const sortedStream = [...streamResults].sort((a, b) => b.total_points - a.total_points);
      sortedStream.forEach((result, idx) => {
        const original = studentExamResults.find(r => r.id === result.id);
        if (original) original.stream_ranking = idx + 1;
      });
    });
  });

  return {
    subjects,
    subjectPapers,
    examSessions,
    examPaperSettings,
    gradingSchemes: GRADING_SCHEMES,
    classSubjectAllocations,
    teacherSubjectAssignments,
    studentSubjectEnrollments,
    studentExamResults,
    studentPaperMarks
  };
}

function calculateGrade(marks: number, gradingSchemeId: number): { grade: string; points: number } {
  const scheme = GRADING_SCHEMES.find(s => s.id === gradingSchemeId);
  if (!scheme) return { grade: 'E', points: 1 };

  const level = scheme.levels.find(l => marks >= l.min_mark && marks <= l.max_mark);
  return level ? { grade: level.grade, points: level.points } : { grade: 'E', points: 1 };
}

function calculateGradeFromPoints(points: number, gradingSchemeId: number): { grade: string; points: number } {
  // For A-E grading, points are inverse of marks
  // 12 points = A, 1 point = E
  const scheme = GRADING_SCHEMES.find(s => s.id === gradingSchemeId);
  if (!scheme) return { grade: 'E', points: 1 };

  const roundedPoints = Math.round(points);
  const level = scheme.levels.find(l => l.points === roundedPoints) || scheme.levels[scheme.levels.length - 1];
  return { grade: level.grade, points: level.points };
}

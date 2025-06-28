// ABOUTME: Provides initial mock data for entities specific to the Academics module.
// ABOUTME: This data is used in "demo" mode and for seeding RxDB in "production" mode.

import * as types from './types'; // Academics specific types
import { SubjectGrouping } from './types'; // Re-exporting for clarity, or use from core if global

export const initialMockSubjects: types.AcademicsSubjectType[] = [
  { id: 1, subject_code: '101', abbreviation: 'ENG', name: 'English', department_id: 5, is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages', papers: [] },
  { id: 2, subject_code: '102', abbreviation: 'KIS', name: 'Kiswahili', department_id: 5, is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages', papers: [] },
  { id: 3, subject_code: '121', abbreviation: 'MAT', name: 'Mathematics', department_id: 1, is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Academics', papers: [] },
  { id: 4, subject_code: '231', abbreviation: 'BIO', name: 'Biology', department_id: 3, is_compulsory: false, grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
  { id: 5, subject_code: '232', abbreviation: 'PHY', name: 'Physics', department_id: 3, is_compulsory: false, grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
  { id: 6, subject_code: '233', abbreviation: 'CHEM', name: 'Chemistry', department_id: 3, is_compulsory: false, grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
];

export const initialMockSubjectPapers: types.AcademicsSubjectPaperType[] = [
  {id: 1, subject_id: 1, name: 'Paper 1 (Grammar & Comp.)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English'},
  {id: 2, subject_id: 1, name: 'Paper 2 (Literature)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English'},
  {id: 3, subject_id: 3, name: 'Mathematics Alt. A', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Mathematics'},
];
// Update subjects with their papers
initialMockSubjects[0].papers = initialMockSubjectPapers.filter(p => p.subject_id === 1);
initialMockSubjects[2].papers = initialMockSubjectPapers.filter(p => p.subject_id === 3);


export const initialMockExamSessions: types.AcademicsExamSessionType[] = [
    { id: 'EXSESS_MID_T1_2024', name: 'Mid Term 1 Exams 2024', school_period_id: 1, status: types.ExamSessionStatus.PLANNING, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 1 - AY 2023/2024', paper_settings: [] },
    { id: 'EXSESS_END_T1_2024', name: 'End Term 1 Exams 2024', school_period_id: 1, status: types.ExamSessionStatus.MARKS_ENTRY_OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 1 - AY 2023/2024', paper_settings: [] },
];

export const initialMockExamPaperSettings: types.AcademicsExamPaperSettingType[] = [
    {id: 'EPS001', exam_session_id: 'EXSESS_END_T1_2024', subject_paper_id: 1, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Paper 1 (Grammar & Comp.)', subject_name: 'English'},
    {id: 'EPS002', exam_session_id: 'EXSESS_END_T1_2024', subject_paper_id: 2, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Paper 2 (Literature)', subject_name: 'English'},
    {id: 'EPS003', exam_session_id: 'EXSESS_END_T1_2024', subject_paper_id: 3, marks_out_of: 100, weight_percentage: 100, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Mathematics Alt. A', subject_name: 'Mathematics'},
];
initialMockExamSessions[1].paper_settings = initialMockExamPaperSettings;


export const initialMockGradingSchemes: types.AcademicsGradingSchemeType[] = [
    {id: 1, name: 'Standard A-E Grading', is_default: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), levels: [
        {id: 1, scheme_id: 1, grade: 'A', min_score: 80, points: 12, comment: 'Excellent'},
        {id: 2, scheme_id: 1, grade: 'A-', min_score: 75, points: 11, comment: 'Excellent'},
        {id: 3, scheme_id: 1, grade: 'B+', min_score: 70, points: 10, comment: 'Very Good'},
        // ... more levels
    ]}
];

export const initialMockStudentExamResults: types.AcademicsStudentExamResultWithDetailsType[] = []; // Usually populated dynamically

export const initialMockClassSubjectAllocations: types.AcademicsClassSubjectAllocationType[] = [
    {id: 'CSA001', class_stream_id: 1, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA002', class_stream_id: 1, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
];

export const initialMockTeacherSubjectAssignments: types.AcademicsTeacherSubjectAssignmentType[] = [
    {id: 'TSA001', allocation_id: 'CSA001', teacher_id: 'STF002', class_stream_name: 'Form 1 A', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Dwight Schrute'},
];

export const initialMockStudentSubjectEnrollments: types.AcademicsStudentSubjectEnrollmentType[] = [
    {id: 'SSE001', student_id: 'S001', class_subject_allocation_id: 'CSA001', enrollment_date: '2023-09-05', status: types.StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
];

export const initialMockTimetablePeriodDefs: types.AcademicsTimetablePeriodDefType[] = [
    { id: 1, period_name: 'Lesson 1', start_time: '08:00', end_time: '09:00', is_teaching_period: true },
    { id: 2, period_name: 'Lesson 2', start_time: '09:00', end_time: '10:00', is_teaching_period: true },
    { id: 3, period_name: 'Break', start_time: '10:00', end_time: '10:30', is_teaching_period: false },
];

export const initialMockTimetableEntries: types.AcademicsTimetableEntryType[] = [
    {id: 'TTE001', class_stream_id: 1, day_of_week: types.DayOfWeek.MONDAY, period_id: 1, subject_id: 1, teacher_id: 'STF002', class_stream_name: 'Form 1 A', period_name: 'Lesson 1', subject_name: 'English', teacher_name: 'Dwight Schrute'},
];

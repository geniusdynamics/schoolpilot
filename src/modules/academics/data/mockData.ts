// src/modules/academics/data/mockData.ts
import {
  Subject, SubjectPaper, ExamSession, ExamPaperSetting, GradingScheme, GradingSchemeLevel,
  StudentExamResult, StudentPaperMark, ClassSubjectAllocation, TeacherSubjectAssignment,
  StudentSubjectEnrollment, TimetablePeriodDef, TimetableEntry, StudentExamResultWithDetails,
  SubjectGrouping, ExamSessionStatus, StudentEnrollmentStatus, DayOfWeek
} from '../../../core/types';

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const initialMockSubjects: Subject[] = [
    { id: 1, subject_code: '101', abbreviation: 'ENG', name: 'English', department_id: 'DEPT005', is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages & Literature', papers: [] },
    { id: 2, subject_code: '102', abbreviation: 'KIS', name: 'Kiswahili', department_id: 'DEPT005', is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages & Literature', papers: [] },
    { id: 3, subject_code: '121', abbreviation: 'MAT', name: 'Mathematics', department_id: 'DEPT001', is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Academics', papers: [] },
    { id: 4, subject_code: '231', abbreviation: 'BIO', name: 'Biology', department_id: 'DEPT003', grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
    { id: 5, subject_code: '232', abbreviation: 'PHY', name: 'Physics', department_id: 'DEPT003', grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
    { id: 6, subject_code: '233', abbreviation: 'CHEM', name: 'Chemistry', department_id: 'DEPT003', grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
];

export const initialMockSubjectPapers: SubjectPaper[] = [
    { id: 1, subject_id: 1, name: 'English Paper 1 (Grammar)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English' },
    { id: 2, subject_id: 1, name: 'English Paper 2 (Literature)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English' },
    { id: 3, subject_id: 3, name: 'Mathematics Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Mathematics' },
    { id: 4, subject_id: 4, name: 'Biology Paper 1 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Biology' },
    { id: 5, subject_id: 4, name: 'Biology Paper 2 (Practical)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Biology' },
];
initialMockSubjects.forEach(s => {s.papers = initialMockSubjectPapers.filter(sp => sp.subject_id === s.id)});

export const initialMockExamPaperSettings: ExamPaperSetting[] = [
    {id: 'EPS001', exam_session_id: 'ES001', subject_paper_id: 1, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'English Paper 1 (Grammar)', subject_name: 'English' },
    {id: 'EPS002', exam_session_id: 'ES001', subject_paper_id: 2, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'English Paper 2 (Literature)', subject_name: 'English' },
    {id: 'EPS003', exam_session_id: 'ES001', subject_paper_id: 3, marks_out_of: 100, weight_percentage: 100, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Mathematics Paper 1', subject_name: 'Mathematics' },
    {id: 'EPS004', exam_session_id: 'ES002', subject_paper_id: 4, marks_out_of: 70, weight_percentage: 70, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Biology Paper 1 (Theory)', subject_name: 'Biology' },
    {id: 'EPS005', exam_session_id: 'ES002', subject_paper_id: 5, marks_out_of: 30, weight_percentage: 30, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Biology Paper 2 (Practical)', subject_name: 'Biology' },
];

export const initialMockExamSessions: ExamSession[] = [
    { id: 'ES001', name: 'End of Term 3 Exams 2024', school_period_id: 3, status: ExamSessionStatus.MARKS_ENTRY_OPEN, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 3 - AY 2023/2024', paper_settings: initialMockExamPaperSettings.filter(eps => eps.exam_session_id === 'ES001') },
    { id: 'ES002', name: 'Mid Term 1 Exams 2025', school_period_id: 4, status: ExamSessionStatus.PLANNING, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), school_period_name: 'Term 1 - AY 2024/2025', paper_settings: initialMockExamPaperSettings.filter(eps => eps.exam_session_id === 'ES002') },
];

export const initialMockGradingSchemes: GradingScheme[] = [
    {id: 1, name: 'Standard A-E Grading', is_default: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), levels: [
        {id: 1, scheme_id: 1, grade: 'A', min_score: 80, points: 12, comment: 'Excellent'},
        {id: 2, scheme_id: 1, grade: 'A-', min_score: 75, points: 11, comment: 'Excellent'},
        {id: 3, scheme_id: 1, grade: 'B+', min_score: 70, points: 10, comment: 'Very Good'},
        {id: 4, scheme_id: 1, grade: 'B', min_score: 65, points: 9, comment: 'Good'},
        {id: 5, scheme_id: 1, grade: 'B-', min_score: 60, points: 8, comment: 'Good'},
        {id: 6, scheme_id: 1, grade: 'C+', min_score: 55, points: 7, comment: 'Average'},
        {id: 7, scheme_id: 1, grade: 'C', min_score: 50, points: 6, comment: 'Average'},
        {id: 8, scheme_id: 1, grade: 'C-', min_score: 45, points: 5, comment: 'Average'},
        {id: 9, scheme_id: 1, grade: 'D+', min_score: 40, points: 4, comment: 'Pass'},
        {id: 10, scheme_id: 1, grade: 'D', min_score: 35, points: 3, comment: 'Pass'},
        {id: 11, scheme_id: 1, grade: 'D-', min_score: 30, points: 2, comment: 'Pass'},
        {id: 12, scheme_id: 1, grade: 'E', min_score: 0, points: 1, comment: 'Fail'},
    ]}
];

export const initialMockStudentExamResults: StudentExamResultWithDetails[] = []; // Usually populated dynamically

export const initialMockClassSubjectAllocations: ClassSubjectAllocation[] = [
    {id: 'CSA001', class_stream_id: 1, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA002', class_stream_id: 1, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA003', class_stream_id: 2, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA004', class_stream_id: 3, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
];

export const initialMockTeacherSubjectAssignments: TeacherSubjectAssignment[] = [
    {id: 'TSA001', allocation_id: 'CSA001', teacher_id: 'STF002', class_stream_name: 'Form 1 A', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Dwight Schrute'},
];

export const initialMockStudentSubjectEnrollments: StudentSubjectEnrollment[] = [
    {id: 'SSE001', student_id: 'S001', class_subject_allocation_id: 'CSA001', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'English', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
];

export const initialMockTimetablePeriodDefs: TimetablePeriodDef[] = [
    { id: 1, period_name: 'Lesson 1', start_time: '08:00', end_time: '09:00' },
    { id: 2, period_name: 'Lesson 2', start_time: '09:00', end_time: '10:00' },
    { id: 3, period_name: 'Break', start_time: '10:00', end_time: '10:30' },
];

export const initialMockTimetableEntries: TimetableEntry[] = [
    {id: 'TTE001', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 1, subject_id: 1, teacher_id: 'STF002', class_stream_name: 'Form 1 A', period_name: 'Lesson 1', subject_name: 'English', teacher_name: 'Dwight Schrute'},
];

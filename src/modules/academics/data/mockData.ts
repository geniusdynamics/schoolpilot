// src/modules/academics/data/mockData.ts
import { Subject, SubjectPaper, ExamSession, ExamPaperSetting, GradingScheme, StudentExamResult, StudentPaperMark, ClassSubjectAllocation, TeacherSubjectAssignment, StudentSubjectEnrollment, TimetablePeriodDef, TimetableEntry, StudentExamResultWithDetails, DayOfWeek, ExamSchedule } from '@/core/types';
import {
  SubjectGrouping, ExamSessionStatus, StudentEnrollmentStatus, EducationSystemType, 
  GradingSystemType, AcademicPeriodType, AssessmentType, EducationSystemConfiguration,
  BoardExamResult, ResultDistribution, SchoolEvent, ExamGazette, ExamToken,
  MarksEntrySession, StructureValidationItem, CrossCheckRecord,
  SubjectPerformanceDataPoint, PerformanceOverTimeDataPoint, SubjectBreakdownDataPoint,
  ExamPerformanceOverTimeDataPoint, StreamPerformanceDataPoint,
  Assignment, AssignmentSubmission, AssignmentStatus, SubmissionStatus
} from './types';
import { WeeklyPlan, LessonPlan, LessonNote, PlanStatus } from './lessonplans/useLessonPlansData';


export const initialMockSubjects: Subject[] = [
    { id: 1, subject_code: '101', abbreviation: 'ENG', name: 'English', department_id: 'DEPT005', is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages & Literature', papers: [] },
    { id: 2, subject_code: '102', abbreviation: 'KIS', name: 'Kiswahili', department_id: 'DEPT005', is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Languages & Literature', papers: [] },
    { id: 3, subject_code: '121', abbreviation: 'MAT', name: 'Mathematics', department_id: 'DEPT001', is_compulsory: true, grouping: SubjectGrouping.GROUP_1_COMPULSORY, department_name: 'Mathematics', papers: [] },
    { id: 4, subject_code: '231', abbreviation: 'BIO', name: 'Biology', department_id: 'DEPT003', grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
    { id: 5, subject_code: '232', abbreviation: 'PHY', name: 'Physics', department_id: 'DEPT003', grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
    { id: 6, subject_code: '233', abbreviation: 'CHEM', name: 'Chemistry', department_id: 'DEPT003', grouping: SubjectGrouping.GROUP_2_SCIENCES, department_name: 'Sciences', papers: [] },
    { id: 7, subject_code: '311', abbreviation: 'HIS', name: 'History', department_id: 'DEPT004', grouping: SubjectGrouping.GROUP_3_HUMANITIES, department_name: 'Humanities', papers: [] },
    { id: 8, subject_code: '312', abbreviation: 'GEO', name: 'Geography', department_id: 'DEPT004', grouping: SubjectGrouping.GROUP_3_HUMANITIES, department_name: 'Humanities', papers: [] },
    { id: 9, subject_code: '313', abbreviation: 'CRE', name: 'Christian Religious Education', department_id: 'DEPT004', grouping: SubjectGrouping.GROUP_3_HUMANITIES, department_name: 'Humanities', papers: [] },
{ id: 10, subject_code: '411', abbreviation: 'BUS', name: 'Business Studies', department_id: 'DEPT006', grouping: SubjectGrouping.GROUP_4_TECHNICALS, department_name: 'Business Studies', papers: [] },
  { id: 11, subject_code: '412', abbreviation: 'COMP', name: 'Computer Studies', department_id: 'DEPT006', grouping: SubjectGrouping.GROUP_4_TECHNICALS, department_name: 'Technology', papers: [] },
  { id: 12, subject_code: '413', abbreviation: 'AGR', name: 'Agriculture', department_id: 'DEPT007', grouping: SubjectGrouping.GROUP_4_TECHNICALS, department_name: 'Agriculture', papers: [] },
  { id: 13, subject_code: '511', abbreviation: 'FRE', name: 'French', department_id: 'DEPT005', grouping: SubjectGrouping.GROUP_5_LANGUAGES, department_name: 'Languages & Literature', papers: [] },
  { id: 14, subject_code: '512', abbreviation: 'GER', name: 'German', department_id: 'DEPT005', grouping: SubjectGrouping.GROUP_5_LANGUAGES, department_name: 'Languages & Literature', papers: [] },
  { id: 15, subject_code: '611', abbreviation: 'ART', name: 'Art & Design', department_id: 'DEPT008', grouping: SubjectGrouping.OTHER, department_name: 'Creative Arts', papers: [] },
  { id: 16, subject_code: '612', abbreviation: 'MUS', name: 'Music', department_id: 'DEPT008', grouping: SubjectGrouping.OTHER, department_name: 'Creative Arts', papers: [] },
  { id: 17, subject_code: '613', abbreviation: 'HME', name: 'Home Science', department_id: 'DEPT009', grouping: SubjectGrouping.OTHER, department_name: 'Home Science', papers: [] },
  { id: 18, subject_code: '614', abbreviation: 'PE', name: 'Physical Education', department_id: 'DEPT010', grouping: SubjectGrouping.OTHER, department_name: 'Physical Education', papers: [] }
];

export const initialMockSubjectPapers: SubjectPaper[] = [
    // English Papers
    { id: 1, subject_id: 1, name: 'English Paper 1 (Grammar)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English' },
    { id: 2, subject_id: 1, name: 'English Paper 2 (Literature)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English' },
    { id: 3, subject_id: 1, name: 'English Paper 3 (Creative Writing)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'English' },
    // Kiswahili Papers
    { id: 4, subject_id: 2, name: 'Kiswahili Paper 1 (Grammar)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Kiswahili' },
    { id: 5, subject_id: 2, name: 'Kiswahili Paper 2 (Literature)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Kiswahili' },
    { id: 6, subject_id: 2, name: 'Kiswahili Paper 3 (Creative Writing)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Kiswahili' },
    // Mathematics Papers
    { id: 7, subject_id: 3, name: 'Mathematics Paper 1 (Pure)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Mathematics' },
    { id: 8, subject_id: 3, name: 'Mathematics Paper 2 (Applied)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Mathematics' },
    // Science Papers
    { id: 9, subject_id: 4, name: 'Biology Paper 1 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Biology' },
    { id: 10, subject_id: 4, name: 'Biology Paper 2 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Biology' },
    { id: 11, subject_id: 4, name: 'Biology Paper 3 (Practical)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Biology' },
    { id: 12, subject_id: 5, name: 'Physics Paper 1 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Physics' },
    { id: 13, subject_id: 5, name: 'Physics Paper 2 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Physics' },
    { id: 14, subject_id: 5, name: 'Physics Paper 3 (Practical)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Physics' },
    { id: 15, subject_id: 6, name: 'Chemistry Paper 1 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Chemistry' },
    { id: 16, subject_id: 6, name: 'Chemistry Paper 2 (Theory)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Chemistry' },
    { id: 17, subject_id: 6, name: 'Chemistry Paper 3 (Practical)', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Chemistry' },
    // Humanities Papers
    { id: 18, subject_id: 7, name: 'History Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'History' },
    { id: 19, subject_id: 7, name: 'History Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'History' },
    { id: 20, subject_id: 8, name: 'Geography Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Geography' },
    { id: 21, subject_id: 8, name: 'Geography Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Geography' },
    { id: 22, subject_id: 9, name: 'Christian Religious Education Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Christian Religious Education' },
    { id: 23, subject_id: 9, name: 'Christian Religious Education Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Christian Religious Education' },
    // Technical Papers
    { id: 24, subject_id: 10, name: 'Business Studies Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Business Studies' },
    { id: 25, subject_id: 10, name: 'Business Studies Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Business Studies' },
    { id: 26, subject_id: 11, name: 'Computer Studies Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Computer Studies' },
    { id: 27, subject_id: 11, name: 'Computer Studies Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Computer Studies' },
    { id: 28, subject_id: 12, name: 'Agriculture Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Agriculture' },
    { id: 29, subject_id: 12, name: 'Agriculture Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Agriculture' },
    // Languages Papers
    { id: 30, subject_id: 13, name: 'French Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'French' },
    { id: 31, subject_id: 13, name: 'French Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'French' },
    { id: 32, subject_id: 14, name: 'German Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'German' },
    { id: 33, subject_id: 14, name: 'German Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'German' },
    // Applied Papers
    { id: 34, subject_id: 15, name: 'Art & Design Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Art & Design' },
    { id: 35, subject_id: 15, name: 'Art & Design Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Art & Design' },
    { id: 36, subject_id: 16, name: 'Music Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Music' },
    { id: 37, subject_id: 16, name: 'Music Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Music' },
    { id: 38, subject_id: 17, name: 'Home Science Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Home Science' },
    { id: 39, subject_id: 17, name: 'Home Science Paper 2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Home Science' },
    { id: 40, subject_id: 18, name: 'Physical Education Paper 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_name: 'Physical Education' }
];
initialMockSubjects.forEach(s => {s.papers = initialMockSubjectPapers.filter(sp => sp.subject_id === s.id)});

export const initialMockExamPaperSettings: ExamPaperSetting[] = [
    // English Papers - End of Term 3 Exams 2024
    {id: 'EPS001', exam_session_id: 'ES001', subject_paper_id: 1, marks_out_of: 100, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'English Paper 1 (Grammar)', subject_name: 'English' },
    {id: 'EPS002', exam_session_id: 'ES001', subject_paper_id: 2, marks_out_of: 100, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'English Paper 2 (Literature)', subject_name: 'English' },
    {id: 'EPS003', exam_session_id: 'ES001', subject_paper_id: 3, marks_out_of: 100, weight_percentage: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'English Paper 3 (Creative Writing)', subject_name: 'English' },
    // Kiswahili Papers - End of Term 3 Exams 2024
    {id: 'EPS004', exam_session_id: 'ES001', subject_paper_id: 4, marks_out_of: 100, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Kiswahili Paper 1 (Grammar)', subject_name: 'Kiswahili' },
    {id: 'EPS005', exam_session_id: 'ES001', subject_paper_id: 5, marks_out_of: 100, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Kiswahili Paper 2 (Literature)', subject_name: 'Kiswahili' },
    {id: 'EPS006', exam_session_id: 'ES001', subject_paper_id: 6, marks_out_of: 100, weight_percentage: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Kiswahili Paper 3 (Creative Writing)', subject_name: 'Kiswahili' },
    // Mathematics Papers - End of Term 3 Exams 2024
    {id: 'EPS007', exam_session_id: 'ES001', subject_paper_id: 7, marks_out_of: 100, weight_percentage: 60, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Mathematics Paper 1 (Pure)', subject_name: 'Mathematics' },
    {id: 'EPS008', exam_session_id: 'ES001', subject_paper_id: 8, marks_out_of: 100, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Mathematics Paper 2 (Applied)', subject_name: 'Mathematics' },
    // Biology Papers - Mid Term 1 Exams 2025
    {id: 'EPS009', exam_session_id: 'ES002', subject_paper_id: 9, marks_out_of: 80, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Biology Paper 1 (Theory)', subject_name: 'Biology' },
    {id: 'EPS010', exam_session_id: 'ES002', subject_paper_id: 10, marks_out_of: 80, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Biology Paper 2 (Theory)', subject_name: 'Biology' },
    {id: 'EPS011', exam_session_id: 'ES002', subject_paper_id: 11, marks_out_of: 40, weight_percentage: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Biology Paper 3 (Practical)', subject_name: 'Biology' },
    // Physics Papers - Mid Term 1 Exams 2025
    {id: 'EPS012', exam_session_id: 'ES002', subject_paper_id: 12, marks_out_of: 80, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Physics Paper 1 (Theory)', subject_name: 'Physics' },
    {id: 'EPS013', exam_session_id: 'ES002', subject_paper_id: 13, marks_out_of: 80, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Physics Paper 2 (Theory)', subject_name: 'Physics' },
    {id: 'EPS014', exam_session_id: 'ES002', subject_paper_id: 14, marks_out_of: 40, weight_percentage: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Physics Paper 3 (Practical)', subject_name: 'Physics' },
    // Chemistry Papers - Mid Term 1 Exams 2025
    {id: 'EPS015', exam_session_id: 'ES002', subject_paper_id: 15, marks_out_of: 80, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Chemistry Paper 1 (Theory)', subject_name: 'Chemistry' },
    {id: 'EPS016', exam_session_id: 'ES002', subject_paper_id: 16, marks_out_of: 80, weight_percentage: 40, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Chemistry Paper 2 (Theory)', subject_name: 'Chemistry' },
    {id: 'EPS017', exam_session_id: 'ES002', subject_paper_id: 17, marks_out_of: 40, weight_percentage: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Chemistry Paper 3 (Practical)', subject_name: 'Chemistry' },
    // History Papers - End of Term 3 Exams 2024
    {id: 'EPS018', exam_session_id: 'ES001', subject_paper_id: 18, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'History Paper 1', subject_name: 'History' },
    {id: 'EPS019', exam_session_id: 'ES001', subject_paper_id: 19, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'History Paper 2', subject_name: 'History' },
    // Geography Papers - End of Term 3 Exams 2024
    {id: 'EPS020', exam_session_id: 'ES001', subject_paper_id: 20, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Geography Paper 1', subject_name: 'Geography' },
    {id: 'EPS021', exam_session_id: 'ES001', subject_paper_id: 21, marks_out_of: 100, weight_percentage: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), subject_paper_name: 'Geography Paper 2', subject_name: 'Geography' }
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

export const initialMockStudentPaperMarks: StudentPaperMark[] = []; // Usually populated dynamically when students take exams

export const initialMockClassSubjectAllocations: ClassSubjectAllocation[] = [
    // Form 1 A Allocations - Core Subjects (11 subjects)
    {id: 'CSA001', class_stream_id: 1, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA002', class_stream_id: 1, subject_id: 2, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA003', class_stream_id: 1, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA004', class_stream_id: 1, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA005', class_stream_id: 1, subject_id: 5, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Physics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA006', class_stream_id: 1, subject_id: 6, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA007', class_stream_id: 1, subject_id: 7, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'History', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA008', class_stream_id: 1, subject_id: 8, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Geography', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA009', class_stream_id: 1, subject_id: 9, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Christian Religious Education', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA010', class_stream_id: 1, subject_id: 15, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Art & Design', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA011', class_stream_id: 1, subject_id: 18, academic_year_id: 1, class_stream_name: 'Form 1 A', subject_name: 'Physical Education', academic_year_name: 'AY 2023/2024'},

    // Form 1 B Allocations - Core Subjects (11 subjects)
    {id: 'CSA012', class_stream_id: 2, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA013', class_stream_id: 2, subject_id: 2, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA014', class_stream_id: 2, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA015', class_stream_id: 2, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA016', class_stream_id: 2, subject_id: 5, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Physics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA017', class_stream_id: 2, subject_id: 6, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA018', class_stream_id: 2, subject_id: 7, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'History', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA019', class_stream_id: 2, subject_id: 8, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Geography', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA020', class_stream_id: 2, subject_id: 9, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Christian Religious Education', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA021', class_stream_id: 2, subject_id: 16, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Music', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA022', class_stream_id: 2, subject_id: 18, academic_year_id: 1, class_stream_name: 'Form 1 B', subject_name: 'Physical Education', academic_year_name: 'AY 2023/2024'},

    // Form 2 A Allocations - Compulsory + Technical/Applied Subjects (10 subjects)
    {id: 'CSA023', class_stream_id: 3, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA024', class_stream_id: 3, subject_id: 2, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA025', class_stream_id: 3, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA026', class_stream_id: 3, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA027', class_stream_id: 3, subject_id: 5, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Physics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA028', class_stream_id: 3, subject_id: 6, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA029', class_stream_id: 3, subject_id: 8, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Geography', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA030', class_stream_id: 3, subject_id: 10, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Business Studies', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA031', class_stream_id: 3, subject_id: 11, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Computer Studies', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA032', class_stream_id: 3, subject_id: 12, academic_year_id: 1, class_stream_name: 'Form 2 A', subject_name: 'Agriculture', academic_year_name: 'AY 2023/2024'},

    // Form 2 B Allocations - Core + Humanities Focus (10 subjects)
    {id: 'CSA033', class_stream_id: 4, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA034', class_stream_id: 4, subject_id: 2, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA035', class_stream_id: 4, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA036', class_stream_id: 4, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA037', class_stream_id: 4, subject_id: 5, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Physics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA038', class_stream_id: 4, subject_id: 6, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA039', class_stream_id: 4, subject_id: 7, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'History', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA040', class_stream_id: 4, subject_id: 8, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Geography', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA041', class_stream_id: 4, subject_id: 9, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'Christian Religious Education', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA042', class_stream_id: 4, subject_id: 13, academic_year_id: 1, class_stream_name: 'Form 2 B', subject_name: 'French', academic_year_name: 'AY 2023/2024'},

    // Form 3 North Allocations - Sciences Focus (8 subjects)
    {id: 'CSA043', class_stream_id: 5, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA044', class_stream_id: 5, subject_id: 2, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA045', class_stream_id: 5, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA046', class_stream_id: 5, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA047', class_stream_id: 5, subject_id: 5, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Physics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA048', class_stream_id: 5, subject_id: 6, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA049', class_stream_id: 5, subject_id: 8, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Geography', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA050', class_stream_id: 5, subject_id: 11, academic_year_id: 1, class_stream_name: 'Form 3 North', subject_name: 'Computer Studies', academic_year_name: 'AY 2023/2024'},

    // Form 4 East Allocations - KCSE Preparation Focus (8 subjects)
    {id: 'CSA051', class_stream_id: 6, subject_id: 1, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'English', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA052', class_stream_id: 6, subject_id: 2, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA053', class_stream_id: 6, subject_id: 3, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA054', class_stream_id: 6, subject_id: 4, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'Biology', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA055', class_stream_id: 6, subject_id: 5, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'Physics', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA056', class_stream_id: 6, subject_id: 6, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA057', class_stream_id: 6, subject_id: 7, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'History', academic_year_name: 'AY 2023/2024'},
    {id: 'CSA058', class_stream_id: 6, subject_id: 10, academic_year_id: 1, class_stream_name: 'Form 4 East', subject_name: 'Business Studies', academic_year_name: 'AY 2023/2024'}
];

export const initialMockTeacherSubjectAssignments: TeacherSubjectAssignment[] = [
    // Form 1 A Assignments (11 subjects)
    {id: 'TSA001', allocation_id: 'CSA001', teacher_id: 'STF001', class_stream_name: 'Form 1 A', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Michael Scott'},
    {id: 'TSA002', allocation_id: 'CSA002', teacher_id: 'STF014', class_stream_name: 'Form 1 A', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', teacher_name: 'Grace Mwangi'},
    {id: 'TSA003', allocation_id: 'CSA003', teacher_id: 'STF003', class_stream_name: 'Form 1 A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', teacher_name: 'John Kamau'},
    {id: 'TSA004', allocation_id: 'CSA004', teacher_id: 'STF004', class_stream_name: 'Form 1 A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', teacher_name: 'Mary Wanjiku'},
    {id: 'TSA005', allocation_id: 'CSA005', teacher_id: 'STF005', class_stream_name: 'Form 1 A', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', teacher_name: 'David Kiprotich'},
    {id: 'TSA006', allocation_id: 'CSA006', teacher_id: 'STF006', class_stream_name: 'Form 1 A', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', teacher_name: 'Sarah Njeri'},
    {id: 'TSA007', allocation_id: 'CSA007', teacher_id: 'STF007', class_stream_name: 'Form 1 A', subject_name: 'History', academic_year_name: 'AY 2023/2024', teacher_name: 'Peter Ochieng'},
    {id: 'TSA008', allocation_id: 'CSA008', teacher_id: 'STF008', class_stream_name: 'Form 1 A', subject_name: 'Geography', academic_year_name: 'AY 2023/2024', teacher_name: 'Jane Wambui'},
    {id: 'TSA009', allocation_id: 'CSA009', teacher_id: 'STF009', class_stream_name: 'Form 1 A', subject_name: 'Christian Religious Education', academic_year_name: 'AY 2023/2024', teacher_name: 'Samuel Gitonga'},
    {id: 'TSA010', allocation_id: 'CSA010', teacher_id: 'STF010', class_stream_name: 'Form 1 A', subject_name: 'Art & Design', academic_year_name: 'AY 2023/2024', teacher_name: 'Agnes Chepkoech'},
    {id: 'TSA011', allocation_id: 'CSA011', teacher_id: 'STF012', class_stream_name: 'Form 1 A', subject_name: 'Physical Education', academic_year_name: 'AY 2023/2024', teacher_name: 'Robert Mwangi'},

    // Form 1 B Assignments (11 subjects)
    {id: 'TSA012', allocation_id: 'CSA012', teacher_id: 'STF001', class_stream_name: 'Form 1 B', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Michael Scott'},
    {id: 'TSA013', allocation_id: 'CSA013', teacher_id: 'STF014', class_stream_name: 'Form 1 B', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', teacher_name: 'Grace Mwangi'},
    {id: 'TSA014', allocation_id: 'CSA014', teacher_id: 'STF021', class_stream_name: 'Form 1 B', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', teacher_name: 'Catherine Muthoni'},
    {id: 'TSA015', allocation_id: 'CSA015', teacher_id: 'STF004', class_stream_name: 'Form 1 B', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', teacher_name: 'Mary Wanjiku'},
    {id: 'TSA016', allocation_id: 'CSA016', teacher_id: 'STF005', class_stream_name: 'Form 1 B', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', teacher_name: 'David Kiprotich'},
    {id: 'TSA017', allocation_id: 'CSA017', teacher_id: 'STF006', class_stream_name: 'Form 1 B', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', teacher_name: 'Sarah Njeri'},
    {id: 'TSA018', allocation_id: 'CSA018', teacher_id: 'STF007', class_stream_name: 'Form 1 B', subject_name: 'History', academic_year_name: 'AY 2023/2024', teacher_name: 'Peter Ochieng'},
    {id: 'TSA019', allocation_id: 'CSA019', teacher_id: 'STF008', class_stream_name: 'Form 1 B', subject_name: 'Geography', academic_year_name: 'AY 2023/2024', teacher_name: 'Jane Wambui'},
    {id: 'TSA020', allocation_id: 'CSA020', teacher_id: 'STF009', class_stream_name: 'Form 1 B', subject_name: 'Christian Religious Education', academic_year_name: 'AY 2023/2024', teacher_name: 'Samuel Gitonga'},
    {id: 'TSA021', allocation_id: 'CSA021', teacher_id: 'STF019', class_stream_name: 'Form 1 B', subject_name: 'Music', academic_year_name: 'AY 2023/2024', teacher_name: 'Lucy Wambui'},
    {id: 'TSA022', allocation_id: 'CSA022', teacher_id: 'STF012', class_stream_name: 'Form 1 B', subject_name: 'Physical Education', academic_year_name: 'AY 2023/2024', teacher_name: 'Robert Mwangi'},

    // Form 2 A Assignments (10 subjects)
    {id: 'TSA023', allocation_id: 'CSA023', teacher_id: 'STF002', class_stream_name: 'Form 2 A', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Susan Akinyi'},
    {id: 'TSA024', allocation_id: 'CSA024', teacher_id: 'STF014', class_stream_name: 'Form 2 A', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', teacher_name: 'Grace Mwangi'},
    {id: 'TSA025', allocation_id: 'CSA025', teacher_id: 'STF003', class_stream_name: 'Form 2 A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', teacher_name: 'John Kamau'},
    {id: 'TSA026', allocation_id: 'CSA026', teacher_id: 'STF004', class_stream_name: 'Form 2 A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', teacher_name: 'Mary Wanjiku'},
    {id: 'TSA027', allocation_id: 'CSA027', teacher_id: 'STF005', class_stream_name: 'Form 2 A', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', teacher_name: 'David Kiprotich'},
    {id: 'TSA028', allocation_id: 'CSA028', teacher_id: 'STF006', class_stream_name: 'Form 2 A', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', teacher_name: 'Sarah Njeri'},
    {id: 'TSA029', allocation_id: 'CSA029', teacher_id: 'STF008', class_stream_name: 'Form 2 A', subject_name: 'Geography', academic_year_name: 'AY 2023/2024', teacher_name: 'Jane Wambui'},
    {id: 'TSA030', allocation_id: 'CSA030', teacher_id: 'STF023', class_stream_name: 'Form 2 A', subject_name: 'Business Studies', academic_year_name: 'AY 2023/2024', teacher_name: 'Daniel Muturi'},
    {id: 'TSA031', allocation_id: 'CSA031', teacher_id: 'STF024', class_stream_name: 'Form 2 A', subject_name: 'Computer Studies', academic_year_name: 'AY 2023/2024', teacher_name: 'Elizabeth Nyawira'},
    {id: 'TSA032', allocation_id: 'CSA032', teacher_id: 'STF018', class_stream_name: 'Form 2 A', subject_name: 'Agriculture', academic_year_name: 'AY 2023/2024', teacher_name: 'Patrick Kiptoo'},

    // Form 2 B Assignments (10 subjects)
    {id: 'TSA033', allocation_id: 'CSA033', teacher_id: 'STF002', class_stream_name: 'Form 2 B', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Susan Akinyi'},
    {id: 'TSA034', allocation_id: 'CSA034', teacher_id: 'STF014', class_stream_name: 'Form 2 B', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', teacher_name: 'Grace Mwangi'},
    {id: 'TSA035', allocation_id: 'CSA035', teacher_id: 'STF021', class_stream_name: 'Form 2 B', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', teacher_name: 'Catherine Muthoni'},
    {id: 'TSA036', allocation_id: 'CSA036', teacher_id: 'STF004', class_stream_name: 'Form 2 B', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', teacher_name: 'Mary Wanjiku'},
    {id: 'TSA037', allocation_id: 'CSA037', teacher_id: 'STF005', class_stream_name: 'Form 2 B', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', teacher_name: 'David Kiprotich'},
    {id: 'TSA038', allocation_id: 'CSA038', teacher_id: 'STF006', class_stream_name: 'Form 2 B', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', teacher_name: 'Sarah Njeri'},
    {id: 'TSA039', allocation_id: 'CSA039', teacher_id: 'STF007', class_stream_name: 'Form 2 B', subject_name: 'History', academic_year_name: 'AY 2023/2024', teacher_name: 'Peter Ochieng'},
    {id: 'TSA040', allocation_id: 'CSA040', teacher_id: 'STF008', class_stream_name: 'Form 2 B', subject_name: 'Geography', academic_year_name: 'AY 2023/2024', teacher_name: 'Jane Wambui'},
    {id: 'TSA041', allocation_id: 'CSA041', teacher_id: 'STF009', class_stream_name: 'Form 2 B', subject_name: 'Christian Religious Education', academic_year_name: 'AY 2023/2024', teacher_name: 'Samuel Gitonga'},
    {id: 'TSA042', allocation_id: 'CSA042', teacher_id: 'STF025', class_stream_name: 'Form 2 B', subject_name: 'French', academic_year_name: 'AY 2023/2024', teacher_name: 'Francis Kimani'},

    // Form 3 North Assignments (8 subjects)
    {id: 'TSA043', allocation_id: 'CSA043', teacher_id: 'STF001', class_stream_name: 'Form 3 North', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Michael Scott'},
    {id: 'TSA044', allocation_id: 'CSA044', teacher_id: 'STF014', class_stream_name: 'Form 3 North', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', teacher_name: 'Grace Mwangi'},
    {id: 'TSA045', allocation_id: 'CSA045', teacher_id: 'STF003', class_stream_name: 'Form 3 North', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', teacher_name: 'John Kamau'},
    {id: 'TSA046', allocation_id: 'CSA046', teacher_id: 'STF004', class_stream_name: 'Form 3 North', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', teacher_name: 'Mary Wanjiku'},
    {id: 'TSA047', allocation_id: 'CSA047', teacher_id: 'STF005', class_stream_name: 'Form 3 North', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', teacher_name: 'David Kiprotich'},
    {id: 'TSA048', allocation_id: 'CSA048', teacher_id: 'STF006', class_stream_name: 'Form 3 North', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', teacher_name: 'Sarah Njeri'},
    {id: 'TSA049', allocation_id: 'CSA049', teacher_id: 'STF008', class_stream_name: 'Form 3 North', subject_name: 'Geography', academic_year_name: 'AY 2023/2024', teacher_name: 'Jane Wambui'},
    {id: 'TSA050', allocation_id: 'CSA050', teacher_id: 'STF024', class_stream_name: 'Form 3 North', subject_name: 'Computer Studies', academic_year_name: 'AY 2023/2024', teacher_name: 'Elizabeth Nyawira'},

    // Form 4 East Assignments (8 subjects)
    {id: 'TSA051', allocation_id: 'CSA051', teacher_id: 'STF002', class_stream_name: 'Form 4 East', subject_name: 'English', academic_year_name: 'AY 2023/2024', teacher_name: 'Susan Akinyi'},
    {id: 'TSA052', allocation_id: 'CSA052', teacher_id: 'STF014', class_stream_name: 'Form 4 East', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', teacher_name: 'Grace Mwangi'},
    {id: 'TSA053', allocation_id: 'CSA053', teacher_id: 'STF021', class_stream_name: 'Form 4 East', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', teacher_name: 'Catherine Muthoni'},
    {id: 'TSA054', allocation_id: 'CSA054', teacher_id: 'STF004', class_stream_name: 'Form 4 East', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', teacher_name: 'Mary Wanjiku'},
    {id: 'TSA055', allocation_id: 'CSA055', teacher_id: 'STF005', class_stream_name: 'Form 4 East', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', teacher_name: 'David Kiprotich'},
    {id: 'TSA056', allocation_id: 'CSA056', teacher_id: 'STF006', class_stream_name: 'Form 4 East', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', teacher_name: 'Sarah Njeri'},
    {id: 'TSA057', allocation_id: 'CSA057', teacher_id: 'STF007', class_stream_name: 'Form 4 East', subject_name: 'History', academic_year_name: 'AY 2023/2024', teacher_name: 'Peter Ochieng'},
    {id: 'TSA058', allocation_id: 'CSA058', teacher_id: 'STF023', class_stream_name: 'Form 4 East', subject_name: 'Business Studies', academic_year_name: 'AY 2023/2024', teacher_name: 'Daniel Muturi'}
];

export const initialMockStudentSubjectEnrollments: StudentSubjectEnrollment[] = [
    // Student Jim Halpert (Form 1 A) Enrollments
    {id: 'SSE001', student_id: 'S001', class_subject_allocation_id: 'CSA001', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'English', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE002', student_id: 'S001', class_subject_allocation_id: 'CSA002', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE003', student_id: 'S001', class_subject_allocation_id: 'CSA003', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE004', student_id: 'S001', class_subject_allocation_id: 'CSA004', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE005', student_id: 'S001', class_subject_allocation_id: 'CSA005', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE006', student_id: 'S001', class_subject_allocation_id: 'CSA006', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE007', student_id: 'S001', class_subject_allocation_id: 'CSA007', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'History', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE008', student_id: 'S001', class_subject_allocation_id: 'CSA008', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Jim Halpert', class_name: 'Form 1', stream_name: 'A', subject_name: 'Geography', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    // Student Michael Scofield (Form 2 A) Enrollments
    {id: 'SSE009', student_id: 'S002', class_subject_allocation_id: 'CSA015', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'English', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE010', student_id: 'S002', class_subject_allocation_id: 'CSA016', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE011', student_id: 'S002', class_subject_allocation_id: 'CSA017', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE012', student_id: 'S002', class_subject_allocation_id: 'CSA018', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE013', student_id: 'S002', class_subject_allocation_id: 'CSA019', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE014', student_id: 'S002', class_subject_allocation_id: 'CSA020', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE015', student_id: 'S002', class_subject_allocation_id: 'CSA021', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Business Studies', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE016', student_id: 'S002', class_subject_allocation_id: 'CSA022', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Michael Scofield', class_name: 'Form 2', stream_name: 'A', subject_name: 'Computer Studies', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    // Student Pam Beesly (Form 1 B) Enrollments
    {id: 'SSE017', student_id: 'S003', class_subject_allocation_id: 'CSA009', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', class_name: 'Form 1', stream_name: 'B', subject_name: 'English', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE018', student_id: 'S003', class_subject_allocation_id: 'CSA010', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', class_name: 'Form 1', stream_name: 'B', subject_name: 'Kiswahili', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE019', student_id: 'S003', class_subject_allocation_id: 'CSA011', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', class_name: 'Form 1', stream_name: 'B', subject_name: 'Mathematics', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE020', student_id: 'S003', class_subject_allocation_id: 'CSA012', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', class_name: 'Form 1', stream_name: 'B', subject_name: 'Biology', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE021', student_id: 'S003', class_subject_allocation_id: 'CSA013', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', class_name: 'Form 1', stream_name: 'B', subject_name: 'Physics', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'},
    {id: 'SSE022', student_id: 'S003', class_subject_allocation_id: 'CSA014', enrollment_date: '2023-09-05', status: StudentEnrollmentStatus.ENROLLED, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), student_name: 'Pam Beesly', class_name: 'Form 1', stream_name: 'B', subject_name: 'Chemistry', academic_year_name: 'AY 2023/2024', enrollment_status_display: 'Enrolled'}
];

export const initialMockTimetablePeriodDefs: TimetablePeriodDef[] = [
    { id: 1, period_name: 'Lesson 1', start_time: '08:00', end_time: '08:40' },
    { id: 2, period_name: 'Lesson 2', start_time: '08:40', end_time: '09:20' },
    { id: 3, period_name: 'Lesson 3', start_time: '09:20', end_time: '10:00' },
    { id: 4, period_name: 'Break', start_time: '10:00', end_time: '10:20' },
    { id: 5, period_name: 'Lesson 4', start_time: '10:20', end_time: '11:00' },
    { id: 6, period_name: 'Lesson 5', start_time: '11:00', end_time: '11:40' },
    { id: 7, period_name: 'Lesson 6', start_time: '11:40', end_time: '12:20' },
    { id: 8, period_name: 'Lunch Break', start_time: '12:20', end_time: '13:20' },
    { id: 9, period_name: 'Lesson 7', start_time: '13:20', end_time: '14:00' },
    { id: 10, period_name: 'Lesson 8', start_time: '14:00', end_time: '14:40' },
    { id: 11, period_name: 'Games/Clubs', start_time: '14:40', end_time: '15:40' },
    { id: 12, period_name: 'Study Hall', start_time: '15:40', end_time: '16:20' }
];

export const initialMockTimetableEntries: TimetableEntry[] = [
    // Form 1 A Monday Timetable
    {id: 'TTE001', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 1, subject_id: 1, teacher_id: 'STF002', class_stream_name: 'Form 1 A', period_name: 'Lesson 1', subject_name: 'English', teacher_name: 'Dwight Schrute'},
    {id: 'TTE002', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 2, subject_id: 3, teacher_id: 'STF004', class_stream_name: 'Form 1 A', period_name: 'Lesson 2', subject_name: 'Mathematics', teacher_name: 'Pam Beesly'},
    {id: 'TTE003', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 3, subject_id: 2, teacher_id: 'STF003', class_stream_name: 'Form 1 A', period_name: 'Lesson 3', subject_name: 'Kiswahili', teacher_name: 'Jim Halpert'},
    {id: 'TTE004', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 5, subject_id: 4, teacher_id: 'STF005', class_stream_name: 'Form 1 A', period_name: 'Lesson 4', subject_name: 'Biology', teacher_name: 'Ryan Howard'},
    {id: 'TTE005', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 6, subject_id: 5, teacher_id: 'STF006', class_stream_name: 'Form 1 A', period_name: 'Lesson 5', subject_name: 'Physics', teacher_name: 'Kelly Kapoor'},
    {id: 'TTE006', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 7, subject_id: 6, teacher_id: 'STF007', class_stream_name: 'Form 1 A', period_name: 'Lesson 6', subject_name: 'Chemistry', teacher_name: 'Stanley Hudson'},
    {id: 'TTE007', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 9, subject_id: 7, teacher_id: 'STF008', class_stream_name: 'Form 1 A', period_name: 'Lesson 7', subject_name: 'History', teacher_name: 'Phyllis Vance'},
    {id: 'TTE008', class_stream_id: 1, day_of_week: DayOfWeek.MONDAY, period_id: 10, subject_id: 8, teacher_id: 'STF009', class_stream_name: 'Form 1 A', period_name: 'Lesson 8', subject_name: 'Geography', teacher_name: 'Oscar Martinez'},
    // Form 1 A Tuesday Timetable
    {id: 'TTE009', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 1, subject_id: 3, teacher_id: 'STF004', class_stream_name: 'Form 1 A', period_name: 'Lesson 1', subject_name: 'Mathematics', teacher_name: 'Pam Beesly'},
    {id: 'TTE010', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 2, subject_id: 1, teacher_id: 'STF002', class_stream_name: 'Form 1 A', period_name: 'Lesson 2', subject_name: 'English', teacher_name: 'Dwight Schrute'},
    {id: 'TTE011', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 3, subject_id: 5, teacher_id: 'STF006', class_stream_name: 'Form 1 A', period_name: 'Lesson 3', subject_name: 'Physics', teacher_name: 'Kelly Kapoor'},
    {id: 'TTE012', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 5, subject_id: 6, teacher_id: 'STF007', class_stream_name: 'Form 1 A', period_name: 'Lesson 4', subject_name: 'Chemistry', teacher_name: 'Stanley Hudson'},
    {id: 'TTE013', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 6, subject_id: 2, teacher_id: 'STF003', class_stream_name: 'Form 1 A', period_name: 'Lesson 5', subject_name: 'Kiswahili', teacher_name: 'Jim Halpert'},
    {id: 'TTE014', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 7, subject_id: 4, teacher_id: 'STF005', class_stream_name: 'Form 1 A', period_name: 'Lesson 6', subject_name: 'Biology', teacher_name: 'Ryan Howard'},
    {id: 'TTE015', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 9, subject_id: 8, teacher_id: 'STF009', class_stream_name: 'Form 1 A', period_name: 'Lesson 7', subject_name: 'Geography', teacher_name: 'Oscar Martinez'},
    {id: 'TTE016', class_stream_id: 1, day_of_week: DayOfWeek.TUESDAY, period_id: 10, subject_id: 7, teacher_id: 'STF008', class_stream_name: 'Form 1 A', period_name: 'Lesson 8', subject_name: 'History', teacher_name: 'Phyllis Vance'},
    // Form 2 A Monday Timetable
    {id: 'TTE017', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 1, subject_id: 1, teacher_id: 'STF009', class_stream_name: 'Form 2 A', period_name: 'Lesson 1', subject_name: 'English', teacher_name: 'Oscar Martinez'},
    {id: 'TTE018', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 2, subject_id: 3, teacher_id: 'STF010', class_stream_name: 'Form 2 A', period_name: 'Lesson 2', subject_name: 'Mathematics', teacher_name: 'Kevin Malone'},
    {id: 'TTE019', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 3, subject_id: 4, teacher_id: 'STF011', class_stream_name: 'Form 2 A', period_name: 'Lesson 3', subject_name: 'Biology', teacher_name: 'Angela Martin'},
    {id: 'TTE020', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 5, subject_id: 10, teacher_id: 'STF012', class_stream_name: 'Form 2 A', period_name: 'Lesson 4', subject_name: 'Business Studies', teacher_name: 'Toby Flenderson'},
    {id: 'TTE021', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 6, subject_id: 11, teacher_id: 'STF013', class_stream_name: 'Form 2 A', period_name: 'Lesson 5', subject_name: 'Computer Studies', teacher_name: 'Creed Bratton'},
    {id: 'TTE022', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 7, subject_id: 2, teacher_id: 'STF003', class_stream_name: 'Form 2 A', period_name: 'Lesson 6', subject_name: 'Kiswahili', teacher_name: 'Jim Halpert'},
    {id: 'TTE023', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 9, subject_id: 5, teacher_id: 'STF019', class_stream_name: 'Form 2 A', period_name: 'Lesson 7', subject_name: 'Physics', teacher_name: 'Todd Packer'},
    {id: 'TTE024', class_stream_id: 3, day_of_week: DayOfWeek.MONDAY, period_id: 10, subject_id: 6, teacher_id: 'STF007', class_stream_name: 'Form 2 A', period_name: 'Lesson 8', subject_name: 'Chemistry', teacher_name: 'Stanley Hudson'}
];

// Education System Configuration Mock Data
export const educationSystemConfigurations: EducationSystemConfiguration[] = [
  {
    id: 'ESC001',
    name: 'Kenya CBC Primary System',
    system_type: EducationSystemType.CBC,
    grading_system_type: GradingSystemType.PERCENTAGE,
    description: 'Kenya Competency Based Curriculum for primary education',
    country: 'Kenya',
    min_grade_level: 1,
    max_grade_level: 6,
    grading_system: {
      system_type: GradingSystemType.PERCENTAGE,
      passing_threshold: 40,
      grade_ranges: [
        { grade: 'A', min: 80, max: 100, description: 'Excellent' },
        { grade: 'B', min: 65, max: 79, description: 'Good' },
        { grade: 'C', min: 50, max: 64, description: 'Satisfactory' },
        { grade: 'D', min: 40, max: 49, description: 'Needs Improvement' },
        { grade: 'E', min: 0, max: 39, description: 'Below Expectation' }
      ]
    },
    assessment_rules: [
      {
        assessment_type: AssessmentType.CONTINUOUS_ASSESSMENT,
        weight: 60,
        min_assessments: 3,
        max_assessments: 5,
        description: 'Continuous Assessment Tests'
      },
      {
        assessment_type: AssessmentType.END_TERM_EXAM,
        weight: 40,
        min_assessments: 1,
        max_assessments: 1,
        description: 'End of Term Examination'
      }
    ],
    academic_periods: [
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 1',
        start_month: 1,
        end_month: 4,
        order: 1
      },
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 2',
        start_month: 5,
        end_month: 8,
        order: 2
      },
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 3',
        start_month: 9,
        end_month: 12,
        order: 3
      }
    ],
    subjects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ESC002',
    name: 'Kenya CBC Secondary System',
    system_type: EducationSystemType.CBC,
    grading_system_type: GradingSystemType.PERCENTAGE,
    description: 'Kenya Competency Based Curriculum for secondary education',
    country: 'Kenya',
    min_grade_level: 7,
    max_grade_level: 12,
    grading_system: {
      system_type: GradingSystemType.PERCENTAGE,
      passing_threshold: 50,
      grade_ranges: [
        { grade: 'A', min: 80, max: 100, description: 'Excellent' },
        { grade: 'A-', min: 75, max: 79, description: 'Very Good' },
        { grade: 'B+', min: 70, max: 74, description: 'Good Plus' },
        { grade: 'B', min: 65, max: 69, description: 'Good' },
        { grade: 'B-', min: 60, max: 64, description: 'Good Minus' },
        { grade: 'C+', min: 55, max: 59, description: 'Above Average' },
        { grade: 'C', min: 50, max: 54, description: 'Average' },
        { grade: 'C-', min: 45, max: 49, description: 'Below Average' },
        { grade: 'D+', min: 40, max: 44, description: 'Needs Improvement' },
        { grade: 'D', min: 35, max: 39, description: 'Poor' },
        { grade: 'E', min: 0, max: 34, description: 'Very Poor' }
      ]
    },
    assessment_rules: [
      {
        assessment_type: AssessmentType.CONTINUOUS_ASSESSMENT,
        weight: 30,
        min_assessments: 2,
        max_assessments: 4,
        description: 'Continuous Assessment Tests'
      },
      {
        assessment_type: AssessmentType.MID_TERM_EXAM,
        weight: 30,
        min_assessments: 1,
        max_assessments: 1,
        description: 'Mid Term Examination'
      },
      {
        assessment_type: AssessmentType.END_TERM_EXAM,
        weight: 40,
        min_assessments: 1,
        max_assessments: 1,
        description: 'End of Term Examination'
      }
    ],
    academic_periods: [
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 1',
        start_month: 1,
        end_month: 4,
        order: 1
      },
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 2',
        start_month: 5,
        end_month: 8,
        order: 2
      },
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 3',
        start_month: 9,
        end_month: 12,
        order: 3
      }
    ],
    subjects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ESC003',
    name: 'Kenya 8-4-4 System',
    system_type: EducationSystemType.TRADITIONAL,
    grading_system_type: GradingSystemType.PERCENTAGE,
    description: 'Traditional 8-4-4 education system',
    country: 'Kenya',
    min_grade_level: 1,
    max_grade_level: 12,
    grading_system: {
      system_type: GradingSystemType.PERCENTAGE,
      passing_threshold: 40,
      grade_ranges: [
        { grade: 'A', min: 80, max: 100, description: 'Excellent' },
        { grade: 'A-', min: 75, max: 79, description: 'Very Good' },
        { grade: 'B+', min: 70, max: 74, description: 'Good Plus' },
        { grade: 'B', min: 65, max: 69, description: 'Good' },
        { grade: 'B-', min: 60, max: 64, description: 'Good Minus' },
        { grade: 'C+', min: 55, max: 59, description: 'Above Average' },
        { grade: 'C', min: 50, max: 54, description: 'Average' },
        { grade: 'C-', min: 45, max: 49, description: 'Below Average' },
        { grade: 'D+', min: 40, max: 44, description: 'Needs Improvement' },
        { grade: 'D', min: 35, max: 39, description: 'Poor' },
        { grade: 'E', min: 0, max: 34, description: 'Very Poor' }
      ]
    },
    assessment_rules: [
      {
        assessment_type: AssessmentType.CONTINUOUS_ASSESSMENT,
        weight: 30,
        min_assessments: 2,
        max_assessments: 4,
        description: 'Continuous Assessment Tests'
      },
      {
        assessment_type: AssessmentType.END_TERM_EXAM,
        weight: 70,
        min_assessments: 1,
        max_assessments: 1,
        description: 'End of Term Examination'
      }
    ],
    academic_periods: [
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 1',
        start_month: 1,
        end_month: 4,
        order: 1
      },
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 2',
        start_month: 5,
        end_month: 8,
        order: 2
      },
      {
        period_type: AcademicPeriodType.TERM,
        name: 'Term 3',
        start_month: 9,
        end_month: 12,
        order: 3
      }
    ],
    subjects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Ensure all AppDataType keys for academics are exported
export const subjects = initialMockSubjects;
export const subjectPapers = initialMockSubjectPapers;
export const examSessions = initialMockExamSessions;
export const examPaperSettings = initialMockExamPaperSettings;
export const gradingSchemes = initialMockGradingSchemes;
export const classSubjectAllocations = initialMockClassSubjectAllocations;
export const teacherSubjectAssignments = initialMockTeacherSubjectAssignments;
export const studentExamResults = initialMockStudentExamResults;

// Exam Schedules
export const initialMockExamSchedules: ExamSchedule[] = [
  {
    id: '1',
    exam_session_id: '1',
    class_stream_id: 1,
    period_id: 1,
    room: 'Room 101',
    invigilator: 'Mr. Smith',
    date: '2024-01-15',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    exam_session_id: '1',
    class_stream_id: 2,
    period_id: 2,
    room: 'Room 102',
    invigilator: 'Ms. Johnson',
    date: '2024-01-15',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    exam_session_id: '2',
    class_stream_id: 1,
    period_id: 1,
    room: 'Room 201',
    invigilator: 'Mr. Williams',
    date: '2024-01-16',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const examSchedules = initialMockExamSchedules;

// Comprehensive Academic Data Generation
// Import generators for creating additional realistic academic data
import { generateAcademicData, GRADING_SCHEMES, SUBJECT_DEFINITIONS } from '@/services/dataGeneration/generators/academicGenerator';

/**
 * Generates comprehensive academic data with exam workflows and results
 * Use this function to generate additional exam data with results
 * 
 * @param schoolPeriodId School period for exams
 * @param classStreamIds Class stream IDs
 * @param studentIds Student IDs to generate results for
 * @param staffIds Staff IDs for teacher assignments
 * @returns Generated academic data including exams, results, and rankings
 */
export function generateComprehensiveAcademicData(
  schoolPeriodId: number,
  classStreamIds: number[],
  studentIds: string[],
  staffIds: string[]
): {
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
} {
  return generateAcademicData({
    schoolPeriodId,
    classStreamIds,
    studentIds,
    staffIds,
    gradingSchemeId: 1 // A-E Grading (8-4-4)
  });
}

// Export comprehensive grading schemes for reference
export const comprehensiveGradingSchemes = GRADING_SCHEMES;
export const comprehensiveSubjectDefinitions = SUBJECT_DEFINITIONS;

// Pre-generated comprehensive academic data (lazily evaluated)
// Note: These use placeholder IDs - replace with actual IDs when using
export const comprehensiveAcademicData = generateComprehensiveAcademicData(
  7, // Term 1 - AY 2024/2025
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Class stream IDs
  Array.from({ length: 100 }, (_, i) => `STU${String(i + 1).padStart(3, '0')}`), // 100 students
  Array.from({ length: 25 }, (_, i) => `STF${String(i + 1).padStart(3, '0')}`) // 25 staff
);

// Combined exports for seeding
export const allSubjects = comprehensiveAcademicData.subjects;
export const allSubjectPapers = comprehensiveAcademicData.subjectPapers;
export const allExamSessions = comprehensiveAcademicData.examSessions;
export const allExamPaperSettings = comprehensiveAcademicData.examPaperSettings;
export const allGradingSchemes = comprehensiveAcademicData.gradingSchemes;
export const allClassSubjectAllocations = comprehensiveAcademicData.classSubjectAllocations;
export const allTeacherSubjectAssignments = comprehensiveAcademicData.teacherSubjectAssignments;
export const allStudentSubjectEnrollments = comprehensiveAcademicData.studentSubjectEnrollments;
export const allStudentExamResults = comprehensiveAcademicData.studentExamResults;
export const allStudentPaperMarks = comprehensiveAcademicData.studentPaperMarks;

// === NEW MOCK DATA EXPORTS FOR ACADEMICS PAGES ===
// Source: BoardExamResultsPage.tsx
export const initialMockBoardExamResults: BoardExamResult[] = [
  {
    id: 'ber-1',
    student_id: '1',
    student_name: 'John Doe',
    admission_no: 'ADM-001',
    board_exam_type: 'IGCSE',
    subject_name: 'Mathematics',
    paper_code: '0580/42',
    grade: 'A*',
    marks_obtained: 95,
    max_marks: 100,
    percentage: 95,
    exam_date: '2024-06-15',
    center_number: 'KE001',
    candidate_number: '12345',
    entered_at: new Date().toISOString()
  },
  {
    id: 'ber-2',
    student_id: '1',
    student_name: 'John Doe',
    admission_no: 'ADM-001',
    board_exam_type: 'IGCSE',
    subject_name: 'Physics',
    paper_code: '0625/42',
    grade: 'A',
    marks_obtained: 88,
    max_marks: 100,
    percentage: 88,
    exam_date: '2024-06-20',
    center_number: 'KE001',
    candidate_number: '12345',
    entered_at: new Date().toISOString()
  },
  {
    id: 'ber-3',
    student_id: '2',
    student_name: 'Jane Smith',
    admission_no: 'ADM-002',
    board_exam_type: 'A-Level',
    subject_name: 'Mathematics',
    paper_code: '9709/33',
    grade: 'A',
    marks_obtained: 92,
    max_marks: 100,
    percentage: 92,
    exam_date: '2024-06-18',
    center_number: 'KE002',
    candidate_number: '12346',
    entered_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'ber-4',
    student_id: '3',
    student_name: 'Michael Johnson',
    admission_no: 'ADM-003',
    board_exam_type: 'IB',
    subject_name: 'Mathematics HL',
    paper_code: 'MATHHL',
    grade: '6',
    marks_obtained: 85,
    max_marks: 100,
    percentage: 85,
    exam_date: '2024-05-10',
    center_number: 'KE003',
    candidate_number: '12347',
    entered_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'ber-5',
    student_id: '4',
    student_name: 'Emily Davis',
    admission_no: 'ADM-004',
    board_exam_type: 'SAT',
    subject_name: 'Math',
    paper_code: 'SAT-MATH',
    grade: '750',
    marks_obtained: 750,
    max_marks: 800,
    percentage: 93.75,
    exam_date: '2024-03-15',
    center_number: 'KE004',
    candidate_number: '12348',
    entered_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

// Source: DistributeResultsPage.tsx
export const initialMockResultDistributions: ResultDistribution[] = [
  {
    id: 'dist-1',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    class_id: '1',
    class_name: 'Grade 10 - A',
    distribution_method: 'Portal',
    status: 'Distributed',
    scheduled_date: new Date().toISOString(),
    distributed_at: new Date().toISOString(),
    recipients_count: 5,
    success_count: 5,
    failure_count: 0,
    notes: 'Results published to student portal'
  },
  {
    id: 'dist-2',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    class_id: '2',
    class_name: 'Grade 10 - B',
    distribution_method: 'SMS',
    status: 'Distributed',
    scheduled_date: new Date(Date.now() - 86400000).toISOString(),
    distributed_at: new Date(Date.now() - 86400000).toISOString(),
    recipients_count: 4,
    success_count: 3,
    failure_count: 1,
    notes: 'SMS sent to 3 students, 1 failed'
  },
  {
    id: 'dist-3',
    exam_session_id: '2',
    exam_session_name: 'Mid-Term Exams',
    class_id: '3',
    class_name: 'Grade 11 - A',
    distribution_method: 'Email',
    status: 'Pending',
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    recipients_count: 6,
    success_count: 0,
    failure_count: 0,
    notes: 'Scheduled for tomorrow'
  },
  {
    id: 'dist-4',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    class_id: '4',
    class_name: 'Grade 9 - A',
    distribution_method: 'Print',
    status: 'Distributed',
    scheduled_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    distributed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    recipients_count: 7,
    success_count: 7,
    failure_count: 0,
    notes: 'Printed copies distributed'
  }
];

// Source: EventsManagerPage.tsx
export const initialMockSchoolEvents: SchoolEvent[] = [
  {
    id: 'evt-1',
    title: 'Mid-Term Examinations',
    description: 'Mid-term examinations for all classes from Grade 1 to Grade 12',
    event_type: 'Exam',
    start_date: '2024-02-15',
    end_date: '2024-02-28',
    location: 'School Campus',
    status: 'Upcoming',
    organizer: 'Academic Department',
    participants: 'All Students',
    created_at: '2024-01-10'
  },
  {
    id: 'evt-2',
    title: 'Annual Sports Day',
    description: 'Annual sports competition and prize distribution ceremony',
    event_type: 'Sports',
    start_date: '2024-03-10',
    end_date: '2024-03-10',
    location: 'School Ground',
    status: 'Upcoming',
    organizer: 'Sports Department',
    participants: 'All Students and Staff',
    created_at: '2024-01-05'
  },
  {
    id: 'evt-3',
    title: 'Spring Break',
    description: 'Spring vacation for students and staff',
    event_type: 'Holiday',
    start_date: '2024-04-01',
    end_date: '2024-04-15',
    location: 'School Closed',
    status: 'Upcoming',
    organizer: 'Administration',
    participants: 'All',
    created_at: '2024-01-01'
  },
  {
    id: 'evt-4',
    title: 'Parent-Teacher Meeting',
    description: 'Quarterly parent-teacher meeting to discuss student progress',
    event_type: 'Meeting',
    start_date: '2024-01-25',
    end_date: '2024-01-25',
    location: 'School Hall',
    status: 'Upcoming',
    organizer: 'Administration',
    participants: 'Parents and Teachers',
    created_at: '2024-01-08'
  },
  {
    id: 'evt-5',
    title: 'Science Fair',
    description: 'Annual science exhibition showcasing student projects',
    event_type: 'Function',
    start_date: '2024-02-05',
    end_date: '2024-02-05',
    location: 'School Auditorium',
    status: 'Upcoming',
    organizer: 'Science Department',
    participants: 'Grades 6-12',
    created_at: '2024-01-03'
  }
];

// Source: ExamGazettePage.tsx
export const initialMockExamGazettes: ExamGazette[] = [
  {
    id: 'gaz-1',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    class_id: '1',
    class_name: 'Grade 10 - A',
    generated_at: new Date().toISOString(),
    total_students: 5,
    students: [
      { id: 'gs-1', student_id: '1', student_name: 'Jane Smith', admission_no: 'ADM-002', rank: 1, total_marks: 465, average: 93, grade: 'A', position: '1st', marks: { '1': 92, '2': 95, '3': 88, '4': 96, '5': 94 } },
      { id: 'gs-2', student_id: '2', student_name: 'John Doe', admission_no: 'ADM-001', rank: 2, total_marks: 445, average: 89, grade: 'A', position: '2nd', marks: { '1': 95, '2': 90, '3': 85, '4': 88, '5': 87 } },
      { id: 'gs-3', student_id: '3', student_name: 'Emily Davis', admission_no: 'ADM-004', rank: 3, total_marks: 420, average: 84, grade: 'A', position: '3rd', marks: { '1': 80, '2': 88, '3': 82, '4': 86, '5': 84 } },
      { id: 'gs-4', student_id: '4', student_name: 'Michael Johnson', admission_no: 'ADM-003', rank: 4, total_marks: 390, average: 78, grade: 'B', position: '4th', marks: { '1': 75, '2': 82, '3': 76, '4': 80, '5': 77 } },
      { id: 'gs-5', student_id: '5', student_name: 'Robert Wilson', admission_no: 'ADM-005', rank: 5, total_marks: 375, average: 75, grade: 'B', position: '5th', marks: { '1': 72, '2': 79, '3': 73, '4': 78, '5': 73 } }
    ],
    subjects: [
      { id: 'gsj-1', subject_id: '1', subject_name: 'Mathematics', marks_obtained: 85, max_marks: 100, grade: 'A' },
      { id: 'gsj-2', subject_id: '2', subject_name: 'English', marks_obtained: 92, max_marks: 100, grade: 'A' },
      { id: 'gsj-3', subject_id: '3', subject_name: 'Science', marks_obtained: 78, max_marks: 100, grade: 'B' },
      { id: 'gsj-4', subject_id: '4', subject_name: 'History', marks_obtained: 88, max_marks: 100, grade: 'A' },
      { id: 'gsj-5', subject_id: '5', subject_name: 'Geography', marks_obtained: 82, max_marks: 100, grade: 'A' }
    ]
  },
  {
    id: 'gaz-2',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    class_id: '2',
    class_name: 'Grade 10 - B',
    generated_at: new Date(Date.now() - 86400000).toISOString(),
    total_students: 4,
    students: [
      { id: 'gs-6', student_id: '6', student_name: 'Sarah Brown', admission_no: 'ADM-006', rank: 1, total_marks: 450, average: 90, grade: 'A', position: '1st', marks: { '1': 92, '2': 90, '3': 89, '4': 91, '5': 88 } },
      { id: 'gs-7', student_id: '7', student_name: 'David Lee', admission_no: 'ADM-007', rank: 2, total_marks: 425, average: 85, grade: 'A', position: '2nd', marks: { '1': 87, '2': 86, '3': 84, '4': 85, '5': 83 } },
      { id: 'gs-8', student_id: '8', student_name: 'Lisa Chen', admission_no: 'ADM-008', rank: 3, total_marks: 400, average: 80, grade: 'A', position: '3rd', marks: { '1': 82, '2': 81, '3': 80, '4': 79, '5': 78 } },
      { id: 'gs-9', student_id: '9', student_name: 'James Miller', admission_no: 'ADM-009', rank: 4, total_marks: 380, average: 76, grade: 'B', position: '4th', marks: { '1': 78, '2': 77, '3': 76, '4': 75, '5': 74 } }
    ],
    subjects: [
      { id: 'gsj-6', subject_id: '1', subject_name: 'Mathematics', marks_obtained: 90, max_marks: 100, grade: 'A' },
      { id: 'gsj-7', subject_id: '2', subject_name: 'English', marks_obtained: 85, max_marks: 100, grade: 'A' },
      { id: 'gsj-8', subject_id: '3', subject_name: 'Science', marks_obtained: 82, max_marks: 100, grade: 'A' },
      { id: 'gsj-9', subject_id: '4', subject_name: 'History', marks_obtained: 88, max_marks: 100, grade: 'A' },
      { id: 'gsj-10', subject_id: '5', subject_name: 'Geography', marks_obtained: 80, max_marks: 100, grade: 'A' }
    ]
  }
];

// Source: ExamTokensPage.tsx
export const initialMockExamTokens: ExamToken[] = [
  {
    id: 'token-1',
    token_code: 'TKN-2024-ABCD1234',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    teacher_id: '1',
    teacher_name: 'John Smith',
    subject_id: '1',
    subject_name: 'Mathematics',
    class_id: '1',
    class_name: 'Grade 10 - A',
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'Active'
  },
  {
    id: 'token-2',
    token_code: 'TKN-2024-EFGH5678',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    teacher_id: '2',
    teacher_name: 'Jane Doe',
    subject_id: '2',
    subject_name: 'English',
    class_id: '2',
    class_name: 'Grade 10 - B',
    generated_at: new Date(Date.now() - 86400000).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 6).toISOString(),
    status: 'Used',
    used_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'token-3',
    token_code: 'TKN-2024-IJKL9012',
    exam_session_id: '2',
    exam_session_name: 'Mid-Term Exams',
    teacher_id: '3',
    teacher_name: 'Michael Johnson',
    subject_id: '3',
    subject_name: 'Science',
    class_id: '3',
    class_name: 'Grade 11 - A',
    generated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    expires_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'Expired'
  }
];

// Source: MarksEntryByTokenPage.tsx
export const initialMockMarksEntrySessions: MarksEntrySession[] = [
  {
    id: 'session-1',
    token_code: 'TKN-2024-ABCD1234',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '1',
    subject_name: 'Mathematics',
    class_id: '1',
    class_name: 'Grade 10 - A',
    teacher_id: '1',
    teacher_name: 'John Smith',
    status: 'In Progress',
    marks: [
      { id: 'mark-1', student_id: '1', student_name: 'John Doe', admission_no: 'ADM-001', marks_obtained: 85, marks_total: 100, grade: 'A', remarks: 'Excellent' },
      { id: 'mark-2', student_id: '2', student_name: 'Jane Smith', admission_no: 'ADM-002', marks_obtained: 92, marks_total: 100, grade: 'A', remarks: 'Outstanding' },
      { id: 'mark-3', student_id: '3', student_name: 'Michael Johnson', admission_no: 'ADM-003', marks_obtained: 78, marks_total: 100, grade: 'B', remarks: 'Good' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'session-2',
    token_code: 'TKN-2024-EFGH5678',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '2',
    subject_name: 'English',
    class_id: '2',
    class_name: 'Grade 10 - B',
    teacher_id: '2',
    teacher_name: 'Jane Doe',
    status: 'Completed',
    marks: [
      { id: 'mark-4', student_id: '4', student_name: 'Emily Davis', admission_no: 'ADM-004', marks_obtained: 88, marks_total: 100, grade: 'A', remarks: 'Very Good' },
      { id: 'mark-5', student_id: '5', student_name: 'Robert Wilson', admission_no: 'ADM-005', marks_obtained: 75, marks_total: 100, grade: 'B', remarks: 'Good' }
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

// Source: VerifyMarksByStructurePage.tsx
export const initialMockStructureValidationItems: StructureValidationItem[] = [
  {
    id: 'sv-1',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '1',
    subject_name: 'Mathematics',
    class_id: '1',
    class_name: 'Grade 10 - A',
    structure_component: 'Paper 1 - Theory',
    expected_max_marks: 80,
    actual_max_marks: 80,
    marks_difference: 0,
    status: 'Valid',
    notes: 'Matches exam structure'
  },
  {
    id: 'sv-2',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '1',
    subject_name: 'Mathematics',
    class_id: '1',
    class_name: 'Grade 10 - A',
    structure_component: 'Paper 2 - Practical',
    expected_max_marks: 20,
    actual_max_marks: 20,
    marks_difference: 0,
    status: 'Valid',
    notes: 'Matches exam structure'
  },
  {
    id: 'sv-3',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '2',
    subject_name: 'English',
    class_id: '2',
    class_name: 'Grade 10 - B',
    structure_component: 'Paper 1 - Comprehension',
    expected_max_marks: 50,
    actual_max_marks: 50,
    marks_difference: 0,
    status: 'Valid',
    notes: 'Matches exam structure'
  },
  {
    id: 'sv-4',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '2',
    subject_name: 'English',
    class_id: '2',
    class_name: 'Grade 10 - B',
    structure_component: 'Paper 2 - Writing',
    expected_max_marks: 50,
    actual_max_marks: 45,
    marks_difference: -5,
    status: 'Invalid',
    notes: 'Max marks do not match structure'
  },
  {
    id: 'sv-5',
    exam_session_id: '2',
    exam_session_name: 'Mid-Term Exams',
    subject_id: '3',
    subject_name: 'Science',
    class_id: '3',
    class_name: 'Grade 11 - A',
    structure_component: 'Theory Paper',
    expected_max_marks: 70,
    actual_max_marks: 70,
    marks_difference: 0,
    status: 'Valid',
    notes: 'Matches exam structure'
  },
  {
    id: 'sv-6',
    exam_session_id: '2',
    exam_session_name: 'Mid-Term Exams',
    subject_id: '3',
    subject_name: 'Science',
    class_id: '3',
    class_name: 'Grade 11 - A',
    structure_component: 'Practical',
    expected_max_marks: 30,
    actual_max_marks: 28,
    marks_difference: -2,
    status: 'Warning',
    notes: 'Minor discrepancy in max marks'
  }
];

// Source: VerifyMarksCrossCheckPage.tsx
export const initialMockCrossCheckRecords: CrossCheckRecord[] = [
  {
    id: 'cc-1',
    student_id: '1',
    student_name: 'John Doe',
    admission_no: 'ADM-001',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '1',
    subject_name: 'Mathematics',
    class_id: '1',
    class_name: 'Grade 10 - A',
    primary_teacher_id: '1',
    primary_teacher_name: 'John Smith',
    primary_marks: 85,
    verifying_teacher_id: '2',
    verifying_teacher_name: 'Jane Doe',
    verified_marks: 85,
    marks_difference: 0,
    status: 'Verified',
    verified_at: new Date().toISOString(),
    notes: 'Marks match perfectly'
  },
  {
    id: 'cc-2',
    student_id: '2',
    student_name: 'Jane Smith',
    admission_no: 'ADM-002',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '2',
    subject_name: 'English',
    class_id: '2',
    class_name: 'Grade 10 - B',
    primary_teacher_id: '3',
    primary_teacher_name: 'Michael Johnson',
    primary_marks: 92,
    verifying_teacher_id: '4',
    verifying_teacher_name: 'Emily Davis',
    verified_marks: 88,
    marks_difference: -4,
    status: 'Discrepancy',
    verified_at: new Date(Date.now() - 86400000).toISOString(),
    notes: '4 mark difference found - needs review'
  },
  {
    id: 'cc-3',
    student_id: '3',
    student_name: 'Michael Johnson',
    admission_no: 'ADM-003',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '3',
    subject_name: 'Science',
    class_id: '3',
    class_name: 'Grade 11 - A',
    primary_teacher_id: '5',
    primary_teacher_name: 'Robert Wilson',
    primary_marks: 78,
    verifying_teacher_id: '2',
    verifying_teacher_name: 'Jane Doe',
    verified_marks: 78,
    marks_difference: 0,
    status: 'Pending',
    notes: null
  },
  {
    id: 'cc-4',
    student_id: '4',
    student_name: 'Emily Davis',
    admission_no: 'ADM-004',
    exam_session_id: '1',
    exam_session_name: 'Term 1 Final Exams',
    subject_id: '1',
    subject_name: 'Mathematics',
    class_id: '4',
    class_name: 'Grade 9 - A',
    primary_teacher_id: '1',
    primary_teacher_name: 'John Smith',
    primary_marks: 75,
    verifying_teacher_id: '3',
    verifying_teacher_name: 'Michael Johnson',
    verified_marks: 75,
    marks_difference: 0,
    status: 'Verified',
    verified_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Verified and confirmed'
  }
];

// Source: StudentExamAnalysisPage.tsx - Chart data
export const initialMockSubjectPerformanceData: SubjectPerformanceDataPoint[] = [
  { subject: 'English', student: 89, class: 76 },
  { subject: 'Kiswahili', student: 88, class: 75 },
  { subject: 'Mathematics', student: 59, class: 62 },
  { subject: 'Biology', student: 72, class: 68 },
  { subject: 'Physics', student: 65, class: 58 },
  { subject: 'Chemistry', student: 78, class: 71 },
  { subject: 'History', student: 82, class: 74 },
  { subject: 'Geography', student: 71, class: 69 },
  { subject: 'C.R.E', student: 85, class: 77 },
  { subject: 'Agriculture', student: 76, class: 72 },
  { subject: 'Business', student: 69, class: 65 },
  { subject: 'Computer', student: 91, class: 78 }
];

export const initialMockPerformanceOverTimeData: PerformanceOverTimeDataPoint[] = [
  { exam: 'Opener', student: 68, class: 64 },
  { exam: 'Mid Term', student: 71, class: 66 },
  { exam: 'End Term', student: 74, class: 68 }
];

export const initialMockSubjectBreakdownData: SubjectBreakdownDataPoint[] = [
  { name: 'English', marks: 89, change: 15, grade: 'A', rank: 2 },
  { name: 'Kiswahili', marks: 88, change: 11, grade: 'A', rank: 3 },
  { name: 'Mathematics', marks: 59, change: -7, grade: 'B-', rank: 13 },
  { name: 'Biology', marks: 72, change: 5, grade: 'B+', rank: 6 },
  { name: 'Physics', marks: 65, change: 3, grade: 'B', rank: 8 },
  { name: 'Chemistry', marks: 78, change: 8, grade: 'B+', rank: 4 }
];

// Source: ExamAnalysisPage.tsx - Chart data
export const initialMockExamPerformanceOverTimeData: ExamPerformanceOverTimeDataPoint[] = [
  { name: 'Form 1 Alpha', exam1: 4.8, exam2: 4.6, exam3: 4.5 },
  { name: 'Form 1 Moxie', exam1: 4.5, exam2: 4.4, exam3: 4.3 },
  { name: 'Form 1 North', exam1: 4.2, exam2: 4.1, exam3: 4.0 }
];

export const initialMockStreamPerformanceData: StreamPerformanceDataPoint[] = [
  { name: '1 North', points: 4.2 },
  { name: '1 Alpha', points: 4.6 },
  { name: '1 Moxie', points: 4.8 }
];

// === ASSIGNMENTS & LESSON-PLANNING SEED DATA ===
// Seedable exports (collection-backed): assignments, assignmentSubmissions, weeklyPlans,
// lessonPlans, lessonNotes. These resolve to registered collections via demoDataSeed
// (camelCase export name -> snake_case collection name).

const daysFromNow = (days: number): string => new Date(Date.now() + days * 86400000).toISOString();
const dateOnlyFromNow = (days: number): string => daysFromNow(days).split('T')[0];

export const assignments: Assignment[] = [
  {
    id: 'asg-1',
    title: 'Mathematics Chapter 5 Exercises',
    description: 'Complete all exercises from Chapter 5',
    subjectId: '3',
    subjectName: 'Mathematics',
    classId: 'class-1',
    className: 'Grade 10A',
    classStreamId: 'stream-1',
    classStreamName: 'Grade 10A - Science',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    assignedDate: daysFromNow(-3),
    dueDate: daysFromNow(7),
    maxScore: 100,
    weightPercentage: 10,
    status: AssignmentStatus.PUBLISHED,
    allowLateSubmission: true,
    latePenaltyPercentage: 10,
    instructions: 'Answer questions 1 to 25. Show all working for full marks.',
    rubricId: 'rubric-asg-1',
    rubric: [
      { id: 'crit-1', name: 'Accuracy of solutions', description: 'Correct methods and answers', maxPoints: 60, weightPercentage: 60, levels: [
        { id: 'lvl-1a', name: 'Excellent', points: 60 },
        { id: 'lvl-1b', name: 'Satisfactory', points: 40 },
        { id: 'lvl-1c', name: 'Needs improvement', points: 20 },
      ] },
      { id: 'crit-2', name: 'Presentation of working', description: 'Clear step-by-step working', maxPoints: 40, weightPercentage: 40, levels: [
        { id: 'lvl-2a', name: 'Excellent', points: 40 },
        { id: 'lvl-2b', name: 'Satisfactory', points: 25 },
        { id: 'lvl-2c', name: 'Needs improvement', points: 10 },
      ] },
    ],
    submissionCount: 4,
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-3),
  },
  {
    id: 'asg-2',
    title: 'English Essay: The River Between',
    description: 'Write a character analysis essay on the set book',
    subjectId: '1',
    subjectName: 'English',
    classId: 'class-2',
    className: 'Grade 10B',
    classStreamId: 'stream-2',
    classStreamName: 'Grade 10B - Arts',
    teacherId: 'teacher-2',
    teacherName: 'Sarah Mitchell',
    assignedDate: daysFromNow(-7),
    dueDate: daysFromNow(3),
    maxScore: 50,
    weightPercentage: 15,
    status: AssignmentStatus.PUBLISHED,
    allowLateSubmission: false,
    latePenaltyPercentage: 0,
    instructions: '500-700 words. Focus on Waiyaki\u2019s development as a protagonist.',
    submissionCount: 3,
    createdAt: daysFromNow(-7),
    updatedAt: daysFromNow(-6),
  },
  {
    id: 'asg-3',
    title: 'Physics Lab Report: Simple Pendulum',
    description: 'Full lab report on pendulum period vs length experiment',
    subjectId: '5',
    subjectName: 'Physics',
    classId: 'class-1',
    className: 'Grade 10A',
    classStreamId: 'stream-1',
    classStreamName: 'Grade 10A - Science',
    teacherId: 'teacher-3',
    teacherName: 'David Ochieng',
    assignedDate: daysFromNow(-1),
    dueDate: daysFromNow(10),
    maxScore: 40,
    weightPercentage: 5,
    status: AssignmentStatus.DRAFT,
    allowLateSubmission: true,
    latePenaltyPercentage: 5,
    instructions: 'Include abstract, apparatus, procedure, data table, graph and conclusion.',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'asg-4',
    title: 'History Source Analysis: Mau Mau Uprising',
    description: 'Analyse the provided primary sources and answer structured questions',
    subjectId: '7',
    subjectName: 'History',
    classId: 'class-2',
    className: 'Grade 10B',
    classStreamId: 'stream-2',
    classStreamName: 'Grade 10B - Arts',
    teacherId: 'teacher-4',
    teacherName: 'Grace Wambui',
    assignedDate: daysFromNow(-21),
    dueDate: daysFromNow(-14),
    maxScore: 30,
    weightPercentage: 10,
    status: AssignmentStatus.ARCHIVED,
    allowLateSubmission: false,
    latePenaltyPercentage: 0,
    submissionCount: 0,
    createdAt: daysFromNow(-21),
    updatedAt: daysFromNow(-13),
  },
  {
    id: 'asg-5',
    title: 'Kiswahili Insha: Safari Yangu',
    description: 'Andika insha ya aya sitini kuhusu safari yako uliyowahi kwenda',
    subjectId: '2',
    subjectName: 'Kiswahili',
    classId: 'class-1',
    className: 'Grade 10A',
    classStreamId: 'stream-1',
    classStreamName: 'Grade 10A - Science',
    teacherId: 'teacher-5',
    teacherName: 'Ali Hassan',
    assignedDate: daysFromNow(-5),
    dueDate: daysFromNow(1),
    maxScore: 20,
    weightPercentage: 10,
    status: AssignmentStatus.PUBLISHED,
    allowLateSubmission: true,
    latePenaltyPercentage: 10,
    instructions: 'Tumia sarufi sahihi na msamiata tajiri.',
    submissionCount: 3,
    createdAt: daysFromNow(-5),
    updatedAt: daysFromNow(-5),
  },
];

export const assignmentSubmissions: AssignmentSubmission[] = [
  {
    id: 'sub-1',
    assignmentId: 'asg-1',
    studentId: 'student-1',
    studentName: 'Alice Johnson',
    status: SubmissionStatus.GRADED,
    submissionDate: daysFromNow(-1),
    score: 92,
    grade: 'A',
    feedback: 'Excellent work - very clear working throughout.',
    maxScore: 100,
    gradedBy: 'teacher-1',
    gradedByName: 'John Smith',
    gradedAt: daysFromNow(0),
    isLate: false,
  },
  {
    id: 'sub-2',
    assignmentId: 'asg-1',
    studentId: 'student-2',
    studentName: 'Brian Kimani',
    status: SubmissionStatus.SUBMITTED,
    submissionDate: daysFromNow(-1),
    score: null,
    grade: null,
    feedback: null,
    maxScore: 100,
    isLate: false,
  },
  {
    id: 'sub-3',
    assignmentId: 'asg-1',
    studentId: 'student-3',
    studentName: 'Cynthia Wanjiru',
    status: SubmissionStatus.LATE,
    submissionDate: daysFromNow(-0),
    score: null,
    grade: null,
    feedback: null,
    maxScore: 100,
    isLate: true,
  },
  {
    id: 'sub-4',
    assignmentId: 'asg-1',
    studentId: 'student-4',
    studentName: 'Daniel Otieno',
    status: SubmissionStatus.PENDING_REVIEW,
    submissionDate: null,
    score: null,
    grade: null,
    feedback: null,
    maxScore: 100,
  },
  {
    id: 'sub-5',
    assignmentId: 'asg-2',
    studentId: 'student-1',
    studentName: 'Alice Johnson',
    status: SubmissionStatus.RETURNED,
    submissionDate: daysFromNow(-2),
    score: 45,
    grade: 'A-',
    feedback: 'Strong thesis statement. Watch your paragraph transitions.',
    maxScore: 50,
    gradedBy: 'teacher-2',
    gradedByName: 'Sarah Mitchell',
    gradedAt: daysFromNow(-1),
    isLate: false,
  },
  {
    id: 'sub-6',
    assignmentId: 'asg-2',
    studentId: 'student-5',
    studentName: 'Emily Njeri',
    status: SubmissionStatus.GRADED,
    submissionDate: daysFromNow(-3),
    score: 38,
    grade: 'B+',
    feedback: 'Good use of textual evidence; develop your conclusion further.',
    maxScore: 50,
    gradedBy: 'teacher-2',
    gradedByName: 'Sarah Mitchell',
    gradedAt: daysFromNow(-1),
    isLate: false,
  },
  {
    id: 'sub-7',
    assignmentId: 'asg-2',
    studentId: 'student-6',
    studentName: 'Felix Mwangi',
    status: SubmissionStatus.PENDING_REVIEW,
    submissionDate: null,
    score: null,
    grade: null,
    feedback: null,
    maxScore: 50,
  },
  {
    id: 'sub-8',
    assignmentId: 'asg-3',
    studentId: 'student-7',
    studentName: 'Grace Achieng',
    status: SubmissionStatus.SUBMITTED,
    submissionDate: daysFromNow(-0),
    score: null,
    grade: null,
    feedback: null,
    maxScore: 40,
    isLate: false,
  },
  {
    id: 'sub-9',
    assignmentId: 'asg-5',
    studentId: 'student-8',
    studentName: 'Henry Kiprop',
    status: SubmissionStatus.LATE,
    submissionDate: daysFromNow(-0),
    score: null,
    grade: null,
    feedback: null,
    maxScore: 20,
    isLate: true,
  },
  {
    id: 'sub-10',
    assignmentId: 'asg-5',
    studentId: 'student-9',
    studentName: 'Irene Mutheu',
    status: SubmissionStatus.SUBMITTED,
    submissionDate: daysFromNow(-1),
    score: null,
    grade: null,
    feedback: null,
    maxScore: 20,
    isLate: false,
  },
  {
    id: 'sub-11',
    assignmentId: 'asg-5',
    studentId: 'student-2',
    studentName: 'Brian Kimani',
    status: SubmissionStatus.GRADED,
    submissionDate: daysFromNow(-2),
    score: 18,
    grade: 'A-',
    feedback: 'Insha nzuri sana. Endelea kutumia nahau zaidi.',
    maxScore: 20,
    gradedBy: 'teacher-5',
    gradedByName: 'Ali Hassan',
    gradedAt: daysFromNow(-0),
    isLate: false,
  },
];

export const weeklyPlans: WeeklyPlan[] = [
  {
    id: 'wp-1',
    title: 'Week 6: Algebraic Expressions',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Algebraic Expressions',
    objectives: ['Simplify algebraic expressions', 'Factorise quadratics'],
    materials: ['Textbook Chapter 6', 'Worksheet pack B'],
    duration: 5,
    status: PlanStatus.DRAFT,
    weekStartDate: dateOnlyFromNow(7),
    weekEndDate: dateOnlyFromNow(13),
    overallObjectives: 'Learners simplify and factorise algebraic expressions with confidence.',
    teachingAids: 'Whiteboard, algebra tiles, printed worksheets',
    references: ['KLB Mathematics Form 2', 'Golden Tips Mathematics'],
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'wp-2',
    title: 'Week 5: Introduction to Algebra',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Introduction to Algebra',
    objectives: ['Understand variables', 'Learn basic operations'],
    materials: ['Textbook', 'Worksheets'],
    duration: 5,
    status: PlanStatus.SUBMITTED,
    submittedAt: daysFromNow(-1),
    submittedBy: 'teacher-1',
    submittedByName: 'John Smith',
    weekStartDate: dateOnlyFromNow(0),
    weekEndDate: dateOnlyFromNow(6),
    overallObjectives: 'Introduce variables and basic algebraic operations.',
    teachingAids: 'Flashcards, worked-example posters',
    references: ['KLB Mathematics Form 1'],
    dayPlans: [
      { id: 'wp-2-d1', dayOfWeek: 'Monday', date: dateOnlyFromNow(0), topics: 'Meaning of variables', objectives: 'Define variables and constants', activities: 'Group matching game', assessment: 'Oral questions', homework: 'Exercise 1.1 Q1-5', periodPlans: [
        { id: 'wp-2-d1-p1', periodId: 'period-1', periodName: 'Period 1', periodStartTime: '09:00', periodEndTime: '10:00', duration: 40, topicDetail: 'Introduction to variables', teachingMethod: 'Discussion' },
      ] },
      { id: 'wp-2-d2', dayOfWeek: 'Tuesday', date: dateOnlyFromNow(1), topics: 'Substitution', objectives: 'Substitute values into expressions', activities: 'Pair practice', assessment: 'Exit ticket', homework: 'Exercise 1.2 Q1-4', periodPlans: [] },
      { id: 'wp-2-d3', dayOfWeek: 'Wednesday', date: dateOnlyFromNow(2), topics: 'Like terms', objectives: 'Collect like terms', activities: 'Card sort activity', assessment: 'Peer marking', homework: 'None', periodPlans: [] },
    ],
    createdAt: daysFromNow(-4),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'wp-3',
    title: 'Week 4: Linear Equations',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Linear Equations',
    objectives: ['Solve linear equations', 'Graph linear functions'],
    materials: ['Textbook', 'Graph paper'],
    duration: 5,
    status: PlanStatus.APPROVED,
    submittedAt: daysFromNow(-9),
    submittedBy: 'teacher-1',
    submittedByName: 'John Smith',
    reviewedAt: daysFromNow(-8),
    reviewedBy: 'hod-math',
    reviewedByName: 'Mary Njeri (HoD Mathematics)',
    reviewComments: 'Well structured. Approved for delivery.',
    weekStartDate: dateOnlyFromNow(-7),
    weekEndDate: dateOnlyFromNow(-1),
    overallObjectives: 'Learners solve and graph linear equations accurately.',
    teachingAids: 'Graph boards, rulers, coloured chalk',
    references: ['KLB Mathematics Form 1'],
    createdAt: daysFromNow(-11),
    updatedAt: daysFromNow(-8),
  },
  {
    id: 'wp-4',
    title: 'Week 3: Quadratic Functions',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    gradeLevel: 'Grade 10',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    topic: 'Quadratic Functions',
    objectives: ['Understand quadratic equations', 'Solve by factoring'],
    materials: ['Textbook', 'Calculator'],
    duration: 5,
    status: PlanStatus.REJECTED,
    submittedAt: daysFromNow(-16),
    submittedBy: 'teacher-1',
    submittedByName: 'John Smith',
    reviewedAt: daysFromNow(-15),
    reviewedBy: 'hod-math',
    reviewedByName: 'Mary Njeri (HoD Mathematics)',
    reviewComments: 'Please add more differentiated practice problems and formative assessment checks per day.',
    weekStartDate: dateOnlyFromNow(-14),
    weekEndDate: dateOnlyFromNow(-8),
    overallObjectives: 'Learners solve quadratic equations by factoring.',
    teachingAids: 'Calculators, factor-tree charts',
    references: ['KLB Mathematics Form 2'],
    createdAt: daysFromNow(-18),
    updatedAt: daysFromNow(-15),
  },
];

export const lessonPlans: LessonPlan[] = [
  {
    id: 'lp-1',
    title: 'Introduction to Algebra',
    description: 'Basic algebraic concepts and operations',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    classId: 'class-1',
    className: 'Grade 10A',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    date: dateOnlyFromNow(1),
    startTime: '09:00',
    endTime: '10:00',
    objectives: ['Understand variables', 'Learn basic operations'],
    content: 'Introduction to variables and basic algebraic operations',
    resources: ['Textbook Chapter 1', 'Worksheet A'],
    status: 'published',
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    id: 'lp-2',
    title: 'Solving Linear Equations',
    description: 'Balancing method for one-variable equations',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    classId: 'class-1',
    className: 'Grade 10A',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    date: dateOnlyFromNow(2),
    startTime: '11:00',
    endTime: '12:00',
    objectives: ['Apply the balancing method', 'Check solutions by substitution'],
    content: 'Model one-step and two-step equations with the balance analogy.',
    resources: ['Balance-scale demonstration kit', 'Exercise 3.2'],
    status: 'draft',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'lp-3',
    title: 'Graphing Linear Functions',
    description: 'Plotting linear functions from tables of values',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    classId: 'class-1',
    className: 'Grade 10A',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    date: dateOnlyFromNow(-10),
    startTime: '14:00',
    endTime: '15:00',
    objectives: ['Draw tables of values', 'Plot straight-line graphs'],
    content: 'From table of values to Cartesian plane.',
    resources: ['Graph paper', 'Rulers'],
    status: 'archived',
    createdAt: daysFromNow(-12),
    updatedAt: daysFromNow(-9),
  },
];

export const lessonNotes: LessonNote[] = [
  {
    id: 'ln-1',
    teacherId: 'teacher-1',
    teacherName: 'John Smith',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    date: dateOnlyFromNow(0),
    periodId: 'period-1',
    periodName: 'Period 1',
    topic: 'Introduction to Algebra',
    subTopic: 'Variables and constants',
    objectives: 'Introduce learners to the concept of variables in algebra.',
    introduction: 'Recapped arithmetic with numbers, then introduced letter symbols.',
    presentation: 'Worked examples on the board; learners copied and attempted similar items.',
    development: 'Progressed from numeric expressions to simple algebraic expressions in pairs.',
    assessment: 'Short oral quiz and five-question exercise checked in class.',
    conclusion: 'Summarised difference between variables and constants; previewed substitution.',
    reflection: 'Most learners grasped variable notation quickly.',
    challenges: 'Two learners confused multiplication signs when simplifying.',
    studentsPresent: '38',
    studentsAbsent: '2',
    createdAt: daysFromNow(0),
    updatedAt: daysFromNow(0),
  },
  {
    id: 'ln-2',
    teacherId: 'teacher-2',
    teacherName: 'Sarah Mitchell',
    subjectId: '1',
    subjectName: 'English',
    classStreamId: 'stream-2',
    classStreamName: 'Grade 10B - Arts',
    date: dateOnlyFromNow(-1),
    periodId: 'period-3',
    periodName: 'Period 3',
    topic: 'The River Between: Chapters 3-4',
    subTopic: 'Characterisation of Waiyaki',
    objectives: 'Analyse Waiyaki\u2019s traits and motivations in chapters 3-4.',
    introduction: 'Quick recap quiz on chapters 1-2 events.',
    presentation: 'Read key excerpts aloud; annotated traits on the character map.',
    development: 'Group work: each group presented one trait with textual evidence.',
    assessment: 'Group presentations and peer scoring using a simple rubric.',
    conclusion: 'Assigned reflective paragraph on Waiyaki\u2019s dilemma.',
    reflection: 'Groups were engaged; timing for presentations ran over slightly.',
    challenges: 'Several learners had not completed the reading.',
    studentsPresent: '34',
    studentsAbsent: '4',
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'ln-3',
    teacherId: 'teacher-3',
    teacherName: 'David Ochieng',
    subjectId: '5',
    subjectName: 'Physics',
    classStreamId: 'stream-1',
    classStreamName: 'Grade 10A - Science',
    date: dateOnlyFromNow(-2),
    periodId: 'period-5',
    periodName: 'Period 5',
    topic: 'The Simple Pendulum',
    subTopic: 'Period-length relationship practical',
    objectives: 'Determine experimentally how pendulum length affects period.',
    introduction: 'Demonstrated pendulum motion and revised key terms.',
    presentation: 'Set up apparatus; modelled recording of 10 oscillation timings.',
    development: 'Groups collected data for four lengths and plotted T\u00b2 against l.',
    assessment: 'Marked data tables and plotted graphs during the lesson.',
    conclusion: 'Discussed gradient meaning and sources of error.',
    reflection: 'Practical went smoothly; graphs were mostly accurate.',
    challenges: 'Stopwatch errors in one group; re-timed together.',
    studentsPresent: '36',
    studentsAbsent: '3',
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    id: 'ln-4',
    teacherId: 'teacher-5',
    teacherName: 'Ali Hassan',
    subjectId: '2',
    subjectName: 'Kiswahili',
    classStreamId: 'class-1',
    classStreamName: 'Grade 10A',
    date: dateOnlyFromNow(-3),
    periodId: 'period-2',
    periodName: 'Period 2',
    topic: 'Uundaji wa Maneno',
    subTopic: 'Viambishi vya nyakati',
    objectives: 'Kutambua na kutumia viambishi vya nyakati kwenye sentensi.',
    introduction: 'Tuliangalia kazi ya nyumbani ya awali kwa pamoja.',
    presentation: 'Nilieleza mfano wa vitendo kwenye ubao; wanafunzi walifuatilia na kuiga.',
    development: 'Zoezi la kujaza majedwali ya viambishi kwa makundi.',
    assessment: 'Kipimo cha ufupi cha sentensi tano mwishoni mwa somo.',
    conclusion: 'Kazi ya nyumbani: kuandika sentensi kumi kwa Wakati ujao.',
    reflection: 'Wanafunzi walihusika vizuri katika makundi.',
    challenges: 'Vifaa vya mazoezi vilikuwa machache.',
    studentsPresent: '37',
    studentsAbsent: '1',
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-3),
  },
];

// === SEEDING EXPORTS (exam operations cluster) ===
// Picked up by demoDataSeed.ts: each resolves to a registered collection
// (camelToSnake or explicit exception, e.g. timetablePeriodDefs -> timetable_period_definitions).
export const examTokens = initialMockExamTokens;
export const boardExamResults = initialMockBoardExamResults;
export const resultDistributions = initialMockResultDistributions;
export const examGazettes = initialMockExamGazettes;
export const schoolEvents = initialMockSchoolEvents;
export const marksEntrySessions = initialMockMarksEntrySessions;
export const structureValidationRecords = initialMockStructureValidationItems;
export const marksCrossCheckRecords = initialMockCrossCheckRecords;
export const timetablePeriodDefs = initialMockTimetablePeriodDefs;

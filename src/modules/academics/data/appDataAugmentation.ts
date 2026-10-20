// ABOUTME: TypeScript module augmentation for Academics collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with academics-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  ClassSubjectAllocation,
  ExamPaperSetting,
  Subject,
  SubjectPaper,
  StudentSubjectEnrollment,
  TeacherSubjectAssignment,
  TimetableEntry,
  EducationSystemConfiguration,
  ExamSession,
  GradingScheme,
  StudentExamResult,
} from './types';

declare module '@/core/types' {
  export interface AppDataType {
    subjects: Subject[];
    subjectPapers: SubjectPaper[];
    examSessions: ExamSession[];
    examPaperSettings: ExamPaperSetting[];
    gradingSchemes: GradingScheme[];
    classSubjectAllocations: ClassSubjectAllocation[];
    teacherSubjectAssignments: TeacherSubjectAssignment[];
    studentSubjectEnrollments: StudentSubjectEnrollment[];
    timetableEntries: TimetableEntry[];
    studentExamResults: StudentExamResult[];
    educationSystemConfigurations: EducationSystemConfiguration[];
  }

  export interface AppDataContextType {
    // Exam Session CRUD
    addExamSession: (data: any) => Promise<void>;
    updateExamSession: (id: string, data: any) => Promise<void>;
    deleteExamSession: (id: string) => Promise<void>;
    // Exam Paper Setting CRUD
    addExamPaperSetting: (data: any) => Promise<void>;
    updateExamPaperSetting: (id: string, data: any) => Promise<void>;
    deleteExamPaperSetting: (id: string) => Promise<void>;
    // Exam Schedule CRUD
    addExamSchedule: (schedule: any) => Promise<void>;
    updateExamSchedule: (schedule: any) => Promise<void>;
    deleteExamSchedule: (id: string) => Promise<void>;
    // Student Exam Results
    saveStudentExamResult: (data: any) => Promise<void>;
    // Timetable Functions
    getTimetableEntries: (classStreamId: number) => any[];
    addTimetableEntry: (entryData: any) => Promise<void>;
    updateTimetableEntry: (updatedEntry: any) => Promise<void>;
    deleteTimetableEntry: (entryId: string) => Promise<void>;
    // Education System Configuration CRUD
    addEducationSystemConfiguration: (config: Partial<EducationSystemConfiguration>) => Promise<void>;
    updateEducationSystemConfiguration: (config: EducationSystemConfiguration) => Promise<void>;
    deleteEducationSystemConfiguration: (id: string) => Promise<void>;
    // Subject Paper CRUD
    addSubjectPaper: (data: any) => Promise<void>;
    updateSubjectPaper: (id: string, data: any) => Promise<void>;
    deleteSubjectPaper: (id: string) => Promise<void>;
    // Grading Scheme CRUD
    addGradingScheme: (data: any) => Promise<void>;
    updateGradingScheme: (id: string, data: any) => Promise<void>;
    deleteGradingScheme: (id: string) => Promise<void>;
    // Class Subject Allocation CRUD
    addClassSubjectAllocation: (data: any) => Promise<void>;
    updateClassSubjectAllocation: (id: string, data: any) => Promise<void>;
    deleteClassSubjectAllocation: (id: string) => Promise<void>;
    // Teacher Subject Assignment CRUD
    addTeacherSubjectAssignment: (data: any) => Promise<void>;
    updateTeacherSubjectAssignment: (id: string, data: any) => Promise<void>;
    deleteTeacherSubjectAssignment: (id: string) => Promise<void>;
    // Student Subject Enrollment CRUD
    addStudentSubjectEnrollment: (data: any) => Promise<any>;
    updateStudentSubjectEnrollment: (id: string, data: any) => Promise<any>;
    deleteStudentSubjectEnrollment: (id: string) => Promise<void>;
  }
}

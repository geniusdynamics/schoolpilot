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
    updateExamSession: (data: any) => Promise<void>;
    deleteExamSession: (id: string) => Promise<void>;
    // Exam Paper Setting CRUD
    addExamPaperSetting: (data: any) => Promise<void>;
    updateExamPaperSetting: (data: any) => Promise<void>;
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
  }
}

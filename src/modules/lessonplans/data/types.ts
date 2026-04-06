// ABOUTME: TypeScript interfaces for the Lesson Plans module

// --- Plan Status Enum ---

export enum PlanStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// --- Weekly Plan Types ---

export interface WeeklyPlan {
  id: string;
  teacherId: string;
  teacherName?: string | null;
  subjectId: number;
  subjectName?: string | null;
  classStreamId: number;
  classStreamName?: string | null;
  weekStartDate: string;
  weekEndDate: string;
  status: PlanStatus;
  overallObjectives: string;
  teachingAids: string;
  references: string;
  submittedAt?: string | null;
  submittedByName?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewComments?: string | null;
  createdAt: string;
  updatedAt: string;
  // Denormalized
  dayPlans?: DayPlan[] | null;
}

export interface DayPlan {
  id: string;
  weeklyPlanId: string;
  dayOfWeek: string;
  date: string;
  topics: string;
  objectives: string;
  activities: string;
  assessment: string;
  homework: string;
  // Denormalized
  periodPlans?: PeriodPlan[] | null;
}

export interface PeriodPlan {
  id: string;
  dayPlanId: string;
  periodId: number;
  periodName?: string | null;
  periodStartTime?: string | null;
  periodEndTime?: string | null;
  topicDetail: string;
  teachingMethod: string;
  duration: number; // minutes
  resources: string;
}

// --- Lesson Note Types ---

export interface LessonNote {
  id: string;
  teacherId: string;
  teacherName?: string | null;
  subjectId: number;
  subjectName?: string | null;
  classStreamId: number;
  classStreamName?: string | null;
  date: string;
  periodId: number;
  periodName?: string | null;
  topic: string;
  subTopic?: string | null;
  objectives: string;
  introduction: string;
  presentation: string;
  development: string;
  assessment: string;
  conclusion: string;
  reflection?: string | null;
  challenges?: string | null;
  weeklyPlanId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Denormalized
  studentsPresent?: number | null;
  studentsAbsent?: number | null;
}

// Type aliases for schema compatibility
export type WeeklyPlanType = WeeklyPlan;
export type DayPlanType = DayPlan;
export type PeriodPlanType = PeriodPlan;
export type LessonNoteType = LessonNote;

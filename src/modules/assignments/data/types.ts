// ABOUTME: TypeScript interfaces for the Assignments module

// --- Assignment Status Enums ---

export enum AssignmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  GRADED = 'GRADED',
}

export enum SubmissionStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  SUBMITTED = 'SUBMITTED',
  LATE = 'LATE',
  GRADED = 'GRADED',
  RETURNED = 'RETURNED',
}

// --- Assignment Types ---

export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  subjectId: number;
  subjectName?: string | null;
  classStreamId: number;
  classStreamName?: string | null;
  teacherId: string;
  teacherName?: string | null;
  assignedDate: string;
  dueDate: string;
  status: AssignmentStatus;
  maxScore?: number | null;
  weightPercentage?: number | null;
  allowLateSubmission: boolean;
  latePenaltyPercentage?: number | null;
  rubricId?: string | null;
  rubric?: RubricCriterion[] | null;
  attachmentUrls?: string[] | null;
  createdAt: string;
  updatedAt: string;
  // Denormalized
  submissionCount?: number | null;
  gradedCount?: number | null;
  averageScore?: number | null;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string | null;
  submissionDate?: string | null;
  status: SubmissionStatus;
  score?: number | null;
  maxScore?: number | null;
  grade?: string | null;
  feedback?: string | null;
  gradedBy?: string | null;
  gradedByName?: string | null;
  gradedAt?: string | null;
  isLate: boolean;
  // Denormalized
  assignmentTitle?: string | null;
  assignmentDueDate?: string | null;
}

export interface AssignmentAttachment {
  id: string;
  submissionId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

// --- Rubric Types ---

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  weightPercentage?: number | null;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number;
}

export interface RubricScore {
  id: string;
  submissionId: string;
  criterionId: string;
  criterionName?: string | null;
  score: number;
  maxScore: number;
  feedback?: string | null;
}

// Type aliases for schema compatibility
export type AssignmentType = Assignment;
export type AssignmentSubmissionType = AssignmentSubmission;
export type AssignmentAttachmentType = AssignmentAttachment;
export type RubricCriterionType = RubricCriterion;
export type RubricScoreType = RubricScore;

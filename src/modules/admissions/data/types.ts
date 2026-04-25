// ABOUTME: TypeScript types for the Admissions module
// ABOUTME: Defines all data structures used in admission management

// Application Status Workflow:
// Draft → Submitted → Under Review → (Approved/Rejected/Deferred/Waitlisted) → Enrolled

export enum ApplicationStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  INTERVIEW_SCHEDULED = 'Interview Scheduled',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  DEFERRED = 'Deferred',
  WAITLISTED = 'Waitlisted',
  ENROLLED = 'Enrolled'
}

export enum ApplicationType {
  NEW = 'New',
  TRANSFER = 'Transfer',
  READMISSION = 'Readmission'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum GuardianType {
  FATHER = 'Father',
  MOTHER = 'Mother',
  GUARDIAN = 'Guardian',
  OTHER = 'Other'
}

export enum ReviewDecision {
  STRONGLY_RECOMMEND = 'Strongly Recommend',
  RECOMMEND = 'Recommend',
  NEUTRAL = 'Neutral',
  NOT_RECOMMEND = 'Not Recommend',
  STRONGLY_NOT_RECOMMEND = 'Strongly Not Recommend'
}

export enum DocumentType {
  BIRTH_CERTIFICATE = 'Birth Certificate',
  KCPE_CERTIFICATE = 'KCPE Certificate',
  TRANSFER_LETTER = 'Transfer Letter',
  MEDICAL_REPORT = 'Medical Report',
  PASSPORT_PHOTO = 'Passport Photo',
  PREVIOUS_SCHOOL_REPORT = 'Previous School Report',
  OTHER = 'Other'
}

export enum DocumentStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected'
}

// Main Application Interface
export interface Application {
  id: string;
  applicationNumber: string;
  academicYearId?: string;
  intendedClassId?: string;
  intendedClassName?: string;
  academicYearName?: string;
  applicationType: ApplicationType;
  status: ApplicationStatus;
  
  // Applicant Information
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality?: string;
  religion?: string;
  birthCertificateNumber?: string;
  
  // Academic Background
  previousSchool?: string;
  previousClass?: string;
  kcpeIndexNumber?: string;
  kcpeMarks?: number;
  kcpeGrade?: string;
  
  // Guardian Information
  guardianType?: GuardianType;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  guardianEmployer?: string;
  
  // Address Information
  residentialAddress?: string;
  postalAddress?: string;
  county?: string;
  subCounty?: string;
  location?: string;
  subLocation?: string;
  
  // Application Timeline
  submissionDate?: string;
  reviewDate?: string;
  decisionDate?: string;
  enrollmentDate?: string;
  reviewDeadline?: string;
  
  // System Fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Relations
  documents?: ApplicationDocument[];
  reviews?: ApplicationReview[];
  notes?: ApplicationNote[];
  enrollment?: EnrollmentDetails;
}

// Applicant Interface (for public-facing forms)
export interface Applicant {
  id?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality?: string;
  religion?: string;
  birthCertificateNumber?: string;
}

// Application Document Interface
export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  
  // Verification
  status: DocumentStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  
  uploadedAt: string;
  uploadedBy?: string;
}

// Application Review Interface
export interface ApplicationReview {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName?: string;
  
  // Evaluation
  academicScore?: number;
  interviewScore?: number;
  behavioralAssessment?: string;
  recommendation: ReviewDecision;
  
  // Comments
  comments?: string;
  internalNotes?: string;
  
  // Status
  reviewDate: string;
  
  createdAt: string;
  updatedAt: string;
}

// Application Note Interface (for internal communication)
export interface ApplicationNote {
  id: string;
  applicationId: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

// Admission Decision Interface
export interface AdmissionDecision {
  id: string;
  applicationId: string;
  decidedBy: string;
  decidedByName?: string;
  decision: ApplicationStatus;
  decisionDate: string;
  conditions?: string;
  finalComments?: string;
  
  // Assignment details (if approved)
  assignedClassId?: string;
  assignedClassName?: string;
  assignedStreamId?: string;
  assignedStreamName?: string;
  admissionNumber?: string;
  startDate?: string;
  
  createdAt: string;
}

// Enrollment Details Interface
export interface EnrollmentDetails {
  id: string;
  applicationId: string;
  studentId: string;
  admissionNumber: string;
  enrolledAt: string;
  enrolledBy: string;
  
  // Class Assignment
  classId: string;
  className?: string;
  streamId?: string;
  streamName?: string;
  
  // Additional Assignment
  dormitoryId?: string;
  dormitoryName?: string;
  feeStructureId?: string;
  feeStructureName?: string;
  
  // Documents
  documentsReceived: string[];
  
  // Status
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// Program Type for filtering
export enum ProgramType {
  ALL = 'All',
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary'
}

// Time period for filtering
export enum TimePeriod {
  YTD = 'YTD',
  YOY = 'YoY',
  MOM = 'MoM'
}

// Funnel Stage Interface
export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

// Monthly Data Point for time-series charts
export interface MonthlyDataPoint {
  month: string;
  enquiries: number;
  conversions: number;
  applications: number;
  enrolled: number;
}

// Pipeline Status Counts
export interface PipelineCounts {
  contacts: number;
  enquired: number;
  applied: number;
  admitted: number;
  enrolled: number;
}

// Trend data
export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

// Application Statistics Interface
export interface ApplicationStatistics {
  totalApplications: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  deferred: number;
  waitlisted: number;
  enrolled: number;
  
  // Pipeline counts
  pipeline: PipelineCounts;
  
  // Breakdown by class
  byClass: {
    classId: string;
    className: string;
    count: number;
  }[];
  
  // Breakdown by status
  byStatus: {
    status: ApplicationStatus;
    count: number;
  }[];
  
  // Time-based stats
  thisMonth: number;
  thisWeek: number;
  today: number;
  
  // Time-series data for charts
  monthlyData: MonthlyDataPoint[];
  
  // Conversion funnel data
  funnel: FunnelStage[];
  
  // Post-admissions data
  postAdmissions: {
    declined: number;
    enrolled: number;
    total: number;
  };
  
  // Trends
  trends: {
    enquiries: TrendData;
    applications: TrendData;
    enrollment: TrendData;
    conversionRate: TrendData;
  };
}

// Application Filter Interface
export interface ApplicationFilters {
  status?: ApplicationStatus;
  classId?: string;
  academicYearId?: string;
  applicationType?: ApplicationType;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Application Form Data Interface (for creation/editing)
export interface ApplicationFormData {
  // Student Info
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality?: string;
  religion?: string;
  birthCertificateNumber?: string;
  
  // Application Details
  intendedClassId?: string;
  academicYearId?: string;
  applicationType: ApplicationType;
  
  // Academic Background
  previousSchool?: string;
  previousClass?: string;
  kcpeIndexNumber?: string;
  kcpeMarks?: number;
  kcpeGrade?: string;
  
  // Guardian Info
  guardianType?: GuardianType;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianOccupation?: string;
  guardianEmployer?: string;
  
  // Address
  residentialAddress?: string;
  postalAddress?: string;
  county?: string;
  subCounty?: string;
  location?: string;
  subLocation?: string;
}

// Document Upload Interface
export interface DocumentUpload {
  file: File;
  documentType: DocumentType;
  description?: string;
}

// Review Form Data Interface
export interface ReviewFormData {
  academicScore?: number;
  interviewScore?: number;
  behavioralAssessment?: string;
  recommendation: ReviewDecision;
  comments?: string;
  internalNotes?: string;
}

// Decision Form Data Interface
export interface DecisionFormData {
  decision: ApplicationStatus;
  conditions?: string;
  finalComments?: string;
  assignedClassId?: string;
  assignedStreamId?: string;
  admissionNumber?: string;
  startDate?: string;
  feeStructureId?: string;
  dormitoryId?: string;
  generateInvoice: boolean;
}

// Activity Log Interface
export interface ApplicationActivity {
  id: string;
  applicationId: string;
  activityType: string;
  description: string;
  performedBy: string;
  performedByName?: string;
  performedAt: string;
  metadata?: Record<string, any>;
}

// Export types
export type {
  Application,
  Applicant,
  ApplicationDocument,
  ApplicationReview,
  ApplicationNote,
  AdmissionDecision,
  EnrollmentDetails,
  ApplicationStatistics,
  ApplicationFilters,
  ApplicationFormData,
  DocumentUpload,
  ReviewFormData,
  DecisionFormData,
  ApplicationActivity,
  FunnelStage,
  MonthlyDataPoint,
  PipelineCounts,
  TrendData
};

// ABOUTME: TypeScript interfaces for the Portal module
// ABOUTME: The Portal module does NOT create new collections - it reads from existing ones

import { Student, ParentsGuardian, Staff } from '../../core/types';

// --- Portal User Types ---

export type PortalUserRole = 'student' | 'parent' | 'guardian';

export interface PortalUser {
  id: string;
  userId: string;
  role: PortalUserRole;
  displayName: string;
  email: string;
  phone?: string | null;
  photoPath?: string | null;
  // For students
  student?: Student | null;
  // For parents/guardians
  guardian?: ParentsGuardian | null;
  children?: Student[];
  // For staff (teachers viewing their own info)
  staff?: Staff | null;
}

// --- Portal Announcement Types ---

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AnnouncementAudience = 'all' | 'students' | 'parents' | 'staff' | 'specific_class';

export interface PortalAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  targetClassId?: number | null;
  authorId: string;
  authorName: string;
  publishedAt: string;
  expiresAt?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  // Denormalized
  readBy?: string[];
  attachmentUrl?: string | null;
}

// --- Portal Fee Summary Types ---

export interface PortalFeeSummary {
  studentId: string;
  studentName: string;
  classStreamId?: number | null;
  classStreamName?: string | null;
  academicPeriodId?: number | null;
  academicPeriodName?: string | null;
  totalFees: number;
  totalPaid: number;
  totalDiscount: number;
  totalFine: number;
  currentBalance: number;
  dueDate?: string | null;
  invoices: PortalFeeInvoice[];
  payments: PortalFeePayment[];
}

export interface PortalFeeInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: 'Due' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Voided';
  items: PortalFeeInvoiceItem[];
}

export interface PortalFeeInvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface PortalFeePayment {
  id: string;
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string | null;
}

// --- Portal Attendance Types ---

export interface PortalAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  periodId?: number | null;
  periodName?: string | null;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  remarks?: string | null;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

// --- Portal Results Types ---

export interface PortalResultSummary {
  examSessionId: string;
  examSessionName: string;
  academicPeriodName: string;
  totalMarks?: number | null;
  meanGrade?: string | null;
  classRank?: number | null;
  streamRank?: number | null;
  subjects: PortalSubjectResult[];
}

export interface PortalSubjectResult {
  subjectId: number;
  subjectName: string;
  marks?: number | null;
  marksOutOf?: number | null;
  grade?: string | null;
  points?: number | null;
  comment?: string | null;
}

// --- Portal Dashboard Types ---

export interface PortalDashboardData {
  user: PortalUser;
  announcements: PortalAnnouncement[];
  upcomingEvents: PortalEvent[];
  attendanceSummary?: PortalAttendanceSummary;
  feeSummary?: PortalFeeSummary;
  recentResults?: PortalResultSummary[];
}

export interface PortalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'exam' | 'holiday' | 'meeting' | 'activity' | 'other';
  location?: string | null;
}

export interface PortalAttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendancePercentage: number;
  period?: string;
}

// Type aliases for schema compatibility
export type PortalUserType = PortalUser;
export type PortalAnnouncementType = PortalAnnouncement;
export type PortalFeeSummaryType = PortalFeeSummary;

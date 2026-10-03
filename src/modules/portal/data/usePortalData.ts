import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logging';
import { useAppData } from '@/hooks/useAppData';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useAuth } from '@/contexts/AuthContext';
import type { Student } from '@/core/types';

import type {
  PortalAnnouncement,
  PortalAttendanceRecord,
  PortalResultSummary,
  PortalSubjectResult,
  PortalFeeSummary,
  PortalFeeInvoice,
} from './types';

// The only portal-owned collection; other views derive from live academics/finance data.
const ANNOUNCEMENTS_COLLECTION = 'announcements';

const VALID_ATTENDANCE_STATUSES: PortalAttendanceRecord['status'][] = [
  'Present',
  'Absent',
  'Late',
  'Excused',
];

const normalizeAttendanceStatus = (status: string): PortalAttendanceRecord['status'] =>
  VALID_ATTENDANCE_STATUSES.includes(status as PortalAttendanceRecord['status'])
    ? (status as PortalAttendanceRecord['status'])
    : 'Present';

// Invoice docs may carry statuses outside what the portal renders (e.g. 'Draft');
// map them onto the closest displayable state.
const normalizeInvoiceStatus = (status: string): PortalFeeInvoice['status'] => {
  switch (status) {
    case 'Paid':
      return 'Paid';
    case 'Partially Paid':
      return 'Partially Paid';
    case 'Overdue':
      return 'Overdue';
    case 'Voided':
      return 'Voided';
    default:
      return 'Due';
  }
};

/**
 * Why the portal viewer could not be resolved. Drives the access notice UI.
 * - 'loading'          — auth/session or the students collection is still loading
 * - 'not-authenticated'— no signed-in user
 * - 'no-linked-student'— signed in, but this account has no student record
 * - 'linked'           — resolved; `student` is populated
 */
export type PortalAccessStatus =
  | 'loading'
  | 'not-authenticated'
  | 'no-linked-student'
  | 'linked';

export interface PortalStudentResolution {
  student: Student | null;
  status: PortalAccessStatus;
}

/**
 * Resolve the student whose data the portal viewer sees.
 *
 * The signed-in user is linked to a student record via `students.user_id`,
 * so portal data is always scoped to the authenticated account — there is no
 * fallback to arbitrary students.
 */
export const useCurrentPortalStudent = (): PortalStudentResolution => {
  const { user, isLoading: authLoading } = useAuth();
  const { students, loading: studentsLoading } = useAppData();

  return useMemo<PortalStudentResolution>(() => {
    if (authLoading || studentsLoading) {
      return { student: null, status: 'loading' };
    }
    if (!user) {
      return { student: null, status: 'not-authenticated' };
    }

    const linked = (students || []).find(
      s => s.user_id != null && String(s.user_id) === String(user.id)
    );
    if (!linked) {
      return { student: null, status: 'no-linked-student' };
    }

    return { student: linked, status: 'linked' };
  }, [user, authLoading, students, studentsLoading]);
};

export const usePortalData = () => {
  const {
    students,
    studentAttendance,
    studentExamResults,
    examSessions,
    examPaperSettings,
    studentInvoices,
    studentInvoiceItems,
    studentPayments,
    feeAdjustments,
    loading: appLoading,
  } = useAppData();

  const { student: currentStudent, status: accessStatus } = useCurrentPortalStudent();
  const resolvedStudentId = currentStudent?.id ?? null;

  // Announcements come straight from the portal-owned collection.
  const {
    data: announcements,
    loading: announcementsLoading,
    refresh: refreshAnnouncements,
  } = useDatabaseCollection<PortalAnnouncement>(ANNOUNCEMENTS_COLLECTION);

  const [attendanceRecords, setAttendanceRecords] = useState<PortalAttendanceRecord[]>([]);
  const [results, setResults] = useState<PortalResultSummary[]>([]);
  const [feeSummaries, setFeeSummaries] = useState<PortalFeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentNameMap = useMemo(() => {
    const map = new Map<string, Student>();
    (students || []).forEach(s => map.set(String(s.id), s));
    return map;
  }, [students]);

  const getStudentFullName = useCallback(
    (studentId: string): string => {
      const student = studentNameMap.get(String(studentId));
      if (!student) return '';
      return `${student.first_name} ${student.middle_name ?? ''} ${student.last_name}`.trim();
    },
    [studentNameMap]
  );

  // --- Derived view builders (live data, no mock fallbacks) ---

  const computeAttendanceRecords = useCallback(
    (studentId: string): PortalAttendanceRecord[] => {
      const studentName = getStudentFullName(studentId);
      return (studentAttendance || [])
        .filter(record => String(record.student_id) === String(studentId))
        .map(record => ({
          id: String(record.id),
          studentId: String(studentId),
          studentName: record.student_name ?? studentName,
          date: record.date,
          periodId: record.period_id ?? null,
          periodName: record.period_name ?? null,
          status: normalizeAttendanceStatus(String(record.status)),
          remarks: record.reason_for_absence ?? null,
          recordedBy: '',
          recordedByName: '',
          createdAt: record.created_at ?? '',
        }));
    },
    [studentAttendance, getStudentFullName]
  );

  const computeResults = useCallback(
    (studentId: string): PortalResultSummary[] => {
      const paperSettingsById = new Map(
        (examPaperSettings || []).map(setting => [String(setting.id), setting])
      );

      // Group this student's results per exam session.
      const resultsBySession = new Map<string, typeof studentExamResults>();
      (studentExamResults || [])
        .filter(result => String(result.student_id) === String(studentId))
        .forEach(result => {
          const sessionId = String(result.exam_session_id);
          const existing = resultsBySession.get(sessionId);
          if (existing) {
            existing.push(result);
          } else {
            resultsBySession.set(sessionId, [result]);
          }
        });

      return Array.from(resultsBySession.entries()).map(([sessionId, sessionResults]) => {
        const primary = sessionResults[0];
        const session = (examSessions || []).find(es => String(es.id) === sessionId);

        const subjects: PortalSubjectResult[] = (primary.marks ?? []).map((paperMark, index) => {
          const setting = paperSettingsById.get(String(paperMark.paper_setting_id));
          return {
            subjectId: setting?.subject_paper_id ?? index + 1,
            subjectName:
              setting?.subject_name ??
              setting?.subject_paper_name ??
              `Paper ${paperMark.paper_setting_id}`,
            marks: paperMark.score ?? null,
            marksOutOf: setting?.marks_out_of ?? null,
            grade: primary.mean_grade ?? null,
            points: null,
            comment: null,
          };
        });

        return {
          examSessionId: sessionId,
          examSessionName: session?.name ?? sessionId,
          academicPeriodName: session?.school_period_name ?? '',
          totalMarks: primary.total_marks ?? null,
          meanGrade: primary.mean_grade ?? null,
          classRank: primary.class_rank ?? null,
          streamRank: primary.stream_rank ?? null,
          subjects,
        };
      });
    },
    [studentExamResults, examSessions, examPaperSettings]
  );

  const computeFeeSummaries = useCallback(
    (studentId: string): PortalFeeSummary[] => {
      const itemsByInvoiceId = new Map<string, typeof studentInvoiceItems>();
      (studentInvoiceItems || []).forEach(item => {
        const invoiceId = String(item.invoice_id);
        const existing = itemsByInvoiceId.get(invoiceId);
        if (existing) {
          existing.push(item);
        } else {
          itemsByInvoiceId.set(invoiceId, [item]);
        }
      });

      const payments = (studentPayments || []).filter(
        payment => String(payment.student_id) === String(studentId)
      );
      const adjustments = (feeAdjustments || []).filter(
        adjustment => String(adjustment.student_id) === String(studentId)
      );
      const isDiscountLike = (type: string) =>
        type === 'Discount' || type === 'Scholarship' || type === 'Exemption';
      const isFineLike = (type: string) => type === 'Fine' || type === 'Penalty';

      // Discounts/exemptions applied against a specific invoice reduce that invoice's balance.
      const discountAppliedTo = (invoiceId: string): number =>
        adjustments
          .filter(
            adjustment =>
              adjustment.applied_invoice_id != null &&
              String(adjustment.applied_invoice_id) === invoiceId &&
              isDiscountLike(adjustment.adjustment_type)
          )
          .reduce((sum, adjustment) => sum + (Number(adjustment.amount) || 0), 0);

      const portalInvoices: PortalFeeInvoice[] = (studentInvoices || [])
        .filter(invoice => String(invoice.student_id) === String(studentId) && !invoice.deleted_at)
        .map(invoice => {
          const totalAmount = Number(invoice.total_amount_billed) || 0;
          const amountPaid = Number(invoice.amount_paid) || 0;
          const balance = Math.max(totalAmount - amountPaid - discountAppliedTo(String(invoice.id)), 0);
          return {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date,
            totalAmount,
            amountPaid,
            balance,
            status: normalizeInvoiceStatus(String(invoice.status)),
            items: (itemsByInvoiceId.get(String(invoice.id)) ?? []).map(item => ({
              id: item.id,
              description: item.description,
              amount: Number(item.amount) || 0,
            })),
          };
        });

      const totalFees = portalInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const totalDiscount = adjustments
        .filter(adjustment => isDiscountLike(adjustment.adjustment_type))
        .reduce((sum, adjustment) => sum + (Number(adjustment.amount) || 0), 0);
      const totalFine = adjustments
        .filter(adjustment => isFineLike(adjustment.adjustment_type))
        .reduce((sum, adjustment) => sum + (Number(adjustment.amount) || 0), 0);
      const totalPaid = payments.reduce(
        (sum, payment) => sum + (Number(payment.total_amount_paid) || 0),
        0
      );

      const outstanding = portalInvoices.filter(invoice => invoice.balance > 0);
      const earliestOutstandingDue = outstanding
        .map(invoice => invoice.dueDate)
        .sort()
        [0] ?? null;

      const summary: PortalFeeSummary = {
        studentId: String(studentId),
        studentName: getStudentFullName(studentId),
        classStreamId: currentStudent?.current_class_stream_id ?? null,
        classStreamName: currentStudent?.current_class_stream_name ?? null,
        academicPeriodId: studentInvoices?.find(
          invoice => String(invoice.student_id) === String(studentId)
        )?.school_period_id ?? null,
        academicPeriodName:
          studentInvoices?.find(invoice => String(invoice.student_id) === String(studentId))
            ?.school_period_name ?? null,
        totalFees,
        totalPaid,
        totalDiscount,
        totalFine,
        currentBalance: totalFees - totalDiscount + totalFine - totalPaid,
        dueDate: earliestOutstandingDue,
        invoices: portalInvoices,
        payments: payments.map(payment => ({
          id: payment.id,
          receiptNo: payment.receipt_no,
          paymentDate: payment.transaction_date,
          amount: Number(payment.total_amount_paid) || 0,
          paymentMethod: payment.payment_method ?? '',
          referenceNo: payment.reference_no ?? null,
        })),
      };

      return [summary];
    },
    [studentInvoices, studentInvoiceItems, studentPayments, feeAdjustments, currentStudent, getStudentFullName]
  );

  // Keep derived views in sync with the live collections and the resolved viewer.
  useEffect(() => {
    setAttendanceRecords(resolvedStudentId ? computeAttendanceRecords(resolvedStudentId) : []);
  }, [resolvedStudentId, computeAttendanceRecords]);

  useEffect(() => {
    setResults(resolvedStudentId ? computeResults(resolvedStudentId) : []);
  }, [resolvedStudentId, computeResults]);

  useEffect(() => {
    setFeeSummaries(resolvedStudentId ? computeFeeSummaries(resolvedStudentId) : []);
  }, [resolvedStudentId, computeFeeSummaries]);

  // --- Loaders (studentId optional; defaults to the resolved portal viewer) ---

  const loadAnnouncements = useCallback(async () => {
    await refreshAnnouncements();
  }, [refreshAnnouncements]);

  const loadAttendanceRecords = useCallback(
    async (studentId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const sid = studentId ?? resolvedStudentId;
        setAttendanceRecords(sid ? computeAttendanceRecords(sid) : []);
      } catch (err) {
        logger.error('[usePortalData] Failed to load attendance records:', err);
        setError(err instanceof Error ? err.message : 'Failed to load attendance records');
        setAttendanceRecords([]);
      } finally {
        setLoading(false);
      }
    },
    [resolvedStudentId, computeAttendanceRecords]
  );

  const loadResults = useCallback(
    async (studentId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const sid = studentId ?? resolvedStudentId;
        setResults(sid ? computeResults(sid) : []);
      } catch (err) {
        logger.error('[usePortalData] Failed to load results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [resolvedStudentId, computeResults]
  );

  const loadFeeSummaries = useCallback(
    async (studentId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const sid = studentId ?? resolvedStudentId;
        setFeeSummaries(sid ? computeFeeSummaries(sid) : []);
      } catch (err) {
        logger.error('[usePortalData] Failed to load fee summaries:', err);
        setError(err instanceof Error ? err.message : 'Failed to load fee summaries');
        setFeeSummaries([]);
      } finally {
        setLoading(false);
      }
    },
    [resolvedStudentId, computeFeeSummaries]
  );

  // Filter announcements by audience
  const getAnnouncementsForUser = useCallback((userRole: string): PortalAnnouncement[] => {
    return announcements.filter(a => {
      if (!a.isPublished) return false;
      if (a.audience === 'all') return true;
      if (a.audience === userRole) return true;
      return false;
    });
  }, [announcements]);

  // Get attendance summary
  const getAttendanceSummary = useCallback(() => {
    const total = attendanceRecords.length;
    if (total === 0) return null;

    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
    const late = attendanceRecords.filter(r => r.status === 'Late').length;
    const excused = attendanceRecords.filter(r => r.status === 'Excused').length;

    return {
      totalDays: total,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      excusedDays: excused,
      attendancePercentage: Math.round((present / total) * 100),
    };
  }, [attendanceRecords]);

  return {
    announcements,
    attendanceRecords,
    results,
    feeSummaries,
    loading: loading || announcementsLoading || appLoading.all,
    error,
    /** Why the portal viewer is (not) resolved — drives the access notice UI. */
    accessStatus,
    currentStudent,
    loadAnnouncements,
    loadAttendanceRecords,
    loadResults,
    loadFeeSummaries,
    getAnnouncementsForUser,
    getAttendanceSummary,
  };
};

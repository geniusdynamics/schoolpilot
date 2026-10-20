/**
 * Student Votehead Statement Utility
 * Generates votehead statements for students
 */

export interface VoteheadStatement {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  voteheadId: string;
  voteheadName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'overdue';
  receiptNumber?: string;
}

export interface VoteheadStatementOptions {
  studentId?: string;
  classId?: string;
  voteheadId?: string;
  startDate?: string;
  endDate?: string;
}

export interface VoteheadStatementSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  paymentCount: number;
  pendingCount: number;
  overdueCount: number;
}

export function generateStudentVoteheadStatement(
  options: VoteheadStatementOptions = {}
): VoteheadStatement[] {
  const statements: VoteheadStatement[] = [
    {
      studentId: 'student-001',
      studentName: 'John Doe',
      admissionNumber: 'ADM-2024-001',
      classId: 'class-1',
      className: 'Grade 10A',
      voteheadId: 'votehead-001',
      voteheadName: 'School Fees',
      amount: 500000,
      currency: 'KES',
      paymentDate: '2024-03-15',
      paymentMethod: 'Bank Transfer',
      status: 'paid',
      receiptNumber: 'REC-2024-001',
    },
    {
      studentId: 'student-001',
      studentName: 'John Doe',
      admissionNumber: 'ADM-2024-001',
      classId: 'class-1',
      className: 'Grade 10A',
      voteheadId: 'votehead-002',
      voteheadName: 'Library Fees',
      amount: 20000,
      currency: 'KES',
      paymentDate: '2024-03-16',
      paymentMethod: 'Cash',
      status: 'paid',
      receiptNumber: 'REC-2024-002',
    },
    {
      studentId: 'student-001',
      studentName: 'John Doe',
      admissionNumber: 'ADM-2024-001',
      classId: 'class-1',
      className: 'Grade 10A',
      voteheadId: 'votehead-003',
      voteheadName: 'Science Fees',
      amount: 75000,
      currency: 'KES',
      paymentDate: '2024-03-17',
      paymentMethod: 'Bank Transfer',
      status: 'pending',
    },
    {
      studentId: 'student-002',
      studentName: 'Jane Smith',
      admissionNumber: 'ADM-2024-002',
      classId: 'class-1',
      className: 'Grade 10B',
      voteheadId: 'votehead-001',
      voteheadName: 'School Fees',
      amount: 550000,
      currency: 'KES',
      paymentDate: '2024-03-10',
      paymentMethod: 'Cash',
      status: 'overdue',
    },
    {
      studentId: 'student-002',
      studentName: 'Jane Smith',
      admissionNumber: 'ADM-2024-002',
      classId: 'class-1',
      className: 'Grade 10B',
      voteheadId: 'votehead-002',
      voteheadName: 'Library Fees',
      amount: 25000,
      currency: 'KES',
      paymentDate: '2024-03-11',
      paymentMethod: 'Bank Transfer',
      status: 'paid',
      receiptNumber: 'REC-2024-003',
    },
  ];

  return statements;
}

export function generateVoteheadStatementSummary(
  statements: VoteheadStatement[]
): VoteheadStatementSummary {
  const summary: VoteheadStatementSummary = {
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    paymentCount: 0,
    pendingCount: 0,
    overdueCount: 0,
  };

  statements.forEach(statement => {
    summary.totalAmount += statement.amount;

    if (statement.status === 'paid') {
      summary.totalPaid += statement.amount;
      summary.paymentCount++;
    } else if (statement.status === 'pending') {
      summary.totalPending += statement.amount;
      summary.pendingCount++;
    } else if (statement.status === 'overdue') {
      summary.totalOverdue += statement.amount;
      summary.overdueCount++;
    }
  });

  return summary;
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getStatusBadge(status: string): string {
  const statusMap: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  };

  return statusMap[status] || 'bg-surface-accent text-surface-foreground';
}

export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
  };

  return statusMap[status] || status;
}

export function exportToCSV(statements: VoteheadStatement[]): string {
  const headers = [
    'Student ID',
    'Student Name',
    'Admission Number',
    'Class',
    'Votehead',
    'Amount',
    'Currency',
    'Payment Date',
    'Payment Method',
    'Status',
    'Receipt Number',
  ];

  const rows = statements.map(statement => [
    statement.studentId,
    statement.studentName,
    statement.admissionNumber,
    statement.className,
    statement.voteheadName,
    statement.amount.toString(),
    statement.currency,
    statement.paymentDate,
    statement.paymentMethod,
    getStatusLabel(statement.status),
    statement.receiptNumber || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

export default {
  generateStudentVoteheadStatement,
  generateVoteheadStatementSummary,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getStatusLabel,
  exportToCSV,
};

// Backward-compatible aliases
export { generateStudentVoteheadStatement as buildStudentVoteheadStatement };
export type { VoteheadStatement as StatementRow };
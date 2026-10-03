import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useStudentFinancialSummary } from '../hooks/useStudentFinancialSummary';
import { formatKES } from '@/utils/format';
import { ExclamationTriangleIcon, UserGroupIcon, ArrowDownTrayIcon } from '@/components/ui/icons';
import type { FeeDueRecord, AgingCategory } from '../data/types';

/** Buckets a days-overdue count into the report's aging categories. */
function agingBucket(daysOverdue: number): AgingCategory {
  if (daysOverdue <= 0) return 'Current';
  if (daysOverdue <= 30) return '1-30 Days';
  if (daysOverdue <= 60) return '31-60 Days';
  if (daysOverdue <= 90) return '61-90 Days';
  return '90+ Days';
}

export const FeesDueReportPageContent: React.FC = () => {
  const { data: summaries, loading } = useStudentFinancialSummary();

  const [classFilter, setClassFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Derive fee-due records from the live financial summary (students with an outstanding balance)
  const dueRecords: FeeDueRecord[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return summaries
      .filter(s => s.balance > 0)
      .map(s => {
        const dueDate = s.earliestDueDate ?? '';
        const daysOverdue = dueDate
          ? Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86_400_000))
          : 0;
        return {
          id: s.studentId,
          student_id: s.studentId,
          student_name: s.name,
          admission_no: s.admissionNo,
          class_name: s.className ?? '—',
          guardian_name: '—',
          guardian_phone: '—',
          total_amount_due: s.feeAmount + s.feePenalty,
          amount_paid: s.amountPaid,
          balance_due: s.balance,
          due_date: dueDate,
          days_overdue: daysOverdue,
          aging_category: agingBucket(daysOverdue),
          school_period: '',
        } satisfies FeeDueRecord;
      });
  }, [summaries]);

  const filteredRecords = useMemo(() => {
    let filtered = dueRecords;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.student_name.toLowerCase().includes(q) ||
        record.admission_no.toLowerCase().includes(q)
      );
    }
    if (classFilter) {
      filtered = filtered.filter(record => record.class_name === classFilter);
    }
    if (agingFilter) {
      filtered = filtered.filter(record => record.aging_category === agingFilter);
    }
    return filtered;
  }, [dueRecords, searchTerm, classFilter, agingFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, record) => ({
      totalDue: acc.totalDue + (record.total_amount_due ?? 0),
      totalPaid: acc.totalPaid + (record.amount_paid ?? 0),
      totalBalance: acc.totalBalance + (record.balance_due ?? 0),
      overdueCount: acc.overdueCount + ((record.days_overdue ?? 0) > 0 ? 1 : 0)
    }), { totalDue: 0, totalPaid: 0, totalBalance: 0, overdueCount: 0 });
  }, [filteredRecords]);

  const handleExportCSV = () => {
    const header = ['Student', 'Admission No', 'Class', 'Total Due', 'Paid', 'Balance', 'Due Date', 'Days Overdue', 'Aging'];
    const rows = filteredRecords.map(r => [
      r.student_name, r.admission_no, r.class_name,
      r.total_amount_due, r.amount_paid, r.balance_due,
      r.due_date, r.days_overdue, r.aging_category,
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fees-due-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getAgingBadge = (category: string) => {
    const styles = {
      'Current': 'bg-green-100 text-green-800',
      '1-30 Days': 'bg-yellow-100 text-yellow-800',
      '31-60 Days': 'bg-orange-100 text-orange-800',
      '61-90 Days': 'bg-red-100 text-red-800',
      '90+ Days': 'bg-red-200 text-red-900'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category as keyof typeof styles]}`}>
        {category}
      </span>
    );
  };

  const columns: DataGridColumn<FeeDueRecord>[] = [
    { key: 'student_name', header: 'Student Name', sortable: true, filterable: true },
    { key: 'admission_no', header: 'Admission No', sortable: true, filterable: true },
    { key: 'class_name', header: 'Class', sortable: true, filterable: true },
    {
      key: 'total_amount_due',
      header: 'Total Due',
      sortable: true,
      align: 'right',
      render: (value) => formatKES(value)
    },
    {
      key: 'amount_paid',
      header: 'Paid',
      sortable: true,
      align: 'right',
      render: (value) => value != null && value > 0 ? formatKES(value) : '-'
    },
    {
      key: 'balance_due',
      header: 'Balance',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className={`font-semibold ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatKES(value)}
        </span>
      )
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'days_overdue',
      header: 'Days Overdue',
      sortable: true,
      render: (value) => (
        <span className={value > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
          {value > 0 ? `${value} days` : 'Current'}
        </span>
      )
    },
    {
      key: 'aging_category',
      header: 'Aging',
      sortable: true,
      filterable: true,
      render: (value) => getAgingBadge(value)
    }
  ];

  const uniqueClasses = useMemo(() => {
    return [...new Set(dueRecords.map(r => r.class_name))].sort();
  }, [dueRecords]);

  const agingCategories = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            <span>Fees Due Report</span>
          </div>
        }
        actions={
          <Button onClick={handleExportCSV} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />} disabled={filteredRecords.length === 0}>
            Export CSV
          </Button>
        }
      >
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Outstanding Fees with Aging</h3>
              <p className="text-sm text-red-700 mt-1">
                This report shows all outstanding fees by class and student with aging analysis.
                Track overdue payments, follow up with guardians, and manage fee collection effectively.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Class Filter</label>
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              options={[
                { value: '', label: 'All Classes' },
                ...uniqueClasses.map(c => ({ value: c, label: c }))
              ]}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Aging Filter</label>
            <Select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...agingCategories.map(c => ({ value: c, label: c }))
              ]}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
            <Input
              type="text"
              placeholder="Student or admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Total Due</span>
            </div>
            <p className="text-2xl font-bold text-surface-foreground mt-2">{formatKES(totals.totalDue)}</p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <span className="text-green-600 font-bold">✓</span>
              <span className="text-sm font-medium">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">{formatKES(totals.totalPaid)}</p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Outstanding Balance</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{formatKES(totals.totalBalance)}</p>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserGroupIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Overdue Accounts</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {totals.overdueCount}
            </p>
          </div>
        </div>

        <DataGrid
          data={filteredRecords}
          columns={columns}
          loading={loading}
          sortable
          filterable
          pagination={{ pageSize: 50, showSizeChanger: true }}
          emptyState={{
            title: 'No outstanding fees',
            description: 'All student balances are settled — nothing is due.',
          }}
        />
      </Card>
    </div>
  );
};
const FeesDueReportPage: React.FC = () => (
  <div className="space-y-6">
    <FeesDueReportPageContent />
  </div>
);

export default FeesDueReportPage;

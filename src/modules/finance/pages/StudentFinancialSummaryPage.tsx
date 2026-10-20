import { logger } from '@/utils/logging';

// ABOUTME: Student Financial Summary Page - displays all students with their financial position
// ABOUTME: Uses useStudentFinancialSummary hook to aggregate billing, payments, and adjustments

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CurrencyDollarIcon, PrinterIcon, DownloadIcon, ArrowPathIcon } from '@/components/ui/icons';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useStudentFinancialSummary } from '../hooks/useStudentFinancialSummary';
import type { StudentFinancialSummary } from '../hooks/useStudentFinancialSummary';
import { useAppData } from '@/hooks/useAppData';

// Currency formatter for KES
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(value);

export const StudentFinancialSummaryPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { data: summaries, loading, error, refresh } = useStudentFinancialSummary();
  const { classes, classStreams, schoolPeriods, loading: appLoading } = useAppData();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<string>('all');

  // Filtered data based on search and filters
  const filteredData = useMemo(() => {
    let result = summaries;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.admissionNo?.toLowerCase() ?? '').includes(term) ||
          (r.name?.toLowerCase() ?? '').includes(term)
      );
    }

    // Class filter
    if (selectedClassId) {
      result = result.filter((r) => r.className === selectedClassId);
    }

    // Stream filter
    if (selectedStreamId) {
      result = result.filter((r) => r.streamName === selectedStreamId);
    }

    // Balance status filter
    if (balanceFilter !== 'all') {
      result = result.filter((r) => {
        if (balanceFilter === 'arrears') return r.balance > 0;
        if (balanceFilter === 'paid') return r.balance <= 0 && r.overpay === 0;
        if (balanceFilter === 'overpaid') return r.overpay > 0;
        return true;
      });
    }

    return result;
  }, [summaries, searchTerm, selectedClassId, selectedStreamId, balanceFilter]);

  // Unique class names for filter
  const classNames = useMemo(() => {
    const names = new Set<string>();
    summaries.forEach((s) => {
      if (s.className) names.add(s.className);
    });
    return Array.from(names).sort();
  }, [summaries]);

  // Unique stream names for filter
  const streamNames = useMemo(() => {
    const names = new Set<string>();
    summaries.forEach((s) => {
      if (s.streamName) names.add(s.streamName);
    });
    return Array.from(names).sort();
  }, [summaries]);

  // DataGrid columns
  const columns: DataGridColumn<StudentFinancialSummary>[] = useMemo(
    () => [
      {
        key: 'admissionNo',
        header: t('tableHeaders.admissionNo') || 'Adm No',
        width: 120,
        sortable: true,
      },
      {
        key: 'name',
        header: t('tableHeaders.studentName') || 'Name',
        width: 180,
        sortable: true,
        render: (value, row) => (
          <span className="font-medium">{value}</span>
        ),
      },
      {
        key: 'className',
        header: t('tableHeaders.class') || 'Class',
        width: 100,
        sortable: true,
      },
      {
        key: 'streamName',
        header: t('tableHeaders.stream') || 'Stream',
        width: 80,
        sortable: true,
      },
      {
        key: 'feeAmount',
        header: t('tableHeaders.feeAmount') || 'Fee Amount',
        width: 120,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-primary-600">{formatCurrency(value)}</span>
        ),
      },
      {
        key: 'feeExemption',
        header: t('tableHeaders.exemption') || 'Exemption',
        width: 100,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-green-600">{formatCurrency(value)}</span>
        ),
      },
      {
        key: 'feePenalty',
        header: t('tableHeaders.penalty') || 'Penalty',
        width: 100,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-orange-600">{formatCurrency(value)}</span>
        ),
      },
      {
        key: 'amountPaid',
        header: t('tableHeaders.amountPaid') || 'Amount Paid',
        width: 120,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-green-600">{formatCurrency(value)}</span>
        ),
      },
      {
        key: 'balance',
        header: t('tableHeaders.balance') || 'Balance',
        width: 120,
        sortable: true,
        render: (value, row) => (
          <span className={`font-mono ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        key: 'overpay',
        header: t('tableHeaders.overpay') || 'Overpay',
        width: 100,
        sortable: true,
        render: (value) => (
          <span className={`font-mono ${value > 0 ? 'text-purple-600' : 'text-surface-muted-fg'}`}>
            {formatCurrency(value)}
          </span>
        ),
      },
    ],
    [t]
  );

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    if (filteredData.length === 0) return;

    const headers = [
      'Admission No',
      'Name',
      'Class',
      'Stream',
      'Fee Amount',
      'Exemption',
      'Penalty',
      'Amount Paid',
      'Balance',
      'Overpay',
    ];

    const rows = filteredData.map((row) => [
      row.admissionNo,
      row.name,
      row.className || '',
      row.streamName || '',
      row.feeAmount.toFixed(2),
      row.feeExemption.toFixed(2),
      row.feePenalty.toFixed(2),
      row.amountPaid.toFixed(2),
      row.balance.toFixed(2),
      row.overpay.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `student_financial_summary_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle row click to view details
  const handleRowClick = useCallback((row: StudentFinancialSummary) => {
    logger.info('View student financial detail:', row);
    // TODO: Navigate to detailed view or open modal
  }, []);

  if (loading || appLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
        <span className="ml-2">{t('common.loading') || 'Loading...'}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center text-red-600 py-8">
            <p>{t('common.error') || 'Error'}: {error.message}</p>
            <Button onClick={refresh} className="mt-4">
              {t('common.retry') || 'Retry'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('studentFinancialSummary.title') || 'Student Financial Summary'}>
        {/* Filters */}
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder={t('studentFinancialSummary.searchPlaceholder') || 'Search by admission no or name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full"
            >
              <option value="">{t('studentFinancialSummary.allClasses') || 'All Classes'}</option>
              {classNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              value={selectedStreamId}
              onChange={(e) => setSelectedStreamId(e.target.value)}
              className="w-full"
            >
              <option value="">{t('studentFinancialSummary.allStreams') || 'All Streams'}</option>
              {streamNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">{t('studentFinancialSummary.allBalances') || 'All'}</option>
              <option value="arrears">{t('studentFinancialSummary.inArrears') || 'In Arrears'}</option>
              <option value="paid">{t('studentFinancialSummary.fullyPaid') || 'Fully Paid'}</option>
              <option value="overpaid">{t('studentFinancialSummary.overpaid') || 'Overpaid'}</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              {t('common.refresh') || 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-primary-50 p-3 rounded-md">
            <div className="text-sm text-primary-600">{t('studentFinancialSummary.totalStudents') || 'Total Students'}</div>
            <div className="text-xl font-bold text-primary-800">{filteredData.length}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-md">
            <div className="text-sm text-red-600">{t('studentFinancialSummary.inArrears') || 'In Arrears'}</div>
            <div className="text-xl font-bold text-red-800">
              {filteredData.filter((r) => r.balance > 0).length}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <div className="text-sm text-green-600">{t('studentFinancialSummary.fullyPaid') || 'Fully Paid'}</div>
            <div className="text-xl font-bold text-green-800">
              {filteredData.filter((r) => r.balance <= 0 && r.overpay === 0).length}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-md">
            <div className="text-sm text-purple-600">{t('studentFinancialSummary.totalArrears') || 'Total Arrears'}</div>
            <div className="text-xl font-bold text-purple-800">
              {formatCurrency(
                filteredData.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0)
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 mb-4 print-hide">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<PrinterIcon className="w-4 h-4" />}
          >
            {t('common.print') || 'Print'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<DownloadIcon className="w-4 h-4" />}
            disabled={filteredData.length === 0}
          >
            {t('common.exportCSV') || 'Export CSV'}
          </Button>
        </div>

        {/* Data Grid */}
        <DataGrid
          columns={columns}
          data={filteredData}
          keyField="studentId"
          onRowClick={handleRowClick}
          sortable
          filterable
          emptyState={{
            icon: <CurrencyDollarIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: t('studentFinancialSummary.noData') || 'No Data',
            description:
              t('studentFinancialSummary.noDataDescription') ||
              'No student financial data available.',
          }}
        />
      </Card>
    </div>
  );
};
const StudentFinancialSummaryPage: React.FC = () => (
  <div className="space-y-6">
    <StudentFinancialSummaryPageContent />
  </div>
);

export default StudentFinancialSummaryPage;

// ABOUTME: Votehead Statement Page - displays per-invoice votehead breakdown
// ABOUTME: Uses useVoteheadStatement hook to show billed/paid/balance per votehead

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';

import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useVoteheadStatement } from '../hooks/useVoteheadStatement';
import type { VoteheadStatementRow } from '../hooks/useVoteheadStatement';
import { useAppData } from '@/hooks/useAppData';
import { ArrowPathIcon, DocumentTextIcon, DownloadIcon, PrinterIcon } from '@/components/ui/icons';

// Currency formatter for KES
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(value);

export const VoteheadStatementPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { data: statementRows, loading, error, refresh } = useVoteheadStatement();
  const { schoolPeriods, loading: appLoading } = useAppData();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = statementRows;

    // Search filter (by admission number or student name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.admissionNo?.toLowerCase() ?? '').includes(term) ||
          (r.invoiceNumber?.toLowerCase() ?? '').includes(term)
      );
    }

    // Invoice filter
    if (selectedInvoiceId) {
      result = result.filter((r) => r.invoiceId === selectedInvoiceId);
    }

    // Period filter
    if (selectedPeriodId) {
      const period = schoolPeriods?.find((sp) => String(sp.id) === selectedPeriodId);
      if (period) {
        result = result.filter((r) => r.schoolPeriod === period.name);
      }
    }

    return result;
  }, [statementRows, searchTerm, selectedInvoiceId, selectedPeriodId, schoolPeriods]);

  // Unique invoice numbers for filter
  const invoiceNumbers = useMemo(() => {
    const numbers = new Map<string, string>();
    statementRows.forEach((r) => {
      if (r.invoiceId && r.invoiceNumber) {
        numbers.set(r.invoiceId, r.invoiceNumber);
      }
    });
    return Array.from(numbers.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [statementRows]);

  // DataGrid columns
  const columns: DataGridColumn<VoteheadStatementRow>[] = useMemo(
    () => [
      {
        key: 'admissionNo',
        header: t('tableHeaders.admissionNo') || 'Adm No',
        width: 100,
        sortable: true,
      },
      {
        key: 'invoiceNumber',
        header: t('tableHeaders.invoiceNo') || 'Invoice No',
        width: 120,
        sortable: true,
        render: (value, row) => (
          <button
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedInvoiceId(row.invoiceId);
            }}
          >
            {value}
          </button>
        ),
      },
      {
        key: 'schoolPeriod',
        header: t('tableHeaders.schoolPeriod') || 'Period',
        width: 120,
        sortable: true,
      },
      {
        key: 'votehead',
        header: t('tableHeaders.votehead') || 'Votehead',
        width: 180,
        sortable: true,
        render: (value, row) => (
          <span className="font-medium">{value}</span>
        ),
      },
      {
        key: 'amountBilled',
        header: t('tableHeaders.amountBilled') || 'Amount Billed',
        width: 130,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-blue-600">{formatCurrency(value)}</span>
        ),
      },
      {
        key: 'amountPaid',
        header: t('tableHeaders.amountPaid') || 'Amount Paid',
        width: 130,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-green-600">{formatCurrency(value)}</span>
        ),
      },
      {
        key: 'itemBalance',
        header: t('tableHeaders.balance') || 'Balance',
        width: 130,
        sortable: true,
        render: (value, row) => (
          <span className={`font-mono ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
      'Invoice No',
      'Period',
      'Votehead',
      'Amount Billed',
      'Amount Paid',
      'Balance',
    ];

    const rows = filteredData.map((row) => [
      row.admissionNo,
      row.invoiceNumber,
      row.schoolPeriod || '',
      row.votehead,
      row.amountBilled.toFixed(2),
      row.amountPaid.toFixed(2),
      row.itemBalance.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `votehead_statement_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle row click to expand
  const handleRowClick = useCallback((row: VoteheadStatementRow) => {
    setExpandedRowId(expandedRowId === row.invoiceItemId ? null : row.invoiceItemId);
  }, [expandedRowId]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        billed: acc.billed + row.amountBilled,
        paid: acc.paid + row.amountPaid,
        balance: acc.balance + row.itemBalance,
      }),
      { billed: 0, paid: 0, balance: 0 }
    );
  }, [filteredData]);

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
      <Card title={t('voteheadStatement.title') || 'Votehead Statement'}>
        {/* Filters */}
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder={t('voteheadStatement.searchPlaceholder') || 'Search by admission no or invoice no...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full"
            >
              <option value="">{t('voteheadStatement.allInvoices') || 'All Invoices'}</option>
              {invoiceNumbers.map(([id, number]) => (
                <option key={id} value={id}>
                  {number}
                </option>
              ))}
            </Select>
            <Select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full"
            >
              <option value="">{t('voteheadStatement.allPeriods') || 'All Periods'}</option>
              {(schoolPeriods || []).map((sp) => (
                <option key={sp.id} value={String(sp.id)}>
                  {sp.name}
                </option>
              ))}
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
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-sm text-blue-600">{t('voteheadStatement.totalBilled') || 'Total Billed'}</div>
            <div className="text-xl font-bold text-blue-800">{formatCurrency(totals.billed)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <div className="text-sm text-green-600">{t('voteheadStatement.totalPaid') || 'Total Paid'}</div>
            <div className="text-xl font-bold text-green-800">{formatCurrency(totals.paid)}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-md">
            <div className="text-sm text-red-600">{t('voteheadStatement.totalBalance') || 'Total Balance'}</div>
            <div className="text-xl font-bold text-red-800">{formatCurrency(totals.balance)}</div>
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
          onRowClick={handleRowClick}
          sortable
          filterable
          emptyState={{
            icon: <DocumentTextIcon className="w-12 h-12 text-gray-400" />,
            title: t('voteheadStatement.noData') || 'No Data',
            description:
              t('voteheadStatement.noDataDescription') ||
              'No votehead statement data available.',
          }}
        />
      </Card>
    </div>
  );
};
const VoteheadStatementPage: React.FC = () => (
  <div className="space-y-6">
    <VoteheadStatementPageContent />
  </div>
);

export default VoteheadStatementPage;

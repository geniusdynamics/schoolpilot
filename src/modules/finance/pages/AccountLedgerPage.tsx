// ABOUTME: Account Ledger Page - displays general ledger with human-readable particulars
// ABOUTME: Uses useAccountLedger hook to resolve source_table/source_id to readable particulars
// GAP(P1-E03): chart_of_accounts and the ledger (journal_entry, journal_line, account) are spec 02 §10 entities and land with the P3 ledger.

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { BookOpenIcon, PrinterIcon, DownloadIcon, ArrowPathIcon } from '@/components/ui/icons';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useAccountLedger } from '../hooks/useAccountLedger';
import type { AccountLedgerRow } from '../hooks/useAccountLedger';
import { useAppData } from '@/hooks/useAppData';

// Currency formatter for KES
const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(value);
};

// Date formatter
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const AccountLedgerPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const { data: ledgerRows, loading, error, refresh } = useAccountLedger();
  const { chartOfAccounts, loading: appLoading } = useAppData();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filtered data
  const filteredData = useMemo(() => {
    let result = ledgerRows;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.description?.toLowerCase() ?? '').includes(term) ||
          (r.particulars?.toLowerCase() ?? '').includes(term)
      );
    }

    // Account filter
    if (selectedAccountId) {
      result = result.filter((r) => String(r.accountId) === selectedAccountId);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter((r) => new Date(r.effectiveDate) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      result = result.filter((r) => new Date(r.effectiveDate) <= end);
    }

    // Sort by date descending
    result = [...result].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    return result;
  }, [ledgerRows, searchTerm, selectedAccountId, startDate, endDate]);

  // DataGrid columns
  const columns: DataGridColumn<AccountLedgerRow>[] = useMemo(
    () => [
      {
        key: 'effectiveDate',
        header: t('tableHeaders.date') || 'Date',
        width: 100,
        sortable: true,
        render: (value) => formatDate(value as string),
      },
      {
        key: 'description',
        header: t('tableHeaders.description') || 'Description',
        width: 200,
        sortable: true,
        render: (value) => (
          <span className="font-medium">{value}</span>
        ),
      },
      {
        key: 'particulars',
        header: t('tableHeaders.particulars') || 'Particulars',
        width: 280,
        sortable: true,
        render: (value) => (
          <span className="text-surface-muted-fg">{value}</span>
        ),
      },
      {
        key: 'debit',
        header: t('tableHeaders.debit') || 'Debit',
        width: 130,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-primary-600">
            {value !== null ? formatCurrency(value) : '-'}
          </span>
        ),
      },
      {
        key: 'credit',
        header: t('tableHeaders.credit') || 'Credit',
        width: 130,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-green-600">
            {value !== null ? formatCurrency(value) : '-'}
          </span>
        ),
      },
      {
        key: 'accountId',
        header: t('tableHeaders.account') || 'Account',
        width: 100,
        sortable: true,
        render: (value) => {
          const account = chartOfAccounts?.find((a) => String(a.id) === String(value));
          return account?.name || `ACCT-${value}`;
        },
      },
    ],
    [t, chartOfAccounts]
  );

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    if (filteredData.length === 0) return;

    const headers = ['Date', 'Description', 'Particulars', 'Debit', 'Credit', 'Account ID'];

    const rows = filteredData.map((row) => [
      formatDate(row.effectiveDate),
      row.description,
      row.particulars,
      row.debit?.toFixed(2) || '',
      row.credit?.toFixed(2) || '',
      String(row.accountId),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `account_ledger_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Calculate totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, row) => ({
        debit: acc.debit + (row.debit || 0),
        credit: acc.credit + (row.credit || 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [filteredData]);

  if ((loading || (appLoading as any)?.all) && ledgerRows.length === 0 && !error) {
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
      <Card title={t('accountLedger.title') || 'Account Ledger'}>
        {/* Filters */}
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder={t('accountLedger.searchPlaceholder') || 'Search by description or particulars...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full"
            >
              <option value="">{t('accountLedger.allAccounts') || 'All Accounts'}</option>
              {(chartOfAccounts || []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                placeholder={t('accountLedger.startDate') || 'Start Date'}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
                placeholder={t('accountLedger.endDate') || 'End Date'}
              />
            </div>
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
          <div className="bg-primary-50 p-3 rounded-md">
            <div className="text-sm text-primary-600">{t('accountLedger.totalDebit') || 'Total Debit'}</div>
            <div className="text-xl font-bold text-primary-800">{formatCurrency(totals.debit)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <div className="text-sm text-green-600">{t('accountLedger.totalCredit') || 'Total Credit'}</div>
            <div className="text-xl font-bold text-green-800">{formatCurrency(totals.credit)}</div>
          </div>
          <div className="bg-surface-muted p-3 rounded-md">
            <div className="text-sm text-surface-muted-fg">{t('accountLedger.netBalance') || 'Net Balance'}</div>
            <div className={`text-xl font-bold ${totals.debit - totals.credit >= 0 ? 'text-primary-800' : 'text-green-800'}`}>
              {formatCurrency(totals.debit - totals.credit)}
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
          keyField="transactionId"
          sortable
          filterable
          emptyState={{
            icon: <BookOpenIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: t('accountLedger.noData') || 'No Data',
            description:
              t('accountLedger.noDataDescription') ||
              'No ledger entries found.',
          }}
        />
      </Card>
    </div>
  );
};
const AccountLedgerPage: React.FC = () => (
  <div className="space-y-6">
    <AccountLedgerPageContent />
  </div>
);

export default AccountLedgerPage;

// ABOUTME: Portal fees page showing fee summary, invoices, and payment history
// ABOUTME: Displays total fees, paid amount, balance, progress bar, and alert for overdue balances

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Spinner from '@/components/ui/Spinner';
import { usePortalData } from '../data/usePortalData';
import { PortalAccessNotice, shouldShowAccessNotice } from '../components/PortalAccessNotice';
import type { PortalFeeSummary } from '../data/types';
import { formatMoney } from '@/domain/money';
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';

interface InvoiceRow {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
}

interface PaymentRow {
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
}

const statusBadgeClass: Record<string, string> = {
  'Paid': 'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700',
  'Partially Paid': 'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700',
  'Due': 'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700',
  'Overdue': 'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700',
  'Voided': 'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-surface-accent text-surface-muted-fg',
};

export const PortalFeesContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const {
    feeSummaries,
    loading,
    accessStatus,
    loadFeeSummaries,
  } = usePortalData();

  useEffect(() => {
    loadFeeSummaries();
  }, [loadFeeSummaries]);

  const feeSummary: PortalFeeSummary | null = feeSummaries.length > 0 ? feeSummaries[0] : null;

  const paymentProgress = useMemo(() => {
    if (!feeSummary || feeSummary.totalFees === 0) return 0;
    return Math.round((feeSummary.totalPaid / feeSummary.totalFees) * 100);
  }, [feeSummary]);

  const isOverdue = useMemo(() => {
    if (!feeSummary || feeSummary.currentBalance <= 0) return false;
    if (feeSummary.dueDate) {
      return new Date(feeSummary.dueDate) < new Date();
    }
    return false;
  }, [feeSummary]);

  const invoiceRows: InvoiceRow[] = useMemo(() => {
    if (!feeSummary) return [];
    // Keep amounts numeric so DataGrid sorting is numeric, not lexicographic
    return feeSummary.invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount,
      amountPaid: inv.amountPaid,
      balance: inv.balance,
      status: inv.status,
    }));
  }, [feeSummary]);

  const paymentRows: PaymentRow[] = useMemo(() => {
    if (!feeSummary) return [];
    return feeSummary.payments.map(pay => ({
      receiptNo: pay.receiptNo,
      paymentDate: pay.paymentDate,
      amount: pay.amount,
      paymentMethod: pay.paymentMethod,
    }));
  }, [feeSummary]);

  const invoiceColumns: DataGridColumn<InvoiceRow>[] = [
    {
      key: 'invoiceNumber',
      header: t('fees.invoiceNumber'),
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-mono text-sm font-medium text-surface-foreground">{value}</span>,
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value: string) => (
        <span className="text-sm text-surface-muted-fg">
          {new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: t('fees.dueDate'),
      sortable: true,
      filterable: true,
      width: 120,
      render: (value: string, row) => {
        const isPastDue = new Date(value) < new Date() && row.status !== 'Paid';
        return (
          <span className={`text-sm ${isPastDue ? 'text-rose-600 font-medium' : 'text-surface-muted-fg'}`}>
            {new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      header: t('fees.totalFees'),
      sortable: true,
      filterable: true,
      width: 140,
      align: 'right',
      render: (value: number) => <span className="font-mono text-sm text-surface-foreground">{formatMoney(value, 'KES')}</span>,
    },
    {
      key: 'amountPaid',
      header: t('fees.totalPaid'),
      sortable: true,
      filterable: true,
      width: 140,
      align: 'right',
      render: (value: number) => <span className="font-mono text-sm text-emerald-600">{formatMoney(value, 'KES')}</span>,
    },
    {
      key: 'balance',
      header: t('fees.balance'),
      sortable: true,
      filterable: true,
      width: 140,
      align: 'right',
      render: (value: number, row) => (
        <span className={`font-mono text-sm ${row.status === 'Paid' ? 'text-surface-muted-fg' : 'text-rose-600 font-medium'}`}>
          {formatMoney(value, 'KES')}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('fees.status'),
      sortable: true,
      filterable: true,
      width: 140,
      render: (value: string) => (
        <span className={statusBadgeClass[value] || statusBadgeClass['Due']}>
          {value}
        </span>
      ),
    },
  ];

  const paymentColumns: DataGridColumn<PaymentRow>[] = [
    {
      key: 'receiptNo',
      header: t('fees.receiptNumber'),
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-mono text-sm font-medium text-surface-foreground">{value}</span>,
    },
    {
      key: 'paymentDate',
      header: t('fees.paymentDate'),
      sortable: true,
      filterable: true,
      width: 140,
      render: (value: string) => (
        <span className="text-sm text-surface-muted-fg">
          {new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('fees.amount'),
      sortable: true,
      filterable: true,
      width: 140,
      align: 'right',
      render: (value: number) => <span className="font-mono text-sm font-semibold text-emerald-600">{formatMoney(value, 'KES')}</span>,
    },
    {
      key: 'paymentMethod',
      header: t('fees.paymentMethod'),
      sortable: true,
      filterable: true,
      width: 150,
      render: (value: string) => <span className="text-sm text-surface-foreground">{value}</span>,
    },
  ];

  if (loading && feeSummaries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
        <span className="ml-3 text-surface-muted-fg">{t('common.loading')}</span>
      </div>
    );
  }

  if (!feeSummary) {
    // Auth-gated: without a linked student there is nothing to show but a notice.
    if (shouldShowAccessNotice(accessStatus)) {
      return <PortalAccessNotice status={accessStatus} />;
    }
    return (
      <Card className="border-slate-200 bg-surface-card shadow-sm">
        <div className="text-center py-12">
          <CurrencyDollarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-surface-foreground">{t('common.noData')}</h3>
          <p className="text-sm text-surface-muted-fg mt-2">No fee statements are available at this time.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-surface-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 p-2.5">
              <CurrencyDollarIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-surface-muted-fg">{t('fees.totalFees')}</p>
              <p className="text-xl font-semibold text-surface-foreground">KES {feeSummary.totalFees.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-600">{t('fees.totalPaid')}</p>
              <p className="text-xl font-semibold text-emerald-700">KES {feeSummary.totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className={`shadow-sm ${feeSummary.currentBalance > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${feeSummary.currentBalance > 0 ? 'bg-rose-100' : 'bg-emerald-100'}`}>
              {feeSummary.currentBalance > 0 ? (
                <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <p className={`text-sm ${feeSummary.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {t('fees.balance')}
              </p>
              <p className={`text-xl font-semibold ${feeSummary.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                KES {feeSummary.currentBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment Progress Bar */}
      <Card className="border-slate-200 bg-surface-card shadow-sm">
        <div className="flex items-center gap-4">
          <CurrencyDollarIcon className="w-5 h-5 text-surface-muted-fg" />
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-surface-muted-fg">Payment Progress</span>
              <span className="font-medium text-surface-foreground">{paymentProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  paymentProgress >= 100 ? 'bg-emerald-500' :
                  paymentProgress >= 50 ? 'bg-primary-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-surface-muted-fg mt-1">
              KES {feeSummary.totalPaid.toLocaleString()} of KES {feeSummary.totalFees.toLocaleString()} paid
            </p>
          </div>
        </div>
      </Card>

      {/* Overdue Alert */}
      {isOverdue && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4" role="alert">
          <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-rose-800">Overdue Balance</h4>
            <p className="text-sm text-rose-700 mt-1">
              You have an outstanding balance of <strong>KES {feeSummary.currentBalance.toLocaleString()}</strong>
              {feeSummary.dueDate && ` which was due on ${new Date(feeSummary.dueDate).toLocaleDateString('en-GB')}`}.
              Please make payment as soon as possible to avoid penalties.
            </p>
          </div>
        </div>
      )}

      {/* Due Date Info */}
      {feeSummary.dueDate && feeSummary.currentBalance > 0 && !isOverdue && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4" role="alert">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Payment Due</h4>
            <p className="text-sm text-amber-700 mt-1">
              The remaining balance of <strong>KES {feeSummary.currentBalance.toLocaleString()}</strong> is due by{' '}
              {new Date(feeSummary.dueDate).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.
            </p>
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoiceRows.length > 0 && (
        <Card title={t('fees.invoices')} className="border-slate-200 bg-surface-card shadow-sm">
          <DataGrid
            columns={invoiceColumns}
            data={invoiceRows}
            keyField="invoiceNumber"
            sortable
            filterable
            emptyState={{
              icon: <CurrencyDollarIcon className="w-12 h-12 text-gray-300" />,
              title: t('common.noData'),
              description: 'No invoices found.',
            }}
          />
        </Card>
      )}

      {/* Payment History */}
      {paymentRows.length > 0 && (
        <Card title={t('fees.payments')} className="border-slate-200 bg-surface-card shadow-sm">
          <DataGrid
            columns={paymentColumns}
            data={paymentRows}
            keyField="receiptNo"
            sortable
            filterable
            emptyState={{
              icon: <CurrencyDollarIcon className="w-12 h-12 text-gray-300" />,
              title: t('common.noData'),
              description: 'No payments recorded yet.',
            }}
          />
        </Card>
      )}
    </div>
  );
};

const PortalFeesPage: React.FC = () => {
  return <PortalFeesContent />;
};

export default PortalFeesPage;

// ABOUTME: Finance dashboard: collections, outstanding fees and credit notes from canonical documents.
// ABOUTME: There are no sample transactions; the recent list is the real payment rows of the repository.

import React, { useMemo } from 'react';

import BarChart from '@/components/ui/BarChart';
import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import ModuleDashboardShell, {
  type DashboardAlertBanner,
  type DashboardMetric,
  type DashboardNotification,
  type DashboardPanel,
  type DashboardQuickAction,
} from '@/components/ModuleDashboardShell';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknotesIcon,
  ClockIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
  ReceiptRefundIcon,
  TicketIcon,
} from '@/components/ui/icons';
import type { BarChartData, ChartData } from '@/types';

import { formatMoneyMinor, useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

export const FinanceDashboardPageContent: React.FC = () => {
  const finance = useCanonicalFinance();

  const summary = useMemo(() => {
    const collected = finance.paymentRows
      .filter((row) => row.status === 'posted' || row.status === 'cleared')
      .reduce((total, row) => total + row.amount.amount_minor, 0);
    const refunded = finance.refunds
      .filter((row) => row.status === 'paid')
      .reduce((total, row) => total + row.amount.amount_minor, 0);
    const outstandingInvoices = finance.invoiceRows.filter(
      (row) => row.status !== 'void' && row.status !== 'draft' && row.balance.amount_minor > 0
    );
    const outstanding = outstandingInvoices.reduce(
      (total, row) => total + row.balance.amount_minor,
      0
    );
    const billed = finance.invoiceRows
      .filter((row) => row.status !== 'void' && row.status !== 'draft')
      .reduce((total, row) => total + row.total.amount_minor, 0);
    const credits = finance.creditNotes
      .filter((row) => row.status === 'posted')
      .reduce((total, row) => total + row.amount.amount_minor, 0);
    const overdue = outstandingInvoices.filter(
      (row) => row.dueDate !== null && row.dueDate < new Date().toISOString().slice(0, 10)
    ).length;
    return {
      collected,
      refunded,
      net: collected - refunded,
      outstanding,
      outstandingCount: outstandingInvoices.length,
      overdue,
      billed,
      credits,
      rate: billed > 0 ? Math.round(((billed - outstanding) / billed) * 100) : 0,
    };
  }, [finance.paymentRows, finance.refunds, finance.invoiceRows, finance.creditNotes]);

  const monthly = useMemo<BarChartData[]>(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        name: date.toLocaleDateString(undefined, { month: 'short' }),
        value: 0,
      };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));
    for (const payment of finance.paymentRows) {
      if (payment.status !== 'posted' && payment.status !== 'cleared') continue;
      const month = byMonth.get(payment.receivedAt.slice(0, 7));
      if (month) month.value += payment.amount.amount_minor;
    }
    return months.map((month) => ({ name: month.name, uv: month.value }));
  }, [finance.paymentRows]);

  const statusData = useMemo<ChartData[]>(() => {
    const count = (status: string) =>
      finance.invoiceRows.filter((invoice) => invoice.status === status).length;
    return [
      { name: 'Paid', value: count('paid') },
      { name: 'Partially paid', value: count('partially_paid') },
      { name: 'Posted', value: count('posted') },
      { name: 'Void', value: count('void') },
    ].filter((entry) => entry.value > 0);
  }, [finance.invoiceRows]);

  const metrics: DashboardMetric[] = [
    {
      key: 'collected',
      label: 'Collected',
      value: formatMoneyMinor(summary.collected),
      icon: <ArrowUpIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: `${finance.paymentRows.length} payments`,
      to: '/finance/payments',
      colorScheme: 'emerald',
      description: 'Posted student payments',
    },
    {
      key: 'refunded',
      label: 'Refunded',
      value: formatMoneyMinor(summary.refunded),
      icon: <ArrowDownIcon className="h-6 w-6" />,
      trend: 'down',
      trendValue: `${finance.refunds.length} refunds`,
      to: '/finance/payments',
      colorScheme: 'rose',
      description: 'Paid refunds against payments',
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      value: formatMoneyMinor(summary.outstanding),
      icon: <ExclamationCircleIcon className="h-6 w-6" />,
      trend: summary.overdue > 0 ? 'up' : 'down',
      trendValue: `${summary.outstandingCount} invoices`,
      to: '/finance/fees-due-report',
      colorScheme: summary.overdue > 0 ? 'amber' : 'blue',
      description: `${summary.overdue} past their due date`,
    },
    {
      key: 'rate',
      label: 'Collection rate',
      value: `${summary.rate}%`,
      icon: <BanknotesIcon className="h-6 w-6" />,
      trend: summary.rate >= 70 ? 'up' : 'down',
      trendValue: `${summary.credits > 0 ? 'credit notes applied' : 'no credit notes'}`,
      to: '/finance/fee-collection-summary',
      colorScheme: 'cyan',
      description: 'Billed against outstanding',
    },
  ];

  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'overdue',
      count: summary.overdue,
      label: 'Overdue invoices',
      description: 'Past their due date',
      to: '/finance/fees-due-report',
    },
    {
      type: 'fees',
      count: summary.outstandingCount,
      label: 'Unsettled invoices',
      description: 'Still carrying a balance',
      to: '/finance/fees-due-report',
    },
    {
      type: 'approval',
      count: finance.scheduleRows.length,
      label: 'Fee schedules',
      description: 'Billing structures on file',
      to: '/finance/fee-configuration',
    },
    {
      type: 'task',
      count: finance.creditNotes.filter((note) => note.status === 'draft').length,
      label: 'Draft credit notes',
      description: 'Waiting to be posted',
      to: '/finance/fee-rules?tab=adjustments',
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      key: 'record-payment',
      label: 'Record Payment',
      description: 'Post a payment and issue its receipt',
      to: '/finance/payments',
      icon: <ReceiptRefundIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'general-receipts',
      label: 'General Receipts',
      description: 'Non-student income entries',
      to: '/finance/payments?tab=general-receipts',
      icon: <CreditCardIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'generate-invoices',
      label: 'Generate invoices',
      description: 'Run the period billing',
      to: '/finance/invoicing',
      icon: <DocumentDuplicateIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'fee-schedules',
      label: 'Fee schedules',
      description: 'Edit the billing structure',
      to: '/finance/fee-configuration',
      icon: <TicketIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'adjustments',
      label: 'Credit notes',
      description: 'Scholarships, discounts, exemptions',
      to: '/finance/fee-rules?tab=adjustments',
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
  ];

  const charts: DashboardPanel[] = [
    {
      key: 'collections',
      title: 'Collections (last 6 months)',
      content: <BarChart data={monthly} xAxisKey="name" barDataKey="uv" />,
    },
    ...(statusData.length > 0
      ? [
          {
            key: 'invoice-status',
            title: 'Invoice status',
            content: <DonutChart data={statusData} title="" />,
          },
        ]
      : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'outstanding-invoices',
      title: 'Collections status',
      message:
        summary.outstandingCount > 0
          ? `${summary.outstandingCount} invoices still carry a balance; ${summary.overdue} are past their due date.`
          : 'Every posted invoice is settled.',
      severity: summary.overdue > 0 ? 'warning' : 'normal',
    },
    {
      id: 'credit-notes',
      title: 'Credit notes',
      message:
        summary.credits > 0
          ? `${formatMoneyMinor(summary.credits)} of posted credit notes reduce the billed total.`
          : 'No credit notes have been posted.',
      severity: 'normal',
    },
  ];

  const recent = finance.paymentRows.slice(0, 5);

  return (
    <ModuleDashboardShell
      title="Finance dashboard"
      subtitle="Billing, collections and outstanding fees, read from the canonical finance documents."
      heroIcon={<CurrencyDollarIcon className="h-8 w-8 text-white" />}
      accentColor="violet"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards
      charts={charts}
      notifications={notifications}
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Fee structure">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-surface-border py-2">
              <span className="text-sm text-surface-muted-fg">Fee schedules</span>
              <span className="font-semibold">{finance.scheduleRows.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-surface-border py-2">
              <span className="text-sm text-surface-muted-fg">Posted invoices</span>
              <span className="font-semibold">
                {finance.invoiceRows.filter((row) => row.status !== 'draft').length}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-surface-border py-2">
              <span className="text-sm text-surface-muted-fg">Paid invoices</span>
              <span className="font-semibold text-emerald-600">
                {finance.invoiceRows.filter((row) => row.status === 'paid').length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-muted-fg">Collection rate</span>
              <span className="font-semibold text-violet-600">{summary.rate}%</span>
            </div>
          </div>
        </Card>

        <Card title="Recent payments">
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-surface-muted-fg">No payment has been recorded yet.</p>
            ) : (
              recent.map((payment) => (
                <div key={payment.id} className="flex items-start gap-3 py-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <ArrowUpIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-foreground">
                      {payment.learnerName || 'Unassigned payment'}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-surface-muted-fg">
                      <ClockIcon className="h-3 w-3" />
                      {payment.receivedAt.slice(0, 10)} · {payment.receiptNumber || payment.channel}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    +{formatMoneyMinor(payment.amount.amount_minor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Quick overview">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{finance.paymentRows.length}</p>
                <p className="text-xs text-emerald-600">Payments</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-3 text-center">
                <p className="text-lg font-bold text-violet-700">{finance.creditNotes.length}</p>
                <p className="text-xs text-violet-600">Credit notes</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Billed</span>
                <span className="font-bold text-amber-700">
                  {formatMoneyMinor(summary.billed)}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-primary-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary-700">Learners with a balance</span>
                <span className="font-bold text-primary-700">
                  {new Set(
                    finance.invoiceRows
                      .filter((row) => row.balance.amount_minor > 0)
                      .map((row) => row.learnerId)
                  ).size}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};

const FinanceDashboardPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <FinanceDashboardPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FinanceDashboardPage;

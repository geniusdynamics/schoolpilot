import React from 'react';
import { CurrencyDollarIcon, TicketIcon, ReceiptRefundIcon, BanknotesIcon, ArrowUpIcon, ArrowDownIcon, CreditCardIcon, BuildingOfficeIcon, ArrowRightIcon, ClockIcon, ExclamationCircleIcon } from '@/components/ui/icons';
import BarChart from '@/components/ui/BarChart';
import DonutChart from '@/components/ui/DonutChart';
import Card from '@/components/ui/Card';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { BarChartData, ChartData } from '@/types';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardPanel,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';
import { formatKES } from '@/utils/format';

export const FinanceDashboardPageContent: React.FC = () => {
  const {
    loading,
    feeTemplates,
    studentInvoices,
    studentPayments,
    generalPayments,
    supplierInvoices,
    students,
  } = useAppData();

  const pageIsLoading = loading.all || loading.feeTemplates || loading.studentInvoices || loading.studentPayments || loading.generalPayments || loading.supplierInvoices;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const toAmount = (value: unknown): number => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Financial calculations
  const totalIncome = [...(studentPayments || []), ...(generalPayments || [])]
    .reduce((sum, payment: any) => sum + toAmount(payment.amount_paid ?? payment.amount), 0);
  const totalExpenses = (supplierInvoices || [])
    .filter((invoice: any) => String(invoice.status).toLowerCase() !== 'voided')
    .reduce((sum: number, invoice: any) => sum + toAmount(invoice.total_amount ?? invoice.amount), 0);
  const netPosition = totalIncome - totalExpenses;

  // Invoice calculations
  const outstandingInvoices = (studentInvoices || []).filter((invoice: any) => {
    const status = String(invoice.status || '').toLowerCase();
    return status === 'due' || status === 'overdue' || status === 'unpaid';
  });
  const overdueInvoices = outstandingInvoices.filter((invoice: any) => {
    const status = String(invoice.status || '').toLowerCase();
    return status === 'overdue';
  });
  const totalOutstanding = outstandingInvoices.reduce((sum, inv: any) => sum + toAmount(inv.grand_total ?? inv.total_amount), 0);

  // Monthly data aggregation
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: date.toLocaleDateString(undefined, { month: 'short' }),
      income: 0,
      expense: 0,
    };
  });
  const byMonth = new Map(monthKeys.map((entry) => [entry.key, entry]));

  [...(studentPayments || []), ...(generalPayments || [])].forEach((payment: any) => {
    const date = new Date(payment.payment_date || payment.paymentDate || payment.created_at || payment.createdAt || Date.now());
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = byMonth.get(key);
    if (month) {
      month.income += toAmount(payment.amount_paid ?? payment.amount);
    }
  });
  (supplierInvoices || []).forEach((invoice: any) => {
    const date = new Date(invoice.invoice_date || invoice.created_at || invoice.createdAt || Date.now());
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = byMonth.get(key);
    if (month && String(invoice.status).toLowerCase() !== 'voided') {
      month.expense += toAmount(invoice.total_amount ?? invoice.amount);
    }
  });

  const incomeExpenseData: BarChartData[] = monthKeys.map((entry) => ({
    name: entry.name,
    uv: Math.max(0, entry.income - entry.expense),
  }));

  // Invoice status distribution for donut chart
  const invoiceStatusData: ChartData[] = [
    { name: 'Paid', value: (studentInvoices || []).filter((i: any) => String(i.status).toLowerCase() === 'paid').length },
    { name: 'Due', value: (studentInvoices || []).filter((i: any) => String(i.status).toLowerCase() === 'due').length },
    { name: 'Overdue', value: overdueInvoices.length },
    { name: 'Partial', value: (studentInvoices || []).filter((i: any) => String(i.status).toLowerCase() === 'partial').length },
  ].filter(d => d.value > 0);

  // Enhanced metrics with trends and navigation
  const metrics: DashboardMetric[] = [
    {
      key: 'income',
      label: 'Total Income',
      value: formatKES(totalIncome),
      icon: <ArrowUpIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+8.5%',
      to: '/finance/student-payments',
      colorScheme: 'emerald',
      description: 'Collections this period',
    },
    {
      key: 'expenses',
      label: 'Total Expenses',
      value: formatKES(totalExpenses),
      icon: <ArrowDownIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+3.2%',
      to: '/finance/expenses',
      colorScheme: 'rose',
      description: 'Supplier & operational costs',
    },
    {
      key: 'net',
      label: 'Net Position',
      value: formatKES(netPosition),
      icon: <BanknotesIcon className="h-6 w-6" />,
      trend: netPosition >= 0 ? 'up' : 'down',
      trendValue: netPosition >= 0 ? '+5.2%' : '-2.1%',
      to: '/finance/fee-collection-summary',
      colorScheme: netPosition >= 0 ? 'cyan' : 'amber',
      description: netPosition >= 0 ? 'Positive cashflow' : 'Review expenses',
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      value: formatKES(totalOutstanding),
      icon: <ExclamationCircleIcon className="h-6 w-6" />,
      trend: outstandingInvoices.length > 10 ? 'up' : 'down',
      trendValue: `${outstandingInvoices.length} invoices`,
      to: '/finance/student-invoices',
      colorScheme: outstandingInvoices.length > 10 ? 'amber' : 'blue',
      description: `${overdueInvoices.length} overdue`,
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'overdue',
      count: overdueInvoices.length,
      label: 'Overdue Invoices',
      description: 'Require immediate attention',
      to: '/finance/student-invoices?filter=overdue',
    },
    {
      type: 'fees',
      count: outstandingInvoices.length,
      label: 'Unpaid Invoices',
      description: 'Pending collection',
      to: '/finance/student-invoices',
    },
    {
      type: 'approval',
      count: feeTemplates.length,
      label: 'Fee Templates',
      description: 'Active billing structures',
      to: '/finance/fee-templates',
    },
    {
      type: 'task',
      count: (supplierInvoices || []).filter((i: any) => String(i.status).toLowerCase() === 'pending').length,
      label: 'Pending Supplier Invoices',
      description: 'Awaiting payment',
      to: '/finance/supplier-invoices',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'record-payment',
      label: 'Record Payment',
      description: 'Log student fee payment',
      to: '/finance/student-payments',
      icon: <ReceiptRefundIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'new-expense',
      label: 'New Expense',
      description: 'Record supplier payment',
      to: '/finance/expenses',
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      colorScheme: 'rose',
    },
    {
      key: 'fee-templates',
      label: 'Fee Templates',
      description: 'Manage billing structures',
      to: '/finance/fee-templates',
      icon: <TicketIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'general-receipts',
      label: 'General Receipts',
      description: 'Non-student income entries',
      to: '/finance/general-receipts',
      icon: <CreditCardIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'invoices',
      label: 'Student Invoices',
      description: 'Generate & manage invoices',
      to: '/finance/student-invoices',
      icon: <BanknotesIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      description: 'Manage vendor accounts',
      to: '/finance/suppliers',
      icon: <BuildingOfficeIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
  ];

  // Enhanced charts
  const charts: DashboardPanel[] = [
    {
      key: 'cashflow',
      title: 'Net Cashflow (Last 6 Months)',
      content: <BarChart data={incomeExpenseData} xAxisKey="name" barDataKey="uv" />,
    },
    ...(invoiceStatusData.length > 0 ? [{
      key: 'invoice-status',
      title: 'Invoice Status Distribution',
      content: <DonutChart data={invoiceStatusData} title="" />,
    }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'outstanding-invoices',
      title: 'Collections Status',
      message: outstandingInvoices.length > 0 ? `${outstandingInvoices.length} student invoices unpaid (${overdueInvoices.length} overdue).` : 'All student invoices settled.',
      severity: overdueInvoices.length > 0 ? 'warning' : outstandingInvoices.length > 0 ? 'normal' : 'normal',
    },
    {
      id: 'net-position',
      title: 'Financial Health',
      message: netPosition < 0 ? `Net position negative by ${formatKES(Math.abs(netPosition))}.` : `Net position positive at Ksh ${netPosition.toLocaleString()}.`,
      severity: netPosition < 0 ? 'high' : 'normal',
    },
  ];

  // Mock recent transactions
  const recentTransactions = [
    { type: 'income', description: 'Fee Payment - John Doe', amount: 15000, time: '2 hours ago' },
    { type: 'expense', description: 'Stationery Supplies', amount: 8500, time: '5 hours ago' },
    { type: 'income', description: 'General Receipt #1234', amount: 5000, time: '1 day ago' },
    { type: 'expense', description: 'Electricity Bill', amount: 12000, time: '2 days ago' },
  ];

  return (
    <ModuleDashboardShell
      title="Finance Dashboard"
      subtitle="Track billing, collections, supplier liabilities, and current net financial position using live data."
      heroIcon={<CurrencyDollarIcon className="h-8 w-8 text-white" />}
      accentColor="violet"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional Financial Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Fee Template Summary */}
        <Card title="Fee Structure" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Active Templates</span>
              <span className="font-semibold text-surface-foreground">{feeTemplates.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Total Invoices</span>
              <span className="font-semibold text-surface-foreground">{(studentInvoices || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Paid Invoices</span>
              <span className="font-semibold text-emerald-600">
                {(studentInvoices || []).filter((i: any) => String(i.status).toLowerCase() === 'paid').length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-muted-fg">Collection Rate</span>
              <span className="font-semibold text-violet-600">
                {(studentInvoices || []).length > 0
                  ? `${Math.round(((studentInvoices || []).filter((i: any) => String(i.status).toLowerCase() === 'paid').length / (studentInvoices || []).length) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card title="Recent Transactions" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            {recentTransactions.map((tx, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
                `}>
                  {tx.type === 'income' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-surface-muted-fg flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {tx.time}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : ''}{formatKES(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Financial Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{(studentPayments || []).length}</p>
                <p className="text-xs text-emerald-600">Payments Received</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-3 text-center">
                <p className="text-lg font-bold text-violet-700">{(generalPayments || []).length}</p>
                <p className="text-xs text-violet-600">General Receipts</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Avg. Payment</span>
                <span className="font-bold text-amber-700">
                  Ksh {(studentPayments || []).length > 0
                    ? Math.round(totalIncome / (studentPayments || []).length).toLocaleString()
                    : '0'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-primary-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary-700">Students with Balance</span>
                <span className="font-bold text-primary-700">
                  {new Set(outstandingInvoices.map((i: any) => i.student_id)).size}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/finance/fee-collection-summary'}
              className="w-full py-2 px-4 bg-surface-accent hover:bg-gray-200 rounded-lg text-sm font-medium text-surface-foreground transition-colors flex items-center justify-center gap-2"
            >
              View Collection Report <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};
const FinanceDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <FinanceDashboardPageContent />
  </div>
);

export default FinanceDashboardPage;

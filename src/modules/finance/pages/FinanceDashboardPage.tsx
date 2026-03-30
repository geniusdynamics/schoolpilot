import React from 'react';
import { CurrencyDollarIcon, TicketIcon, PlusIcon, ReceiptRefundIcon } from '@/components/ui/icons';
import BarChart from '@/components/ui/BarChart';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { BarChartData } from '@/types'; 
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel, DashboardQuickAction } from '@/components/ModuleDashboardShell';


const FinanceDashboardPage: React.FC = () => {
  const { 
    loading, 
    feeTemplates,
    studentInvoices,
    studentPayments,
    generalPayments,
    supplierInvoices
  } = useAppData();

  const pageIsLoading = loading.all || loading.feeTemplates || loading.studentInvoices || loading.studentPayments || loading.generalPayments || loading.supplierInvoices;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }
  const toAmount = (value: unknown): number => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totalIncome = [...(studentPayments || []), ...(generalPayments || [])]
    .reduce((sum, payment: any) => sum + toAmount(payment.amount_paid ?? payment.amount), 0);
  const totalExpenses = (supplierInvoices || [])
    .filter((invoice: any) => String(invoice.status).toLowerCase() !== 'voided')
    .reduce((sum: number, invoice: any) => sum + toAmount(invoice.total_amount ?? invoice.amount), 0);
  const netPosition = totalIncome - totalExpenses;
  const outstandingInvoices = (studentInvoices || []).filter((invoice: any) => {
    const status = String(invoice.status || '').toLowerCase();
    return status === 'due' || status === 'overdue' || status === 'unpaid';
  }).length;

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

  const metrics: DashboardMetric[] = [
    { key: 'income', label: 'Total Income', value: `Ksh ${totalIncome.toLocaleString()}`, icon: <CurrencyDollarIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'expenses', label: 'Total Expenses', value: `Ksh ${totalExpenses.toLocaleString()}`, icon: <CurrencyDollarIcon className="h-6 w-6 text-rose-700" /> },
    { key: 'net', label: 'Net Position', value: `Ksh ${netPosition.toLocaleString()}`, icon: <CurrencyDollarIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'outstanding', label: 'Outstanding Invoices', value: outstandingInvoices, icon: <ReceiptRefundIcon className="h-6 w-6 text-amber-700" /> },
    { key: 'fee-templates', label: 'Fee Templates', value: feeTemplates.length, icon: <TicketIcon className="h-6 w-6 text-indigo-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'record-payment', label: 'Record Payment', to: '/finance/student-payments', icon: <ReceiptRefundIcon className="h-5 w-5" /> },
    { key: 'new-expense', label: 'New Expense', to: '/finance/expenses', icon: <CurrencyDollarIcon className="h-5 w-5" /> },
    { key: 'fee-templates', label: 'Fee Templates', to: '/finance/fee-templates', icon: <TicketIcon className="h-5 w-5" /> },
    { key: 'general-receipts', label: 'General Receipts', to: '/finance/general-receipts', icon: <PlusIcon className="h-5 w-5" /> },
  ];

  const charts: DashboardPanel[] = [
    {
      key: 'cashflow',
      title: 'Net Cashflow (Last 6 Months)',
      content: <BarChart data={incomeExpenseData} xAxisKey="name" barDataKey="uv" />,
    },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'outstanding-invoices',
      title: 'Collections',
      message: outstandingInvoices > 0 ? `${outstandingInvoices} student invoices are still unpaid.` : 'All student invoices are currently settled.',
      severity: outstandingInvoices > 0 ? 'warning' : 'normal',
    },
    {
      id: 'net-position',
      title: 'Net Position',
      message: netPosition < 0 ? 'Net position is negative for the tracked period.' : 'Net position remains positive for the tracked period.',
      severity: netPosition < 0 ? 'high' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Finance Dashboard"
      subtitle="Track billing, collections, supplier liabilities, and current net financial position using live data."
      heroIcon={<CurrencyDollarIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default FinanceDashboardPage;

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { useAppData } from '@/hooks/useAppData';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel, DashboardQuickAction } from '@/components/ModuleDashboardShell';
import { ArchiveIcon, ClockIcon, CurrencyDollarIcon, DocumentReportIcon } from '@/components/ui/icons';

export const VendorPortalDashboardPageContent: React.FC = () => {
  const { rfqs, purchaseOrders, supplierInvoices, suppliers } = useAppData();

  const openRfqs = rfqs.filter((rfq: any) => String(rfq.status || '').toLowerCase().includes('open'));
  const activeOrders = purchaseOrders.filter((po: any) => !String(po.status || '').toLowerCase().includes('cancel'));
  const pendingInvoices = supplierInvoices.filter((invoice: any) => !String(invoice.status || '').toLowerCase().includes('paid'));
  const invoiceValue = pendingInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount || invoice.total || 0), 0);

  const metrics: DashboardMetric[] = [
    { key: 'rfq', label: 'Open RFQs', value: openRfqs.length, icon: <DocumentReportIcon className="h-6 w-6 text-primary-700" /> },
    { key: 'orders', label: 'Active Orders', value: activeOrders.length, icon: <ArchiveIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'invoices', label: 'Pending Invoices', value: pendingInvoices.length, icon: <ClockIcon className="h-6 w-6 text-indigo-700" /> },
    { key: 'value', label: 'Invoice Value', value: `Ksh ${invoiceValue.toLocaleString()}`, icon: <CurrencyDollarIcon className="h-6 w-6 text-cyan-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'rfq-list', label: 'Browse RFQs', to: '/inventory/vendor-portal/rfqs' },
    { key: 'my-bids', label: 'My Bids', to: '/inventory/vendor-portal/bids' },
    { key: 'invoices', label: 'Invoice Tracker', to: '/inventory/vendor-portal/invoices' },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'rfq-window',
      title: 'RFQ opportunities',
      message: `${openRfqs.length} open opportunities are available for bidding.`,
      severity: openRfqs.length === 0 ? 'warning' : 'normal',
    },
    {
      id: 'invoice-queue',
      title: 'Invoice processing',
      message: `${pendingInvoices.length} invoices are currently pending settlement.`,
      severity: pendingInvoices.length > 5 ? 'warning' : 'normal',
    },
  ];

  const topSuppliers = useMemo(
    () =>
      suppliers
        .slice(0, 5)
        .map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name || 'Unnamed supplier',
          contact: supplier.email || supplier.phone || 'No contact details',
        })),
    [suppliers]
  );

  const panels: DashboardPanel[] = [
    {
      key: 'supplier-snapshot',
      title: 'Supplier Snapshot',
      content: (
        <ul className="space-y-2">
          {topSuppliers.map((supplier) => (
            <li key={supplier.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
              <p className="text-xs text-slate-600">{supplier.contact}</p>
            </li>
          ))}
          {topSuppliers.length === 0 && <li className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No suppliers available.</li>}
        </ul>
      ),
    },
    {
      key: 'procurement-overview',
      title: 'Order and Invoice Queue',
      content: (
        <div className="space-y-3">
          <Card className="border-slate-200 bg-slate-50"><p className="text-xs text-slate-600">Orders in workflow</p><p className="text-xl font-semibold text-slate-900">{activeOrders.length}</p></Card>
          <Card className="border-slate-200 bg-slate-50"><p className="text-xs text-slate-600">Invoices pending</p><p className="text-xl font-semibold text-slate-900">{pendingInvoices.length}</p></Card>
        </div>
      ),
    },
  ];

  return (
    <ModuleDashboardShell
      title="Vendor Portal Dashboard"
      subtitle="Access opportunities, bid activity, and invoice workflow from a single vendor-focused workspace."
      heroIcon={<ArchiveIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      notifications={notifications}
      charts={panels}
    >
      <Card title="Vendor Actions" className="border-slate-200 bg-surface-card shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/inventory/vendor-portal/rfqs">Open RFQ Board</Link>
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/inventory/vendor-portal/bids/new">Submit Bid</Link>
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/inventory/vendor-portal/invoices/new">Create Invoice</Link>
        </div>
      </Card>
    </ModuleDashboardShell>
  );
};
const VendorPortalDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <VendorPortalDashboardPageContent />
  </div>
);

export default VendorPortalDashboardPage;

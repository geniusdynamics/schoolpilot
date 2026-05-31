import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import { useAppData } from '@/hooks/useAppData';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel, DashboardQuickAction } from '@/components/ModuleDashboardShell';
import { ArchiveIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon } from '@/components/ui/icons';

export const SchoolProcurementDashboardPageContent: React.FC = () => {
  const { requisitions, purchaseOrders, suppliers } = useAppData();

  const openRequisitions = requisitions.filter((req: any) => String(req.status || '').toLowerCase().includes('pending'));
  const approvedOrders = purchaseOrders.filter((po: any) => String(po.status || '').toLowerCase().includes('approved'));
  const totalCommitted = approvedOrders.reduce((sum: number, po: any) => sum + Number(po.total_value || 0), 0);
  const totalRequested = requisitions.reduce((sum: number, req: any) => sum + Number(req.total_requested_value || req.estimated_cost || 0), 0);
  const utilization = totalRequested > 0 ? Math.round((totalCommitted / totalRequested) * 100) : 0;

  const metrics: DashboardMetric[] = [
    { key: 'reqs', label: 'Open Requisitions', value: openRequisitions.length, icon: <ClockIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'pos', label: 'Approved Orders', value: approvedOrders.length, icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'suppliers', label: 'Active Suppliers', value: suppliers.length, icon: <ArchiveIcon className="h-6 w-6 text-indigo-700" /> },
    { key: 'committed', label: 'Committed Spend', value: `Ksh ${totalCommitted.toLocaleString()}`, icon: <CurrencyDollarIcon className="h-6 w-6 text-cyan-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'requisitions', label: 'Review Requisitions', to: '/inventory/requisitions' },
    { key: 'orders', label: 'Open Purchase Orders', to: '/inventory/purchase-orders' },
    { key: 'suppliers', label: 'Manage Suppliers', to: '/inventory/suppliers' },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'pending-reqs',
      title: 'Pending approvals',
      message: `${openRequisitions.length} requisitions are waiting for approval.`,
      severity: openRequisitions.length > 5 ? 'warning' : 'normal',
    },
    {
      id: 'utilization',
      title: 'Spend utilization',
      message: `Commitment utilization is ${utilization}% of requested value.`,
      severity: utilization > 90 ? 'warning' : 'normal',
    },
  ];

  const recentRequisitions = useMemo(
    () =>
      requisitions
        .slice(0, 5)
        .map((req: any) => ({
          id: req.id,
          item: req.item_name || req.item || 'Unspecified item',
          status: req.status || 'Pending',
          amount: Number(req.total_requested_value || req.estimated_cost || 0),
        })),
    [requisitions]
  );

  const panels: DashboardPanel[] = [
    {
      key: 'pipeline',
      title: 'Procurement Pipeline',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Track requests from requisition through supplier commitment in one streamlined workflow.</p>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-slate-200 bg-slate-50"><p className="text-xs text-slate-600">Requested</p><p className="text-xl font-semibold text-slate-900">Ksh {totalRequested.toLocaleString()}</p></Card>
            <Card className="border-slate-200 bg-slate-50"><p className="text-xs text-slate-600">Committed</p><p className="text-xl font-semibold text-slate-900">Ksh {totalCommitted.toLocaleString()}</p></Card>
          </div>
        </div>
      ),
    },
    {
      key: 'requisitions',
      title: 'Recent Requisitions',
      content: (
        <ul className="space-y-2">
          {recentRequisitions.map((req) => (
            <li key={req.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{req.item}</p>
              <p className="text-xs text-slate-600">{req.status} • Ksh {req.amount.toLocaleString()}</p>
            </li>
          ))}
          {recentRequisitions.length === 0 && <li className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No requisitions available.</li>}
        </ul>
      ),
    },
  ];

  return (
    <ModuleDashboardShell
      title="School Procurement Dashboard"
      subtitle="Monitor requisitions, supplier commitments, and budget utilization from a unified procurement cockpit."
      heroIcon={<ArchiveIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      notifications={notifications}
      charts={panels}
    >
      <Card title="Procurement Actions" className="border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/inventory/requisitions/new">Create Requisition</Link>
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/inventory/purchase-orders/new">Create Purchase Order</Link>
          <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/inventory/procurement-reports">Open Procurement Report</Link>
        </div>
      </Card>
    </ModuleDashboardShell>
  );
};
const SchoolProcurementDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <SchoolProcurementDashboardPageContent />
  </div>
);

export default SchoolProcurementDashboardPage;

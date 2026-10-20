import React from 'react';
import { ArchiveIcon, ShoppingCartIcon, ClipboardDocumentListIcon, CubeIcon, ArrowRightIcon, ClockIcon, ExclamationTriangleIcon, BuildingStorefrontIcon, TruckIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import DonutChart from '@/components/ui/DonutChart';
import Card from '@/components/ui/Card';
import { ChartData } from '@/types';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
  DashboardPanel,
} from '@/components/ModuleDashboardShell';

export const InventoryDashboardPageContent: React.FC = () => {
  // GAP(P1-E05): the canonical registry models no item, warehouse, stock level,
  // requisition, purchase order or supplier, so the dashboard keeps reading the legacy
  // inventory collections.
  const { itemsInv, stockLevels, requisitions, purchaseOrders, vendors, loading } = useAppData();

  if (loading.itemsInv || loading.stockLevels || loading.requisitions || loading.purchaseOrders || loading.all) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  // Status calculations
  const openRequisitions = (requisitions || []).filter((r: any) => String(r.status).toLowerCase().includes('pending'));
  const activePurchaseOrders = (purchaseOrders || []).filter((po: any) => {
    const status = String(po.status).toLowerCase();
    return status.includes('approved') || status.includes('sent') || status.includes('received');
  });
  const lowStockItems = (stockLevels || []).filter((stock: any) =>
    Number(stock.quantity_on_hand || 0) <= Number(stock.reorder_point || 0)
  );
  const outOfStockItems = (stockLevels || []).filter((stock: any) =>
    Number(stock.quantity_on_hand || 0) === 0
  );
  const pendingPOs = (purchaseOrders || []).filter((po: any) =>
    String(po.status).toLowerCase() === 'pending' || String(po.status).toLowerCase() === 'draft'
  );

  // Stock status distribution for chart
  const stockStatusData: ChartData[] = [
    { name: 'Healthy', value: (stockLevels || []).filter((s: any) => Number(s.quantity_on_hand) > Number(s.reorder_point || 0)).length },
    { name: 'Low Stock', value: lowStockItems.length },
    { name: 'Out of Stock', value: outOfStockItems.length },
  ].filter(d => d.value > 0);

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'items',
      label: 'Inventory Items',
      value: (itemsInv || []).length.toLocaleString(),
      icon: <CubeIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+5',
      to: '/inventory/items',
      colorScheme: 'blue',
      description: 'Active inventory SKUs',
    },
    {
      key: 'stock-records',
      label: 'Stock Records',
      value: (stockLevels || []).length.toLocaleString(),
      icon: <ArchiveIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: '0%',
      to: '/inventory/stock-levels',
      colorScheme: 'emerald',
      description: 'Tracked stock levels',
    },
    {
      key: 'requisitions',
      label: 'Open Requisitions',
      value: openRequisitions.length,
      icon: <ClipboardDocumentListIcon className="h-6 w-6" />,
      trend: openRequisitions.length > 5 ? 'up' : 'down',
      trendValue: `${openRequisitions.length} pending`,
      to: '/inventory/requisitions',
      colorScheme: openRequisitions.length > 5 ? 'amber' : 'cyan',
      description: 'Awaiting approval',
    },
    {
      key: 'purchase-orders',
      label: 'Active Orders',
      value: activePurchaseOrders.length,
      icon: <ShoppingCartIcon className="h-6 w-6" />,
      trend: activePurchaseOrders.length > 0 ? 'up' : 'neutral',
      trendValue: `${pendingPOs.length} pending`,
      to: '/inventory/purchase-orders',
      colorScheme: 'indigo',
      description: 'In procurement pipeline',
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'overdue',
      count: outOfStockItems.length,
      label: 'Out of Stock',
      description: 'Items need immediate restocking',
      to: '/inventory/stock-levels',
    },
    {
      type: 'task',
      count: lowStockItems.length,
      label: 'Low Stock Alert',
      description: 'Items at reorder point',
      to: '/inventory/stock-levels?filter=low',
    },
    {
      type: 'approval',
      count: openRequisitions.length,
      label: 'Pending Requisitions',
      description: 'Awaiting approval',
      to: '/inventory/requisitions',
    },
    {
      type: 'message',
      count: (vendors || []).length,
      label: 'Active Vendors',
      description: 'Supplier relationships',
      to: '/inventory/vendors',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'items',
      label: 'Inventory Items',
      description: 'Manage inventory catalog',
      to: '/inventory/items',
      icon: <CubeIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'requisitions',
      label: 'Requisitions',
      description: 'Request new stock',
      to: '/inventory/requisitions',
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
    {
      key: 'purchase-orders',
      label: 'Purchase Orders',
      description: 'Manage procurement orders',
      to: '/inventory/purchase-orders',
      icon: <ShoppingCartIcon className="h-5 w-5" />,
      colorScheme: 'indigo',
    },
    {
      key: 'stock-levels',
      label: 'Stock Levels',
      description: 'Monitor inventory levels',
      to: '/inventory/stock-levels',
      icon: <ArchiveIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'vendors',
      label: 'Vendors',
      description: 'Manage suppliers',
      to: '/inventory/vendors',
      icon: <BuildingStorefrontIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'receiving',
      label: 'Goods Receiving',
      description: 'Process incoming stock',
      to: '/inventory/goods-receiving',
      icon: <TruckIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
  ];

  // Charts
  const charts: DashboardPanel[] = [
    ...(stockStatusData.length > 0 ? [{
      key: 'stock-status',
      title: 'Stock Status Distribution',
      content: <DonutChart data={stockStatusData} title="" />,
    }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'low-stock',
      title: 'Stock Alerts',
      message: lowStockItems.length > 0
        ? `${lowStockItems.length} items at or below reorder point.${outOfStockItems.length > 0 ? ` ${outOfStockItems.length} completely out of stock.` : ''}`
        : 'All items adequately stocked.',
      severity: outOfStockItems.length > 0 ? 'high' : lowStockItems.length > 0 ? 'warning' : 'normal',
    },
    {
      id: 'procurement-status',
      title: 'Procurement Pipeline',
      message: `${openRequisitions.length} requisitions pending, ${activePurchaseOrders.length} orders in progress.`,
      severity: openRequisitions.length > 10 ? 'warning' : 'normal',
    },
  ];

  // Mock recent inventory activity
  const recentActivity = [
    { action: 'Purchase order approved', time: '30 minutes ago', type: 'po' },
    { action: 'Stock received - IT Equipment', time: '2 hours ago', type: 'receiving' },
    { action: 'Low stock alert triggered', time: '5 hours ago', type: 'alert' },
    { action: 'Requisition submitted', time: '1 day ago', type: 'req' },
  ];

  return (
    <ModuleDashboardShell
      title="Inventory & Procurement Dashboard"
      subtitle="Track stock readiness, active requisitions, and order lifecycle from live inventory collections."
      heroIcon={<ArchiveIcon className="h-8 w-8 text-white" />}
      accentColor="amber"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional Inventory Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Stock Alerts Summary */}
        <Card title="Stock Alerts" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Out of Stock</span>
              <span className="font-semibold text-rose-600">{outOfStockItems.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Low Stock</span>
              <span className="font-semibold text-amber-600">{lowStockItems.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-surface-muted-fg">Healthy Stock</span>
              <span className="font-semibold text-emerald-600">
                {(stockLevels || []).filter((s: any) => Number(s.quantity_on_hand) > Number(s.reorder_point || 0)).length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-muted-fg">Total SKUs</span>
              <span className="font-semibold text-surface-foreground">{(itemsInv || []).length}</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'po' ? 'bg-indigo-100 text-indigo-600' :
                    activity.type === 'receiving' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'alert' ? 'bg-amber-100 text-amber-600' :
                    'bg-primary-100 text-primary-600'}
                `}>
                  {activity.type === 'po' ? <ShoppingCartIcon className="h-4 w-4" /> :
                   activity.type === 'receiving' ? <TruckIcon className="h-4 w-4" /> :
                   activity.type === 'alert' ? <ExclamationTriangleIcon className="h-4 w-4" /> :
                   <ClipboardDocumentListIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-foreground">{activity.action}</p>
                  <p className="text-xs text-surface-muted-fg flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary-50 p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">{openRequisitions.length}</p>
                <p className="text-xs text-primary-600">Pending Reqs</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{activePurchaseOrders.length}</p>
                <p className="text-xs text-indigo-600">Active POs</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-700">Vendors Active</span>
                <span className="font-bold text-emerald-700">{(vendors || []).length}</span>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Avg. Stock Level</span>
                <span className="font-bold text-amber-700">
                  {(stockLevels || []).length > 0
                    ? Math.round((stockLevels || []).reduce((sum: number, s: any) => sum + Number(s.quantity_on_hand || 0), 0) / (stockLevels || []).length)
                    : 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/inventory/purchase-orders'}
              className="w-full py-2 px-4 bg-surface-accent hover:bg-gray-200 rounded-lg text-sm font-medium text-surface-foreground transition-colors flex items-center justify-center gap-2"
            >
              View Purchase Orders <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};
const InventoryDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <InventoryDashboardPageContent />
  </div>
);

export default InventoryDashboardPage;

import React from 'react';
import { ArchiveIcon, ShoppingCartIcon, ClipboardDocumentListIcon, CubeIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardQuickAction } from '@/components/ModuleDashboardShell';

const InventoryDashboardPage: React.FC = () => {
  const { itemsInv, stockLevels, requisitions, purchaseOrders, loading } = useAppData();

  if (loading.itemsInv || loading.stockLevels || loading.requisitions || loading.purchaseOrders || loading.all) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const openRequisitions = requisitions.filter((requisition) => String(requisition.status).toLowerCase().includes('pending'));
  const activePurchaseOrders = purchaseOrders.filter((purchaseOrder) => {
    const status = String(purchaseOrder.status).toLowerCase();
    return status.includes('approved') || status.includes('sent') || status.includes('received');
  });
  const lowStockItems = stockLevels.filter((stock) => Number(stock.quantity_on_hand || 0) <= Number(stock.reorder_point || 0));

  const metrics: DashboardMetric[] = [
    { key: 'items', label: 'Inventory Items', value: itemsInv.length, icon: <CubeIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'stock-records', label: 'Stock Records', value: stockLevels.length, icon: <ArchiveIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'requisitions', label: 'Open Requisitions', value: openRequisitions.length, icon: <ClipboardDocumentListIcon className="h-6 w-6 text-amber-700" /> },
    { key: 'purchase-orders', label: 'Active Purchase Orders', value: activePurchaseOrders.length, icon: <ShoppingCartIcon className="h-6 w-6 text-indigo-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'items', label: 'Inventory Items', to: '/inventory/items', icon: <CubeIcon className="h-5 w-5" /> },
    { key: 'requisitions', label: 'Requisitions', to: '/inventory/requisitions', icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
    { key: 'purchase-orders', label: 'Purchase Orders', to: '/inventory/purchase-orders', icon: <ShoppingCartIcon className="h-5 w-5" /> },
    { key: 'stock-levels', label: 'Stock Levels', to: '/inventory/stock-levels', icon: <ArchiveIcon className="h-5 w-5" /> },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'low-stock',
      title: 'Low Stock Alert',
      message: lowStockItems.length > 0 ? `${lowStockItems.length} items are at or below reorder point.` : 'All tracked items are above reorder levels.',
      severity: lowStockItems.length > 0 ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Inventory & Procurement Dashboard"
      subtitle="Track stock readiness, active requisitions, and order lifecycle from live inventory collections."
      heroIcon={<ArchiveIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      notifications={notifications}
    />
  );
};

export default InventoryDashboardPage;

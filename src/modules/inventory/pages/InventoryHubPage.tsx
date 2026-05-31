// ABOUTME: Hub page for inventory management
// ABOUTME: Consolidates items, categories, warehouses, stock levels, and reorder alerts into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CubeIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  BellIcon,
} from '@/components/ui/icons';
import { ItemsPageContent } from './ItemsPage';
import { ItemCategoriesPageContent } from './ItemCategoriesPage';
import { WarehousesPageContent } from './WarehousesPage';
import { StockLevelsPageContent } from './StockLevelsPage';
import { ReorderAlertsContent } from './ReorderAlertsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const InventoryHubPage: React.FC = () => {
  const { t } = useTranslation('inventory');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'items',
      label: t('items.title', 'Items'),
      icon: <CubeIcon className="w-4 h-4" />,
      component: <ItemsPageContent />,
    },
    {
      id: 'categories',
      label: t('itemCategories.title', 'Categories'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <ItemCategoriesPageContent />,
    },
    {
      id: 'warehouses',
      label: t('warehouses.title', 'Warehouses'),
      icon: <BuildingOffice2Icon className="w-4 h-4" />,
      component: <WarehousesPageContent />,
    },
    {
      id: 'stock-levels',
      label: t('stockLevels.title', 'Stock Levels'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <StockLevelsPageContent />,
    },
    {
      id: 'reorder-alerts',
      label: t('reorderAlerts.title', 'Reorder Alerts'),
      icon: <BellIcon className="w-4 h-4" />,
      component: <ReorderAlertsContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'items';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'items') {
        navigate('/inventory/inventory-management', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('inventoryHub.title', 'Inventory Management')}
        subtitle={t(
          'inventoryHub.subtitle',
          'Manage items, categories, warehouses, stock levels, and reorder alerts'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="blue"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default InventoryHubPage;


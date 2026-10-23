// ABOUTME: Hub page for procurement
// ABOUTME: Consolidates requisitions, purchase orders, suppliers, and supplier contracts into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { RequisitionsPageContent } from './RequisitionsPage';
import { PurchaseOrdersPageContent } from './PurchaseOrdersPage';
import { SuppliersPageContent } from './SuppliersPage';
import { SupplierContractsPageContent } from './SupplierContractsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ProcurementPage: React.FC = () => {
  const { t } = useTranslation('inventory');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'requisitions',
      label: t('requisitions.title', 'Requisitions'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <RequisitionsPageContent />,
    },
    {
      id: 'purchase-orders',
      label: t('purchaseOrders.title', 'Purchase Orders'),
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      component: <PurchaseOrdersPageContent />,
    },
    {
      id: 'suppliers',
      label: t('suppliers.title', 'Suppliers'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <SuppliersPageContent />,
    },
    {
      id: 'contracts',
      label: t('supplierContracts.title', 'Contracts'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <SupplierContractsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'requisitions';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'requisitions') {
        navigate('/inventory/procurement', { replace: true });
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
        title={t('procurementHub.title', 'Procurement')}
        info={t(
          'procurementHub.subtitle',
          'Manage requisitions, purchase orders, suppliers, and contracts'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default ProcurementPage;


// ABOUTME: Hub page for stock operations
// ABOUTME: Consolidates stock reception, issuance, returns, and stationery into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ArchiveIcon,
  TruckIcon,
  CubeIcon,
} from '@/components/ui/icons';
import { StockReceptionPageContent } from './StockReceptionPage';
import { StockIssuancePageContent } from './StockIssuancePage';
import { StockReturnsPageContent } from './StockReturnsPage';
import { StationeryPageContent } from './StationeryPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StockOpsHubPage: React.FC = () => {
  const { t } = useTranslation('inventory');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'reception',
      label: t('stockReception.title', 'Reception'),
      icon: <ArchiveIcon className="w-4 h-4" />,
      component: <StockReceptionPageContent />,
    },
    {
      id: 'issuance',
      label: t('stockIssuance.title', 'Issuance'),
      icon: <TruckIcon className="w-4 h-4" />,
      component: <StockIssuancePageContent />,
    },
    {
      id: 'returns',
      label: t('stockReturns.title', 'Returns'),
      icon: <TruckIcon className="w-4 h-4" />,
      component: <StockReturnsPageContent />,
    },
    {
      id: 'stationery',
      label: t('stationery.title', 'Stationery'),
      icon: <CubeIcon className="w-4 h-4" />,
      component: <StationeryPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'reception';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'reception') {
        navigate('/inventory/stock-operations', { replace: true });
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
        title={t('stockOpsHub.title', 'Stock Operations')}
        info={t(
          'stockOpsHub.subtitle',
          'Manage stock reception, issuance, returns, and stationery'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="green"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default StockOpsHubPage;


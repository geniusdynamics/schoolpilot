// ABOUTME: Hub page for staff management
// ABOUTME: Consolidates staff directory, bio data, ID cards, and wallet into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UsersIcon,
  IdentificationIcon,
  CreditCardIcon,
  WalletIcon,
} from '@/components/ui/icons';
import { StaffListContent } from './StaffListPage';
import { StaffDetailContent } from './StaffDetailPage';
import { StaffIDCardsContent } from './StaffIDCardsPage';
import { StaffWalletContent } from './StaffWalletPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StaffDirectoryPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'directory',
      label: t('staff.directory.title', 'Directory'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <StaffListContent />,
    },
    {
      id: 'bio-data',
      label: t('staff.bioData.title', 'Bio Data'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      component: <StaffDetailContent />,
    },
    {
      id: 'id-cards',
      label: t('staff.idCards.title', 'ID Cards'),
      icon: <CreditCardIcon className="w-4 h-4" />,
      component: <StaffIDCardsContent />,
    },
    {
      id: 'wallet',
      label: t('staff.wallet.title', 'Wallet'),
      icon: <WalletIcon className="w-4 h-4" />,
      component: <StaffWalletContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'directory';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'directory') {
        navigate('/administration/staff', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('staffDirectory.title', 'Staff Directory')}
        subtitle={t(
          'staffDirectory.subtitle',
          'Manage staff across all stages: directory, bio data, ID cards, and wallet'
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
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default StaffDirectoryPage;

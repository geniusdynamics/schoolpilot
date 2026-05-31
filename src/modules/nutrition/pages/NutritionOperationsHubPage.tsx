// ABOUTME: Hub page for nutrition operations
// ABOUTME: Consolidates merchants, student wallet, and kitchen management into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  CubeIcon,
} from '@/components/ui/icons';
import { MerchantsPageContent } from './MerchantsPage';
import { StudentWalletPageContent } from './StudentWalletPage';
import { KitchenManagementPageContent } from './KitchenManagementPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const NutritionOperationsHubPage: React.FC = () => {
  const { t } = useTranslation('nutrition');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'merchants',
      label: t('merchants.title', 'Merchants'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <MerchantsPageContent />,
    },
    {
      id: 'student-wallet',
      label: t('studentWallet.title', 'Student Wallet'),
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      component: <StudentWalletPageContent />,
    },
    {
      id: 'kitchen',
      label: t('kitchenManagement.title', 'Kitchen'),
      icon: <CubeIcon className="w-4 h-4" />,
      component: <KitchenManagementPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'merchants';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'merchants') {
        navigate('/nutrition/operations', { replace: true });
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
        title={t('nutritionOperations.title', 'Nutrition Operations')}
        subtitle={t(
          'nutritionOperations.subtitle',
          'Manage merchants, student wallets, and kitchen operations'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="orange"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default NutritionOperationsHubPage;


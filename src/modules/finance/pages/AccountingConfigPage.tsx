import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentTextIcon,
  BuildingOffice2Icon,
} from '@/components/ui/icons';
import { ChartOfAccountsContent } from './ChartOfAccountsPage';
import { BanksPageContent } from './BanksPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const AccountingConfigPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'chart-of-accounts',
      label: t('chartOfAccounts.title', 'Chart of Accounts'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <ChartOfAccountsContent />,
    },
    {
      id: 'banks',
      label: t('banks.title', 'Banks'),
      icon: <BuildingOffice2Icon className="w-4 h-4" />,
      component: <BanksPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'chart-of-accounts';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'chart-of-accounts') {
        navigate('/finance/accounting-config', { replace: true });
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
        title={t('accountingConfig.title', 'Accounting Configuration')}
        subtitle={t(
          'accountingConfig.subtitle',
          'Manage chart of accounts and bank accounts'
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

export default AccountingConfigPage;

// ABOUTME: Hub page for expenses and banking
// ABOUTME: Consolidates expenses, banks, and suppliers into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
} from '@/components/ui/icons';
import { BanksPageContent } from './BanksPage';
import { SuppliersPageContent } from './SuppliersPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ExpensesPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'expenses',
      label: t('expenses.title', 'Expenses'),
      icon: <BanknotesIcon className="w-4 h-4" />,
      component: <div className="p-4"><BanknotesIcon className="w-6 h-6 text-surface-muted-fg" /> <span className="text-surface-muted-fg ml-2">Expense records will appear here</span></div>,
    },
    {
      id: 'banks',
      label: t('banks.title', 'Banks'),
      icon: <BuildingOffice2Icon className="w-4 h-4" />,
      component: <BanksPageContent />,
    },
    {
      id: 'suppliers',
      label: t('suppliers.title', 'Suppliers'),
      icon: <UserGroupIcon className="w-4 h-4" />,
      component: <SuppliersPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'expenses';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'expenses') {
        navigate('/finance/expenses', { replace: true });
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
        title={t('expensesHub.title', 'Expenses & Banking')}
        subtitle={t(
          'expensesHub.subtitle',
          'Manage expenses, bank accounts, and suppliers'
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
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default ExpensesPage;


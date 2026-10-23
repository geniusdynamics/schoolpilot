import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ScaleIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
} from '@/components/ui/icons';
import { TrialBalancePageContent } from './TrialBalancePage';
import { BalanceSheetPageContent } from './BalanceSheetPage';
import { IncomeStatementPageContent } from './IncomeStatementPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const FinancialStatementsPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'trial-balance',
      label: t('trialBalance.title', 'Trial Balance'),
      icon: <ScaleIcon className="w-4 h-4" />,
      component: <TrialBalancePageContent />,
    },
    {
      id: 'balance-sheet',
      label: t('balanceSheet.title', 'Balance Sheet'),
      icon: <BuildingLibraryIcon className="w-4 h-4" />,
      component: <BalanceSheetPageContent />,
    },
    {
      id: 'income-statement',
      label: t('incomeStatement.title', 'Income Statement'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <IncomeStatementPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'trial-balance';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'trial-balance') {
        navigate('/finance/financial-statements', { replace: true });
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
        title={t('financialStatements.title', 'Financial Statements')}
        info={t(
          'financialStatements.subtitle',
          'View trial balance, balance sheet, and income statement'
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

export default FinancialStatementsPage;

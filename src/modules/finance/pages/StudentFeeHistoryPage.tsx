import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BanknotesIcon,
  ArrowPathIcon,
} from '@/components/ui/icons';
import { StudentOpeningBalancesPageContent } from './StudentOpeningBalancesPage';
import { PreviousSessionFeesPageContent } from './PreviousSessionFeesPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const StudentFeeHistoryPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'opening-balances',
      label: t('studentOpeningBalances.title', 'Opening Balances'),
      icon: <BanknotesIcon className="w-4 h-4" />,
      component: <StudentOpeningBalancesPageContent />,
    },
    {
      id: 'previous-session',
      label: t('previousSessionFees.title', 'Previous Session'),
      icon: <ArrowPathIcon className="w-4 h-4" />,
      component: <PreviousSessionFeesPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'opening-balances';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'opening-balances') {
        navigate('/finance/student-fee-history', { replace: true });
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
        title={t('studentFeeHistory.title', 'Student Fee History')}
        subtitle={t(
          'studentFeeHistory.subtitle',
          'Manage opening balances and previous session fees'
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

export default StudentFeeHistoryPage;

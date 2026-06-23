// ABOUTME: Hub page for financial reports (relocated from finance module per spec)
// ABOUTME: Consolidates fees due report, students paid book, and votehead statement into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentReportIcon,
  UsersIcon,
  TableCellsIcon,
} from '@/components/ui/icons';
// Cross-module imports: these source pages live in finance per the spec's
// hub-and-spoke model. The hub page is in reports; the source pages stay in
// finance to keep their data collection context intact.
import { FeesDueReportPageContent } from '../../finance/pages/FeesDueReportPage';
import { StudentsPaidBookPageContent } from '../../finance/pages/StudentsPaidBookPage';
import { VoteheadStatementPageContent } from '../../finance/pages/VoteheadStatementPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const FinancialReportsHubPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'fees-due',
      label: t('feesDueReport.title', 'Fees Due'),
      icon: <DocumentReportIcon className="w-4 h-4" />,
      component: <FeesDueReportPageContent />,
    },
    {
      id: 'students-paid',
      label: t('studentsPaidBook.title', 'Students Paid'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <StudentsPaidBookPageContent />,
    },
    {
      id: 'votehead-statement',
      label: t('voteheadStatement.title', 'Votehead Statement'),
      icon: <TableCellsIcon className="w-4 h-4" />,
      component: <VoteheadStatementPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'fees-due';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'fees-due') {
        navigate('/reports/finance', { replace: true });
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
        title={t('financeReports.title', 'Finance Reports')}
        subtitle={t(
          'financeReports.subtitle',
          'View fees due reports, previous session fees, paid students, and votehead statements'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="purple"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default FinancialReportsHubPage;


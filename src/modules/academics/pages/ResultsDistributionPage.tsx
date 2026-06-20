// ABOUTME: Hub page for result distribution
// ABOUTME: Consolidates exam gazette, distribute results, and board exam results into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentTextIcon,
  MegaphoneIcon,
  AcademicCapIcon,
} from '@/components/ui/icons';
import { ExamGazettePageContent } from './ExamGazettePage';
import { DistributeResultsPageContent } from './DistributeResultsPage';
import { BoardExamResultsPageContent } from './BoardExamResultsPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ResultsDistributionPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'gazette',
      label: t('examGazette.title', 'Exam Gazette'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <ExamGazettePageContent />,
    },
    {
      id: 'distribute',
      label: t('distributeResults.title', 'Distribute Results'),
      icon: <MegaphoneIcon className="w-4 h-4" />,
      component: <DistributeResultsPageContent />,
    },
    {
      id: 'board-results',
      label: t('boardExamResults.title', 'Board Results'),
      icon: <AcademicCapIcon className="w-4 h-4" />,
      component: <BoardExamResultsPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'gazette';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'gazette') {
        navigate('/academics/distribution', { replace: true });
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
        title={t('distribution.title', 'Result Distribution')}
        subtitle={t(
          'distribution.subtitle',
          'Generate gazettes, distribute results, and manage board exam results'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="teal"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default ResultsDistributionPage;

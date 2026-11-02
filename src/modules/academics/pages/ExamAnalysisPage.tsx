// ABOUTME: Hub page for exam analysis
// ABOUTME: Holds the canonical exam analysis; the legacy student analysis left the menu with the old collections

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ChartBarIcon,
} from '@/components/ui/icons';
import { CanonicalExamAnalysisContent } from './results/CanonicalExamAnalysisContent';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ExamAnalysisPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'exam-analysis',
      label: t('examAnalysis.title', 'Exam Analysis'),
      icon: <ChartBarIcon className="w-4 h-4" />,
      component: <CanonicalExamAnalysisContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'exam-analysis';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'exam-analysis') {
        navigate('/academics/exam-analysis', { replace: true });
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
        title={t('analysis.title', 'Exam Analysis')}
        info={t(
          'analysis.subtitle',
          'Analyze exam performance at class and individual student levels'
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
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default ExamAnalysisPage;

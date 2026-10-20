// ABOUTME: Hub page for exam analysis
// ABOUTME: Consolidates exam analysis and student exam analysis into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ChartBarIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { ExamAnalysisContent } from './ExamAnalysisContent';
import { StudentExamAnalysisPageContent } from './StudentExamAnalysisPage';

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
      component: <ExamAnalysisContent />,
    },
    {
      id: 'student-analysis',
      label: t('studentExamAnalysis.title', 'Student Analysis'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <StudentExamAnalysisPageContent />,
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
        subtitle={t(
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
